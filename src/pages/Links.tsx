import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface LinkItem {
  title: string
  url: string
  avatar: string
  description: string
}

const API_URL = (window as any).MANGO_DATA?.apiUrl || '/wp-json/wp/v2'
const LINKS_API = API_URL.replace('/wp/v2', '/mango/v1/links')

export default function Links() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(LINKS_API)
      .then((res) => res.json())
      .then((data) => {
        setLinks(Array.isArray(data) ? data : [])
      })
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <article>
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass links-hero">
        <h1 className="links-hero-title">友情链接</h1>
        <p className="links-hero-desc">欢迎交换友链，一起探索互联网的乐趣。</p>
      </div>

      {links.length === 0 ? (
        <div className="glass empty-state">
          <p>还没有友链数据，请先在后台添加。</p>
        </div>
      ) : (
        <div className="links-grid">
          {links.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="external nofollow noopener noreferrer"
              className="links-card"
            >
              <div className="links-card-avatar">
                <img
                  src={item.avatar || 'https://via.placeholder.com/80'}
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'
                  }}
                />
              </div>
              <div className="links-card-name">{item.title}</div>
              {item.description && (
                <div className="links-card-desc">{item.description}</div>
              )}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}
