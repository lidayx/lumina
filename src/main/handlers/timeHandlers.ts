import { timeService } from '../services/timeService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册时间工具相关的 IPC 处理器
 * 提供时间查询、时间戳转换、时间计算、日期格式化等功能
 */
export function registerTimeHandlers() {
  registerHandler(
    'time-handle-query',
    '时间工具查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`⏰ [时间Handler] 处理查询: "${validatedQuery}"`);
      
      const result = timeService.handleTimeQuery(validatedQuery);
      if (result) {
        // 将 TimeResult 转换为统一格式
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
      }
      // 返回 null 表示无法识别为时间工具查询，让前端继续尝试其他模块
      return null;
    },
    {
      logPrefix: '⏰ [时间Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}
