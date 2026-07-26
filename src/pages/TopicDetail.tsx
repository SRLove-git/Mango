import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTopic } from '../api/wordpress'
import type { Topic } from '../api/wordpress'

export default function TopicDetail() {
  const { slug, postSlug } = useParams<{ slug: string; postSlug?: string }>()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getTopic(slug)
      .then(setTopic)
      .catch(() => setTopic(null))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!topic) {
    return (
      <div className="glass empty-state">
        <h3>专栏未找到</h3>
        <Link to="/topics" className="back-link">← 返回专栏列表</Link>
      </div>
    )
  }

  const currentPostSlug = postSlug || (topic.posts.length > 0 ? topic.posts[0].slug : '')

  return (
    <article className="topic-detail">
      {/* Breadcrumb */}
      <div className="topic-breadcrumb">
        <Link to="/">首页</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to="/topics">专栏</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{topic.title}</span>
      </div>

      {/* Topic header */}
      <div className="glass topic-header-section">
        <div className="topic-header-icon">
          {topic.icon ? (
            <img src={topic.icon} alt={topic.title} />
          ) : (
            <span className="topic-header-icon-placeholder">
              {topic.title.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <h1 className="topic-header-title">{topic.title}</h1>
          {topic.description && (
            <p className="topic-header-desc">{topic.description}</p>
          )}
          <span className="topic-header-count">{topic.post_count} 篇文章</span>
        </div>
      </div>

      {/* Post list */}
      <div className="topic-posts-list">
        <h2 className="section-title">文章列表</h2>
        {topic.posts.length === 0 ? (
          <div className="glass empty-state">暂无文章</div>
        ) : (
          topic.posts.map((post, index) => {
            const isCurrent = post.slug === currentPostSlug
            const postPath = postSlug !== undefined
              ? `/topic/${topic.id}/post/${post.slug}`
              : `/post/${post.slug}`

            return (
              <Link
                key={post.id}
                to={postPath}
                className={`topic-post-item glass ${isCurrent ? 'topic-post-item--active' : ''}`}
              >
                <span className="topic-post-index">{index + 1}</span>
                <div className="topic-post-info">
                  <h3 className="topic-post-title">{post.title}</h3>
                  <div className="topic-post-meta">
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('zh-CN', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </time>
                    {post.categories && post.categories.length > 0 && (
                      <span className="topic-post-cat">{post.categories[0].name}</span>
                    )}
                  </div>
                </div>
                <span className="topic-post-arrow">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </Link>
            )
          })
        )}
      </div>
    </article>
  )
}
