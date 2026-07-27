import { useEffect } from 'react'

declare global {
  interface Window {
    MANGO_DATA?: {
      live2d?: {
        enabled: string
        position: string
        mobileHidden: string
        cdnUrl: string
      }
    }
  }
}

export default function Live2D() {
  useEffect(() => {
    const config = window.MANGO_DATA?.live2d

    // 如果未启用，直接返回
    if (config?.enabled !== '1') return

    // 设置位置 body class
    if (config?.position === 'left') {
      document.body.classList.add('live2d-position-left')
    }

    // 移动端隐藏
    if (config?.mobileHidden === '1') {
      document.body.classList.add('live2d-mobile-hidden')
    }

    if (document.getElementById('l2d-autoload')) return

    const script = document.createElement('script')
    script.id = 'l2d-autoload'
    script.src = config?.cdnUrl || 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.1/dist/autoload.js'
    script.async = true
    document.body.appendChild(script)

    // 轮询等待 #waifu 容器创建完成后再显示，避免加载占位遮挡内容
    const checkInterval = setInterval(() => {
      const waifu = document.getElementById('waifu')
      if (waifu) {
        waifu.classList.add('l2d-loaded')
        clearInterval(checkInterval)
      }
    }, 100)
    // 最长等待 5 秒后强制显示，避免一直不可见
    const forceShow = setTimeout(() => {
      const waifu = document.getElementById('waifu')
      if (waifu) waifu.classList.add('l2d-loaded')
      clearInterval(checkInterval)
    }, 5000)

    return () => {
      clearInterval(checkInterval)
      clearTimeout(forceShow)
      const s = document.getElementById('l2d-autoload')
      if (s) s.remove()

      // Remove live2d widget container and tips
      const live2d = document.getElementById('live2d')
      if (live2d) live2d.remove()
      const tips = document.getElementById('waifu-tips')
      if (tips) tips.remove()

      // Remove dynamically loaded waifu.css
      const css = document.querySelector('link[href*="waifu.css"]')
      if (css) css.remove()

      // 清理 body class
      document.body.classList.remove('live2d-position-left')
      document.body.classList.remove('live2d-mobile-hidden')
    }
  }, [])

  return null
}
