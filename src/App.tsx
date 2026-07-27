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
        <Route path="/wiki/:project/:slug" element={<WikiDetail />} />
        <Route path="/wiki/:project" element={<WikiDetail />} />
        <Route path="/guestbook" element={<Guestbook />} />
      </Route>
    </Routes>
  )
}
