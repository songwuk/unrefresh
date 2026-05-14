import type { RefreshContainerElements } from './components/index'
import type { RefreshOptions, RefreshTarget, UnrefreshAppLike } from './types'
import { createRefreshContainer } from './components/index'

const DEFAULT_PULL_DOWN_LENGTH = 80
const DEFAULT_RESET_DELAY = 1000
const DEFAULT_BOUNCE_DURATION = 420
const HIDDEN_OFFSET = -84
const LOADING_OFFSET = 0
const MAX_PULL_STRETCH = 18
const INITIAL_TEXT = '下拉刷新'
const RELEASE_TEXT = '释放刷新'
const LOADING_TEXT = '加载中'

export const UNREFRESH_KEY = Symbol('unrefresh')

let installedInstance: Refresh | undefined

function isBrowser() {
  return typeof document !== 'undefined'
}

function isRefreshTarget(value: unknown): value is RefreshTarget {
  return !!value && typeof (value as EventTarget).addEventListener === 'function'
}

function isAppLike(value: unknown): value is UnrefreshAppLike {
  const app = value as UnrefreshAppLike | undefined
  return !!app && (typeof app.provide === 'function' || !!app.config?.globalProperties)
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getTargetFromOptions(options: RefreshOptions): RefreshTarget | undefined {
  return options.target || options.dom
}

function getLoadingImage(options: RefreshOptions) {
  return options.loadingImage || options.designLoading || options.designloading
}

function getTargetWindow(target?: RefreshTarget) {
  if (!isBrowser())
    return undefined

  if (target && 'defaultView' in target)
    return target.defaultView || window

  if (target && 'ownerDocument' in target)
    return target.ownerDocument?.defaultView || window

  return window
}

function createAbortController(target?: RefreshTarget) {
  const Controller = getTargetWindow(target)?.AbortController || AbortController

  return new Controller()
}

function resolveInstallOptions(
  appOrOptions?: UnrefreshAppLike | RefreshOptions,
  options?: RefreshOptions,
) {
  if (isAppLike(appOrOptions)) {
    return {
      app: appOrOptions,
      options: options || {},
    }
  }
  return {
    app: undefined,
    options: (appOrOptions || {}) as RefreshOptions,
  }
}

export class Refresh {
  static install(appOrOptions?: UnrefreshAppLike | RefreshOptions, options?: RefreshOptions) {
    return install(appOrOptions, options)
  }

  private _abortController?: AbortController
  private _animationFrame = 0
  private _currentY = 0
  private _elements?: RefreshContainerElements
  private _isPulling = false
  private _isRefreshing = false
  private _lifecycleId = 0
  private _nextOffset = HIDDEN_OFFSET
  private _opts: RefreshOptions = {}
  private _readyToRefresh = false
  private _reboundTimer?: ReturnType<typeof setTimeout>
  private _startY = 0
  private _target?: RefreshTarget

  constructor(targetOrOptions?: RefreshTarget | RefreshOptions, pullDownLength?: number) {
    if (isRefreshTarget(targetOrOptions)) {
      this._target = targetOrOptions
      this._opts = {}
    }
    else {
      this._opts = targetOrOptions || {}
      this._target = getTargetFromOptions(this._opts)
    }

    if (typeof pullDownLength === 'number')
      this._opts.pullDownLength = pullDownLength
  }

  init(options: RefreshOptions = {}) {
    this._opts = {
      ...this._opts,
      ...options,
    }
    this._target = getTargetFromOptions(this._opts) || this._target

    if (!isBrowser())
      return this

    this.destroy()

    const body = document.body
    if (!body)
      return this

    this._target = getTargetFromOptions(this._opts) || this._target || document.documentElement
    this._elements = createRefreshContainer({
      containerClassName: this._opts.containerClassName,
      loadingImage: getLoadingImage(this._opts),
      text: this._getText('initial'),
    })
    body.insertBefore(this._elements.container, body.firstChild)

    this._abortController = createAbortController(this._target)
    const { signal } = this._abortController
    this._target.addEventListener('touchstart', this._onTouchStart, { signal })
    this._target.addEventListener('touchmove', this._onTouchMove, { passive: false, signal })
    this._target.addEventListener('touchend', this._onTouchEnd, { signal })
    this._target.addEventListener('touchcancel', this._onTouchCancel, { signal })

    return this
  }

  destroy() {
    this._lifecycleId += 1
    this._abortController?.abort()
    this._abortController = undefined

    this._cancelAnimationFrame()
    this._resetState({ bounce: false, immediate: true })
    this._elements?.container.remove()
    this._elements = undefined

    return this
  }

  async refresh() {
    if (this._isRefreshing)
      return

    const lifecycleId = this._lifecycleId
    this._isRefreshing = true
    this._isPulling = false
    this._readyToRefresh = false
    const shouldRebound = this._isBounceEnabled() && !!this._elements
    this._setDragging(false)
    this._setLoading(true)
    this._setRebounding(shouldRebound)
    this._setOffset(LOADING_OFFSET)
    this._setText(this._getText('loading'))
    this._elements?.top.classList.remove('load-init')
    this._elements?.top.classList.add('load-start')

    try {
      let refreshFailed = false
      let refreshError: unknown
      const refreshTask = (async () => {
        try {
          if (this._opts.onRefresh)
            await this._opts.onRefresh()
          else
            await wait(this._opts.resetDelay ?? DEFAULT_RESET_DELAY)
        }
        catch (error) {
          refreshFailed = true
          refreshError = error
        }
      })()

      if (shouldRebound)
        await Promise.all([refreshTask, wait(this._getBounceDuration())])
      else
        await refreshTask

      if (refreshFailed)
        throw refreshError
    }
    finally {
      if (this._lifecycleId === lifecycleId)
        this._resetState()
    }
  }

  private _canPull() {
    if (!isBrowser() || !this._target)
      return true

    if (this._target === document || this._target === document.body || this._target === document.documentElement) {
      const scrollingElement = document.scrollingElement || document.documentElement
      return scrollingElement.scrollTop <= 0
    }

    return (this._target as HTMLElement).scrollTop <= 0
  }

  private _cancelAnimationFrame() {
    if (this._animationFrame && isBrowser())
      cancelAnimationFrame(this._animationFrame)

    this._animationFrame = 0
  }

  private _clearReboundTimer() {
    if (this._reboundTimer)
      clearTimeout(this._reboundTimer)

    this._reboundTimer = undefined
  }

  private _getBounceDuration() {
    const duration = this._opts.bounceDuration

    return typeof duration === 'number' && duration >= 0
      ? duration
      : DEFAULT_BOUNCE_DURATION
  }

  private _getPullDownLength() {
    return this._opts.pullDownLength || DEFAULT_PULL_DOWN_LENGTH
  }

  private _getPullOffset(distance: number) {
    const pullDownLength = this._getPullDownLength()
    const progress = Math.min(distance / pullDownLength, 1)
    const easedProgress = 1 - (1 - progress) ** 2
    const stretch = Math.min(Math.max(distance - pullDownLength, 0) * 0.18, MAX_PULL_STRETCH)

    return HIDDEN_OFFSET + easedProgress * Math.abs(HIDDEN_OFFSET) + stretch
  }

  private _getText(type: 'initial' | 'loading' | 'release') {
    if (type === 'loading')
      return this._opts.loadingText || LOADING_TEXT
    if (type === 'release')
      return this._opts.releaseText || RELEASE_TEXT
    return this._opts.initialText || INITIAL_TEXT
  }

  private _handleError(error: unknown) {
    this._opts.onError?.(error)
  }

  private _isBounceEnabled() {
    return this._opts.bounce !== false
  }

  private _onTouchCancel = () => {
    this._resetState()
  }

  private _onTouchEnd = () => {
    if (!this._isPulling)
      return

    if (this._readyToRefresh) {
      this._setDragging(false)
      this.refresh().catch(error => this._handleError(error))
      return
    }

    this._resetState()
  }

  private _onTouchMove = (ev: Event) => {
    if (!this._isPulling || this._isRefreshing)
      return

    const touchEvent = ev as TouchEvent
    const touch = touchEvent.targetTouches[0]
    if (!touch)
      return

    this._currentY = touch.clientY
    const changeY = Math.max(this._currentY - this._startY, 0)
    if (changeY <= 0)
      return

    if (this._opts.preventDefault !== false && touchEvent.cancelable)
      touchEvent.preventDefault()

    const pullDownLength = this._getPullDownLength()
    this._setOffset(this._getPullOffset(changeY))
    this._rotate(changeY * 9)

    this._readyToRefresh = changeY >= pullDownLength
    this._elements?.top.classList.toggle('load-init', this._readyToRefresh)
    this._setText(this._getText(this._readyToRefresh ? 'release' : 'initial'))
  }

  private _onTouchStart = (ev: Event) => {
    if (this._isRefreshing || !this._canPull())
      return

    const touch = (ev as TouchEvent).targetTouches[0]
    if (!touch)
      return

    this._startY = touch.clientY
    this._currentY = this._startY
    this._isPulling = true
    this._readyToRefresh = false
    this._setRebounding(false)
    this._setDragging(true)
    this._setLoading(false)
    this._setText(this._getText('initial'))
  }

  private _resetState(options: { bounce?: boolean, immediate?: boolean } = {}) {
    const shouldBounce = options.bounce ?? false

    this._isPulling = false
    this._isRefreshing = false
    this._readyToRefresh = false
    this._setDragging(false)
    this._setLoading(false)
    this._setRebounding(shouldBounce)
    this._setText(this._getText('initial'))
    this._setOffset(HIDDEN_OFFSET, options.immediate)
    this._rotate(0)
    this._elements?.top.classList.remove('load-init')
    this._elements?.top.classList.remove('load-start')
  }

  private _rotate(rotate: number) {
    if (this._elements)
      this._elements.spinner.style.transform = `rotate(${rotate}deg)`
  }

  private _setDragging(isDragging: boolean) {
    this._elements?.container.classList.toggle('refresh-container--dragging', isDragging)
  }

  private _setLoading(isLoading: boolean) {
    this._elements?.container.classList.toggle('refresh-container--loading', isLoading)
  }

  private _setRebounding(isRebounding: boolean) {
    this._clearReboundTimer()

    if (!this._elements)
      return

    this._elements.container.classList.toggle('refresh-container--rebounding', isRebounding)

    if (!isRebounding)
      return

    const duration = this._getBounceDuration()
    this._elements.container.style.setProperty('--unrefresh-bounce-duration', `${duration}ms`)
    this._reboundTimer = setTimeout(() => {
      this._reboundTimer = undefined
      this._elements?.container.classList.remove('refresh-container--rebounding')
    }, duration)
  }

  private _setOffset(offset: number, immediate = false) {
    if (!this._elements)
      return

    this._nextOffset = offset

    if (immediate) {
      this._cancelAnimationFrame()
      this._elements.container.style.transform = `translate3d(0, ${this._nextOffset}px, 0)`
      return
    }

    if (this._animationFrame)
      return

    this._animationFrame = requestAnimationFrame(() => {
      this._animationFrame = 0

      if (this._elements)
        this._elements.container.style.transform = `translate3d(0, ${this._nextOffset}px, 0)`
    })
  }

  private _setText(text: string) {
    if (this._elements)
      this._elements.text.textContent = text
  }
}

export function createRefresh(options: RefreshOptions = {}) {
  return new Refresh(options).init()
}

export function install(appOrOptions?: UnrefreshAppLike | RefreshOptions, options?: RefreshOptions) {
  const resolved = resolveInstallOptions(appOrOptions, options)
  installedInstance?.destroy()
  installedInstance = createRefresh(resolved.options)

  if (resolved.app?.provide)
    resolved.app.provide(UNREFRESH_KEY, installedInstance)

  if (resolved.app?.config?.globalProperties)
    resolved.app.config.globalProperties.$unrefresh = installedInstance

  return installedInstance
}

export const UnrefreshPlugin = {
  install,
}

export type { opts, RefreshHook, RefreshOptions, RefreshTarget, UnrefreshAppLike, useApi } from './types'

export default Refresh
