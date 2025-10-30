import { BrowserWindow, shell, screen } from 'electron';
import { WindowConfig, WindowType } from '../../shared/types/window';
import { getWindowUrl } from '../../shared/utils/window';
import * as path from 'path';
import * as fs from 'fs';

class WindowManager {
  private windows: Map<WindowType, BrowserWindow> = new Map();

  /**
   * 获取或创建窗口
   */
  public getOrCreateWindow(config: WindowConfig): BrowserWindow {
    const existingWindow = this.windows.get(config.type);

    if (existingWindow && !existingWindow.isDestroyed()) {
      existingWindow.focus();
      return existingWindow;
    }

    return this.createWindow(config);
  }

  /**
   * 创建新窗口
   */
  public createWindow(config: WindowConfig): BrowserWindow {
    // 计算窗口位置（主窗口在屏幕上1/4位置，其他窗口居中）
    let windowOptions: any = {
      width: config.width,
      height: config.height,
      minWidth: config.minWidth || 400,
      minHeight: config.minHeight || 300,
      maximizable: config.maximizable !== false,
      minimizable: config.minimizable !== false,
      resizable: config.resizable !== false,
      // 无边框窗口（仅主窗口）
      frame: config.type !== 'main',
      transparent: config.type === 'main', // 透明背景
      titleBarStyle: config.type === 'main' ? 'hidden' : 'default',
      // macOS 特定设置
      ...(config.type === 'main' && process.platform === 'darwin' && {
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: -100, y: -100 }, // 隐藏 macOS 窗口控制按钮
      }),
      ...(config.type === 'main' && process.platform !== 'darwin' && {
        autoHideMenuBar: true,
      }),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      show: false,
      icon: this.getAppIcon(),
    };

    // 设置窗口位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    if (config.type === 'main') {
      // 主窗口：屏幕上方 1/4 位置，水平居中
      const x = Math.floor((screenWidth - config.width) / 2);
      const y = Math.floor(screenHeight / 4) - Math.floor(config.height / 2);
      windowOptions.x = x;
      windowOptions.y = Math.max(20, y); // 至少距顶部 20px
    } else {
      // 其他窗口：屏幕居中
      windowOptions.x = Math.floor((screenWidth - config.width) / 2);
      windowOptions.y = Math.floor((screenHeight - config.height) / 2);
    }

    const window = new BrowserWindow(windowOptions);

    // 加载窗口内容
    window.loadURL(getWindowUrl(config.type)).then(() => {
      // 内容加载完成后显示窗口
      window.show();
      window.focus();
    });

    // 监听窗口关闭事件
    window.on('closed', () => {
      this.windows.delete(config.type);
    });

    // 阻止新窗口在应用内打开，改为在默认浏览器中打开
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.windows.set(config.type, window);
    return window;
  }

  /**
   * 获取窗口
   */
  public getWindow(type: WindowType): BrowserWindow | undefined {
    const window = this.windows.get(type);
    if (window && window.isDestroyed()) {
      this.windows.delete(type);
      return undefined;
    }
    return window;
  }

  /**
   * 显示窗口
   */
  public showWindow(type: WindowType): void {
    const window = this.getWindow(type);
    if (window) {
      window.show();
      window.focus();
      
      // 主窗口显示时，发送事件让渲染进程清空输入并获取焦点
      if (type === 'main') {
        window.webContents.send('main-window-show');
      }
    }
  }

  /**
   * 隐藏窗口
   */
  public hideWindow(type: WindowType): void {
    const window = this.getWindow(type);
    if (window) {
      window.hide();
    }
  }

  /**
   * 切换窗口显示状态
   */
  public toggleWindow(type: WindowType): void {
    const window = this.getWindow(type);
    if (window) {
      if (window.isVisible()) {
        this.hideWindow(type);
      } else {
        this.showWindow(type);
      }
    }
  }

  /**
   * 关闭窗口
   */
  public closeWindow(type: WindowType): void {
    const window = this.getWindow(type);
    if (window) {
      window.close();
    }
  }

  /**
   * 关闭所有窗口
   */
  public closeAllWindows(): void {
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows.clear();
  }

  /**
   * 获取所有窗口
   */
  public getAllWindows(): BrowserWindow[] {
    const windows: BrowserWindow[] = [];
    this.windows.forEach((window) => {
      if (!window.isDestroyed()) {
        windows.push(window);
      }
    });
    return windows;
  }

  public getActiveWindow(): BrowserWindow | undefined {
    const windows = BrowserWindow.getAllWindows();
    return windows.find((w) => w.isFocused());
  }

  /**
   * 获取应用图标
   */
  private getAppIcon(): string | undefined {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 
                     process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    
    // 生产环境：使用打包后的图标
    const productionIcon = path.join(process.resourcesPath, iconName);
    if (fs.existsSync(productionIcon)) {
      return productionIcon;
    }
    
    // 开发环境：查找 build 目录
    const devIcon = path.join(__dirname, '../../build', iconName);
    if (fs.existsSync(devIcon)) {
      return devIcon;
    }
    
    // 如果都没有，返回 undefined（使用默认 Electron 图标）
    return undefined;
  }
}

export const windowManager = new WindowManager();
export default windowManager;

