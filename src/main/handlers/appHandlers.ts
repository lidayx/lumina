import { ipcMain } from 'electron';
import { appService } from '../services/appService';

/**
 * 注册应用相关的 IPC 处理器
 */
export function registerAppHandlers() {
  // 获取所有应用
  ipcMain.handle('app-get-all', async () => {
    try {
      return await appService.getAllApps();
    } catch (error) {
      console.error('Error getting all apps:', error);
      return [];
    }
  });

  // 搜索应用
  ipcMain.handle('app-search', async (_event, query: string) => {
    try {
      const results = await appService.searchApps(query);
      console.log(`🔍 [应用处理器] 搜索 "${query}" 返回 ${results.length} 个结果`);
      if (results.length > 0) {
        console.log(`🔍 [应用处理器] 第一个结果: ${results[0].name}, 有图标: ${!!results[0].icon}, 图标长度: ${results[0].icon?.length || 0}`);
        if (results[0].icon) {
          console.log(`🔍 [应用处理器] 图标前100字符: ${results[0].icon.substring(0, 100)}`);
        }
      }
      return results;
    } catch (error) {
      console.error('Error searching apps:', error);
      return [];
    }
  });

  // 启动应用
  ipcMain.handle('app-launch', async (_event, appId: string) => {
    try {
      await appService.launchApp(appId);
      return { success: true };
    } catch (error) {
      console.error('Error launching app:', error);
      return { success: false, error: String(error) };
    }
  });

  // 索引应用
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

