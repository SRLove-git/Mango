import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getWikiProjects } from '../api/wordpress'
import type { WikiProject } from '../api/wordpress'

export default function WikiIndex() {
  const [projects, setProjects] = useState<WikiProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Wiki - Mango'
    getWikiProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (projects.length === 0) {
    return (
      <div className="glass empty-state">
        <h3>暂无 Wiki 项目</h3>
        <p style={{ margin: '8px 0 16px', opacity: 0.7 }}>知识库系统，用于展示项目文档或个人知识库</p>
        <Link to="/" className="back-link">← 返回首页</Link>
      </div>
    )
  }

  return (
    <div className="wiki-index">
      <h1 className="wiki-index-title">Wiki</h1>
      <p className="wiki-index-desc">知识库 · 项目文档</p>

      <div className="wiki-grid">
        {projects.map((project) => {
          const detailPath = `/wiki/${project.id}`
          const iconUrl = project.icon || ''

          return (
            <Link key={project.id} to={detailPath} className="wiki-card glass onload-animation">
              <div className="wiki-card-icon">
                {iconUrl ? (
                  <img src={iconUrl} alt={project.title} />
                ) : (
                  <span className="wiki-card-icon-placeholder">
                    {project.title.charAt(0)}
                  </span>
                )}
              </div>
              <div className="wiki-card-body">
                <h2 className="wiki-card-title">{project.title}</h2>
                {project.subtitle && (
                  <p className="wiki-card-subtitle">{project.subtitle}</p>
                )}
                <span className="wiki-card-count">
                  {project.page_count} 页文档
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
