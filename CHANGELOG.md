# Changelog

All notable changes to `unrefresh` are documented in this file.

## v1.2.0

### Highlights

- Repositioned `unrefresh` as a universal pull-to-refresh JavaScript library for Vanilla JavaScript, Vue, and React.
- Added a framework-agnostic resource layer for real data loading, cancellation, retry, stale state, and skeleton state.
- Reworked the playground into a real API-driven mobile feed demo.
- Added a playground parameter studio for runtime tuning of refresh motion, rebound, skeletons, stale time, and haptics.
- Added npm-first project workflow and removed pnpm-specific project assumptions.
- Added GitHub Actions release automation with package validation, artifact upload, GitHub Release creation, and optional npm publish.

### Core Refresh

- Added cancellable refresh lifecycle through `AbortSignal`.
- Added runtime controls: `cancel()`, `disable()`, `enable()`, `setOptions()`, and `getState()`.
- Added lifecycle events: `statechange`, `refreshstart`, `refreshcomplete`, `refresherror`, `refreshcancel`, and `destroy`.
- Added `subscribe()` for lightweight state observers.
- Added app-like visual states for success, error, loading, and rebound animation.
- Added configurable loading animation presets with `animation` and `animationDuration`, including the distinctive `magnetic` mode.
- Added built-in per-animation icon styles with `animationIcon`, while keeping `loadingImage` as the custom asset override.
- Added per-preset pull-frame animation formats driven by CSS variables for current-frame adaptation during drag.
- Added custom frame-based animations through `animation: { name, frames, onFrame }`.
- Added optional haptic feedback for ready, refreshing, success, and error states.
- Added accessibility improvements through configurable live-region behavior.

### Resource Layer

- Added `createRefreshResource()` from `unrefresh/resource`.
- Added local cache hydration with `cache`, `cache.ttl`, `isCached`, `cacheKey`, and `clearCache()`.
- Added managed resource state:
  - `data`
  - `error`
  - `status`
  - `isCached`
  - `isLoading`
  - `isStale`
  - `cacheKey`
  - `failureCount`
  - `updatedAt`
  - nested refresh gesture state
- Added automatic first load with `auto`.
- Added failed-load retry with `retry` and `retryDelay`.
- Added stale data handling with `staleTime`, `markStale()`, and `reload({ force: true })`.
- Added `resource.setOptions()` for runtime resource and refresh tuning.
- Added `keepPreviousData` to preserve the previous screen during refreshes.
- Added load lifecycle hooks: `onLoadSuccess` and `onLoadError`.

### Skeleton Loading

- Added resource-level skeleton state:
  - `showSkeleton`
  - `skeletonAnimation`
  - `skeletonCount`
  - `skeletonVariant`
- Added `skeleton` option with boolean, number, and object forms.
- Added skeleton animation modes: `shimmer`, `pulse`, `wave`, and `none`.
- Added page-specific skeleton variants through `skeleton.variant`.
- Updated the playground feed to render a matching `feed-card` skeleton with meta, title, and body placeholders.

### Framework Entries

- Added package exports:
  - `unrefresh`
  - `unrefresh/vanilla`
  - `unrefresh/resource`
  - `unrefresh/vue`
  - `unrefresh/react`
  - `unrefresh/css`
  - `unrefresh/assets/logo.svg`
  - `unrefresh/assets/logo.gif`
- Kept Vue and React as optional peer dependencies.
- Exported shared types across Vanilla, Vue, React, and Resource entries.
- Added object-style React hook configuration with `useRefreshController()`.
- Added `UNREFRESH_VUE_KEY` and Vue-facing global property types.

### Standards

- Enabled stricter ESLint handling for explicit `any`.
- Added stricter TypeScript casing and switch fallthrough checks.
- Added npm `publishConfig`, `npm run check`, and `./package.json` export.
- Kept deprecated compatibility aliases while adding standard PascalCase type names.

### Documentation

- Rewrote the English README as the primary documentation.
- Added Simplified Chinese documentation in `README.zh-CN.md`.
- Added examples for Vanilla, Vue, React, resource loading, skeleton loading, runtime controls, and release flow.
- Added animated and static logo assets.

### Playground

- Rebuilt the playground around a real network request.
- Added resource status, gesture status, pull progress, update time, manual refresh, cancel, and gesture toggle controls.
- Added a Liquid Glass-style parameter studio for tuning pull distance, animation preset, timing, rebound, skeleton animation, stale time, and haptics.
- Added first-load skeleton cards that match the feed page.
- Added responsive styling and browser-verified layout behavior.

### Build, Test, and Release

- Switched project workflow to npm and `package-lock.json`.
- Added ESLint flat config.
- Added focused tests for refresh behavior, resource state, retry, cancellation, stale state, skeleton state, and DOM gestures.
- Added GitHub CI for lint, typecheck, test, package build, and playground build.
- Added GitHub Release workflow:
  - validates release tag against `package.json`
  - runs lint/typecheck/test
  - builds package and playground
  - runs `npm pack`
  - uploads the package tarball
  - creates a GitHub Release
  - publishes to npm with provenance when `NPM_TOKEN` is configured

### 中文摘要

- 项目已从单一刷新插件升级为通用下拉刷新 JS 库。
- 新增 `unrefresh/resource`，统一处理真实数据加载、取消、重试、过期状态和骨架屏。
- Playground 变成真实 API 信息流示例，并支持页面级 `feed-card` 骨架屏和运行时参数调节面板。
- 英文文档作为主文档，新增完整中文文档。
- GitHub Release 已完善，可自动校验、构建、打包、生成 Release，并在配置 `NPM_TOKEN` 后发布 npm。
