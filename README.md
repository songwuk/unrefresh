<p align="center">
  <img src="./assets/unrefresh-logo.gif" width="148" alt="unrefresh animated logo">
</p>

<h1 align="center">unrefresh</h1>

<p align="center">
  Universal pull-to-refresh for vanilla JavaScript, Vue, and React.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/unrefresh"><img src="https://img.shields.io/npm/v/unrefresh?color=2563eb&label=npm" alt="NPM version"></a>
</p>

<p align="center">
  English | <a href="./README.zh-CN.md">简体中文</a>
</p>

## Install

```bash
npm install unrefresh
```

Import the stylesheet once in your app entry:

```ts
import 'unrefresh/css'
```

## Vanilla JS

```ts
import { createRefresh } from 'unrefresh/vanilla'
import 'unrefresh/css'

const refresh = createRefresh({
  target: document,
  pullDownLength: 96,
  bounce: true,
  completeDuration: 460,
  haptics: true,
  minLoadingDuration: 520,
  mouse: true,
  onStateChange(state) {
    updateRefreshIndicator(state.status, state.progress)
  },
  async onRefresh({ signal }) {
    const response = await fetch('/api/feed', { signal })
    const feed = await response.json()
    renderFeed(feed)
  },
})

refreshButton.addEventListener('click', () => {
  refresh.refresh()
})

cancelButton.addEventListener('click', () => {
  refresh.cancel()
})

let gesturesEnabled = true

toggleButton.addEventListener('click', () => {
  gesturesEnabled = !gesturesEnabled

  if (gesturesEnabled)
    refresh.enable()
  else
    refresh.disable()
})

// Later, when the page or component is removed:
refresh.destroy()
```

## Resource data layer

For feed, inbox, timeline, and dashboard screens, use `unrefresh/resource` to bind pull-to-refresh directly to real data loading. It owns loading, error, cancellation, and latest-data state while still exposing the underlying refresh controller.

```ts
import { createRefreshResource } from 'unrefresh/resource'
import 'unrefresh/css'

const feed = createRefreshResource({
  auto: true,
  skeleton: {
    count: 6,
    variant: 'feed-card',
    when: 'empty',
  },
  target: document,
  pullDownLength: 96,
  bounce: true,
  completeDuration: 460,
  minLoadingDuration: 520,
  retry: 1,
  retryDelay: 300,
  staleTime: 30_000,
  async load({ signal }) {
    const response = await fetch('/api/feed', { signal })
    return await response.json()
  },
  onChange(state) {
    if (state.showSkeleton)
      renderSkeleton(state.skeletonCount, state.skeletonVariant)
    else if (state.status === 'error')
      renderError(state.error)
    else if (state.data)
      renderFeed(state.data)
  },
  onLoadSuccess(data) {
    console.log('Loaded items:', data.length)
  },
})

feed.reload({ force: true })
feed.cancel()
feed.markStale()
feed.controller.disable()
feed.controller.enable()
```

Runtime controls are chainable:

```ts
refresh.disable()
refresh.enable()
refresh.cancel()
refresh.setOptions({ pullDownLength: 120, bounceDuration: 360 })
refresh.refresh()
```

The refresh controller also exposes lifecycle events:

```ts
const unsubscribe = refresh.subscribe(state => {
  updateRefreshIndicator(state.status, state.progress)
})

refresh.on('refreshcomplete', state => {
  console.log('Updated at', state.status)
})

unsubscribe()
```

The constructor API is also available:

```ts
import Refresh from 'unrefresh'

const refresh = new Refresh(document.body, 96).init({
  onRefresh: reloadData,
})
```

## Vue

`unrefresh/vue` exports a Vue-compatible plugin without bundling Vue.

```ts
import UnrefreshVuePlugin from 'unrefresh/vue'
import { createApp } from 'vue'
import 'unrefresh/css'

createApp(App).use(UnrefreshVuePlugin, {
  target: document,
  async onRefresh() {
    await reloadData()
  },
})
```

You can also create a preconfigured plugin:

```ts
import { createUnrefreshVuePlugin } from 'unrefresh/vue'

export const RefreshPlugin = createUnrefreshVuePlugin({
  pullDownLength: 96,
  loadingText: '正在加载',
})
```

## React

`unrefresh/react` exports a hook. React is an optional peer dependency and is only needed when this entry is imported.

```tsx
import { useRef } from 'react'
import { useRefresh } from 'unrefresh/react'
import 'unrefresh/css'

export function Feed() {
  const pageRef = useRef<HTMLElement | null>(null)

  useRefresh(pageRef, {
    async onRefresh() {
      await reloadFeed()
    },
  }, [])

  return <main ref={pageRef}>{/* feed */}</main>
}
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ariaLive` | `'polite' \| 'assertive' \| 'off'` | `polite` | Screen reader live-region mode for status text. |
| `target` / `dom` | `HTMLElement \| Document` | `document.documentElement` | Element that receives touch events. |
| `pullDownLength` | `number` | `80` | Pull distance required to trigger refresh. |
| `bounce` | `boolean` | `true` | Enables the spring-like rebound when refresh locks into the loading position. |
| `bounceDuration` | `number` | `420` | Refresh rebound transition duration in milliseconds. |
| `completeDuration` | `number` | `0` | Time to show success or error feedback before hiding. |
| `disabled` | `boolean` | `false` | Disables touch gestures without removing the instance. |
| `successText` | `string` | `刷新成功` | Text shown after a successful refresh when `completeDuration` is enabled. |
| `errorText` | `string` | `刷新失败` | Text shown after a failed refresh when `completeDuration` is enabled. |
| `haptics` | `boolean \| object` | `false` | Enables vibration feedback for ready, success, error, or refreshing states. |
| `minLoadingDuration` | `number` | `0` | Minimum visible loading time in milliseconds. |
| `mouse` | `boolean` | `false` | Enables mouse dragging for desktop demos and testing. |
| `onRefresh` | `(context: RefreshContext) => void \| Promise<void>` | `undefined` | Refresh callback. Use `context.signal` to cancel fetches on destroy or `cancel()`. |
| `onError` | `(error: unknown) => void` | `undefined` | Handles rejected refresh callbacks from touch events. |
| `onStateChange` | `(state: RefreshState) => void` | `undefined` | Receives `idle`, `pulling`, `ready`, `refreshing`, `success`, and `error` updates. |
| `loadingImage` | `string` | built-in SVG | Custom loading image URL. |
| `initialText` | `string` | `下拉刷新` | Text before release threshold. |
| `releaseText` | `string` | `释放刷新` | Text after release threshold. |
| `loadingText` | `string` | `加载中` | Text while refreshing. |
| `preventDefault` | `boolean` | `true` | Prevents native touch scrolling while pulling. |

## Resource options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `auto` | `boolean` | `false` | Starts the first load on the next microtask after creation. |
| `initialData` | `TData` | `undefined` | Data shown before the first real load. |
| `keepPreviousData` | `boolean` | `true` | Keeps existing data visible during reloads and failed refreshes. |
| `load` | `(context: RefreshContext) => TData \| Promise<TData>` | required | Data loader. Use `context.signal` with `fetch` for cancellation. |
| `onChange` | `(state: RefreshResourceState<TData>) => void` | `undefined` | Receives resource state updates. |
| `onLoadSuccess` | `(data, context) => void` | `undefined` | Runs after a successful load before state subscribers are notified. |
| `onLoadError` | `(error, context) => void` | `undefined` | Runs when all retry attempts have failed. |
| `retry` | `boolean \| number` | `0` | Retry failed loads. `true` means 2 retries. |
| `retryDelay` | `number \| (attempt, error) => number` | exponential | Delay between retry attempts in milliseconds. |
| `skeleton` | `boolean \| number \| object` | `{ count: 6, variant: 'default', when: 'empty' }` | Controls skeleton state during resource loading. |
| `staleTime` | `number` | `undefined` | Marks resource state as stale after the data age reaches this duration. |

When `staleTime` is set, `reload()` can reuse fresh data. Use `reload({ force: true })` for manual refresh buttons or explicit user actions that should always hit the loader.

Skeleton options support `count`, `enabled`, `variant`, and `when`. Use `variant` to render page-specific skeletons such as `feed-card`, `message-row`, or `dashboard-tile` from your own UI layer. Use `when: 'empty'` for first-load skeletons only, or `when: 'loading'` when reloads with existing data should also expose skeleton state.

Resource state includes `data`, `error`, `status`, `isLoading`, `isStale`, `showSkeleton`, `skeletonCount`, `skeletonVariant`, `failureCount`, `updatedAt`, and the nested refresh gesture state.

## Exports

| Export | Use case |
| --- | --- |
| `unrefresh` | Default universal entry. |
| `unrefresh/vanilla` | Vanilla JavaScript helpers. |
| `unrefresh/resource` | Framework-agnostic data loading resource. |
| `unrefresh/vue` | Vue plugin adapter. |
| `unrefresh/react` | React hook adapter. |
| `unrefresh/css` | Required styles. |
| `unrefresh/assets/logo.svg` | Static logo asset. |
| `unrefresh/assets/logo.gif` | Animated logo asset. |

## Logo

The logo assets live in [`assets`](./assets):

- [`unrefresh-logo.svg`](./assets/unrefresh-logo.svg) for static usage.
- [`unrefresh-logo.gif`](./assets/unrefresh-logo.gif) for animated usage.

## Demo

The playground uses a real network request and refreshes live data:

```bash
npm --prefix playground run dev
```

## Release

GitHub releases are tag-driven. The release workflow validates the package, builds the playground, packs the npm tarball, attaches it to the GitHub Release, and publishes to npm when `NPM_TOKEN` is configured.

```bash
npm run release
```

The tag must match `package.json`, for example `v1.0.0` for version `1.0.0`. Publishing uses npm provenance through GitHub Actions, so the repository needs `NPM_TOKEN` in GitHub secrets.

Release notes are tracked in [`CHANGELOG.md`](./CHANGELOG.md). GitHub's generated release notes are grouped by `.github/release.yml`.

## License

[MIT](./LICENSE) License © 2022 [Song wuk](https://github.com/songwuk)
