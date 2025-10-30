# UI 组件说明

## 已实现的组件

### 1. SearchBar - 搜索框组件

**位置**: `src/renderer/components/SearchBar.tsx`

**功能特性**:
- ✅ 实时搜索输入
- ✅ 自动聚焦
- ✅ 清空按钮
- ✅ ESC 键清空
- ✅ 搜索图标显示
- ✅ 响应式设计
- ✅ 暗色模式支持

**Props 接口**:
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;  // 搜索回调
  placeholder?: string;                // 占位符文本
  autoFocus?: boolean;                 // 自动聚焦
}
```

**使用示例**:
```typescript
<SearchBar 
  onSearch={(query) => handleSearch(query)}
  placeholder="搜索应用、文件或命令..."
  autoFocus={true}
/>
```

### 2. ResultList - 结果列表组件

**位置**: `src/renderer/components/ResultList.tsx`

**功能特性**:
- ✅ 结果展示
- ✅ 类型图标（app、file、command）
- ✅ 选中高亮显示
- ✅ 点击交互
- ✅ 描述信息
- ✅ 类型标签
- ✅ 键盘导航支持
- ✅ 空状态提示

**Props 接口**:
```typescript
interface ResultListProps {
  results: SearchResult[];      // 搜索结果数组
  selectedIndex: number;        // 当前选中索引
  onSelect: (index: number) => void;  // 选择回调
}

interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'command' | 'web' | 'history';
  title: string;
  description?: string;
  icon?: string;
  action: string;
  score: number;
}
```

**使用示例**:
```typescript
<ResultList
  results={results}
  selectedIndex={0}
  onSelect={(index) => handleSelect(index)}
/>
```

### 3. MainLayout - 主布局组件

**位置**: `src/renderer/components/MainLayout.tsx`

**功能特性**:
- ✅ 完整的主界面布局
- ✅ 搜索框集成
- ✅ 结果列表集成
- ✅ 键盘导航（↑↓ Enter ESC）
- ✅ 空状态显示
- ✅ 功能卡片展示
- ✅ 快捷键提示
- ✅ 响应式设计
- ✅ 暗色模式

**Props 接口**:
```typescript
interface MainLayoutProps {
  onExecute?: (result: SearchResult) => void;  // 执行回调
}
```

**使用示例**:
```typescript
<MainLayout onExecute={(result) => {
  console.log('执行:', result);
}} />
```

## 键盘快捷键

### 窗口内快捷键

| 按键 | 功能 |
|------|------|
| `↑` | 向上选择结果 |
| `↓` | 向下选择结果 |
| `Enter` | 确认执行选中的结果 |
| `ESC` | 清空搜索框 |

### 全局快捷键

| 平台 | 快捷键 | 功能 |
|------|--------|------|
| macOS | `Cmd + Space` | 切换主窗口显示/隐藏 |
| Windows/Linux | `Ctrl + Alt + Space` | 切换主窗口显示/隐藏 |

## 界面状态

### 空状态（无搜索）

**显示内容**:
- 标题：Electron Quick
- 副标题：快速启动你的应用和文件
- 功能卡片（3个）：
  - 启动应用
  - 搜索文件
  - 执行命令
- 快捷键提示

### 搜索状态

**显示内容**:
- 搜索框（自动聚焦）
- 实时结果显示
- 键盘导航指示
- 结果类型标识

### 结果显示

每个结果项显示：
- **图标**: 根据类型显示不同图标
  - 应用：蓝色立方体图标
  - 文件：绿色文档图标
  - 命令：紫色终端图标
- **标题**: 结果名称
- **描述**: 详细信息
- **类型标签**: 带颜色标识

## 设计风格

### 配色方案

**亮色模式**:
- 背景: 灰色渐变 (from-gray-50 to-gray-100)
- 文字: 深灰色 (gray-800)
- 输入框: 白色背景
- 选中: 蓝色高亮

**暗色模式**:
- 背景: 深灰色渐变 (from-gray-900 to-gray-800)
- 文字: 白色
- 输入框: 深灰背景 (gray-800)
- 选中: 深蓝色高亮

### 动画效果

- **悬停**: 背景色变化过渡
- **选中**: 边框高亮动画
- **输入**: 实时响应

## 下一步开发

### 待实现功能

1. **IPC 通信**
   - 连接到主进程
   - 实现真实搜索
   - 应用启动功能

2. **搜索功能**
   - 应用搜索
   - 文件搜索
   - 命令执行

3. **状态管理**
   - 使用 Zustand 管理状态
   - 搜索结果缓存
   - 历史记录

4. **优化**
   - 加载状态
   - 错误处理
   - 性能优化

## 问题排查

### 如果页面空白

1. **检查 Vite 服务器是否运行**
   ```bash
   ps aux | grep vite
   ```

2. **检查端口是否被占用**
   ```bash
   lsof -i :3000
   ```

3. **查看浏览器控制台错误**
   - 按 F12 或 Cmd+Option+I 打开开发者工具
   - 查看 Console 标签页的错误信息

4. **检查编译文件**
   ```bash
   ls -la dist-electron/
   ```

5. **重启开发服务器**
   ```bash
   pkill -f vite
   npm run dev
   ```

## 总结

✅ UI 组件已全部实现  
✅ 搜索框、结果列表、主布局完成  
✅ 键盘导航已支持  
✅ 暗色模式已适配  
✅ 响应式设计已完成  
✅ 界面样式已美化  

**下一步**: 实现 IPC 通信和真实搜索功能！

