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
 */
export function openSettingsWindow() {
  const window = windowManager.getOrCreateWindow(WINDOW_CONFIGS.settings());
  window.focus();
}

/**
 * 关闭设置窗口
 */
export function closeSettingsWindow() {
  windowManager.closeWindow('settings');
}

