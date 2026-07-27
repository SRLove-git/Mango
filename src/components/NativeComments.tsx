import { useState, useEffect, useCallback } from 'react'
import { getComments, postComment, getPage } from '../api/wordpress'
import type { WPComment } from '../api/wordpress'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

function getAvatarUrl(comment: WPComment, size = 48): string {
  return comment.author_avatar_urls?.[String(size)] || ''
}

export default function NativeComments() {
  const [pageId, setPageId] = useState<number>(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [comments, setComments] = useState<WPComment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // 表单
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')

  // 动态获取留言页面的 ID
  useEffect(() => {
    getPage('guestbook')
      .then((p) => {
        if (p?.id) {
          setPageId(p.id)
        }
      })
      .catch(() => {})
      .finally(() => setPageLoading(false))
  }, [])

  const fetchComments = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await getComments(pageId, p, 10)
      setComments(res.comments)
      setTotal(res.total)
      setTotalPages(res.totalPages)
      setPage(p)
    } catch {
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [pageId])

  useEffect(() => {
    if (pageId) {
      fetchComments(1)
    }
  }, [pageId, fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pageId) return
    if (!name.trim() || !email.trim() || !content.trim()) {
      setError('请填写昵称、邮箱和评论内容')
      return
    }
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    try {
      const { status } = await postComment({
        post: pageId,
        author_name: name.trim(),
        author_email: email.trim(),
        content: content.trim(),
      })
      setName('')
      setEmail('')
      setContent('')
      if (status === 'hold') {
        setSuccessMsg('留言已提交，等待审核通过后即可显示 ✨')
      } else {
        setSuccessMsg('留言发表成功！')
        await fetchComments(1)
      }
    } catch (err: any) {
      const msg = err.message || ''
      // WordPress 重复评论检测
      if (msg.includes('duplicate') || msg.includes('Duplicate') || msg.includes('重复')) {
        setError('检测到重复留言，请修改内容后再试')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="guestbook-comments-inner">
        <div className="comments-loading">加载评论区...</div>
      </div>
    )
  }

  if (!pageId) {
    return (
      <div className="guestbook-comments-inner">
        <div className="comments-empty">
          请在 WordPress 后台创建一个 slug 为 "guestbook" 的页面，
          并在页面编辑中确认「允许评论」已开启，即可启用评论区。
        </div>
      </div>
    )
  }

  return (
    <div className="guestbook-comments-inner">
      <div className="comments-header">
        <span className="comments-count">{total} 条留言</span>
      </div>

      {/* 评论表单 */}
      <form className="comments-form" onSubmit={handleSubmit}>
        <div className="comments-form-fields">
          <div className="comments-field">
            <input
              type="text"
              placeholder="昵称 *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="comments-field">
            <input
              type="email"
              placeholder="邮箱 *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="comments-field comments-field-textarea">
          <textarea
            placeholder="写下你的留言..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            required
          />
        </div>
        {error && <div className="comments-error">{error}</div>}
        {successMsg && <div className="comments-success">{successMsg}</div>}
        <div className="comments-form-actions">
          <button type="submit" className="comments-submit-btn" disabled={submitting}>
            {submitting ? '提交中...' : '发表留言'}
          </button>
        </div>
      </form>

      {/* 评论列表 */}
      <div className="comments-list">
        {loading && page === 1 && (
          <div className="comments-loading">加载中...</div>
        )}

        {!loading && comments.length === 0 && (
          <div className="comments-empty">暂无留言，快来抢沙发吧~</div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="timeline-item">
            <div className="timeline-item-marker">
              {getAvatarUrl(comment) ? (
                <img src={getAvatarUrl(comment)} alt={comment.author_name} className="timeline-item-avatar" />
              ) : (
                <div className="timeline-item-avatar timeline-avatar-placeholder">
                  {comment.author_name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="timeline-item-body">
              <div className="timeline-item-header">
                <span className="timeline-item-author">{comment.author_name}</span>
                <span className="timeline-item-date">{formatDate(comment.date)}</span>
              </div>
              <div
                className="timeline-item-content"
                dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="comments-pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`comments-page-btn${p === page ? ' active' : ''}`}
              onClick={() => fetchComments(p)}
              disabled={loading}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
