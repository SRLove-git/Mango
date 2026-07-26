# 安装与配置

## 前置要求

- Node.js >= 18
- 一个 WordPress 站点（需启用 REST API）

## 安装

```bash
git clone https://github.com/SRlove-git/mango.git
cd mango
npm install
```

## 配置

在项目根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=https://your-wordpress-site.com/wp-json/wp/v2
```

## 开发

```bash
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动。

## 构建

```bash
npm run build
```

构建产物输出至 WordPress 主题目录。

## 可用命令

| 命令 | 操作 |
| :--- | :--- |
| `npm install` | 安装依赖 |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建项目 |
| `npm run preview` | 本地预览已构建的项目 |
| `npm run build:check` | TypeScript 检查并构建 |
| `npm run lint` | 使用 Oxlint 检查代码 |
