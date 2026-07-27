import { Link, useNavigate, useLocation } from 'react-router-dom'
import PageTransition from './PageTransition'
import CategoryBar from './CategoryBar'
import Sidebar from './Sidebar'
import Live2D from './Live2D'
import { useState, useEffect, useRef } from 'react'
import type { WPCategory, WPMenuItem, Topic } from '../api/wordpress'
import { getCategories, getTags, getUser, getMenu, getCategoryMenu, getTopics } from '../api/wordpress'
import { getRandomImageUrl } from '../api/image'
import SiteDataContext from '../context/SiteDataContext'
import { ArticleTocProvider } from '../context/ArticleTocContext'
import { BannerTitleProvider, useBannerTitle } from '../context/BannerTitleContext'

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [categories, setCategories] = useState<WPCategory[]>([])
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [user, setUser] = useState<{ name: string; description: string; avatar_urls: Record<string, string> } | null>(null)
  const [menuItems, setMenuItems] = useState<WPMenuItem[]>([])
  const [categoryMenu, setCategoryMenu] = useState<WPMenuItem[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [bannerLoaded, setBannerLoaded] = useState(false)
  const [expandedSubmenu, setExpandedSubmenu] = useState<number | null>(null)
  const wallpaperRef = useRef<HTMLDivElement>(null)
  const sidebarPosition = (window as any).MANGO_DATA?.layout?.sidebar_position || 'right'
  const bannerImage = (window as any).MANGO_DATA?.bannerImage || getRandomImageUrl('banner')
  const isHomePage = location.pathname === '/'

  // 滚动检测 — 为 navbar 添加阴影
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 获取子菜单项
  const getChildren = (parentId: number) =>
    menuItems
      .filter((item) => item.parent === parentId)
      .sort((a, b) => a.order - b.order)

  // 桌面端导航链接渲染（含下拉菜单）
  const renderNavLink = (item: WPMenuItem) => {
    const children = getChildren(item.id)
    const isInternal = (window as any).MANGO_DATA?.siteUrl
      ? item.url.startsWith((window as any).MANGO_DATA.siteUrl)
      : false
    const href = isInternal ? new URL(item.url).pathname : item.url
    const isActive = isInternal && location.pathname === href

    // 有子菜单 → 下拉菜单
    if (children.length > 0) {
      return (
        <div key={item.id} className="navbar-dropdown">
          <button className="navbar-link dropdown-trigger">
            {item.title}
            <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="dropdown-menu">
            {children.map((child) => {
              const childInternal = (window as any).MANGO_DATA?.siteUrl
                ? child.url.startsWith((window as any).MANGO_DATA.siteUrl)
                : false
              const childHref = childInternal ? new URL(child.url).pathname : child.url
              const childActive = childInternal && location.pathname === childHref
              if (childInternal) {
                return (
                  <Link key={child.id} to={childHref} className={`dropdown-item${childActive ? ' active' : ''}`}>
                    {child.title}
                  </Link>
                )
              }
              return (
                <a key={child.id} href={child.url} className="dropdown-item" target={child.target || '_blank'} rel={child.target ? undefined : 'noopener noreferrer'}>
                  {child.title}
                </a>
              )
            })}
          </div>
        </div>
      )
    }

    if (isInternal) {
      return (
        <Link key={item.id} to={href} className={`navbar-link${isActive ? ' active' : ''}`}>
          {item.title}
        </Link>
      )
    }
    return (
      <a key={item.id} href={item.url} className="navbar-link" target={item.target || '_blank'} rel={item.target ? undefined : 'noopener noreferrer'}>
        {item.title}
      </a>
    )
  }

  // 移动端菜单项渲染（含可折叠子菜单）
  const renderMobileMenuItem = (item: WPMenuItem) => {
    const children = getChildren(item.id)
    const isInternal = (window as any).MANGO_DATA?.siteUrl
      ? item.url.startsWith((window as any).MANGO_DATA.siteUrl)
      : false
    const href = isInternal ? new URL(item.url).pathname : item.url
    const isActive = isInternal && location.pathname === href
    const isExpanded = expandedSubmenu === item.id

    if (children.length > 0) {
      return (
        <div key={item.id} className="mobile-menu-section">
          <button
            className={`mobile-menu-parent${isExpanded ? ' expanded' : ''}`}
            onClick={() => setExpandedSubmenu(isExpanded ? null : item.id)}
          >
            <span>{item.title}</span>
            <svg className="mobile-menu-arrow" width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 3l4 3-4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className={`mobile-submenu${isExpanded ? ' expanded' : ''}`}>
            {children.map((child) => {
              const childInternal = (window as any).MANGO_DATA?.siteUrl
                ? child.url.startsWith((window as any).MANGO_DATA.siteUrl)
                : false
              const childHref = childInternal ? new URL(child.url).pathname : child.url
              const childActive = childInternal && location.pathname === childHref
              const onChildClick = () => setMobileMenuOpen(false)
              if (childInternal) {
                return (
                  <Link key={child.id} to={childHref} className={`mobile-menu-child${childActive ? ' active' : ''}`} onClick={onChildClick}>
                    {child.title}
                  </Link>
                )
              }
              return (
                <a key={child.id} href={child.url} className="mobile-menu-child" target={child.target || '_blank'} rel={child.target ? undefined : 'noopener noreferrer'} onClick={onChildClick}>
                  {child.title}
                </a>
              )
            })}
          </div>
        </div>
      )
    }

    const linkClass = `mobile-menu-link${isActive ? ' active' : ''}`
    const onClick = () => setMobileMenuOpen(false)

    if (isInternal) {
      return (
        <Link key={item.id} to={href} className={linkClass} onClick={onClick}>
          {item.title}
        </Link>
      )
    }
    return (
      <a key={item.id} href={item.url} className={linkClass} target={item.target || '_blank'} rel={item.target ? undefined : 'noopener noreferrer'} onClick={onClick}>
        {item.title}
      </a>
    )
  }

  const topLevelItems = menuItems
    .filter((item) => item.parent === 0)
    .sort((a, b) => a.order - b.order)

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getTags().then(setTags).catch(() => {})
    getUser().then(setUser).catch(() => {})
    getMenu().then(setMenuItems).catch(() => {})
    getCategoryMenu().then(setCategoryMenu).catch(() => {})
    getTopics().then(setTopics).catch(() => {})
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <BannerTitleProvider>
    <SiteDataContext.Provider value={{ user, categories, tags, topics }}>
    <ArticleTocProvider>
    <div className={`site-wrapper${isHomePage ? ' home' : ''}`}>
      {/* Top Gradient Highlight — 参照 Firefly 的顶部渐变高光效果 */}
      <div className="top-gradient-highlight" aria-hidden="true" />

      {/* ===== Banner / Wallpaper — 使用内层组件以读取 BannerTitleContext ===== */}
      <WallpaperContent
        isHomePage={isHomePage}
        bannerImage={bannerImage}
        bannerLoaded={bannerLoaded}
        wallpaperRef={wallpaperRef as React.RefObject<HTMLDivElement>}
        onBannerLoad={() => setBannerLoaded(true)}
      />

      {/* Header / Navbar — Firefly 风格 */}
      <div
        id="navbar"
        className={`${scrolled || !isHomePage ? 'navbar-scrolled' : ''}`}
      >
        <div className="navbar-inner">
          <div className="navbar-grid">
            {/* Logo */}
            <Link to="/" className="navbar-logo">Mango</Link>

            {/* Desktop Nav Links */}
            <nav className="navbar-links">
              {topLevelItems.map((item) => renderNavLink(item))}
            </nav>

            {/* Search */}
            <form className="navbar-search" onSubmit={handleSearch}>
              <span className="navbar-search-icon">⌕</span>
              <input
                type="search"
                placeholder="搜索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>

            {/* Right Side Actions */}
            <div className="navbar-actions">
              {/* Mobile menu toggle — 在 lg (1024px) 以上隐藏 */}
              <button
                className="navbar-mobile-btn"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M3 12h18M3 18h18"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div
          className={`navbar-mobile-overlay${mobileMenuOpen ? ' open' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
        <div className={`navbar-mobile-panel${mobileMenuOpen ? ' open' : ''}`}>
          <div className="mobile-menu-header">
            <span className="mobile-menu-title">导航</span>
            <button
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="关闭菜单"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="mobile-menu-body">
            {topLevelItems.map((item) => renderMobileMenuItem(item))}
          </div>
        </div>
      </div>

      {/* ===== Main Grid — 借鉴 Firefly 的响应式 Grid 布局 ===== */}
      <div className={`main-grid${sidebarPosition === 'none' ? ' main-grid--no-sidebar' : ''}`}>
        {/* Left Sidebar — md 断点以上显示 */}
        {sidebarPosition !== 'none' && (
          <Sidebar side="left" className="sidebar-left-grid" />
        )}

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* CategoryBar — 分类 pill 导航 */}
          <CategoryBar categories={categories} menuItems={categoryMenu} />

          <main className="main-content">
            <PageTransition />
          </main>
        </div>

        {/* Right Sidebar — xl 断点以上显示 */}
        {sidebarPosition !== 'none' && (
          <Sidebar side="right" className="sidebar-right-grid" />
        )}
      </div>

      {/* Footer */}
      <footer className="footer glass">
        <span className="logo-text">Mango</span>
        {/* Social Links */}
        {(() => {
          const socialLinks = (window as any).MANGO_DATA?.socialLinks || {};
          const items: { key: string; url: string; label: string; icon: string }[] = [
            { key: 'github', url: socialLinks.github, label: 'GitHub', icon: 'github-icon' },
            { key: 'twitter', url: socialLinks.twitter, label: 'Twitter/X', icon: 'x-icon' },
            { key: 'bilibili', url: socialLinks.bilibili, label: 'Bilibili', icon: 'bilibili' },
            { key: 'weibo', url: socialLinks.weibo, label: '微博', icon: 'weibo' },
            { key: 'email', url: socialLinks.email, label: 'Email', icon: 'email' },
          ].filter(i => i.url);
          if (items.length > 0) {
            return (
              <div className="footer-social">
                {items.map(item => (
                  <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" className="footer-social-link" title={item.label}>
                    {item.key === 'github' && (
                      <svg width="22" height="22" viewBox="0 0 19 19" fill="currentColor">
                        <path fillRule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clipRule="evenodd"/>
                      </svg>
                    )}
                    {item.key === 'twitter' && (
                      <svg width="22" height="22" viewBox="0 0 19 19" fill="currentColor">
                        <path fillRule="evenodd" d="M1.893 1.98c.052.072 1.245 1.769 2.653 3.77l2.892 4.114c.183.261.333.48.333.486s-.068.089-.152.183l-.522.593-.765.867-3.597 4.087c-.375.426-.734.834-.798.905a1 1 0 0 0-.118.148c0 .01.236.017.664.017h.663l.729-.83c.4-.457.796-.906.879-.999a692 692 0 0 0 1.794-2.038c.034-.037.301-.34.594-.675l.551-.624.345-.392a7 7 0 0 1 .34-.374c.006 0 .93 1.306 2.052 2.903l2.084 2.965.045.063h2.275c1.87 0 2.273-.003 2.266-.021-.008-.02-1.098-1.572-3.894-5.547-2.013-2.862-2.28-3.246-2.273-3.266.008-.019.282-.332 2.085-2.38l2-2.274 1.567-1.782c.022-.028-.016-.03-.65-.03h-.674l-.3.342a871 871 0 0 1-1.782 2.025c-.067.075-.405.458-.75.852a100 100 0 0 1-.803.91c-.148.172-.299.344-.99 1.127-.304.343-.32.358-.345.327-.015-.019-.904-1.282-1.976-2.808L6.365 1.85H1.8zm1.782.91 8.078 11.294c.772 1.08 1.413 1.973 1.425 1.984.016.017.241.02 1.05.017l1.03-.004-2.694-3.766L7.796 5.75 5.722 2.852l-1.039-.004-1.039-.004z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {item.key === 'bilibili' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.267.573-.4.92-.4.347 0 .653.133.92.4L9.707 4.1a5.6 5.6 0 0 1 .533.16 5.6 5.6 0 0 1 .533-.16l3.787-3.694c.267-.267.573-.4.92-.4.347 0 .662.142.929.427.267.284.4.587.4.907s-.133.622-.4.88zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.25.373.56.373.933v1.334c0 .373-.124.684-.373.933-.249.25-.56.373-.933.373s-.684-.124-.933-.373-.373-.56-.373-.933v-1.334c0-.373.124-.684.373-.933.249-.25.56-.373.933-.373m8 0c.373 0 .684.124.933.373.25.25.373.56.373.933v1.334c0 .373-.124.684-.373.933-.249.25-.56.373-.933.373s-.684-.124-.933-.373-.373-.56-.373-.933v-1.334c0-.373.124-.684.373-.933.249-.25.56-.373.933-.373"/>
                      </svg>
                    )}
                    {item.key === 'weibo' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443m-1.2-10.275c-5.07.549-8.62 4.156-7.948 8.174.672 4.02 5.282 6.819 10.353 6.27 5.069-.553 8.618-4.164 7.948-8.178-.673-4.016-5.282-6.801-10.353-6.272v.006z"/>
                        <path d="M20.57 6.537c.026.163-.008.33-.09.506a.963.963 0 0 1-.4.39.88.88 0 0 1-.524.11 1.04 1.04 0 0 1-.484-.18.9.9 0 0 1-.33-.403.6.6 0 0 1 .013-.476c.065-.157.172-.278.334-.36.15-.077.313-.1.496-.076.182.028.337.118.466.276.128.157.191.323.191.503v-.004z"/>
                        <path d="M21.907 3.05c.096.388.014.792-.232 1.206a2.26 2.26 0 0 1-.93.876 2.18 2.18 0 0 1-1.244.247 2.56 2.56 0 0 1-1.149-.45 2.03 2.03 0 0 1-.78-.974 1.46 1.46 0 0 1 .03-1.138c.157-.375.417-.66.8-.856.37-.19.762-.238 1.182-.153.418.087.78.279 1.087.58.31.304.507.595.615.88l-.003-.005z"/>
                        <path d="M19.153 8.68c-1.228-.192-2.323-.069-3.29.387-.966.453-1.608 1.13-1.943 2.026-.33.886-.277 1.74.15 2.527.224.425.54.782.946 1.065.405.28.854.464 1.346.557.473.093.945.099 1.409.019.466-.083.84-.266 1.135-.548.296-.285.49-.616.603-.985.098-.328.107-.654.034-.97a2.22 2.22 0 0 0-.338-.842 2.42 2.42 0 0 0-.66-.65c.4-.38.862-.64 1.388-.77.525-.13 1.028-.103 1.517.076.226.087.432.21.618.358.184.148.319.316.414.508a2.2 2.2 0 0 1 .132.332l2.403-1.039a2.69 2.69 0 0 0-.587-.84 4.72 4.72 0 0 0-1-.72 5.82 5.82 0 0 0-2.03-.6 6.13 6.13 0 0 0-1.028-.052"/>
                      </svg>
                    )}
                    {item.key === 'email' && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            );
          }
          return null;
        })()}
        <p className="footer-info">
          {(window as any).MANGO_DATA?.footerText
            ? (window as any).MANGO_DATA.footerText
            : `© ${new Date().getFullYear()} Mango Theme. Powered by WordPress.`}
        </p>
        <p className="footer-extra">
          {(window as any).MANGO_DATA?.siteStartDate &&
            `网站已运行 ${Math.floor((Date.now() - new Date((window as any).MANGO_DATA.siteStartDate).getTime()) / 86400000)} 天`
          }
          {(window as any).MANGO_DATA?.siteStartDate && (window as any).MANGO_DATA?.icpNumber && ' | '}
          {(window as any).MANGO_DATA?.icpNumber &&
            `${(window as any).MANGO_DATA.icpNumber}`
          }
        </p>
      </footer>
      <Live2D />
    </div>
    </ArticleTocProvider>
    </SiteDataContext.Provider>
    </BannerTitleProvider>
  )
}

/* ── 内层壁纸组件，可通过 BannerTitleContext 读取文章标题 ── */
function WallpaperContent({
  isHomePage,
  bannerImage,
  bannerLoaded,
  wallpaperRef,
  onBannerLoad,
}: {
  isHomePage: boolean
  bannerImage: string
  bannerLoaded: boolean
  wallpaperRef: React.RefObject<HTMLDivElement | null>
  onBannerLoad: () => void
}) {
  const { bannerTitle } = useBannerTitle()
  return (
    <div
      id="wallpaper-wrapper"
      ref={wallpaperRef}
      className="wallpaper-wrapper"
      data-loaded={bannerLoaded}
    >
      <img src={bannerImage} alt="" className="wallpaper-bg" onLoad={onBannerLoad} />
      <div className="wallpaper-overlay" aria-hidden="true" />
      {isHomePage ? (
        <div className="banner-home-text-overlay">
          <div>
            <h1 className="banner-title">
              {(window as any).MANGO_DATA?.siteName || 'Mango'}
            </h1>
            {(window as any).MANGO_DATA?.siteDescription && (
              <p className="banner-subtitle">
                {(window as any).MANGO_DATA.siteDescription}
              </p>
            )}
          </div>
        </div>
      ) : bannerTitle ? (
        <div className="banner-post-title-overlay">
          <div>
            <h1 className="banner-post-title">{bannerTitle}</h1>
          </div>
        </div>
      ) : null}
      <div className="scroll-down-indicator" aria-hidden="true">
        <span className="scroll-down-arrow" />
      </div>
    </div>
  )
}