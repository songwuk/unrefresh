import Refresh from './index'
import type {
  RefreshContext,
  RefreshOptions,
  RefreshResource,
  RefreshResourceCacheStorage,
  RefreshResourceListener,
  RefreshResourceOptions,
  RefreshResourceReloadOptions,
  RefreshResourceState,
  RefreshResourceUpdateOptions,
  RefreshState,
  RefreshSkeletonAnimation,
  RefreshSkeletonOptions,
} from './types'

const IDLE_REFRESH_STATE: RefreshState = {
  distance: 0,
  offset: -84,
  progress: 0,
  ready: false,
  refreshing: false,
  status: 'idle',
}

const DEFAULT_SKELETON_COUNT = 6

interface CachedResourceValue<TData> {
  data: TData
  updatedAt: number
}

interface ResolvedSkeletonOptions {
  animation: RefreshSkeletonAnimation
  count: number
  enabled: boolean
  variant: string
  when: 'empty' | 'loading'
}

interface ResolvedCacheOptions {
  key: string
  storage?: RefreshResourceCacheStorage
  ttl?: number
}

function cloneResourceState<TData>(state: RefreshResourceState<TData>): RefreshResourceState<TData> {
  return {
    ...state,
    refresh: {
      ...state.refresh,
    },
  }
}

function resolveSkeletonOptions(skeleton: RefreshResourceOptions['skeleton']): ResolvedSkeletonOptions {
  if (skeleton === false) {
    return {
      animation: 'none',
      count: 0,
      enabled: false,
      variant: 'default',
      when: 'empty',
    }
  }

  if (typeof skeleton === 'number') {
    return {
      animation: 'shimmer',
      count: Math.max(0, Math.floor(skeleton)),
      enabled: skeleton > 0,
      variant: 'default',
      when: 'empty',
    }
  }

  const options: RefreshSkeletonOptions = typeof skeleton === 'object' && skeleton
    ? skeleton
    : {}
  const count = options.count === undefined
    ? DEFAULT_SKELETON_COUNT
    : Math.max(0, Math.floor(options.count))

  return {
    animation: options.animation || 'shimmer',
    count,
    enabled: options.enabled !== false && count > 0,
    variant: options.variant || 'default',
    when: options.when || 'empty',
  }
}

function getDefaultCacheStorage(): RefreshResourceCacheStorage | undefined {
  try {
    if (typeof localStorage !== 'undefined')
      return localStorage
  }
  catch {
    return undefined
  }

  return undefined
}

function resolveCacheOptions(cache: RefreshResourceOptions['cache']): ResolvedCacheOptions | undefined {
  if (!cache)
    return undefined

  if (typeof cache === 'string') {
    return {
      key: cache,
      storage: getDefaultCacheStorage(),
    }
  }

  return {
    key: cache.key,
    storage: cache.storage || getDefaultCacheStorage(),
    ttl: cache.ttl,
  }
}

function readCache<TData>(cache: ResolvedCacheOptions | undefined): CachedResourceValue<TData> | undefined {
  if (!cache?.storage)
    return undefined

  try {
    const raw = cache.storage.getItem(cache.key)

    if (!raw)
      return undefined

    const value = JSON.parse(raw) as CachedResourceValue<TData>

    if (typeof value.updatedAt !== 'number' || !('data' in value))
      return undefined

    if (typeof cache.ttl === 'number' && Date.now() - value.updatedAt > Math.max(0, cache.ttl)) {
      cache.storage.removeItem(cache.key)
      return undefined
    }

    return value
  }
  catch {
    return undefined
  }
}

function writeCache<TData>(cache: ResolvedCacheOptions | undefined, data: TData, updatedAt: number) {
  if (!cache?.storage)
    return

  try {
    cache.storage.setItem(cache.key, JSON.stringify({
      data,
      updatedAt,
    }))
  }
  catch {
    // Storage quota and private-mode errors should not break refresh flows.
  }
}

function removeCache(cache: ResolvedCacheOptions | undefined) {
  if (!cache?.storage)
    return

  try {
    cache.storage.removeItem(cache.key)
  }
  catch {
    // Ignore storage failures for compatibility with restricted environments.
  }
}

function getRetryCount(retry: boolean | number | undefined) {
  if (retry === true)
    return 2

  if (typeof retry === 'number')
    return Math.max(0, Math.floor(retry))

  return 0
}

function getRetryDelay(
  retryDelay: RefreshResourceOptions['retryDelay'],
  attempt: number,
  error: unknown,
) {
  if (typeof retryDelay === 'function')
    return Math.max(0, retryDelay(attempt, error))

  if (typeof retryDelay === 'number')
    return Math.max(0, retryDelay)

  return Math.min(500 * 2 ** Math.max(attempt - 1, 0), 4000)
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (ms <= 0 || signal.aborted) {
      resolve()
      return
    }

    const timer = setTimeout(complete, ms)

    function complete() {
      clearTimeout(timer)
      signal.removeEventListener('abort', complete)
      resolve()
    }

    signal.addEventListener('abort', complete, { once: true })
  })
}

function schedule(task: () => void) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(task)
    return
  }

  setTimeout(task)
}

function getRefreshOptions<TData>(
  options: RefreshResourceOptions<TData> | RefreshResourceUpdateOptions<TData>,
): RefreshOptions {
  const {
    auto: _auto,
    cache: _cache,
    initialData: _initialData,
    keepPreviousData: _keepPreviousData,
    load: _load,
    onChange: _onChange,
    onLoadError: _onLoadError,
    onLoadSuccess: _onLoadSuccess,
    onRefreshStateChange: _onRefreshStateChange,
    retry: _retry,
    retryDelay: _retryDelay,
    skeleton: _skeleton,
    staleTime: _staleTime,
    ...refreshOptions
  } = options as RefreshResourceOptions<TData>

  return refreshOptions
}

export function createRefreshResource<TData = unknown>(
  options: RefreshResourceOptions<TData>,
): RefreshResource<TData> {
  const {
    auto,
    cache,
    initialData,
    load,
    onChange,
    onLoadError,
    onLoadSuccess,
    onRefreshStateChange,
  } = options

  const listeners = new Set<RefreshResourceListener<TData>>()
  const controllerRef: { current?: Refresh } = {}
  const cacheOptions = resolveCacheOptions(cache)
  const cachedValue = readCache<TData>(cacheOptions)
  const initialDataSource = initialData === undefined
    ? cachedValue?.data
    : initialData
  const initialUpdatedAt = initialData === undefined
    ? cachedValue?.updatedAt
    : Date.now()
  let keepPreviousData = options.keepPreviousData ?? true
  let retry = options.retry
  let retryDelay = options.retryDelay
  let skeletonOptions = resolveSkeletonOptions(options.skeleton)
  let staleTime = options.staleTime
  let state: RefreshResourceState<TData> = {
    cacheKey: cacheOptions?.key,
    data: initialDataSource,
    isLoading: false,
    failureCount: 0,
    isCached: initialData === undefined && cachedValue !== undefined,
    isStale: false,
    refresh: IDLE_REFRESH_STATE,
    showSkeleton: false,
    skeletonAnimation: skeletonOptions.animation,
    skeletonCount: skeletonOptions.count,
    skeletonVariant: skeletonOptions.variant,
    status: initialDataSource === undefined ? 'idle' : 'success',
    updatedAt: initialUpdatedAt,
  }

  function isStale(nextState: RefreshResourceState<TData>) {
    if (nextState.status === 'idle' || nextState.data === undefined || !nextState.updatedAt)
      return false

    if (typeof staleTime !== 'number')
      return false

    if (staleTime === Infinity)
      return false

    return Date.now() - nextState.updatedAt >= Math.max(0, staleTime)
  }

  function getRefreshState() {
    return controllerRef.current?.getState() || state.refresh
  }

  function shouldShowSkeleton(nextState: RefreshResourceState<TData>) {
    if (!skeletonOptions.enabled || !nextState.isLoading)
      return false

    if (skeletonOptions.when === 'loading')
      return true

    return nextState.data === undefined
  }

  function getSnapshot() {
    const snapshot = {
      ...state,
      refresh: getRefreshState(),
      skeletonAnimation: skeletonOptions.animation,
      skeletonCount: skeletonOptions.count,
      skeletonVariant: skeletonOptions.variant,
    }

    return cloneResourceState({
      ...snapshot,
      isStale: snapshot.isStale || isStale(snapshot),
      showSkeleton: shouldShowSkeleton(snapshot),
    })
  }

  function canUseFreshData() {
    if (typeof staleTime !== 'number')
      return false

    const snapshot = getSnapshot()

    return snapshot.status === 'success' && !snapshot.isStale
  }

  function emit(nextState: Partial<RefreshResourceState<TData>>) {
    const merged = {
      ...state,
      ...nextState,
      refresh: nextState.refresh || getRefreshState(),
    }
    state = {
      ...merged,
      isStale: nextState.isStale ?? isStale(merged),
      showSkeleton: shouldShowSkeleton(merged),
      skeletonAnimation: skeletonOptions.animation,
      skeletonCount: skeletonOptions.count,
      skeletonVariant: skeletonOptions.variant,
    }

    const snapshot = cloneResourceState(state)
    onChange?.(snapshot)
    listeners.forEach(listener => listener(snapshot))
  }

  async function runLoad(context: RefreshContext) {
    emit({
      data: keepPreviousData ? state.data : undefined,
      error: undefined,
      failureCount: 0,
      isCached: keepPreviousData ? state.isCached : false,
      isLoading: true,
      isStale: false,
      refresh: context.state,
      status: 'loading',
    })

    const maxRetryCount = getRetryCount(retry)
    let attempt = 0

    while (!context.signal.aborted) {
      try {
        const data = await load(context)

        if (context.signal.aborted) {
          emit({
            isLoading: false,
            refresh: getRefreshState(),
            status: state.data === undefined ? 'idle' : 'success',
          })
          return
        }

        const updatedAt = Date.now()
        writeCache(cacheOptions, data, updatedAt)
        onLoadSuccess?.(data, context)
        emit({
          data,
          error: undefined,
          failureCount: 0,
          isCached: false,
          isLoading: false,
          isStale: false,
          refresh: getRefreshState(),
          status: 'success',
          updatedAt,
        })
        return
      }
      catch (error) {
        attempt += 1

        if (context.signal.aborted) {
          emit({
            isLoading: false,
            refresh: getRefreshState(),
            status: state.data === undefined ? 'idle' : 'success',
          })
          throw error
        }

        emit({
          error,
          failureCount: attempt,
          refresh: getRefreshState(),
        })

        if (attempt <= maxRetryCount) {
          await wait(getRetryDelay(retryDelay, attempt, error), context.signal)
          continue
        }

        onLoadError?.(error, context)
        emit({
          error,
          failureCount: attempt,
          isLoading: false,
          refresh: getRefreshState(),
          status: 'error',
        })
        throw error
      }
    }
  }

  const controller = new Refresh({
    ...getRefreshOptions(options),
    onRefresh: runLoad,
    onStateChange(refreshState) {
      onRefreshStateChange?.(refreshState)
      emit({ refresh: refreshState })
    },
  }).init()
  controllerRef.current = controller

  state = {
    ...state,
    refresh: controller.getState(),
  }

  const resource: RefreshResource<TData> = {
    cancel() {
      controller.cancel()
      return resource
    },
    clearCache() {
      removeCache(cacheOptions)
      emit({
        cacheKey: cacheOptions?.key,
        isCached: false,
      })
      return resource
    },
    controller,
    destroy() {
      controller.destroy()
      listeners.clear()
    },
    getState() {
      return getSnapshot()
    },
    markStale() {
      emit({ isStale: true })
      return resource
    },
    reload(options: RefreshResourceReloadOptions = {}) {
      if (!options.force && canUseFreshData())
        return Promise.resolve()

      return controller.refresh()
    },
    setData(data) {
      const updatedAt = Date.now()
      writeCache(cacheOptions, data, updatedAt)
      emit({
        data,
        error: undefined,
        failureCount: 0,
        isCached: false,
        isLoading: false,
        isStale: false,
        status: 'success',
        updatedAt,
      })
      return resource
    },
    setOptions(nextOptions = {}) {
      if ('keepPreviousData' in nextOptions)
        keepPreviousData = nextOptions.keepPreviousData ?? true

      if ('retry' in nextOptions)
        retry = nextOptions.retry

      if ('retryDelay' in nextOptions)
        retryDelay = nextOptions.retryDelay

      if ('skeleton' in nextOptions)
        skeletonOptions = resolveSkeletonOptions(nextOptions.skeleton)

      if ('staleTime' in nextOptions)
        staleTime = nextOptions.staleTime

      controller.setOptions(getRefreshOptions(nextOptions))
      emit({})

      return resource
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(getSnapshot())

      return () => {
        listeners.delete(listener)
      }
    },
  }

  if (auto) {
    schedule(() => {
      resource.reload({ force: true }).catch(() => undefined)
    })
  }

  return resource
}

export type {
  RefreshAnimation,
  RefreshAnimationElementKey,
  RefreshAnimationFrame,
  RefreshAnimationFrameContext,
  RefreshAnimationFrameElements,
  RefreshAnimationFrameHandler,
  RefreshAnimationFrameResult,
  RefreshAnimationIconPreset,
  RefreshAnimationKeyframe,
  RefreshAnimationPreset,
  RefreshAnimationStyleMap,
  RefreshAnimationStyleProperty,
  RefreshCustomAnimation,
  RefreshResource,
  RefreshResourceCache,
  RefreshResourceCacheOptions,
  RefreshResourceCacheStorage,
  RefreshResourceListener,
  RefreshResourceLoader,
  RefreshResourceOptions,
  RefreshResourceReloadOptions,
  RefreshResourceRetryDelay,
  RefreshResourceState,
  RefreshResourceStatus,
  RefreshResourceUpdateOptions,
  RefreshSkeleton,
  RefreshSkeletonAnimation,
  RefreshSkeletonOptions,
  RefreshSkeletonVariant,
  RefreshSkeletonWhen,
} from './types'
