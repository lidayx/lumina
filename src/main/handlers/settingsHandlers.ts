import { ipcMain } from 'electron';

/**
 * 注册设置相关的 IPC 处理器
 * 管理应用的配置设置和日志文件路径
 */
export function registerSettingsHandlers() {
  // 获取所有应用设置
  ipcMain.handle('settings-get-all', async () => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      return settingsService.getSettings();
    } catch (error) {
      console.error('获取设置失败:', error);
      throw error;
    }
  });

  // 更新应用设置（支持部分更新）
  ipcMain.handle('settings-update', async (_event, updates: any) => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      settingsService.updateSettings(updates);
      return { success: true };
    } catch (error) {
      console.error('更新设置失败:', error);
      throw error;
    }
  });

  // 重置所有设置为默认值
  ipcMain.handle('settings-reset', async () => {
    try {
      const { default: settingsService } = await import('../services/settingsService');
      settingsService.resetSettings();
      return { success: true };
    } catch (error) {
      console.error('重置设置失败:', error);
      throw error;
    }
  });

  // 获取调试日志文件的完整路径
  ipcMain.handle('settings-get-log-file', async () => {
    try {
      const { debugLog } = await import('../utils/debugLog');
      return debugLog.getLogFile();
    } catch (error) {
      console.error('获取日志文件路径失败:', error);
      throw error;
    }
  });
}

