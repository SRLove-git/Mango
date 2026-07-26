import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface LabelItem {
  name: string
  color: string
  lightness: number
  saturation: number
  hue: number
}

interface PostItem {
  title: string
  link: string
  published: string
}

interface LinkItem {
  id: number
  title: string
  url: string
  html_url: string
  avatar: string
  avatar_url: string
  description: string
  feed: string
  labels: LabelItem[]
  posts: PostItem[]
}

const API_URL = (window as any).MANGO_DATA?.apiUrl || '/wp-json/wp/v2'
const LINKS_API = API_URL.replace('/wp/v2', '/mango/v1/links')
const DEFAULT_AVATAR = 'https://via.placeholder.com/80'

/** 计算 Stellar 风格 label 的文字颜色（根据背景 lightness/saturation 动态选择） */
function labelTextColor(label: LabelItem): string {
  if (label.lightness > 75) {
    return `hsla(${label.hue}, ${label.saturation}%, 20%, 1)`
  }
  if (label.saturation > 90 && label.lightness > 40) {
    return `hsla(${label.hue}, 50%, 20%, 1)`
  }
  return 'white'
}

function getAvatarUrl(item: LinkItem): string {
  const src = item.avatar || item.avatar_url
  if (src) return src
  try {
    const u = new URL(item.url || item.html_url)
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=80`
  } catch {
    return DEFAULT_AVATAR
  }
}

const REFRESH_API = LINKS_API + '/refresh'

export default function Links() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchLinks = () => {
    setLoading(true)
    fetch(LINKS_API)
      .then((res) => {
        if (!res.ok) throw new Error('获取友链数据失败')
        return res.json()
      })
      .then((data) => {
        setLinks(Array.isArray(data) ? data : [])
      })
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }

  const refreshLinks = () => {
    setRefreshing(true)
    const nonce = (window as any).MANGO_DATA?.nonce || ''
    fetch(REFRESH_API, {
      method: 'POST',
      headers: { 'X-WP-Nonce': nonce },
    })
      .then((res) => {
        if (!res.ok) throw new Error('刷新失败')
        return res.json()
      })
      .then((data) => {
        if (data.links) setLinks(data.links)
      })
      .catch(() => {
        // 降级：重新 GET
        return fetchLinks()
      })
      .finally(() => setRefreshing(false))
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  if (loading) {
    return (
      <article>
        <div className="loading">加载友链中...</div>
      </article>
    )
  }

  return (
    <article className="links-page">
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass links-hero">
        <h1 className="links-hero-title">友情链接</h1>
        <p className="links-hero-desc">
          共 {links.length} 个站点 · 欢迎交换友链，一起探索互联网的乐趣。
        </p>
        <button
          className="refresh-btn"
          onClick={refreshLinks}
          disabled={refreshing}
        >
          {refreshing ? '检测中…' : '刷新检测'}
        </button>
      </div>

      {links.length === 0 && (
        <div className="glass empty-state">
          <p>还没有友链数据，请先在后台添加。</p>
        </div>
      )}

      {links.length > 0 && (
        <div className="grid-box">
          {links.map((item) => (
            <div key={item.id} className="grid-cell user-post-card">
              {/* Avatar Box */}
              <div className="avatar-box">
                <a
                  className="card-link"
                  href={item.url || item.html_url}
                  target="_blank"
                  rel="external nofollow noopener noreferrer"
                >
                  <img
                    src={getAvatarUrl(item)}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR
                    }}
                  />
                  <span className="title">{item.title}</span>
                </a>

                {/* Labels */}
                {item.labels && item.labels.length > 0 && (
                  <div className="labels">
                    {item.labels.map((label, li) => (
                      <div
                        key={li}
                        className="label"
                        style={{
                          background: `#${label.color}`,
                          color: labelTextColor(label),
                        }}
                      >
                        {label.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Previews */}
              <div className="previews">
                <div className="desc">
                  {item.description || ''}
                </div>

                <div className={'posts' + (item.posts && item.posts.length === 1 ? ' posts--single' : '')}>
                  {item.posts && item.posts.length > 0 ? (
                    item.posts.map((post, pi) => (
                      <a
                        key={pi}
                        className="post-link"
                        href={post.link}
                        target="_blank"
                        rel="external nofollow noopener noreferrer"
                      >
                        <span className="title">{post.title}</span>
                        <span className="date">{post.published}</span>
                      </a>
                    ))
                  ) : (
                    <span className="no-post">
                      {item.feed?.length > 0 ? 'RSS 解析失败' : '未设置 RSS 链接'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
