import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAllPosts } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'

interface YearGroup {
  year: number
  posts: WPPost[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function groupByYear(posts: WPPost[]): YearGroup[] {
  const map = new Map<number, WPPost[]>()
  for (const post of posts) {
    const year = new Date(post.date).getFullYear()
    if (!map.has(year)) map.set(year, [])
    map.get(year)!.push(post)
  }
  return Array.from(map.entries())
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year - a.year)
}

export default function Archive() {
  const [groups, setGroups] = useState<YearGroup[]>([])
  const [loading, setLoading] = useState(true)

  // 初始折叠：除最新年份外全部折叠
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLoading(true)
    getAllPosts()
      .then((posts) => {
        const grouped = groupByYear(posts)
        setGroups(grouped)
        // 初始：除了第一年（最新）外全部折叠
        if (grouped.length > 1) {
          setCollapsedYears(new Set(grouped.slice(1).map((g) => g.year)))
        }
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  const toggleYear = useCallback((year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="archive-page glass">
        <h1 className="archive-title">归档</h1>
        <div className="loading">加载中...</div>
      </div>
    )
  }

  const totalPosts = groups.reduce((sum, g) => sum + g.posts.length, 0)

  return (
    <div className="archive-page glass">
      <h1 className="archive-title">
        归档
        <span className="archive-title-count">{totalPosts}</span>
      </h1>

      {groups.length === 0 ? (
        <div className="empty-state">暂无文章</div>
      ) : (
        <div className="archive-list">
          {groups.map((group) => {
            const collapsed = collapsedYears.has(group.year)
            return (
              <div key={group.year} className="archive-year-block">
                {/* Year toggle header */}
                <button
                  className="archive-year-toggle"
                  onClick={() => toggleYear(group.year)}
                  aria-expanded={!collapsed}
                >
                  <span
                    className="archive-arrow"
                    style={{ transform: collapsed ? 'rotate(-90deg)' : '' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                  <span className="archive-year-label">{group.year}</span>
                  <span className="archive-year-count">{group.posts.length}</span>
                  <span className="archive-year-count-label">篇</span>
                </button>

                {/* Posts */}
                <div
                  className="archive-year-content"
                  hidden={collapsed}
                >
                  {group.posts.map((post) => {
                    const categories = post._embedded?.['wp:term']?.[0] ?? []
                    const tags = post._embedded?.['wp:term']?.[1] ?? []
                    return (
                      <Link
                        key={post.id}
                        to={`/post/${post.slug}`}
                        className="archive-post-row"
                      >
                        {/* Date */}
                        <span className="archive-post-date">{formatDate(post.date)}</span>

                        {/* Dash line + dot */}
                        <span className="archive-post-dash">
                          <span className="archive-post-dot" />
                        </span>

                        {/* Title + category */}
                        <span className="archive-post-info">
                          {categories.length > 0 && (
                            <span className="archive-post-cat">{categories[0].name}</span>
                          )}
                          <span className="archive-post-title">{post.title.rendered}</span>
                        </span>

                        {/* Tags (desktop only) */}
                        {tags.length > 0 && (
                          <span className="archive-post-tags">
                            {tags.slice(0, 3).map((t: any) => `#${t.name}`).join(' ')}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
