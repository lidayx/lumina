import { ipcMain } from 'electron';
import { openSettingsWindow } from '../windows/settingsWindow';
import { openPluginWindow } from '../windows/pluginWindow';
import { toggleMainWindow } from '../windows/mainWindow';

/**
 * 注册窗口相关的 IPC 处理器
 */
export function registerWindowHandlers() {
  // 打开设置窗口
  ipcMain.handle('open-settings', () => {
    openSettingsWindow();
  });

  // 打开插件管理窗口
  ipcMain.handle('open-plugins', () => {
    openPluginWindow();
  });

  // 切换主窗口显示/隐藏
  ipcMain.handle('toggle-main-window', () => {
    toggleMainWindow();
  });
}

