import { ipcMain } from 'electron';
import { shortcutService } from '../services/shortcutService';

/**
 * 注册快捷键相关的 IPC 处理器
 */
export function registerShortcutHandlers() {
  // 获取当前快捷键
  ipcMain.handle('shortcut-get-current', async () => {
    try {
      const shortcut = shortcutService.getCurrentShortcut();
      return { shortcut, formatted: shortcut ? shortcutService.formatShortcut(shortcut) : null };
    } catch (error) {
      console.error('获取快捷键失败:', error);
      throw error;
    }
  });

  // 设置全局快捷键
  ipcMain.handle('shortcut-set', async (_event, shortcut: string) => {
    try {
      const success = shortcutService.register(shortcut);
      if (success) {
        // 更新设置
        const { default: settingsService } = await import('../services/settingsService');
        await settingsService.updateSettings({ globalShortcut: shortcut });
      }
      return { success };
    } catch (error) {
      console.error('设置快捷键失败:', error);
      throw error;
    }
  });

  // 检查快捷键是否可用
  ipcMain.handle('shortcut-check-available', async (_event, shortcut: string) => {
    try {
      const available = shortcutService.isAvailable(shortcut);
      return { available };
    } catch (error) {
      console.error('检查快捷键失败:', error);
      throw error;
    }
  });

  // 格式化快捷键显示
  ipcMain.handle('shortcut-format', async (_event, shortcut: string) => {
    try {
      return { formatted: shortcutService.formatShortcut(shortcut) };
    } catch (error) {
      console.error('格式化快捷键失败:', error);
      throw error;
    }
  });
}

