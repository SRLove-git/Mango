import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPage } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'

export default function Page() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<WPPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPage(slug)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!page) {
    return (
      <div className="glass empty-state">
        <h3>页面未找到</h3>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>
    )
  }

  return (
    <article>
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass">
        <h1 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 800 }}>
          {page.title.rendered}
        </h1>

        <div
          className="detail-content"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />
      </div>
    </article>
  )
}
