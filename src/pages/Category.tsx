import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getPostsByCategory } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'
import PostCard from '../components/PostCard'
import Pagination from '../components/Pagination'

export default function Category() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1
  const [posts, setPosts] = useState<WPPost[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPostsByCategory(slug, currentPage)
      .then((res) => {
        setPosts(res.posts)
        setTotalPages(res.totalPages)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [slug, currentPage])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <>
      <h2 className="section-title">分类：{slug}</h2>
      {posts.length === 0 ? (
        <div className="glass empty-state">该分类暂无文章</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={`/category/${slug}`}
      />
    </>
  )
}
