import { Link } from 'react-router-dom'
import type { WPPost } from '../api/wordpress'

interface PostCardProps {
  post: WPPost
}

export default function PostCard({ post }: PostCardProps) {
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  const categories = post._embedded?.['wp:term']?.[0] ?? []

  return (
    <article className="post-card glass">
      {featuredImage && (
        <Link to={`/post/${post.slug}`} className="post-thumb-wrap group">
          {/* Overlay — 借鉴 Firefly 的 hover/active 遮罩 */}
          <div className="post-thumb-overlay" />
          <img src={featuredImage} alt={post.title.rendered} loading="lazy" className="post-thumb-img" />
          {/* 箭头 — 借鉴 Firefly 的 hover 出现效果 */}
          <span className="post-thumb-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>
      )}
      <div className="post-info">
        <h2>
          <Link to={`/post/${post.slug}`} className="post-title-link">
            {post.title.rendered}
          </Link>
        </h2>
        <div className="post-meta">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('zh-CN')}
          </time>
          {categories.length > 0 && categories.map((cat: any) => (
            <Link key={cat.id} to={`/category/${cat.slug}`} className="category-tag">
              {cat.name}
            </Link>
          ))}
        </div>
        <div
          className="post-excerpt"
          dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
        />
        <Link to={`/post/${post.slug}`} className="read-more">
          阅读更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="read-more-arrow">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </article>
  )
}
