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
      case 'preview':
        return `${baseUrl}#preview`;
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
      case 'preview':
        return `file://${indexPath}#preview`;
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
    maximizable: isDev, // 开发模式下允许最大化
    minimizable: true,
    resizable: isDev, // 开发模式下允许调整大小
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
  preview: () => {
    // 主窗口最大高度计算：80 (输入框) + 8 * 56 (最大8项结果，每项56px) + 20 (padding) = 548px
    const mainWindowMaxHeight = 80 + 8 * 56 + 20; // 548px
    
    return {
      type: 'preview' as WindowType,
      url: getWindowUrl('preview'),
      width: 400,
      height: mainWindowMaxHeight, // 固定为主窗口最大高度
      minWidth: 300,
      minHeight: 200,
      maximizable: isDev, // 开发模式下允许最大化
      minimizable: true,
      resizable: isDev, // 开发模式下允许调整大小
    };
  },
};

