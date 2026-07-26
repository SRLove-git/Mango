import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { useArticleToc } from '../context/ArticleTocContext'
import { getWikiProject } from '../api/wordpress'

interface Props {
  side: 'left' | 'right'
  className?: string
}

interface SidebarWidget {
  id: string
  side: 'left' | 'right'
  type: string
  title: string
  content: string
  order: number
  display_on: string[]
}

interface WikiTreeItem {
  id: string
  title: string
  icon?: string
  children?: WikiTreeItem[]
}

const DEFAULT_TITLES: Record<string, string> = {
  profile: '个人资料',
  categories: '分类',
  tags: '标签云',
  topics: '专栏',
  wiki_tree: 'Wiki 页面',
  toc: '文章目录',
  about: '关于',
  site_info: '站点信息',
  custom_html: '自定义',
}

// 需要内容的 widget 类型（about / custom_html）
const CONTENT_TYPES = ['about', 'custom_html']

export default function Sidebar({ side, className }: Props) {
  const navigate = useNavigate()
  const { user, categories, tags, topics } = useSiteData()
  const location = useLocation()
  const { scanVersion } = useArticleToc()

  // 从渲染后的 DOM 中扫描文章标题（适用于任何 URL 格式）
  const [domHeadings, setDomHeadings] = useState<Array<{ id: string; text: string; level: number }>>([])
  useEffect(() => {
    // 稍等一个微任务让 DOM 更新完成
    const id = requestAnimationFrame(() => {
      const els = document.querySelectorAll(
        '.detail-content h1, .detail-content h2, .detail-content h3, .detail-content h4, .detail-content h5, .detail-content h6, .wiki-article-content h1, .wiki-article-content h2, .wiki-article-content h3, .wiki-article-content h4, .wiki-article-content h5, .wiki-article-content h6'
      )
      const result: Array<{ id: string; text: string; level: number }> = []
      els.forEach((el) => {
        const level = parseInt(el.tagName.slice(1), 10)
        const text = el.textContent?.trim() || ''
        if (text) {
          if (!el.id) {
            el.id = text.toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, '-').replace(/(^-|-$)/g, '') || 'heading'
          }
          result.push({ id: el.id, text, level })
        }
      })
      setDomHeadings(result)
    })
    return () => cancelAnimationFrame(id)
  }, [location.pathname, scanVersion])

  // 从 URL 中提取当前 wiki 项目名
  const wikiProjectSlug = location.pathname.startsWith('/wiki/')
    ? location.pathname.split('/')[2]
    : null

  // 获取 wiki 树状数据（用于 wiki_tree 小工具）
  const [wikiTree, setWikiTree] = useState<WikiTreeItem[]>([])
  const [wikiProjectTitle, setWikiProjectTitle] = useState('')
  useEffect(() => {
    if (!wikiProjectSlug) {
      setWikiTree([])
      setWikiProjectTitle('')
      return
    }
    getWikiProject(wikiProjectSlug).then((d) => {
      if (d && d.tree) {
        setWikiTree(d.tree)
        setWikiProjectTitle(d.title)
      }
    }).catch(() => {
      setWikiTree([])
      setWikiProjectTitle('')
    })
  }, [wikiProjectSlug])

  // 判断当前页面类型
  function getCurrentPage(): string {
    const path = location.pathname
    if (path === '/') return 'home'
    if (path === '/archives') return 'archive'
    if (path === '/search') return 'search'
    if (path === '/links') return 'links'
    if (path === '/topics') return 'topics'
    if (path === '/wiki') return 'wiki_list'
    if (path.startsWith('/wiki/')) return 'wiki'
    if (path.startsWith('/topic/')) return 'topic'
    if (path.startsWith('/post/') || path.startsWith('/archives/')) return 'post'
    if (path.startsWith('/category/')) return 'category'
    if (path.startsWith('/page/')) return 'page'
    return 'home'
  }

  const currentPage = getCurrentPage()

  const rawWidgets: SidebarWidget[] = (window as any).MANGO_DATA?.sidebar?.widgets || []
  const widgets = rawWidgets
    .filter((w) => w.side === side)
    .filter((w) => !w.display_on || w.display_on.length === 0 || w.display_on.includes(currentPage))
    .sort((a, b) => a.order - b.order)

  function renderWidget(w: SidebarWidget, i: number) {
    const title = w.title || DEFAULT_TITLES[w.type] || w.type
    const key = w.id || i

    // --- profile ---
    if (w.type === 'profile') {
      return (
        <div className="glass profile-card" key={key}>
          <div className="avatar-wrap">
            {user?.avatar_urls?.['96'] ? (
              <img className="avatar" src={user.avatar_urls['96']} alt={user.name} />
            ) : (
              <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }} />
            )}
          </div>
          <h2>{user?.name || 'Mango'}</h2>
          <p>{user?.description || '分享技术、生活与思考'}</p>
        </div>
      )
    }

    // --- topics (专栏) ---
    if (w.type === 'topics') {
      if (!topics || topics.length === 0) return null
      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {title}
              <span className="pill-count" style={{ background: 'var(--glass)' }}>{topics.length}</span>
            </span>
          </h3>
          <ul className="category-list topic-sidebar-list">
            {topics.map((t) => {
              const firstPost = t.posts[0]
              const path = firstPost ? `/topic/${t.id}/post/${firstPost.slug}` : `/topic/${t.id}`
              return (
                <li key={t.id} onClick={() => navigate(path)}>
                  <span className="topic-sidebar-name">
                    {t.icon && <img src={t.icon} alt="" className="topic-sidebar-icon" />}
                    <span>{t.title}</span>
                  </span>
                  <span className="count">{t.post_count}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )
    }

    // --- wiki_tree (Wiki 页面树) ---
    if (w.type === 'wiki_tree') {
      if (!wikiProjectSlug || wikiTree.length === 0) return null
      const currentSlug = location.pathname.split('/')[3] || ''

      function renderTreeNodes(items: WikiTreeItem[], depth = 0): React.ReactNode {
        return items.map((item) => {
          const isActive = item.id === currentSlug
          const hasActiveChild = item.children?.some((c) => c.id === currentSlug) ||
            item.children?.some((c) => c.children?.some((cc) => cc.id === currentSlug))
          const itemPath = `/wiki/${wikiProjectSlug}/${item.id}`

          return (
            <li key={item.id}>
              <span
                className={`wiki-tree-widget-link ${isActive ? 'active' : ''} ${hasActiveChild && !isActive ? 'in-active-path' : ''}`}
                style={{ paddingLeft: `${(depth * 16) + 4}px` }}
                onClick={() => navigate(itemPath)}
              >
                <span className="wiki-tree-widget-dot" />
                <span>{item.title}</span>
              </span>
              {item.children && item.children.length > 0 && (
                <ul className="wiki-tree-widget-sublist">
                  {renderTreeNodes(item.children, depth + 1)}
                </ul>
              )}
            </li>
          )
        })
      }

      return (
        <div className="glass wiki-tree-widget" key={key}>
          <h3 className="sidebar-title">{title}</h3>
          <ul className="wiki-tree-widget-tree">
            <li>
              <span
                className="wiki-tree-widget-link wiki-tree-widget-project"
                onClick={() => navigate(`/wiki/${wikiProjectSlug}`)}
              >
                {wikiProjectTitle}
              </span>
              <ul className="wiki-tree-widget-sublist">
                {renderTreeNodes(wikiTree)}
              </ul>
            </li>
          </ul>
        </div>
      )
    }

    // --- toc (文章目录) ---
    if (w.type === 'toc') {
      if (domHeadings.length === 0) return null
      const minLevel = Math.min(...domHeadings.map((h) => h.level))
      return (
        <div className="glass sidebar-toc" key={key}>
          <h3 className="sidebar-title">{title}</h3>
          <ul className="toc-list">
            {domHeadings.map((h, idx) => (
              <li
                key={idx}
                className="toc-item"
                style={{ paddingLeft: `${(h.level - minLevel) * 14}px` }}
                onClick={() => {
                  const el = document.getElementById(h.id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                <span className="toc-dot" />
                <span className="toc-text">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    // --- categories (分类) ---
    if (w.type === 'categories') {
      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">{title}</h3>
          <ul className="category-list">
            {categories.map((cat) => (
              <li key={cat.id} onClick={() => navigate(`/category/${cat.slug}`)}>
                <span>{cat.name}</span>
                <span className="count">{cat.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )
    }

    // --- tags (标签云) ---
    if (w.type === 'tags') {
      if (tags.length === 0) return null
      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">{title}</h3>
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
      )
    }

    // --- site_info (站点信息) ---
    if (w.type === 'site_info') {
      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">{title}</h3>
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
      )
    }

    // --- about / custom_html (需要内容字段) ---
    if (CONTENT_TYPES.includes(w.type)) {
      if (!w.content) return null
      const isHtml = w.type === 'custom_html'
      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">{title}</h3>
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: w.content }} />
          ) : (
            <p className="sidebar-about-text">{w.content}</p>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <aside className={`sidebar sidebar-${side} ${className || ''}`}>
      <div className="sidebar-top">
        {widgets.map((w, i) => renderWidget(w, i))}
      </div>
    </aside>
  )
}
