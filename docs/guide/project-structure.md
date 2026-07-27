# 目录概览

```
mango/
├── public/                          # 静态资源
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── api/
│   │   ├── wordpress.ts            # WordPress REST API 封装
│   │   └── image.ts                # 随机图片 API
│   ├── components/
│   │   ├── CategoryBar.tsx          # 分类导航栏
│   │   ├── ClickEffect.tsx          # 点击特效
│   │   ├── Layout.tsx               # 布局组件（导航栏、侧边栏、页脚）
│   │   ├── Live2D.tsx               # Live2D 看板娘
│   │   ├── MarkdownRenderer.tsx     # Markdown 渲染
│   │   ├── NativeComments.tsx       # 原生 WordPress 评论（Waline）
│   │   ├── PageTransition.tsx       # 页面过渡动画
│   │   ├── Pagination.tsx           # 分页组件
│   │   ├── PostCard.tsx             # 文章卡片
│   │   ├── SakuraEffect.tsx         # 樱花特效
│   │   ├── Sidebar.tsx              # 侧边栏
│   │   └── WallpaperSettings.tsx    # 壁纸设置
│   ├── context/
│   │   ├── ArticleTocContext.tsx     # 目录扫描上下文
│   │   ├── BannerTitleContext.tsx    # 页面标题上下文
│   │   └── SiteDataContext.tsx       # 站点数据上下文
│   ├── pages/
│   │   ├── Archive.tsx              # 归档页
│   │   ├── Categories.tsx           # 全部分类列表页
│   │   ├── Category.tsx             # 分类页
│   │   ├── Guestbook.tsx            # 留言板
│   │   ├── Home.tsx                 # 首页
│   │   ├── Links.tsx                # 友链页
│   │   ├── Page.tsx                 # 通用页面
│   │   ├── PostDetail.tsx           # 文章详情页
│   │   ├── Search.tsx               # 搜索页
│   │   ├── TopicDetail.tsx          # 专栏详情页
│   │   ├── Topics.tsx               # 专栏列表页
│   │   ├── WikiDetail.tsx           # Wiki 页面详情
│   │   └── WikiIndex.tsx            # Wiki 项目列表
│   ├── App.tsx                      # 路由配置
│   ├── main.tsx                     # 入口文件
│   └── index.css                    # 全局样式
├── theme/                           # WordPress 主题文件
│   ├── inc/
│   │   ├── admin.php               # 后台设置页面
│   │   ├── customizer.php          # 定制器（配色方案等）
│   │   ├── helpers.php             # 辅助函数
│   │   ├── links.php               # 友链 API（健康状态、刷新缓存）
│   │   ├── setup.php               # 主题初始化与脚本加载
│   │   ├── topics.php              # 专栏系统 REST API
│   │   └── wiki.php                # Wiki REST API
│   ├── functions.php               # 主题函数（REST API、设置页面等）
│   ├── index.php                   # 主题入口
│   └── style.css                   # 主题信息
├── docs/                           # 文档（VitePress）
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .oxlintrc.json
```
