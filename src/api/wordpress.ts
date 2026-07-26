const API_URL = (window as any).MANGO_DATA?.apiUrl || '/wp-json/wp/v2'

interface WPPost {
  id: number
  title: { rendered: string }
  excerpt: { rendered: string }
  content: { rendered: string }
  slug: string
  date: string
  featured_media: number
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

export type { WPPost, WPCategory }
