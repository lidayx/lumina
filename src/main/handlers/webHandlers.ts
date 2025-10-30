import { ipcMain } from 'electron';
import { webService } from '../services/webService';

/**
 * 注册网页搜索相关的 IPC 处理器
 */
export function registerWebHandlers() {
  // 获取所有搜索引擎
  ipcMain.handle('web-get-engines', async () => {
    try {
      return webService.getAllEngines();
    } catch (error) {
      console.error('Error getting search engines:', error);
      return [];
    }
  });

  // 搜索网页
  ipcMain.handle('web-search', async (_event, query: string, engineName?: string) => {
    try {
      return await webService.searchWeb(query, engineName);
    } catch (error) {
      console.error('Error searching web:', error);
      return [];
    }
  });

  // 打开搜索 URL
  ipcMain.handle('web-open', async (_event, url: string) => {
    try {
      await webService.openSearchUrl(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening web search:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取搜索历史
  ipcMain.handle('web-get-history', async (_event, limit?: number) => {
    try {
      return webService.getSearchHistory(limit);
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  });

  // 清除搜索历史
  ipcMain.handle('web-clear-history', async () => {
    try {
      webService.clearSearchHistory();
      return { success: true };
    } catch (error) {
      console.error('Error clearing search history:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取常用网站
  ipcMain.handle('web-get-common-sites', async () => {
    try {
      return webService.getCommonSites();
    } catch (error) {
      console.error('Error getting common sites:', error);
      return [];
    }
  });

  // 添加自定义搜索引擎
  ipcMain.handle('web-add-engine', async (_event, engine: any) => {
    try {
      webService.addSearchEngine(engine);
      return { success: true };
    } catch (error) {
      console.error('Error adding search engine:', error);
      return { success: false, error: String(error) };
    }
  });

  // 更新搜索引擎
  ipcMain.handle('web-update-engine', async (_event, name: string, updates: any) => {
    try {
      webService.updateSearchEngine(name, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating search engine:', error);
      return { success: false, error: String(error) };
    }
  });

  // 删除搜索引擎
  ipcMain.handle('web-delete-engine', async (_event, name: string) => {
    try {
      webService.deleteSearchEngine(name);
      return { success: true };
    } catch (error) {
      console.error('Error deleting search engine:', error);
      return { success: false, error: String(error) };
    }
  });

  // 设置默认搜索引擎
  ipcMain.handle('web-set-default-engine', async (_event, name: string) => {
    try {
      webService.setDefaultEngine(name);
      return { success: true };
    } catch (error) {
      console.error('Error setting default search engine:', error);
      return { success: false, error: String(error) };
    }
  });
}

