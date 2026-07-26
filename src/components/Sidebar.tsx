import { useNavigate, useLocation } from 'react-router-dom'
import type { WPCategory } from '../api/wordpress'
import type { Topic } from '../api/wordpress'

interface Props {
  side: 'left' | 'right'
  user: { name: string; description: string; avatar_urls: Record<string, string> } | null
  categories: WPCategory[]
  tags: Array<{ id: number; name: string; slug: string }>
  topics?: Topic[]
  className?: string
}

export default function Sidebar({ side, user, categories, tags, topics, className }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // 从 URL 推断当前专栏上下文
  let currentTopic: Topic | undefined
  let currentPostSlug: string | undefined

  if (topics && topics.length > 0) {
    const pathParts = location.pathname.split('/').filter(Boolean)

    if (pathParts[0] === 'topic') {
      // /topic/{slug} 或 /topic/{slug}/post/{postSlug}
      currentTopic = topics.find((t) => t.id === pathParts[1])
      currentPostSlug = pathParts[3]
    } else if (pathParts[0] === 'post') {
      // /post/{slug} — 查找该文章所属专栏
      const slug = pathParts[1]
      if (slug) {
        currentTopic = topics.find((t) => t.posts.some((p) => p.slug === slug))
        currentPostSlug = slug
      }
    }
  }

  if (side === 'left') {
    return (
      <aside className={`sidebar sidebar-left ${className || ''}`}>
        {/* Top section: 个人资料 */}
        <div className="sidebar-top">
          <div className="glass profile-card">
            <div className="avatar-wrap">
              {user?.avatar_urls?.['96'] ? (
                <img className="avatar" src={user.avatar_urls['96']} alt={user.name} />
              ) : (
                <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--purple), var(--blue))' }} />
              )}
            </div>
            <h2>{user?.name || 'Mango'}</h2>
            <p>{user?.description || '分享技术、生活与思考'}</p>
          </div>

          {/* 专栏文章目录（在 profile-card 下方） */}
          {currentTopic && currentTopic.posts.length > 0 && (
            <div className="glass">
              <h3 className="sidebar-title">
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  {currentTopic.title}
                </span>
              </h3>
              <ul className="topic-article-dir">
                {currentTopic.posts.map((p, i) => {
                  const path = `/topic/${currentTopic!.id}/post/${p.slug}`
                  const isActive = p.slug === currentPostSlug
                  return (
                    <li
                      key={p.id}
                      className={isActive ? 'active' : ''}
                      onClick={() => navigate(path)}
                    >
                      <span className="dir-index">{i + 1}</span>
                      <span className="dir-title">{p.title}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <div className="glass">
            <h3 className="sidebar-title">分类</h3>
            <ul className="category-list">
              {categories.map((cat) => (
                <li key={cat.id} onClick={() => navigate(`/category/${cat.slug}`)}>
                  <span>{cat.name}</span>
                  <span className="count">{cat.count}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 专栏目录 */}
          {topics && topics.length > 0 && (
            <div className="glass">
              <h3 className="sidebar-title">
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  专栏
                  <span className="pill-count" style={{ background:'var(--glass)' }}>{topics.length}</span>
                </span>
              </h3>
              <ul className="category-list topic-sidebar-list">
                {topics.map((t) => {
                  const firstPost = t.posts[0]
                  const path = firstPost
                    ? `/topic/${t.id}/post/${firstPost.slug}`
                    : `/topic/${t.id}`
                  return (
                    <li key={t.id} onClick={() => navigate(path)}>
                      <span className="topic-sidebar-name">
                        {t.icon && (
                          <img src={t.icon} alt="" className="topic-sidebar-icon" />
                        )}
                        <span>{t.title}</span>
                      </span>
                      <span className="count">{t.post_count}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky section: 关于 */}
        <div className="sidebar-sticky">
          <div className="glass">
            <h3 className="sidebar-title">关于</h3>
            <p className="sidebar-about-text">
              Mango 是一个基于 WordPress + React 的个人博客主题，追求极致的视觉体验与性能。
            </p>
          </div>
        </div>
      </aside>
    )
  }

  // Right sidebar
  return (
    <aside className={`sidebar sidebar-right ${className || ''}`}>
      {/* Top section: 标签云 */}
      <div className="sidebar-top">
        {tags.length > 0 && (
          <div className="glass">
            <h3 className="sidebar-title">标签云</h3>
            <div className="tag-cloud">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="tag"
                  onClick={() => navigate(`/search?q=${encodeURIComponent(tag.name)}`)}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky section: 站点信息 */}
      <div className="sidebar-sticky">
        <div className="glass">
          <h3 className="sidebar-title">站点信息</h3>
          <ul className="site-info-list">
            <li>
              <span className="info-label">分类</span>
              <span className="info-value">{categories.length}</span>
            </li>
            <li>
              <span className="info-label">标签</span>
              <span className="info-value">{tags.length}</span>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
