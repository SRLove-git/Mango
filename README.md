# Mango

> 一款基于 **React + TypeScript + Vite** 构建的 Headless SPA WordPress 博客主题

![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-brightgreen)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-~6.0-blue)
![Vite](https://img.shields.io/badge/Vite-8-purple)
![License](https://img.shields.io/github/license/SRlove-git/mango)

[![GitHub stars](https://img.shields.io/github/stars/SRlove-git/mango?style=social)](https://github.com/SRlove-git/mango/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/SRlove-git/mango?style=social)](https://github.com/SRlove-git/mango/network/members)
[![GitHub issues](https://img.shields.io/github/issues/SRlove-git/mango)](https://github.com/SRlove-git/mango/issues)

---

将 WordPress 作为无头 CMS（Headless CMS），前端通过 REST API 获取数据，实现前后端分离的现代博客体验。你可以在保持 WordPress 后台管理便利性的同时，享受 React 带来的极致前端体验。

## 设计灵感

- **友链页面设计** 效仿 [hexo-theme-stellar](https://github.com/xaoxuu/hexo-theme-stellar)
- **整体风格设计** 效仿 [Firefly](https://github.com/CuteLeaf/Firefly)

## ✨ 功能特性

### 核心功能

- [x] **React 19 + TypeScript** — 最新版本，类型安全，极速渲染
- [x] **Vite 构建** — 极速冷启动与热更新，秒级开发体验
- [x] **响应式设计** — 完美适配桌面端、平板和移动设备
- [x] **WordPress REST API** — 将 WordPress 作为无头 CMS，前后端分离
- [x] **全文搜索** — 支持文章内容搜索

### 页面功能

- [x] **文章列表** — 首页文章流，分页浏览
- [x] **文章详情** — 完整的文章展示，支持目录、标签、分类
- [x] **分类浏览** — 按分类筛选文章
- [x] **归档页** — 按时间线归档文章
- [x] **友情链接** — 友链页面，支持分类展示与链接分组
- [x] **页面支持** — 支持 WordPress 原生页面及自定义页面模板
- [x] **搜索功能** — 实时搜索文章
- [x] **Wiki 知识库** — 多项目 Wiki 页面，支持树形目录、Markdown 渲染、侧边栏导航

### 布局特性

- [x] **侧边栏** — 支持显示分类、标签、近期文章、Wiki 页面树等
- [x] **分类导航栏** — 顶部分类快捷导航，支持通过 WordPress 菜单管理（外观 → 菜单 → Category Bar）
- [x] **文章目录 (TOC)** — 自动解析页面标题层级生成目录
- [x] **亮暗色模式** — 跟随系统或手动切换

## 🚀 快速开始

### 前置要求

- Node.js >= 18
- 一个 WordPress 站点（需启用 REST API）

### 安装

```bash
git clone https://github.com/SRlove-git/mango.git
cd mango
npm install
```

### 配置

在项目根目录创建 `.env` 文件：

```env
VITE_API_BASE_URL=https://your-wordpress-site.com/wp-json/wp/v2
```

### 开发

```bash
npm run dev
```

开发服务器将在 `http://localhost:5173` 启动。

### 构建

```bash
npm run build
```

构建产物输出至 `dist/` 目录。

### WordPress 主题部署

将 `theme/` 目录下的文件上传至 WordPress 主题目录，并激活主题。前端构建产物需部署至静态文件服务器，或集成到 WordPress 主题中。

> **分类导航栏管理：** 激活主题后，前往 WordPress 后台 **外观 → 菜单**，新建一个菜单并添加分类链接，然后在"菜单位置"中勾选 **Category Bar** 并保存。前端会自动读取该菜单渲染分类导航栏。如果未设置菜单，则回退显示全部分类。

## 📁 项目结构

```
mango/
├── public/                  # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   └── wordpress.ts     # WordPress REST API 封装
│   ├── components/
│   │   ├── CategoryBar.tsx   # 分类导航栏
│   │   ├── ClickEffect.tsx   # 点击特效
│   │   ├── Layout.tsx        # 布局组件（含文章 TOC 上下文）
│   │   ├── MarkdownRenderer.tsx # Markdown 渲染
│   │   ├── Pagination.tsx    # 分页组件
│   │   ├── PageTransition.tsx # 页面过渡动画
│   │   ├── PostCard.tsx      # 文章卡片
│   │   ├── SakuraEffect.tsx  # 樱花特效
│   │   ├── Sidebar.tsx       # 侧边栏（含 wiki_tree 模块）
│   │   └── ...
│   ├── context/
│   │   ├── ArticleTocContext.tsx  # 目录扫描上下文
│   │   └── SiteDataContext.tsx    # 站点数据上下文
│   ├── pages/
│   │   ├── Archive.tsx       # 归档页
│   │   ├── Category.tsx      # 分类页
│   │   ├── Home.tsx          # 首页
│   │   ├── Links.tsx         # 友链页
│   │   ├── Page.tsx          # 通用页面
│   │   ├── PostDetail.tsx    # 文章详情页
│   │   ├── Search.tsx        # 搜索页
│   │   ├── WikiDetail.tsx    # Wiki 页面详情
│   │   └── WikiIndex.tsx     # Wiki 项目列表
│   ├── App.tsx               # 路由配置
│   ├── main.tsx              # 入口文件
│   └── index.css             # 全局样式
├── theme/                    # WordPress 主题文件
│   ├── inc/
│   │   ├── wiki.php          # Wiki REST API 端点
│   │   └── ...
│   ├── functions.php         # 主题函数
│   ├── index.php             # 主题入口
│   └── style.css             # 主题信息
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .oxlintrc.json
```

## 🧞 指令

| 命令                   | 操作                       |
| :--------------------- | :------------------------- |
| `npm install`          | 安装依赖                   |
| `npm run dev`          | 启动本地开发服务器         |
| `npm run build`        | 构建项目至 `./dist/`       |
| `npm run preview`      | 本地预览已构建的项目       |
| `npm run build:check`  | TypeScript 检查并构建      |
| `npm run lint`         | 使用 Oxlint 检查代码       |

## 🧩 技术栈

- [React 19](https://react.dev/) — UI 框架
- [TypeScript](https://www.typescriptlang.org/) — 类型系统
- [Vite](https://vite.dev/) — 构建工具
- [React Router 7](https://reactrouter.com/) — 路由
- [WordPress REST API](https://developer.wordpress.org/rest-api/) — 数据源
- [Oxlint](https://oxc.rs/) — 代码检查

## 📄 许可

[GPL v2](LICENSE)
