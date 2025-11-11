import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron';
import { getMainWindow, showMainWindow } from './windows/mainWindow';
import { windowManager } from './windows/windowManager';
import { registerAppHandlers } from './handlers/appHandlers';
import { registerFileHandlers } from './handlers/fileHandlers';
import { registerWebHandlers } from './handlers/webHandlers';
import { registerBrowserHandlers } from './handlers/browserHandlers';
import { registerWindowHandlers } from './handlers/windowHandlers';
import { registerCommandHandlers } from './handlers/commandHandlers';
import { registerCalculatorHandlers } from './handlers/calculatorHandlers';
import { registerTimeHandlers } from './handlers/timeHandlers';
import { registerBookmarkHandlers } from './handlers/bookmarkHandlers';
import { registerSettingsHandlers } from './handlers/settingsHandlers';
import { registerClipboardHandlers } from './handlers/clipboardHandlers';
import { registerShortcutHandlers } from './handlers/shortcutHandlers';
import { registerAliasHandlers } from './handlers/aliasHandlers';
import { registerFeatureCompletionHandlers } from './handlers/featureCompletionHandlers';
import { indexService } from './services/indexService';
import { appService } from './services/appService';
import { fileService } from './services/fileService';
import { trayService } from './services/trayService';
import bookmarkService from './services/bookmarkService';
import { clipboardService } from './services/clipboardService';
import { shortcutService } from './services/shortcutService';
import { aliasService } from './services/aliasService';
import { debugLog } from './utils/debugLog';

// 单实例限制：防止同时运行多个应用实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 如果已经有实例在运行，退出当前实例
  console.log('⚠️ 应用已经运行，退出当前实例');
  app.quit();
} else {
  // 处理第二实例启动
  app.on('second-instance', () => {
    console.log('⚠️ 检测到试图启动第二个实例，激活现有实例');
    
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      mainWindow.show();
    }
  });

  // 设置应用名称和版本
  app.setName('Lumina');
  
  // 自定义 About 对话框（仅 macOS）
  if (process.platform === 'darwin') {
    // 从 app 对象读取版本号（会自动从 package.json 读取）
    app.setAboutPanelOptions({
      applicationName: 'Lumina',
      applicationVersion: app.getVersion(),
      credits: '快如闪电的跨平台搜索启动器',
      copyright: 'Copyright © 2024 Lumina',
      iconPath: '', // 不显示图标
    });
  }

  app.whenReady().then(async () => {
    // 创建主窗口
    const mainWindow = getMainWindow();
    
    // 初始化剪贴板服务
    clipboardService.initialize().catch(err => {
      console.error('剪贴板服务初始化失败:', err);
    });
    
    // 根据设置决定是否显示窗口（minimizeToTray）
    const { default: settingsService } = await import('./services/settingsService');
    const minimizeToTray = settingsService.getSetting('minimizeToTray');
    
    if (!minimizeToTray) {
      // 显示窗口
      mainWindow.show();
      mainWindow.focus();
      console.log('✓ Lumina 窗口已显示');
    } else {
      // 启动时最小化到托盘，不显示窗口
      mainWindow.hide();
      console.log('✓ Lumina 已启动（最小化到托盘）');
    }
    
    // 启动定期索引服务（每10分钟重新索引一次）
    indexService.startPeriodicIndexing(10);
    
    // 异步创建系统托盘（不阻塞）
    setImmediate(() => {
      trayService.initialize().catch(err => {
        console.error('托盘初始化失败:', err);
      });
    });

    // 首次启动时触发索引（根据 fastStart 设置决定是否使用缓存）
    setImmediate(async () => {
      const { dbManager } = await import('./database/db');
      const apps = await dbManager.getAllItems('app');
      const fastStart = settingsService.getSetting('fastStart');
      
      // fastStart = false 或首次启动（无缓存），执行全量索引
      if (!fastStart || !apps || apps.length === 0) {
        if (!fastStart) {
          console.log('📝 快速启动已禁用，执行全量索引...');
        } else {
          console.log('📝 首次启动，等待窗口加载完成后触发索引...');
        }
        
        // 等待HTML加载完成后再触发索引（避免阻塞UI）
        mainWindow.webContents.once('did-finish-load', async () => {
          console.log('🚀 触发完整索引...');
          // fastStart=false 时，所有服务都重新扫描（忽略缓存）
          await Promise.all([
            appService.indexApps(true).catch(err => console.error('应用索引失败:', err)),
            fileService.indexFiles().catch(err => console.error('文件索引失败:', err)),
            bookmarkService.loadBookmarks(true).catch(err => console.error('书签加载失败:', err)),
          ]);
        });
      } else {
        // fastStart = true 且有缓存，快速加载（仅从缓存加载，不重新索引）
        console.log('✅ 快速启动模式：从缓存加载...');
        await Promise.all([
          appService.indexApps(false).catch(err => console.error('应用索引失败:', err)),
          fileService.indexFiles().catch(err => console.error('文件索引失败:', err)),
          bookmarkService.loadBookmarks().catch(err => console.error('书签加载失败:', err)),
        ]);
      }
    });

    // macOS: 点击 Dock 图标时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        getMainWindow();
      }
    });
  });
}

// 所有窗口关闭时不退出应用（保持在托盘运行）
app.on('window-all-closed', () => {
  // 保持应用运行，用户可通过托盘菜单退出
});

// 应用准备退出
app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
  
  // 停止索引服务
  try {
    indexService.stopPeriodicIndexing();
  } catch (error) {
    console.error('停止索引服务失败:', error);
  }
  
  // 销毁托盘
  try {
    trayService.destroy();
  } catch (error) {
    console.error('销毁托盘失败:', error);
  }
  
  // 清理 debug 日志
  try {
    debugLog.cleanup();
  } catch (error) {
    console.error('清理 debug 日志失败:', error);
  }
});

// 重写 console 方法以支持 debug 日志
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args: any[]) => {
  originalConsoleLog.apply(console, args);
  debugLog.log(...args);
};

console.error = (...args: any[]) => {
  originalConsoleError.apply(console, args);
  debugLog.error(...args);
};

console.warn = (...args: any[]) => {
  originalConsoleWarn.apply(console, args);
  debugLog.warn(...args);
};

console.info = (...args: any[]) => {
  originalConsoleInfo.apply(console, args);
  debugLog.info(...args);
};

// 初始化 debug 日志工具（在设置服务加载后）
setImmediate(async () => {
  await debugLog.init();
});

// IPC 处理器
ipcMain.handle('get-windows', () => {
  return windowManager.getAllWindows().map((w) => ({
    id: w.id,
    type: w.title,
  }));
});

ipcMain.handle('window-show', (_event, windowType: string) => {
  windowManager.showWindow(windowType as any);
});

ipcMain.handle('window-hide', (_event, windowType: string) => {
  windowManager.hideWindow(windowType as any);
  // 如果隐藏的是主窗口，同时隐藏预览窗口
  if (windowType === 'main') {
    // 使用动态导入以避免打包后的模块解析问题
    import('./windows/previewWindow').then(({ hidePreviewWindow }) => {
      hidePreviewWindow();
    }).catch((error) => {
      console.error('Error hiding preview window:', error);
    });
  }
});

ipcMain.handle('window-toggle', (_event, windowType: string) => {
  windowManager.toggleWindow(windowType as any);
});

ipcMain.handle('window-close', (_event, windowType: string) => {
  windowManager.closeWindow(windowType as any);
});

// 调整窗口大小
ipcMain.handle('window-resize', (_event, width: number, height: number) => {
  const mainWindow = windowManager.getWindow('main');
  if (mainWindow) {
    const [, currentY] = mainWindow.getPosition();
    mainWindow.setSize(width, height);
    
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth } = display.workAreaSize;
    const x = Math.floor((screenWidth - width) / 2);
    
    mainWindow.setPosition(x, currentY);
  }
});

// 注册 IPC 处理器
registerAppHandlers();
registerFileHandlers();
registerWebHandlers();
registerBrowserHandlers();
registerWindowHandlers();
registerCommandHandlers();
registerCalculatorHandlers();
registerTimeHandlers();
registerBookmarkHandlers();
registerSettingsHandlers();
registerClipboardHandlers();
registerShortcutHandlers();
registerAliasHandlers();
registerFeatureCompletionHandlers();

// 初始化服务
app.on('ready', async () => {
  // 初始化别名服务
  await aliasService.initialize();
  
  // 初始化并注册全局快捷键
  shortcutService.initialize();
  
  // 监听设置变化，重新注册快捷键
  // 注意：这里可以通过 IPC 事件来触发重新注册
  ipcMain.on('settings-updated', () => {
    shortcutService.loadAndRegister();
  });

  console.log('Lumina is ready!');
});
