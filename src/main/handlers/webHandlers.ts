import { ipcMain } from 'electron';
import { webService } from '../services/webService';

/**
 * 注册网页搜索相关的 IPC 处理器
 * 提供搜索引擎管理、网页搜索、历史记录和常用网站功能
 */
export function registerWebHandlers() {
  // 获取所有配置的搜索引擎
  ipcMain.handle('web-get-engines', async () => {
    try {
      return webService.getAllEngines();
    } catch (error) {
      console.error('Error getting search engines:', error);
      return [];
    }
  });

  // 使用指定搜索引擎搜索（默认使用配置的默认引擎）
  ipcMain.handle('web-search', async (_event, query: string, engineName?: string) => {
    try {
      return await webService.searchWeb(query, engineName);
    } catch (error) {
      console.error('Error searching web:', error);
      return [];
    }
  });

  // 在浏览器中打开搜索URL
  ipcMain.handle('web-open', async (_event, url: string) => {
    try {
      await webService.openSearchUrl(url);
      return { success: true };
    } catch (error) {
      console.error('Error opening web search:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取网页搜索历史记录
  ipcMain.handle('web-get-history', async (_event, limit?: number) => {
    try {
      return webService.getSearchHistory(limit);
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  });

  // 清除网页搜索历史记录
  ipcMain.handle('web-clear-history', async () => {
    try {
      webService.clearSearchHistory();
      return { success: true };
    } catch (error) {
      console.error('Error clearing search history:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取常用网站列表（快速访问）
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

  // 更新指定搜索引擎的配置
  ipcMain.handle('web-update-engine', async (_event, name: string, updates: any) => {
    try {
      webService.updateSearchEngine(name, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating search engine:', error);
      return { success: false, error: String(error) };
    }
  });

  // 删除指定的搜索引擎
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

