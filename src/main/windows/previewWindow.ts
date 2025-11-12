import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';
import { screen, BrowserWindow } from 'electron';

// 常量定义
const PREVIEW_WINDOW_WIDTH = 400;
const PREVIEW_WINDOW_GAP = 10;
const REACT_MOUNT_DELAY_LOADED = 300; // 窗口已加载时的延迟
const REACT_MOUNT_DELAY_LOADING = 500; // 窗口加载中的延迟
const SHOW_WINDOW_DELAY = 100; // 显示窗口的延迟

/**
 * 计算预览窗口位置（主窗口右侧，如果超出屏幕则放在左侧）
 */
function calculatePreviewPosition(mainWindow: BrowserWindow): { x: number; y: number } {
  const [mainX, mainY] = mainWindow.getPosition();
  const [mainWidth] = mainWindow.getSize();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  
  const previewX = mainX + mainWidth + PREVIEW_WINDOW_GAP;
  const previewY = mainY;
  
  // 如果超出屏幕，放在左侧
  if (previewX + PREVIEW_WINDOW_WIDTH > screenWidth) {
    return {
      x: Math.max(PREVIEW_WINDOW_GAP, mainX - PREVIEW_WINDOW_WIDTH - PREVIEW_WINDOW_GAP),
      y: previewY,
    };
  }
  
  return { x: previewX, y: previewY };
}

/**
 * 确保主窗口保持焦点
 */
function ensureMainWindowFocus(mainWindow: BrowserWindow | undefined): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
}

/**
 * 等待窗口准备就绪后执行回调
 * @param window 目标窗口
 * @param callback 回调函数
 * @param delay 延迟时间（毫秒）
 */
function waitForWindowReady(
  window: BrowserWindow,
  callback: () => void,
  delay: number = REACT_MOUNT_DELAY_LOADED
): void {
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      setTimeout(callback, delay);
    });
  } else {
    setTimeout(callback, delay);
  }
}

/**
 * 创建或获取预览窗口
 */
export function getPreviewWindow() {
  return windowManager.getOrCreateWindow(WINDOW_CONFIGS.preview());
}

/**
 * 显示预览窗口
 */
export function showPreviewWindow() {
  const window = windowManager.getOrCreateWindow(WINDOW_CONFIGS.preview());
  const mainWindow = windowManager.getWindow('main');
  
  // 计算并设置预览窗口位置
  if (mainWindow && !mainWindow.isDestroyed()) {
    const position = calculatePreviewPosition(mainWindow);
    window.setPosition(position.x, position.y);
  }
  
  // 等待窗口准备就绪后显示
  waitForWindowReady(window, () => {
    window.showInactive();
    ensureMainWindowFocus(mainWindow);
  }, SHOW_WINDOW_DELAY);
}

/**
 * 隐藏预览窗口
 */
export function hidePreviewWindow() {
  windowManager.hideWindow('preview');
}

/**
 * 发送预览数据到窗口
 */
function sendPreviewData(window: BrowserWindow, result: any, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[PreviewWindow] 更新预览内容:', { result, query });
    
    const sendData = () => {
      console.log('[PreviewWindow] 发送预览更新消息');
      try {
        window.webContents.send('preview-update', { result, query });
        console.log('[PreviewWindow] 消息已发送');
        resolve();
      } catch (error) {
        console.error('[PreviewWindow] 发送消息失败:', error);
        reject(error);
      }
    };
    
    // 根据窗口加载状态选择不同的延迟时间
    const delay = window.webContents.isLoading() 
      ? REACT_MOUNT_DELAY_LOADING 
      : REACT_MOUNT_DELAY_LOADED;
    
    waitForWindowReady(window, sendData, delay);
  });
}

/**
 * 更新预览内容
 */
export function updatePreviewContent(result: any, query: string): Promise<void> {
  let window = windowManager.getWindow('preview');
  
  // 如果窗口不存在或已销毁，创建新窗口
  if (!window || window.isDestroyed()) {
    window = windowManager.getOrCreateWindow(WINDOW_CONFIGS.preview());
    if (!window || window.isDestroyed()) {
      return Promise.reject(new Error('无法创建预览窗口'));
    }
  }
  
  return sendPreviewData(window, result, query);
}

/**
 * 关闭预览窗口
 */
export function closePreviewWindow() {
  windowManager.closeWindow('preview');
}

