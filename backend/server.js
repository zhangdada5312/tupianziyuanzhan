const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const app = express();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 中间件配置
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // 获取文件扩展名
        const ext = path.extname(file.originalname);
        // 生成文件名
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, filename);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 只允许上传图片
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('只允许上传图片文件！'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB
    }
});

// API路由
// 获取所有资源
app.get('/api/resources', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const offset = (page - 1) * limit;
    
    db.all(`
        SELECT r.*, m.name as movie_name 
        FROM resources r 
        LEFT JOIN movies m ON r.movie_id = m.id 
        ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
        if (err) {
            console.error('获取资源失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        // 转换图片路径为URL
        rows = rows.map(row => ({
            ...row,
            image_path: row.image_path ? `/uploads/${path.basename(row.image_path)}` : null
        }));
        res.json(rows);
    });
});

// 搜索资源
app.get('/api/search', (req, res) => {
    const keyword = req.query.keyword;
    if (!keyword) {
        res.status(400).json({ error: '请提供搜索关键词' });
        return;
    }

    db.all(`
        SELECT r.*, m.name as movie_name 
        FROM resources r 
        LEFT JOIN movies m ON r.movie_id = m.id 
        WHERE m.name LIKE ? OR r.title LIKE ?
    `, [`%${keyword}%`, `%${keyword}%`], (err, rows) => {
        if (err) {
            console.error('搜索资源失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        // 转换图片路径为URL
        rows = rows.map(row => ({
            ...row,
            image_path: row.image_path ? `/uploads/${path.basename(row.image_path)}` : null
        }));
        res.json(rows);
    });
});

// 添加新资源
app.post('/api/resources', upload.single('image'), async (req, res) => {
    try {
        const { movie_name, title } = req.body;
        const image = req.file;

        // 获取或创建影视剧记录
        let movieId = null;
        if (movie_name) {
            const movie = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM movies WHERE name = ?', [movie_name], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (movie) {
                movieId = movie.id;
            } else {
                const result = await new Promise((resolve, reject) => {
                    db.run('INSERT INTO movies (name) VALUES (?)', [movie_name], function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
                movieId = result;
            }
        }

        // 检查标题是否重复
        if (title) {
            const existingTitle = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM resources WHERE movie_id = ? AND title = ?', 
                    [movieId, title],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });

            if (existingTitle) {
                res.status(400).json({ error: '该影视剧标题已存在' });
                return;
            }
        }

        // 如果有图片，检查图片是否重复
        let imagePath = null;
        let imageHash = null;
        if (image) {
            imageHash = require('crypto')
                .createHash('md5')
                .update(fs.readFileSync(image.path))
                .digest('hex');

            // 检查是否存在相同的图片
            const existingImage = await new Promise((resolve, reject) => {
                db.get('SELECT image_path FROM image_hashes WHERE hash = ?', 
                    [imageHash],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
            });

            if (existingImage) {
                // 删除上传的重复图片
                fs.unlinkSync(image.path);
                res.status(400).json({ error: '该图片已存在' });
                return;
            }

            imagePath = path.basename(image.path);
            
            // 保存图片hash值
            await new Promise((resolve, reject) => {
                db.run('INSERT INTO image_hashes (image_path, hash) VALUES (?, ?)',
                    [imagePath, imageHash],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }

        // 保存资源
        const resourceId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO resources (movie_id, title, image_path, image_hash) VALUES (?, ?, ?, ?)`,
                [movieId, title || null, imagePath, imageHash],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });

        res.json({
            id: resourceId,
            movie_name,
            title: title || null,
            image_path: imagePath ? `/uploads/${imagePath}` : null
        });
    } catch (error) {
        console.error('上传处理失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 删除资源
app.delete('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        // 获取资源信息
        const resource = await new Promise((resolve, reject) => {
            db.get(`SELECT * FROM resources WHERE id = ?`, id, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!resource) {
            res.status(404).json({ error: '资源不存在' });
            return;
        }

        // 如果有图片，删除文件和hash记录
        if (resource.image_path) {
            const imagePath = path.join(uploadDir, resource.image_path);
            try {
                fs.unlinkSync(imagePath);
            } catch (err) {
                console.error('删除文件失败:', err);
            }

            // 删除hash记录
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM image_hashes WHERE image_path = ?', 
                    [resource.image_path], 
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
            });
        }

        // 删除资源记录
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM resources WHERE id = ?', id, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: '资源已删除' });
    } catch (error) {
        console.error('删除资源失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({ error: '文件大小不能超过10MB' });
        } else {
            res.status(400).json({ error: err.message });
        }
    } else {
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 