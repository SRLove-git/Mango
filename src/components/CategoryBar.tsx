import { useNavigate, useLocation } from 'react-router-dom'
import type { WPCategory, WPMenuItem } from '../api/wordpress'

interface Props {
  categories: WPCategory[]
  menuItems: WPMenuItem[]
}

export default function CategoryBar({ categories, menuItems }: Props) {
  const navigate = useNavigate()
  const location = useLocation()

  // 判断当前页面是否在某个分类下
  const isHome = location.pathname === '/'
  const currentCategory = location.pathname.startsWith('/category/')
    ? decodeURIComponent(location.pathname.replace('/category/', '').replace(/\/$/, ''))
    : null

  // 只在首页和分类页渲染
  if (!isHome && !currentCategory) {
    return null
  }

  // 优先使用 WordPress 菜单，没有菜单则回退到全部分类
  const useMenu = menuItems.length > 0

  const pills: Array<{ label: string; href: string; active: boolean; icon?: string; count?: number }> = useMenu
    ? [
        // 自动添加"全部"按钮，无需在 WordPress 菜单中手动添加
        { label: '全部', href: '/', active: isHome, icon: '✦' },
        ...menuItems
          .filter((item) => item.parent === 0)
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            // 优先使用服务端返回的标准化 path，否则从 URL 中提取
            const href = item.path ?? item.url
            return { label: item.title, href, active: href === location.pathname }
          }),
      ]
    : [
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
          count: cat.count,
        })),
      ]

  if (pills.length === 0) return null

  return (
    <div className="category-bar">
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
