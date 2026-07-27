# 页面与路由

项目使用 React Router 7 管理路由，所有页面都包裹在 `Layout` 组件中。

## 路由定义

| 路径 | 页面组件 | 说明 |
| :--- | :--- | :--- |
| `/` | Home | 首页，文章列表流 |
| `/archives` | Archive | 按时间线归档文章 |
| `/archives/:postId` | PostDetail | 归档中的文章（通过 ID） |
| `/archives/:postId.html` | PostDetail | 归档文章（.html 后缀兼容） |
| `/page/:slug` | Page | 通用 WordPress 页面 |
| `/post/:slug` | PostDetail | 文章详情页 |
| `/category` | Categories | 全部分类列表页 |
| `/category/:slug` | Category | 按分类筛选文章 |
| `/search` | Search | 搜索文章 |
| `/links` | Links | 友情链接页 |
| `/topics` | Topics | 专栏/专题列表 |
| `/topic/:slug` | TopicDetail | 专栏详情 |
| `/topic/:slug/post/:postSlug` | PostDetail | 专栏下的文章详情 |
| `/wiki` | WikiIndex | Wiki 知识库项目列表 |
| `/wiki/:project` | WikiDetail | Wiki 项目首页（自动跳转至第一个页面） |
| `/wiki/:project/:slug` | WikiDetail | Wiki 页面详情 |
| `/guestbook` | Guestbook | 留言板 |

## 路由配置

```tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Archive from './pages/Archive'
import PostDetail from './pages/PostDetail'
import Page from './pages/Page'
import Category from './pages/Category'
import Categories from './pages/Categories'
import Search from './pages/Search'
import Links from './pages/Links'
import Topics from './pages/Topics'
import TopicDetail from './pages/TopicDetail'
import WikiIndex from './pages/WikiIndex'
import WikiDetail from './pages/WikiDetail'
import Guestbook from './pages/Guestbook'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/archives" element={<Archive />} />
        <Route path="/archives/:postId" element={<PostDetail />} />
        <Route path="/archives/:postId.html" element={<PostDetail />} />
        <Route path="/page/:slug" element={<Page />} />
        <Route path="/post/:slug" element={<PostDetail />} />
        <Route path="/category" element={<Categories />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/search" element={<Search />} />
        <Route path="/links" element={<Links />} />
        <Route path="/topics" element={<Topics />} />
        <Route path="/topic/:slug" element={<TopicDetail />} />
        <Route path="/topic/:slug/post/:postSlug" element={<PostDetail />} />
        <Route path="/wiki" element={<WikiIndex />} />
        <Route path="/wiki/:project" element={<WikiDetail />} />
        <Route path="/wiki/:project/:slug" element={<WikiDetail />} />
        <Route path="/guestbook" element={<Guestbook />} />
      </Route>
    </Routes>
  )
}
```

所有页面共享同一个 `Layout` 组件，该组件包含导航栏、搜索框、侧边栏和页脚。
