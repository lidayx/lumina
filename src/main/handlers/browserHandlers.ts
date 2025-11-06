import { ipcMain } from 'electron';
import { browserService } from '../services/browserService';
import { BrowserConfig } from '../../shared/types/browser';

/**
 * 注册浏览器相关的 IPC 处理器
 * 管理浏览器的增删改查、默认设置和URL打开
 */
export function registerBrowserHandlers() {
  // 获取所有已配置的浏览器
  ipcMain.handle('browser-get-all', async () => {
    try {
      return browserService.getAllBrowsers();
    } catch (error) {
      console.error('Error getting all browsers:', error);
      return [];
    }
  });

  // 添加新的浏览器配置
  ipcMain.handle('browser-add', async (_event, browser: BrowserConfig) => {
    try {
      browserService.addBrowser(browser);
      return { success: true };
    } catch (error) {
      console.error('Error adding browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 更新指定浏览器的配置
  ipcMain.handle('browser-update', async (_event, id: string, updates: Partial<BrowserConfig>) => {
    try {
      browserService.updateBrowser(id, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 删除指定的浏览器配置
  ipcMain.handle('browser-delete', async (_event, id: string) => {
    try {
      browserService.deleteBrowser(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 设置默认浏览器
  ipcMain.handle('browser-set-default', async (_event, id: string) => {
    try {
      browserService.setDefaultBrowser(id);
      return { success: true };
    } catch (error) {
      console.error('Error setting default browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取当前默认浏览器
  ipcMain.handle('browser-get-default', async () => {
    try {
      return browserService.getDefaultBrowser();
    } catch (error) {
      console.error('Error getting default browser:', error);
      return null;
    }
  });

  // 使用默认浏览器打开URL
  ipcMain.handle('browser-open-url', async (_event, url: string) => {
    try {
      // 检查是否是书签，如果是则更新访问统计
      const { dbManager } = await import('../database/db');
      const bookmarkItems = await dbManager.getAllItems('bookmark');
      const bookmarkItem = bookmarkItems.find(item => item.path === url);
      
      if (bookmarkItem) {
        // 更新书签的访问统计
        dbManager.updateItemUsage(bookmarkItem.id);
      }
      
      await browserService.openUrl(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening URL:', error);
      return { success: false, error: String(error) };
    }
  });
}

