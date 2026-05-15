import { describe, expect, it, vi } from 'vitest'
import Refresh, { createRefresh, createRefreshResource, install, UNREFRESH_KEY, UnrefreshPlugin } from '../src'
import type { RefreshContext, RefreshResourceState } from '../src'
import * as vanilla from '../src/vanilla'
import UnrefreshVuePlugin, { createUnrefreshVuePlugin } from '../src/vue'

describe('should', () => {
  it('exports constructor and plugin helpers', () => {
    expect(typeof Refresh).toBe('function')
    expect(typeof Refresh.install).toBe('function')
    expect(typeof install).toBe('function')
    expect(typeof createRefresh).toBe('function')
    expect(UnrefreshPlugin.install).toBe(install)
  })

  it('exports vanilla and vue adapters', () => {
    expect(vanilla.Refresh).toBe(Refresh)
    expect(vanilla.createRefresh).toBe(createRefresh)
    expect(typeof UnrefreshVuePlugin.install).toBe('function')
    expect(typeof createUnrefreshVuePlugin().install).toBe('function')
  })

  it('can create plugin instances without a browser document', () => {
    expect(createRefresh({ pullDownLength: 120 })).toBeInstanceOf(Refresh)
    expect(install({ pullDownLength: 100 })).toBeInstanceOf(Refresh)
  })

  it('supports runtime controls without a browser document', () => {
    const instance = new Refresh()

    expect(instance.getState().status).toBe('idle')
    expect(instance.disable()).toBe(instance)
    expect(instance.enable()).toBe(instance)
    expect(instance.cancel()).toBe(instance)
    expect(instance.setOptions({ pullDownLength: 120 })).toBe(instance)
  })

  it('emits refresh lifecycle events', async () => {
    const states: string[] = []
    const onComplete = vi.fn()
    const instance = new Refresh({
      onRefresh: vi.fn().mockResolvedValue(undefined),
    })

    const unsubscribe = instance.subscribe(state => states.push(state.status))
    instance.on('refreshcomplete', onComplete)

    await instance.refresh()

    expect(states).toContain('refreshing')
    expect(states).toContain('success')
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
    }))

    unsubscribe()
    instance.off('refreshcomplete', onComplete)
  })

  it('waits for async refresh handlers', async () => {
    let context: RefreshContext | undefined
    let refreshed = false
    const instance = new Refresh({
      async onRefresh(refreshContext) {
        context = refreshContext
        await Promise.resolve()
        refreshed = true
      },
    })

    await instance.refresh()

    expect(context?.instance).toBe(instance)
    expect(context?.signal).toBeInstanceOf(AbortSignal)
    expect(context?.state.status).toBe('refreshing')
    expect(refreshed).toBe(true)
  })

  it('creates refresh resources for real data lifecycles', async () => {
    const changes: RefreshResourceState<string[]>[] = []
    const resource = createRefreshResource<string[]>({
      initialData: ['cached'],
      async load({ signal }) {
        expect(signal).toBeInstanceOf(AbortSignal)
        await Promise.resolve()
        return ['fresh']
      },
      onChange(state) {
        changes.push(state)
      },
    })

    expect(resource.getState().data).toEqual(['cached'])
    expect(resource.getState().status).toBe('success')

    await resource.reload()

    expect(resource.getState().data).toEqual(['fresh'])
    expect(resource.getState().status).toBe('success')
    expect(changes.map(state => state.status)).toContain('loading')
    expect(changes.map(state => state.status)).toContain('success')

    resource.destroy()
  })

  it('can auto load refresh resources', async () => {
    const load = vi.fn().mockResolvedValue(['auto'])
    const resource = createRefreshResource<string[]>({
      auto: true,
      load,
    })

    await Promise.resolve()
    await Promise.resolve()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(load).toHaveBeenCalledTimes(1)
    expect(resource.getState().data).toEqual(['auto'])

    resource.destroy()
  })

  it('exposes skeleton state for empty resource loading', async () => {
    let resolveLoad: ((value: string[]) => void) | undefined
    const resource = createRefreshResource<string[]>({
      load() {
        return new Promise<string[]>((resolve) => {
          resolveLoad = resolve
        })
      },
      skeleton: 4,
    })

    const reload = resource.reload()
    await Promise.resolve()

    expect(resource.getState().showSkeleton).toBe(true)
    expect(resource.getState().skeletonCount).toBe(4)
    expect(resource.getState().skeletonVariant).toBe('default')

    resolveLoad?.(['fresh'])
    await reload

    expect(resource.getState().showSkeleton).toBe(false)

    resource.destroy()
  })

  it('can disable skeleton state', async () => {
    let resolveLoad: ((value: string[]) => void) | undefined
    const resource = createRefreshResource<string[]>({
      load() {
        return new Promise<string[]>((resolve) => {
          resolveLoad = resolve
        })
      },
      skeleton: false,
    })

    const reload = resource.reload()
    await Promise.resolve()

    expect(resource.getState().showSkeleton).toBe(false)
    expect(resource.getState().skeletonCount).toBe(0)

    resolveLoad?.(['fresh'])
    await reload

    resource.destroy()
  })

  it('can show skeletons during reloads with existing data', async () => {
    let resolveLoad: ((value: string[]) => void) | undefined
    const resource = createRefreshResource<string[]>({
      initialData: ['cached'],
      load() {
        return new Promise<string[]>((resolve) => {
          resolveLoad = resolve
        })
      },
      skeleton: {
        count: 3,
        variant: 'feed-card',
        when: 'loading',
      },
    })

    const reload = resource.reload()
    await Promise.resolve()

    expect(resource.getState().data).toEqual(['cached'])
    expect(resource.getState().showSkeleton).toBe(true)
    expect(resource.getState().skeletonCount).toBe(3)
    expect(resource.getState().skeletonVariant).toBe('feed-card')

    resolveLoad?.(['fresh'])
    await reload

    expect(resource.getState().showSkeleton).toBe(false)

    resource.destroy()
  })

  it('retries failed refresh resource loaders', async () => {
    const onLoadSuccess = vi.fn()
    let attempts = 0
    const resource = createRefreshResource<string>({
      async load() {
        attempts += 1

        if (attempts < 3)
          throw new Error('Transient failure')

        return 'fresh'
      },
      onLoadSuccess,
      retry: 2,
      retryDelay: 0,
    })

    await resource.reload()

    expect(attempts).toBe(3)
    expect(resource.getState().data).toBe('fresh')
    expect(resource.getState().failureCount).toBe(0)
    expect(onLoadSuccess).toHaveBeenCalledWith('fresh', expect.any(Object))

    resource.destroy()
  })

  it('can clear previous data while a resource reloads', async () => {
    let resolveLoad: ((value: string[]) => void) | undefined
    const resource = createRefreshResource<string[]>({
      initialData: ['cached'],
      keepPreviousData: false,
      load() {
        return new Promise<string[]>((resolve) => {
          resolveLoad = resolve
        })
      },
    })

    const reload = resource.reload()
    await Promise.resolve()

    expect(resource.getState().status).toBe('loading')
    expect(resource.getState().data).toBeUndefined()

    resolveLoad?.(['fresh'])
    await reload

    expect(resource.getState().data).toEqual(['fresh'])

    resource.destroy()
  })

  it('can mark refresh resources as stale', () => {
    const resource = createRefreshResource<string[]>({
      initialData: ['cached'],
      load: vi.fn().mockResolvedValue(['fresh']),
    })

    expect(resource.getState().isStale).toBe(false)
    expect(resource.markStale()).toBe(resource)
    expect(resource.getState().isStale).toBe(true)

    resource.destroy()
  })

  it('can skip fresh resource reloads until forced or stale', async () => {
    const load = vi.fn().mockResolvedValue(['fresh'])
    const resource = createRefreshResource<string[]>({
      initialData: ['cached'],
      load,
      staleTime: 1000,
    })

    await resource.reload()

    expect(load).not.toHaveBeenCalled()

    await resource.reload({ force: true })

    expect(load).toHaveBeenCalledTimes(1)

    resource.markStale()
    await resource.reload()

    expect(load).toHaveBeenCalledTimes(2)

    resource.destroy()
  })

  it('cancels active refresh resource loaders', async () => {
    let refreshSignal: AbortSignal | undefined
    const resource = createRefreshResource<string[]>({
      load({ signal }) {
        refreshSignal = signal
        return new Promise<string[]>((resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
          resolve(['loaded'])
        })
      },
    })

    const reload = resource.reload()
    resource.cancel()

    await reload

    expect(refreshSignal?.aborted).toBe(true)
    expect(resource.getState().isLoading).toBe(false)

    resource.destroy()
  })

  it('installs into app-like plugin hosts', () => {
    const app: {
      config: {
        globalProperties: Record<string, unknown>
      }
      provided: Map<symbol | string, unknown>
      provide: (key: symbol | string, value: unknown) => void
    } = {
      config: {
        globalProperties: {},
      },
      provided: new Map<symbol | string, unknown>(),
      provide(key: symbol | string, value: unknown) {
        this.provided.set(key, value)
      },
    }

    const instance = install(app, { pullDownLength: 90 })

    expect(app.provided.get(UNREFRESH_KEY)).toBe(instance)
    expect(app.config.globalProperties.$unrefresh).toBe(instance)
  })
})
