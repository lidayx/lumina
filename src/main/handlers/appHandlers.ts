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

  // 打开应用安装文件夹
  ipcMain.handle('app-reveal-folder', async (_event, appId: string) => {
    try {
      const { shell } = require('electron');
      const apps = await appService.getAllApps();
      const app = apps.find((a: any) => a.id === appId);
      if (app && app.path) {
        // 对于 macOS .app 文件，显示包含 .app 的文件夹
        // 对于其他平台，显示文件所在的文件夹
        const path = require('path');
        let folderPath = app.path;
        
        // macOS: 如果是 .app 文件，获取父目录
        if (process.platform === 'darwin' && app.path.endsWith('.app')) {
          folderPath = path.dirname(app.path);
        } else {
          // 其他平台：获取文件所在目录
          folderPath = path.dirname(app.path);
        }
        
        await shell.showItemInFolder(folderPath);
        return { success: true };
      } else {
        return { success: false, error: '应用未找到' };
      }
    } catch (error) {
      console.error('Error revealing folder:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取应用文件信息（包括安装时间等）
  ipcMain.handle('app-get-info', async (_event, appId: string) => {
    try {
      const fs = require('fs');
      const { dbManager } = await import('../database/db');
      
      // 先从数据库获取最新的统计数据（launchCount, lastUsed）
      const dbItem = await dbManager.getItemById(appId);
      
      // 从应用服务获取应用基本信息
      const apps = await appService.getAllApps();
      const app = apps.find((a: any) => a.id === appId);
      
      if (app && app.path) {
        // 如果文件存在，获取文件统计信息
        let stats = null;
        try {
          stats = fs.statSync(app.path);
        } catch (err) {
          // 文件可能不存在，忽略错误
        }
        
        // 合并数据库中的统计数据和应用基本信息
        return {
          success: true,
          info: {
            ...app,
            // 使用数据库中的最新统计数据（如果存在）
            ...(dbItem && {
              launchCount: dbItem.launchCount || 0,
              lastUsed: dbItem.lastUsed ? new Date(dbItem.lastUsed) : app.lastUsed,
            }),
            // 如果文件存在，添加文件信息
            ...(stats && {
              installDate: stats.birthtime || stats.ctime, // 创建时间作为安装时间
              size: stats.size,
              modifiedDate: stats.mtime,
            }),
          },
        };
      } else {
        return { success: false, error: '应用未找到' };
      }
    } catch (error) {
      console.error('Error getting app info:', error);
      return { success: false, error: String(error) };
    }
  });
}

