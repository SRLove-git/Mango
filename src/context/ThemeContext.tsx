import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const THEME_KEY = 'mango-theme-mode'

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
})

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  const body = document.body
  // 移除所有主题类
  body.classList.remove('light-theme', 'dark-theme')

  if (mode === 'system') {
    body.classList.add(getSystemTheme() === 'dark' ? 'dark-theme' : 'light-theme')
  } else {
    body.classList.add(mode === 'dark' ? 'dark-theme' : 'light-theme')
  }
}

function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // localStorage 不可用时忽略
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode)

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    try {
      localStorage.setItem(THEME_KEY, newMode)
    } catch {
      // 忽略
    }
    applyTheme(newMode)
  }, [])

  // 初始化时应用主题
  useEffect(() => {
    applyTheme(mode)
  }, [mode])

  // 监听系统主题变化（仅在 mode === 'system' 时生效）
  useEffect(() => {
    if (mode !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
