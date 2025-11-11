import { ipcMain } from 'electron';
import { translateService } from '../services/translateService';

/**
 * 注册翻译相关的 IPC 处理器
 * 提供多语言翻译功能
 */
export function registerTranslateHandlers() {
  // 处理翻译查询
  ipcMain.handle('translate-handle-query', async (_event, query: string) => {
    try {
      console.log(`🌐 [翻译Handler] 处理查询: "${query}"`);
      const result = await translateService.handleTranslateQuery(query);
      if (result) {
        // 将 TranslateResult 转换为统一格式
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
      }
      // 返回 null 表示无法识别为翻译查询，让前端继续尝试其他模块
      return null;
    } catch (error: any) {
      console.error('翻译处理失败:', error);
      return null;
    }
  });
}

