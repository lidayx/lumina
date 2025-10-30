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
}

