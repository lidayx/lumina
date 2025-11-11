import { ipcMain } from 'electron';
import { randomService } from '../services/randomService';

/**
 * 注册随机数生成相关的 IPC 处理器
 * 提供 UUID 生成、随机字符串、随机密码、随机数字等功能
 */
export function registerRandomHandlers() {
  // 处理随机数生成查询
  ipcMain.handle('random-handle-query', async (_event, query: string) => {
    try {
      console.log(`🎲 [随机数Handler] 处理查询: "${query}"`);
      const result = randomService.handleRandomQuery(query);
      if (result) {
        // 将 RandomResult 转换为统一格式，保留 outputs 和 isMultiple
        const response: any = {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
        if (result.outputs) {
          response.outputs = result.outputs;
        }
        if (result.isMultiple) {
          response.isMultiple = result.isMultiple;
        }
        return response;
      }
      // 返回 null 表示无法识别为随机数生成查询，让前端继续尝试其他模块
      return null;
    } catch (error: any) {
      console.error('随机数生成处理失败:', error);
      return null;
    }
  });
}

