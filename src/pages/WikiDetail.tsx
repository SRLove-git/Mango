import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getWikiProject, getWikiPage } from '../api/wordpress'
import type { WikiProjectDetail } from '../api/wordpress'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useArticleToc } from '../context/ArticleTocContext'

export default function WikiDetail() {
  const { project: projectSlug, slug: pageSlug } = useParams<{ project: string; slug?: string }>()
  const navigate = useNavigate()
  const { triggerScan } = useArticleToc()
  const [data, setData] = useState<WikiProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectSlug) return
    setLoading(true)

    const fetchData = pageSlug
      ? getWikiPage(projectSlug, pageSlug)
      : getWikiProject(projectSlug)

    fetchData
      .then((d) => {
        setData(d)
        if (d) {
          // If no specific page requested, redirect to first page
          if (!pageSlug && d.tree && d.tree.length > 0) {
            const firstSlug = d.tree[0].id
            navigate(`/wiki/${projectSlug}/${firstSlug}`, { replace: true })
            return
          }
          const title = d.page?.title || d.title
          document.title = `${title} - ${d.title} - Mango`
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [projectSlug, pageSlug, navigate])

  // 数据加载完成后通知 TOC 扫描
  useEffect(() => {
    if (data) triggerScan()
  }, [data, triggerScan])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!data) {
    return (
      <div className="glass empty-state">
        <h3>Wiki 未找到</h3>
        <Link to="/wiki" className="back-link">← 返回 Wiki 列表</Link>
      </div>
    )
  }

  // If redirecting (no page slug and tree exists), show loading
  if (!data.page) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="wiki-detail-layout">
      {/* Main Content */}
      <div className="wiki-content-wrapper">
        {/* Breadcrumb */}
        <div className="wiki-breadcrumb">
          <Link to="/wiki">Wiki</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/wiki/${projectSlug}`}>{data.title}</Link>
          {data.page && (
            <>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{data.page.title}</span>
            </>
          )}
        </div>

        <article className="wiki-article glass">
          <h1 className="wiki-article-title">{data.page.title}</h1>
          <MarkdownRenderer content={data.page.content} className="wiki-article-content" />
        </article>

        {/* Prev / Next Navigation */}
        <div className="wiki-page-nav">
          {data.prev ? (
            <Link to={`/wiki/${projectSlug}/${data.prev.slug}`} className="wiki-page-nav-link prev">
              <span className="wiki-nav-label">← 上一篇</span>
              <span className="wiki-nav-title">{data.prev.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {data.next ? (
            <Link to={`/wiki/${projectSlug}/${data.next.slug}`} className="wiki-page-nav-link next">
              <span className="wiki-nav-label">下一篇 →</span>
              <span className="wiki-nav-title">{data.next.title}</span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}
