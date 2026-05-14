// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Refresh from '../src'

let originalCancelAnimationFrame: typeof cancelAnimationFrame | undefined
let originalRequestAnimationFrame: typeof requestAnimationFrame | undefined

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

describe('refresh dom gestures', () => {
  beforeEach(() => {
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    originalRequestAnimationFrame = globalThis.requestAnimationFrame
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
    document.body.innerHTML = ''
  })

  it('renders and removes the refresh container', () => {
    const refresh = new Refresh({ target: document }).init()

    expect(document.querySelector('.refresh-container')).toBeTruthy()
    expect(document.querySelector('.refresh-text')?.textContent).toBe('下拉刷新')

    refresh.destroy()

    expect(document.querySelector('.refresh-container')).toBeNull()
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
})
