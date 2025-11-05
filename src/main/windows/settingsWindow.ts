import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';

/**
 * 创建或获取设置窗口
 */
export function getSettingsWindow() {
  return windowManager.getOrCreateWindow(WINDOW_CONFIGS.settings());
}

/**
 * 打开设置窗口
 * @param tab 可选，要激活的标签页（如 'help', 'browser' 等）
 */
export function openSettingsWindow(tab?: string) {
  const window = windowManager.getOrCreateWindow(WINDOW_CONFIGS.settings());
  window.focus();
  
  // 如果指定了标签，发送消息给设置页面
  if (tab) {
    const sendTabMessage = () => {
      window.webContents.send('settings-switch-tab', tab);
    };
    
    // 如果窗口已经加载完成，立即发送消息
    if (!window.webContents.isLoading()) {
      // 使用 setTimeout 确保 React 组件已经挂载
      setTimeout(sendTabMessage, 100);
    } else {
      // 等待窗口加载完成后再发送消息
      window.webContents.once('did-finish-load', () => {
        setTimeout(sendTabMessage, 100);
      });
    }
  }
}

/**
 * 打开设置窗口并切换到帮助中心
 */
export function openSettingsWindowToHelp() {
  openSettingsWindow('help');
}

/**
 * 关闭设置窗口
 */
export function closeSettingsWindow() {
  windowManager.closeWindow('settings');
}

