export interface useApi {
  dom?: RefreshTarget
  up?: boolean
  down?: boolean
  refresh?: RefreshHook
}

export type RefreshTarget = Document | HTMLElement

export type RefreshAriaLive = 'assertive' | 'off' | 'polite'

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

export type RefreshSkeletonWhen = 'empty' | 'loading'

export type RefreshSkeletonVariant = string

export interface RefreshSkeletonOptions {
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
  isLoading: boolean
  isStale: boolean
  refresh: RefreshState
  showSkeleton: boolean
  skeletonCount: number
  skeletonVariant: RefreshSkeletonVariant
  status: RefreshResourceStatus
  updatedAt?: number
}

export type RefreshResourceListener<TData = unknown> = (state: RefreshResourceState<TData>) => void

export type RefreshResourceLoader<TData = unknown> = (context: RefreshContext) => TData | Promise<TData>

export interface RefreshResourceOptions<TData = unknown> extends Omit<RefreshOptions, 'onRefresh' | 'onStateChange'> {
  auto?: boolean
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

export interface RefreshResource<TData = unknown> {
  cancel: () => RefreshResource<TData>
  controller: RefreshController
  destroy: () => void
  getState: () => RefreshResourceState<TData>
  markStale: () => RefreshResource<TData>
  reload: (options?: RefreshResourceReloadOptions) => Promise<void>
  setData: (data: TData) => RefreshResource<TData>
  subscribe: (listener: RefreshResourceListener<TData>) => () => void
}

export interface UnrefreshAppLike {
  config?: {
    globalProperties?: Record<string, unknown>
  }
  provide?: (key: string | symbol, value: unknown) => void
}

export type opts = RefreshOptions
