import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchPosts } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'
import PostCard from '../components/PostCard'
import Pagination from '../components/Pagination'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const currentPage = Number(searchParams.get('page')) || 1
  const [posts, setPosts] = useState<WPPost[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const archiveLayout = (window as any).MANGO_DATA?.layout?.archive_layout || 'grid'

  useEffect(() => {
    document.title = `搜索: ${query || '...'} - Mango`
    if (!query) {
      setPosts([])
      setTotalPages(0)
      setLoading(false)
      return
    }
    setLoading(true)
    searchPosts(query, currentPage)
      .then((res) => {
        setPosts(res.posts)
        setTotalPages(res.totalPages)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [query, currentPage])

  return (
    <>
      <h2 className="section-title">搜索：{query}</h2>
      {loading ? (
        <div className="loading">搜索中...</div>
      ) : posts.length === 0 ? (
        <div className="glass empty-state">未找到相关文章</div>
      ) : (
        <>
          <div className={`post-list post-list--${archiveLayout}`}>
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/search"
            searchParams={`&q=${encodeURIComponent(query)}`}
          />
        </>
      )}
    </>
  )
}
