import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface BannerTitleContextValue {
  bannerTitle: string
  setBannerTitle: (title: string) => void
}

const BannerTitleContext = createContext<BannerTitleContextValue>({
  bannerTitle: '',
  setBannerTitle: () => {},
})

export const useBannerTitle = () => useContext(BannerTitleContext)

export function BannerTitleProvider({ children }: { children: ReactNode }) {
  const [bannerTitle, setBannerTitle] = useState('')
  const setTitle = useCallback((title: string) => setBannerTitle(title), [])
  return (
    <BannerTitleContext.Provider value={{ bannerTitle, setBannerTitle: setTitle }}>
      {children}
    </BannerTitleContext.Provider>
  )
}
