import { useNavigate, useLocation } from 'react-router-dom'
import type { WPCategory } from '../api/wordpress'

interface Props {
  categories: WPCategory[]
}

export default function CategoryBar({ categories }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // 判断当前页面是否在某个分类下
  const isHome = location.pathname === '/'
  const currentCategory = location.pathname.startsWith('/category/')
    ? decodeURIComponent(location.pathname.replace('/category/', '').replace(/\/$/, ''))
    : null

  const pills: Array<{ label: string; href: string; active: boolean; icon: string | null; count?: number }> = [
    {
      label: '全部',
      href: '/',
      active: isHome,
      icon: '✦',
    },
    ...categories.map((cat) => ({
      label: cat.name,
      href: `/category/${cat.slug}`,
      active: currentCategory === cat.slug,
      icon: null as string | null,
      count: cat.count,
    })),
  ]

  return (
    <div className="category-bar glass">
      <div className="category-bar-inner">
        {pills.map((pill) => (
          <button
            key={pill.href}
            className={`category-pill ${pill.active ? 'active' : ''}`}
            onClick={() => navigate(pill.href)}
          >
            {pill.icon && <span className="pill-icon">{pill.icon}</span>}
            <span>{pill.label}</span>
            {pill.count !== undefined && (
              <span className="pill-count">{pill.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
