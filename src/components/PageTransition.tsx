import { useEffect } from 'react'
import { useOutlet, useLocation } from 'react-router-dom'

/**
 * Page transition wrapper.
 *
 * Uses React `key` to force unmount/remount on route change,
 * triggering the CSS keyframe animation (fade-in-up).
 * Also scrolls to top on every navigation.
 */
export default function PageTransition() {
  const outlet = useOutlet()
  const location = useLocation()

  // 路由切换时滚回顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div key={location.pathname} className="transition-main">
      {outlet}
    </div>
  )
}
