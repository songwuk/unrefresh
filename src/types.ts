export interface useApi {
  dom?: RefreshTarget
  up?: boolean
  down?: boolean
  refresh?: RefreshHook
}

export type RefreshTarget = Document | HTMLElement

export type RefreshHook = () => void | Promise<void>

export interface RefreshOptions {
  bounce?: boolean
  bounceDuration?: number
  containerClassName?: string
  designLoading?: string
  designloading?: string
  dom?: RefreshTarget
  initialText?: string
  loadingImage?: string
  loadingText?: string
  onError?: (error: unknown) => void
  onRefresh?: RefreshHook
  preventDefault?: boolean
  pullDownLength?: number
  releaseText?: string
  resetDelay?: number
  target?: RefreshTarget
}

export interface UnrefreshAppLike {
  config?: {
    globalProperties?: Record<string, unknown>
  }
  provide?: (key: string | symbol, value: unknown) => void
}

export type opts = RefreshOptions
