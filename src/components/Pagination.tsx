import { Link } from 'react-router-dom'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  searchParams?: string
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <nav className="pagination">
      {currentPage > 1 && (
        <Link
          to={`${basePath}?page=${currentPage - 1}${searchParams}`}
          className={`page-btn`}
        >
          ‹ 上一页
        </Link>
      )}
      {pages.map((page) => (
        <Link
          key={page}
          to={`${basePath}?page=${page}${searchParams}`}
          className={`page-btn ${page === currentPage ? 'active' : ''}`}
        >
          {page}
        </Link>
      ))}
      {currentPage < totalPages && (
        <Link
          to={`${basePath}?page=${currentPage + 1}${searchParams}`}
          className="page-btn"
        >
          下一页 ›
        </Link>
      )}
    </nav>
  )
}
