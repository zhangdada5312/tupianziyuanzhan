const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 确保数据库目录存在
const dbDir = path.join(__dirname, '../sync/database');
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dbDir, 'resources.db'));

// 初始化数据库表
db.serialize(() => {
    // 创建影视剧表
    db.run(`CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    // 创建资源表
    db.run(`CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        movie_id INTEGER,
        title TEXT,
        image_path TEXT,
        image_hash TEXT,
        view_count INTEGER DEFAULT 0,
        FOREIGN KEY (movie_id) REFERENCES movies(id)
    )`);

    // 创建图片哈希表
    db.run(`CREATE TABLE IF NOT EXISTS image_hashes (
        image_path TEXT PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL
    )`);

    // 检查 view_count 列是否存在，如果不存在则添加
    db.all("PRAGMA table_info(resources)", [], (err, rows) => {
        if (err) {
            console.error('检查表结构失败:', err);
            return;
        }
        
        const hasViewCount = rows && Array.isArray(rows) && rows.some(row => row.name === 'view_count');
        if (!hasViewCount) {
            db.run("ALTER TABLE resources ADD COLUMN view_count INTEGER DEFAULT 0");
        }
    });
});

module.exports = db; 