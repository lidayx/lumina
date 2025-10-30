# API 文档

## 一、主进程 API

### 应用管理 API

#### getAllApps()
获取所有已安装应用列表

```typescript
function getAllApps(): Promise<AppInfo[]>
```

**返回**: 
```typescript
interface AppInfo {
  id: string;           // 应用唯一标识
  name: string;        // 应用名称
  path: string;        // 应用路径
  icon?: string;       // 应用图标路径
  description?: string; // 应用描述
  category?: string;   // 应用分类
  launchCount: number; // 启动次数
  lastUsed: Date;      // 最后使用时间
}
```

#### launchApp(appId: string)
启动指定应用

```typescript
function launchApp(appId: string): Promise<void>
```

**参数**:
- `appId`: 应用唯一标识

**示例**:
```typescript
const apps = await getAllApps();
const app = apps.find(a => a.name.includes('Chrome'));
if (app) {
  await launchApp(app.id);
}
```

#### indexApps()
重新索引所有应用

```typescript
function indexApps(): Promise<void>
```

---

### 文件搜索 API

#### searchFiles(query: string, options?: SearchOptions)
搜索文件

```typescript
function searchFiles(
  query: string, 
  options?: SearchOptions
): Promise<FileResult[]>
```

**参数**:
- `query`: 搜索关键词
- `options`: 可选搜索选项
  ```typescript
  interface SearchOptions {
    limit?: number;     // 结果数量限制
    type?: string[];    // 文件类型过滤
    maxSize?: number;   // 最大文件大小
    minSize?: number;   // 最小文件大小
  }
  ```

**返回**:
```typescript
interface FileResult {
  id: string;
  path: string;
  name: string;
  type: string;
  size: number;
  modified: Date;
  score: number;
}
```

#### openFile(path: string)
打开指定文件

```typescript
function openFile(path: string): Promise<void>
```

**参数**:
- `path`: 文件完整路径

---

### 索引管理 API

#### indexFiles(directories: string[])
索引指定目录下的文件

```typescript
function indexFiles(directories: string[]): Promise<void>
```

**参数**:
- `directories`: 要索引的目录列表

#### getIndexStatus()
获取索引状态

```typescript
function getIndexStatus(): Promise<IndexStatus>
```

**返回**:
```typescript
interface IndexStatus {
  totalFiles: number;
  indexedFiles: number;
  status: 'idle' | 'indexing' | 'completed' | 'error';
  error?: string;
}
```

#### clearIndex()
清除索引缓存

```typescript
function clearIndex(): Promise<void>
```

---

### 命令执行 API

#### executeCommand(command: string)
执行系统命令

```typescript
function executeCommand(command: string): Promise<CommandResult>
```

**参数**:
- `command`: 要执行的命令

**返回**:
```typescript
interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
}
```

**示例**:
```typescript
const result = await executeCommand('ls -la');
console.log(result.output);
```

#### searchCommandHistory(query: string)
搜索命令历史

```typescript
function searchCommandHistory(query: string): Promise<CommandHistory[]>
```

**返回**:
```typescript
interface CommandHistory {
  id: string;
  command: string;
  executedAt: Date;
  executedCount: number;
}
```

---

### 剪贴板管理 API

#### getClipboardHistory(limit?: number)
获取剪贴板历史记录

```typescript
function getClipboardHistory(limit?: number): Promise<ClipboardItem[]>
```

**参数**:
- `limit`: 返回记录数量限制

**返回**:
```typescript
interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: Date;
  accessedCount: number;
}
```

#### setClipboard(content: string, type?: string)
设置剪贴板内容

```typescript
function setClipboard(content: string, type?: 'text'): Promise<void>
```

#### clearClipboardHistory()
清除剪贴板历史

```typescript
function clearClipboardHistory(): Promise<void>
```

---

### 配置管理 API

#### getConfig(key: string)
获取配置项

```typescript
function getConfig(key: string): Promise<any>
```

**参数**:
- `key`: 配置键

**示例**:
```typescript
const theme = await getConfig('theme');
```

#### setConfig(key: string, value: any)
设置配置项

```typescript
function setConfig(key: string, value: any): Promise<void>
```

**参数**:
- `key`: 配置键
- `value`: 配置值

**示例**:
```typescript
await setConfig('theme', 'dark');
```

#### getAllConfig()
获取所有配置

```typescript
function getAllConfig(): Promise<Record<string, any>>
```

**返回**:
```typescript
interface AppConfig {
  theme: 'light' | 'dark' | 'auto';
  maxResults: number;
  hotkey: string;
  indexPaths: string[];
  searchEngines: SearchEngine[];
  // ...更多配置
}
```

---

### 窗口管理 API

#### showMainWindow()
显示主窗口

```typescript
function showMainWindow(): void
```

#### hideMainWindow()
隐藏主窗口

```typescript
function hideMainWindow(): void
```

#### toggleMainWindow()
切换主窗口显示状态

```typescript
function toggleMainWindow(): void
```

#### openSettingsWindow()
打开设置窗口

```typescript
function openSettingsWindow(): void
```

---

### 搜索 API

#### globalSearch(query: string)
全局搜索（在所有源中搜索）

```typescript
function globalSearch(
  query: string, 
  options?: GlobalSearchOptions
): Promise<SearchResult[]>
```

**参数**:
- `query`: 搜索关键词
- `options`: 可选搜索选项
  ```typescript
  interface GlobalSearchOptions {
    limit?: number;
    sources?: ('apps' | 'files' | 'commands' | 'history')[];
    minScore?: number;
  }
  ```

**返回**:
```typescript
interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'command' | 'web' | 'history';
  title: string;
  description: string;
  icon?: string;
  action: string;
  score: number;
}
```

---

### 插件系统 API

#### loadPlugin(pluginId: string)
加载插件

```typescript
function loadPlugin(pluginId: string): Promise<PluginInfo>
```

**返回**:
```typescript
interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
}
```

#### unloadPlugin(pluginId: string)
卸载插件

```typescript
function unloadPlugin(pluginId: string): Promise<void>
```

#### getInstalledPlugins()
获取已安装插件列表

```typescript
function getInstalledPlugins(): Promise<PluginInfo[]>
```

#### executePluginAction(pluginId: string, action: string, data?: any)
执行插件动作

```typescript
function executePluginAction(
  pluginId: string, 
  action: string, 
  data?: any
): Promise<any>
```

---

### 网络请求 API

#### performWebSearch(query: string, engine?: string)
执行网页搜索

```typescript
function performWebSearch(
  query: string, 
  engine?: string
): Promise<void>
```

**参数**:
- `query`: 搜索关键词
- `engine`: 搜索引擎名称（可选）

#### addSearchEngine(engine: SearchEngine)
添加自定义搜索引擎

```typescript
function addSearchEngine(engine: SearchEngine): Promise<void>
```

**参数**:
```typescript
interface SearchEngine {
  id: string;
  name: string;
  url: string;
  icon?: string;
  default?: boolean;
}
```

---

## 二、渲染进程 API（IPC）

### 搜索事件

#### invoke('search-query', query: string)
发送搜索查询

```typescript
const results = await window.electron.invoke('search-query', 'chrome');
```

**返回**: `SearchResult[]`

#### on('search-results', callback: (results: SearchResult[]) => void)
监听搜索结果

```typescript
window.electron.on('search-results', (results) => {
  console.log('搜索结果:', results);
});
```

---

### 应用操作事件

#### invoke('launch-app', appId: string)
启动应用

```typescript
await window.electron.invoke('launch-app', 'chrome-id');
```

#### invoke('get-all-apps')
获取所有应用

```typescript
const apps = await window.electron.invoke('get-all-apps');
```

---

### 文件操作事件

#### invoke('search-files', query: string, options?: SearchOptions)
搜索文件

```typescript
const files = await window.electron.invoke('search-files', 'document');
```

#### invoke('open-file', path: string)
打开文件

```typescript
await window.electron.invoke('open-file', '/path/to/file.pdf');
```

---

### 配置操作事件

#### invoke('get-config', key: string)
获取配置

```typescript
const theme = await window.electron.invoke('get-config', 'theme');
```

#### invoke('set-config', key: string, value: any)
设置配置

```typescript
await window.electron.invoke('set-config', 'theme', 'dark');
```

#### invoke('get-all-config')
获取所有配置

```typescript
const config = await window.electron.invoke('get-all-config');
```

---

### 窗口操作事件

#### invoke('show-window')
显示窗口

```typescript
await window.electron.invoke('show-window');
```

#### invoke('hide-window')
隐藏窗口

```typescript
await window.electron.invoke('hide-window');
```

#### invoke('toggle-window')
切换窗口

```typescript
await window.electron.invoke('toggle-window');
```

---

## 三、Preload API

### 暴露的 API 接口

#### window.electron.invoke(channel: string, ...args: any[])
调用主进程方法

```typescript
const result = await window.electron.invoke('get-all-apps');
```

#### window.electron.on(channel: string, callback: Function)
监听主进程事件

```typescript
window.electron.on('search-results', (data) => {
  console.log('收到搜索结果:', data);
});
```

#### window.electron.removeListener(channel: string, callback: Function)
移除事件监听器

```typescript
window.electron.removeListener('search-results', callback);
```

---

## 四、插件开发 API

### 插件接口定义

```typescript
interface Plugin {
  // 插件元信息
  metadata: PluginMetadata;
  
  // 初始化方法
  initialize(context: PluginContext): Promise<void>;
  
  // 清理方法
  cleanup(): Promise<void>;
  
  // 处理搜索结果
  onSearch?(query: string): Promise<SearchResult[]>;
  
  // 处理命令
  onCommand?(command: string): Promise<CommandResult>;
  
  // 自定义动作
  handleAction?(action: string, data: any): Promise<any>;
}

interface PluginContext {
  // IPC 通信
  ipc: Electron.IpcMain;
  
  // 数据库访问
  db: Database;
  
  // 配置访问
  config: ConfigManager;
  
  // 注册自定义命令
  registerCommand(name: string, handler: Function): void;
  
  // 注册自定义动作
  registerAction(name: string, handler: Function): void;
}
```

### 示例插件

```typescript
export class ExamplePlugin implements Plugin {
  metadata = {
    id: 'example-plugin',
    name: 'Example Plugin',
    version: '1.0.0',
    description: 'An example plugin',
    author: 'Your Name'
  };
  
  async initialize(context: PluginContext) {
    // 注册自定义命令
    context.registerCommand('calc', async (args) => {
      return eval(args);
    });
  }
  
  async onSearch(query: string) {
    // 返回自定义搜索结果
    return [{
      id: 'custom-result',
      type: 'custom',
      title: `Custom: ${query}`,
      description: 'This is a custom result',
      action: 'custom-action'
    }];
  }
  
  async cleanup() {
    // 清理资源
  }
}
```

---

## 五、类型定义

### 通用类型

```typescript
// 搜索类型
type SearchResultType = 
  | 'app'        // 应用
  | 'file'       // 文件
  | 'command'    // 命令
  | 'web'        // 网页
  | 'history'    // 历史
  | 'custom';    // 自定义

// 主题类型
type Theme = 'light' | 'dark' | 'auto';

// 平台类型
type Platform = 'darwin' | 'win32' | 'linux';

// 文件类型
interface FileType {
  name: string;
  extensions: string[];
  icon?: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'other';
}

// 快捷键定义
interface Shortcut {
  id: string;
  description: string;
  key: string;
  platform: Platform[];
}
```

---

## 六、错误处理

### 错误类型

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 常见错误码
enum ErrorCodes {
  APP_NOT_FOUND = 'APP_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  COMMAND_FAILED = 'COMMAND_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PLUGIN_ERROR = 'PLUGIN_ERROR'
}
```

### 错误处理示例

```typescript
try {
  await launchApp('unknown-app');
} catch (error) {
  if (error instanceof AppError) {
    console.error(`错误 [${error.code}]: ${error.message}`);
  }
}
```

---

## 七、事件系统

### 主进程事件

```typescript
// 窗口事件
'on-window-show'
'on-window-hide'
'on-window-focus'
'on-window-blur'

// 索引事件
'on-index-start'
'on-index-progress'
'on-index-complete'
'on-index-error'

// 应用事件
'on-app-launched'
'on-app-error'

// 配置事件
'on-config-changed'
```

### 使用示例

```typescript
// 主进程
ipcMain.on('search-query', async (event, query) => {
  const results = await searchService.search(query);
  event.reply('search-results', results);
});

// 渲染进程
window.electron.on('search-results', (results) => {
  // 更新 UI
});
```

