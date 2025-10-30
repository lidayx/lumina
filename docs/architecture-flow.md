# Lumina 架构流程文档

## 目录
1. [应用启动流程](#应用启动流程)
2. [索引流程](#索引流程)
3. [搜索流程](#搜索流程)
4. [应用执行流程](#应用执行流程)
5. [IPC通信流程](#ipc通信流程)

---

## 应用启动流程

```mermaid
graph TD
    A[应用启动] --> B{单实例检查}
    B -->|已有实例| C[退出当前实例]
    B -->|新实例| D[设置应用名称和版本]
    
    D --> E[应用就绪 app.whenReady]
    E --> F[创建主窗口]
    F --> G{检查设置 minimizeToTray}
    
    G -->|是| H[隐藏窗口]
    G -->|否| I[显示窗口]
    
    H --> J[启动定期索引服务]
    I --> J
    
    J --> K[创建系统托盘]
    K --> L{检查 fastStart 设置}
    
    L -->|false 或首次| M[全量索引]
    L -->|true 且有缓存| N[快速加载缓存]
    
    M --> O[触发完整索引: 应用/文件/书签]
    N --> P[从缓存加载: 应用/文件/书签]
    
    O --> Q[注册全局快捷键 Shift+Space]
    P --> Q
    
    Q --> R[注册 IPC 处理器]
    R --> S[应用运行中]
```

### 启动时序

1. **单实例检查** - 使用 `app.requestSingleInstanceLock()` 确保只运行一个实例
2. **窗口初始化** - 根据 `minimizeToTray` 设置决定是否显示窗口
3. **索引策略**：
   - `fastStart=true` 且有缓存：快速加载（<1秒）
   - `fastStart=false` 或首次：完整索引（可能需要数秒）

---

## 索引流程

```mermaid
graph TD
    A[触发索引] --> B{检查平台}
    
    B -->|macOS| C[使用 Spotlight mdfind]
    B -->|Windows| D[Start Menu 快捷方式]
    B -->|Linux| E[.desktop 文件]
    
    C --> F{Spotlight 成功?}
    F -->|是| G[解析应用路径]
    F -->|否| H[目录扫描回退]
    
    D --> I{PowerShell 成功?}
    I -->|是| J[解析 .lnk 文件]
    I -->|否| K[直接扫描目录]
    
    J --> L[提取应用图标]
    K --> L
    G --> L
    E --> L
    H --> L
    
    L --> M[验证文件存在]
    M --> N{文件存在?}
    
    N -->|是| O[预计算搜索关键词]
    N -->|否| P[跳过]
    
    O --> Q[保存到数据库]
    Q --> R[更新内存缓存]
    
    P --> S[索引完成]
    R --> S
    
    S --> T[发送索引完成事件]
```

### 索引策略

#### macOS
- **主要方案**：Spotlight 索引（毫秒级响应）
- **回退方案**：扫描 `/Applications` 目录

#### Windows
- **主要方案**：解析 Start Menu 快捷方式（.lnk）
- **回退方案**：扫描程序安装目录

#### Linux
- 扫描 `/usr/share/applications` 和用户目录
- 解析 .desktop 文件

---

## 搜索流程

```mermaid
graph TD
    A[用户输入搜索词] --> B[防抖等待 300ms]
    B --> C[触发 searchAll]
    
    C --> D{检测搜索类型}
    
    D -->|URL| E[生成浏览器选项]
    D -->|计算| F[计算器服务]
    D -->|file + 关键词| G[文件搜索]
    D -->|其他| H[综合搜索]
    
    H --> I[并行执行]
    I --> J[应用搜索]
    I --> K[网页搜索]
    I --> L[书签搜索]
    I --> M[命令搜索]
    
    J --> N[评分算法排序]
    K --> N
    L --> N
    M --> N
    G --> N
    F --> O[返回结果]
    E --> O
    
    N --> P[按类别分组]
    P --> Q[限制结果数量 50]
    Q --> O
    
    O --> R[更新UI显示]
    R --> S[用户选择结果]
    
    S --> T[执行操作]
```

### 搜索匹配算法

```typescript
评分规则:
- 完全匹配名称: 100分
- 名称开头匹配: 80分
- 名称包含匹配: 60分
- 拼音匹配: 40分
- 最近使用加分: +10分（7天内）

排序规则:
1. 评分降序
2. 开头匹配优先
3. 名称长度（短优先）
4. 使用次数
```

---

## 应用执行流程

```mermaid
graph TD
    A[用户选择应用] --> B[触发 onExecute]
    B --> C[IPC: app-launch]
    
    C --> D[应用服务: launchApp]
    D --> E[验证应用存在]
    
    E --> F{应用存在?}
    F -->|否| G[抛出错误]
    F -->|是| H{检查平台}
    
    H -->|macOS| I[open -a 命令]
    H -->|Windows| J[shell.openPath 或 cmd start]
    H -->|Linux| K[gtk-launch 或 xdg-open]
    
    I --> L[更新使用统计]
    J --> L
    K --> L
    
    L --> M[数据库更新]
    M --> N[隐藏主窗口]
    
    N --> O[执行成功]
    G --> P[显示错误]
```

### 启动命令

| 平台 | 命令 |
|------|------|
| macOS | `open -a "应用路径"` 或 `open <path>` |
| Windows | `shell.openPath()` 或 `cmd /c start "" 应用路径` |
| Linux | `gtk-launch <桌面文件名>` 或 `xdg-open <路径>` |

---

## IPC通信流程

```mermaid
graph TD
    A[渲染进程 Renderer] -->|IPC调用| B[IPC Main 进程]
    B --> C{路由请求}
    
    C -->|app-*| D[appHandlers]
    C -->|file-*| E[fileHandlers]
    C -->|web-*| F[webHandlers]
    C -->|browser-*| G[browserHandlers]
    C -->|command-*| H[commandHandlers]
    C -->|calculator-*| I[calculatorHandlers]
    C -->|bookmark-*| J[bookmarkHandlers]
    C -->|settings-*| K[settingsHandlers]
    C -->|window-*| L[windowHandlers]
    
    D --> M[appService]
    E --> N[fileService]
    F --> O[webService]
    G --> P[browserService]
    H --> Q[commandService]
    I --> R[calculatorService]
    J --> S[bookmarkService]
    K --> T[settingsService]
    L --> U[windowManager]
    
    M --> V[返回结果]
    N --> V
    O --> V
    P --> V
    Q --> V
    R --> V
    S --> V
    T --> V
    U --> V
    
    V --> W[渲染进程接收]
    W --> X[更新UI]
```

### IPC 处理器

| Handler | 功能 | 对应 Service |
|---------|------|-------------|
| `appHandlers.ts` | 应用获取、搜索、启动、索引 | `appService.ts` |
| `fileHandlers.ts` | 文件搜索、打开、索引 | `fileService.ts` |
| `webHandlers.ts` | 网页搜索、引擎管理 | `webService.ts` |
| `browserHandlers.ts` | 浏览器管理 | `browserService.ts` |
| `commandHandlers.ts` | 命令执行 | `commandService.ts` |
| `calculatorHandlers.ts` | 计算器 | `calculatorService.ts` |
| `bookmarkHandlers.ts` | 书签管理 | `bookmarkService.ts` |
| `settingsHandlers.ts` | 设置管理 | `settingsService.ts` |
| `windowHandlers.ts` | 窗口管理 | `windowManager.ts` |

---

## 数据库管理流程

```mermaid
graph TD
    A[数据库操作] --> B{操作类型}
    
    B -->|初始化| C[创建表结构]
    B -->|写入| D[批量插入/更新]
    B -->|查询| E[搜索/获取]
    B -->|清理| F[删除过期数据]
    
    C --> G[items 表]
    C --> H[types 表]
    C --> I[indexes]
    
    D --> J[事务处理]
    J --> K[优化写入性能]
    
    E --> L[使用索引加速]
    F --> M[7天数据清理策略]
    
    K --> N[刷新到磁盘]
    L --> N
    M --> N
    
    N --> O[数据库文件]
```

### 数据表结构

**items 表**（存储所有数据）
- `id`: 唯一标识
- `type`: 类型（app/file/bookmark/...）
- `name`: 名称
- `path`: 路径
- `icon`: 图标 base64
- `searchKeywords`: 搜索关键词
- `indexedAt`: 索引时间
- `launchCount`: 启动次数
- `lastUsed`: 最后使用时间

**types 表**（元数据管理）
- `name`: 类型名称
- `enabled`: 是否启用

---

## 性能优化策略

```mermaid
graph LR
    A[性能优化] --> B[索引优化]
    A --> C[搜索优化]
    A --> D[UI优化]
    
    B --> B1[缓存机制]
    B --> B2[批量写入]
    B --> B3[增量索引]
    
    C --> C1[关键词缓存]
    C --> C2[评分算法]
    C --> C3[结果限制]
    
    D --> D1[防抖处理]
    D --> D2[虚拟滚动]
    D --> D3[懒加载图标]
```

### 优化技术

1. **缓存机制**：数据库缓存 + 内存缓存
2. **批量操作**：使用事务批量写入
3. **增量更新**：定期索引（10分钟）
4. **搜索优化**：预计算拼音、使用 Map 快速查找
5. **UI响应**：300ms 防抖、限制结果数量 50

---

## 关键配置

### 启动设置
- `autoStart`: 开机自启动
- `minimizeToTray`: 启动时最小化到托盘
- `fastStart`: 快速启动（使用缓存）

### 索引设置
- `indexingInterval`: 索引间隔（默认10分钟）
- `fileSearchEnabled`: 是否启用文件搜索
- `fileSearchPaths`: 自定义搜索路径

### 搜索设置
- `searchDebounce`: 搜索防抖时间（默认300ms）
- `MAX_RESULTS`: 最大结果数量（50）

---

## 架构图

```
┌─────────────────────────────────────────────────────┐
│                   Electron 应用                       │
├─────────────────────────────────────────────────────┤
│  Main Process (Node.js)                             │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │  Services    │   Handlers   │   Windows    │    │
│  ├──────────────┼──────────────┼──────────────┤    │
│  │appService    │appHandlers   │mainWindow    │    │
│  │fileService   │fileHandlers  │settingsWin   │    │
│  │webService    │webHandlers   │pluginWin     │    │
│  │bookmarkSvc   │browserHandlers│windowManager│    │
│  │browserSvc    │commandHandlers│             │    │
│  │calculatorSvc │calculatorHdl │             │    │
│  │commandSvc    │bookmarkHdl   │             │    │
│  │indexService  │settingsHdl   │             │    │
│  │settingsSvc   │windowHandlers│             │    │
│  └──────────────┴──────────────┴──────────────┘    │
│           ↓ IPC              ↓                      │
├─────────────────────────────────────────────────────┤
│  Renderer Process (React)                           │
│  ┌──────────────┬──────────────┬──────────────┐    │
│  │  MainLayout  │  Components  │   Services   │    │
│  ├──────────────┼──────────────┼──────────────┤    │
│  │SearchBar     │ResultList    │              │    │
│  │SettingsPage  │SearchItem    │              │    │
│  │PluginPage    │              │              │    │
│  └──────────────┴──────────────┴──────────────┘    │
└─────────────────────────────────────────────────────┘
           ↓                    ↓
    ┌─────────────┐      ┌─────────────┐
    │   SQLite DB │      │   系统API    │
    │  (sql.js)   │      │ Spotlight   │
    └─────────────┘      │ PowerShell  │
                         └─────────────┘
```

---

## 总结

**Lumina** 是一个高效、跨平台的快速搜索启动器，主要特点：

1. **多平台支持**：macOS / Windows / Linux
2. **智能索引**：使用系统级索引 API 快速发现应用
3. **全面搜索**：应用、文件、书签、网页、命令、计算器
4. **性能优化**：缓存机制、批量操作、评分算法
5. **用户体验**：全局快捷键、托盘运行、快速响应

---

*最后更新：2024年*

