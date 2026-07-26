import { Link, Outlet, useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar'
import CategoryBar from './CategoryBar'
import Sidebar from './Sidebar'
import { useState, useEffect } from 'react'
import type { WPCategory } from '../api/wordpress'
import { getCategories, getTags, getUser } from '../api/wordpress'

export default function Layout() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<WPCategory[]>([])
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([])
  const [user, setUser] = useState<{ name: string; description: string; avatar_urls: Record<string, string> } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getTags().then(setTags).catch(() => {})
    getUser().then(setUser).catch(() => {})
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
          <Link to="/">首页</Link>
          <Link to="/archives">归档</Link>
          <Link to="/links">友链</Link>
          {categories.slice(0, 3).map((cat) => (
            <Link key={cat.id} to={`/category/${cat.slug}`}>
              {cat.name}
            </Link>
          ))}
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
          className="sidebar-left-grid"
        />

        {/* Content Wrapper */}
        <div className="content-wrapper">
          {/* CategoryBar — 类似 Firefly 的分类 pill 导航 */}
          {categories.length > 0 && <CategoryBar categories={categories} totalPosts={0} />}

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
        <br />
        © {new Date().getFullYear()} Mango Theme. Powered by WordPress.
      </footer>
    </div>
  )
}
