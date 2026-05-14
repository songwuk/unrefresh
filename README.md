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
  async onRefresh() {
    const response = await fetch('/api/feed')
    const feed = await response.json()
    renderFeed(feed)
  },
})

// Later, when the page or component is removed:
refresh.destroy()
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
| `target` / `dom` | `HTMLElement \| Document` | `document.documentElement` | Element that receives touch events. |
| `pullDownLength` | `number` | `80` | Pull distance required to trigger refresh. |
| `bounce` | `boolean` | `true` | Enables the spring-like rebound when refresh locks into the loading position. |
| `bounceDuration` | `number` | `420` | Refresh rebound transition duration in milliseconds. |
| `onRefresh` | `() => void \| Promise<void>` | `undefined` | Refresh callback. Promises are awaited before reset. |
| `onError` | `(error: unknown) => void` | `undefined` | Handles rejected refresh callbacks from touch events. |
| `loadingImage` | `string` | built-in SVG | Custom loading image URL. |
| `initialText` | `string` | `下拉刷新` | Text before release threshold. |
| `releaseText` | `string` | `释放刷新` | Text after release threshold. |
| `loadingText` | `string` | `加载中` | Text while refreshing. |
| `preventDefault` | `boolean` | `true` | Prevents native touch scrolling while pulling. |

## Exports

| Export | Use case |
| --- | --- |
| `unrefresh` | Default universal entry. |
| `unrefresh/vanilla` | Vanilla JavaScript helpers. |
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

## License

[MIT](./LICENSE) License © 2022 [Song wuk](https://github.com/songwuk)
