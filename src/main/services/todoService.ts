/**
 * TODO 服务
 * 支持任务创建、查询、完成、删除、编辑和智能补全
 */

import { settingsService } from './settingsService';
import { calculateMatchScore } from '../../shared/utils/matchUtils';
import { dbManager } from '../database/db';

// ========== 类型定义 ==========

export interface TodoItem {
  id: number;
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'done';
  createdAt: number;
  completedAt?: number;
  tags?: string;
}

export interface TodoResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
  todos?: TodoItem[];
}

export interface TodoTemplate {
  id: string;
  content: string;
  category: string;
  keywords: string[];
  usageCount: number;
}

// ========== 常量定义 ==========

// 默认任务模板
const DEFAULT_TEMPLATES: TodoTemplate[] = [
  { id: 'template-1', content: '完成代码审查', category: '工作', keywords: ['代码', '审查', 'review', 'code'], usageCount: 0 },
  { id: 'template-2', content: '准备会议材料', category: '工作', keywords: ['会议', '材料', 'meeting', '准备'], usageCount: 0 },
  { id: 'template-3', content: '修复bug', category: '工作', keywords: ['修复', 'bug', '问题', 'fix'], usageCount: 0 },
  { id: 'template-4', content: '更新项目文档', category: '工作', keywords: ['更新', '文档', 'document', '项目'], usageCount: 0 },
  { id: 'template-5', content: '代码重构', category: '工作', keywords: ['重构', 'refactor', '代码'], usageCount: 0 },
  { id: 'template-6', content: '性能优化', category: '工作', keywords: ['性能', '优化', 'performance', 'optimize'], usageCount: 0 },
  { id: 'template-7', content: '单元测试', category: '工作', keywords: ['测试', 'test', '单元'], usageCount: 0 },
  { id: 'template-8', content: '购买生活用品', category: '生活', keywords: ['购买', '生活', 'shopping', '用品'], usageCount: 0 },
  { id: 'template-9', content: '预约医生', category: '生活', keywords: ['预约', '医生', 'appointment', 'doctor'], usageCount: 0 },
  { id: 'template-10', content: '运动锻炼', category: '生活', keywords: ['运动', '锻炼', 'exercise', '健身'], usageCount: 0 },
];

/**
 * TODO 服务类
 */
class TodoService {
  private initialized: boolean = false;

  /**
   * 初始化服务（创建表结构）
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const db = await dbManager.getDb();

      // 创建 todos 表
      db.run(`
        CREATE TABLE IF NOT EXISTS todos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          priority TEXT NOT NULL DEFAULT 'medium',
          status TEXT NOT NULL DEFAULT 'pending',
          created_at INTEGER NOT NULL,
          completed_at INTEGER,
          tags TEXT,
          updated_at INTEGER
        )
      `);

      // 创建 todo_templates 表
      db.run(`
        CREATE TABLE IF NOT EXISTS todo_templates (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          keywords TEXT NOT NULL,
          usage_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      `);

      // 创建 todo_history 表
      db.run(`
        CREATE TABLE IF NOT EXISTS todo_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          usage_count INTEGER DEFAULT 1,
          last_used_at INTEGER NOT NULL
        )
      `);

      // 创建索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_todo_history_content ON todo_history(content)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_todo_history_usage ON todo_history(usage_count DESC, last_used_at DESC)`);

      // 初始化默认模板
      await this.initDefaultTemplates();

      dbManager.saveDatabase();
      this.initialized = true;
      console.log('✅ [TODO服务] 初始化完成');
    } catch (error) {
      console.error('❌ [TODO服务] 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化默认模板
   */
  private async initDefaultTemplates(): Promise<void> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM todo_templates');
      const result = stmt.getAsObject() as { count: number };
      stmt.free();

      if (result.count === 0) {
        const insertStmt = db.prepare(
          'INSERT INTO todo_templates (id, content, category, keywords, usage_count, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );

        for (const template of DEFAULT_TEMPLATES) {
          insertStmt.run([
            template.id,
            template.content,
            template.category,
            JSON.stringify(template.keywords),
            template.usageCount,
            Date.now(),
          ]);
        }
        insertStmt.free();
        console.log('✅ [TODO服务] 已初始化默认模板');
      }
    } catch (error) {
      console.error('❌ [TODO服务] 初始化默认模板失败:', error);
    }
  }

  /**
   * 处理 TODO 查询
   * 返回 TodoResult 如果识别为 TODO 查询，否则返回 null
   * @param query 查询字符串
   * @param executeOnly 如果为 true，只执行修改操作（创建、删除、编辑、完成），不执行查询操作
   */
  public async handleTodoQuery(query: string, executeOnly: boolean = false): Promise<TodoResult | null> {
    // 检查功能开关
    const settings = settingsService.getSettings();
    if (settings.featureTodo === false) {
      return null;
    }

    try {
      await this.initialize();
      const trimmedQuery = query.trim();

      // 1. 检测任务查询（优先级最高，避免与创建任务冲突）
      // 查询操作可以在输入过程中显示，不需要 executeOnly
      if (!executeOnly) {
        const listResult = this.parseListTodos(trimmedQuery);
        if (listResult) {
          return await this.listTodos(listResult.filter);
        }

        // 5. 检测任务搜索（查询操作）
        const searchResult = this.parseSearchTodos(trimmedQuery);
        if (searchResult) {
          return await this.searchTodos(searchResult.keyword);
        }

        // 在输入过程中，如果检测到创建任务模式，返回提示信息（不执行创建）
        const createResult = this.parseCreateTodo(trimmedQuery);
        if (createResult) {
          const priorityText = createResult.priority === 'high' ? '（高优先级）' : createResult.priority === 'low' ? '（低优先级）' : '';
          return {
            input: trimmedQuery,
            output: `创建任务: ${createResult.content}${priorityText}\n按回车确认`,
            success: true,
          };
        }

        // 在输入过程中，检测删除/完成命令
        const deleteMatch = trimmedQuery.match(/^(?:todo|待办)\s+(?:delete|remove|del|删除|移除|删)\s*(\d*)$/i);
        if (deleteMatch) {
          const id = deleteMatch[1];
          if (!id) {
            return {
              input: trimmedQuery,
              output: '删除任务\n请输入任务 ID，例如: todo delete 1\n按回车确认',
              success: false,
              error: '请输入任务 ID',
            };
          } else {
            // 检查任务是否存在
            const taskExists = await this.checkTaskExists(parseInt(id, 10));
            if (taskExists) {
              return {
                input: trimmedQuery,
                output: `删除任务 ID: ${id}\n任务: ${taskExists.content}\n按回车确认`,
                success: true,
              };
            } else {
              return {
                input: trimmedQuery,
                output: `任务 ID ${id} 不存在`,
                success: false,
                error: `任务 ID ${id} 不存在`,
              };
            }
          }
        }

        const completeMatch = trimmedQuery.match(/^(?:todo|待办)\s+(?:done|complete|finish|完成)\s*(\d*)$/i);
        if (completeMatch) {
          const id = completeMatch[1];
          if (!id) {
            return {
              input: trimmedQuery,
              output: '完成任务\n请输入任务 ID，例如: todo done 1\n按回车确认',
              success: false,
              error: '请输入任务 ID',
            };
          } else {
            // 检查任务是否存在
            const taskExists = await this.checkTaskExists(parseInt(id, 10));
            if (taskExists) {
              const statusText = taskExists.status === 'done' ? '（已完成）' : '';
              return {
                input: trimmedQuery,
                output: `完成任务 ID: ${id}\n任务: ${taskExists.content}${statusText}\n按回车确认`,
                success: true,
              };
            } else {
              return {
                input: trimmedQuery,
                output: `任务 ID ${id} 不存在`,
                success: false,
                error: `任务 ID ${id} 不存在`,
              };
            }
          }
        }

        // 在输入过程中，检测编辑命令
        const editMatch = trimmedQuery.match(/^(?:todo|待办)\s+(?:edit|update|编辑|更新)\s+(\d*)(?:\s+(.+))?$/i);
        if (editMatch) {
          const id = editMatch[1];
          const newContent = editMatch[2]?.trim();
          if (!id) {
            return {
              input: trimmedQuery,
              output: '编辑任务\n请输入任务 ID 和新内容，例如: todo edit 1 新内容\n按回车确认',
              success: false,
              error: '请输入任务 ID 和新内容',
            };
          } else {
            // 检查任务是否存在
            const taskExists = await this.checkTaskExists(parseInt(id, 10));
            if (!taskExists) {
              return {
                input: trimmedQuery,
                output: `任务 ID ${id} 不存在`,
                success: false,
                error: `任务 ID ${id} 不存在`,
              };
            } else if (!newContent) {
              return {
                input: trimmedQuery,
                output: `编辑任务 ID: ${id}\n当前内容: ${taskExists.content}\n请输入新内容，例如: todo edit ${id} 新内容\n按回车确认`,
                success: false,
                error: '请输入新内容',
              };
            } else {
              return {
                input: trimmedQuery,
                output: `编辑任务 ID: ${id}\n当前内容: ${taskExists.content}\n新内容: ${newContent}\n按回车确认`,
                success: true,
              };
            }
          }
        }
      }

      // 修改操作（创建、删除、编辑、完成）只在 executeOnly=true 时执行
      if (executeOnly) {
        // 2. 检测任务完成
        const completeResult = this.parseCompleteTodo(trimmedQuery);
        if (completeResult) {
          return await this.markAsComplete(completeResult.id);
        }

        // 3. 检测任务删除（在创建任务之前，避免 "todo delete" 被解析为创建任务）
        const deleteResult = this.parseDeleteTodo(trimmedQuery);
        if (deleteResult) {
          console.log(`🗑️ [TODO服务] 解析到删除任务: ID=${deleteResult.id}`);
          return await this.deleteTodo(deleteResult.id);
        }

        // 4. 检测任务编辑
        const editResult = this.parseEditTodo(trimmedQuery);
        if (editResult) {
          return await this.updateTodo(editResult.id, editResult.content, editResult.priority);
        }

        // 6. 检测任务创建（放在最后，避免与其他命令冲突）
        const createResult = this.parseCreateTodo(trimmedQuery);
        if (createResult) {
          console.log(`📝 [TODO服务] 解析到创建任务: "${createResult.content}", 优先级: ${createResult.priority}`);
          return await this.createTodo(createResult.content, createResult.priority);
        }
      }

      return null;
    } catch (error: any) {
      console.error(`❌ [TODO服务] 处理失败: ${error.message}`);
      const errorMsg = error.message || 'TODO 处理错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 解析方法 ==========

  /**
   * 解析创建任务命令
   */
  private parseCreateTodo(query: string): { content: string; priority: 'high' | 'medium' | 'low' } | null {
    // 排除命令关键字，避免 "todo delete"、"todo done" 等被解析为创建任务
    const commandKeywords = /^(?:todo|待办)\s+(?:all|done|pending|delete|remove|del|edit|update|search|完成|删除|移除|删|编辑|更新|搜索|全部|已完成|未完成)(\s|$)/i;
    if (commandKeywords.test(query)) {
      return null;
    }

    // 匹配: todo <内容> 或 待办 <内容>
    let pattern = /^(?:todo|待办)(?:\s+add)?\s+(.+)$/i;
    let match = query.match(pattern);
    
    if (!match) {
      // 匹配: <内容> todo 或 <内容> 待办
      pattern = /^(.+?)\s+(?:todo|待办)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const content = match[1].trim();
    if (!content) {
      return null;
    }

    // 解析优先级
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (/#high|#高/i.test(content)) {
      priority = 'high';
    } else if (/#low|#低/i.test(content)) {
      priority = 'low';
    } else if (/#medium|#中/i.test(content)) {
      priority = 'medium';
    }

    // 移除所有优先级标记（包括 #medium）
    const cleanContent = content.replace(/#(high|medium|low|高|中|低)/gi, '').trim();

    return {
      content: cleanContent,
      priority,
    };
  }

  /**
   * 解析查询任务命令
   */
  private parseListTodos(query: string): { filter: 'all' | 'pending' | 'done' } | null {
    const lowerQuery = query.toLowerCase().trim();
    
    if (lowerQuery === 'todo' || lowerQuery === '待办') {
      return { filter: 'pending' };
    }
    
    if (/^todo\s+all|^待办\s*全部$/i.test(query)) {
      return { filter: 'all' };
    }
    
    if (/^todo\s+done|^待办\s*已完成$/i.test(query)) {
      return { filter: 'done' };
    }
    
    if (/^todo\s+pending|^待办\s*未完成$/i.test(query)) {
      return { filter: 'pending' };
    }

    return null;
  }

  /**
   * 解析完成任务命令
   */
  private parseCompleteTodo(query: string): { id: number } | null {
    // 匹配: todo done <ID> 或 待办完成 <ID>
    let pattern = /^(?:todo\s+(?:done|complete|finish)|待办\s*完成|done|完成)\s+(\d+)$/i;
    let match = query.match(pattern);
    
    if (!match) {
      return null;
    }

    const id = parseInt(match[1], 10);
    if (isNaN(id) || id <= 0) {
      return null;
    }

    return { id };
  }

  /**
   * 解析删除任务命令
   */
  private parseDeleteTodo(query: string): { id: number } | null {
    // 匹配: todo delete <ID> 或 待办删除 <ID>
    let pattern = /^(?:todo\s+(?:delete|remove|del)|待办\s*(?:删除|移除|删))\s+(\d+(?:,\s*\d+)*)$/i;
    let match = query.match(pattern);
    
    if (!match) {
      return null;
    }

    // 支持多个ID（逗号分隔），但这里先只处理第一个
    const ids = match[1].split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0);
    if (ids.length === 0) {
      return null;
    }

    return { id: ids[0] }; // 暂时只返回第一个ID
  }

  /**
   * 解析编辑任务命令
   * 支持两种格式：
   * 1. todo edit <ID> <内容> [--priority high|medium|low]
   * 2. todo edit <ID> <内容> #high|#medium|#low (向后兼容，但会从内容中移除)
   */
  private parseEditTodo(query: string): { id: number; content: string; priority?: 'high' | 'medium' | 'low' } | null {
    // 匹配: todo edit <ID> <内容> [--priority <priority>] 或 待办编辑 <ID> <内容>
    let pattern = /^(?:todo\s+(?:edit|update)|待办\s*(?:编辑|更新))\s+(\d+)\s+(.+)$/i;
    let match = query.match(pattern);
    
    if (!match) {
      return null;
    }

    const id = parseInt(match[1], 10);
    if (isNaN(id) || id <= 0) {
      return null;
    }

    let content = match[2].trim();
    if (!content) {
      return null;
    }

    // 解析优先级：优先检查 --priority 参数
    let priority: 'high' | 'medium' | 'low' | undefined = undefined;
    const priorityPattern = /--priority\s+(high|medium|low|高|中|低)/i;
    const priorityMatch = content.match(priorityPattern);
    if (priorityMatch) {
      const priorityValue = priorityMatch[1].toLowerCase();
      if (priorityValue === 'high' || priorityValue === '高') {
        priority = 'high';
      } else if (priorityValue === 'low' || priorityValue === '低') {
        priority = 'low';
      } else {
        priority = 'medium';
      }
      // 移除 --priority 参数
      content = content.replace(priorityPattern, '').trim();
    } else {
      // 向后兼容：检查 #high, #medium, #low 标记
      if (/#high|#高/i.test(content)) {
        priority = 'high';
        content = content.replace(/#high|#高/gi, '').trim();
      } else if (/#low|#低/i.test(content)) {
        priority = 'low';
        content = content.replace(/#low|#低/gi, '').trim();
      } else if (/#medium|#中/i.test(content)) {
        priority = 'medium';
        content = content.replace(/#medium|#中/gi, '').trim();
      }
    }

    return {
      id,
      content: content.trim(),
      priority,
    };
  }

  /**
   * 解析搜索任务命令
   */
  private parseSearchTodos(query: string): { keyword: string } | null {
    // 匹配: todo search <关键词> 或 待办搜索 <关键词>
    const pattern = /^(?:todo\s+search|待办\s*搜索)\s+(.+)$/i;
    const match = query.match(pattern);
    
    if (!match) {
      return null;
    }

    const keyword = match[1].trim();
    if (!keyword) {
      return null;
    }

    return { keyword };
  }

  // ========== CRUD 操作 ==========

  /**
   * 创建任务
   */
  private async createTodo(content: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<TodoResult> {
    try {
      console.log(`📝 [TODO服务] 创建任务: "${content}", 优先级: ${priority}`);
      const db = await dbManager.getDb();
      const now = Date.now();

      // 检查是否在最近1秒内创建了相同内容的任务（防止重复创建）
      const checkStmt = db.prepare(
        'SELECT id FROM todos WHERE content = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1'
      );
      checkStmt.bind([content, now - 1000]);
      let recentId: number | null = null;
      if (checkStmt.step()) {
        const row = checkStmt.getAsObject() as any;
        recentId = row.id;
      }
      checkStmt.free();
      
      if (recentId !== null) {
        console.log(`⚠️ [TODO服务] 检测到重复创建，返回已有任务 ID: ${recentId}`);
        return {
          input: `todo ${content}`,
          output: `任务已存在 (ID: ${recentId}) - ${this.formatTodoItem({ id: recentId, content, priority, status: 'pending', createdAt: now })}`,
          success: true,
        };
      }

      const stmt = db.prepare(
        'INSERT INTO todos (content, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      );
      stmt.run([content, priority, 'pending', now, now]);
      stmt.free();

      // 获取最后插入的 ID（在 stmt.free() 之后仍然有效）
      const lastInsertResult = db.exec('SELECT last_insert_rowid() as id');
      let todoId: number | null = null;
      
      if (lastInsertResult && lastInsertResult.length > 0 && lastInsertResult[0].values && lastInsertResult[0].values.length > 0) {
        todoId = lastInsertResult[0].values[0][0] as number;
      }
      
      // 如果 last_insert_rowid() 返回 0 或失败，查询最后插入的行
      if (!todoId || todoId === 0) {
        const lastRowResult = db.exec('SELECT id FROM todos ORDER BY id DESC LIMIT 1');
        if (lastRowResult && lastRowResult.length > 0 && lastRowResult[0].values && lastRowResult[0].values.length > 0) {
          todoId = lastRowResult[0].values[0][0] as number;
        }
      }
      
      // 如果仍然无法获取 ID，返回错误
      if (!todoId || todoId === 0) {
        const errorMsg = '创建任务失败：无法获取任务 ID';
        return {
          input: `todo ${content}`,
          output: errorMsg,
          success: false,
          error: errorMsg,
        };
      }

      // 记录到历史表（用于补全）
      await this.addToHistory(content);

      // 更新模板使用次数（如果匹配）
      await this.updateTemplateUsage(content);

      dbManager.saveDatabase();

      return {
        input: `todo ${content}`,
        output: `任务已创建 (ID: ${todoId}) - ${this.formatTodoItem({ id: todoId, content, priority, status: 'pending', createdAt: now })}`,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = error.message || '创建任务失败';
      return {
        input: `todo ${content}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 查询任务列表
   */
  private async listTodos(filter: 'all' | 'pending' | 'done' = 'pending'): Promise<TodoResult> {
    try {
      const db = await dbManager.getDb();
      let query = 'SELECT * FROM todos';
      const params: any[] = [];

      if (filter === 'pending') {
        query += ' WHERE status = ? ORDER BY priority DESC, created_at DESC';
        params.push('pending');
      } else if (filter === 'done') {
        query += ' WHERE status = ? ORDER BY completed_at DESC';
        params.push('done');
      } else {
        query += ' ORDER BY status ASC, priority DESC, created_at DESC';
      }

      const stmt = db.prepare(query);
      if (params.length > 0) {
        stmt.bind(params);
      }

      const todos: TodoItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        todos.push({
          id: row.id,
          content: row.content,
          priority: row.priority,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          tags: row.tags,
        });
      }
      stmt.free();

      const pendingCount = todos.filter(t => t.status === 'pending').length;
      const doneCount = todos.filter(t => t.status === 'done').length;
      const totalCount = todos.length;

      let output = '';
      if (filter === 'pending') {
        output = `待办事项 (${pendingCount})`;
        if (todos.length === 0) {
          // 没有任务时，不显示分隔线和额外内容
        } else {
          output += '\n';
          todos.forEach(todo => {
            output += this.formatTodoItem(todo) + '\n';
          });
          output = output.trim(); // 移除最后的换行
        }
      } else if (filter === 'done') {
        output = `已完成任务 (${doneCount})`;
        if (todos.length === 0) {
          // 没有任务时，不显示分隔线和额外内容
        } else {
          output += '\n';
          todos.forEach(todo => {
            output += `[✓] ${todo.content} (${this.formatDate(todo.completedAt || 0)} 完成)\n`;
          });
          output = output.trim(); // 移除最后的换行
        }
      } else {
        output = `所有任务 (${totalCount}, 待办: ${pendingCount}, 已完成: ${doneCount})`;
        if (todos.length === 0) {
          // 没有任务时，不显示分隔线和额外内容
        } else {
          output += '\n';
          todos.forEach(todo => {
            if (todo.status === 'pending') {
              output += this.formatTodoItem(todo) + '\n';
            } else {
              output += `[✓] ${todo.content} (${this.formatDate(todo.completedAt || 0)} 完成)\n`;
            }
          });
          output = output.trim(); // 移除最后的换行
        }
      }

      return {
        input: filter === 'pending' ? 'todo' : `todo ${filter}`,
        output: output.trim(),
        success: true,
        todos,
      };
    } catch (error: any) {
      const errorMsg = error.message || '查询任务失败';
      return {
        input: `todo ${filter}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 完成任务（标记为已完成）
   */
  private async markAsComplete(id: number): Promise<TodoResult> {
    try {
      const db = await dbManager.getDb();
      const now = Date.now();

      // 先查询任务是否存在
      const selectStmt = db.prepare('SELECT * FROM todos WHERE id = ?');
      selectStmt.bind([id]);
      let todo: TodoItem | null = null;
      if (selectStmt.step()) {
        const row = selectStmt.getAsObject() as any;
        todo = {
          id: row.id,
          content: row.content,
          priority: row.priority,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          tags: row.tags,
        };
      }
      selectStmt.free();

      if (!todo) {
        return {
          input: `todo done ${id}`,
          output: `任务 ID ${id} 不存在`,
          success: false,
          error: `任务 ID ${id} 不存在`,
        };
      }

      if (todo.status === 'done') {
        return {
          input: `todo done ${id}`,
          output: `任务 "${todo.content}" 已完成`,
          success: true,
        };
      }

      // 更新任务状态
      const updateStmt = db.prepare('UPDATE todos SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?');
      updateStmt.run(['done', now, now, id]);
      updateStmt.free();

      dbManager.saveDatabase();

      return {
        input: `todo done ${id}`,
        output: `任务已完成: ${todo.content}`,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = error.message || '完成任务失败';
      return {
        input: `todo done ${id}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 删除任务
   */
  private async deleteTodo(id: number): Promise<TodoResult> {
    try {
      console.log(`🗑️ [TODO服务] 删除任务 ID: ${id}`);
      const db = await dbManager.getDb();

      // 先查询任务是否存在
      const selectStmt = db.prepare('SELECT content FROM todos WHERE id = ?');
      selectStmt.bind([id]);
      let content = '';
      if (selectStmt.step()) {
        const row = selectStmt.getAsObject() as any;
        content = row.content;
        console.log(`🗑️ [TODO服务] 找到任务: ID=${id}, content="${content}"`);
      } else {
        console.log(`🗑️ [TODO服务] 任务不存在: ID=${id}`);
      }
      selectStmt.free();

      if (!content) {
        return {
          input: `todo delete ${id}`,
          output: `任务 ID ${id} 不存在`,
          success: false,
          error: `任务 ID ${id} 不存在`,
        };
      }

      // 删除任务
      const deleteStmt = db.prepare('DELETE FROM todos WHERE id = ?');
      deleteStmt.run([id]);
      deleteStmt.free();

      dbManager.saveDatabase();

      console.log(`✅ [TODO服务] 任务已删除: ID=${id}, content="${content}"`);

      return {
        input: `todo delete ${id}`,
        output: `任务已删除: ${content}`,
        success: true,
      };
    } catch (error: any) {
      console.error(`❌ [TODO服务] 删除任务失败: ID=${id}, error=${error.message}`);
      const errorMsg = error.message || '删除任务失败';
      return {
        input: `todo delete ${id}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 更新任务
   */
  private async updateTodo(id: number, content: string, priority?: 'high' | 'medium' | 'low'): Promise<TodoResult> {
    try {
      const db = await dbManager.getDb();
      const now = Date.now();

      // 先查询任务是否存在
      const selectStmt = db.prepare('SELECT * FROM todos WHERE id = ?');
      selectStmt.bind([id]);
      let todo: TodoItem | null = null;
      if (selectStmt.step()) {
        const row = selectStmt.getAsObject() as any;
        todo = {
          id: row.id,
          content: row.content,
          priority: row.priority,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          tags: row.tags,
        };
      }
      selectStmt.free();

      if (!todo) {
        return {
          input: `todo edit ${id} ${content}`,
          output: `任务 ID ${id} 不存在`,
          success: false,
          error: `任务 ID ${id} 不存在`,
        };
      }

      // 更新任务
      if (priority) {
        const updateStmt = db.prepare('UPDATE todos SET content = ?, priority = ?, updated_at = ? WHERE id = ?');
        updateStmt.run([content, priority, now, id]);
        updateStmt.free();
      } else {
        const updateStmt = db.prepare('UPDATE todos SET content = ?, updated_at = ? WHERE id = ?');
        updateStmt.run([content, now, id]);
        updateStmt.free();
      }

      dbManager.saveDatabase();

      return {
        input: `todo edit ${id} ${content}`,
        output: `任务已更新: ${content}`,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = error.message || '更新任务失败';
      return {
        input: `todo edit ${id} ${content}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 搜索任务
   */
  private async searchTodos(keyword: string): Promise<TodoResult> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT * FROM todos WHERE content LIKE ? ORDER BY priority DESC, created_at DESC');
      stmt.bind([`%${keyword}%`]);

      const todos: TodoItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        todos.push({
          id: row.id,
          content: row.content,
          priority: row.priority,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          tags: row.tags,
        });
      }
      stmt.free();

      if (todos.length === 0) {
        return {
          input: `todo search ${keyword}`,
          output: `未找到包含 "${keyword}" 的任务`,
          success: true,
        };
      }

      let output = `搜索结果 (${todos.length} 个)\n`;
      todos.forEach(todo => {
        if (todo.status === 'pending') {
          output += this.formatTodoItem(todo) + '\n';
        } else {
          output += `[✓] ${todo.content} (${this.formatDate(todo.completedAt || 0)} 完成)\n`;
        }
      });
      output = output.trim(); // 移除最后的换行

      return {
        input: `todo search ${keyword}`,
        output: output.trim(),
        success: true,
        todos,
      };
    } catch (error: any) {
      const errorMsg = error.message || '搜索任务失败';
      return {
        input: `todo search ${keyword}`,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 辅助方法 ==========

  /**
   * 检查任务是否存在
   */
  private async checkTaskExists(id: number): Promise<TodoItem | null> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT * FROM todos WHERE id = ?');
      stmt.bind([id]);
      
      let todo: TodoItem | null = null;
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        todo = {
          id: row.id,
          content: row.content,
          priority: row.priority,
          status: row.status,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          tags: row.tags,
        };
      }
      stmt.free();
      
      return todo;
    } catch (error) {
      console.error('❌ [TODO服务] 检查任务存在性失败:', error);
      return null;
    }
  }

  /**
   * 格式化任务项
   */
  private formatTodoItem(todo: TodoItem): string {
    const priorityLabel = todo.priority === 'high' ? '[高]' : todo.priority === 'low' ? '[低]' : '[中]';
    const dateStr = this.formatDate(todo.createdAt);
    return `[${todo.id}] ${priorityLabel} ${todo.content} (${dateStr})`;
  }

  /**
   * 格式化日期
   */
  private formatDate(timestamp: number): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * 添加到历史记录
   */
  private async addToHistory(content: string): Promise<void> {
    try {
      const db = await dbManager.getDb();
      const now = Date.now();

      // 检查是否已存在
      const selectStmt = db.prepare('SELECT id, usage_count FROM todo_history WHERE content = ?');
      selectStmt.bind([content]);
      let existing: any = null;
      if (selectStmt.step()) {
        existing = selectStmt.getAsObject();
      }
      selectStmt.free();

      if (existing) {
        // 更新使用次数
        const updateStmt = db.prepare('UPDATE todo_history SET usage_count = usage_count + 1, last_used_at = ? WHERE id = ?');
        updateStmt.run([now, existing.id]);
        updateStmt.free();
      } else {
        // 插入新记录
        const insertStmt = db.prepare('INSERT INTO todo_history (content, usage_count, last_used_at) VALUES (?, ?, ?)');
        insertStmt.run([content, 1, now]);
        insertStmt.free();
      }

      dbManager.saveDatabase();
    } catch (error) {
      console.error('❌ [TODO服务] 添加到历史记录失败:', error);
    }
  }

  /**
   * 更新模板使用次数
   */
  private async updateTemplateUsage(content: string): Promise<void> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT id FROM todo_templates WHERE content = ?');
      stmt.bind([content]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        const updateStmt = db.prepare('UPDATE todo_templates SET usage_count = usage_count + 1 WHERE id = ?');
        updateStmt.run([row.id]);
        updateStmt.free();
        dbManager.saveDatabase();
      }
      stmt.free();
    } catch (error) {
      console.error('❌ [TODO服务] 更新模板使用次数失败:', error);
    }
  }

  // ========== 智能补全 ==========

  /**
   * TODO 工具补全（智能建议）
   */
  public async completeTodo(partial: string): Promise<Array<{ format: string; description: string; example: string }>> {
    // 确保 partial 是字符串类型
    if (typeof partial !== 'string') {
      console.warn('[TODO服务] completeTodo: partial 不是字符串类型:', typeof partial, partial);
      return [];
    }
    
    if (!partial || !partial.trim()) {
      return [];
    }

    await this.initialize();

    const query = partial.toLowerCase().trim();
    const suggestions: Array<{ format: string; description: string; example: string; score: number }> = [];

    // 命令格式
    const commandFormats = [
      { format: 'todo', description: '创建待办事项', example: 'todo 完成项目文档', keywords: ['todo', '待办', '任务'] },
      { format: '待办', description: '创建待办事项（中文）', example: '待办 完成项目文档', keywords: ['待办', 'todo'] },
      { format: 'todo all', description: '查看所有任务', example: 'todo all', keywords: ['all', '全部', '所有'] },
      { format: 'todo done', description: '查看已完成任务', example: 'todo done', keywords: ['done', '已完成', '完成'] },
      { format: 'todo search', description: '搜索任务', example: 'todo search 项目', keywords: ['search', '搜索', '查找'] },
      { format: 'todo done <ID>', description: '完成任务', example: 'todo done 1', keywords: ['done', '完成', 'finish'] },
      { format: 'todo delete <ID>', description: '删除任务', example: 'todo delete 1', keywords: ['delete', '删除', 'del'] },
      { format: 'todo edit <ID>', description: '编辑任务', example: 'todo edit 1 新内容', keywords: ['edit', '编辑', 'update'] },
    ];

    // 任务模板
    const templates = await this.getTemplates();
    const history = await this.getHistory(10);

    // 智能匹配：使用综合匹配算法
    for (const format of commandFormats) {
      const matchResult = calculateMatchScore(query, format.format, format.keywords);
      if (matchResult.score > 0) {
        suggestions.push({ ...format, score: matchResult.score });
      }
    }

    // 匹配任务模板
    for (const template of templates) {
      const matchResult = calculateMatchScore(query, template.content, template.keywords);
      if (matchResult.score > 0) {
        suggestions.push({
          format: `todo ${template.content}`,
          description: template.content,
          example: `todo ${template.content}`,
          score: matchResult.score,
        });
      }
    }

    // 匹配历史记录
    for (const item of history) {
      if (item.content.toLowerCase().includes(query) || query.includes(item.content.toLowerCase())) {
        suggestions.push({
          format: `todo ${item.content}`,
          description: `历史记录: ${item.content}`,
          example: `todo ${item.content}`,
          score: 50 + item.usageCount, // 使用次数越多，分数越高
        });
      }
    }

    // 按分数降序排序
    suggestions.sort((a, b) => b.score - a.score);

    return suggestions.slice(0, 10).map(({ score, ...rest }) => rest);
  }

  /**
   * 获取任务模板
   */
  private async getTemplates(): Promise<TodoTemplate[]> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT * FROM todo_templates ORDER BY usage_count DESC, created_at DESC LIMIT 20');
      
      const templates: TodoTemplate[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        templates.push({
          id: row.id,
          content: row.content,
          category: row.category,
          keywords: JSON.parse(row.keywords || '[]'),
          usageCount: row.usage_count || 0,
        });
      }
      stmt.free();

      return templates;
    } catch (error) {
      console.error('❌ [TODO服务] 获取模板失败:', error);
      return DEFAULT_TEMPLATES;
    }
  }

  /**
   * 获取历史记录
   */
  private async getHistory(limit: number = 10): Promise<Array<{ content: string; usageCount: number }>> {
    try {
      const db = await dbManager.getDb();
      const stmt = db.prepare('SELECT content, usage_count FROM todo_history ORDER BY usage_count DESC, last_used_at DESC LIMIT ?');
      stmt.bind([limit]);

      const history: Array<{ content: string; usageCount: number }> = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        history.push({
          content: row.content,
          usageCount: row.usage_count || 0,
        });
      }
      stmt.free();

      return history;
    } catch (error) {
      console.error('❌ [TODO服务] 获取历史记录失败:', error);
      return [];
    }
  }

  /**
   * 获取 TODO 工具帮助信息
   */
  public getTodoHelp(): {
    title: string;
    description: string;
    formats: Array<{ format: string; description: string; example: string }>;
  } {
    return {
      title: 'TODO 管理',
      description: '支持任务创建、查询、完成、删除、编辑和搜索',
      formats: [
        { format: 'todo <内容>', description: '创建待办事项', example: 'todo 完成项目文档' },
        { format: 'todo', description: '查看未完成任务', example: 'todo' },
        { format: 'todo all', description: '查看所有任务', example: 'todo all' },
        { format: 'todo done', description: '查看已完成任务', example: 'todo done' },
        { format: 'todo done <ID>', description: '完成任务', example: 'todo done 1' },
        { format: 'todo delete <ID>', description: '删除任务', example: 'todo delete 1' },
        { format: 'todo edit <ID> <内容>', description: '编辑任务', example: 'todo edit 1 新内容' },
        { format: 'todo search <关键词>', description: '搜索任务', example: 'todo search 项目' },
      ],
    };
  }
}

export const todoService = new TodoService();
export default todoService;

