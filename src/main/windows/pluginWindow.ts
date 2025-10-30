import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';

/**
 * 创建或获取插件管理窗口
 */
export function getPluginWindow() {
  return windowManager.getOrCreateWindow(WINDOW_CONFIGS.plugin());
}

/**
 * 打开插件管理窗口
 */
export function openPluginWindow() {
  const window = windowManager.getOrCreateWindow(WINDOW_CONFIGS.plugin());
  window.focus();
}

/**
 * 关闭插件管理窗口
 */
export function closePluginWindow() {
  windowManager.closeWindow('plugin');
}

