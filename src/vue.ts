import type { Refresh } from './index'
import type { RefreshOptions, UnrefreshAppLike } from './types'
import { install as installRefresh, UNREFRESH_KEY } from './index'

export interface UnrefreshVuePluginAdapter {
  readonly install: (app: UnrefreshAppLike, options?: RefreshOptions) => Refresh
}

export interface UnrefreshVueGlobalProperties {
  $unrefresh: Refresh
}

export type UnrefreshVuePluginOptions = RefreshOptions

export const UNREFRESH_VUE_KEY = UNREFRESH_KEY

export function createUnrefreshVuePlugin(defaultOptions: UnrefreshVuePluginOptions = {}): UnrefreshVuePluginAdapter {
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
  UseRefreshApi,
} from './types'
