import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { WPPost } from '../api/wordpress'
import { getRandomImageUrl, useRandomImageFallback } from '../api/image'

const MAX_RETRIES = 5

interface PostCardProps {
  post: WPPost
}

export default function PostCard({ post }: PostCardProps) {
  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
  const useFallback = useRandomImageFallback()
  const [retryCount, setRetryCount] = useState(0)
  const [hidden, setHidden] = useState(false)
  const categories = post._embedded?.['wp:term']?.[0] ?? []

  // 有特色图片 → 用特色图片；无特色图片且启用兜底 → 用随机图；否则无图
  const imageUrl = featuredImage || (useFallback ? getRandomImageUrl(`${post.id}-${retryCount}`) : null)

  // 无图或超过重试次数后隐藏，则不渲染缩略图
  const showThumb = imageUrl && !hidden

  return (
    <article className="post-card glass">
      {showThumb && (
        <Link to={`/archives/${post.id}.html`} className="post-thumb-wrap group">
          <div className="post-thumb-overlay" />
          <img
            src={imageUrl!}
            alt={post.title.rendered}
            loading="lazy"
            className="post-thumb-img"
            onError={() => {
              if (retryCount < MAX_RETRIES - 1) {
                setRetryCount((c) => c + 1)
              } else {
                setHidden(true)
              }
            }}
          />
          <span className="post-thumb-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>
      )}
      <div className="post-info">
        <h2>
          <Link to={`/archives/${post.id}.html`} className="post-title-link">
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
        <Link to={`/archives/${post.id}.html`} className="read-more">
          阅读更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="read-more-arrow">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>
    </article>
  )
}
