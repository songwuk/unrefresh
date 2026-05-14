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
) {
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

export const useRefresh = useUnrefresh

export default useUnrefresh
export type { Refresh, RefreshOptions, RefreshTarget }
