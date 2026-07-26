# 页面与路由

项目使用 React Router 7 管理路由，所有页面都包裹在 `Layout` 组件中。

## 路由定义

| 路径 | 页面组件 | 说明 |
| :--- | :--- | :--- |
| `/` | Home | 首页，文章列表流 |
| `/archives` | Archive | 按时间线归档文章 |
| `/page/:slug` | Page | 通用 WordPress 页面 |
| `/post/:slug` | PostDetail | 文章详情页 |
| `/category/:slug` | Category | 按分类筛选文章 |
| `/search` | Search | 搜索文章 |
| `/links` | Links | 友情链接页 |

## 路由配置

```tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Archive from './pages/Archive'
// ...

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/archives" element={<Archive />} />
        <Route path="/page/:slug" element={<Page />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/search" element={<Search />} />
        <Route path="/links" element={<Links />} />
      </Route>
    </Routes>
  )
}
```

所有页面共享同一个 `Layout` 组件，该组件包含导航栏、搜索框、侧边栏和页脚。
