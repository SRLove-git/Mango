import { useCallback, useEffect, useRef, useState } from 'react'

/* ============================================================
   Wallpaper Settings — 浮动壁纸设置面板
   参照 Firefly DisplaySettingsIntegrated 面板
   ============================================================ */

type WallpaperMode = 'banner' | 'fullscreen' | 'overlay' | 'none'
type TabKey = 'appearance' | 'wallpaper' | 'effects'

const STORAGE = {
  mode: 'mango_wallpaper_mode',
  bannerTitle: 'mango_banner_title',
  bannerCarousel: 'mango_banner_carousel',
  waves: 'mango_waves',
  gradient: 'mango_gradient',
  sakura: 'mango_sakura',
  hue: 'mango_hue',
  hueDefault: 'mango_hue_default',
  overlayOpacity: 'mango_overlay_opacity',
  overlayBlur: 'mango_overlay_blur',
  cardTransparent: 'mango_card_transparent',
}

const DEFAULTS = {
  mode: 'banner' as WallpaperMode,
  bannerTitle: true,
  bannerCarousel: false,
  waves: true,
  gradient: true,
  sakura: true,
  hue: 159,
}

// ---------- 持久化辅助 ----------
function getStored<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    if (v === null) return fallback
    if (typeof fallback === 'boolean') return (v === 'true') as unknown as T
    if (typeof fallback === 'number') return (parseInt(v, 10) || fallback) as unknown as T
    return v as unknown as T
  } catch {
    return fallback
  }
}

function setStored(key: string, value: string | number | boolean) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* ignore */
  }
}

// ---------- Body 类名应用 ----------
function applyWallpaperMode(mode: WallpaperMode) {
  const cls = [
    'wallpaper-mode-banner',
    'wallpaper-mode-fullscreen',
    'wallpaper-mode-overlay',
    'wallpaper-mode-none',
  ]
  document.body.classList.remove(...cls)
  document.body.classList.add(`wallpaper-mode-${mode}`)
}

function applyToggle(name: 'bannerTitle' | 'bannerCarousel' | 'waves' | 'gradient' | 'sakura', enabled: boolean) {
  const offClass = `${name}-disabled`
  document.body.classList.toggle(offClass, !enabled)
}

export default function WallpaperSettings() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('wallpaper')
  const [mode, setMode] = useState<WallpaperMode>(DEFAULTS.mode)
  const [bannerTitle, setBannerTitle] = useState(DEFAULTS.bannerTitle)
  const [bannerCarousel, setBannerCarousel] = useState(DEFAULTS.bannerCarousel)
  const [waves, setWaves] = useState(DEFAULTS.waves)
  const [gradient, setGradient] = useState(DEFAULTS.gradient)
  const [sakura, setSakura] = useState(DEFAULTS.sakura)
  const [hue, setHue] = useState(DEFAULTS.hue)
  const [overlayOpacity, setOverlayOpacity] = useState(0.8)
  const [overlayBlur, setOverlayBlur] = useState(0)
  const [cardTransparent, setCardTransparent] = useState(0.45)
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hueTrackRef = useRef<HTMLDivElement>(null)
  const overlayOpacityTrackRef = useRef<HTMLDivElement>(null)
  const overlayBlurTrackRef = useRef<HTMLDivElement>(null)
  const cardTransparentTrackRef = useRef<HTMLDivElement>(null)
  const hueDraggingRef = useRef(false)
  const sliderDraggingRef = useRef<string | null>(null)

  // 初始化: 从 localStorage 读取并应用
  useEffect(() => {
    const m = getStored<WallpaperMode>(STORAGE.mode, DEFAULTS.mode)
    const bt = getStored<boolean>(STORAGE.bannerTitle, DEFAULTS.bannerTitle)
    const bc = getStored<boolean>(STORAGE.bannerCarousel, DEFAULTS.bannerCarousel)
    const w = getStored<boolean>(STORAGE.waves, DEFAULTS.waves)
    const g = getStored<boolean>(STORAGE.gradient, DEFAULTS.gradient)
    const s = getStored<boolean>(STORAGE.sakura, DEFAULTS.sakura)
    const h = getStored<number>(STORAGE.hue, DEFAULTS.hue)
    const oo = getStored<number>(STORAGE.overlayOpacity, 0.8)
    const ob = getStored<number>(STORAGE.overlayBlur, 0)
    const ct = getStored<number>(STORAGE.cardTransparent, 0.45)
    setMode(m)
    setBannerTitle(bt)
    setBannerCarousel(bc)
    setWaves(w)
    setGradient(g)
    setSakura(s)
    setHue(h)
    setOverlayOpacity(oo)
    setOverlayBlur(ob)
    setCardTransparent(ct)
    applyWallpaperMode(m)
    applyToggle('bannerTitle', bt)
    applyToggle('bannerCarousel', bc)
    applyToggle('waves', w)
    applyToggle('gradient', g)
    applyToggle('sakura', s)
    document.body.style.setProperty('--hue', String(h), 'important')
    document.body.style.setProperty('--overlay-opacity', String(oo))
    document.body.style.setProperty('--overlay-blur', String(ob) + 'px')
    document.body.style.setProperty('--card-transparent-opacity', String(ct))
  }, [])

  // 色相值变化时同步 CSS 变量和 localStorage
  useEffect(() => {
    document.body.style.setProperty('--hue', String(hue), 'important')
    setStored(STORAGE.hue, hue)
  }, [hue])

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    // 延迟挂载，避免打开按钮的 click 立即关闭
    const t = setTimeout(() => document.addEventListener('mousedown', onDocClick), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [open])

  // Esc 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // ---------- 切换处理 ----------
  const switchMode = useCallback((newMode: WallpaperMode) => {
    setMode(newMode)
    setStored(STORAGE.mode, newMode)
    applyWallpaperMode(newMode)
  }, [])

  const toggleBannerTitle = useCallback(() => {
    setBannerTitle((v) => {
      const nv = !v
      setStored(STORAGE.bannerTitle, nv)
      applyToggle('bannerTitle', nv)
      return nv
    })
  }, [])

  const toggleBannerCarousel = useCallback(() => {
    setBannerCarousel((v) => {
      const nv = !v
      setStored(STORAGE.bannerCarousel, nv)
      applyToggle('bannerCarousel', nv)
      return nv
    })
  }, [])

  const toggleWaves = useCallback(() => {
    setWaves((v) => {
      const nv = !v
      setStored(STORAGE.waves, nv)
      applyToggle('waves', nv)
      return nv
    })
  }, [])

  const toggleGradient = useCallback(() => {
    setGradient((v) => {
      const nv = !v
      setStored(STORAGE.gradient, nv)
      applyToggle('gradient', nv)
      return nv
    })
  }, [])

  const toggleSakura = useCallback(() => {
    setSakura((v) => {
      const nv = !v
      setStored(STORAGE.sakura, nv)
      applyToggle('sakura', nv)
      return nv
    })
  }, [])

  // ---------- 透明模式滑块处理 ----------
  const handleOverlayOpacity = useCallback((value: number) => {
    setOverlayOpacity(value)
    setStored(STORAGE.overlayOpacity, value)
    document.body.style.setProperty('--overlay-opacity', String(value))
  }, [])

  const handleOverlayBlur = useCallback((value: number) => {
    setOverlayBlur(value)
    setStored(STORAGE.overlayBlur, value)
    document.body.style.setProperty('--overlay-blur', String(value) + 'px')
  }, [])

  const handleCardTransparent = useCallback((value: number) => {
    setCardTransparent(value)
    setStored(STORAGE.cardTransparent, value)
    document.body.style.setProperty('--card-transparent-opacity', String(value))
  }, [])

  // 自定义滑块: 根据 clientX 计算色相值
  const updateHueFromEvent = useCallback((clientX: number) => {
    const el = hueTrackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    let x = clientX - rect.left
    x = Math.max(0, Math.min(rect.width, x))
    const ratio = x / rect.width
    // step = 5
    const newHue = Math.round((ratio * 360) / 5) * 5
    setHue(Math.max(0, Math.min(360, newHue)))
  }, [])

  // 通用滑块值计算
  const sliderValueFromEvent = useCallback((clientX: number, el: HTMLDivElement, min: number, max: number, step: number, decimals: number) => {
    const rect = el.getBoundingClientRect()
    let x = clientX - rect.left
    x = Math.max(0, Math.min(rect.width, x))
    const ratio = x / rect.width
    const stepped = Math.round((ratio * (max - min)) / step) * step + min
    return parseFloat(Math.max(min, Math.min(max, stepped)).toFixed(decimals))
  }, [])

  // 文档级 mouseup / mousemove — 处理色相 & 滑块拖动
  useEffect(() => {
    const onUp = () => {
      hueDraggingRef.current = false
      sliderDraggingRef.current = null
    }
    const onMove = (e: MouseEvent) => {
      if (hueDraggingRef.current) {
        e.preventDefault()
        updateHueFromEvent(e.clientX)
        return
      }
      const sliderId = sliderDraggingRef.current
      if (!sliderId) return
      e.preventDefault()
      if (sliderId === 'overlayOpacity' && overlayOpacityTrackRef.current) {
        const v = sliderValueFromEvent(e.clientX, overlayOpacityTrackRef.current, 0.1, 1, 0.05, 2)
        handleOverlayOpacity(v)
      } else if (sliderId === 'overlayBlur' && overlayBlurTrackRef.current) {
        const v = sliderValueFromEvent(e.clientX, overlayBlurTrackRef.current, 0, 20, 1, 0)
        handleOverlayBlur(Math.round(v))
      } else if (sliderId === 'cardTransparent' && cardTransparentTrackRef.current) {
        const v = sliderValueFromEvent(e.clientX, cardTransparentTrackRef.current, 0.1, 0.9, 0.05, 2)
        handleCardTransparent(v)
      }
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('mousemove', onMove)
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('mousemove', onMove)
    }
  }, [updateHueFromEvent, handleOverlayOpacity, handleOverlayBlur, handleCardTransparent, sliderValueFromEvent])

  const handleHueTrackMouseDown = (e: React.MouseEvent) => {
    hueDraggingRef.current = true
    updateHueFromEvent(e.clientX)
  }

  const handleOverlayOpacityMouseDown = (e: React.MouseEvent) => {
    sliderDraggingRef.current = 'overlayOpacity'
    const v = sliderValueFromEvent(e.clientX, overlayOpacityTrackRef.current!, 0.1, 1, 0.05, 2)
    handleOverlayOpacity(v)
  }

  const handleOverlayBlurMouseDown = (e: React.MouseEvent) => {
    sliderDraggingRef.current = 'overlayBlur'
    const v = sliderValueFromEvent(e.clientX, overlayBlurTrackRef.current!, 0, 20, 1, 0)
    handleOverlayBlur(Math.round(v))
  }

  const handleCardTransparentMouseDown = (e: React.MouseEvent) => {
    sliderDraggingRef.current = 'cardTransparent'
    const v = sliderValueFromEvent(e.clientX, cardTransparentTrackRef.current!, 0.1, 0.9, 0.05, 2)
    handleCardTransparent(v)
  }

  // 动态计算箭头偏移量 — 自适应不同缩放/屏幕宽度
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (!triggerRef.current || !panelRef.current) return
      const tr = triggerRef.current.getBoundingClientRect()
      const pr = panelRef.current.getBoundingClientRect()
      // 箭头宽 12px, 旋转 45°; 计算 right = 面板右 - 按钮中心 - 箭头宽/2
      const offset = pr.right - (tr.left + tr.width / 2) - 6
      panelRef.current.style.setProperty('--arrow-offset', `${offset}px`)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  // ---------- 触发器按钮 ----------
  return (
    <>
      <button
        ref={triggerRef}
        className={`navbar-icon-btn${open ? ' active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="显示设置"
        title="显示设置"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </button>

      {/* 浮动面板 */}
      <div
        ref={panelRef}
        className={`wallpaper-settings-panel${open ? ' open' : ''}`}
        role="dialog"
        aria-label="显示设置"
      >
        {/* 标签栏 */}
        <div className="wallpaper-settings-tabs">
          <button
            className={`wallpaper-settings-tab${activeTab === 'appearance' ? ' active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 0 0-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5 2.5 0 0 1 2.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7z"/>
              <circle cx="6.5" cy="11.5" r="1.5"/>
              <circle cx="9.5" cy="7.5" r="1.5"/>
              <circle cx="14.5" cy="7.5" r="1.5"/>
              <circle cx="17.5" cy="11.5" r="1.5"/>
            </svg>
            <span>外观</span>
          </button>
          <button
            className={`wallpaper-settings-tab${activeTab === 'wallpaper' ? ' active' : ''}`}
            onClick={() => setActiveTab('wallpaper')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z"/>
            </svg>
            <span>壁纸</span>
          </button>
          <button
            className={`wallpaper-settings-tab${activeTab === 'effects' ? ' active' : ''}`}
            onClick={() => setActiveTab('effects')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-5-9c.8 0 1.5-.7 1.5-1.5S7.8 8 7 8s-1.5.7-1.5 1.5S6.2 11 7 11zm3-4c.8 0 1.5-.7 1.5-1.5S10.8 4 10 4s-1.5.7-1.5 1.5S9.2 7 10 7zm4 0c.8 0 1.5-.7 1.5-1.5S14.8 4 14 4s-1.5.7-1.5 1.5S13.2 7 14 7zm3 4c.8 0 1.5-.7 1.5-1.5S17.8 8 17 8s-1.5.7-1.5 1.5S16.2 11 17 11z"/>
            </svg>
            <span>特效</span>
          </button>
        </div>

        {/* 标签内容 */}
        <div className="wallpaper-settings-body">
          {/* ============ 外观标签 ============ */}
          {activeTab === 'appearance' && (
            <div className="wallpaper-settings-section">
              <div className="wallpaper-section-title">
                <span className="wallpaper-section-marker" />
                <span className="wallpaper-section-label">主题色相</span>
                <div className="wallpaper-section-hue-value">{hue}</div>
                <button
                  className="wallpaper-hue-reset-btn"
                  onClick={() => {
                    setHue(
                      parseInt(localStorage.getItem(STORAGE.hueDefault) || '159', 10)
                    )
                  }}
                  style={{ opacity: hue === 159 ? 0.3 : 1, pointerEvents: hue === 159 ? 'none' as const : 'auto' as const }}
                  aria-label="重置"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                </button>
              </div>
              <div className="wallpaper-section-divider" />
              <div
                className="wallpaper-hue-track"
                ref={hueTrackRef}
                onMouseDown={handleHueTrackMouseDown}
              >
                <div
                  className="wallpaper-hue-thumb"
                  style={{ left: `${(hue / 360) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ============ 壁纸标签 ============ */}
          {activeTab === 'wallpaper' && (
            <>
              {/* 壁纸模式 */}
              <div className="wallpaper-settings-section">
                <div className="wallpaper-section-title">
                  <span className="wallpaper-section-marker" />
                  <span className="wallpaper-section-label">壁纸模式</span>
                </div>
                <div className="wallpaper-section-divider" />
                <div className="wallpaper-mode-grid">
                  <button
                    className={`wallpaper-mode-btn${mode === 'banner' ? ' active' : ''}`}
                    onClick={() => switchMode('banner')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="1.5"/>
                      <circle cx="9" cy="11" r="1.5"/>
                      <path d="M21 16l-5-5-9 8"/>
                    </svg>
                    <span>横幅壁纸</span>
                  </button>
                  <button
                    className={`wallpaper-mode-btn${mode === 'fullscreen' ? ' active' : ''}`}
                    onClick={() => switchMode('fullscreen')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="1.5"/>
                      <circle cx="9" cy="9" r="1.5"/>
                      <path d="M21 17l-5-5-9 8"/>
                    </svg>
                    <span>全屏壁纸</span>
                  </button>
                  <button
                    className={`wallpaper-mode-btn${mode === 'overlay' ? ' active' : ''}`}
                    onClick={() => switchMode('overlay')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="1.5" strokeDasharray="3 2"/>
                      <circle cx="9" cy="9" r="1.5"/>
                      <path d="M21 17l-5-5-9 8"/>
                    </svg>
                    <span>全屏透明</span>
                  </button>
                  <button
                    className={`wallpaper-mode-btn${mode === 'none' ? ' active' : ''}`}
                    onClick={() => switchMode('none')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="3" y1="3" x2="21" y2="21"/>
                      <path d="M21 17l-5-5-3 3"/>
                      <path d="M3 17l4-4 3 3"/>
                    </svg>
                    <span>纯色背景</span>
                  </button>
                </div>
              </div>

              {/* 壁纸设置 (横幅/全屏模式) */}
              {(mode === 'banner' || mode === 'fullscreen') && (
                <div className="wallpaper-settings-section">
                  <div className="wallpaper-section-title">
                    <span className="wallpaper-section-marker" />
                    <span className="wallpaper-section-label">壁纸设置</span>
                  </div>
                  <div className="wallpaper-section-divider" />
                  <div className="wallpaper-toggle-list">
                    <button className="wallpaper-toggle-row" onClick={toggleBannerTitle}>
                      <span className="wallpaper-toggle-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7V4h16v3"/>
                          <path d="M9 20h6"/>
                          <path d="M12 4v16"/>
                        </svg>
                      </span>
                      <span className="wallpaper-toggle-label">首页壁纸标题</span>
                      <span className={`wallpaper-switch${bannerTitle ? ' on' : ''}`}>
                        <span className="wallpaper-switch-thumb" />
                      </span>
                    </button>
                    <button className="wallpaper-toggle-row" onClick={toggleBannerCarousel}>
                      <span className="wallpaper-toggle-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="6" width="20" height="12" rx="1.5"/>
                          <line x1="6" y1="6" x2="6" y2="18"/>
                          <line x1="18" y1="6" x2="18" y2="18"/>
                          <line x1="22" y1="2" x2="22" y2="22"/>
                        </svg>
                      </span>
                      <span className="wallpaper-toggle-label">壁纸轮播</span>
                      <span className={`wallpaper-switch${bannerCarousel ? ' on' : ''}`}>
                        <span className="wallpaper-switch-thumb" />
                      </span>
                    </button>
                    <button className="wallpaper-toggle-row" onClick={toggleWaves}>
                      <span className="wallpaper-toggle-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>
                          <path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>
                        </svg>
                      </span>
                      <span className="wallpaper-toggle-label">水波纹动画</span>
                      <span className={`wallpaper-switch${waves ? ' on' : ''}`}>
                        <span className="wallpaper-switch-thumb" />
                      </span>
                    </button>
                    <button className="wallpaper-toggle-row" onClick={toggleGradient}>
                      <span className="wallpaper-toggle-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <defs>
                            <linearGradient id="grad-grad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0" stopColor="currentColor" stopOpacity="0"/>
                              <stop offset="1" stopColor="currentColor"/>
                            </linearGradient>
                          </defs>
                          <rect x="3" y="6" width="18" height="12" rx="1.5" fill="url(#grad-grad)"/>
                        </svg>
                      </span>
                      <span className="wallpaper-toggle-label">渐变过渡</span>
                      <span className={`wallpaper-switch${gradient ? ' on' : ''}`}>
                        <span className="wallpaper-switch-thumb" />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* 全屏透明模式设置 */}
              {mode === 'overlay' && (
                <>
                  <div className="wallpaper-settings-section">
                    <div className="wallpaper-section-title">
                      <span className="wallpaper-section-marker" />
                      <span className="wallpaper-section-label">壁纸透明度</span>
                      <span className="wallpaper-section-value">{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <div className="wallpaper-section-divider" />
                    <div
                      className="wallpaper-hue-track overlay-slider-track"
                      ref={overlayOpacityTrackRef}
                      onMouseDown={handleOverlayOpacityMouseDown}
                      style={{
                        backgroundImage: `linear-gradient(90deg, var(--primary) 0 ${((overlayOpacity - 0.1) / 0.9) * 100}%, hsla(var(--hue), 22%, 28%, 0.18) ${((overlayOpacity - 0.1) / 0.9) * 100}% 100%)`,
                      }}
                    >
                      <div
                        className="wallpaper-hue-thumb"
                        style={{ left: `${((overlayOpacity - 0.1) / 0.9) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="wallpaper-settings-section">
                    <div className="wallpaper-section-title">
                      <span className="wallpaper-section-marker" />
                      <span className="wallpaper-section-label">背景模糊度</span>
                      <span className="wallpaper-section-value">{overlayBlur}px</span>
                    </div>
                    <div className="wallpaper-section-divider" />
                    <div
                      className="wallpaper-hue-track overlay-slider-track"
                      ref={overlayBlurTrackRef}
                      onMouseDown={handleOverlayBlurMouseDown}
                      style={{
                        backgroundImage: `linear-gradient(90deg, var(--primary) 0 ${(overlayBlur / 20) * 100}%, hsla(var(--hue), 22%, 28%, 0.18) ${(overlayBlur / 20) * 100}% 100%)`,
                      }}
                    >
                      <div
                        className="wallpaper-hue-thumb"
                        style={{ left: `${(overlayBlur / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="wallpaper-settings-section">
                    <div className="wallpaper-section-title">
                      <span className="wallpaper-section-marker" />
                      <span className="wallpaper-section-label">卡片透明度</span>
                      <span className="wallpaper-section-value">{Math.round(cardTransparent * 100)}%</span>
                    </div>
                    <div className="wallpaper-section-divider" />
                    <div
                      className="wallpaper-hue-track overlay-slider-track"
                      ref={cardTransparentTrackRef}
                      onMouseDown={handleCardTransparentMouseDown}
                      style={{
                        backgroundImage: `linear-gradient(90deg, var(--primary) 0 ${((cardTransparent - 0.1) / 0.8) * 100}%, hsla(var(--hue), 22%, 28%, 0.18) ${((cardTransparent - 0.1) / 0.8) * 100}% 100%)`,
                      }}
                    >
                      <div
                        className="wallpaper-hue-thumb"
                        style={{ left: `${((cardTransparent - 0.1) / 0.8) * 100}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 纯色模式提示 */}
              {mode === 'none' && (
                <div className="wallpaper-settings-section">
                  <div className="wallpaper-section-title">
                    <span className="wallpaper-section-marker" />
                    <span className="wallpaper-section-label">纯色背景</span>
                  </div>
                  <div className="wallpaper-section-divider" />
                  <p className="wallpaper-hint">已关闭壁纸显示，使用纯色背景。</p>
                </div>
              )}
            </>
          )}

          {/* ============ 特效标签 ============ */}
          {activeTab === 'effects' && (
            <div className="wallpaper-settings-section">
              <div className="wallpaper-section-title">
                <span className="wallpaper-section-marker" />
                <span className="wallpaper-section-label">特效设置</span>
              </div>
              <div className="wallpaper-section-divider" />
              <div className="wallpaper-toggle-list">
                <button className="wallpaper-toggle-row" onClick={toggleSakura}>
                  <span className="wallpaper-toggle-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm-5-9c.8 0 1.5-.7 1.5-1.5S7.8 8 7 8s-1.5.7-1.5 1.5S6.2 11 7 11zm3-4c.8 0 1.5-.7 1.5-1.5S10.8 4 10 4s-1.5.7-1.5 1.5S9.2 7 10 7zm4 0c.8 0 1.5-.7 1.5-1.5S14.8 4 14 4s-1.5.7-1.5 1.5S13.2 7 14 7zm3 4c.8 0 1.5-.7 1.5-1.5S17.8 8 17 8s-1.5.7-1.5 1.5S16.2 11 17 11z"/>
                    </svg>
                  </span>
                  <span className="wallpaper-toggle-label">樱花特效</span>
                  <span className={`wallpaper-switch${sakura ? ' on' : ''}`}>
                    <span className="wallpaper-switch-thumb" />
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
