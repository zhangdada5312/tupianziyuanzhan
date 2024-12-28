const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// 检查命令行参数
if (process.argv.length < 3) {
    console.log('请提供备份文件路径');
    console.log('使用方法: node restore.js <备份文件路径>');
    process.exit(1);
}

const backupFile = process.argv[2];

// 检查备份文件是否存在
if (!fs.existsSync(backupFile)) {
    console.log('备份文件不存在:', backupFile);
    process.exit(1);
}

// 创建临时解压目录
const tempDir = path.join(__dirname, 'temp_restore');
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

console.log('开始恢复备份...');

// 解压文件
fs.createReadStream(backupFile)
    .pipe(unzipper.Extract({ path: tempDir }))
    .on('close', () => {
        // 复制文件到正确的位置
        try {
            // 复制前端文件
            fs.cpSync(path.join(tempDir, 'frontend'), path.join(__dirname, 'frontend'), { recursive: true });
            
            // 复制后端文件
            fs.cpSync(path.join(tempDir, 'backend'), path.join(__dirname, 'backend'), { recursive: true });
            
            // 复制上传文件
            fs.cpSync(path.join(tempDir, 'uploads'), path.join(__dirname, 'uploads'), { recursive: true });
            
            // 复制其他文件
            fs.copyFileSync(path.join(tempDir, 'package.json'), path.join(__dirname, 'package.json'));
            fs.copyFileSync(path.join(tempDir, 'README.md'), path.join(__dirname, 'README.md'));
            
            // 清理临时文件
            fs.rmSync(tempDir, { recursive: true });
            
            console.log('恢复完成！');
            console.log('请运行 npm install 安装依赖，然后使用 npm run dev 启动系统。');
        } catch (err) {
            console.error('恢复过程中出错:', err);
            process.exit(1);
        }
    })
    .on('error', (err) => {
        console.error('解压文件时出错:', err);
        process.exit(1);
    }); 