export interface UseRefreshApi {
  dom?: RefreshTarget
  up?: boolean
  down?: boolean
  refresh?: RefreshHook
}

/**
 * @deprecated Use `UseRefreshApi` instead.
 */
export type useApi = UseRefreshApi

export type RefreshTarget = Document | HTMLElement

export type RefreshAriaLive = 'assertive' | 'off' | 'polite'

export type RefreshAnimationPreset = 'bounce' | 'flip' | 'magnetic' | 'none' | 'orbit' | 'pulse' | 'spin'

export type RefreshAnimationIconPreset
  = | 'arc'
    | 'arrow'
    | 'auto'
    | 'bolt'
    | 'diamond'
    | 'dot'
    | 'loop'
    | 'magnet'
    | 'orbit'
    | 'spark'

export type RefreshAnimationElementKey = 'container' | 'spinner' | 'text' | 'top'

export type RefreshAnimationStyleProperty
  = | 'filter'
    | 'opacity'
    | 'transform'
    | 'transition'
    | 'will-change'

export type RefreshAnimationStyleMap = Partial<Record<RefreshAnimationStyleProperty, number | string>>

export interface RefreshAnimationFrame {
  distance: number
  offset: number
  overflow: number
  overflowProgress: number
  progress: number
  pullDownLength: number
  ready: boolean
  refreshing: boolean
  status: RefreshStatus
}

export interface RefreshAnimationFrameElements {
  container: HTMLDivElement
  spinner: HTMLImageElement
  text: HTMLSpanElement
  top: HTMLDivElement
}

export interface RefreshAnimationFrameResult {
  container?: RefreshAnimationStyleMap
  spinner?: RefreshAnimationStyleMap
  text?: RefreshAnimationStyleMap
  top?: RefreshAnimationStyleMap
  variables?: Record<string, number | string>
}

export interface RefreshAnimationFrameContext {
  elements: RefreshAnimationFrameElements
  frame: RefreshAnimationFrame
  setVariable: (name: string, value: number | string) => void
}

export type RefreshAnimationFrameHandler = (
  context: RefreshAnimationFrameContext
) => RefreshAnimationFrameResult | void

export interface RefreshAnimationKeyframe extends RefreshAnimationFrameResult {
  progress: number
}

export interface RefreshCustomAnimation {
  frames?: readonly RefreshAnimationKeyframe[]
  name?: string
  onFrame?: RefreshAnimationFrameHandler
}

export type RefreshAnimation = RefreshAnimationPreset | RefreshCustomAnimation

export type RefreshHapticPattern = number | number[]

export type RefreshHapticEvent = 'error' | 'ready' | 'refreshing' | 'success'

export type RefreshHaptics = boolean | Partial<Record<RefreshHapticEvent, false | RefreshHapticPattern>>

export type RefreshStatus = 'error' | 'idle' | 'pulling' | 'ready' | 'refreshing' | 'success'

export interface RefreshState {
  distance: number
  offset: number
  progress: number
  ready: boolean
  refreshing: boolean
  status: RefreshStatus
}

export type RefreshStateChangeHook = (state: RefreshState) => void

export interface RefreshEventMap {
  destroy: RefreshState
  refreshcancel: RefreshState
  refreshcomplete: RefreshState
  refresherror: {
    error: unknown
    state: RefreshState
  }
  refreshstart: RefreshState
  statechange: RefreshState
}

export type RefreshEventName = keyof RefreshEventMap

export type RefreshEventListener<EventName extends RefreshEventName = RefreshEventName> = (
  payload: RefreshEventMap[EventName],
) => void

export interface RefreshController {
  cancel: () => RefreshController
  destroy: () => RefreshController
  disable: () => RefreshController
  enable: () => RefreshController
  getState: () => RefreshState
  off: <EventName extends RefreshEventName>(
    eventName: EventName,
    listener: RefreshEventListener<EventName>,
  ) => RefreshController
  on: <EventName extends RefreshEventName>(
    eventName: EventName,
    listener: RefreshEventListener<EventName>,
  ) => RefreshController
  refresh: () => Promise<void>
  setOptions: (options?: RefreshOptions) => RefreshController
  subscribe: (listener: RefreshStateChangeHook) => () => void
}

export interface RefreshContext {
  instance: RefreshController
  signal: AbortSignal
  state: RefreshState
}

export type RefreshHook = (context: RefreshContext) => void | Promise<void>

export interface RefreshOptions {
  animation?: RefreshAnimation
  animationDuration?: number
  animationIcon?: RefreshAnimationIconPreset
  ariaLive?: RefreshAriaLive
  bounce?: boolean
  bounceDuration?: number
  completeDuration?: number
  containerClassName?: string
  designLoading?: string
  designloading?: string
  disabled?: boolean
  dom?: RefreshTarget
  errorText?: string
  haptics?: RefreshHaptics
  initialText?: string
  loadingImage?: string
  loadingText?: string
  minLoadingDuration?: number
  mouse?: boolean
  onError?: (error: unknown) => void
  onRefresh?: RefreshHook
  onStateChange?: RefreshStateChangeHook
  preventDefault?: boolean
  pullDownLength?: number
  releaseText?: string
  resetDelay?: number
  successText?: string
  target?: RefreshTarget
}

export type RefreshResourceStatus = 'error' | 'idle' | 'loading' | 'success'

export type RefreshResourceRetryDelay = number | ((attempt: number, error: unknown) => number)

export interface RefreshResourceCacheStorage {
  getItem: (key: string) => null | string
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

export interface RefreshResourceCacheOptions {
  key: string
  storage?: RefreshResourceCacheStorage
  ttl?: number
}

export type RefreshResourceCache = string | RefreshResourceCacheOptions

export type RefreshSkeletonWhen = 'empty' | 'loading'

export type RefreshSkeletonAnimation = 'none' | 'pulse' | 'shimmer' | 'wave'

export type RefreshSkeletonVariant = string

export interface RefreshSkeletonOptions {
  animation?: RefreshSkeletonAnimation
  count?: number
  enabled?: boolean
  variant?: RefreshSkeletonVariant
  when?: RefreshSkeletonWhen
}

export type RefreshSkeleton = boolean | number | RefreshSkeletonOptions

export interface RefreshResourceReloadOptions {
  force?: boolean
}

export interface RefreshResourceState<TData = unknown> {
  data?: TData
  error?: unknown
  failureCount: number
  isCached: boolean
  isLoading: boolean
  isStale: boolean
  cacheKey?: string
  refresh: RefreshState
  showSkeleton: boolean
  skeletonAnimation: RefreshSkeletonAnimation
  skeletonCount: number
  skeletonVariant: RefreshSkeletonVariant
  status: RefreshResourceStatus
  updatedAt?: number
}

export type RefreshResourceListener<TData = unknown> = (state: RefreshResourceState<TData>) => void

export type RefreshResourceLoader<TData = unknown> = (context: RefreshContext) => TData | Promise<TData>

export interface RefreshResourceOptions<TData = unknown> extends Omit<RefreshOptions, 'onRefresh' | 'onStateChange'> {
  auto?: boolean
  cache?: RefreshResourceCache
  keepPreviousData?: boolean
  initialData?: TData
  load: RefreshResourceLoader<TData>
  onChange?: RefreshResourceListener<TData>
  onLoadError?: (error: unknown, context: RefreshContext) => void
  onLoadSuccess?: (data: TData, context: RefreshContext) => void
  onRefreshStateChange?: RefreshStateChangeHook
  retry?: boolean | number
  retryDelay?: RefreshResourceRetryDelay
  skeleton?: RefreshSkeleton
  staleTime?: number
}

export type RefreshResourceUpdateOptions<TData = unknown> = Partial<Omit<
  RefreshResourceOptions<TData>,
  | 'auto'
  | 'cache'
  | 'initialData'
  | 'load'
  | 'onChange'
  | 'onLoadError'
  | 'onLoadSuccess'
  | 'onRefreshStateChange'
>>

export interface RefreshResource<TData = unknown> {
  cancel: () => RefreshResource<TData>
  clearCache: () => RefreshResource<TData>
  controller: RefreshController
  destroy: () => void
  getState: () => RefreshResourceState<TData>
  markStale: () => RefreshResource<TData>
  reload: (options?: RefreshResourceReloadOptions) => Promise<void>
  setData: (data: TData) => RefreshResource<TData>
  setOptions: (options?: RefreshResourceUpdateOptions<TData>) => RefreshResource<TData>
  subscribe: (listener: RefreshResourceListener<TData>) => () => void
}

export interface UnrefreshAppLike {
  config?: {
    globalProperties?: Record<string, unknown>
  }
  provide?: (key: string | symbol, value: unknown) => void
}

/**
 * @deprecated Use `RefreshOptions` instead.
 */
export type opts = RefreshOptions
