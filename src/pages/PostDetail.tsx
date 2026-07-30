import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPost, getPostById, getTopic } from '../api/wordpress'
import type { WPPost, Topic } from '../api/wordpress'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useArticleToc } from '../context/ArticleTocContext'
import { useSiteData } from '../context/SiteDataContext'
import { useBannerTitle } from '../context/BannerTitleContext'

/** 估算阅读时间（中文约 300 字/分钟） */
function estimateReadingTime(content: string): { chars: number; minutes: number } {
  const text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, '')
  const chars = text.length
  const minutes = Math.max(1, Math.round(chars / 300))
  return { chars, minutes }
}

/** 获取用户合适尺寸的头像 */
function getAvatarUrl(avatarUrls: Record<string, string>): string {
  const sizes = ['192', '150', '96', '48', '24']
  for (const size of sizes) {
    if (avatarUrls[size]) return avatarUrls[size]
  }
  return avatarUrls[Object.keys(avatarUrls)[0]] || ''
}

/** 日历图标 */
function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
      <path d="M5 22q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v14q0 .825-.587 1.413T19 22zm0-2h14V10H5zM5 8h14V6H5zm0 0V6z"/>
    </svg>
  )
}

/** 分类/书籍图标 */
function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
      <path d="M6 15.325q.35-.175.725-.25T7.5 15H8V4h-.5q-.625 0-1.062.438T6 5.5zM10 15h8V4h-8zm-4 .325V4zM7.5 22q-1.45 0-2.475-1.025T4 18.5v-13q0-1.45 1.025-2.475T7.5 2H18q.825 0 1.413.587T20 4v12.525q0 .2-.162.363t-.588.362q-.35.175-.55.5t-.2.75t.2.763t.55.487t.55.413t.2.562v.25q0 .425-.288.725T19 22zm0-2h9.325q-.15-.35-.237-.712T16.5 18.5q0-.4.075-.775t.25-.725H7.5q-.65 0-1.075.438T6 18.5q0 .65.425 1.075T7.5 20"/>
    </svg>
  )
}

/** 标签图标 */
function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
      <path d="m9 16l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T6.3 18.8L7 16H4.275q-.5 0-.8-.387T3.3 14.75q.075-.35.35-.55t.625-.2H7.5l1-4H5.775q-.5 0-.8-.387T4.8 8.75q.075-.35.35-.55t.625-.2H9l.825-3.275Q9.9 4.4 10.15 4.2t.6-.2q.475 0 .775.375t.175.825L11 8h4l.825-3.275q.075-.325.325-.525t.6-.2q.475 0 .775.375t.175.825L17 8h2.725q.5 0 .8.387t.175.863q-.075.35-.35.55t-.625.2H16.5l-1 4h2.725q.5 0 .8.388t.175.862q-.075.35-.35.55t-.625.2H15l-.825 3.275q-.075.325-.325.525t-.6.2q-.475 0-.775-.375T12.3 18.8L13 16zm.5-2h4l1-4h-4z"/>
    </svg>
  )
}

/** 浏览量/眼睛图标 */
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
      <path d="M15.188 14.688Q16.5 13.375 16.5 11.5t-1.312-3.187T12 7T8.813 8.313T7.5 11.5t1.313 3.188T12 16t3.188-1.312m-5.1-1.276Q9.3 12.625 9.3 11.5t.788-1.912T12 8.8t1.913.788t.787 1.912t-.787 1.913T12 14.2t-1.912-.787m-4.2 3.787q-2.763-1.8-4.363-4.75q-.125-.225-.187-.462t-.063-.488t.063-.488t.187-.462q1.6-2.95 4.363-4.75T12 4t6.113 1.8t4.362 4.75q.125.225.188.463t.062.487t-.062.488t-.188.462q-1.6 2.95-4.362 4.75T12 19t-6.113-1.8m11.3-1.687Q19.55 14.025 20.8 11.5q-1.25-2.525-3.613-4.012T12 6T6.813 7.488T3.2 11.5q1.25 2.525 3.613 4.013T12 17t5.188-1.487"/>
    </svg>
  )
}

export default function PostDetail() {
  const params = useParams<{ slug: string; postSlug?: string; postId?: string }>()
  const postSlug = params.postSlug || params.slug
  const postId = params.postId ? parseInt(params.postId, 10) : undefined
  const [post, setPost] = useState<WPPost | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const { triggerScan } = useArticleToc()
  const { user } = useSiteData()
  const { setBannerTitle } = useBannerTitle()

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
          setBannerTitle(p.title.rendered)
        }
        if (p?.meta?.topic) {
          getTopic(p.meta.topic).then((t) => {
            setTopic(t)
            ;(window as any).__currentTopic = t
          }).catch(() => {})
        }
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false))
    // 离开文章页时清除壁纸标题和专栏数据
    return () => {
      setBannerTitle('')
      ;(window as any).__currentTopic = null
    }
  }, [postSlug, postId, setBannerTitle])

  // 文章内容渲染后通知 Sidebar 重新扫描标题
  useEffect(() => {
    if (post) triggerScan()
  }, [post, triggerScan])

  // 将文章分类暴露给 CategoryBar（软高亮）
  useEffect(() => {
    const cat = (post?._embedded?.['wp:term']?.[0] ?? [])[0] as
      | { name: string }
      | undefined
    ;(window as any).__currentPostCategory = cat?.name ?? ''
    return () => {
      ;(window as any).__currentPostCategory = ''
    }
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

  const categories = post._embedded?.['wp:term']?.[0] ?? []
  const tags = post._embedded?.['wp:term']?.[1] ?? []
  const postDate = new Date(post.date).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
  const { chars, minutes } = estimateReadingTime(post.content.rendered)
  const customAvatar = (window as any).MANGO_DATA?.avatarUrl || ''
  const avatarUrl = customAvatar || (user?.avatar_urls ? getAvatarUrl(user.avatar_urls) : '')

  return (
    <article className="post-detail">
      {/* ── 整篇文章在一个玻璃卡片中（跟首页一致）── */}
      <div className="glass post-article-card onload-animation">

        {/* Author + Reading time */}
        <div className="post-article-author">
          {avatarUrl && (
            <Link to="/about" className="post-article-avatar-link">
              <img src={avatarUrl} alt={user?.name || ''} className="post-article-avatar" />
            </Link>
          )}
          <div className="post-article-author-info">
            <Link to="/about" className="post-article-name">{user?.name || '作者'}</Link>
            {chars > 0 && (
              <span className="post-article-reading">{chars.toLocaleString()} 字 · {minutes} 分钟</span>
            )}
          </div>
        </div>

        {/* Topic badge */}
        {topic && (
          <Link
            to={`/topic/${topic.id}/post/${topic.posts[0]?.slug || topic.id}`}
            className="post-article-topic"
          >
            {topic.icon && (
              <span className="topic-badge-icon">
                <img src={topic.icon} alt="" />
              </span>
            )}
            {topic.title}
          </Link>
        )}

        {/* Title */}
        <h1 className="post-article-title">{post.title.rendered}</h1>

        {/* Metadata — Firefly 风格：图标 + 文字 */}
        <div className="post-article-meta">
          {/* Date */}
          <span className="post-article-meta-item">
            <CalendarIcon />
            <time dateTime={post.date}>{postDate}</time>
          </span>

          {/* Categories */}
          {categories.length > 0 && (
            <span className="post-article-meta-item">
              <BookIcon />
              <span className="post-article-cats">
                {categories.map((cat: any, i: number) => (
                  <span key={cat.id}>
                    {i > 0 && <span className="meta-sep">/</span>}
                    <Link to={`/category/${cat.slug}`}>{cat.name}</Link>
                  </span>
                ))}
              </span>
            </span>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <span className="post-article-meta-item">
              <TagIcon />
              <span className="post-article-tags-list">
                {tags.map((tag: any, i: number) => (
                  <span key={tag.id}>
                    {i > 0 && <span className="meta-sep">/</span>}
                    <Link to={`/archives/?tag=${tag.slug}`}>{tag.name}</Link>
                  </span>
                ))}
              </span>
            </span>
          )}

          {/* Views placeholder */}
          <span className="post-article-meta-item">
            <EyeIcon />
            <span>浏览量 --</span>
          </span>
        </div>

        {/* Dashed divider — Firefly 风格 */}
        <div className="post-article-divider" />

        {/* Content */}
        <div className="detail-content">
          <MarkdownRenderer content={post.content.rendered} />
        </div>
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
