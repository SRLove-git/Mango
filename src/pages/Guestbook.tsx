import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getPage } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'
import MarkdownRenderer from '../components/MarkdownRenderer'
import NativeComments from '../components/NativeComments'
import { useBannerTitle } from '../context/BannerTitleContext'

const COMMENT_SYSTEM = (window as any).MANGO_DATA?.commentSystem || 'native'
const WALINE_SERVER_URL = (window as any).MANGO_DATA?.walineServerUrl || ''

export default function Guestbook() {
  const { setBannerTitle } = useBannerTitle()
  const [page, setPage] = useState<WPPost | null>(null)
  const [loading, setLoading] = useState(true)
  const walineRef = useRef<HTMLDivElement>(null)
  const walineInitialized = useRef(false)

  useEffect(() => {
    document.title = '留言 - Mango'
    setBannerTitle('留言')
  }, [setBannerTitle])

  // 初始化 Waline（仅当选择了 waline 且有服务器地址时）
  useEffect(() => {
    if (
      !loading &&
      COMMENT_SYSTEM === 'waline' &&
      WALINE_SERVER_URL &&
      walineRef.current &&
      !walineInitialized.current
    ) {
      walineInitialized.current = true
      import('@waline/client').then(({ init }) => {
        init({
          el: walineRef.current,
          serverURL: WALINE_SERVER_URL,
          lang: 'zh-CN',
          dark: 'body.dark-theme',
          emoji: [
            'https://unpkg.com/@waline/emojis@1.2.0/tieba',
            'https://unpkg.com/@waline/emojis@1.2.0/tw-emoji',
          ],
          pageSize: 10,
          requiredMeta: ['nick', 'mail'],
          login: 'enable',
        })
      })
    }
  }, [loading])

  useEffect(() => {
    setLoading(true)
    getPage('guestbook')
      .then((p) => {
        setPage(p)
      })
      .catch(() => setPage(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <article className="guestbook-page">
      <Link to="/" className="back-link">← 返回首页</Link>

      <div className="glass guestbook-hero">
        <h1 className="guestbook-hero-title">留言</h1>
        <p className="guestbook-hero-desc">
          欢迎在这里留下你的足迹，分享你的想法和建议
        </p>
        <div className="guestbook-hero-rules">
          <ul>
            <li>请保持友善和尊重，营造良好的交流氛围</li>
            <li>欢迎分享你的想法，也可以提出对网站的建议</li>
            <li>你的每一条留言都是对我最大的支持 ✨</li>
          </ul>
        </div>
      </div>

      {page?.content?.rendered && (
        <div className="glass guestbook-content">
          <MarkdownRenderer content={page.content.rendered} />
        </div>
      )}

      {/* 评论区根据配置选择 */}
      <div className="glass guestbook-comments">
        {COMMENT_SYSTEM === 'waline' && WALINE_SERVER_URL ? (
          <div ref={walineRef} id="waline-container" />
        ) : COMMENT_SYSTEM === 'waline' && !WALINE_SERVER_URL ? (
          <div className="comments-empty">
            已选择 Waline 评论系统，但未配置服务器地址。请在 WordPress 后台填写 Waline 服务器地址。
          </div>
        ) : (
          <NativeComments />
        )}
      </div>
    </article>
  )
}
