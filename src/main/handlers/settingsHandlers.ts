import { ipcMain } from 'electron';

/**
 * 注册设置相关的 IPC 处理器
 */
export function registerSettingsHandlers() {
  // 获取所有设置
  ipcMain.handle('settings-get-all', async () => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      return settingsService.getSettings();
    } catch (error: any) {
      console.error('获取设置失败:', error);
      throw error;
    }
  });

  // 更新设置
  ipcMain.handle('settings-update', async (_event, updates: any) => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      settingsService.updateSettings(updates);
      return { success: true };
    } catch (error: any) {
      console.error('更新设置失败:', error);
      throw error;
    }
  });

  // 重置设置
  ipcMain.handle('settings-reset', async () => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      settingsService.resetSettings();
      return { success: true };
    } catch (error: any) {
      console.error('重置设置失败:', error);
      throw error;
    }
  });

  // 获取日志文件路径
  ipcMain.handle('settings-get-log-file', async () => {
    try {
      const { debugLog } = await import('../utils/debugLog');
      return debugLog.getLogFile();
    } catch (error: any) {
      console.error('获取日志文件路径失败:', error);
      throw error;
    }
  });

  console.log('✅ 设置 IPC 处理器已注册');
}

