import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface ArticleTocContextValue {
  scanVersion: number
  triggerScan: () => void
}

const ArticleTocContext = createContext<ArticleTocContextValue>({
  scanVersion: 0,
  triggerScan: () => {},
})

export const useArticleToc = () => useContext(ArticleTocContext)

export function ArticleTocProvider({ children }: { children: ReactNode }) {
  const [scanVersion, setScanVersion] = useState(0)
  const triggerScan = useCallback(() => setScanVersion((v) => v + 1), [])
  return (
    <ArticleTocContext.Provider value={{ scanVersion, triggerScan }}>
      {children}
    </ArticleTocContext.Provider>
  )
}
