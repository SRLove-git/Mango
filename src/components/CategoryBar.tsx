import { useNavigate, useLocation } from 'react-router-dom'
import type { WPCategory } from '../api/wordpress'

interface Props {
  categories: WPCategory[]
  totalPosts: number
}

export default function CategoryBar({ categories, totalPosts }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // 判断当前页面是否在某个分类下
  const isHome = location.pathname === '/'
  const currentCategory = location.pathname.startsWith('/category/')
    ? decodeURIComponent(location.pathname.replace('/category/', '').replace(/\/$/, ''))
    : null

  const pills = [
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
