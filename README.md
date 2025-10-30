# Lumina（快搜）

快如闪电的跨平台搜索启动器。基于 Electron + TypeScript + React + Vite 构建，内置应用/文件/网页/命令/计算器/书签/设置等搜索与操作能力，支持全局快捷键与系统托盘常驻。

## 目录

- [特性概览](#特性概览)
- [系统要求](#系统要求)
- [安装与开发](#安装与开发)
- [构建与发布](#构建与发布)
- [运行时行为](#运行时行为)
- [快捷键](#快捷键)
- [项目结构](#项目结构)
- [架构与模块](#架构与模块)
- [预加载 API（Renderer 可用）](#预加载-apirenderer-可用)
- [图标与品牌](#图标与品牌)
- [版本管理](#版本管理)
- [开发规范与贡献](#开发规范与贡献)
- [许可证](#许可证)
- [FAQ](#faq)

## 特性概览

- 应用搜索与启动：索引本机应用，模糊搜索，快速启动
- 文件搜索与打开：按路径/名称搜索，快速打开
- 网页搜索与历史：多搜索引擎、历史记录、常用站点
- 命令执行：预设命令、模糊搜索、历史追踪，支持直接执行原始命令
- 计算器：输入表达式即可计算
- 书签：加载与搜索浏览器书签
- 设置：浏览器默认项、搜索引擎管理、常规设置等
- 系统托盘：常驻托盘，窗口关闭后后台运行
- 单实例：避免重复打开，激活已运行实例
- 索引机制：首次启动自动完整索引，之后定期索引（默认每 10 分钟）

## 系统要求

- Node.js 18+
- macOS / Windows / Linux（跨平台）

## 安装与开发

```bash
# 克隆项目
git clone https://github.com/yourusername/electron-quick.git
cd electron-quick

# 安装依赖
npm install

# 启动开发（Vite 开发服务器 + Electron 主进程）
npm run dev
```

默认开发地址：`http://localhost:3000`（渲染进程），主进程会根据环境自动加载相应 URL。

如需代码风格和质量检查：

```bash
npm run lint       # 检查
npm run lint:fix   # 自动修复
npm run format     # 使用 Prettier 格式化
```

更多操作请参见 `docs/快速开始.md`。

## 构建与发布

利用 electron-builder 进行跨平台打包：

```bash
# 仅构建产物（不生成安装包），并输出到 dist/ 与 dist-electron/
npm run build

# 构建各平台安装包
npm run build:mac
npm run build:win
npm run build:linux

# 一键构建三平台（需要在相应平台或配好交叉环境）
npm run build:all
```

构建输出：
- 渲染产物：`dist/`
- 主/预加载产物：`dist-electron/`
- 安装包与镜像：`dist/`（如 `.dmg`、`.zip`、`.AppImage`、`.deb`、`nsis` 等）

打包配置见 `electron-builder.yml`（`appId`、`productName`、图标、目标平台、Artifacts 命名等）。

## 运行时行为

- 单实例：尝试二次启动时会激活已运行实例并聚焦主窗口
- 首次启动：页面加载完成后触发“完整索引”
- 后续启动：若有缓存则快速加载，并并行刷新应用/文件/书签
- 定期索引：默认每 10 分钟刷新（`indexService.startPeriodicIndexing(10)`）
- 窗口关闭：不退出应用，常驻系统托盘，可从托盘或快捷键再次唤起

## 快捷键

- 全局：`Shift + Space` 显示主窗口（仅显示，不关闭）

> 若注册失败，会在控制台输出提示。可在系统偏好设置中检查是否被系统占用。

## 项目结构

```
electron-quick/
├── build/                  # 应用图标与打包资源
├── dist/                   # 渲染进程打包输出
├── dist-electron/          # 主/预加载打包输出
├── docs/                   # 项目文档（功能、架构、计划、API、教程等）
├── scripts/                # 构建与版本脚本
├── src/
│   ├── main/               # Electron 主进程
│   │   ├── index.ts        # 应用入口：单例、托盘、索引、全局快捷键、IPC 注册
│   │   ├── windows/        # 多窗口与窗口管理（main/settings/plugin）
│   │   ├── handlers/       # 各功能 IPC 处理器（app/file/web/...）
│   │   ├── services/       # 业务服务（索引/应用/文件/书签/设置/托盘等）
│   │   └── database/       # SQLite（sql.js）与持久化
│   ├── preload/            # 预加载（安全暴露 IPC 给渲染）
│   ├── renderer/           # React 18 + Tailwind UI
│   └── shared/             # 共用类型、常量、工具（窗口 URL、配置等）
├── electron-builder.yml    # 打包配置
├── vite.config.ts          # Vite 配置
└── package.json
```

## 架构与模块

- 主进程（`src/main`）
  - 单实例与生命周期管理（激活已运行实例、托盘常驻、`will-quit` 清理）
  - 窗口管理：`windowManager` + `WINDOW_CONFIGS` 统一创建/显示/隐藏/切换
  - IPC 注册：`register*Handlers()` 负责 app/file/web/browser/window/command/calculator/bookmark/settings 等
  - 全局快捷键：注册 `Shift+Space` 唤起主窗口
  - 索引：首次完整索引 + 周期索引；带缓存快速启动
- 预加载（`src/preload/index.ts`）
  - 通过 `contextBridge` 暴露受控 API，渲染进程无法直接触达 Node/Electron 原语，安全性更高
- 渲染进程（`src/renderer`）
  - React 18 视图，`App.tsx` 基于 `window.location.hash` 切换页面（主界面/设置）
  - Tailwind CSS 样式

更多设计细节与路线，参见 `docs/技术架构设计.md`、`docs/功能清单.md`、`docs/开发计划.md`、`docs/多窗口管理说明.md`。

## 预加载 API（Renderer 可用）

渲染进程可通过 `window.electron` 访问以下方法（内部经由 `ipcRenderer.invoke` 与主进程通信）：

```ts
// 通用
invoke(channel: string, ...args: any[]): Promise<any>
on(channel: string, callback: (...args: any[]) => void): void
removeListener(channel: string, callback: (...args: any[]) => void): void

// 应用
app.getAll(): Promise<any[]>
app.search(query: string): Promise<any[]>
app.launch(appId: string): Promise<any>
app.index(): Promise<any>

// 文件
file.getAll(): Promise<any[]>
file.search(query: string): Promise<any[]>
file.open(filePath: string): Promise<any>
file.index(paths?: string[]): Promise<any>

// 网页
web.getEngines(): Promise<any[]>
web.search(query: string, engineName?: string): Promise<any[]>
web.open(url: string): Promise<any>
web.getHistory(limit?: number): Promise<any[]>
web.clearHistory(): Promise<any>
web.getCommonSites(): Promise<any[]>
web.addEngine(engine: any): Promise<any>
web.updateEngine(name: string, updates: any): Promise<any>
web.deleteEngine(name: string): Promise<any>
web.setDefaultEngine(name: string): Promise<any>

// 浏览器
browser.getAll(): Promise<any[]>
browser.add(browser: any): Promise<any>
browser.update(id: string, updates: any): Promise<any>
browser.delete(id: string): Promise<any>
browser.setDefault(id: string): Promise<any>
browser.getDefault(): Promise<any>
browser.openUrl(url: string): Promise<any>

// 命令
command.getAll(): Promise<any[]>
command.search(query: string): Promise<any[]>
command.execute(commandId: string): Promise<any>
command.executeRaw(command: string): Promise<any>
command.getHistory(limit?: number): Promise<any[]>
command.clearHistory(): Promise<any>

// 计算器
calculator.calculate(expression: string): Promise<any>

// 书签
bookmark.getAll(): Promise<any[]>
bookmark.search(query: string): Promise<any[]>
bookmark.reload(): Promise<any>

// 设置
settings.getAll(): Promise<any>
settings.update(updates: any): Promise<any>
settings.reset(): Promise<any>

// 窗口
windowResize(width: number, height: number): Promise<void>
windowHide(windowType: string): Promise<void>
```

> 实际 IPC 通道名由主进程各 `register*Handlers` 实现，预加载仅做安全代理。

## 图标与品牌

- 资源位于 `build/` 目录，包含 `icon.png`、`icon.icns`、`icon.ico` 等
- 生成/更新图标：

```bash
npm run generate:icon
```

更多图标说明见 `docs/图标设置教程.md` 与 `build/ICON_SETUP.md`。

## 版本管理

提供语义化版本升级脚本：

```bash
# 升级补丁版本（Bug 修复）
npm run version:patch

# 升级次版本（新功能）
npm run version:minor

# 升级主版本（重大变更）
npm run version:major
```

## 开发规范与贡献

- 代码：TypeScript 为主
- 规范：ESLint + Prettier
- 提交：遵循 Conventional Commits（如 `feat: ...` / `fix: ...`）

欢迎贡献：
1. Fork 本仓库
2. 新建分支：`git checkout -b feat/awesome`
3. 提交更改：`git commit -m "feat: awesome"`
4. 推送分支：`git push origin feat/awesome`
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证，详见 `LICENSE`。

## FAQ

- **全局快捷键无效？** 检查是否被系统或其他应用占用；必要时更换快捷键并重启应用。
- **首次启动索引较慢？** 这是正常现象，完成后将进入周期索引并显著加速；可在设置中触发“重新索引”。
- **图标未生效？** 确保 `build/icon.png` 存在并执行 `npm run generate:icon`，然后重新构建。

更多问题与进阶说明：
- 多窗口与路由：`docs/多窗口管理说明.md`
- 快速入门与故障排除：`docs/快速开始.md`
- 图标设置：`docs/图标设置教程.md`