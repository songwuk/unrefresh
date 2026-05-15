import { createRefreshResource } from 'unrefresh/resource'
import type { RefreshResourceState } from 'unrefresh/resource'
import type { RefreshState } from 'unrefresh/vanilla'

import './style.css'
import 'unrefresh/css'

interface Post {
  body: string
  id: number
  title: string
  userId: number
}

const API_URL = 'https://jsonplaceholder.typicode.com/posts'

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
      </div>
    </section>

    <section class="feed-panel">
      <div class="feed" id="feed"></div>
    </section>
  </main>
`

const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-refresh')!
const feed = document.querySelector<HTMLDivElement>('#feed')!
const resourceState = document.querySelector<HTMLElement>('#resource-state')!
const manualRefreshButton = document.querySelector<HTMLButtonElement>('#manual-refresh')!
const progressBar = document.querySelector<HTMLSpanElement>('#refresh-progress-bar')!
const refreshProgress = document.querySelector<HTMLElement>('#refresh-progress')!
const refreshState = document.querySelector<HTMLElement>('#refresh-state')!
const status = document.querySelector<HTMLDivElement>('#status')!
const toggleGesturesButton = document.querySelector<HTMLButtonElement>('#toggle-gestures')!
const updatedAt = document.querySelector<HTMLElement>('#updated-at')!

let gesturesEnabled = true
let lastRenderedData: Post[] | undefined
let lastRenderedError: unknown

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

function createFeedCardSkeleton(index: number) {
  const card = document.createElement('article')
  card.className = 'skeleton-card skeleton-card--feed'
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

function renderLoading(count: number, variant: string) {
  const skeletons = Array.from({ length: count }, (_, index) => {
    if (variant === 'feed-card')
      return createFeedCardSkeleton(index)

    const card = document.createElement('div')
    card.className = 'skeleton-card'
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

function renderResourceState(state: RefreshResourceState<Post[]>) {
  updateRefreshConsole(state.refresh)
  resourceState.textContent = gesturesEnabled
    ? resourceLabels[state.status]
    : 'Gestures off'
  updatedAt.textContent = formatUpdatedAt(state.updatedAt)

  if (state.status === 'loading') {
    setStatus(state.data ? 'Refreshing' : 'Loading', 'loading')

    if (state.showSkeleton) {
      renderLoading(state.skeletonCount, state.skeletonVariant)
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

  setStatus(formatUpdatedAt(state.updatedAt))
}

async function fetchPosts(signal: AbortSignal) {
  const response = await fetch(`${API_URL}?_limit=8&_=${Date.now()}`, { signal })

  if (!response.ok)
    throw new Error(`Request failed with ${response.status}`)

  return await response.json() as Post[]
}

const feedResource = createRefreshResource<Post[]>({
  auto: true,
  skeleton: {
    count: 6,
    variant: 'feed-card',
    when: 'empty',
  },
  target: document,
  pullDownLength: 96,
  bounce: true,
  bounceDuration: 420,
  completeDuration: 460,
  haptics: true,
  successText: '更新完成',
  errorText: '更新失败',
  minLoadingDuration: 520,
  mouse: true,
  retry: 1,
  retryDelay: 300,
  staleTime: 30_000,
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

setGesturesEnabled(true)
renderResourceState(feedResource.getState())
