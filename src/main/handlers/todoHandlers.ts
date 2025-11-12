import { todoService } from '../services/todoService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册 TODO 相关的 IPC 处理器
 * 提供任务创建、查询、完成、删除、编辑和智能补全等功能
 */
export function registerTodoHandlers() {
  // 处理 TODO 查询
  registerHandler(
    'todo-handle-query',
    'TODO 查询',
    async (_event, query: string, executeOnly: boolean = false) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`📝 [TODO Handler] 处理查询: "${validatedQuery}", executeOnly: ${executeOnly}`);
      
      const result = await todoService.handleTodoQuery(validatedQuery, executeOnly);
      if (result) {
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
          todos: result.todos,
        };
      }
      // 返回 null 表示无法识别为 TODO 查询，让前端继续尝试其他模块
      return null;
    },
    {
      logPrefix: '📝 [TODO Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );

  // 处理 TODO 智能补全
  registerHandler(
    'todo-complete',
    'TODO 智能补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      const suggestions = await todoService.completeTodo(validatedPartial);
      return suggestions;
    },
    {
      logPrefix: '📝 [TODO Handler]',
      returnNullOnError: true,
      defaultValue: [],
    }
  );

  // 处理 TODO 帮助信息
  registerHandler(
    'todo-help',
    'TODO 帮助',
    async () => {
      return todoService.getTodoHelp();
    },
    {
      logPrefix: '📝 [TODO Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

