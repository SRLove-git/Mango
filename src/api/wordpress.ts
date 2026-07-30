const API_URL = (window as any).MANGO_DATA?.apiUrl || '/wp-json/wp/v2'

export interface WPPost {
  id: number
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  slug: string
  date: string
  featured_media: number
  meta?: {
    topic?: string
    external_thumbnail?: string
  }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      alt_text: string
    }>
    'wp:term'?: Array<Array<{
      id: number
      name: string
      slug: string
    }>>
  }
}

interface WPCategory {
  id: number
  name: string
  slug: string
  count: number
}

export interface PostsResponse {
  posts: WPPost[]
  total: number
  totalPages: number
}

interface ApiResult<T> {
  data: T
  total: number
  totalPages: number
}

async function fetchAPI<T>(endpoint: string, params: Record<string, string> = {}): Promise<ApiResult<T>> {
  const url = new URL(`${API_URL}${endpoint}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const res = await fetch(url.toString())
  const total = Number(res.headers.get('X-WP-Total') || 0)
  const totalPages = Number(res.headers.get('X-WP-TotalPages') || 0)

  const data = await res.json()
  return { data, total, totalPages }
}

function isPostArray(val: unknown): val is WPPost[] {
  return Array.isArray(val)
}

function isCategoryArray(val: unknown): val is WPCategory[] {
  return Array.isArray(val)
}

export async function getPosts(page = 1, perPage = 10): Promise<PostsResponse> {
  const { data, total, totalPages } = await fetchAPI<WPPost[]>('/posts', {
    _embed: '1',
    page: String(page),
    per_page: String(perPage),
  })

  return {
    posts: isPostArray(data) ? data : [],
    total,
    totalPages,
  }
}

export async function getPost(slug: string): Promise<WPPost | null> {
  const { data } = await fetchAPI<WPPost[]>('/posts', {
    slug,
    _embed: '1',
  })

  return isPostArray(data) && data.length > 0 ? data[0] : null
}

export async function getPostById(id: number): Promise<WPPost | null> {
  const url = `${API_URL}/posts/${id}?_embed=1`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getPage(slug: string): Promise<WPPost | null> {
  const { data } = await fetchAPI<WPPost[]>('/pages', {
    slug,
    _embed: '1',
  })

  return isPostArray(data) && data.length > 0 ? data[0] : null
}

export async function getCategories(): Promise<WPCategory[]> {
  const { data } = await fetchAPI<WPCategory[]>('/categories', {
    per_page: '50',
    orderby: 'count',
    order: 'desc',
  })

  return isCategoryArray(data) ? data : []
}

export async function getPostsByCategory(
  categorySlug: string,
  page = 1,
  perPage = 10
): Promise<PostsResponse> {
  const { data: cats } = await fetchAPI<WPCategory[]>('/categories', {
    slug: categorySlug,
  })

  const categoryId = isCategoryArray(cats) && cats.length > 0 ? cats[0].id : 0
  if (!categoryId) return { posts: [], total: 0, totalPages: 0 }

  const { data, total, totalPages } = await fetchAPI<WPPost[]>('/posts', {
    _embed: '1',
    categories: String(categoryId),
    page: String(page),
    per_page: String(perPage),
  })

  return {
    posts: isPostArray(data) ? data : [],
    total,
    totalPages,
  }
}

export async function searchPosts(
  query: string,
  page = 1,
  perPage = 10
): Promise<PostsResponse> {
  const { data, total, totalPages } = await fetchAPI<WPPost[]>('/posts', {
    _embed: '1',
    search: query,
    page: String(page),
    per_page: String(perPage),
  })

  return {
    posts: isPostArray(data) ? data : [],
    total,
    totalPages,
  }
}

/** 获取所有文章（分页取完）— 用于归档页面 */
export async function getAllPosts(perPage = 100): Promise<WPPost[]> {
  // 先获取第一页，拿到总页数
  const first = await fetchAPI<WPPost[]>('/posts', {
    _embed: '1',
    per_page: String(perPage),
    page: '1',
  })
  const allPosts: WPPost[] = isPostArray(first.data) ? [...first.data] : []
  const totalPages = first.totalPages

  // 并行请求剩余页面
  const remainingPages: Promise<ApiResult<WPPost[]>>[] = []
  for (let p = 2; p <= totalPages; p++) {
    remainingPages.push(
      fetchAPI<WPPost[]>('/posts', {
        _embed: '1',
        per_page: String(perPage),
        page: String(p),
      })
    )
  }

  const results = await Promise.all(remainingPages)
  for (const result of results) {
    if (isPostArray(result.data)) {
      allPosts.push(...result.data)
    }
  }

  return allPosts
}

export async function getTags(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
  const { data } = await fetchAPI<Array<{ id: number; name: string; slug: string; count: number }>>('/tags', {
    per_page: '30',
    orderby: 'count',
    order: 'desc',
  })
  return Array.isArray(data) ? data : []
}

/** 获取站点作者信息 (users 列表取第一个) */
export async function getUser(): Promise<{ name: string; description: string; avatar_urls: Record<string, string> } | null> {
  const { data } = await fetchAPI<Array<{ name: string; description: string; avatar_urls: Record<string, string> }>>('/users', {
    per_page: '1',
  })
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

/* =====================================================
 * 导航菜单
 * ===================================================== */

export interface WPMenuItem {
  id: number
  title: string
  url: string
  path?: string
  slug: string
  parent: number
  order: number
  target: string
}

export async function getMenu(): Promise<WPMenuItem[]> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/menu`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function getCategoryMenu(): Promise<WPMenuItem[]> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/category-menu`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/* =====================================================
 * 专栏系统 (Topic)
 * ===================================================== */

export interface Topic {
  id: string
  name: string
  title: string
  description: string
  icon: string
  order_by: string
  post_count: number
  posts: TopicPost[]
}

export interface TopicPost {
  id: number
  title: string
  slug: string
  date: string
  excerpt: string
  thumbnail?: string
  categories?: Array<{ id: number; name: string; slug: string }>
}

export async function getTopics(): Promise<Topic[]> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/topics`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function getTopic(slug: string): Promise<Topic | null> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/topics/${encodeURIComponent(slug)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/* =====================================================
 * Wiki 系统
 * ===================================================== */

export interface WikiPageNode {
  id: string
  title: string
  content: string
  parent: string
  order: number
  icon?: string
}

export interface WikiTreeItem {
  id: string
  title: string
  icon: string
  parent: string
  order: number
  children: WikiTreeItem[]
}

export interface WikiProject {
  id: string
  name: string
  title: string
  subtitle: string
  icon: string
  homepage: string
  page_count?: number
}

export interface WikiProjectDetail extends WikiProject {
  tree: WikiTreeItem[]
  pages: WikiPageNode[]
  page?: WikiPageNode
  prev?: { slug: string; title: string } | null
  next?: { slug: string; title: string } | null
}

export async function getWikiProjects(): Promise<WikiProject[]> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/wiki`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function getWikiProject(project: string): Promise<WikiProjectDetail | null> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/wiki/${encodeURIComponent(project)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getWikiPage(project: string, slug: string): Promise<WikiProjectDetail | null> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/wiki/${encodeURIComponent(project)}/${encodeURIComponent(slug)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/* =====================================================
 * 评论系统 (Comments)
 * ===================================================== */

export interface WPComment {
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

export interface CommentSubmitData {
  post: number
  author_name: string
  author_email: string
  author_url?: string
  content: string
  parent?: number
}

/** 获取指定文章的评论列表 */
export async function getComments(
  postId: number,
  page = 1,
  perPage = 10
): Promise<{ comments: WPComment[]; total: number; totalPages: number }> {
  const { data, total, totalPages } = await fetchAPI<WPComment[]>('/comments', {
    post: String(postId),
    page: String(page),
    per_page: String(perPage),
    orderby: 'date_gmt',
    order: 'asc',
  })
  return {
    comments: Array.isArray(data) ? data : [],
    total,
    totalPages,
  }
}

/** 提交评论 */
export async function postComment(data: CommentSubmitData): Promise<{ comment: WPComment | null; status: string }> {
  const url = `${API_URL}/comments`
  const nonce = (window as any).MANGO_DATA?.nonce || ''
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonce,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || '提交评论失败')
    }
    const comment: WPComment = await res.json()
    return { comment, status: comment.status }
  } catch (e) {
    throw e
  }
}

export type { WPCategory }

/* =====================================================
 * 音乐 - 网易云歌单
 * ===================================================== */

export interface MusicTrack {
  title: string
  artist: string
  url: string
}

export interface NeteasePlaylist {
  name: string
  tracks: MusicTrack[]
}

/** 获取网易云音乐歌单（通过后端代理，避免 CORS） */
export async function getNeteasePlaylist(playlistId: string): Promise<NeteasePlaylist | null> {
  const siteUrl = (window as any).MANGO_DATA?.siteUrl || ''
  const url = `${siteUrl}/wp-json/mango/v1/netease/playlist?id=${encodeURIComponent(playlistId)}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
