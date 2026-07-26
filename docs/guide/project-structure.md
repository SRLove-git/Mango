# 目录概览

```
mango/
├── public/                      # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   ├── wordpress.ts         # WordPress REST API 封装
│   │   └── image.ts             # 随机图片 API
│   ├── components/
│   │   ├── CategoryBar.tsx       # 分类导航栏
│   │   ├── Layout.tsx            # 布局组件（导航栏、侧边栏、页脚）
│   │   ├── Pagination.tsx        # 分页组件
│   │   ├── PostCard.tsx          # 文章卡片
│   │   ├── ProgressBar.tsx       # 阅读进度条
│   │   └── Sidebar.tsx           # 侧边栏
│   ├── pages/
│   │   ├── Archive.tsx           # 归档页
│   │   ├── Category.tsx          # 分类页
│   │   ├── Home.tsx              # 首页
│   │   ├── Links.tsx             # 友链页
│   │   ├── Page.tsx              # 通用页面
│   │   ├── PostDetail.tsx        # 文章详情页
│   │   └── Search.tsx            # 搜索页
│   ├── App.tsx                   # 路由配置
│   ├── main.tsx                  # 入口文件
│   └── index.css                 # 全局样式
├── theme/                        # WordPress 主题文件
│   ├── functions.php             # 主题函数（REST API、设置页面等）
│   ├── index.php                 # 主题入口
│   └── style.css                 # 主题信息
├── docs/                         # 文档
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .oxlintrc.json
```
