import { ipcMain } from 'electron';
import { variableNameService } from '../services/variableNameService';

/**
 * 注册变量名生成相关的 IPC 处理器
 * 提供变量名格式转换、命名风格转换等功能
 */
export function registerVariableNameHandlers() {
  // 处理变量名生成查询
  ipcMain.handle('varname-handle-query', async (_event, query: string) => {
    try {
      console.log(`🏷️ [变量名Handler] 处理查询: "${query}"`);
      const result = variableNameService.handleVariableNameQuery(query);
      if (result) {
        // 将 VariableNameResult 转换为统一格式
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
      }
      // 返回 null 表示无法识别为变量名生成查询，让前端继续尝试其他模块
      return null;
    } catch (error: any) {
      console.error('变量名生成处理失败:', error);
      return null;
    }
  });
}

