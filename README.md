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
  animation: 'magnetic',
  animationDuration: 720,
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
  cache: {
    key: 'feed',
    ttl: 5 * 60_000,
  },
  skeleton: {
    animation: 'shimmer',
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
      renderSkeleton(state.skeletonCount, state.skeletonVariant, state.skeletonAnimation)
    else if (state.status === 'error')
      renderError(state.error)
    else if (state.data)
      renderFeed(state.data)

    if (state.isCached)
      showCachedBadge()
  },
  onLoadSuccess(data) {
    console.log('Loaded items:', data.length)
  },
})

feed.reload({ force: true })
feed.cancel()
feed.clearCache()
feed.markStale()
feed.setOptions({
  animation: 'magnetic',
  animationDuration: 640,
  pullDownLength: 112,
  skeleton: {
    animation: 'wave',
    count: 4,
    variant: 'feed-card',
    when: 'empty',
  },
})
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
    async onRefresh({ signal }) {
      await reloadFeed(signal)
    },
  }, [])

  return <main ref={pageRef}>{/* feed */}</main>
}
```

For teams that prefer object-style hook configuration:

```tsx
import { useRefreshController } from 'unrefresh/react'

const refreshRef = useRefreshController({
  target: pageRef,
  options: {
    async onRefresh({ signal }) {
      await reloadFeed(signal)
    },
  },
  deps: [],
})
```

## Vue Injection

The Vue entry also exports `UNREFRESH_VUE_KEY` for apps that prefer explicit injection.

```ts
import { UNREFRESH_VUE_KEY } from 'unrefresh/vue'

app.provide(UNREFRESH_VUE_KEY, refresh)
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `animation` | `'spin' \| 'pulse' \| 'orbit' \| 'magnetic' \| 'bounce' \| 'flip' \| 'none'` | `spin` | Loading indicator animation preset. `magnetic` adds a more distinctive app-style snap, orbit, and ripple motion. Use `none` when your product owns the indicator animation. |
| `animationDuration` | `number` | `720` | Loading indicator animation duration in milliseconds. |
| `animationIcon` | `'auto' \| 'loop' \| 'dot' \| 'orbit' \| 'magnet' \| 'arrow' \| 'diamond' \| 'spark' \| 'bolt' \| 'arc'` | `auto` | Built-in loading icon style. `auto` picks a different icon for each animation preset. |
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
| `loadingImage` | `string` | built-in animation icon | Custom loading image URL. This overrides `animationIcon`. |
| `initialText` | `string` | `下拉刷新` | Text before release threshold. |
| `releaseText` | `string` | `释放刷新` | Text after release threshold. |
| `loadingText` | `string` | `加载中` | Text while refreshing. |
| `preventDefault` | `boolean` | `true` | Prevents native touch scrolling while pulling. |

Every animation preset has its own pull-frame format before loading starts. During a drag, `unrefresh` updates CSS variables such as `--unrefresh-progress`, `--unrefresh-distance`, `--unrefresh-frame-rotate`, `--unrefresh-frame-scale`, `--unrefresh-frame-orbit`, `--unrefresh-frame-flip`, and `--unrefresh-frame-magnet`. The built-in CSS maps those frame variables differently for `spin`, `pulse`, `orbit`, `magnetic`, `bounce`, and `flip`, so the indicator adapts to the current pull frame instead of using one generic transform.

Built-in animations also use different icon styles by default: loop, pulse dot, orbit, magnet, arrow, diamond, and spark variants. Use `animationIcon` to force a specific built-in icon, or `loadingImage` when you need a fully custom asset URL.

You can also provide a custom frame animation. `frames` are discrete progress keyframes, and `onFrame` can return per-frame styles or variables for fully custom interpolation:

```ts
createRefresh({
  animation: {
    name: 'elastic-arc',
    frames: [
      { progress: 0, spinner: { opacity: 0.4, transform: 'scale(0.72)' } },
      { progress: 0.5, spinner: { opacity: 0.8, transform: 'scale(0.96) rotate(72deg)' } },
      { progress: 1, spinner: { opacity: 1, transform: 'scale(1.12) rotate(180deg)' } },
    ],
    onFrame({ frame }) {
      return {
        top: {
          transform: `translateY(${(1 - frame.progress) * -8}px) scale(${1 + frame.progress * 0.1})`,
        },
        variables: {
          '--brand-refresh-progress': frame.progress.toFixed(3),
        },
      }
    },
  },
})
```

## Resource options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `auto` | `boolean` | `false` | Starts the first load on the next microtask after creation. |
| `cache` | `string \| object` | `undefined` | Hydrates data from local cache and writes successful loads back to storage. |
| `initialData` | `TData` | `undefined` | Data shown before the first real load. |
| `keepPreviousData` | `boolean` | `true` | Keeps existing data visible during reloads and failed refreshes. |
| `load` | `(context: RefreshContext) => TData \| Promise<TData>` | required | Data loader. Use `context.signal` with `fetch` for cancellation. |
| `onChange` | `(state: RefreshResourceState<TData>) => void` | `undefined` | Receives resource state updates. |
| `onLoadSuccess` | `(data, context) => void` | `undefined` | Runs after a successful load before state subscribers are notified. |
| `onLoadError` | `(error, context) => void` | `undefined` | Runs when all retry attempts have failed. |
| `retry` | `boolean \| number` | `0` | Retry failed loads. `true` means 2 retries. |
| `retryDelay` | `number \| (attempt, error) => number` | exponential | Delay between retry attempts in milliseconds. |
| `skeleton` | `boolean \| number \| object` | `{ animation: 'shimmer', count: 6, variant: 'default', when: 'empty' }` | Controls skeleton state during resource loading. |
| `staleTime` | `number` | `undefined` | Marks resource state as stale after the data age reaches this duration. |

Use `resource.setOptions()` to update refresh options, skeleton options, retry, stale time, and previous-data behavior at runtime. This is useful for design studios, settings panels, and product-specific tuning surfaces.

When `staleTime` is set, `reload()` can reuse fresh data. Use `reload({ force: true })` for manual refresh buttons or explicit user actions that should always hit the loader.

Skeleton options support `animation`, `count`, `enabled`, `variant`, and `when`. Use `animation: 'shimmer' | 'pulse' | 'wave' | 'none'` to match the loading style of the current page. Use `variant` to render page-specific skeletons such as `feed-card`, `message-row`, or `dashboard-tile` from your own UI layer. Use `when: 'empty'` for first-load skeletons only, or `when: 'loading'` when reloads with existing data should also expose skeleton state.

Cache options support `key`, `ttl`, and custom `storage`. When only a string is provided, it is used as the localStorage key. Cached data is ignored and removed after `ttl` expires.

Resource state includes `data`, `error`, `status`, `isLoading`, `isCached`, `cacheKey`, `isStale`, `showSkeleton`, `skeletonAnimation`, `skeletonCount`, `skeletonVariant`, `failureCount`, `updatedAt`, and the nested refresh gesture state.

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

The playground uses a real network request, refreshes live data, and includes a parameter studio for tuning pull distance, motion timing, rebound, skeleton animation, stale time, and haptics at runtime. The animation selector also includes `Custom Arc`, which is implemented with the same `frames` and `onFrame` custom animation API.

```bash
npm --prefix playground run dev
```

## Project Checks

Run the full local check before opening a pull request or cutting a release:

```bash
npm run check
```

## Release

GitHub releases are tag-driven. The release workflow validates the package, builds the playground, packs the npm tarball, attaches it to the GitHub Release, and publishes to npm when `NPM_TOKEN` is configured.

```bash
npm run release
```

The tag must match `package.json`, for example `v1.2.0` for version `1.2.0`. Publishing uses npm provenance through GitHub Actions, so the repository needs `NPM_TOKEN` in GitHub secrets.

For a manual local npm publish, use:

```bash
npm publish --access public
```

Provenance is intentionally enabled only in the GitHub Actions release workflow. Local terminals do not provide a supported provenance provider, so `npm publish --provenance` can fail with `Automatic provenance generation not supported for provider: null`.

Release notes are tracked in [`CHANGELOG.md`](./CHANGELOG.md). GitHub's generated release notes are grouped by `.github/release.yml`.

## License

[MIT](./LICENSE) License © 2022 [Song wuk](https://github.com/songwuk)
