import { useNavigate } from 'react-router-dom'
import type { WPCategory } from '../api/wordpress'

interface Props {
  side: 'left' | 'right'
  user: { name: string; description: string; avatar_urls: Record<string, string> } | null
  categories: WPCategory[]
  tags: Array<{ id: number; name: string; slug: string }>
  className?: string
}

export default function Sidebar({ side, user, categories, tags, className }: Props) {
  const navigate = useNavigate()

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
        </div>

        {/* Sticky section: 社交链接等 */}
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
