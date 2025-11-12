import { clipboardService } from '../services/clipboardService';
import { registerHandler, validateString, validateNumberOptional } from './handlerUtils';

/**
 * 注册剪贴板相关的 IPC 处理器
 */
export function registerClipboardHandlers() {
  // 获取历史记录
  registerHandler(
    'clipboard-get-history',
    '获取剪贴板历史',
    async (_event, limit?: number) => {
      const validatedLimit = validateNumberOptional(limit, 'limit');
      return await clipboardService.getHistory(validatedLimit);
    },
    {
      logPrefix: '📋 [剪贴板Handler]',
      returnNullOnError: true,
      defaultValue: [],
    }
  );

  // 搜索历史记录
  registerHandler(
    'clipboard-search',
    '搜索剪贴板历史',
    async (_event, query: string, limit?: number) => {
      const validatedQuery = validateString(query, 'query');
      const validatedLimit = validateNumberOptional(limit, 'limit');
      return await clipboardService.searchHistory(validatedQuery, validatedLimit);
    },
    {
      logPrefix: '📋 [剪贴板Handler]',
      returnNullOnError: true,
      defaultValue: [],
    }
  );

  // 删除记录
  registerHandler(
    'clipboard-delete',
    '删除剪贴板记录',
    async (_event, id: string) => {
      const validatedId = validateString(id, 'id');
      await clipboardService.deleteItem(validatedId);
      return { success: true };
    },
    {
      logPrefix: '📋 [剪贴板Handler]',
      returnNullOnError: true,
      defaultValue: { success: false, error: '删除失败' },
    }
  );

  // 清空历史
  registerHandler(
    'clipboard-clear',
    '清空剪贴板历史',
    async () => {
      await clipboardService.clearHistory();
      return { success: true };
    },
    {
      logPrefix: '📋 [剪贴板Handler]',
      returnNullOnError: true,
      defaultValue: { success: false, error: '清空失败' },
    }
  );

  // 粘贴指定项
  registerHandler(
    'clipboard-paste',
    '粘贴剪贴板项',
    async (_event, id: string) => {
      const validatedId = validateString(id, 'id');
      await clipboardService.pasteItem(validatedId);
      return { success: true };
    },
    {
      logPrefix: '📋 [剪贴板Handler]',
      returnNullOnError: true,
      defaultValue: { success: false, error: '粘贴失败' },
    }
  );
}

