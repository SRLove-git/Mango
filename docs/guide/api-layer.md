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
| `getPostById(id)` | 根据 ID 获取单篇文章 |
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

### 专栏系统

| 函数 | 说明 |
| :--- | :--- |
| `getTopics()` | 获取所有专栏列表 |
| `getTopic(slug)` | 根据 slug 获取单个专栏详情（含文章列表） |

### Wiki 系统

| 函数 | 说明 |
| :--- | :--- |
| `getWikiProjects()` | 获取所有 Wiki 项目列表 |
| `getWikiProject(project)` | 获取单个 Wiki 项目详情（含页面树） |
| `getWikiPage(project, slug)` | 获取 Wiki 项目中的具体页面内容 |

### 评论系统

| 函数 | 说明 |
| :--- | :--- |
| `getComments(postId, page, perPage)` | 获取指定文章的评论列表 |
| `postComment(data)` | 提交评论（需 nonce 认证） |

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
  meta?: {
    topic?: string
  }
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text: string }>
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>
  }
}

interface WPCategory {
  id: number
  name: string
  slug: string
  count: number
}

interface PostsResponse {
  posts: WPPost[]
  total: number
  totalPages: number
}

// 专栏
interface Topic {
  id: string
  name: string
  title: string
  description: string
  icon: string
  order_by: string
  post_count: number
  posts: TopicPost[]
}

interface TopicPost {
  id: number
  title: string
  slug: string
  date: string
  excerpt: string
  thumbnail?: string
  categories?: Array<{ id: number; name: string; slug: string }>
}

// Wiki
interface WikiProject {
  id: string
  name: string
  title: string
  subtitle: string
  icon: string
  homepage: string
  page_count?: number
}

interface WikiPageNode {
  id: string
  title: string
  content: string
  parent: string
  order: number
  icon?: string
}

interface WikiTreeItem {
  id: string
  title: string
  icon: string
  parent: string
  order: number
  children: WikiTreeItem[]
}

interface WikiProjectDetail extends WikiProject {
  tree: WikiTreeItem[]
  pages: WikiPageNode[]
  page?: WikiPageNode
  prev?: { slug: string; title: string } | null
  next?: { slug: string; title: string } | null
}

// 评论
interface WPComment {
  id: number
  post: number
  parent: number
  author_name: string
  author_email: string
  author_url: string
  author_avatar_urls: Record<string, string>
  date: string
  content: { rendered: string }
  link: string
  type: string
  status: string
}

interface CommentSubmitData {
  post: number
  author_name: string
  author_email: string
  author_url?: string
  content: string
  parent?: number
}
```

## 随机图片

`src/api/image.ts` 提供了随机图片 API，用于文章无特色图片时的兜底显示。

```ts
function getRandomImageUrl(seed?: string | number, params?: { category?: string; type?: string }): string
function useRandomImageFallback(): boolean
```
