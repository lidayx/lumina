import { WindowType } from '../types/window';

// 常量定义
const DEV_BASE_URL = 'http://localhost:3000';
const HASH_MAP: Record<WindowType, string> = {
  main: '',
  settings: '#settings',
  plugin: '#plugins',
  preview: '#preview',
};

// 在 Node 环境中使用，无需访问 process.env
const isDev = typeof process !== 'undefined' && 
              process.env && 
              process.env.NODE_ENV === 'development';

// 缓存生产模式的路径，避免重复 require
let cachedIndexPath: string | null = null;

/**
 * 获取生产模式的索引文件路径
 * 使用缓存避免重复 require
 */
function getIndexPath(): string {
  if (cachedIndexPath === null) {
    const path = require('path');
    const { app } = require('electron');
    cachedIndexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  }
  return cachedIndexPath;
}

/**
 * 获取窗口 URL
 * 优化：减少重复代码，使用映射表
 * 
 * @param type 窗口类型
 * @returns 窗口 URL
 */
export function getWindowUrl(type: WindowType): string {
  const hash = HASH_MAP[type] || '';
  
  if (isDev) {
    // 开发模式：从开发服务器加载
    return hash ? `${DEV_BASE_URL}${hash}` : DEV_BASE_URL;
  } else {
    // 生产模式：从本地文件加载
    const indexPath = getIndexPath();
    return `file://${indexPath}${hash}`;
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

