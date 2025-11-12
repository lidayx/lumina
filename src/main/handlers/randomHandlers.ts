import { randomService } from '../services/randomService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册随机数生成相关的 IPC 处理器
 * 提供 UUID 生成、随机字符串、随机密码、随机数字等功能
 */
export function registerRandomHandlers() {
  registerHandler(
    'random-handle-query',
    '随机数生成查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`🎲 [随机数Handler] 处理查询: "${validatedQuery}"`);
      
      const result = randomService.handleRandomQuery(validatedQuery);
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
    },
    {
      logPrefix: '🎲 [随机数Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

