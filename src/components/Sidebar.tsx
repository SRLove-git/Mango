import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import { useArticleToc } from '../context/ArticleTocContext'
import { getWikiProject, type Topic } from '../api/wordpress'

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
  topic_posts: '专栏目录',
  wiki_tree: 'Wiki 页面',
  toc: '文章目录',
  about: '关于',
  site_info: '站点信息',
  site_stats: '站点统计',
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
            {((window as any).MANGO_DATA?.avatarUrl || user?.avatar_urls?.['96']) ? (
              <img className="avatar" src={(window as any).MANGO_DATA?.avatarUrl || user.avatar_urls['96']} alt={user?.name || 'Mango'} />
            ) : (
              <div className="avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }} />
            )}
          </div>
          <h2>{user?.name || 'Mango'}</h2>
          <p>{(window as any).MANGO_DATA?.bioText || user?.description || '分享技术、生活与思考'}</p>
          {(() => {
            const socialLinks = (window as any).MANGO_DATA?.socialLinks || {};
            const items: { key: string; url: string; label: string }[] = [
              { key: 'github', url: socialLinks.github, label: 'GitHub' },
              { key: 'twitter', url: socialLinks.twitter, label: 'Twitter/X' },
              { key: 'bilibili', url: socialLinks.bilibili, label: 'Bilibili' },
              { key: 'weibo', url: socialLinks.weibo, label: '微博' },
              { key: 'email', url: socialLinks.email, label: 'Email' },
              { key: 'rss', url: socialLinks.rss, label: 'RSS' },
            ].filter(i => i.url);
            if (items.length === 0) return null;
            return (
              <div className="profile-social">
                {items.map(item => (
                  <a key={item.key} href={item.url} target="_blank" rel="noopener noreferrer" className="profile-social-link" title={item.label}>
                    {item.key === 'github' && (
                      <svg width="20" height="20" viewBox="0 0 19 19" fill="currentColor">
                        <path fillRule="evenodd" d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844" clipRule="evenodd"/>
                      </svg>
                    )}
                    {item.key === 'twitter' && (
                      <svg width="20" height="20" viewBox="0 0 19 19" fill="currentColor">
                        <path fillRule="evenodd" d="M1.893 1.98c.052.072 1.245 1.769 2.653 3.77l2.892 4.114c.183.261.333.48.333.486s-.068.089-.152.183l-.522.593-.765.867-3.597 4.087c-.375.426-.734.834-.798.905a1 1 0 0 0-.118.148c0 .01.236.017.664.017h.663l.729-.83c.4-.457.796-.906.879-.999a692 692 0 0 0 1.794-2.038c.034-.037.301-.34.594-.675l.551-.624.345-.392a7 7 0 0 1 .34-.374c.006 0 .93 1.306 2.052 2.903l2.084 2.965.045.063h2.275c1.87 0 2.273-.003 2.266-.021-.008-.02-1.098-1.572-3.894-5.547-2.013-2.862-2.28-3.246-2.273-3.266.008-.019.282-.332 2.085-2.38l2-2.274 1.567-1.782c.022-.028-.016-.03-.65-.03h-.674l-.3.342a871 871 0 0 1-1.782 2.025c-.067.075-.405.458-.75.852a100 100 0 0 1-.803.91c-.148.172-.299.344-.99 1.127-.304.343-.32.358-.345.327-.015-.019-.904-1.282-1.976-2.808L6.365 1.85H1.8zm1.782.91 8.078 11.294c.772 1.08 1.413 1.973 1.425 1.984.016.017.241.02 1.05.017l1.03-.004-2.694-3.766L7.796 5.75 5.722 2.852l-1.039-.004-1.039-.004z" clipRule="evenodd"/>
                      </svg>
                    )}
                    {item.key === 'bilibili' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.267.573-.4.92-.4.347 0 .653.133.92.4L9.707 4.1a5.6 5.6 0 0 1 .533.16 5.6 5.6 0 0 1 .533-.16l3.787-3.694c.267-.267.573-.4.92-.4.347 0 .662.142.929.427.267.284.4.587.4.907s-.133.622-.4.88zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.25.373.56.373.933v1.334c0 .373-.124.684-.373.933-.249.25-.56.373-.933.373s-.684-.124-.933-.373-.373-.56-.373-.933v-1.334c0-.373.124-.684.373-.933.249-.25.56-.373.933-.373m8 0c.373 0 .684.124.933.373.25.25.373.56.373.933v1.334c0 .373-.124.684-.373.933-.249.25-.56.373-.933.373s-.684-.124-.933-.373-.373-.56-.373-.933v-1.334c0-.373.124-.684.373-.933.249-.25.56-.373.933-.373"/>
                      </svg>
                    )}
                    {item.key === 'weibo' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443m-1.2-10.275c-5.07.549-8.62 4.156-7.948 8.174.672 4.02 5.282 6.819 10.353 6.27 5.069-.553 8.618-4.164 7.948-8.178-.673-4.016-5.282-6.801-10.353-6.272v.006z"/>
                        <path d="M20.57 6.537c.026.163-.008.33-.09.506a.963.963 0 0 1-.4.39.88.88 0 0 1-.524.11 1.04 1.04 0 0 1-.484-.18.9.9 0 0 1-.33-.403.6.6 0 0 1 .013-.476c.065-.157.172-.278.334-.36.15-.077.313-.1.496-.076.182.028.337.118.466.276.128.157.191.323.191.503v-.004z"/>
                        <path d="M21.907 3.05c.096.388.014.792-.232 1.206a2.26 2.26 0 0 1-.93.876 2.18 2.18 0 0 1-1.244.247 2.56 2.56 0 0 1-1.149-.45 2.03 2.03 0 0 1-.78-.974 1.46 1.46 0 0 1 .03-1.138c.157-.375.417-.66.8-.856.37-.19.762-.238 1.182-.153.418.087.78.279 1.087.58.31.304.507.595.615.88l-.003-.005z"/>
                        <path d="M19.153 8.68c-1.228-.192-2.323-.069-3.29.387-.966.453-1.608 1.13-1.943 2.026-.33.886-.277 1.74.15 2.527.224.425.54.782.946 1.065.405.28.854.464 1.346.557.473.093.945.099 1.409.019.466-.083.84-.266 1.135-.548.296-.285.49-.616.603-.985.098-.328.107-.654.034-.97a2.22 2.22 0 0 0-.338-.842 2.42 2.42 0 0 0-.66-.65c.4-.38.862-.64 1.388-.77.525-.13 1.028-.103 1.517.076.226.087.432.21.618.358.184.148.319.316.414.508a2.2 2.2 0 0 1 .132.332l2.403-1.039a2.69 2.69 0 0 0-.587-.84 4.72 4.72 0 0 0-1-.72 5.82 5.82 0 0 0-2.03-.6 6.13 6.13 0 0 0-1.028-.052"/>
                      </svg>
                    )}
                    {item.key === 'email' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    )}
                    {item.key === 'rss' && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93z"/>
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            );
          })()}
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

    // --- topic_posts (专栏文章目录) ---
    if (w.type === 'topic_posts') {
      const currentTopic = (window as any).__currentTopic as Topic | undefined
      if (!currentTopic || !currentTopic.posts || currentTopic.posts.length === 0) return null

      // 从 URL 判断当前文章 slug
      const pathParts = location.pathname.split('/')
      const currentPostSlug = pathParts.length >= 4 && pathParts[1] === 'topic' ? pathParts[4] || '' : ''

      return (
        <div className="glass topic-posts-widget" key={key}>
          <h3 className="sidebar-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {title}
              <span className="pill-count" style={{ background: 'var(--glass)' }}>{currentTopic.posts.length}</span>
            </span>
          </h3>
          <ul className="topic-posts-list">
            {currentTopic.posts.map((post, index) => {
              const isActive = post.slug === currentPostSlug
              const postPath = `/topic/${currentTopic.id}/post/${post.slug}`
              return (
                <li
                  key={post.id}
                  className={`topic-posts-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(postPath)}
                >
                  <span className="topic-posts-index">{index + 1}</span>
                  <span className="topic-posts-title">{post.title}</span>
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

    // --- site_stats (站点统计) ---
    if (w.type === 'site_stats') {
      const stats = (window as any).MANGO_DATA?.stats || {}
      const totalPosts = stats.total_posts || 0
      const totalWords = stats.total_words || 0
      const siteStartDate = stats.site_start_date || ''
      const lastActivity = stats.last_activity || ''
      const runningDays = siteStartDate
        ? Math.floor((Date.now() - new Date(siteStartDate).getTime()) / 86400000)
        : 0
      const daysSinceLastActivity = lastActivity
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000)
        : 0

      return (
        <div className="glass" key={key}>
          <h3 className="sidebar-title">{title}</h3>
          <ul className="site-stats-list">
            <li>
              <span className="stats-label">文章</span>
              <span className="stats-value">{totalPosts}</span>
            </li>
            <li>
              <span className="stats-label">分类</span>
              <span className="stats-value">{categories.length}</span>
            </li>
            <li>
              <span className="stats-label">标签</span>
              <span className="stats-value">{tags.length}</span>
            </li>
            <li>
              <span className="stats-label">总字数</span>
              <span className="stats-value">{totalWords.toLocaleString()}</span>
            </li>
            <li>
              <span className="stats-label">运行时长</span>
              <span className="stats-value">{runningDays} 天</span>
            </li>
            <li>
              <span className="stats-label">最后活动</span>
              <span className="stats-value">{daysSinceLastActivity} 天前</span>
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
      <div className="sidebar-sticky">
        {widgets.map((w, i) => renderWidget(w, i))}
      </div>
    </aside>
  )
}
