import { variableNameService } from '../services/variableNameService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册变量名生成相关的 IPC 处理器
 * 提供变量名格式转换、命名风格转换等功能
 */
export function registerVariableNameHandlers() {
  registerHandler(
    'varname-handle-query',
    '变量名生成查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`🏷️ [变量名Handler] 处理查询: "${validatedQuery}"`);
      
      const result = await variableNameService.handleVariableNameQuery(validatedQuery);
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
    },
    {
      logPrefix: '🏷️ [变量名Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

