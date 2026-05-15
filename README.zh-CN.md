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

Resource state 包含：

| 字段 | 说明 |
| --- | --- |
| `data` | 当前数据。 |
| `error` | 最近一次加载错误。 |
| `status` | `idle`、`loading`、`success` 或 `error`。 |
| `isCached` | 当前数据是否来自缓存。 |
| `cacheKey` | 当前使用的缓存 key。 |
| `isLoading` | 是否正在加载。 |
| `isStale` | 数据是否过期。 |
| `showSkeleton` | 当前是否应该显示骨架屏。 |
| `skeletonAnimation` | 骨架屏动画，例如 `shimmer`、`pulse`、`wave`。 |
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

如果团队偏好对象式 Hook 配置，也可以使用：

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

## Vue 注入

`unrefresh/vue` 也导出 `UNREFRESH_VUE_KEY`，适合需要显式注入的 Vue 项目。

```ts
import { UNREFRESH_VUE_KEY } from 'unrefresh/vue'

app.provide(UNREFRESH_VUE_KEY, refresh)
```

## 常用选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `animation` | `spin` | 刷新加载指示器动画，可选 `spin`、`pulse`、`orbit`、`magnetic`、`bounce`、`flip`、`none`。`magnetic` 是更有辨识度的 App 风格磁吸、轨道和扩散环动效。 |
| `animationDuration` | `720` | 加载指示器动画时长，单位毫秒。 |
| `animationIcon` | `auto` | 内置加载图标风格，可选 `auto`、`loop`、`dot`、`orbit`、`magnet`、`arrow`、`diamond`、`spark`、`bolt`、`arc`。`auto` 会根据动画自动切换不同图标。 |
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

每种刷新动画都有独立的下拉帧格式。拖拽过程中，`unrefresh` 会实时更新 `--unrefresh-progress`、`--unrefresh-distance`、`--unrefresh-frame-rotate`、`--unrefresh-frame-scale`、`--unrefresh-frame-orbit`、`--unrefresh-frame-flip`、`--unrefresh-frame-magnet` 等 CSS 变量；内置样式会为 `spin`、`pulse`、`orbit`、`magnetic`、`bounce`、`flip` 分别映射不同的当前帧效果，而不是统一使用同一种旋转。

内置动画默认也会使用不同图标风格：循环、脉冲点、轨道、磁吸、箭头、钻石和闪光等。用 `animationIcon` 可以指定某个内置图标；如果需要完全自定义图片 URL，继续使用 `loadingImage`，它的优先级高于 `animationIcon`。

也可以传入自定义帧动画。`frames` 是离散进度帧，`onFrame` 可以返回每一帧的样式或 CSS 变量，用来做完全自定义的插值逻辑：

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

## Resource 选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `auto` | `false` | 创建后自动执行首次加载。 |
| `cache` | `undefined` | 从本地缓存恢复数据，并把成功加载结果写回缓存。 |
| `initialData` | `undefined` | 首次请求前展示的初始数据。 |
| `keepPreviousData` | `true` | 刷新和失败时保留旧数据。 |
| `load` | 必填 | 数据加载函数。 |
| `onChange` | `undefined` | 资源状态变化回调。 |
| `onLoadSuccess` | `undefined` | 加载成功回调。 |
| `onLoadError` | `undefined` | 全部重试失败后的错误回调。 |
| `retry` | `0` | 失败重试次数，`true` 表示重试 2 次。 |
| `retryDelay` | 指数退避 | 重试间隔。 |
| `skeleton` | `{ animation: 'shimmer', count: 6, variant: 'default', when: 'empty' }` | 控制骨架屏状态。 |
| `staleTime` | `undefined` | 数据多久后标记为过期。 |

可以用 `resource.setOptions()` 在运行时更新刷新参数、骨架屏参数、重试、过期时间和旧数据保留策略，适合做调参面板、产品设置页或不同业务页面的动态手感调整。

设置 `staleTime` 后，`reload()` 会复用仍然新鲜的数据；手动刷新按钮或明确的用户操作可以使用 `reload({ force: true })` 强制重新请求。

`skeleton` 支持 `boolean`、数字或对象。数字表示骨架屏数量；对象支持 `animation`、`count`、`enabled`、`variant` 和 `when`。`animation` 可选 `shimmer`、`pulse`、`wave`、`none`，用于匹配当前页面加载风格。`variant` 用来渲染页面级骨架屏，例如 `feed-card`、`message-row`、`dashboard-tile`。`when: 'empty'` 只在首屏无数据加载时显示，`when: 'loading'` 则会在已有数据的刷新过程中也暴露骨架屏状态。

`cache` 支持字符串或对象。字符串会作为 `localStorage` key；对象支持 `key`、`ttl` 和自定义 `storage`。缓存超过 `ttl` 后会被忽略并删除。

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

Playground 使用真实网络请求，并内置参数调节面板，可实时调节下拉距离、动画时长、回弹、骨架屏动画、数据新鲜时间和震动反馈。动画选择器里也包含 `Custom Arc`，它使用同一套 `frames` 和 `onFrame` 自定义动画 API 实现。

```bash
npm --prefix playground run dev
```

## 项目检查

提交 PR 或发布前建议跑完整检查：

```bash
npm run check
```

## 发布

GitHub Release 由 tag 触发。release workflow 会校验版本、执行 lint/typecheck/test、构建 package、构建 playground、生成 npm tarball、把 tarball 挂到 GitHub Release，并在配置 `NPM_TOKEN` 后发布到 npm。

```bash
npm run release
```

tag 必须和 `package.json` 版本一致，例如版本是 `1.2.0` 时 tag 必须是 `v1.2.0`。npm 发布启用了 GitHub Actions provenance，需要在 GitHub Secrets 中配置 `NPM_TOKEN`。

如果要在本地手动发布 npm，使用：

```bash
npm publish --access public
```

provenance 只在 GitHub Actions release workflow 中启用。本地终端没有受支持的 provenance provider，所以 `npm publish --provenance` 可能会报 `Automatic provenance generation not supported for provider: null`。

发布日志维护在 [`CHANGELOG.md`](./CHANGELOG.md)，GitHub 自动生成 Release Notes 的分组规则在 `.github/release.yml`。

## License

[MIT](./LICENSE) License © 2022 [Song wuk](https://github.com/songwuk)
