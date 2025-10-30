import { ipcMain } from 'electron';
import bookmarkService from '../services/bookmarkService';

/**
 * 注册书签相关的 IPC 处理器
 */
export function registerBookmarkHandlers() {
  // 获取所有书签
  ipcMain.handle('bookmark-get-all', async () => {
    try {
      return bookmarkService.getAllBookmarks();
    } catch (error: any) {
      console.error('获取书签列表失败:', error);
      throw error;
    }
  });

  // 搜索书签
  ipcMain.handle('bookmark-search', async (_event, query: string) => {
    try {
      return bookmarkService.searchBookmarks(query);
    } catch (error: any) {
      console.error('搜索书签失败:', error);
      throw error;
    }
  });

  // 重新加载书签
  ipcMain.handle('bookmark-reload', async () => {
    try {
      await bookmarkService.reloadBookmarks();
      return { success: true };
    } catch (error: any) {
      console.error('重新加载书签失败:', error);
      throw error;
    }
  });

  console.log('✅ 书签 IPC 处理器已注册');
}

