import { useSiteData } from '../context/SiteDataContext'
import { Link } from 'react-router-dom'

export default function Categories() {
  const { categories } = useSiteData()

  return (
    <div className="glass card-base">
      <h1 className="section-title">全部分类</h1>
      <div className="categories-grid">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.slug}`}
            className="glass category-card card-lift"
          >
            <span className="category-name">{cat.name}</span>
            <span className="category-count">{cat.count} 篇文章</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
