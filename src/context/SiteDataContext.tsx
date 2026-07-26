import { createContext, useContext } from 'react'
import type { WPCategory, Topic } from '../api/wordpress'

export interface SiteData {
  user: { name: string; description: string; avatar_urls: Record<string, string> } | null
  categories: WPCategory[]
  tags: Array<{ id: number; name: string; slug: string }>
  topics?: Topic[]
}

const SiteDataContext = createContext<SiteData>({
  user: null,
  categories: [],
  tags: [],
  topics: [],
})

export const useSiteData = () => useContext(SiteDataContext)
export default SiteDataContext
