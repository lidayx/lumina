import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';

/**
 * 创建或获取主窗口
 */
export function getMainWindow() {
  return windowManager.getOrCreateWindow(WINDOW_CONFIGS.main());
}

/**
 * 显示主窗口
 */
export function showMainWindow() {
  windowManager.showWindow('main');
}

/**
 * 隐藏主窗口
 */
export function hideMainWindow() {
  windowManager.hideWindow('main');
}

/**
 * 切换主窗口显示状态
 */
export function toggleMainWindow() {
  windowManager.toggleWindow('main');
}

