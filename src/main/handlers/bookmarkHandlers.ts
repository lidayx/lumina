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
      const { dbManager } = await import('../database/db');
      
      // 从书签服务获取书签基本信息
      const bookmarks = bookmarkService.getAllBookmarks();
      const bookmark = bookmarks.find(b => b.url === url);
      
      if (bookmark) {
        // 从数据库获取访问次数
        // 书签在数据库中的 path 字段存储的是 URL，type 是 'bookmark'
        let accessCount = 0;
        let dateLastUsed = bookmark.dateLastUsed;
        
        // 获取所有书签类型的数据库项，然后根据 path (URL) 查找
        const dbItems = await dbManager.getAllItems('bookmark');
        const dbItem = dbItems.find(item => item.path === url);
        
        if (dbItem) {
          // 找到数据库项，使用数据库中的统计数据
          accessCount = dbItem.launchCount || 0;
          if (dbItem.lastUsed) {
            dateLastUsed = new Date(dbItem.lastUsed);
          }
        }
        
        return {
          success: true,
          info: {
            ...bookmark,
            // 使用数据库中的访问次数
            accessCount: accessCount,
            dateLastUsed: dateLastUsed,
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

