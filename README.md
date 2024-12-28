# 影视资源管理系统

一个简单而功能强大的影视资源管理系统，支持图片和标题的独立管理。

## 功能特点

- 支持影视剧名称、标题和图片的独立管理
- 多种图片上传方式：
  - 点击上传
  - 拖拽上传
  - 粘贴上传（Ctrl+V）
- 图片预览功能：
  - 缩略图显示
  - 悬停大图预览
  - 点击复制图片
- 标题管理功能：
  - 独立的标题列表
  - 一键复制标题
  - 标题去重功能
- 资源删除功能：
  - 独立删除图片
  - 独立删除标题
- 搜索功能：
  - 支持按影视剧名称搜索
  - 支持按标题搜索
- 备份和恢复功能：
  - 一键备份所有数据
  - 简单的恢复机制
- Git同步功能：
  - 支持多设备代码同步
  - 支持数据库备份同步
  - 支持图片资源同步

## 技术栈

- 前端：
  - HTML5
  - CSS3
  - JavaScript (原生)
- 后端：
  - Node.js
  - Express
  - SQLite3
- 其他：
  - Multer (文件上传)
  - Nodemon (开发热重载)
  - Archiver (备份打包)
  - Unzipper (备份恢复)
  - Git (代码和数据同步)

## 安装说明

1. 克隆项目：
```bash
git clone [项目地址]
cd tupianziyuanzhan
```

2. 安装依赖：
```bash
npm install
```

3. 启动项目：
```bash
npm run dev
```

4. 访问系统：
打开浏览器访问 `http://localhost:3000`

## 目录结构

```
tupianziyuanzhan/
├── backend/
│   ├── server.js      # 后端服务器
│   └── database.js    # 数据库配置
├── frontend/
│   ├── index.html     # 前端页面
│   ├── css/
│   │   └── style.css  # 样式文件
│   └── js/
│       ├── main.js    # 主要逻辑
│       └── compress.js # 图片压缩
├── uploads/           # 上传文件目录
├── backup/           # 备份文件目录
├── backup.js         # 备份脚本
├── restore.js        # 恢复脚本
├── .gitignore        # Git忽略配置
├── package.json
└── README.md
```

## 使用说明

1. 添加新资源：
   - 输入影视剧名称（可选）
   - 输入标题（可选）
   - 上传图片（可选）
   - 点击"上传"按钮

2. 查看资源：
   - 点击"图片列表"查看所有图片
   - 点击"标题列表"查看所有标题
   - 悬停在图片上可查看大图预览

3. 复制资源：
   - 点击图片可直接复制图片
   - 点击"复制标题"按钮可复制标题

4. 删除资源：
   - 点击资源右上角的"删除"按钮
   - 删除操作需要确认

5. 搜索资源：
   - 在顶部搜索框输入关键词
   - 支持按影视剧名称和标题搜索

6. 备份系统：
   ```bash
   node backup.js
   ```
   备份文件将保存在 `backup` 目录下

7. 恢复系统：
   ```bash
   node restore.js <备份文件路径>
   ```
   例如：`node restore.js backup/backup-2024-01-20.zip`

## Git 同步说明

1. 初始化 Git 仓库：
   ```bash
   git init
   git add .
   git commit -m "初始化项目"
   ```

2. 添加远程仓库：
   ```bash
   git remote add origin [远程仓库地址]
   git push -u origin main
   ```

3. 多设备同步流程：

   a. 第一台设备：
   ```bash
   # 备份当前数据
   node backup.js
   # 提交更改
   git add .
   git commit -m "更新数据备份"
   git push
   ```

   b. 其他设备：
   ```bash
   # 拉取更新
   git pull
   # 恢复最新备份
   node restore.js backup/[最新备份文件名].zip
   # 安装依赖并启动
   npm install
   npm run dev
   ```

4. 定期同步建议：
   - 在每次重要更新后进行备份和推送
   - 在使用其他设备前先拉取最新更改
   - 确保不同设备的更改不会冲突

## 注意事项

- 图片大小限制为10MB，超过限制会自动压缩
- 相同的图片和标题会自动去重
- 删除资源操作不可恢复，请谨慎操作
- 建议定期备份数据
- 恢复数据前建议先备份当前数据
- Git同步前请确保已经备份最新数据
- 不同设备间切换时，请先同步最新的更改
- 建议使用Chrome、Firefox、Safari等现代浏览器访问系统

## 分享和部署

1. 备份当前系统：
   - 运行 `node backup.js` 创建备份文件
   - 备份文件会保存在 `backup` 目录下

2. 分享给其他人：
   - 分享Git仓库地址
   - 分享README.md文件（包含安装和使用说明）

3. 在新环境部署：
   - 安装Node.js（建议版本 >= 14）
   - 克隆Git仓库
   - 运行 `npm install` 安装依赖
   - 恢复最新备份（如果需要）
   - 运行 `npm run dev` 启动系统 