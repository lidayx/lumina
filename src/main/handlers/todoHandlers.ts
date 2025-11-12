import { ipcMain } from 'electron';
import { todoService } from '../services/todoService';

/**
 * 注册 TODO 相关的 IPC 处理器
 * 提供任务创建、查询、完成、删除、编辑和智能补全等功能
 */
export function registerTodoHandlers() {
  // 处理 TODO 查询
  ipcMain.handle('todo-handle-query', async (_event, query: string, executeOnly: boolean = false) => {
    try {
      console.log(`📝 [TODO Handler] 处理查询: "${query}", executeOnly: ${executeOnly}`);
      const result = await todoService.handleTodoQuery(query, executeOnly);
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
    } catch (error: any) {
      console.error('TODO 处理失败:', error);
      return null;
    }
  });

  // 处理 TODO 智能补全
  ipcMain.handle('todo-complete', async (_event, partial: string) => {
    try {
      // 确保 partial 是字符串类型
      if (typeof partial !== 'string') {
        console.warn('TODO 补全: partial 不是字符串类型:', typeof partial, partial);
        return [];
      }
      const suggestions = await todoService.completeTodo(partial);
      return suggestions;
    } catch (error: any) {
      console.error('TODO 补全失败:', error);
      return [];
    }
  });

  // 处理 TODO 帮助信息
  ipcMain.handle('todo-help', async () => {
    try {
      return todoService.getTodoHelp();
    } catch (error: any) {
      console.error('TODO 帮助失败:', error);
      return null;
    }
  });
}

