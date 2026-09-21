# 更新日志

本项目的重要变更都记录在此文件。
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`主版本.次版本.修订号`。

## [1.1.0] - 2026-09-21

一次以"修掉真实缺陷"为主的版本。核心功能没变，重点是把主题机制、离线策略和一批排版问题修掉，
并补齐了开源项目该有的基础设施。

### 修复

- **主题切换在部分位置无效**（最重要的一处）
  全站曾并存两套深浅色机制：`js/common.js` 切换 `.theme-dark` 类，而呼吸训练页背景、
  卡片、Toast 等位置写的是 `@media (prefers-color-scheme: dark)`——后者只认系统设置，
  不认站内按钮。表现为点切换按钮"没反应"，呼吸训练页甚至出现浅色背景配深色卡片。
  现在统一为**唯一入口** `<html data-theme="light|dark">`，由 JS 解析 `auto` 后写入，
  组件样式一律用 `[data-theme="dark"]` 前缀。
- **主题存了两份且会互相矛盾**：`theme` 同时写在存储顶层和 `settings` 里，实测两个值不一致。
  现在写入时保持同步，读取时两处兼容（老数据不会失效）。
- **刷新时闪白/闪黑**：7 个页面在首次绘制前先写入 `data-theme`，不再等 JS 加载完才变色。
- **Service Worker 让修复到不了用户手上**：原策略对所有资源"缓存优先"，且后台刷新只对 HTML 生效，
  CSS/JS 一旦进缓存就永不更新（缓存名还是硬编码的 `timehub-v1.0`）。现改为
  HTML 网络优先、CSS/JS 缓存优先 + 后台更新、缓存名与版本号绑定。
- **预缓存一处 404 就整体失败**：`cache.addAll()` 是全有全无的，而清单里含 `CNAME`、`README.md`
  和该版本已删除的空文件。现改为逐个添加，单个失败不影响其余。
- **番茄钟模式选项卡文字被挤断**：「短休息」在桌面宽度下断成「短休 / 息」；
  手机端三个选项卡还会排成 2+1 的残缺布局。改为单行不换行 + 等分排列（320px 宽也放得下）。
- **番茄钟「任务列表」标题被挤成两行**：标题与输入框、下拉、按钮争抢同一行宽度。
  现在标题独占一行，控件在下一行占满宽度。
- **呼吸训练页自定义输入框白底白字**：补上 `color-scheme` 与显式配色，原生控件跟随主题。
- **页脚在 4 个页面文案断字**（「简单而强大的时间管理工 / 具」）：7 个页面统一为同一份页脚，
  栅格改为 `auto-fit`，不再出现固定 4 栏缺栏时的空白。
- **世界时钟搜索框 placeholder 被截断**：输入框没写 `width`，退回浏览器默认的约 170px。
- **秒表页几乎空白**：补上计时卡片容器；圈速卡片改为常显，无记录时显示空状态。
- 移除失效的年份/版本内联脚本（对应 DOM 节点已不存在，原会抛错打断后续脚本）。

### 变更

- **不再依赖 Google Fonts**：4 个页面从 `fonts.googleapis.com` 加载 DM Mono。该域名在国内不可达，
  也会破坏 PWA 的离线承诺。数字等宽显示改用系统字体栈（`--font-family-mono`）。
- **PWA 图标改用 PNG**：清单与 `apple-touch-icon` 原本指向 SVG，iOS 主屏不认。
  现提供 192/512/180 三种尺寸，并补了 `maskable` 用途。
- `manifest.json` 补齐 `scope`、`lang`、`categories`、`shortcuts`；`start_url` 改为 `./`（支持子目录部署）。
- 主题色由设计稿遗留的红色 `#C0392B` 对齐站点主色 `#4361ee`。

### 移除（死代码）

- 9 个 0 字节文件：`css/{pomodoro,stopwatch,multi-timer,world-clock,deadline}.css`、
  `js/{stopwatch,multi-timer,world-clock,deadline}.js`
- `js/modules/pomodoro.js`：`js/pomodoro.js` 的旧版本，无任何页面引用（51 KB）
- `css/common.css`：`base/layout/components` 的上一代重复版本，无任何页面引用（9.7 KB）
- 番茄钟内确认无人使用的 `.task-input-container`、`.task-input-actions` 规则
  与重复定义的 `.task-input`（两份定义互相覆盖）

### 新增

- `404.html`：此前访问不存在的路径会落到空白页
- `LICENSE`（MIT）、`CHANGELOG.md`、`.gitignore`
- 分享卡片元信息（`og:title` / `og:description` 等）

## [1.0.0] - 2026-04-18

首个版本：番茄钟、秒表、多组倒计时、世界时钟、截止倒计时、呼吸训练六个工具；
PWA 离线支持、深浅主题、响应式布局、localStorage 数据持久化。
