import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<WPPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPost(slug)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!post) {
    return (
      <div className="glass empty-state">
        <h3>文章未找到</h3>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>
    )
  }

  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  const categories = post._embedded?.['wp:term']?.[0] ?? []

  return (
    <article>
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass">
        {featuredImage && (
          <img
            className="detail-cover"
            src={featuredImage}
            alt={post.title.rendered}
          />
        )}

        <h1 style={{ margin: '0 0 16px', fontSize: 26, fontWeight: 800 }}>{post.title.rendered}</h1>

        <div className="detail-meta">
          <time dateTime={post.date}>
            📅 {new Date(post.date).toLocaleDateString('zh-CN', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </time>
          {categories.length > 0 && (
            <span>
              📂 {categories.map((cat: any, i: number) => (
                <span key={cat.id}>
                  {i > 0 && ', '}
                  <Link to={`/category/${cat.slug}`} style={{ color: 'var(--blue)' }}>{cat.name}</Link>
                </span>
              ))}
            </span>
          )}
        </div>

        <div
          className="detail-content"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />
      </div>
    </article>
  )
}
