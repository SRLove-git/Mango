# WordPress 主题

`theme/` 目录包含主题文件，用于在 WordPress 中加载 SPA 前端。

## 文件说明

| 文件 | 说明 |
| :--- | :--- |
| `style.css` | 主题信息，WordPress 通过此文件识别主题 |
| `index.php` | 主题入口文件 |
| `functions.php` | 主题函数入口，加载 `inc/` 下的所有模块 |
| `inc/setup.php` | 主题初始化、脚本加载、`MANGO_DATA` 数据注入 |
| `inc/admin.php` | 后台设置页面（基本设置、主题设置、侧边栏管理、Wiki 管理） |
| `inc/customizer.php` | WordPress 定制器集成（配色方案等） |
| `inc/helpers.php` | 辅助函数 |
| `inc/links.php` | 友链数据管理与健康检查 |
| `inc/topics.php` | 专栏系统 REST API 注册 |
| `inc/wiki.php` | Wiki 知识库 REST API 注册与数据管理 |

## 激活主题

将 `theme/` 目录上传至 WordPress 的 `/wp-content/themes/` 目录，然后在 WordPress 后台 **外观 → 主题** 中激活。

## 核心功能

### 脚本加载

主题通过 `manifest.json`（Vite 构建产物）自动找到入口 JS/CSS 文件并加载，同时将 WordPress 数据传递给前端：

```php
wp_localize_script('mango-app', 'MANGO_DATA', [
  'siteUrl'        => site_url(),
  'apiUrl'         => esc_url_raw(rest_url('wp/v2')),
  'themeUri'       => get_template_directory_uri(),
  'nonce'          => wp_create_nonce('wp_rest'),
  'randomImageApi' => esc_url_raw(...),
  'useRandomImage' => ...,
]);
```

### 自定义 REST API

主题注册了以下自定义 API 路由：

| 路由 | 说明 |
| :--- | :--- |
| `GET /wp-json/mango/v1/menu` | 获取导航菜单 |
| `GET /wp-json/mango/v1/category-menu` | 获取分类栏菜单 |
| `GET /wp-json/mango/v1/links` | 获取友链数据（含健康状态和文章） |
| `POST /wp-json/mango/v1/links/refresh` | 刷新友链缓存（需管理员权限） |
| `GET /wp-json/mango/v1/topics` | 获取所有专栏列表 |
| `GET /wp-json/mango/v1/topics/{slug}` | 获取单个专栏详情（含文章） |
| `GET /wp-json/mango/v1/wiki` | 获取所有 Wiki 项目列表 |
| `GET /wp-json/mango/v1/wiki/{project}` | 获取 Wiki 项目详情（含页面树） |
| `GET /wp-json/mango/v1/wiki/{project}/{slug}` | 获取 Wiki 页面内容 |
| `POST /wp-json/mango/v1/wiki/save` | 保存 Wiki 数据（需管理员权限） |

### 分类导航栏管理

激活主题后，前往 WordPress 后台 **外观 → 菜单**，新建一个菜单并添加分类链接，然后在"菜单位置"中勾选 **Category Bar** 并保存。前端会自动读取该菜单渲染分类导航栏。

### 主题设置

主题提供了后台设置页面（**外观 → Mango 主题设置**），包含：

- **基本设置**：站点 Logo、头像、随机图片 API、页脚文字
- **主题设置**：内置配色方案选择（Firefly 青绿暗色 / 纯黑简约）、自定义配色方案、卡片圆角
- **侧边栏管理**：配置左右侧边栏模块
- **Wiki 管理**：管理 Wiki 知识库项目和页面
