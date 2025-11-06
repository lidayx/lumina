import { ipcMain } from 'electron';
import bookmarkService from '../services/bookmarkService';

/**
 * 注册书签相关的 IPC 处理器
 * 处理浏览器书签的获取、搜索和重载
 */
export function registerBookmarkHandlers() {
  // 获取所有浏览器书签
  ipcMain.handle('bookmark-get-all', async () => {
    try {
      return bookmarkService.getAllBookmarks();
    } catch (error) {
      console.error('获取书签列表失败:', error);
      throw error;
    }
  });

  // 根据关键词搜索书签（匹配标题和URL）
  ipcMain.handle('bookmark-search', async (_event, query: string) => {
    try {
      return bookmarkService.searchBookmarks(query);
    } catch (error) {
      console.error('搜索书签失败:', error);
      throw error;
    }
  });

  // 重新从浏览器加载书签数据
  ipcMain.handle('bookmark-reload', async () => {
    try {
      await bookmarkService.reloadBookmarks();
      return { success: true };
    } catch (error) {
      console.error('重新加载书签失败:', error);
      throw error;
    }
  });

  // 获取书签详细信息
  ipcMain.handle('bookmark-get-info', async (_event, url: string) => {
    try {
      const bookmarks = bookmarkService.getAllBookmarks();
      const bookmark = bookmarks.find(b => b.url === url);
      if (bookmark) {
        return {
          success: true,
          info: {
            ...bookmark,
            // 计算访问次数（如果有使用统计）
            accessCount: bookmark.dateLastUsed ? 1 : 0, // 简化处理，实际应该从数据库获取
          },
        };
      }
      return { success: false, error: '书签未找到' };
    } catch (error) {
      console.error('获取书签信息失败:', error);
      return { success: false, error: String(error) };
    }
  });
}

