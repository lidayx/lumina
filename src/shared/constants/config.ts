// 从 package.json 读取版本号
function getPackageVersion(): string {
  // Node.js 环境（主进程）
  if (typeof require !== 'undefined' && typeof process !== 'undefined' && process.versions?.electron) {
    try {
      const fs = require('fs');
      const path = require('path');
      const app = require('electron').app;
      // 使用 app.getName() 和 app.getVersion() 更可靠
      if (app && app.getVersion) {
        return app.getVersion();
      }
      // 后备方案：读取 package.json
      const packagePath = path.resolve(__dirname, '../../../package.json');
      if (fs.existsSync(packagePath)) {
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      console.error('读取版本号失败:', error);
    }
  }
  // 浏览器环境（渲染进程），返回默认值
  return '1.0.0';
}

export const APP_NAME = 'Lumina';
export const APP_VERSION = getPackageVersion();
export const APP_ID = 'com.lumina.app';

export const DEFAULT_WINDOW_WIDTH = 800;
export const DEFAULT_WINDOW_HEIGHT = 600;

export const PLATFORMS = {
  MAC: 'darwin',
  WINDOWS: 'win32',
  LINUX: 'linux',
} as const;

export type Platform = typeof PLATFORMS[keyof typeof PLATFORMS];
