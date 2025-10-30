import { ipcMain } from 'electron';
import { browserService } from '../services/browserService';
import { BrowserConfig } from '../../shared/types/browser';

/**
 * 注册浏览器相关的 IPC 处理器
 */
export function registerBrowserHandlers() {
  // 获取所有浏览器
  ipcMain.handle('browser-get-all', async () => {
    try {
      return browserService.getAllBrowsers();
    } catch (error) {
      console.error('Error getting all browsers:', error);
      return [];
    }
  });

  // 添加浏览器
  ipcMain.handle('browser-add', async (_event, browser: BrowserConfig) => {
    try {
      browserService.addBrowser(browser);
      return { success: true };
    } catch (error) {
      console.error('Error adding browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 更新浏览器
  ipcMain.handle('browser-update', async (_event, id: string, updates: Partial<BrowserConfig>) => {
    try {
      browserService.updateBrowser(id, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating browser:', error);
      return { success: false, error: String(error) };
    }
  });

  // 删除浏览器
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

  // 获取默认浏览器
  ipcMain.handle('browser-get-default', async () => {
    try {
      return browserService.getDefaultBrowser();
    } catch (error) {
      console.error('Error getting default browser:', error);
      return null;
    }
  });

  // 打开 URL
  ipcMain.handle('browser-open-url', async (_event, url: string) => {
    try {
      await browserService.openUrl(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening URL:', error);
      return { success: false, error: String(error) };
    }
  });
}

