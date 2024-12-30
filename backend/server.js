const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const app = express();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../sync/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('Upload directory:', uploadDir);
console.log('Directory exists:', fs.existsSync(uploadDir));
console.log('Directory contents:', fs.readdirSync(uploadDir));

// 中间件配置
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 配置静态文件服务，处理图片请求
app.use('/uploads', (req, res, next) => {
    try {
        const fileName = decodeURIComponent(path.basename(req.url));
        const filePath = path.join(uploadDir, fileName);
        
        console.log('Image request:', {
            requestUrl: req.url,
            fileName: fileName,
            filePath: filePath,
            exists: fs.existsSync(filePath)
        });
        
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath);
            return next();
        }

        // 获取文件扩展名并设置正确的 Content-Type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }[ext] || 'image/jpeg';

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                next(err);
            }
        });
    } catch (error) {
        console.error('Error processing image request:', error);
        next(error);
    }
});

// 添加调试中间件
app.use((req, res, next) => {
    console.log('Request URL:', req.url);
    if (req.url.startsWith('/uploads/')) {
        const filePath = path.join(uploadDir, decodeURIComponent(path.basename(req.url)));
        console.log('Requested file path:', filePath);
        console.log('File exists:', fs.existsSync(filePath));
        if (fs.existsSync(filePath)) {
            console.log('File size:', fs.statSync(filePath).size);
            console.log('File extension:', path.extname(filePath));
        }
    }
    next();
});

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
    // 检查文件类型
    if (!file.mimetype.startsWith('image/')) {
        cb(new Error('只允许上传图片文件！'), false);
        return;
    }
    cb(null, true);
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
app.get('/api/resources', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const type = req.query.type || 'image';
        const pageSize = type === 'title' ? 15 : 12;
        const offset = (page - 1) * pageSize;
        
        console.log('Resource request:', { page, type, pageSize, offset });
        
        const query = type === 'image' 
            ? `SELECT * FROM resources WHERE image_path IS NOT NULL ORDER BY id DESC LIMIT ? OFFSET ?`
            : `SELECT * FROM resources WHERE title IS NOT NULL ORDER BY id DESC LIMIT ? OFFSET ?`;
            
        const resources = await new Promise((resolve, reject) => {
            db.all(query, [pageSize, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // 检查每个资源的图片路径
        resources.forEach(resource => {
            if (resource.image_path) {
                const fullPath = path.join(uploadDir, resource.image_path);
                console.log('Checking image path:', {
                    relativePath: resource.image_path,
                    fullPath,
                    exists: fs.existsSync(fullPath)
                });
                // 确保返回的图片路径不包含前导斜杠
                resource.image_path = resource.image_path.replace(/^\/+/, '');
            }
        });
        
        res.json(resources);
    } catch (error) {
        console.error('获取资源列表失败:', error);
        res.status(500).json({ error: '获取资源列表失败' });
    }
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
        let { movie_name, title } = req.body;
        const image = req.file;
        let view_count = req.body.view_count || 0;

        // 如果标题中包含《》，提取影视剧名字
        if (title && !movie_name) {
            const match = title.match(/《(.+?)》/);
            if (match) {
                movie_name = match[1];
            } else {
                // 如果没有提取到电影名字，且没有图片，则不保存
                if (!image) {
                    res.status(400).json({ error: '标题中未包含电影名称' });
                    return;
                }
            }
        }

        // 保存资源
        const resourceId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO resources (title, image_path, view_count) VALUES (?, ?, ?)`,
                [title || null, image ? path.basename(image.path) : null, view_count],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });

        res.json({
            id: resourceId,
            title: title || null,
            image_path: image ? `/uploads/${path.basename(image.path)}` : null,
            view_count
        });
    } catch (error) {
        console.error('上传处理失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 删除资源
app.delete('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    const { type } = req.query;

    try {
        // 获取资源信息
        const resource = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM resources WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!resource) {
            res.status(404).json({ error: '资源不存在' });
            return;
        }

        // 根据type参数决定删除内容
        if (type === 'title') {
            // 只删除标题
            await new Promise((resolve, reject) => {
                db.run('UPDATE resources SET title = NULL WHERE id = ?', [id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } else if (type === 'image') {
            // 删除图片文件
            if (resource.image_path) {
                const imagePath = path.join(__dirname, '../sync/uploads', path.basename(resource.image_path));
                try {
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                } catch (err) {
                    console.error('删除文件失败:', err);
                }

                // 删除图片记录
                await new Promise((resolve, reject) => {
                    db.run('UPDATE resources SET image_path = NULL, image_hash = NULL WHERE id = ?', [id], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }

        res.json({ message: '删除成功' });
    } catch (error) {
        console.error('删除资源失败:', error);
        res.status(500).json({ error: '删除资源失败' });
    }
});

// 删除所有标题
app.delete('/api/resources/titles', async (req, res) => {
    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM resources WHERE title IS NOT NULL', [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({ message: '所有标题已删除' });
    } catch (error) {
        console.error('删除所有标题失败:', error);
        res.status(500).json({ error: '删除所有标题失败' });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 