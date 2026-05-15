import type { Refresh } from './index'
import type { RefreshOptions, UnrefreshAppLike } from './types'
import { install as installRefresh } from './index'

export interface UnrefreshVuePluginAdapter {
  install: (app: UnrefreshAppLike, options?: RefreshOptions) => Refresh
}

export function createUnrefreshVuePlugin(defaultOptions: RefreshOptions = {}): UnrefreshVuePluginAdapter {
  return {
    install(app, options = {}) {
      return installRefresh(app, {
        ...defaultOptions,
        ...options,
      })
    },
  }
}

export const UnrefreshVuePlugin = createUnrefreshVuePlugin()

export default UnrefreshVuePlugin
export type {
  RefreshEventListener,
  RefreshEventMap,
  RefreshEventName,
  RefreshAriaLive,
  RefreshContext,
  RefreshController,
  RefreshHapticEvent,
  RefreshHapticPattern,
  RefreshHaptics,
  RefreshOptions,
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
  RefreshState,
  RefreshStateChangeHook,
  RefreshStatus,
} from './types'
