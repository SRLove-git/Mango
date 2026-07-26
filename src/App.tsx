import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Archive from './pages/Archive'
import PostDetail from './pages/PostDetail'
import Page from './pages/Page'
import Category from './pages/Category'
import Search from './pages/Search'
import Links from './pages/Links'
import Topics from './pages/Topics'
import TopicDetail from './pages/TopicDetail'

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
        <Route path="/topics" element={<Topics />} />
        <Route path="/topic/:slug" element={<TopicDetail />} />
        <Route path="/topic/:slug/post/:postSlug" element={<PostDetail />} />
      </Route>
    </Routes>
  )
}
