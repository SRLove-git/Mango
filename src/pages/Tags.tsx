import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTags } from '../api/wordpress'

interface Tag {
  id: number
  name: string
  slug: string
  count: number
}

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = '标签 - Mango'
    setLoading(true)
    getTags()
      .then(setTags)
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="tags-page glass">
        <h1 className="tags-title">标签</h1>
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="tags-page glass">
        <h1 className="tags-title">标签</h1>
        <div className="empty-state">暂无标签</div>
      </div>
    )
  }

  const top10 = tags.slice(0, 10)

  return (
    <div className="tags-page glass">
      <h1 className="tags-title">
        全部标签
        <span className="tags-title-count">· {tags.length} 个标签</span>
      </h1>

      {/* 标签云 */}
      <div className="tags-cloud">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            to={`/search?q=${encodeURIComponent(tag.name)}`}
            className="tags-cloud-item"
          >
            <span className="tags-cloud-name">#{tag.name}</span>
            <span className="tags-cloud-count">{tag.count} 篇文章</span>
          </Link>
        ))}
      </div>

      {/* Top 10 */}
      {top10.length > 0 && (
        <>
          <h2 className="tags-top-title">Top 10</h2>
          <ol className="tags-top-list">
            {top10.map((tag, index) => (
              <li key={tag.id} className="tags-top-item">
                <span className="tags-top-rank">{index + 1}</span>
                <Link
                  to={`/search?q=${encodeURIComponent(tag.name)}`}
                  className="tags-top-link"
                >
                  <span className="tags-top-name">#{tag.name}</span>
                  <span className="tags-top-count">{tag.count} 篇文章</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
