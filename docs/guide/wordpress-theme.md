# WordPress 主题

`theme/` 目录包含主题文件，用于在 WordPress 中加载 SPA 前端。

## 文件说明

| 文件 | 说明 |
| :--- | :--- |
| `style.css` | 主题信息，WordPress 通过此文件识别主题 |
| `index.php` | 主题入口文件 |
| `functions.php` | 主题函数，包含脚本加载、REST API 注册、设置页面等 |

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

### 分类导航栏管理

激活主题后，前往 WordPress 后台 **外观 → 菜单**，新建一个菜单并添加分类链接，然后在"菜单位置"中勾选 **Category Bar** 并保存。前端会自动读取该菜单渲染分类导航栏。

### 主题设置

主题提供了后台设置页面（**外观 → Mango 主题设置**），包含：

- **基本设置**：站点 Logo、头像、随机图片 API、页脚文字
- **主题设置**：内置配色方案选择（Anime 紫蓝霓虹 / 黑色简约）、自定义配色方案、卡片圆角
