const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接
const db = new sqlite3.Database(path.join(__dirname, 'resources.db'), (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    } else {
        console.log('成功连接到SQLite数据库');
        initDatabase();
    }
});

// 初始化数据库表
async function initDatabase() {
    // 创建影视剧名称表
    await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    // 创建资源表
    await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER,
            title TEXT,
            image_path TEXT,
            image_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(movie_id) REFERENCES movies(id)
        )`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    // 创建图片hash表
    await new Promise((resolve, reject) => {
        db.run(`CREATE TABLE IF NOT EXISTS image_hashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_path TEXT NOT NULL,
            hash TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    // 创建索引
    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_movie_name ON movies(name)`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_resource_title ON resources(title)`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    await new Promise((resolve, reject) => {
        db.run(`CREATE INDEX IF NOT EXISTS idx_image_hash ON resources(image_hash)`, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });

    console.log('数据库表和索引初始化完成');
}

module.exports = db; 