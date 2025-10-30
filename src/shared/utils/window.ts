import { WindowType } from '../types/window';

// 在 Node 环境中使用，无需访问 process.env
let isDev = false;
if (typeof process !== 'undefined' && process.env) {
  isDev = process.env.NODE_ENV === 'development';
}

/**
 * 获取窗口 URL
 */
export function getWindowUrl(type: WindowType): string {
  if (isDev) {
    // 开发模式：从开发服务器加载
    const baseUrl = 'http://localhost:3000';
    switch (type) {
      case 'main':
        return baseUrl;
      case 'settings':
        return `${baseUrl}#settings`;
      case 'plugin':
        return `${baseUrl}#plugins`;
      default:
        return baseUrl;
    }
  } else {
    // 生产模式：从本地文件加载
    const path = require('path');
    const { app } = require('electron');
    
    // app.asar 结构：app.asar/dist/index.html
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
    
    switch (type) {
      case 'main':
        return `file://${indexPath}`;
      case 'settings':
        return `file://${indexPath}#settings`;
      case 'plugin':
        return `file://${indexPath}#plugins`;
      default:
        return `file://${indexPath}`;
    }
  }
}

/**
 * 窗口配置映射（使用函数避免模块加载时执行 getWindowUrl）
 */
export const WINDOW_CONFIGS = {
  main: () => ({
    type: 'main' as WindowType,
    url: getWindowUrl('main'),
    width: 700,
    height: 80, // 初始高度（只有输入框）
    minWidth: 500,
    minHeight: 80, // 最小高度保持输入框可见
    maximizable: false, // 不允许最大化
    minimizable: true,
    resizable: true, // 允许动态调整大小
  }),
  settings: () => ({
    type: 'settings' as WindowType,
    url: getWindowUrl('settings'),
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    maximizable: true,
    minimizable: true,
    resizable: true,
  }),
  plugin: () => ({
    type: 'plugin' as WindowType,
    url: getWindowUrl('plugin'),
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    maximizable: true,
    minimizable: true,
    resizable: true,
  }),
};

