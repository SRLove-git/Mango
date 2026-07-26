import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getPosts } from '../api/wordpress'
import type { WPPost } from '../api/wordpress'
import { getRandomImageUrl, useRandomImageFallback } from '../api/image'
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

  // First post as hero
  const heroPost = posts[0]
  const useFallback = useRandomImageFallback()
  const heroImage = heroPost?._embedded?.['wp:featuredmedia']?.[0]?.source_url
  const heroCategories = heroPost?._embedded?.['wp:term']?.[0] ?? []
  const remainingPosts = posts.slice(1)

  let heroBgImage
  if (heroImage) {
    heroBgImage = `url(${heroImage})`
  } else if (useFallback) {
    heroBgImage = `url(${getRandomImageUrl(heroPost?.id)})`
  } else {
    heroBgImage = 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
  }

  return (
    <>
      {/* Hero Section */}
      {heroPost && (
        <Link to={`/archives/${heroPost.id}.html`} className="hero">
          <div
            className="hero-bg"
            style={{
              backgroundImage: heroBgImage
            }}
          />
          <div className="hero-overlay" />
          <div className="hero-content">
            {heroCategories.length > 0 && (
              <span className="hero-category">{heroCategories[0].name}</span>
            )}
            <h1>{heroPost.title.rendered}</h1>
            <p>{new Date(heroPost.date).toLocaleDateString('zh-CN')}</p>
          </div>
        </Link>
      )}

      {/* Post list */}
      <div>
        <h2 className="section-title">最新文章</h2>
        {remainingPosts.length === 0 && posts.length === 1 ? (
          <div className="empty-state">暂无更多文章</div>
        ) : remainingPosts.length === 0 && posts.length === 0 ? (
          <div className="empty-state">暂无文章</div>
        ) : (
          remainingPosts.map((post) => (
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
