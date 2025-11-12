import { translateService } from '../services/translateService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册翻译相关的 IPC 处理器
 * 提供多语言翻译功能
 */
export function registerTranslateHandlers() {
  registerHandler(
    'translate-handle-query',
    '翻译查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`🌐 [翻译Handler] 处理查询: "${validatedQuery}"`);
      
      const result = await translateService.handleTranslateQuery(validatedQuery);
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
    },
    {
      logPrefix: '🌐 [翻译Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

