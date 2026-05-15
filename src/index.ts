import type { RefreshContainerElements } from './components/index'
import type {
  RefreshAnimation,
  RefreshAnimationElementKey,
  RefreshAnimationFrame,
  RefreshAnimationFrameContext,
  RefreshAnimationFrameElements,
  RefreshAnimationFrameResult,
  RefreshAnimationKeyframe,
  RefreshAnimationPreset,
  RefreshAnimationStyleMap,
  RefreshAnimationStyleProperty,
  RefreshCustomAnimation,
  RefreshEventListener,
  RefreshEventMap,
  RefreshEventName,
  RefreshHapticEvent,
  RefreshHapticPattern,
  RefreshContext,
  RefreshOptions,
  RefreshState,
  RefreshStatus,
  RefreshTarget,
  UnrefreshAppLike,
} from './types'
import { createRefreshContainer, getRefreshAnimationIcon } from './components/index'

const DEFAULT_PULL_DOWN_LENGTH = 80
const DEFAULT_RESET_DELAY = 1000
const DEFAULT_BOUNCE_DURATION = 420
const DEFAULT_COMPLETE_DURATION = 0
const DEFAULT_MIN_LOADING_DURATION = 0
const DEFAULT_ANIMATION_PRESET: RefreshAnimationPreset = 'spin'
const DEFAULT_ANIMATION_DURATION = 720
const HIDDEN_OFFSET = -84
const LOADING_OFFSET = 0
const MAX_PULL_STRETCH = 18
const INITIAL_TEXT = '下拉刷新'
const RELEASE_TEXT = '释放刷新'
const LOADING_TEXT = '加载中'
const SUCCESS_TEXT = '刷新成功'
const ERROR_TEXT = '刷新失败'

const FRAME_ELEMENT_KEYS: RefreshAnimationElementKey[] = ['container', 'top', 'spinner', 'text']

const DEFAULT_HAPTIC_PATTERNS: Record<RefreshHapticEvent, false | RefreshHapticPattern> = {
  error: [12, 30, 12],
  ready: 10,
  refreshing: false,
  success: 18,
}

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

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (ms <= 0 || signal?.aborted) {
      resolve()
      return
    }

    const timer = setTimeout(complete, ms)

    function complete() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', complete)
      resolve()
    }

    signal?.addEventListener('abort', complete, { once: true })
  })
}

function getTargetFromOptions(options: RefreshOptions): RefreshTarget | undefined {
  return options.target || options.dom
}

function getLoadingImage(options: RefreshOptions) {
  return options.loadingImage || options.designLoading || options.designloading
}

function hasCustomLoadingImage(options: RefreshOptions) {
  return !!getLoadingImage(options)
}

function isCustomAnimation(animation: RefreshAnimation | undefined): animation is RefreshCustomAnimation {
  return !!animation && typeof animation === 'object'
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
  private _distance = 0
  private _elements?: RefreshContainerElements
  private _inputType?: 'mouse' | 'touch'
  private _isPulling = false
  private _isRefreshing = false
  private _listeners = new Map<RefreshEventName, Set<RefreshEventListener>>()
  private _lifecycleId = 0
  private _customFrameStyles: Partial<Record<RefreshAnimationElementKey, Set<RefreshAnimationStyleProperty>>> = {}
  private _customFrameVariables = new Set<string>()
  private _nextOffset = HIDDEN_OFFSET
  private _opts: RefreshOptions = {}
  private _readyToRefresh = false
  private _reboundTimer?: ReturnType<typeof setTimeout>
  private _refreshAbortController?: AbortController
  private _startY = 0
  private _status: RefreshStatus = 'idle'
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
      animation: this._getAnimationName(),
      animationDuration: this._getAnimationDuration(),
      animationIcon: this._opts.animationIcon,
      ariaLive: this._opts.ariaLive,
      containerClassName: this._opts.containerClassName,
      loadingImage: getLoadingImage(this._opts),
      text: this._getText('initial'),
    })
    body.insertBefore(this._elements.container, body.firstChild)
    this._setAnimation()
    this._setFrame('idle', 0, HIDDEN_OFFSET)

    this._abortController = createAbortController(this._target)
    const { signal } = this._abortController
    this._target.addEventListener('touchstart', this._onTouchStart, { signal })
    this._target.addEventListener('touchmove', this._onTouchMove, { passive: false, signal })
    this._target.addEventListener('touchend', this._onTouchEnd, { signal })
    this._target.addEventListener('touchcancel', this._onTouchCancel, { signal })

    if (this._isMouseEnabled()) {
      this._target.addEventListener('mousedown', this._onMouseStart, { signal })
      this._target.addEventListener('mousemove', this._onMouseMove, { signal })
      this._target.addEventListener('mouseup', this._onMouseEnd, { signal })
      this._target.addEventListener('mouseleave', this._onMouseCancel, { signal })
    }

    return this
  }

  destroy() {
    this._lifecycleId += 1
    this._abortRefresh()
    this._abortController?.abort()
    this._abortController = undefined

    this._cancelAnimationFrame()
    this._resetState({ bounce: false, immediate: true })
    this._elements?.container.remove()
    this._elements = undefined
    this._emit('destroy', this.getState())

    return this
  }

  cancel() {
    if (!this._isPulling && !this._isRefreshing)
      return this

    const cancelledState = this.getState()
    this._lifecycleId += 1
    this._abortRefresh()
    this._emit('refreshcancel', cancelledState)
    this._resetState()

    return this
  }

  disable() {
    this._opts.disabled = true

    if (this._isPulling)
      this._resetState()

    return this
  }

  enable() {
    this._opts.disabled = false

    return this
  }

  getState(): RefreshState {
    return this._createState(this._status, this._distance, this._nextOffset)
  }

  on<EventName extends RefreshEventName>(
    eventName: EventName,
    listener: RefreshEventListener<EventName>,
  ) {
    const listeners = this._listeners.get(eventName) || new Set<RefreshEventListener>()
    listeners.add(listener as RefreshEventListener)
    this._listeners.set(eventName, listeners)

    return this
  }

  off<EventName extends RefreshEventName>(
    eventName: EventName,
    listener: RefreshEventListener<EventName>,
  ) {
    const listeners = this._listeners.get(eventName)
    listeners?.delete(listener as RefreshEventListener)

    if (listeners?.size === 0)
      this._listeners.delete(eventName)

    return this
  }

  async refresh() {
    if (this._isRefreshing)
      return

    const lifecycleId = this._lifecycleId
    const refreshAbortController = createAbortController(this._target)
    this._refreshAbortController = refreshAbortController
    const refreshSignal = refreshAbortController.signal

    this._isRefreshing = true
    this._isPulling = false
    this._readyToRefresh = false
    const shouldRebound = this._isBounceEnabled() && !!this._elements
    this._setDragging(false)
    this._setLoading(true)
    this._setRebounding(shouldRebound)
    this._setResult()
    this._setOffset(LOADING_OFFSET)
    this._setText(this._getText('loading'))
    this._elements?.top.classList.remove('load-init')
    this._elements?.top.classList.add('load-start')
    const refreshState = this._emitState('refreshing', Math.max(this._distance, this._getPullDownLength()), LOADING_OFFSET)
    this._emit('refreshstart', refreshState)
    this._vibrate('refreshing')

    try {
      let refreshFailed = false
      let refreshError: unknown
      const refreshTask = (async () => {
        try {
          if (this._opts.onRefresh)
            await this._opts.onRefresh(this._createRefreshContext(refreshSignal))
          else
            await wait(this._opts.resetDelay ?? DEFAULT_RESET_DELAY, refreshSignal)
        }
        catch (error) {
          refreshFailed = true
          refreshError = error
        }
      })()

      const visualDuration = Math.max(
        shouldRebound ? this._getBounceDuration() : 0,
        this._getMinLoadingDuration(),
      )

      if (visualDuration > 0)
        await Promise.all([refreshTask, wait(visualDuration, refreshSignal)])
      else
        await refreshTask

      if (this._lifecycleId !== lifecycleId || refreshSignal.aborted)
        return

      if (refreshFailed) {
        this._vibrate('error')
        const errorState = await this._showResult('error')
        this._emit('refresherror', {
          error: refreshError,
          state: errorState,
        })
        throw refreshError
      }

      this._vibrate('success')
      const completeState = await this._showResult('success')
      this._emit('refreshcomplete', completeState)
    }
    finally {
      if (this._refreshAbortController === refreshAbortController)
        this._refreshAbortController = undefined

      if (this._lifecycleId === lifecycleId)
        this._resetState()
    }
  }

  setOptions(options: RefreshOptions = {}) {
    const nextTarget = getTargetFromOptions(options)
    const shouldReinit = !!nextTarget && nextTarget !== this._target && !!this._elements && isBrowser()

    this._opts = {
      ...this._opts,
      ...options,
    }

    if (nextTarget)
      this._target = nextTarget

    if (this._opts.disabled && this._isPulling)
      this._resetState()

    if (shouldReinit)
      return this.init()

    if (this._elements)
      this._setText(this._getText(this._getTextType()))
    this._setAnimation()

    return this
  }

  subscribe(listener: (state: RefreshState) => void) {
    this.on('statechange', listener)

    return () => {
      this.off('statechange', listener)
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

  private _abortRefresh() {
    this._refreshAbortController?.abort()
    this._refreshAbortController = undefined
  }

  private _createRefreshContext(signal: AbortSignal): RefreshContext {
    return {
      instance: this,
      signal,
      state: this.getState(),
    }
  }

  private _createState(status: RefreshStatus, distance: number, offset: number): RefreshState {
    const progress = Math.min(Math.max(distance / this._getPullDownLength(), 0), 1)

    return {
      distance,
      offset,
      progress,
      ready: this._readyToRefresh,
      refreshing: this._isRefreshing,
      status,
    }
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

  private _getAnimationDuration() {
    const duration = this._opts.animationDuration

    return typeof duration === 'number' && duration >= 0
      ? duration
      : DEFAULT_ANIMATION_DURATION
  }

  private _getAnimation(): RefreshAnimation {
    return this._opts.animation || DEFAULT_ANIMATION_PRESET
  }

  private _getAnimationName() {
    const animation = this._getAnimation()

    return typeof animation === 'string'
      ? animation
      : animation.name || 'custom'
  }

  private _getCustomAnimation() {
    const animation = this._getAnimation()

    return isCustomAnimation(animation)
      ? animation
      : undefined
  }

  private _getCompleteDuration() {
    const duration = this._opts.completeDuration

    return typeof duration === 'number' && duration >= 0
      ? duration
      : DEFAULT_COMPLETE_DURATION
  }

  private _getPullDownLength() {
    return this._opts.pullDownLength || DEFAULT_PULL_DOWN_LENGTH
  }

  private _getMinLoadingDuration() {
    const duration = this._opts.minLoadingDuration

    return typeof duration === 'number' && duration >= 0
      ? duration
      : DEFAULT_MIN_LOADING_DURATION
  }

  private _getPullOffset(distance: number) {
    const pullDownLength = this._getPullDownLength()
    const progress = Math.min(distance / pullDownLength, 1)
    const easedProgress = 1 - (1 - progress) ** 2
    const stretch = Math.min(Math.max(distance - pullDownLength, 0) * 0.18, MAX_PULL_STRETCH)

    return HIDDEN_OFFSET + easedProgress * Math.abs(HIDDEN_OFFSET) + stretch
  }

  private _getTextType(): 'error' | 'initial' | 'loading' | 'release' | 'success' {
    if (this._status === 'error' || this._status === 'success')
      return this._status
    if (this._isRefreshing)
      return 'loading'
    if (this._readyToRefresh)
      return 'release'
    return 'initial'
  }

  private _getText(type: 'error' | 'initial' | 'loading' | 'release' | 'success') {
    if (type === 'error')
      return this._opts.errorText || ERROR_TEXT
    if (type === 'loading')
      return this._opts.loadingText || LOADING_TEXT
    if (type === 'release')
      return this._opts.releaseText || RELEASE_TEXT
    if (type === 'success')
      return this._opts.successText || SUCCESS_TEXT
    return this._opts.initialText || INITIAL_TEXT
  }

  private _getHapticPattern(event: RefreshHapticEvent) {
    const haptics = this._opts.haptics

    if (!haptics)
      return false

    if (haptics === true)
      return DEFAULT_HAPTIC_PATTERNS[event]

    return haptics[event] ?? DEFAULT_HAPTIC_PATTERNS[event]
  }

  private _handleError(error: unknown) {
    this._opts.onError?.(error)
  }

  private _emitState(status: RefreshStatus, distance: number, offset: number) {
    this._status = status
    this._distance = distance
    this._setFrame(status, distance, offset)
    const state = this._createState(status, distance, offset)
    this._opts.onStateChange?.(state)
    this._emit('statechange', state)

    return state
  }

  private _emit<EventName extends RefreshEventName>(
    eventName: EventName,
    payload: RefreshEventMap[EventName],
  ) {
    this._listeners.get(eventName)?.forEach((listener) => {
      (listener as RefreshEventListener<EventName>)(payload)
    })
  }

  private _isBounceEnabled() {
    return this._opts.bounce !== false
  }

  private _isMouseEnabled() {
    return this._opts.mouse === true
  }

  private async _showResult(status: 'error' | 'success') {
    const duration = this._getCompleteDuration()

    this._setLoading(false)
    this._setRebounding(false)
    this._setResult(status)
    this._setText(this._getText(status))
    this._setOffset(LOADING_OFFSET)
    const state = this._emitState(status, this._distance, LOADING_OFFSET)

    if (duration <= 0 || !this._elements)
      return state

    await wait(duration)

    return state
  }

  private _movePull(clientY: number, ev: Event) {
    if (!this._isPulling || this._isRefreshing)
      return

    this._currentY = clientY
    const changeY = Math.max(this._currentY - this._startY, 0)
    if (changeY <= 0)
      return

    if (this._opts.preventDefault !== false && ev.cancelable)
      ev.preventDefault()

    const pullDownLength = this._getPullDownLength()
    const offset = this._getPullOffset(changeY)
    const wasReady = this._readyToRefresh
    this._setOffset(offset)
    this._rotate(changeY * 9)

    this._readyToRefresh = changeY >= pullDownLength
    if (!wasReady && this._readyToRefresh)
      this._vibrate('ready')

    this._elements?.top.classList.toggle('load-init', this._readyToRefresh)
    this._setText(this._getText(this._readyToRefresh ? 'release' : 'initial'))
    this._emitState(this._readyToRefresh ? 'ready' : 'pulling', changeY, offset)
  }

  private _startPull(clientY: number, inputType: 'mouse' | 'touch') {
    if (this._inputType)
      return

    if (this._opts.disabled || this._isRefreshing || !this._canPull())
      return

    this._inputType = inputType
    this._startY = clientY
    this._currentY = this._startY
    this._isPulling = true
    this._readyToRefresh = false
    this._setRebounding(false)
    this._setDragging(true)
    this._setLoading(false)
    this._setText(this._getText('initial'))
    this._emitState('pulling', 0, this._nextOffset)
  }

  private _endPull() {
    if (!this._isPulling)
      return

    if (this._readyToRefresh) {
      this._inputType = undefined
      this._setDragging(false)
      this.refresh().catch(error => this._handleError(error))
      return
    }

    this._resetState()
  }

  private _onMouseCancel = () => {
    if (this._inputType === 'mouse')
      this._resetState()
  }

  private _onMouseEnd = () => {
    if (this._inputType === 'mouse')
      this._endPull()
  }

  private _onMouseMove = (ev: Event) => {
    if (this._inputType !== 'mouse')
      return

    this._movePull((ev as MouseEvent).clientY, ev)
  }

  private _onMouseStart = (ev: Event) => {
    const mouseEvent = ev as MouseEvent

    if (mouseEvent.button !== 0)
      return

    this._startPull(mouseEvent.clientY, 'mouse')
  }

  private _onTouchCancel = () => {
    if (this._inputType === 'touch')
      this._resetState()
  }

  private _onTouchEnd = () => {
    if (this._inputType === 'touch')
      this._endPull()
  }

  private _onTouchMove = (ev: Event) => {
    if (this._inputType !== 'touch')
      return

    const touchEvent = ev as TouchEvent
    const touch = touchEvent.targetTouches[0]
    if (!touch)
      return

    this._movePull(touch.clientY, ev)
  }

  private _onTouchStart = (ev: Event) => {
    const touch = (ev as TouchEvent).targetTouches[0]
    if (!touch)
      return

    this._startPull(touch.clientY, 'touch')
  }

  private _resetState(options: { bounce?: boolean, immediate?: boolean } = {}) {
    const shouldBounce = options.bounce ?? false

    this._isPulling = false
    this._isRefreshing = false
    this._inputType = undefined
    this._readyToRefresh = false
    this._setDragging(false)
    this._setLoading(false)
    this._setRebounding(shouldBounce)
    this._setResult()
    this._setText(this._getText('initial'))
    this._setOffset(HIDDEN_OFFSET, options.immediate)
    this._elements?.top.classList.remove('load-init')
    this._elements?.top.classList.remove('load-start')
    this._emitState('idle', 0, HIDDEN_OFFSET)
  }

  private _rotate(rotate: number) {
    this._elements?.container.style.setProperty('--unrefresh-frame-rotate', `${Math.round(rotate)}deg`)
  }

  private _setDragging(isDragging: boolean) {
    this._elements?.container.classList.toggle('refresh-container--dragging', isDragging)
  }

  private _setAnimation() {
    if (!this._elements)
      return

    this._elements.container.dataset.animation = this._getAnimationName()
    this._elements.container.dataset.icon = this._opts.animationIcon || 'auto'
    this._elements.container.style.setProperty('--unrefresh-animation-duration', `${this._getAnimationDuration()}ms`)

    if (!hasCustomLoadingImage(this._opts))
      this._elements.spinner.src = getRefreshAnimationIcon(this._getAnimationName(), this._opts.animationIcon)

    this._setFrame(this._status, this._distance, this._nextOffset)
  }

  private _getFrameElement(key: RefreshAnimationElementKey) {
    if (!this._elements)
      return undefined

    return this._elements[key]
  }

  private _clearCustomFrameStyles() {
    if (!this._elements)
      return

    for (const key of FRAME_ELEMENT_KEYS) {
      const element = this._getFrameElement(key)
      const properties = this._customFrameStyles[key]

      if (!element || !properties)
        continue

      properties.forEach(property => element.style.removeProperty(property))
      properties.clear()
    }

    this._customFrameVariables.forEach(variable => this._elements?.container.style.removeProperty(variable))
    this._customFrameVariables.clear()
  }

  private _formatFrameStyleValue(value: number | string) {
    return typeof value === 'number'
      ? String(value)
      : value
  }

  private _applyFrameStyle(
    key: RefreshAnimationElementKey,
    style: RefreshAnimationStyleMap | undefined,
  ) {
    if (!style)
      return

    const element = this._getFrameElement(key)
    if (!element)
      return

    const properties = this._customFrameStyles[key] || new Set<RefreshAnimationStyleProperty>()
    this._customFrameStyles[key] = properties

    for (const [property, value] of Object.entries(style) as Array<[RefreshAnimationStyleProperty, number | string]>) {
      element.style.setProperty(property, this._formatFrameStyleValue(value))
      properties.add(property)
    }
  }

  private _applyAnimationFrameResult(result: RefreshAnimationFrameResult | undefined) {
    if (!result || !this._elements)
      return

    this._applyFrameStyle('container', result.container)
    this._applyFrameStyle('top', result.top)
    this._applyFrameStyle('spinner', result.spinner)
    this._applyFrameStyle('text', result.text)

    if (!result.variables)
      return

    for (const [name, value] of Object.entries(result.variables)) {
      this._elements.container.style.setProperty(name, this._formatFrameStyleValue(value))
      this._customFrameVariables.add(name)
    }
  }

  private _resolveAnimationKeyframe(
    frames: readonly RefreshAnimationKeyframe[] | undefined,
    progress: number,
  ) {
    if (!frames?.length)
      return undefined

    const sortedFrames = [...frames].sort((a, b) => a.progress - b.progress)
    let selectedFrame = sortedFrames[0]

    for (const frame of sortedFrames) {
      if (frame.progress > progress)
        break

      selectedFrame = frame
    }

    return selectedFrame
  }

  private _applyCustomAnimationFrame(frame: RefreshAnimationFrame) {
    const customAnimation = this._getCustomAnimation()

    if (!customAnimation || !this._elements) {
      this._clearCustomFrameStyles()
      return
    }

    this._clearCustomFrameStyles()
    this._applyAnimationFrameResult(this._resolveAnimationKeyframe(customAnimation.frames, frame.progress))

    if (!customAnimation.onFrame)
      return

    const elements: RefreshAnimationFrameElements = this._elements
    const context: RefreshAnimationFrameContext = {
      elements,
      frame,
      setVariable: (name, value) => {
        this._elements?.container.style.setProperty(name, this._formatFrameStyleValue(value))
        this._customFrameVariables.add(name)
      },
    }

    try {
      const result = customAnimation.onFrame(context)

      if (result)
        this._applyAnimationFrameResult(result)
    }
    catch (error) {
      this._handleError(error)
    }
  }

  private _setFrame(status: RefreshStatus, distance: number, offset: number) {
    if (!this._elements)
      return

    const pullDownLength = this._getPullDownLength()
    const progress = Math.min(Math.max(distance / this._getPullDownLength(), 0), 1)
    const overflow = Math.max(distance - pullDownLength, 0)
    const overflowProgress = Math.min(overflow / pullDownLength, 1)
    const easedProgress = 1 - (1 - progress) ** 2
    const frameRotate = progress * 360 + overflowProgress * 120
    const frameCounterRotate = frameRotate * -0.35
    const frameScale = 1 + easedProgress * 0.12 + overflowProgress * 0.04
    const frameY = -(easedProgress * 8) + overflowProgress * 3
    const frameOrbit = 11 + easedProgress * 18 + overflowProgress * 4
    const frameFlip = progress * 180 + overflowProgress * 90
    const frameMagnet = Math.min(easedProgress + overflowProgress * 0.35, 1)
    const frameOpacity = 0.48 + progress * 0.52
    const framePulseScale = 0.82 + progress * 0.18
    const frameBorderAlpha = 0.08 + progress * 0.18
    const frameGlow = frameMagnet * 22
    const frameRingInset = -4 - progress * 7
    const frameRingScale = 0.78 + frameMagnet * 0.34
    const frameMagnetScale = 0.88 + frameMagnet * 0.18
    const frameShadow = 28 + progress * 8

    this._elements.container.dataset.status = status
    this._elements.container.style.setProperty('--unrefresh-progress', progress.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-distance', `${Math.round(distance)}px`)
    this._elements.container.style.setProperty('--unrefresh-offset', `${Math.round(offset)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-border-alpha', frameBorderAlpha.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-counter-rotate', `${Math.round(frameCounterRotate)}deg`)
    this._elements.container.style.setProperty('--unrefresh-frame-glow', `${frameGlow.toFixed(1)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-magnet-scale', frameMagnetScale.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-rotate', `${Math.round(frameRotate)}deg`)
    this._elements.container.style.setProperty('--unrefresh-frame-opacity', frameOpacity.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-scale', frameScale.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-pulse-scale', framePulseScale.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-ring-inset', `${frameRingInset.toFixed(1)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-ring-scale', frameRingScale.toFixed(3))
    this._elements.container.style.setProperty('--unrefresh-frame-shadow', `${frameShadow.toFixed(1)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-y', `${frameY.toFixed(1)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-orbit', `${frameOrbit.toFixed(1)}px`)
    this._elements.container.style.setProperty('--unrefresh-frame-flip', `${Math.round(frameFlip)}deg`)
    this._elements.container.style.setProperty('--unrefresh-frame-magnet', frameMagnet.toFixed(3))

    this._applyCustomAnimationFrame({
      distance,
      offset,
      overflow,
      overflowProgress,
      progress,
      pullDownLength,
      ready: this._readyToRefresh,
      refreshing: this._isRefreshing,
      status,
    })
  }

  private _setLoading(isLoading: boolean) {
    this._elements?.container.classList.toggle('refresh-container--loading', isLoading)
  }

  private _setResult(status?: 'error' | 'success') {
    this._elements?.container.classList.toggle('refresh-container--error', status === 'error')
    this._elements?.container.classList.toggle('refresh-container--success', status === 'success')
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
    if (this._elements) {
      this._elements.text.textContent = text
      this._elements.container.setAttribute('aria-label', text)
    }
  }

  private _vibrate(event: RefreshHapticEvent) {
    const pattern = this._getHapticPattern(event)

    if (pattern === false)
      return

    const targetNavigator = getTargetWindow(this._target)?.navigator
    const fallbackNavigator = isBrowser() ? window.navigator : undefined
    const currentNavigator = typeof navigator !== 'undefined' ? navigator : undefined
    const navigators = [targetNavigator, fallbackNavigator, currentNavigator]

    for (const item of navigators) {
      if (typeof item?.vibrate === 'function') {
        item.vibrate(pattern)
        return
      }
    }
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

export { createRefreshResource } from './resource'

export type {
  opts,
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
  RefreshHook,
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
  UnrefreshAppLike,
  UseRefreshApi,
  useApi,
} from './types'

export default Refresh
