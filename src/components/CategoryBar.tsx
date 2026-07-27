import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useCallback } from 'react'
import type { WPCategory, WPMenuItem } from '../api/wordpress'

interface Props {
  categories: WPCategory[]
  menuItems: WPMenuItem[]
}

export default function CategoryBar({ categories, menuItems }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // 总文章数 = 所有分类 count 之和
  const totalPosts = categories.reduce((sum, cat) => sum + cat.count, 0)

  // 当前文章分类（由 PostDetail 通过 window 变量设置）
  const currentPostCategory = (window as any).__currentPostCategory || ''

  const pathname = location.pathname.replace(/\/$/, '')
  const isHome = pathname === '/'
  const isArchive = pathname === '/archives'
  const isCategories = pathname === '/category'

  const currentCategory = pathname.startsWith('/category/')
    ? decodeURIComponent(pathname.replace('/category/', ''))
    : null

  // 判断某个 pill 是否为 active（强高亮）
  function isActive(pillCategory: string): boolean {
    if (pillCategory === '__home__') return isHome
    if (pillCategory === '__archive__') return isArchive
    if (pillCategory === '__categories__') return isCategories
    if (currentCategory) return pillCategory === currentCategory
    return false
  }

  // 判断是否 soft-active（弱高亮 —— 文章页所属分类）
  function isSoftActive(pillCategory: string): boolean {
    if (!currentPostCategory) return false
    if (isHome || currentCategory || isArchive || isCategories) return false
    return pillCategory === currentPostCategory
  }

  // 优先使用 WordPress 分类菜单，否则回退到全部分类
  const useMenu = menuItems.length > 0
  const pills = useMenu
    ? menuItems
        .filter((item) => item.parent === 0)
        .sort((a, b) => a.order - b.order)
        .map((item) => {
          const href = item.path ?? item.url
          return {
            label: item.title,
            href,
            dataCategory: href.replace(/\/$/, ''),
            count: undefined as number | undefined,
          }
        })
    : categories.map((cat) => ({
        label: cat.name,
        href: `/category/${cat.slug}`,
        dataCategory: cat.slug,
        count: cat.count,
      }))

  // 鼠标滚轮横向滚动 & 滚动淡出提示
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const wheelHandler = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    const updateScrollHint = () => {
      const bar = document.getElementById('category-bar')
      if (!bar) return
      const fadeLeft = bar.querySelector<HTMLElement>('.scroll-fade-left')
      const fadeRight = bar.querySelector<HTMLElement>('.scroll-fade-right')
      const moreDivider = bar.querySelector<HTMLElement>('.more-divider')
      if (!fadeLeft || !fadeRight || !moreDivider) return
      const hasOverflow = el.scrollWidth > el.clientWidth + 1
      const atStart = el.scrollLeft <= 1
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
      fadeLeft.toggleAttribute('data-visible', hasOverflow && !atStart)
      fadeRight.toggleAttribute('data-visible', hasOverflow && !atEnd)
      moreDivider.toggleAttribute('data-visible', hasOverflow)
    }

    el.addEventListener('wheel', wheelHandler, { passive: false })
    el.addEventListener('scroll', updateScrollHint)
    window.addEventListener('resize', updateScrollHint)
    updateScrollHint()

    return () => {
      el.removeEventListener('wheel', wheelHandler)
      el.removeEventListener('scroll', updateScrollHint)
      window.removeEventListener('resize', updateScrollHint)
    }
  }, [])

  // 将 active / soft-active pill 滚动到可视区域中央
  const scrollToActive = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const activePill = el.querySelector<HTMLElement>('.category-pill.active, .category-pill.soft-active')
    if (!activePill) return
    const scrollLeft = activePill.offsetLeft - el.offsetLeft - (el.clientWidth - activePill.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const timer = setTimeout(scrollToActive, 120)
    return () => clearTimeout(timer)
  }, [location.pathname, scrollToActive])

  return (
    <div className="card-base category-bar" id="category-bar">
      <div className="category-bar-inner">
        {/* 首页 */}
        <button
          className={`category-pill home-pill${isHome ? ' active' : ''}`}
          onClick={() => navigate('/')}
          aria-label="首页"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>

        {/* 归档 */}
        <button
          className={`category-pill archive-pill${isArchive ? ' active' : ''}`}
          onClick={() => navigate('/archives')}
        >
          归档
          <span className="pill-count">{totalPosts}</span>
        </button>

        <div className="category-divider" />

        {/* 可横向滚动的分类列表 */}
        <div className="scroll-area">
          <div className="scroll-fade scroll-fade-left" aria-hidden="true" />
          <div className="category-scroll" ref={scrollRef}>
            {pills.map((pill) => {
              const active = isActive(pill.dataCategory)
              const soft = isSoftActive(pill.dataCategory)
              return (
                <button
                  key={pill.href}
                  className={`category-pill${active ? ' active' : ''}${soft ? ' soft-active' : ''}`}
                  onClick={() => navigate(pill.href)}
                >
                  <span>{pill.label}</span>
                  {pill.count !== undefined && (
                    <span className="pill-count">{pill.count}</span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="scroll-fade scroll-fade-right" aria-hidden="true" />
        </div>

        {/* 分类溢出时显示的分隔线 */}
        <div className="category-divider more-divider" aria-hidden="true" />

        {/* 更多分类 */}
        <button
          className={`category-pill more-pill${isCategories ? ' active' : ''}`}
          onClick={() => navigate('/category')}
          aria-label="更多分类"
        >
          <span>更多</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
