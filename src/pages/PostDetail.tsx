import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost, getPostById, getTopic } from '../api/wordpress'
import type { WPPost, Topic } from '../api/wordpress'
import MarkdownRenderer from '../components/MarkdownRenderer'

export default function PostDetail() {
  // 支持多种路由:
  //   /post/:slug                  — slug 是文章 slug
  //   /topic/:slug/post/:postSlug  — slug 是专栏 ID, postSlug 是文章 slug
  //   /archives/:postId            — postId 是文章数字 ID
  //   /archives/:postId.html       — postId 是文章数字 ID（含 .html 后缀）
  const params = useParams<{ slug: string; postSlug?: string; postId?: string }>()
  const postSlug = params.postSlug || params.slug
  const postId = params.postId ? parseInt(params.postId, 10) : undefined
  const [post, setPost] = useState<WPPost | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postSlug && !postId) return
    setLoading(true)
    setTopic(null)

    const fetchPromise = postId
      ? getPostById(postId)
      : postSlug
        ? getPost(postSlug)
        : Promise.resolve(null)

    fetchPromise
      .then((p) => {
        setPost(p)
        if (p?.title?.rendered) {
          document.title = `${p.title.rendered} - Mango`
        }
        if (p?.meta?.topic) {
          getTopic(p.meta.topic).then((t) => setTopic(t)).catch(() => {})
        }
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
  }, [postSlug, postId])

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
      {/* Topic breadcrumb */}
      {topic && (
        <div className="topic-breadcrumb">
          <Link to="/">首页</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/topics">专栏</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/topic/${topic.id}/post/${post.slug}`} className="breadcrumb-current">
            {topic.title}
          </Link>
        </div>
      )}

      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass">
        {featuredImage && (
          <img
            className="detail-cover"
            src={featuredImage}
            alt={post.title.rendered}
          />
        )}

        {/* Topic badge */}
        {topic && (
          <Link to={`/topic/${topic.id}/post/${topic.posts[0]?.slug || topic.id}`} className="topic-badge">
            <span className="topic-badge-icon">
              {topic.icon ? (
                <img src={topic.icon} alt="" />
              ) : (
                <span>{topic.title.charAt(0)}</span>
              )}
            </span>
            <span className="topic-badge-name">{topic.title}</span>
            <span className="topic-badge-count">{topic.post_count} 篇</span>
          </Link>
        )}

        <h1 style={{ margin: topic ? '12px 0 16px' : '0 0 16px', fontSize: 26, fontWeight: 800 }}>
          {post.title.rendered}
        </h1>

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

        <MarkdownRenderer content={post.content.rendered} />
      </div>

      {/* Topic related posts section */}
      {topic && topic.posts.length > 1 && (
        <div className="glass topic-related-section">
          <h3 className="topic-related-title">
            专栏「{topic.title}」的其他文章
          </h3>
          <div className="topic-related-list">
            {topic.posts
              .filter((p) => p.slug !== post.slug)
              .map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/topic/${topic.id}/post/${relatedPost.slug}`}
                  className={`topic-related-item ${relatedPost.slug === post.slug ? 'active' : ''}`}
                >
                  <span className="topic-related-dot" />
                  <span className="topic-related-name">{relatedPost.title}</span>
                </Link>
              ))}
          </div>
        </div>
      )}
    </article>
  )
}
