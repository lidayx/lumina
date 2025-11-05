import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';
import { screen, BrowserWindow } from 'electron';

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
  
  // 预览窗口位置：主窗口右侧
  const mainWindow = windowManager.getWindow('main');
  if (mainWindow && !mainWindow.isDestroyed()) {
    const [mainX, mainY] = mainWindow.getPosition();
    const [mainWidth] = mainWindow.getSize();
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    
    // 预览窗口位置：主窗口右侧，如果超出屏幕则放在左侧
    const previewX = mainX + mainWidth + 10;
    const previewY = mainY;
    
    // 如果超出屏幕，放在左侧
    if (previewX + 400 > screenWidth) {
      window.setPosition(Math.max(10, mainX - 410), previewY);
    } else {
      window.setPosition(previewX, previewY);
    }
  }
  
  // 确保窗口内容已加载完成后再显示
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      // 等待一下确保 React 组件已挂载并接收到数据
      setTimeout(() => {
        window.showInactive();
        // 确保主窗口保持焦点
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      }, 100);
    });
  } else {
    // 窗口已加载，直接显示
    window.showInactive();
    // 确保主窗口保持焦点
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
    }
  }
}

/**
 * 隐藏预览窗口
 */
export function hidePreviewWindow() {
  windowManager.hideWindow('preview');
}

/**
 * 更新预览内容
 */
export function updatePreviewContent(result: any, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const window = windowManager.getWindow('preview');
    if (!window || window.isDestroyed()) {
      // 如果窗口不存在，先创建窗口
      const newWindow = windowManager.getOrCreateWindow(WINDOW_CONFIGS.preview());
      if (!newWindow || newWindow.isDestroyed()) {
        reject(new Error('无法创建预览窗口'));
        return;
      }
      // 等待窗口加载完成后再发送数据
      if (newWindow.webContents.isLoading()) {
        newWindow.webContents.once('did-finish-load', () => {
          setTimeout(() => sendPreviewData(newWindow, result, query).then(resolve).catch(reject), 500);
        });
      } else {
        setTimeout(() => sendPreviewData(newWindow, result, query).then(resolve).catch(reject), 300);
      }
    } else {
      sendPreviewData(window, result, query).then(resolve).catch(reject);
    }
  });
}

/**
 * 发送预览数据的辅助函数
 */
function sendPreviewData(window: BrowserWindow, result: any, query: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[PreviewWindow] 更新预览内容:', { result, query });
    
    // 发送预览数据的函数
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
    
    // 确保窗口内容已加载完成
    if (window.webContents.isLoading()) {
      // 如果还在加载，等待加载完成后再发送
      console.log('[PreviewWindow] 窗口正在加载，等待加载完成');
      window.webContents.once('did-finish-load', () => {
        console.log('[PreviewWindow] 窗口加载完成，等待 React 组件挂载');
        // 等待更长时间确保 React 组件已挂载并注册了监听器
        setTimeout(sendData, 500);
      });
    } else {
      // 窗口已加载，等待 React 组件准备好
      console.log('[PreviewWindow] 窗口已加载，等待 React 组件准备');
      setTimeout(sendData, 300);
    }
  });
}

/**
 * 关闭预览窗口
 */
export function closePreviewWindow() {
  windowManager.closeWindow('preview');
}

