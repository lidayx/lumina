import { ipcMain } from 'electron';
import { appService } from '../services/appService';

/**
 * 注册应用相关的 IPC 处理器
 * 提供应用的获取、搜索、启动和索引功能
 */
export function registerAppHandlers() {
  // 获取所有已安装的应用列表
  ipcMain.handle('app-get-all', async () => {
    try {
      return await appService.getAllApps();
    } catch (error) {
      console.error('Error getting all apps:', error);
      return [];
    }
  });

  // 根据关键词搜索应用（支持拼音、中文、英文）
  ipcMain.handle('app-search', async (_event, query: string) => {
    try {
      const results = await appService.searchApps(query);
      console.log(`🔍 [应用处理器] 搜索 "${query}" 返回 ${results.length} 个结果`);
      if (results.length > 0 && results[0].icon) {
        console.log(`🔍 [应用处理器] 第一个结果图标: ${results[0].name}, 长度: ${results[0].icon.length}`);
      }
      return results;
    } catch (error) {
      console.error('Error searching apps:', error);
      return [];
    }
  });

  // 启动指定的应用
  ipcMain.handle('app-launch', async (_event, appId: string) => {
    try {
      await appService.launchApp(appId);
      return { success: true };
    } catch (error) {
      console.error('Error launching app:', error);
      return { success: false, error: String(error) };
    }
  });

  // 重新扫描并索引系统中的应用
  ipcMain.handle('app-index', async () => {
    try {
      await appService.indexApps();
      return { success: true };
    } catch (error) {
      console.error('Error indexing apps:', error);
      return { success: false, error: String(error) };
    }
  });
}

