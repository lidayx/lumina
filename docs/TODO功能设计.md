# TODO 功能设计

## 一、功能概述

TODO 功能是一个任务管理工具，支持快速创建、查看、完成和删除待办事项。通过智能补全功能，用户可以快速输入常用任务模板和命令，提高任务管理效率。

### 核心功能
1. **任务创建** - 快速添加待办事项
2. **任务查询** - 查看所有待办事项（已完成/未完成）
3. **任务完成** - 标记任务为已完成
4. **任务删除** - 删除不需要的任务
5. **任务编辑** - 修改任务内容
6. **智能补全** - 自动补全常用任务模板和命令

## 二、功能设计

### 1. 任务创建

#### 触发模式
- `todo <任务内容>` 或 `待办 <任务内容>`
- `todo add <任务内容>` 或 `待办添加 <任务内容>`
- `<任务内容> todo` 或 `<任务内容> 待办`

#### 功能实现
- 创建新的待办事项
- 自动添加创建时间
- 默认状态为"未完成"
- 支持优先级设置（高/中/低）

#### 示例输入
```
todo 完成项目文档
待办 明天开会准备材料
todo add 修复bug #high
完成代码审查 todo
```

#### 优先级标记
- `#high` 或 `#高` - 高优先级
- `#medium` 或 `#中` - 中优先级（默认）
- `#low` 或 `#低` - 低优先级

### 2. 任务查询

#### 触发模式
- `todo` 或 `待办` - 查看所有未完成任务
- `todo all` 或 `待办全部` - 查看所有任务（包括已完成）
- `todo done` 或 `待办已完成` - 查看已完成任务
- `todo pending` 或 `待办未完成` - 查看未完成任务
- `todo search <关键词>` 或 `待办搜索 <关键词>` - 搜索任务

#### 功能实现
- 显示任务列表，按优先级和创建时间排序
- 支持筛选（全部/未完成/已完成）
- 支持关键词搜索
- 显示任务数量统计

#### 示例输入
```
todo
待办全部
todo done
待办搜索 项目
```

#### 输出格式
```
待办事项 (3/10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[高] 完成项目文档 (2025-01-15 10:30)
[中] 明天开会准备材料 (2025-01-15 11:00)
[低] 修复bug (2025-01-15 12:00)
```

### 3. 任务完成

#### 触发模式
- `todo done <任务ID>` 或 `待办完成 <任务ID>`
- `todo complete <任务ID>` 或 `待办完成 <任务ID>`
- `todo finish <任务ID>` 或 `待办完成 <任务ID>`
- `done <任务ID>` 或 `完成 <任务ID>`

#### 功能实现
- 标记指定任务为已完成
- 记录完成时间
- 任务从"未完成"列表移除，移至"已完成"列表

#### 示例输入
```
todo done 1
完成 2
done 3
```

### 4. 任务删除

#### 触发模式
- `todo delete <任务ID>` 或 `待办删除 <任务ID>`
- `todo remove <任务ID>` 或 `待办移除 <任务ID>`
- `todo del <任务ID>` 或 `待办删 <任务ID>`

#### 功能实现
- 永久删除指定任务
- 支持批量删除（`todo delete 1,2,3`）
- 删除前确认（可选）

#### 示例输入
```
todo delete 1
待办删除 2
todo del 1,2,3
```

### 5. 任务编辑

#### 触发模式
- `todo edit <任务ID> <新内容>` 或 `待办编辑 <任务ID> <新内容>`
- `todo update <任务ID> <新内容>` 或 `待办更新 <任务ID> <新内容>`

#### 功能实现
- 修改任务内容
- 支持修改优先级
- 保留原始创建时间

#### 示例输入
```
todo edit 1 完成项目文档和测试
待办更新 2 明天开会准备材料和PPT #high
```

### 6. 智能补全功能

#### 功能概述
智能补全功能提供以下能力：
1. **命令补全** - 自动补全 TODO 命令（todo、待办、done 等）
2. **任务模板补全** - 提供常用任务模板（如"完成代码审查"、"准备会议材料"等）
3. **上下文感知** - 根据输入内容智能推荐相关任务
4. **历史记录补全** - 基于历史任务推荐相似内容

#### 触发方式
- 输入 `todo` 或 `待办` 时自动显示补全建议
- 输入部分命令时显示匹配的命令和模板
- 支持拼音匹配（如 `dai` → `待办`）

#### 补全内容类型

##### 1. 命令补全
```
输入: "tod"
补全建议:
- todo <任务内容> - 创建待办事项
- todo all - 查看所有任务
- todo done - 查看已完成任务
- todo search <关键词> - 搜索任务
```

##### 2. 任务模板补全
```
输入: "todo 完成"
补全建议:
- todo 完成代码审查
- todo 完成项目文档
- todo 完成测试用例
- todo 完成代码重构
```

##### 3. 常用任务模板库
```
工作相关:
- 完成代码审查
- 准备会议材料
- 修复bug
- 更新项目文档
- 代码重构
- 性能优化
- 单元测试

生活相关:
- 购买生活用品
- 预约医生
- 缴纳水电费
- 整理房间
- 运动锻炼
```

##### 4. 历史记录补全
- 基于用户历史创建的任务，推荐相似内容
- 支持模糊匹配和拼音匹配
- 按使用频率排序

#### 补全算法
1. **关键词匹配** - 精确匹配和模糊匹配
2. **拼音匹配** - 支持中文拼音输入（如 `dai` → `待办`）
3. **同义词匹配** - 识别功能同义词（如 `todo` = `待办` = `任务`）
4. **使用频率排序** - 常用命令和模板优先显示
5. **上下文感知** - 根据已输入内容推荐相关补全

#### 示例场景

**场景 1：命令补全**
```
用户输入: "tod"
显示补全:
  [todo] 创建待办事项
  [todo all] 查看所有任务
  [todo done] 查看已完成任务
```

**场景 2：任务模板补全**
```
用户输入: "todo 完成"
显示补全:
  [todo 完成代码审查] 完成代码审查
  [todo 完成项目文档] 完成项目文档
  [todo 完成测试用例] 完成测试用例
```

**场景 3：历史记录补全**
```
用户输入: "todo 修复"
显示补全:
  [todo 修复登录bug] (历史记录)
  [todo 修复支付问题] (历史记录)
  [todo 修复性能问题] (模板)
```

## 三、数据结构设计

### 任务对象 (TodoItem)
```typescript
interface TodoItem {
  id: number;                    // 任务ID（自增）
  content: string;               // 任务内容
  priority: 'high' | 'medium' | 'low';  // 优先级
  status: 'pending' | 'done';    // 状态
  createdAt: number;            // 创建时间戳（毫秒）
  completedAt?: number;         // 完成时间戳（可选）
  tags?: string[];              // 标签（可选）
}
```

### 任务模板 (TodoTemplate)
```typescript
interface TodoTemplate {
  id: string;                    // 模板ID
  content: string;               // 模板内容
  category: string;              // 分类（工作/生活/学习等）
  keywords: string[];            // 关键词（用于匹配）
  usageCount: number;            // 使用次数
}
```

## 四、实现方案

### 方案 1：独立服务模块（推荐）

**优点**：
- 代码组织清晰，易于维护
- 可以独立扩展功能
- 符合现有模块化架构

**实现方式**：
1. 创建 `todoService.ts` 服务文件
2. 创建 `todoHandlers.ts` IPC 处理器
3. 使用 SQLite 数据库存储任务数据
4. 实现智能补全逻辑

### 文件结构
```
src/main/services/
  ├── todoService.ts          # TODO 服务主文件
  └── ...

src/main/handlers/
  ├── todoHandlers.ts         # TODO IPC 处理器
  └── ...

src/preload/
  └── index.ts                 # 暴露 TODO API

src/renderer/components/
  └── MainLayout.tsx           # 集成 TODO 结果显示
```

### 核心方法设计

#### todoService.ts
```typescript
class TodoService {
  // 创建任务
  createTodo(content: string, priority?: string): TodoItem;
  
  // 查询任务
  getTodos(filter?: 'all' | 'pending' | 'done'): TodoItem[];
  
  // 完成任务
  completeTodo(id: number): boolean;
  
  // 删除任务
  deleteTodo(id: number): boolean;
  
  // 编辑任务
  updateTodo(id: number, content: string, priority?: string): boolean;
  
  // 搜索任务
  searchTodos(keyword: string): TodoItem[];
  
  // 智能补全
  completeTodo(partial: string): Array<{
    format: string;
    description: string;
    example: string;
  }>;
  
  // 获取帮助信息
  getTodoHelp(): {
    title: string;
    description: string;
    formats: Array<{
      format: string;
      description: string;
      example: string;
    }>;
  };
}
```

## 五、数据库设计

### 表结构

#### todos 表
```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  tags TEXT,
  updated_at INTEGER
);
```

#### todo_templates 表（任务模板）
```sql
CREATE TABLE todo_templates (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
```

#### todo_history 表（历史记录，用于补全）
```sql
CREATE TABLE todo_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  usage_count INTEGER DEFAULT 1,
  last_used_at INTEGER NOT NULL
);
```

## 六、智能补全实现细节

### 1. 补全匹配算法

#### 使用现有 matchUtils
复用 `src/shared/utils/matchUtils.ts` 中的匹配算法：
- `calculateMatchScore` - 综合匹配评分
- 支持模糊匹配、拼音匹配、同义词匹配

#### 补全优先级
1. **精确匹配** - 完全匹配的命令或模板（优先级最高）
2. **前缀匹配** - 以输入开头的命令或模板
3. **包含匹配** - 包含输入的命令或模板
4. **拼音匹配** - 拼音匹配的命令或模板
5. **模糊匹配** - 编辑距离匹配

### 2. 补全数据源

#### 命令补全
```typescript
const commandFormats = [
  { format: 'todo', description: '创建待办事项', example: 'todo 完成项目文档', keywords: ['todo', '待办', '任务'] },
  { format: 'todo all', description: '查看所有任务', example: 'todo all', keywords: ['all', '全部', '所有'] },
  { format: 'todo done', description: '查看已完成任务', example: 'todo done', keywords: ['done', '已完成', '完成'] },
  { format: 'todo search', description: '搜索任务', example: 'todo search 项目', keywords: ['search', '搜索', '查找'] },
  // ...
];
```

#### 任务模板补全
```typescript
const taskTemplates = [
  { content: '完成代码审查', category: '工作', keywords: ['代码', '审查', 'review', 'code'] },
  { content: '准备会议材料', category: '工作', keywords: ['会议', '材料', 'meeting', '准备'] },
  { content: '修复bug', category: '工作', keywords: ['修复', 'bug', '问题', 'fix'] },
  // ...
];
```

#### 历史记录补全
- 从 `todo_history` 表读取历史任务
- 按使用频率和最近使用时间排序
- 匹配用户输入的关键词

### 3. 补全结果格式

```typescript
interface CompletionSuggestion {
  format: string;        // 完整命令格式（如 "todo 完成代码审查"）
  description: string;   // 描述（如 "创建待办事项"）
  example: string;       // 示例（如 "todo 完成代码审查"）
  score: number;        // 匹配分数（用于排序）
  type: 'command' | 'template' | 'history';  // 类型
}
```

## 七、用户界面设计

### 1. 任务列表显示

#### 未完成任务
```
待办事项 (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] [高] 完成项目文档 (2025-01-15 10:30)
[2] [中] 明天开会准备材料 (2025-01-15 11:00)
[3] [低] 修复bug (2025-01-15 12:00)
```

#### 已完成任务
```
已完成任务 (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] 完成代码审查 (2025-01-14 完成)
[✓] 更新项目文档 (2025-01-13 完成)
```

### 2. 智能补全显示

#### 命令补全
```
输入: "tod"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[todo] 创建待办事项
  示例: todo 完成项目文档

[todo all] 查看所有任务
  示例: todo all

[todo done] 查看已完成任务
  示例: todo done
```

#### 任务模板补全
```
输入: "todo 完成"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[todo 完成代码审查] 完成代码审查
[todo 完成项目文档] 完成项目文档
[todo 完成测试用例] 完成测试用例
```

## 八、功能开关

在设置中添加 TODO 功能开关：
- 功能名称：TODO 管理
- 设置路径：通用设置 → 功能开关 → TODO 管理
- 默认状态：开启

## 九、测试用例

### 1. 任务创建测试
```
输入: "todo 完成项目文档"
预期: 创建新任务，显示任务ID和创建时间

输入: "todo 修复bug #high"
预期: 创建高优先级任务

输入: "待办 明天开会"
预期: 使用中文命令创建任务
```

### 2. 任务查询测试
```
输入: "todo"
预期: 显示所有未完成任务

输入: "todo all"
预期: 显示所有任务（包括已完成）

输入: "todo search 项目"
预期: 显示包含"项目"关键词的任务
```

### 3. 任务完成测试
```
输入: "todo done 1"
预期: 标记ID为1的任务为已完成

输入: "完成 2"
预期: 使用中文命令完成任务
```

### 4. 智能补全测试
```
输入: "tod"
预期: 显示 todo 相关命令补全

输入: "todo 完成"
预期: 显示"完成"相关的任务模板

输入: "dai"
预期: 拼音匹配，显示"待办"相关补全
```

## 十、实现优先级

### 第一阶段（核心功能）
1. ✅ 任务创建
2. ✅ 任务查询
3. ✅ 任务完成
4. ✅ 任务删除
5. ✅ 数据库存储

### 第二阶段（增强功能）
1. ✅ 任务编辑
2. ✅ 任务搜索
3. ✅ 优先级设置
4. ✅ 标签支持

### 第三阶段（智能补全）
1. ✅ 命令补全
2. ✅ 任务模板补全
3. ✅ 历史记录补全
4. ✅ 拼音匹配
5. ✅ 模糊匹配

### 第四阶段（高级功能）
1. ⏳ 任务提醒
2. ⏳ 任务分类
3. ⏳ 任务导出
4. ⏳ 任务统计

## 十一、技术要点

### 1. 数据库操作
- 使用 `dbManager` 管理 SQLite 数据库
- 实现任务 CRUD 操作
- 支持事务处理

### 2. IPC 通信
- 创建 `todoHandlers.ts` 注册 IPC 处理器
- 在 `preload/index.ts` 中暴露 API
- 前端通过 `window.electron.todo.*` 调用

### 3. 智能补全集成
- 复用 `matchUtils.ts` 中的匹配算法
- 在 `MainLayout.tsx` 中集成补全显示
- 支持 Tab 键补全

### 4. 结果展示
- 在 `MainLayout.tsx` 中显示任务列表
- 支持多行结果显示
- 支持任务操作（完成/删除）

## 十二、注意事项

1. **数据持久化**：所有任务数据存储在 SQLite 数据库中，确保数据不丢失
2. **性能优化**：大量任务时使用分页加载，避免一次性加载所有数据
3. **用户体验**：提供清晰的操作反馈，支持撤销操作
4. **安全性**：防止 SQL 注入，使用参数化查询
5. **兼容性**：保持与现有功能模块的一致性

## 十三、参考实现

参考以下现有功能的实现方式：
- **时间工具** (`timeService.ts`) - 服务结构、补全实现
- **编码解码** (`encodeService.ts`) - 命令解析、结果展示
- **字符串工具** (`stringService.ts`) - 多格式支持、补全逻辑

