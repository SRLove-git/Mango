import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPosts } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'
import PostCard from '../components/PostCard'
import Pagination from '../components/Pagination'

export default function Home() {
  const [searchParams] = useSearchParams()
  const currentPage = Number(searchParams.get('page')) || 1
  const [posts, setPosts] = useState<WPPost[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = currentPage > 1 ? `第 ${currentPage} 页 - Mango` : 'Mango'
    setLoading(true)
    getPosts(currentPage)
      .then((res) => {
        setPosts(res.posts)
        setTotalPages(res.totalPages)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [currentPage])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <>
      {/* Post list */}
      <div>
        {posts.length === 0 ? (
          <div className="empty-state">暂无文章</div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/"
      />
    </>
  )
}
