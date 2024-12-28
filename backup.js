const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 创建备份文件夹
const backupDir = path.join(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

// 创建备份文件名（使用时间戳）
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `backup-${timestamp}.zip`);

// 创建写入流
const output = fs.createWriteStream(backupFile);
const archive = archiver('zip', {
    zlib: { level: 9 } // 最大压缩级别
});

// 监听完成事件
output.on('close', () => {
    console.log(`备份完成！文件大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`备份文件保存在: ${backupFile}`);
});

// 监听错误
archive.on('error', (err) => {
    throw err;
});

// 将输出流连接到压缩文件
archive.pipe(output);

// 添加文件到压缩包
archive.directory('frontend/', 'frontend');
archive.directory('backend/', 'backend');
archive.directory('uploads/', 'uploads');
archive.file('package.json', { name: 'package.json' });
archive.file('README.md', { name: 'README.md' });
archive.file('.gitignore', { name: '.gitignore' });

// 如果数据库文件存在，也添加到备份中
const dbFile = path.join(__dirname, 'backend', 'resources.db');
if (fs.existsSync(dbFile)) {
    archive.file(dbFile, { name: 'backend/resources.db' });
}

// 完成打包
archive.finalize(); 