import type { DependencyList, MutableRefObject, RefObject } from 'react'
import type { RefreshOptions, RefreshTarget } from './types'
import { useEffect, useRef } from 'react'
import Refresh from './index'

export type ReactRefObject<T> = RefObject<T | null>

export type ReactMutableRefObject<T> = MutableRefObject<T>

export type ReactDependencyList = DependencyList
export type ReactRefreshTarget
  = | RefreshTarget
    | ReactMutableRefObject<RefreshTarget | null>
    | ReactRefObject<RefreshTarget>
    | (() => RefreshTarget | null | undefined)

export interface UseUnrefreshConfig {
  deps?: ReactDependencyList
  options?: RefreshOptions
  target: ReactRefreshTarget
}

export function resolveReactRefreshTarget(target: ReactRefreshTarget): RefreshTarget | undefined {
  if (typeof target === 'function')
    return target() || undefined

  if ('current' in target)
    return target.current || undefined

  return target
}

export function useUnrefresh(
  target: ReactRefreshTarget,
  options: RefreshOptions = {},
  deps: ReactDependencyList = [],
): ReactMutableRefObject<Refresh | null> {
  const refreshRef = useRef<Refresh | null>(null)

  useEffect(() => {
    const resolvedTarget = resolveReactRefreshTarget(target)

    if (!resolvedTarget)
      return undefined

    const refresh = new Refresh({
      ...options,
      target: resolvedTarget,
    }).init()

    refreshRef.current = refresh

    return () => {
      refresh.destroy()

      if (refreshRef.current === refresh)
        refreshRef.current = null
    }
  }, deps)

  return refreshRef
}

export function useUnrefreshController(config: UseUnrefreshConfig) {
  return useUnrefresh(config.target, config.options, config.deps)
}

export const useRefresh = useUnrefresh
export const useRefreshController = useUnrefreshController

export default useUnrefresh
export type { Refresh } from './index'
export type {
  RefreshEventListener,
  RefreshEventMap,
  RefreshEventName,
  RefreshAriaLive,
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
  RefreshContext,
  RefreshController,
  RefreshHapticEvent,
  RefreshHapticPattern,
  RefreshHaptics,
  RefreshOptions,
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
  RefreshState,
  RefreshStateChangeHook,
  RefreshStatus,
  RefreshTarget,
  UseRefreshApi,
} from './types'
