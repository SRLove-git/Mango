const DEFAULT_API = 'https://uapis.cn/api/v1/random/image'

function getApiBase(): string {
  const custom = (window as any).MANGO_DATA?.randomImageApi
  return custom || DEFAULT_API
}

/** 判断是否启用随机图片兜底（优先级：body class > localStorage > 默认 true） */
export function useRandomImageFallback(): boolean {
  // 1. body class（由 WordPress PHP 输出，生产环境生效）
  if (document.body.classList.contains('no-random-image-fallback')) {
    return false
  }
  // 2. localStorage（用于 Vite 开发环境手动测试）
  const stored = localStorage.getItem('mango_use_random_image')
  if (stored !== null) {
    return stored === 'true'
  }
  // 3. 默认开启
  return true
}

interface RandomImageParams {
  category?: string
  type?: string
}

export function getRandomImageUrl(seed?: string | number, params: RandomImageParams = {}): string {
  const url = new URL(getApiBase())
  if (seed != null) url.searchParams.set('_t', String(seed))
  if (params.category) url.searchParams.set('category', params.category)
  if (params.type) url.searchParams.set('type', params.type)
  return url.toString()
}
