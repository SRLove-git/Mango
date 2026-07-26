import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

export default function ProgressBar() {
  const location = useLocation()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevKeyRef = useRef(location.key)

  useEffect(() => {
    const prevKey = prevKeyRef.current
    prevKeyRef.current = location.key

    // 忽略首次挂载 — 只有当 location.key 发生变化时才触发
    if (prevKey === location.key) return

    // Start: show bar and animate to ~80%
    setVisible(true)
    setWidth(0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setWidth(80)
      })
    })

    // 模拟加载完成（单页应用的实际加载很快，这里做视觉反馈）
    const completeTimer = setTimeout(() => {
      setWidth(100)
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 400)
    }, 300)

    return () => {
      clearTimeout(completeTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [location.key])

  if (!visible && width === 0) return null

  return (
    <div
      className="top-progress-bar"
      style={{
        width: `${width}%`,
        opacity: visible ? 1 : 0,
        transition: width >= 100
          ? 'width 0.3s ease, opacity 0.3s ease'
          : 'width 0.5s ease',
      }}
    />
  )
}
