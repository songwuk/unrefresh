// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Refresh from '../src'
import type { RefreshState } from '../src'

let originalCancelAnimationFrame: typeof cancelAnimationFrame | undefined
let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined
let originalVibrate: Navigator['vibrate'] | undefined

function createTouchEvent(type: string, clientY = 0) {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  })

  Object.defineProperty(event, 'targetTouches', {
    configurable: true,
    value: type === 'touchend' || type === 'touchcancel'
      ? []
      : [{ clientY }],
  })

  return event
}

function createMouseEvent(type: string, clientY = 0, button = 0) {
  return new MouseEvent(type, {
    bubbles: true,
    button,
    cancelable: true,
    clientY,
  })
}

describe('refresh dom gestures', () => {
  beforeEach(() => {
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    originalRequestAnimationFrame = globalThis.requestAnimationFrame
    originalVibrate = window.navigator.vibrate
    document.body.innerHTML = '<main id="page">Feed</main>'
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
      writable: true,
    })
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
      writable: true,
    })
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: originalCancelAnimationFrame,
      writable: true,
    })
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: originalVibrate,
      writable: true,
    })
    document.body.innerHTML = ''
  })

  it('renders and removes the refresh container', () => {
    const refresh = new Refresh({ target: document }).init()

    const container = document.querySelector('.refresh-container')

    expect(container).toBeTruthy()
    expect(container?.getAttribute('role')).toBe('status')
    expect(container?.getAttribute('aria-live')).toBe('polite')
    expect(container?.getAttribute('aria-atomic')).toBe('true')
    expect(document.querySelector('.refresh-text')?.textContent).toBe('下拉刷新')

    refresh.destroy()

    expect(document.querySelector('.refresh-container')).toBeNull()
  })

  it('can disable live region role when ariaLive is off', () => {
    const refresh = new Refresh({
      ariaLive: 'off',
      target: document,
    }).init()

    const container = document.querySelector('.refresh-container')

    expect(container?.getAttribute('aria-live')).toBe('off')
    expect(container?.getAttribute('role')).toBeNull()

    refresh.destroy()
  })

  it('applies animation presets and duration at runtime', () => {
    const refresh = new Refresh({
      animation: 'orbit',
      animationDuration: 900,
      target: document,
    }).init()

    const container = document.querySelector<HTMLElement>('.refresh-container')

    expect(container?.dataset.animation).toBe('orbit')
    expect(container?.dataset.icon).toBe('auto')
    expect(container?.style.getPropertyValue('--unrefresh-animation-duration')).toBe('900ms')
    const orbitIcon = document.querySelector<HTMLImageElement>('.spinner')?.src

    refresh.setOptions({
      animation: 'magnetic',
      animationDuration: 480,
    })

    expect(container?.dataset.animation).toBe('magnetic')
    expect(container?.style.getPropertyValue('--unrefresh-animation-duration')).toBe('480ms')
    expect(document.querySelector<HTMLImageElement>('.spinner')?.src).not.toBe(orbitIcon)

    refresh.setOptions({ animationIcon: 'diamond' })

    expect(container?.dataset.icon).toBe('diamond')
    expect(document.querySelector<HTMLImageElement>('.spinner')?.src).toContain('data:image/svg+xml')

    refresh.destroy()
  })

  it('keeps custom loading images ahead of built-in animation icons', () => {
    const refresh = new Refresh({
      animation: 'orbit',
      loadingImage: '/custom.svg',
      target: document,
    }).init()

    const spinner = document.querySelector<HTMLImageElement>('.spinner')

    expect(spinner?.getAttribute('src')).toBe('/custom.svg')

    refresh.setOptions({
      animation: 'magnetic',
      animationIcon: 'magnet',
    })

    expect(spinner?.getAttribute('src')).toBe('/custom.svg')

    refresh.destroy()
  })

  it('maps pull progress to frame variables for each animation format', () => {
    const presets = ['spin', 'pulse', 'orbit', 'magnetic', 'bounce', 'flip', 'none'] as const

    for (const animation of presets) {
      const refresh = new Refresh({
        animation,
        pullDownLength: 80,
        target: document,
      }).init()

      document.dispatchEvent(createTouchEvent('touchstart', 10))
      document.dispatchEvent(createTouchEvent('touchmove', 90))

      const container = document.querySelector<HTMLElement>('.refresh-container')!

      expect(container.dataset.animation).toBe(animation)
      expect(container.dataset.status).toBe('ready')
      expect(container.style.getPropertyValue('--unrefresh-progress')).toBe('1.000')
      expect(container.style.getPropertyValue('--unrefresh-distance')).toBe('80px')
      expect(container.style.getPropertyValue('--unrefresh-frame-rotate')).toBe('360deg')
      expect(container.style.getPropertyValue('--unrefresh-frame-scale')).not.toBe('')
      expect(container.style.getPropertyValue('--unrefresh-frame-orbit')).not.toBe('')
      expect(container.style.getPropertyValue('--unrefresh-frame-flip')).toBe('180deg')
      expect(container.style.getPropertyValue('--unrefresh-frame-magnet')).toBe('1.000')

      refresh.destroy()
    }
  })

  it('supports custom frame-based animation definitions', () => {
    const onFrame = vi.fn(({ frame }) => ({
      spinner: {
        transform: `scale(${frame.progress.toFixed(2)}) rotate(${Math.round(frame.progress * 120)}deg)`,
      },
      variables: {
        '--custom-frame-progress': frame.progress.toFixed(2),
      },
    }))
    const refresh = new Refresh({
      animation: {
        frames: [
          {
            progress: 0,
            top: { opacity: 0.4 },
          },
          {
            progress: 0.5,
            top: { opacity: 0.7 },
          },
          {
            progress: 1,
            top: { opacity: 1 },
          },
        ],
        name: 'elastic-arc',
        onFrame,
      },
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 50))

    const container = document.querySelector<HTMLElement>('.refresh-container')!
    const spinner = document.querySelector<HTMLElement>('.spinner')!
    const top = document.querySelector<HTMLElement>('.refresh-top')!

    expect(container.dataset.animation).toBe('elastic-arc')
    expect(onFrame).toHaveBeenCalled()
    expect(container.style.getPropertyValue('--custom-frame-progress')).toBe('0.50')
    expect(spinner.style.getPropertyValue('transform')).toBe('scale(0.50) rotate(60deg)')
    expect(top.style.getPropertyValue('opacity')).toBe('0.7')

    refresh.setOptions({ animation: 'spin' })

    expect(container.dataset.animation).toBe('spin')
    expect(container.style.getPropertyValue('--custom-frame-progress')).toBe('')
    expect(spinner.style.getPropertyValue('transform')).toBe('')
    expect(top.style.getPropertyValue('opacity')).toBe('')

    refresh.destroy()
  })

  it('triggers refresh after pulling past the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const refresh = new Refresh({
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))

    expect(document.querySelector('.refresh-text')?.textContent).toBe('释放刷新')

    document.dispatchEvent(createTouchEvent('touchend'))

    expect(document.querySelector('.load-start')).toBeTruthy()
    expect(onRefresh).toHaveBeenCalledTimes(1)

    await Promise.resolve()
    refresh.destroy()
  })

  it('does not refresh when the pull distance is below the threshold', () => {
    const onRefresh = vi.fn()
    const refresh = new Refresh({
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 44))
    document.dispatchEvent(createTouchEvent('touchend'))

    expect(onRefresh).not.toHaveBeenCalled()
    expect(document.querySelector('.refresh-text')?.textContent).toBe('下拉刷新')

    refresh.destroy()
  })

  it('can disable and enable touch gestures at runtime', () => {
    const onRefresh = vi.fn()
    const refresh = new Refresh({
      disabled: true,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))

    expect(onRefresh).not.toHaveBeenCalled()

    refresh.enable()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))

    expect(onRefresh).toHaveBeenCalledTimes(1)

    refresh.destroy()
  })

  it('can refresh with mouse dragging when enabled', () => {
    const onRefresh = vi.fn(() => new Promise<void>(() => {}))
    const refresh = new Refresh({
      mouse: true,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createMouseEvent('mousedown', 10))
    document.dispatchEvent(createMouseEvent('mousemove', 110))
    document.dispatchEvent(createMouseEvent('mouseup', 110))

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.load-start')).toBeTruthy()

    refresh.destroy()
  })

  it('ignores mouse dragging unless explicitly enabled', () => {
    const onRefresh = vi.fn()
    const refresh = new Refresh({
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createMouseEvent('mousedown', 10))
    document.dispatchEvent(createMouseEvent('mousemove', 110))
    document.dispatchEvent(createMouseEvent('mouseup', 110))

    expect(onRefresh).not.toHaveBeenCalled()

    refresh.destroy()
  })

  it('ignores non-primary mouse buttons', () => {
    const onRefresh = vi.fn()
    const refresh = new Refresh({
      mouse: true,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createMouseEvent('mousedown', 10, 1))
    document.dispatchEvent(createMouseEvent('mousemove', 110))
    document.dispatchEvent(createMouseEvent('mouseup', 110))

    expect(onRefresh).not.toHaveBeenCalled()

    refresh.destroy()
  })

  it('emits state changes for pull and refresh phases', () => {
    const states: RefreshState[] = []
    const refresh = new Refresh({
      bounceDuration: 0,
      onRefresh: () => new Promise<void>(() => {}),
      onStateChange(state) {
        states.push(state)
      },
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))

    expect(states.map(state => state.status)).toContain('pulling')
    expect(states.map(state => state.status)).toContain('ready')
    expect(states.map(state => state.status)).toContain('refreshing')
    expect(refresh.getState().status).toBe('refreshing')
    expect(refresh.getState().progress).toBe(1)

    refresh.destroy()
  })

  it('vibrates once when the pull reaches the release threshold', () => {
    const refresh = new Refresh({
      haptics: true,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 90))
    document.dispatchEvent(createTouchEvent('touchmove', 120))
    document.dispatchEvent(createTouchEvent('touchmove', 130))

    expect(window.navigator.vibrate).toHaveBeenCalledTimes(1)
    expect(window.navigator.vibrate).toHaveBeenCalledWith(10)

    refresh.destroy()
  })

  it('uses custom haptic patterns for refresh results', async () => {
    const refresh = new Refresh({
      bounce: false,
      haptics: {
        ready: false,
        success: [8, 16, 8],
      },
      onRefresh: vi.fn().mockResolvedValue(undefined),
      target: document,
    }).init()

    await refresh.refresh()

    expect(window.navigator.vibrate).toHaveBeenCalledTimes(1)
    expect(window.navigator.vibrate).toHaveBeenCalledWith([8, 16, 8])

    refresh.destroy()
  })

  it('does not vibrate by default', () => {
    const refresh = new Refresh({
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))

    expect(window.navigator.vibrate).not.toHaveBeenCalled()

    refresh.destroy()
  })

  it('aborts active refresh work when cancelled', async () => {
    let refreshSignal: AbortSignal | undefined
    let resolveRefresh: (() => void) | undefined
    const refresh = new Refresh({
      onRefresh({ signal }) {
        refreshSignal = signal
        return new Promise<void>((resolve) => {
          resolveRefresh = resolve
        })
      },
      target: document,
    }).init()

    const promise = refresh.refresh()
    await Promise.resolve()

    expect(refreshSignal?.aborted).toBe(false)

    refresh.cancel()

    expect(refreshSignal?.aborted).toBe(true)
    expect(document.querySelector('.refresh-container--loading')).toBeNull()

    resolveRefresh?.()
    await promise

    expect(refresh.getState().status).toBe('idle')

    refresh.destroy()
  })

  it('aborts active refresh work when destroyed', async () => {
    let refreshSignal: AbortSignal | undefined
    let resolveRefresh: (() => void) | undefined
    const refresh = new Refresh({
      onRefresh({ signal }) {
        refreshSignal = signal
        return new Promise<void>((resolve) => {
          resolveRefresh = resolve
        })
      },
      target: document,
    }).init()

    const promise = refresh.refresh()
    await Promise.resolve()

    refresh.destroy()

    expect(refreshSignal?.aborted).toBe(true)
    expect(document.querySelector('.refresh-container')).toBeNull()

    resolveRefresh?.()
    await promise
  })

  it('applies rebound animation when refresh starts', () => {
    const onRefresh = vi.fn(() => new Promise<void>(() => {}))
    const refresh = new Refresh({
      bounceDuration: 380,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))

    const container = document.querySelector<HTMLElement>('.refresh-container')!

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(container.classList.contains('refresh-container--rebounding')).toBe(true)
    expect(container.style.getPropertyValue('--unrefresh-bounce-duration')).toBe('380ms')

    refresh.destroy()
  })

  it('can disable rebound animation', () => {
    const onRefresh = vi.fn(() => new Promise<void>(() => {}))
    const refresh = new Refresh({
      bounce: false,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.refresh-container--rebounding')).toBeNull()

    refresh.destroy()
  })

  it('keeps the loading state until the refresh rebound completes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const refresh = new Refresh({
      bounceDuration: 20,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))
    await Promise.resolve()

    expect(document.querySelector('.refresh-container--loading')).toBeTruthy()

    await new Promise(resolve => setTimeout(resolve, 25))

    expect(document.querySelector('.refresh-container--loading')).toBeNull()

    refresh.destroy()
  })

  it('keeps the loading state until the minimum loading duration completes', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    const refresh = new Refresh({
      bounce: false,
      minLoadingDuration: 20,
      onRefresh,
      pullDownLength: 80,
      target: document,
    }).init()

    document.dispatchEvent(createTouchEvent('touchstart', 10))
    document.dispatchEvent(createTouchEvent('touchmove', 110))
    document.dispatchEvent(createTouchEvent('touchend'))
    await Promise.resolve()

    expect(document.querySelector('.refresh-container--loading')).toBeTruthy()

    await new Promise(resolve => setTimeout(resolve, 25))

    expect(document.querySelector('.refresh-container--loading')).toBeNull()

    refresh.destroy()
  })

  it('shows success feedback before hiding when complete duration is enabled', async () => {
    const refresh = new Refresh({
      bounce: false,
      completeDuration: 20,
      onRefresh: vi.fn().mockResolvedValue(undefined),
      successText: 'Done',
      target: document,
    }).init()

    const promise = refresh.refresh()

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(document.querySelector('.refresh-text')?.textContent).toBe('Done')
    expect(document.querySelector('.refresh-container--success')).toBeTruthy()

    await promise

    expect(document.querySelector('.refresh-container--success')).toBeNull()

    refresh.destroy()
  })

  it('shows error feedback and still rejects failed refreshes', async () => {
    const error = new Error('Request failed')
    const refresh = new Refresh({
      bounce: false,
      completeDuration: 20,
      errorText: 'Failed',
      onRefresh: vi.fn().mockRejectedValue(error),
      target: document,
    }).init()

    const promise = refresh.refresh().catch(caughtError => caughtError)

    await new Promise(resolve => setTimeout(resolve, 0))

    expect(document.querySelector('.refresh-text')?.textContent).toBe('Failed')
    expect(document.querySelector('.refresh-container--error')).toBeTruthy()

    await expect(promise).resolves.toBe(error)

    expect(document.querySelector('.refresh-container--error')).toBeNull()

    refresh.destroy()
  })
})
