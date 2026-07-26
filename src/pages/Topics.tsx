import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTopics } from '../api/wordpress'
import type { Topic } from '../api/wordpress'

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = '专栏 - Mango'
    getTopics()
      .then(setTopics)
      .catch(() => setTopics([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (topics.length === 0) {
    return (
      <div className="glass empty-state">
        <h3>暂无专栏</h3>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>
    )
  }

  return (
    <div className="topics-page">
      <h1 className="topics-page-title">专栏</h1>
      <p className="topics-page-desc">系列文章合集，沉浸式阅读体验</p>

      <div className="topics-grid">
        {topics.map((topic) => {
          const iconUrl = topic.icon || ''
          const firstPost = topic.posts[0]
          const detailPath = firstPost
            ? `/topic/${topic.id}/post/${firstPost.slug}`
            : `/topic/${topic.id}`

          return (
            <Link key={topic.id} to={detailPath} className="topic-card glass">
              <div className="topic-card-icon">
                {iconUrl ? (
                  <img src={iconUrl} alt={topic.title} />
                ) : (
                  <span className="topic-card-icon-placeholder">
                    {topic.title.charAt(0)}
                  </span>
                )}
              </div>
              <div className="topic-card-body">
                <h2 className="topic-card-title">{topic.title}</h2>
                <p className="topic-card-desc">{topic.description}</p>
                <span className="topic-card-count">
                  {topic.post_count} 篇文章
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
