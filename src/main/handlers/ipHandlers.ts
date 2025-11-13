import { ipService } from '../services/ipService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册 IP 网络信息相关的 IPC 处理器
 * 提供内网IP、外网IP、网关、DNS等信息查询功能
 */
export function registerIpHandlers() {
  registerHandler(
    'ip-handle-query',
    'IP网络信息查询',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      console.log(`🌐 [IP Handler] 处理查询: "${validatedQuery}"`);
      
      // 使用异步版本获取完整网络信息（包括外网IP）
      const result = await ipService.handleIpQueryAsync(validatedQuery);
      if (result) {
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
      // 返回 null 表示无法识别为 IP 查询，让前端继续尝试其他模块
      return null;
    },
    {
      logPrefix: '🌐 [IP Handler]',
      returnNullOnError: true,
      defaultValue: null,
    }
  );
}

