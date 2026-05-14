import { createRefresh } from 'unrefresh/vanilla'

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
        <p class="eyebrow">Live API</p>
        <h1>Feed</h1>
      </div>
      <div class="status-pill" id="status">Loading</div>
    </header>

    <section class="feed-panel">
      <div class="feed" id="feed"></div>
    </section>
  </main>
`

const feed = document.querySelector<HTMLDivElement>('#feed')!
const status = document.querySelector<HTMLDivElement>('#status')!

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

function renderError(message: string) {
  const error = document.createElement('div')
  error.className = 'state-card error-card'
  error.textContent = message
  feed.replaceChildren(error)
}

function renderLoading() {
  const skeletons = Array.from({ length: 6 }, (_, index) => {
    const row = document.createElement('div')
    row.className = 'skeleton-card'
    row.style.animationDelay = `${index * 60}ms`
    return row
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

async function loadPosts(reason: 'initial' | 'refresh') {
  setStatus(reason === 'initial' ? 'Loading' : 'Refreshing', 'loading')

  if (reason === 'initial')
    renderLoading()

  try {
    const response = await fetch(`${API_URL}?_limit=8&_=${Date.now()}`)

    if (!response.ok)
      throw new Error(`Request failed with ${response.status}`)

    const posts = await response.json() as Post[]
    renderPosts(posts)
    setStatus(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load feed'
    renderError(message)
    setStatus('Failed', 'error')
    throw error
  }
}

createRefresh({
  target: document,
  pullDownLength: 96,
  bounce: true,
  bounceDuration: 420,
  initialText: '下拉刷新',
  releaseText: '松开更新',
  loadingText: '正在加载',
  onRefresh: () => loadPosts('refresh'),
  onError(error) {
    console.error(error)
  },
})

loadPosts('initial').catch(error => console.error(error))
