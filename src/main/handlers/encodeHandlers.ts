import { ipcMain } from 'electron';
import { encodeService } from '../services/encodeService';

/**
 * 注册编码解码相关的 IPC 处理器
 * 提供 URL/HTML/Base64 编码解码和 MD5 加密功能
 */
export function registerEncodeHandlers() {
  // 处理编码解码查询
  ipcMain.handle('encode-handle-query', async (_event, query: string) => {
    try {
      console.log(`🔐 [编码Handler] 处理查询: "${query}"`);
      const result = encodeService.handleEncodeQuery(query);
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
    } catch (error: any) {
      console.error('编码解码处理失败:', error);
      return null;
    }
  });
}

