import { Link, Outlet, useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import CategoryBar from './CategoryBar'
import Sidebar from './Sidebar'
import { useState, useEffect } from 'react'
import type { WPCategory, WPMenuItem, Topic } from '../api/wordpress'
import { getCategories, getTags, getUser, getMenu, getCategoryMenu, getTopics } from '../api/wordpress'

export default function Layout() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<WPCategory[]>([])
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [user, setUser] = useState<{ name: string; description: string; avatar_urls: Record<string, string> } | null>(null)
  const [menuItems, setMenuItems] = useState<WPMenuItem[]>([])
  const [categoryMenu, setCategoryMenu] = useState<WPMenuItem[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [searchQuery, setSearchQuery] = useState('')

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
    <div className="site-wrapper">
      <ProgressBar />

      {/* Header / Navbar — 借鉴 Firefly 的粘性导航栏 */}
      <header className="header">
        <Link to="/" className="logo">Mango</Link>
        <nav className="nav">
          {menuItems
            .filter((item) => item.parent === 0)
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const isInternal = (window as any).MANGO_DATA?.siteUrl
                ? item.url.startsWith((window as any).MANGO_DATA.siteUrl)
                : false
              if (isInternal) {
                const path = new URL(item.url).pathname
                return (
                  <Link key={item.id} to={path}>
                    {item.title}
                  </Link>
                )
              }
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target={item.target || '_blank'}
                  rel={item.target ? undefined : 'noopener noreferrer'}
                >
                  {item.title}
                </a>
              )
            })}
        </nav>
        <form className="header-search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </header>

      {/* ===== Main Grid — 借鉴 Firefly 的响应式 Grid 布局 ===== */}
      <div className="main-grid">
        {/* Left Sidebar — md 断点以上显示 */}
        <Sidebar
          side="left"
          user={user}
          categories={categories}
          tags={tags}
          topics={topics}
          className="sidebar-left-grid"
        />

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* CategoryBar — 分类 pill 导航 */}
          <CategoryBar categories={categories} menuItems={categoryMenu} />

          <main className="main-content">
            <Outlet />
          </main>
        </div>

        {/* Right Sidebar — xl 断点以上显示 */}
        <Sidebar
          side="right"
          user={user}
          categories={categories}
          tags={tags}
          className="sidebar-right-grid"
        />
      </div>

      {/* Footer */}
      <footer className="footer glass">
        <span className="logo-text">Mango</span>
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
    </div>
  )
}
