import { ipcMain } from 'electron';
import { openSettingsWindow } from '../windows/settingsWindow';
import { openPluginWindow } from '../windows/pluginWindow';
import { toggleMainWindow } from '../windows/mainWindow';
import { showPreviewWindow, hidePreviewWindow, updatePreviewContent, closePreviewWindow } from '../windows/previewWindow';

/**
 * 注册窗口相关的 IPC 处理器
 * 处理应用窗口的显示、隐藏和切换
 */
export function registerWindowHandlers() {
  // 打开设置窗口
  ipcMain.removeHandler('open-settings');
  ipcMain.handle('open-settings', () => {
    openSettingsWindow();
  });

  // 打开插件管理窗口
  ipcMain.removeHandler('open-plugins');
  ipcMain.handle('open-plugins', () => {
    openPluginWindow();
  });

  // 切换主窗口的显示/隐藏状态
  ipcMain.removeHandler('toggle-main-window');
  ipcMain.handle('toggle-main-window', () => {
    toggleMainWindow();
  });

  // 显示预览窗口
  ipcMain.removeHandler('preview-show');
  ipcMain.handle('preview-show', () => {
    showPreviewWindow();
  });

  // 隐藏预览窗口
  ipcMain.removeHandler('preview-hide');
  ipcMain.handle('preview-hide', () => {
    hidePreviewWindow();
  });

  // 更新预览内容
  ipcMain.removeHandler('preview-update');
  ipcMain.handle('preview-update', async (_event, result: any, query: string) => {
    await updatePreviewContent(result, query);
  });

  // 关闭预览窗口
  ipcMain.removeHandler('preview-close');
  ipcMain.handle('preview-close', () => {
    closePreviewWindow();
  });
}

