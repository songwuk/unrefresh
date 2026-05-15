import Refresh from './index'
import type {
  RefreshContext,
  RefreshResource,
  RefreshResourceListener,
  RefreshResourceOptions,
  RefreshResourceReloadOptions,
  RefreshResourceState,
  RefreshState,
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

interface ResolvedSkeletonOptions {
  count: number
  enabled: boolean
  variant: string
  when: 'empty' | 'loading'
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
      count: 0,
      enabled: false,
      variant: 'default',
      when: 'empty',
    }
  }

  if (typeof skeleton === 'number') {
    return {
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
    count,
    enabled: options.enabled !== false && count > 0,
    variant: options.variant || 'default',
    when: options.when || 'empty',
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

export function createRefreshResource<TData = unknown>(
  options: RefreshResourceOptions<TData>,
): RefreshResource<TData> {
  const {
    auto,
    initialData,
    keepPreviousData = true,
    load,
    onChange,
    onLoadError,
    onLoadSuccess,
    onRefreshStateChange,
    retry,
    retryDelay,
    skeleton,
    staleTime,
    ...refreshOptions
  } = options

  const listeners = new Set<RefreshResourceListener<TData>>()
  const controllerRef: { current?: Refresh } = {}
  const skeletonOptions = resolveSkeletonOptions(skeleton)
  let state: RefreshResourceState<TData> = {
    data: initialData,
    isLoading: false,
    failureCount: 0,
    isStale: false,
    refresh: IDLE_REFRESH_STATE,
    showSkeleton: false,
    skeletonCount: skeletonOptions.count,
    skeletonVariant: skeletonOptions.variant,
    status: initialData === undefined ? 'idle' : 'success',
    updatedAt: initialData === undefined ? undefined : Date.now(),
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

        onLoadSuccess?.(data, context)
        emit({
          data,
          error: undefined,
          failureCount: 0,
          isLoading: false,
          isStale: false,
          refresh: getRefreshState(),
          status: 'success',
          updatedAt: Date.now(),
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
    ...refreshOptions,
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
      emit({
        data,
        error: undefined,
        failureCount: 0,
        isLoading: false,
        isStale: false,
        status: 'success',
        updatedAt: Date.now(),
      })
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
  RefreshResource,
  RefreshResourceListener,
  RefreshResourceLoader,
  RefreshResourceOptions,
  RefreshResourceReloadOptions,
  RefreshResourceRetryDelay,
  RefreshResourceState,
  RefreshResourceStatus,
  RefreshSkeleton,
  RefreshSkeletonOptions,
  RefreshSkeletonVariant,
  RefreshSkeletonWhen,
} from './types'
