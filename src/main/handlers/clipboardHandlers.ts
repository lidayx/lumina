import { ipcMain } from 'electron';
import { clipboardService } from '../services/clipboardService';

/**
 * 注册剪贴板相关的 IPC 处理器
 */
export function registerClipboardHandlers() {
  // 获取历史记录
  ipcMain.handle('clipboard-get-history', async (_event, limit?: number) => {
    try {
      return await clipboardService.getHistory(limit);
    } catch (error) {
      console.error('获取剪贴板历史失败:', error);
      return [];
    }
  });

  // 搜索历史记录
  ipcMain.handle('clipboard-search', async (_event, query: string, limit?: number) => {
    try {
      return await clipboardService.searchHistory(query, limit);
    } catch (error) {
      console.error('搜索剪贴板历史失败:', error);
      return [];
    }
  });

  // 删除记录
  ipcMain.handle('clipboard-delete', async (_event, id: string) => {
    try {
      await clipboardService.deleteItem(id);
      return { success: true };
    } catch (error) {
      console.error('删除剪贴板记录失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '删除失败' };
    }
  });

  // 清空历史
  ipcMain.handle('clipboard-clear', async () => {
    try {
      await clipboardService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('清空剪贴板历史失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '清空失败' };
    }
  });

  // 粘贴指定项
  ipcMain.handle('clipboard-paste', async (_event, id: string) => {
    try {
      await clipboardService.pasteItem(id);
      return { success: true };
    } catch (error) {
      console.error('粘贴剪贴板项失败:', error);
      return { success: false, error: error instanceof Error ? error.message : '粘贴失败' };
    }
  });
}

