import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost, getPostById, getTopic } from '../api/wordpress'
import type { WPPost, Topic } from '../api/wordpress'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useArticleToc } from '../context/ArticleTocContext'
import { getRandomImageUrl, useRandomImageFallback } from '../api/image'

export default function PostDetail() {
  const params = useParams<{ slug: string; postSlug?: string; postId?: string }>()
  const postSlug = params.postSlug || params.slug
  const postId = params.postId ? parseInt(params.postId, 10) : undefined
  const [post, setPost] = useState<WPPost | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const { triggerScan } = useArticleToc()
  const bannerBgRef = useRef<HTMLDivElement>(null)

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

  // 文章内容渲染后通知 Sidebar 重新扫描标题
  useEffect(() => {
    if (post) triggerScan()
  }, [post, triggerScan])

  // 滚动视差效果 — 只作用于背景层，不动文字/覆盖层
  useEffect(() => {
    const el = bannerBgRef.current
    if (!el || !post) return
    const handleScroll = () => {
      const scrollY = window.scrollY
      el.style.transform = `translateY(${scrollY * 0.15}px)`
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [post])

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
  const useFallback = useRandomImageFallback()
  const bannerUrl = featuredImage || (useFallback ? getRandomImageUrl(post.id) : null)
  const categories = post._embedded?.['wp:term']?.[0] ?? []
  const postDate = new Date(post.date).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <article className="post-detail">
      {/* Full-width cover banner */}
      <div className="post-banner">
        <div className="post-banner-bg" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined} ref={bannerBgRef} />
        <div className="post-banner-overlay" />

        <div className="post-banner-content">
          {/* Topic badge */}
          {topic && (
            <Link
              to={`/topic/${topic.id}/post/${topic.posts[0]?.slug || topic.id}`}
              className="post-banner-topic"
            >
              <span className="topic-badge-icon">
                {topic.icon ? (
                  <img src={topic.icon} alt="" />
                ) : (
                  <span>{topic.title.charAt(0)}</span>
                )}
              </span>
              {topic.title}
            </Link>
          )}

          <h1 className="post-banner-title">{post.title.rendered}</h1>

          <div className="post-banner-meta">
            <time dateTime={post.date}>{postDate}</time>
            {categories.length > 0 && (
              <span className="post-banner-categories">
                {categories.map((cat: any, i: number) => (
                  <span key={cat.id}>
                    {i > 0 && ', '}
                    <Link to={`/category/${cat.slug}`}>{cat.name}</Link>
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content — 重叠在 banner 底部 */}
      <div className="post-detail-content glass detail-content">
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
                  className="topic-related-item"
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
