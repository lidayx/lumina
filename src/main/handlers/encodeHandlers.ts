import { encodeService } from '../services/encodeService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册编码解码相关的 IPC 处理器
 * 提供 URL/HTML/Base64 编码解码和 MD5 加密功能
 */
export function registerEncodeHandlers() {
  registerHandler(
    'encode-handle-query',
    '编码解码查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`🔐 [编码Handler] 处理查询: "${validatedQuery}"`);
      
      const result = encodeService.handleEncodeQuery(validatedQuery);
      if (result) {
        // 将 EncodeResult 转换为统一格式
        return {
          input: result.input,
          output: result.output,
          success: result.success,
          error: result.error,
        };
      }
      // 返回 null 表示无法识别为编码解码查询，让前端继续尝试其他模块
      return null;
    },
    {
      logPrefix: '🔐 [编码Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

