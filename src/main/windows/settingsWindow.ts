import { windowManager } from './windowManager';
import { WINDOW_CONFIGS } from '../../shared/utils/window';
import { BrowserWindow } from 'electron';

// 常量定义
const MESSAGE_SEND_DELAY = 100; // 发送消息的延迟时间（确保 React 组件已挂载）

/**
 * 等待窗口准备就绪后发送消息
 */
function sendMessageWhenReady(window: BrowserWindow, channel: string, data?: any): void {
  const sendMessage = () => {
    window.webContents.send(channel, data);
  };
  
  if (window.webContents.isLoading()) {
    window.webContents.once('did-finish-load', () => {
      setTimeout(sendMessage, MESSAGE_SEND_DELAY);
    });
  } else {
    setTimeout(sendMessage, MESSAGE_SEND_DELAY);
  }
}

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
    sendMessageWhenReady(window, 'settings-switch-tab', tab);
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

