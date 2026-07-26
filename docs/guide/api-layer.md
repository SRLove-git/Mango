# API 层

项目通过 WordPress REST API 获取数据，API 封装位于 `src/api/wordpress.ts`。

## 配置

API 基础地址通过 `MANGO_DATA` 全局变量传入（由 WordPress 主题输出），或使用默认路径：

```ts
const API_URL = (window as any).MANGO_DATA?.apiUrl || '/wp-json/wp/v2'
```

在开发环境中，Vite 配置文件会代理 `/wp-json` 请求到本地 WordPress 站点。

## API 函数

### 文章相关

| 函数 | 说明 |
| :--- | :--- |
| `getPosts(page, perPage)` | 获取文章列表，支持分页 |
| `getPost(slug)` | 根据 slug 获取单篇文章 |
| `getPostsByCategory(slug, page, perPage)` | 按分类获取文章 |
| `searchPosts(query, page, perPage)` | 搜索文章 |
| `getAllPosts(perPage)` | 获取所有文章（自动分页取完） |

### 分类与标签

| 函数 | 说明 |
| :--- | :--- |
| `getCategories()` | 获取所有分类 |
| `getTags()` | 获取标签（前 30 个） |

### 页面

| 函数 | 说明 |
| :--- | :--- |
| `getPage(slug)` | 根据 slug 获取 WordPress 页面 |

### 站点信息

| 函数 | 说明 |
| :--- | :--- |
| `getUser()` | 获取站点作者信息 |
| `getMenu()` | 获取导航菜单 |
| `getCategoryMenu()` | 获取分类栏菜单 |

## 数据类型

```ts
interface WPPost {
  id: number
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  slug: string
  date: string
  featured_media: number
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text: string }>
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>
  }
}

interface PostsResponse {
  posts: WPPost[]
  total: number
  totalPages: number
}
```

## 随机图片

`src/api/image.ts` 提供了随机图片 API，用于文章无特色图片时的兜底显示。

```ts
function getRandomImageUrl(seed?: string | number, params?: { category?: string; type?: string }): string
function useRandomImageFallback(): boolean
```
