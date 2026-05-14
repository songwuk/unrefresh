import { describe, expect, it } from 'vitest'
import Refresh, { createRefresh, install, UNREFRESH_KEY, UnrefreshPlugin } from '../src'
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

  it('waits for async refresh handlers', async () => {
    let refreshed = false
    const instance = new Refresh({
      async onRefresh() {
        await Promise.resolve()
        refreshed = true
      },
    })

    await instance.refresh()

    expect(refreshed).toBe(true)
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
