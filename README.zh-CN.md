<p align="center">
  <img src="./assets/unrefresh-logo.gif" width="148" alt="unrefresh 动态 logo">
</p>

<h1 align="center">unrefresh</h1>

<p align="center">
  适用于 Vanilla JavaScript、Vue 和 React 的通用下拉刷新库。
</p>

<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

## 安装

```bash
npm install unrefresh
```

在应用入口引入样式：

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

toggleButton.addEventListener('click', () => {
  if (refresh.getState().refreshing)
    refresh.cancel()

  refresh.disable()
})
```

## Resource 数据层

`unrefresh/resource` 适合信息流、收件箱、列表页和仪表盘。它把下拉刷新和真实数据请求绑定在一起，统一管理加载、取消、错误、重试、旧数据保留和更新时间。

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
})

feed.reload({ force: true })
feed.cancel()
feed.markStale()
feed.controller.disable()
feed.controller.enable()
```

Resource state 包含：

| 字段 | 说明 |
| --- | --- |
| `data` | 当前数据。 |
| `error` | 最近一次加载错误。 |
| `status` | `idle`、`loading`、`success` 或 `error`。 |
| `isLoading` | 是否正在加载。 |
| `isStale` | 数据是否过期。 |
| `showSkeleton` | 当前是否应该显示骨架屏。 |
| `skeletonCount` | 建议渲染的骨架屏数量。 |
| `skeletonVariant` | 页面级骨架屏类型，例如 `feed-card`。 |
| `failureCount` | 当前加载过程中的失败次数。 |
| `updatedAt` | 最近一次成功更新时间。 |
| `refresh` | 下拉手势状态，例如 `progress`、`status`、`distance`。 |

## Vue

`unrefresh/vue` 是 Vue 兼容插件，但不会把 Vue 打进包里。

```ts
import { createApp } from 'vue'
import UnrefreshVuePlugin from 'unrefresh/vue'
import 'unrefresh/css'

createApp(App).use(UnrefreshVuePlugin, {
  target: document,
  async onRefresh({ signal }) {
    await reloadData(signal)
  },
})
```

## React

`unrefresh/react` 提供 Hook。React 是可选 peer dependency，只有导入这个入口时才需要。

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

## 常用选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `target` / `dom` | `document.documentElement` | 监听触摸事件的目标。 |
| `pullDownLength` | `80` | 触发刷新的下拉距离。 |
| `bounce` | `true` | 刷新锁定时启用回弹动画。 |
| `bounceDuration` | `420` | 回弹动画时长，单位毫秒。 |
| `completeDuration` | `0` | 成功或失败反馈显示时长。 |
| `disabled` | `false` | 临时禁用手势。 |
| `haptics` | `false` | 开启震动反馈。 |
| `minLoadingDuration` | `0` | 最小加载显示时长。 |
| `mouse` | `false` | 开启鼠标拖拽，适合桌面演示和测试。 |
| `onRefresh` | `undefined` | 刷新回调，可使用 `context.signal` 取消请求。 |
| `onStateChange` | `undefined` | 监听 `idle`、`pulling`、`ready`、`refreshing`、`success`、`error`。 |

## Resource 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `auto` | `false` | 创建后自动执行首次加载。 |
| `initialData` | `undefined` | 首次请求前展示的初始数据。 |
| `keepPreviousData` | `true` | 刷新和失败时保留旧数据。 |
| `load` | 必填 | 数据加载函数。 |
| `onChange` | `undefined` | 资源状态变化回调。 |
| `onLoadSuccess` | `undefined` | 加载成功回调。 |
| `onLoadError` | `undefined` | 全部重试失败后的错误回调。 |
| `retry` | `0` | 失败重试次数，`true` 表示重试 2 次。 |
| `retryDelay` | 指数退避 | 重试间隔。 |
| `skeleton` | `{ count: 6, variant: 'default', when: 'empty' }` | 控制骨架屏状态。 |
| `staleTime` | `undefined` | 数据多久后标记为过期。 |

设置 `staleTime` 后，`reload()` 会复用仍然新鲜的数据；手动刷新按钮或明确的用户操作可以使用 `reload({ force: true })` 强制重新请求。

`skeleton` 支持 `boolean`、数字或对象。数字表示骨架屏数量；对象支持 `count`、`enabled`、`variant` 和 `when`。`variant` 用来渲染页面级骨架屏，例如 `feed-card`、`message-row`、`dashboard-tile`。`when: 'empty'` 只在首屏无数据加载时显示，`when: 'loading'` 则会在已有数据的刷新过程中也暴露骨架屏状态。

## 导出入口

| 入口 | 用途 |
| --- | --- |
| `unrefresh` | 默认通用入口。 |
| `unrefresh/vanilla` | Vanilla JavaScript 工具。 |
| `unrefresh/resource` | 框架无关的数据资源层。 |
| `unrefresh/vue` | Vue 插件适配器。 |
| `unrefresh/react` | React Hook 适配器。 |
| `unrefresh/css` | 必需样式。 |
| `unrefresh/assets/logo.svg` | 静态 logo。 |
| `unrefresh/assets/logo.gif` | 动态 logo。 |

## 示例

Playground 使用真实网络请求：

```bash
npm --prefix playground run dev
```

## 发布

GitHub Release 由 tag 触发。release workflow 会校验版本、执行 lint/typecheck/test、构建 package、构建 playground、生成 npm tarball、把 tarball 挂到 GitHub Release，并在配置 `NPM_TOKEN` 后发布到 npm。

```bash
npm run release
```

tag 必须和 `package.json` 版本一致，例如版本是 `1.0.0` 时 tag 必须是 `v1.0.0`。npm 发布启用了 GitHub Actions provenance，需要在 GitHub Secrets 中配置 `NPM_TOKEN`。

发布日志维护在 [`CHANGELOG.md`](./CHANGELOG.md)，GitHub 自动生成 Release Notes 的分组规则在 `.github/release.yml`。

## License

[MIT](./LICENSE) License © 2022 [Song wuk](https://github.com/songwuk)
