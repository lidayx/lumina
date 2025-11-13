import { BrowserWindow, shell, screen } from 'electron';
import { WindowConfig, WindowType } from '../../shared/types/window';
import { getWindowUrl } from '../../shared/utils/window';
import * as path from 'path';
import * as fs from 'fs';

// 常量定义
const MIN_WINDOW_WIDTH = 400;
const MIN_WINDOW_HEIGHT = 300;
const MAIN_WINDOW_TOP_MARGIN = 20;
const HIDDEN_TRAFFIC_LIGHT_POSITION = { x: -100, y: -100 };

class WindowManager {
  private windows: Map<WindowType, BrowserWindow> = new Map();

  /**
   * 获取或创建窗口
   */
  public getOrCreateWindow(config: WindowConfig): BrowserWindow {
    const existingWindow = this.windows.get(config.type);

    if (existingWindow && !existingWindow.isDestroyed()) {
      // 预览窗口不获取焦点
      if (config.type !== 'preview') {
        existingWindow.focus();
      }
      return existingWindow;
    }

    return this.createWindow(config);
  }

  /**
   * 构建窗口的基础配置
   */
  private buildBaseWindowOptions(config: WindowConfig): Electron.BrowserWindowConstructorOptions {
    const isMain = config.type === 'main';
    const isPreview = config.type === 'preview';
    const isDarwin = process.platform === 'darwin';

    return {
      width: config.width,
      height: config.height,
      minWidth: config.minWidth || MIN_WINDOW_WIDTH,
      minHeight: config.minHeight || MIN_WINDOW_HEIGHT,
      maximizable: config.maximizable !== false,
      minimizable: config.minimizable !== false,
      resizable: config.resizable !== false,
      frame: !isMain && !isPreview,
      transparent: isMain,
      titleBarStyle: isMain || isPreview ? 'hidden' : 'default',
      show: !isPreview,
      icon: this.getAppIcon(),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    };
  }

  /**
   * 构建预览窗口的特殊配置
   */
  private buildPreviewWindowOptions(): Partial<Electron.BrowserWindowConstructorOptions> {
    const isDarwin = process.platform === 'darwin';
    
    return {
      autoHideMenuBar: true,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: false,
      ...(isDarwin && {
        trafficLightPosition: HIDDEN_TRAFFIC_LIGHT_POSITION,
      }),
    };
  }

  /**
   * 构建主窗口的平台特定配置
   */
  private buildMainWindowOptions(): Partial<Electron.BrowserWindowConstructorOptions> {
    const isDarwin = process.platform === 'darwin';
    
    if (isDarwin) {
      return {
        titleBarStyle: 'hidden',
        trafficLightPosition: HIDDEN_TRAFFIC_LIGHT_POSITION,
    };
    }
    
    return {
      autoHideMenuBar: true,
    };
  }

  /**
   * 计算窗口位置
   */
  private calculateWindowPosition(config: WindowConfig): { x: number; y: number } {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    if (config.type === 'main') {
      // 主窗口：屏幕上方 1/4 位置，水平居中
      const x = Math.floor((screenWidth - config.width) / 2);
      const y = Math.floor(screenHeight / 4) - Math.floor(config.height / 2);
      return {
        x,
        y: Math.max(MAIN_WINDOW_TOP_MARGIN, y),
      };
    }
    
    if (config.type === 'preview') {
      // 预览窗口：默认位置在主窗口右侧（位置会在 showPreviewWindow 中设置）
      return {
        x: Math.floor((screenWidth - config.width) / 2),
        y: Math.floor((screenHeight - config.height) / 2),
      };
    }
    
      // 其他窗口：屏幕居中
    return {
      x: Math.floor((screenWidth - config.width) / 2),
      y: Math.floor((screenHeight - config.height) / 2),
    };
    }

  /**
   * 设置窗口事件监听器
   */
  private setupWindowEventListeners(window: BrowserWindow, config: WindowConfig): void {
    // 监听窗口关闭事件
    window.on('closed', () => {
      this.windows.delete(config.type);
      
      // 主窗口关闭时，关闭预览窗口
      if (config.type === 'main') {
        const previewWindow = this.windows.get('preview');
        if (previewWindow && !previewWindow.isDestroyed()) {
          previewWindow.close();
        }
      }
    });

    // 阻止新窗口在应用内打开，改为在默认浏览器中打开
    window.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // 预览窗口：监听焦点事件，确保不会获取焦点
    if (config.type === 'preview') {
      window.on('focus', () => {
        const mainWindow = this.windows.get('main');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.focus();
        }
      });
    }
  }

  /**
   * 创建新窗口
   */
  public createWindow(config: WindowConfig): BrowserWindow {
    // 构建窗口配置
    const baseOptions = this.buildBaseWindowOptions(config);
    const position = this.calculateWindowPosition(config);
    
    // 合并特殊配置
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      ...baseOptions,
      ...position,
      ...(config.type === 'preview' && this.buildPreviewWindowOptions()),
      ...(config.type === 'main' && this.buildMainWindowOptions()),
    };

    const window = new BrowserWindow(windowOptions);

    // 加载窗口内容
    window.loadURL(getWindowUrl(config.type)).then(() => {
      // 内容加载完成后显示窗口（预览窗口除外）
      if (config.type !== 'preview') {
        window.show();
        window.focus();
      }
    });

    // 设置事件监听器
    this.setupWindowEventListeners(window, config);

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
      if (type === 'preview') {
        // 预览窗口显示但不获取焦点
        window.showInactive();
      } else {
        window.show();
        window.focus();
      }
      
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
   * 检查窗口是否可见
   */
  public isWindowVisible(type: WindowType): boolean {
    const window = this.getWindow(type);
    if (window) {
      return window.isVisible();
    }
    return false;
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
   * 获取应用图标路径
   * 优先使用生产环境的图标，如果不存在则使用开发环境的图标
   */
  private getAppIcon(): string | undefined {
    const iconName = this.getIconNameForPlatform();
    
    // 优先尝试生产环境的图标路径
    const productionIcon = path.join(process.resourcesPath, iconName);
    if (fs.existsSync(productionIcon)) {
      return productionIcon;
    }
    
    // 如果生产环境不存在，尝试开发环境的图标路径
    const devIcon = path.join(__dirname, '../../build', iconName);
    if (fs.existsSync(devIcon)) {
      return devIcon;
    }
    
    // 如果都不存在，返回 undefined（使用默认 Electron 图标）
    return undefined;
  }

  /**
   * 根据平台获取图标文件名
   */
  private getIconNameForPlatform(): string {
    if (process.platform === 'win32') {
      return 'icon.ico';
    }
    if (process.platform === 'darwin') {
      return 'icon.icns';
    }
    return 'icon.png';
  }
}

export const windowManager = new WindowManager();
export default windowManager;

