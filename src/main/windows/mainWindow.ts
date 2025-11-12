import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';
import { hidePreviewWindow } from './previewWindow';

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
 * 同时隐藏预览窗口以保持界面一致性
 */
export function hideMainWindow() {
  windowManager.hideWindow('main');
  hidePreviewWindow();
}

/**
 * 切换主窗口显示状态
 */
export function toggleMainWindow() {
  windowManager.toggleWindow('main');
}

