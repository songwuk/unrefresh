import { createRefreshResource } from 'unrefresh/resource'
import type { RefreshResourceState } from 'unrefresh/resource'
import type {
  RefreshAnimation,
  RefreshAnimationIconPreset,
  RefreshAnimationPreset,
  RefreshSkeletonAnimation,
  RefreshState,
} from 'unrefresh/vanilla'

import './style.css'
import 'unrefresh/css'

interface Post {
  body: string
  id: number
  title: string
  userId: number
}

const API_URL = 'https://jsonplaceholder.typicode.com/posts'

type StudioAnimationChoice = RefreshAnimationPreset | 'custom-arc'

const animationChoices: StudioAnimationChoice[] = ['spin', 'pulse', 'orbit', 'magnetic', 'bounce', 'flip', 'custom-arc', 'none']
const iconChoices: RefreshAnimationIconPreset[] = ['auto', 'loop', 'dot', 'orbit', 'magnet', 'arrow', 'diamond', 'spark', 'bolt', 'arc']
const skeletonAnimations: RefreshSkeletonAnimation[] = ['shimmer', 'pulse', 'wave', 'none']

interface StudioSettings {
  animation: StudioAnimationChoice
  animationDuration: number
  animationIcon: RefreshAnimationIconPreset
  bounce: boolean
  bounceDuration: number
  completeDuration: number
  haptics: boolean
  minLoadingDuration: number
  pullDownLength: number
  skeletonAnimation: RefreshSkeletonAnimation
  skeletonCount: number
  staleTime: number
}

const defaultStudioSettings: StudioSettings = {
  animation: 'magnetic',
  animationDuration: 720,
  animationIcon: 'auto',
  bounce: true,
  bounceDuration: 420,
  completeDuration: 460,
  haptics: true,
  minLoadingDuration: 520,
  pullDownLength: 96,
  skeletonAnimation: 'shimmer',
  skeletonCount: 6,
  staleTime: 30,
}

let studioSettings: StudioSettings = { ...defaultStudioSettings }

function formatOptionLabel(value: string) {
  return value
    .split('-')
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function createSelectOptions(values: readonly string[], selected: string) {
  return values
    .map(value => `<option value="${value}"${value === selected ? ' selected' : ''}>${formatOptionLabel(value)}</option>`)
    .join('')
}

function resolveStudioAnimation(animation: StudioAnimationChoice): RefreshAnimation {
  if (animation !== 'custom-arc')
    return animation

  return {
    frames: [
      {
        progress: 0,
        top: { opacity: 0.72, transform: 'scale(0.86)' },
      },
      {
        progress: 0.5,
        top: { opacity: 0.9, transform: 'translateY(-4px) scale(1.02)' },
      },
      {
        progress: 1,
        top: { opacity: 1, transform: 'translateY(-7px) scale(1.12)' },
      },
    ],
    name: 'custom-arc',
    onFrame({ frame }) {
      const arc = Math.sin(frame.progress * Math.PI)
      const rotate = Math.round(frame.progress * 270 + arc * 36)

      return {
        spinner: {
          transform: `rotate(${rotate}deg) scale(${(0.82 + frame.progress * 0.24).toFixed(3)})`,
        },
        variables: {
          '--studio-custom-arc': arc.toFixed(3),
        },
      }
    },
  }
}

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <main class="app-shell">
    <header class="top-bar">
      <div>
        <p class="eyebrow">Live API Resource</p>
        <h1>Feed</h1>
      </div>
      <div class="status-pill" id="status">Loading</div>
    </header>

    <section class="refresh-console" aria-label="Refresh controls">
      <div class="console-grid">
        <div class="console-metric">
          <span>Gesture</span>
          <strong id="refresh-state">Idle</strong>
        </div>
        <div class="console-metric">
          <span>Pull</span>
          <strong id="refresh-progress">0%</strong>
        </div>
        <div class="console-metric">
          <span>Resource</span>
          <strong id="resource-state">Idle</strong>
        </div>
        <div class="console-metric">
          <span>Updated</span>
          <strong id="updated-at">Never</strong>
        </div>
      </div>
      <div class="progress-track" aria-hidden="true">
        <span id="refresh-progress-bar"></span>
      </div>
      <div class="control-row">
        <button class="control-button primary" id="manual-refresh" type="button">Refresh</button>
        <button class="control-button" id="cancel-refresh" type="button" disabled>Cancel</button>
        <button class="control-button" id="toggle-gestures" type="button">Disable</button>
        <button class="control-button" id="cycle-animation" type="button">Spin</button>
      </div>
    </section>

    <section class="studio-panel" aria-label="Refresh parameter studio">
      <div class="studio-header">
        <div>
          <p class="eyebrow">Parameter Studio</p>
          <h2>Refresh feel</h2>
        </div>
        <button class="control-button" id="reset-studio" type="button">Reset</button>
      </div>

      <div class="studio-grid">
        <label class="studio-field">
          <span>Animation</span>
          <select id="studio-animation">${createSelectOptions(animationChoices, studioSettings.animation)}</select>
        </label>

        <label class="studio-field">
          <span>Icon</span>
          <select id="studio-animation-icon">${createSelectOptions(iconChoices, studioSettings.animationIcon)}</select>
        </label>

        <label class="studio-field">
          <span>Skeleton</span>
          <select id="studio-skeleton-animation">${createSelectOptions(skeletonAnimations, studioSettings.skeletonAnimation)}</select>
        </label>

        <label class="studio-field studio-field--range">
          <span>Pull <output id="studio-pull-value"></output></span>
          <input id="studio-pull" type="range" min="48" max="160" step="4">
        </label>

        <label class="studio-field studio-field--range">
          <span>Motion <output id="studio-animation-duration-value"></output></span>
          <input id="studio-animation-duration" type="range" min="240" max="1600" step="40">
        </label>

        <label class="studio-field studio-field--range">
          <span>Bounce <output id="studio-bounce-duration-value"></output></span>
          <input id="studio-bounce-duration" type="range" min="0" max="1000" step="20">
        </label>

        <label class="studio-field studio-field--range">
          <span>Complete <output id="studio-complete-duration-value"></output></span>
          <input id="studio-complete-duration" type="range" min="0" max="1200" step="20">
        </label>

        <label class="studio-field studio-field--range">
          <span>Minimum <output id="studio-min-loading-value"></output></span>
          <input id="studio-min-loading" type="range" min="0" max="1200" step="20">
        </label>

        <label class="studio-field studio-field--range">
          <span>Skeletons <output id="studio-skeleton-count-value"></output></span>
          <input id="studio-skeleton-count" type="range" min="0" max="10" step="1">
        </label>

        <label class="studio-field studio-field--range">
          <span>Freshness <output id="studio-stale-time-value"></output></span>
          <input id="studio-stale-time" type="range" min="0" max="120" step="5">
        </label>

        <label class="studio-toggle">
          <input id="studio-bounce" type="checkbox">
          <span>Bounce lock</span>
        </label>

        <label class="studio-toggle">
          <input id="studio-haptics" type="checkbox">
          <span>Haptics</span>
        </label>
      </div>
    </section>

    <section class="feed-panel">
      <div class="feed" id="feed"></div>
    </section>
  </main>
`

const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-refresh')!
const cycleAnimationButton = document.querySelector<HTMLButtonElement>('#cycle-animation')!
const feed = document.querySelector<HTMLDivElement>('#feed')!
const resourceState = document.querySelector<HTMLElement>('#resource-state')!
const manualRefreshButton = document.querySelector<HTMLButtonElement>('#manual-refresh')!
const progressBar = document.querySelector<HTMLSpanElement>('#refresh-progress-bar')!
const refreshProgress = document.querySelector<HTMLElement>('#refresh-progress')!
const refreshState = document.querySelector<HTMLElement>('#refresh-state')!
const status = document.querySelector<HTMLDivElement>('#status')!
const toggleGesturesButton = document.querySelector<HTMLButtonElement>('#toggle-gestures')!
const updatedAt = document.querySelector<HTMLElement>('#updated-at')!
const resetStudioButton = document.querySelector<HTMLButtonElement>('#reset-studio')!
const studioAnimationDurationInput = document.querySelector<HTMLInputElement>('#studio-animation-duration')!
const studioAnimationDurationValue = document.querySelector<HTMLOutputElement>('#studio-animation-duration-value')!
const studioAnimationIconSelect = document.querySelector<HTMLSelectElement>('#studio-animation-icon')!
const studioAnimationSelect = document.querySelector<HTMLSelectElement>('#studio-animation')!
const studioBounceCheckbox = document.querySelector<HTMLInputElement>('#studio-bounce')!
const studioBounceDurationInput = document.querySelector<HTMLInputElement>('#studio-bounce-duration')!
const studioBounceDurationValue = document.querySelector<HTMLOutputElement>('#studio-bounce-duration-value')!
const studioCompleteDurationInput = document.querySelector<HTMLInputElement>('#studio-complete-duration')!
const studioCompleteDurationValue = document.querySelector<HTMLOutputElement>('#studio-complete-duration-value')!
const studioHapticsCheckbox = document.querySelector<HTMLInputElement>('#studio-haptics')!
const studioMinLoadingInput = document.querySelector<HTMLInputElement>('#studio-min-loading')!
const studioMinLoadingValue = document.querySelector<HTMLOutputElement>('#studio-min-loading-value')!
const studioPullInput = document.querySelector<HTMLInputElement>('#studio-pull')!
const studioPullValue = document.querySelector<HTMLOutputElement>('#studio-pull-value')!
const studioSkeletonAnimationSelect = document.querySelector<HTMLSelectElement>('#studio-skeleton-animation')!
const studioSkeletonCountInput = document.querySelector<HTMLInputElement>('#studio-skeleton-count')!
const studioSkeletonCountValue = document.querySelector<HTMLOutputElement>('#studio-skeleton-count-value')!
const studioStaleTimeInput = document.querySelector<HTMLInputElement>('#studio-stale-time')!
const studioStaleTimeValue = document.querySelector<HTMLOutputElement>('#studio-stale-time-value')!

let gesturesEnabled = true
let lastRenderedData: Post[] | undefined
let lastRenderedError: unknown
let animationIndex = animationChoices.indexOf(studioSettings.animation)

const stateLabels: Record<RefreshState['status'], string> = {
  error: 'Error',
  idle: 'Idle',
  pulling: 'Pulling',
  ready: 'Ready',
  refreshing: 'Refreshing',
  success: 'Success',
}

const resourceLabels: Record<RefreshResourceState<Post[]>['status'], string> = {
  error: 'Error',
  idle: 'Idle',
  loading: 'Loading',
  success: 'Ready',
}

function createPostCard(post: Post) {
  const card = document.createElement('article')
  card.className = 'post-card'

  const meta = document.createElement('div')
  meta.className = 'post-meta'
  meta.textContent = `User ${post.userId} · #${post.id}`

  const title = document.createElement('h2')
  title.textContent = post.title

  const body = document.createElement('p')
  body.textContent = post.body

  card.append(meta, title, body)

  return card
}

function formatUpdatedAt(value?: number) {
  if (!value)
    return 'Never'

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderError(message: string) {
  const error = document.createElement('div')
  error.className = 'state-card error-card'
  error.textContent = message
  feed.replaceChildren(error)
}

function createFeedCardSkeleton(index: number, animation: RefreshSkeletonAnimation) {
  const card = document.createElement('article')
  card.className = `skeleton-card skeleton-card--feed skeleton-card--${animation}`
  card.setAttribute('aria-hidden', 'true')
  card.style.animationDelay = `${index * 60}ms`

  const meta = document.createElement('div')
  meta.className = 'skeleton-meta'

  const title = document.createElement('div')
  title.className = 'skeleton-title'

  const body = document.createElement('div')
  body.className = 'skeleton-body'

  const bodySecondLine = document.createElement('div')
  bodySecondLine.className = 'skeleton-body skeleton-body--short'

  card.append(meta, title, body, bodySecondLine)

  return card
}

function renderLoading(count: number, variant: string, animation: RefreshSkeletonAnimation) {
  const skeletons = Array.from({ length: count }, (_, index) => {
    if (variant === 'feed-card')
      return createFeedCardSkeleton(index, animation)

    const card = document.createElement('div')
    card.className = `skeleton-card skeleton-card--${animation}`
    card.setAttribute('aria-hidden', 'true')
    card.style.animationDelay = `${index * 60}ms`
    return card
  })

  feed.replaceChildren(...skeletons)
}

function renderPosts(posts: Post[]) {
  feed.replaceChildren(...posts.map(createPostCard))
}

function setStatus(text: string, mode: 'idle' | 'loading' | 'error' = 'idle') {
  status.textContent = text
  status.dataset.mode = mode
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function updateRefreshConsole(state: RefreshState) {
  const progress = Math.round(state.progress * 100)

  refreshState.textContent = stateLabels[state.status]
  refreshProgress.textContent = `${progress}%`
  progressBar.style.transform = `scaleX(${state.progress})`
  cancelButton.disabled = state.status !== 'refreshing'
  manualRefreshButton.disabled = state.status === 'refreshing'
}

function setGesturesEnabled(enabled: boolean) {
  gesturesEnabled = enabled
  toggleGesturesButton.textContent = enabled ? 'Disable' : 'Enable'
}

function setAnimationPreset(animation: StudioAnimationChoice) {
  updateStudioSettings({ animation })
}

function formatMs(value: number) {
  return `${value}ms`
}

function syncStudioControls() {
  cycleAnimationButton.textContent = formatOptionLabel(studioSettings.animation)
  studioAnimationIconSelect.value = studioSettings.animationIcon
  studioAnimationSelect.value = studioSettings.animation
  studioSkeletonAnimationSelect.value = studioSettings.skeletonAnimation

  studioPullInput.value = String(studioSettings.pullDownLength)
  studioPullValue.value = `${studioSettings.pullDownLength}px`

  studioAnimationDurationInput.value = String(studioSettings.animationDuration)
  studioAnimationDurationValue.value = formatMs(studioSettings.animationDuration)

  studioBounceDurationInput.value = String(studioSettings.bounceDuration)
  studioBounceDurationValue.value = formatMs(studioSettings.bounceDuration)

  studioCompleteDurationInput.value = String(studioSettings.completeDuration)
  studioCompleteDurationValue.value = formatMs(studioSettings.completeDuration)

  studioMinLoadingInput.value = String(studioSettings.minLoadingDuration)
  studioMinLoadingValue.value = formatMs(studioSettings.minLoadingDuration)

  studioSkeletonCountInput.value = String(studioSettings.skeletonCount)
  studioSkeletonCountValue.value = String(studioSettings.skeletonCount)

  studioStaleTimeInput.value = String(studioSettings.staleTime)
  studioStaleTimeValue.value = studioSettings.staleTime === 0 ? 'Off' : `${studioSettings.staleTime}s`

  studioBounceCheckbox.checked = studioSettings.bounce
  studioHapticsCheckbox.checked = studioSettings.haptics
}

function applyStudioSettings() {
  feedResource.setOptions({
    animation: resolveStudioAnimation(studioSettings.animation),
    animationDuration: studioSettings.animationDuration,
    animationIcon: studioSettings.animationIcon,
    bounce: studioSettings.bounce,
    bounceDuration: studioSettings.bounceDuration,
    completeDuration: studioSettings.completeDuration,
    haptics: studioSettings.haptics,
    minLoadingDuration: studioSettings.minLoadingDuration,
    pullDownLength: studioSettings.pullDownLength,
    skeleton: {
      animation: studioSettings.skeletonAnimation,
      count: studioSettings.skeletonCount,
      enabled: studioSettings.skeletonCount > 0,
      variant: 'feed-card',
      when: 'empty',
    },
    staleTime: studioSettings.staleTime > 0 ? studioSettings.staleTime * 1000 : undefined,
  })
}

function updateStudioSettings(nextSettings: Partial<StudioSettings>) {
  studioSettings = {
    ...studioSettings,
    ...nextSettings,
  }
  animationIndex = animationChoices.indexOf(studioSettings.animation)
  syncStudioControls()
  applyStudioSettings()
}

function renderResourceState(state: RefreshResourceState<Post[]>) {
  updateRefreshConsole(state.refresh)
  resourceState.textContent = gesturesEnabled
    ? state.isCached ? 'Cached' : resourceLabels[state.status]
    : 'Gestures off'
  updatedAt.textContent = formatUpdatedAt(state.updatedAt)

  if (state.status === 'loading') {
    setStatus(state.data ? 'Refreshing' : 'Loading', 'loading')

    if (state.showSkeleton) {
      renderLoading(state.skeletonCount, state.skeletonVariant, state.skeletonAnimation)
      lastRenderedData = state.data
    }

    return
  }

  if (state.status === 'error') {
    const message = state.error instanceof Error ? state.error.message : 'Unable to load feed'
    setStatus('Failed', 'error')

    if (!state.data && lastRenderedError !== state.error) {
      renderError(message)
      lastRenderedError = state.error
    }

    return
  }

  if (state.data && state.data !== lastRenderedData) {
    renderPosts(state.data)
    lastRenderedData = state.data
    lastRenderedError = undefined
  }

  setStatus(state.isCached ? 'Cached' : formatUpdatedAt(state.updatedAt))
}

async function fetchPosts(signal: AbortSignal) {
  const response = await fetch(`${API_URL}?_limit=8&_=${Date.now()}`, { signal })

  if (!response.ok)
    throw new Error(`Request failed with ${response.status}`)

  return await response.json() as Post[]
}

const feedResource = createRefreshResource<Post[]>({
  auto: true,
  cache: {
    key: 'unrefresh:playground:feed',
    ttl: 5 * 60_000,
  },
  skeleton: {
    animation: studioSettings.skeletonAnimation,
    count: studioSettings.skeletonCount,
    variant: 'feed-card',
    when: 'empty',
  },
  target: document,
  pullDownLength: studioSettings.pullDownLength,
  bounce: studioSettings.bounce,
  bounceDuration: studioSettings.bounceDuration,
  completeDuration: studioSettings.completeDuration,
  haptics: studioSettings.haptics,
  animation: resolveStudioAnimation(studioSettings.animation),
  animationDuration: studioSettings.animationDuration,
  animationIcon: studioSettings.animationIcon,
  successText: '更新完成',
  errorText: '更新失败',
  minLoadingDuration: studioSettings.minLoadingDuration,
  mouse: true,
  retry: 1,
  retryDelay: 300,
  staleTime: studioSettings.staleTime * 1000,
  initialText: '下拉刷新',
  releaseText: '松开更新',
  loadingText: '正在加载',
  load: ({ signal }) => fetchPosts(signal),
  onChange: renderResourceState,
  onError(error) {
    if (!isAbortError(error))
      console.error(error)
  },
})

feedResource.controller.on('refreshcancel', () => {
  setStatus('Cancelled')
})

manualRefreshButton.addEventListener('click', () => {
  feedResource.reload({ force: true }).catch((error) => {
    if (!isAbortError(error))
      console.error(error)
  })
})

cancelButton.addEventListener('click', () => {
  feedResource.cancel()
})

toggleGesturesButton.addEventListener('click', () => {
  if (gesturesEnabled) {
    feedResource.controller.disable()
    setGesturesEnabled(false)
    renderResourceState(feedResource.getState())
    return
  }

  feedResource.controller.enable()
  setGesturesEnabled(true)
  renderResourceState(feedResource.getState())
})

cycleAnimationButton.addEventListener('click', () => {
  animationIndex = (animationIndex + 1) % animationChoices.length
  setAnimationPreset(animationChoices[animationIndex])
})

studioAnimationSelect.addEventListener('change', () => {
  setAnimationPreset(studioAnimationSelect.value as StudioAnimationChoice)
})

studioAnimationIconSelect.addEventListener('change', () => {
  updateStudioSettings({
    animationIcon: studioAnimationIconSelect.value as RefreshAnimationIconPreset,
  })
})

studioSkeletonAnimationSelect.addEventListener('change', () => {
  updateStudioSettings({
    skeletonAnimation: studioSkeletonAnimationSelect.value as RefreshSkeletonAnimation,
  })
})

studioPullInput.addEventListener('input', () => {
  updateStudioSettings({
    pullDownLength: Number(studioPullInput.value),
  })
})

studioAnimationDurationInput.addEventListener('input', () => {
  updateStudioSettings({
    animationDuration: Number(studioAnimationDurationInput.value),
  })
})

studioBounceDurationInput.addEventListener('input', () => {
  updateStudioSettings({
    bounceDuration: Number(studioBounceDurationInput.value),
  })
})

studioCompleteDurationInput.addEventListener('input', () => {
  updateStudioSettings({
    completeDuration: Number(studioCompleteDurationInput.value),
  })
})

studioMinLoadingInput.addEventListener('input', () => {
  updateStudioSettings({
    minLoadingDuration: Number(studioMinLoadingInput.value),
  })
})

studioSkeletonCountInput.addEventListener('input', () => {
  updateStudioSettings({
    skeletonCount: Number(studioSkeletonCountInput.value),
  })
})

studioStaleTimeInput.addEventListener('input', () => {
  updateStudioSettings({
    staleTime: Number(studioStaleTimeInput.value),
  })
})

studioBounceCheckbox.addEventListener('change', () => {
  updateStudioSettings({
    bounce: studioBounceCheckbox.checked,
  })
})

studioHapticsCheckbox.addEventListener('change', () => {
  updateStudioSettings({
    haptics: studioHapticsCheckbox.checked,
  })
})

resetStudioButton.addEventListener('click', () => {
  updateStudioSettings(defaultStudioSettings)
})

setGesturesEnabled(true)
syncStudioControls()
applyStudioSettings()
renderResourceState(feedResource.getState())
