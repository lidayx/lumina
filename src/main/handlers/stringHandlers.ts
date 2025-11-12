import { stringService } from '../services/stringService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册字符串工具相关的 IPC 处理器
 * 提供大小写转换、字符串格式化、字符串操作等功能
 */
export function registerStringHandlers() {
  registerHandler(
    'string-handle-query',
    '字符串工具查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`📝 [字符串Handler] 处理查询: "${validatedQuery}"`);
      
      const result = stringService.handleStringQuery(validatedQuery);
      if (result) {
        // 将 StringResult 转换为统一格式
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
      }
      // 返回 null 表示无法识别为字符串工具查询，让前端继续尝试其他模块
      return null;
    },
    {
      logPrefix: '📝 [字符串Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

