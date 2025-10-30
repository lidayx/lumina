import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron';
import * as path from 'path';
import { getMainWindow, showMainWindow } from '../windows/mainWindow';
import { openSettingsWindow } from '../windows/settingsWindow';
import * as fs from 'fs';

/**
 * 系统托盘服务
 */
class TrayService {
  // ========== 常量 ==========
  private readonly TOOLTIP = 'Lumina（快搜）- 点击显示主窗口';
  private readonly DEFAULT_ICON_SIZE = { width: 22, height: 22 };

  // ========== 私有属性 ==========
  private tray: Tray | null = null;
  private iconPath: string;

  constructor() {
    // 根据平台获取图标路径
    this.iconPath = this.getIconPath();
  }

  // ========== 初始化相关 ==========

  /**
   * 初始化系统托盘
   */
  public async initialize(): Promise<void> {
    console.log('🔧 [托盘服务] 开始初始化...');
    
    try {
      if (app.isReady()) {
        console.log('✅ [托盘服务] 应用已就绪，立即创建托盘');
        await this.createTray();
      } else {
        console.log('⏳ [托盘服务] 等待应用就绪...');
        app.whenReady().then(() => {
          console.log('✅ [托盘服务] 应用已就绪，创建托盘');
          this.createTray();
        });
      }
    } catch (error) {
      console.error('❌ [托盘服务] 初始化失败:', error);
    }
  }

  /**
   * 创建托盘图标
   */
  private async createTray(): Promise<void> {
    try {
      console.log(`🔧 [托盘服务] 使用图标路径: ${this.iconPath}`);
      
      // 验证图标文件
      if (!this.validateIconFile()) {
        return;
      }
      
      // 加载并准备图标
      const icon = await this.loadIcon();
      console.log('✅ [托盘服务] 图标加载成功');
      console.log('🔍 [托盘服务] 图标尺寸:', icon.getSize());
      
      // 准备最终图标
      const finalIcon = this.prepareIcon(icon);
      
      // 创建托盘实例
      this.tray = new Tray(finalIcon);
      console.log('✅ [托盘服务] 托盘已创建');

      // 配置托盘
      this.configureTray();
      
      // 注册事件监听
      this.registerTrayEvents();

      console.log('✅ [托盘服务] 系统托盘已创建并配置完成');
    } catch (error: unknown) {
      console.error('❌ [托盘服务] 创建托盘失败:', error);
      if (error instanceof Error) {
        console.error('错误详情:', error.stack);
      }
    }
  }

  /**
   * 验证图标文件是否存在
   */
  private validateIconFile(): boolean {
    if (!fs.existsSync(this.iconPath)) {
      console.error(`❌ [托盘服务] 图标文件不存在: ${this.iconPath}`);
      console.log(`💡 [托盘服务] 当前工作目录: ${process.cwd()}`);
      console.log(`💡 [托盘服务] __dirname: ${__dirname}`);
      return false;
    }
    return true;
  }

  /**
   * 准备图标（调整尺寸和格式）
   */
  private prepareIcon(icon: Electron.NativeImage): Electron.NativeImage {
    if (process.platform === 'darwin') {
      const resized = icon.resize(this.DEFAULT_ICON_SIZE);
      console.log(`✅ [托盘服务] 已创建 macOS 菜单栏图标 (${this.DEFAULT_ICON_SIZE.width}x${this.DEFAULT_ICON_SIZE.height}，保持透明度)`);
      return resized;
    }
    return icon;
  }

  /**
   * 配置托盘基本属性
   */
  private configureTray(): void {
    if (!this.tray) return;

    // 设置工具提示
    this.tray.setToolTip(this.TOOLTIP);
    
    // 创建上下文菜单
    const menu = Menu.buildFromTemplate(this.getMenuTemplate());
    this.tray.setContextMenu(menu);
  }

  /**
   * 注册托盘事件监听
   */
  private registerTrayEvents(): void {
    if (!this.tray) return;

    // 左键点击
    this.tray.on('click', () => {
      console.log('🖱️ [托盘服务] 托盘图标被点击');
      this.handleTrayClick();
    });

    // 双击
    this.tray.on('double-click', () => {
      console.log('🖱️🖱️ [托盘服务] 托盘图标被双击');
      this.handleTrayDoubleClick();
    });
  }

  // ========== 图标路径相关 ==========

  /**
   * 获取图标路径
   */
  private getIconPath(): string {
    const platform = process.platform;
    const isDev = !app.isPackaged;
    
    // 计算基础路径
    let basePath: string = '';
    if (isDev) {
      basePath = path.resolve(__dirname, '../build');
    } else {
      // 生产环境：尝试多个路径
      const possiblePaths = [
        path.join(app.getAppPath(), 'build'),
        path.join(__dirname, '../../build'),
        path.join(process.resourcesPath, 'build'),
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          basePath = possiblePath;
          break;
        }
      }
      
      // 如果都没找到，使用第一个作为默认
      if (!basePath) {
        basePath = path.join(app.getAppPath(), 'build');
      }
    }
    
    // 根据平台选择图标文件
    const iconFile = this.selectIconFile(platform, basePath);
    
    console.log(`🔍 [托盘服务] 环境: ${isDev ? '开发' : '生产'}`);
    console.log(`🔍 [托盘服务] __dirname: ${__dirname}`);
    console.log(`🔍 [托盘服务] app.getAppPath(): ${app.getAppPath()}`);
    console.log(`🔍 [托盘服务] 计算的 basePath: ${basePath}`);
    console.log(`🔍 [托盘服务] 图标路径: ${iconFile} (存在: ${fs.existsSync(iconFile)})`);
    
    return iconFile;
  }

  /**
   * 根据平台选择图标文件
   */
  private selectIconFile(platform: string, basePath: string): string {
    if (platform === 'darwin') {
      // macOS: 优先使用 .png，不存在则使用 .icns
      const pngIcon = path.join(basePath, 'icon.png');
      if (fs.existsSync(pngIcon)) return pngIcon;
      return path.join(basePath, 'icon.icns');
    } else if (platform === 'win32') {
      return path.join(basePath, 'icon.ico');
    } else {
      return path.join(basePath, 'icon.png');
    }
  }

  // ========== 图标加载相关 ==========

  /**
   * 加载图标
   */
  private async loadIcon(): Promise<Electron.NativeImage> {
    try {
      // 尝试加载主图标文件
      if (fs.existsSync(this.iconPath)) {
        const image = nativeImage.createFromPath(this.iconPath);
        console.log(`✅ [托盘服务] 已加载图标: ${this.iconPath}`);
        return image;
      }

      // 尝试加载后备图标
      const fallbackIcon = this.getFallbackIconPath();
      if (fs.existsSync(fallbackIcon)) {
        console.log(`✅ [托盘服务] 使用后备图标: ${fallbackIcon}`);
        return nativeImage.createFromPath(fallbackIcon);
      }
      
      // 返回默认图标
      console.warn('⚠️ [托盘服务] 所有图标文件都不存在，使用默认图标');
      return this.createDefaultIcon();
      
    } catch (error: unknown) {
      console.error('❌ [托盘服务] 加载图标失败:', error);
      throw error;
    }
  }

  /**
   * 获取后备图标路径
   */
  private getFallbackIconPath(): string {
    return path.resolve(__dirname, '../build/icon.png');
  }

  /**
   * 创建默认图标
   */
  private createDefaultIcon(): Electron.NativeImage {
    const defaultIconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAA'
      + 'GXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAWNJREFUeNqU0j1qw1AYxfE7'
      + 'lhMEpCQQSJcuwU1cJOkSXLpO06Vbl25dunTp0KWgC37Aa4JJDk';
    return nativeImage.createFromDataURL(defaultIconData);
  }

  // ========== 菜单相关 ==========

  /**
   * 获取菜单模板
   */
  private getMenuTemplate(): Electron.MenuItemConstructorOptions[] {
    const menuItems: Electron.MenuItemConstructorOptions[] = [
      { label: '显示主窗口', click: () => this.showMainWindow() },
      { type: 'separator' },
      { label: '设置', click: () => this.openSettings() },
      { type: 'separator' },
    ];

    // 添加平台特定菜单项
    this.addPlatformSpecificMenuItems(menuItems);

    return menuItems;
  }

  /**
   * 添加平台特定的菜单项
   */
  private addPlatformSpecificMenuItems(menuItems: Electron.MenuItemConstructorOptions[]): void {
    if (process.platform === 'darwin') {
      menuItems.push(
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', click: () => this.quitApp() }
      );
    } else {
      menuItems.push({ label: '退出', click: () => this.quitApp() });
    }
  }

  // ========== 事件处理相关 ==========

  /**
   * 处理托盘点击
   */
  private handleTrayClick(): void {
    this.showMainWindow();
  }

  /**
   * 处理托盘双击
   */
  private handleTrayDoubleClick(): void {
    this.showMainWindow();
  }

  /**
   * 显示主窗口
   */
  private showMainWindow(): void {
    try {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        showMainWindow();
      }
    } catch (error) {
      console.error('❌ [托盘服务] 显示主窗口失败:', error);
    }
  }

  /**
   * 打开设置窗口
   */
  private openSettings(): void {
    try {
      openSettingsWindow();
    } catch (error) {
      console.error('❌ [托盘服务] 打开设置窗口失败:', error);
    }
  }

  /**
   * 退出应用
   */
  private quitApp(): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => window.destroy());
    app.quit();
  }

  // ========== 公共 API ==========

  /**
   * 获取托盘实例
   */
  public getTray(): Tray | null {
    return this.tray;
  }

  /**
   * 销毁托盘
   */
  public destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('🗑️ [托盘服务] 托盘已销毁');
    }
  }
}

export const trayService = new TrayService();
export default trayService;

