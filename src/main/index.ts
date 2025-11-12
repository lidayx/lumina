import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron';
import { getMainWindow } from './windows/mainWindow';
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
import { registerEncodeHandlers } from './handlers/encodeHandlers';
import { registerStringHandlers } from './handlers/stringHandlers';
import { registerRandomHandlers } from './handlers/randomHandlers';
import { registerTranslateHandlers } from './handlers/translateHandlers';
import { registerVariableNameHandlers } from './handlers/variableNameHandlers';
import { registerTodoHandlers } from './handlers/todoHandlers';
import { indexService } from './services/indexService';
import { appService } from './services/appService';
import { fileService } from './services/fileService';
import { trayService } from './services/trayService';
import bookmarkService from './services/bookmarkService';
import { clipboardService } from './services/clipboardService';
import { shortcutService } from './services/shortcutService';
import { aliasService } from './services/aliasService';
import { debugLog } from './utils/debugLog';

// 常量定义
const APP_NAME = 'Lumina';
const PERIODIC_INDEXING_INTERVAL = 10; // 分钟
const INDEXING_DELAY = 100; // 毫秒

// IPC Handler 注册函数列表
const HANDLER_REGISTRATIONS = [
  registerAppHandlers,
  registerFileHandlers,
  registerWebHandlers,
  registerBrowserHandlers,
  registerWindowHandlers,
  registerCommandHandlers,
  registerCalculatorHandlers,
  registerTimeHandlers,
  registerBookmarkHandlers,
  registerSettingsHandlers,
  registerClipboardHandlers,
  registerShortcutHandlers,
  registerAliasHandlers,
  registerFeatureCompletionHandlers,
  registerEncodeHandlers,
  registerStringHandlers,
  registerRandomHandlers,
  registerTranslateHandlers,
  registerVariableNameHandlers,
  registerTodoHandlers,
];

/**
 * 处理第二实例启动，激活现有窗口
 */
function handleSecondInstance(): void {
  console.log('⚠️ 检测到试图启动第二个实例，激活现有实例');
  
  const mainWindow = getMainWindow();
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
  }
}

/**
 * 设置 macOS About 面板
 */
function setupAboutPanel(): void {
  if (process.platform === 'darwin') {
    app.setAboutPanelOptions({
      applicationName: APP_NAME,
      applicationVersion: app.getVersion(),
      credits: '快如闪电的跨平台搜索启动器',
      copyright: `Copyright © 2024 ${APP_NAME}`,
      iconPath: '', // 不显示图标
    });
  }
}

/**
 * 安全执行异步操作，捕获并记录错误
 */
function safeAsyncExecute<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<void> {
  return operation().catch((err) => {
    console.error(errorMessage, err);
  });
}

/**
 * 执行索引任务（带错误处理）
 */
async function executeIndexingTasks(forceReindex: boolean): Promise<void> {
  await Promise.all([
    appService.indexApps(forceReindex).catch((err) => 
      console.error('应用索引失败:', err)
    ),
    fileService.indexFiles().catch((err) => 
      console.error('文件索引失败:', err)
    ),
    bookmarkService.loadBookmarks(forceReindex).catch((err) => 
      console.error('书签加载失败:', err)
    ),
  ]);
}

// 单实例限制：防止同时运行多个应用实例
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('⚠️ 应用已经运行，退出当前实例');
  app.quit();
} else {
  // 处理第二实例启动
  app.on('second-instance', handleSecondInstance);

  // 设置应用名称和版本
  app.setName(APP_NAME);
  setupAboutPanel();

  /**
   * 初始化应用主逻辑
   */
  app.whenReady().then(async () => {
    const mainWindow = getMainWindow();
    
    // 初始化剪贴板服务
    await safeAsyncExecute(
      () => clipboardService.initialize(),
      '剪贴板服务初始化失败:'
    );
    
    // 根据设置决定是否显示窗口
    const { default: settingsService } = await import('./services/settingsService');
    const minimizeToTray = settingsService.getSetting('minimizeToTray');
    
    if (!minimizeToTray) {
      mainWindow.show();
      mainWindow.focus();
      console.log('✓ Lumina 窗口已显示');
    } else {
      mainWindow.hide();
      console.log('✓ Lumina 已启动（最小化到托盘）');
    }
    
    // 启动定期索引服务
    indexService.startPeriodicIndexing(PERIODIC_INDEXING_INTERVAL);
    
    // 异步初始化系统托盘（不阻塞主流程）
    setImmediate(() => {
      safeAsyncExecute(
        () => trayService.initialize(),
        '托盘初始化失败:'
      );
    });

    // 根据 fastStart 设置决定索引策略
    setImmediate(async () => {
      const { dbManager } = await import('./database/db');
      const apps = await dbManager.getAllItems('app');
      const fastStart = settingsService.getSetting('fastStart');
      const hasCache = apps && apps.length > 0;
      
      if (!fastStart || !hasCache) {
        // 快速启动已禁用或首次启动，执行全量索引
        console.log(
          !fastStart 
            ? '📝 快速启动已禁用，执行全量索引...'
            : '📝 首次启动，等待窗口加载完成后触发索引...'
        );
        
        // 等待窗口加载完成后再触发索引（避免阻塞UI）
        mainWindow.webContents.once('did-finish-load', async () => {
          console.log('🚀 触发完整索引...');
          await executeIndexingTasks(true);
        });
      } else {
        // 快速启动模式：从缓存加载
        console.log('✅ 快速启动模式：从缓存加载...');
        await executeIndexingTasks(false);
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

/**
 * 安全执行同步操作，捕获并记录错误
 */
function safeExecute(operation: () => void, errorMessage: string): void {
  try {
    operation();
  } catch (error) {
    console.error(errorMessage, error);
  }
}

/**
 * 清理应用资源
 */
function cleanupAppResources(): void {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
  
  // 停止索引服务
  safeExecute(
    () => indexService.stopPeriodicIndexing(),
    '停止索引服务失败:'
  );
  
  // 销毁托盘
  safeExecute(
    () => trayService.destroy(),
    '销毁托盘失败:'
  );
  
  // 清理 debug 日志
  safeExecute(
    () => debugLog.cleanup(),
    '清理 debug 日志失败:'
  );
}

// 所有窗口关闭时不退出应用（保持在托盘运行）
app.on('window-all-closed', () => {
  // 保持应用运行，用户可通过托盘菜单退出
});

// 应用准备退出
app.on('will-quit', cleanupAppResources);

/**
 * 重写 console 方法以支持 debug 日志
 */
function setupDebugLogging(): void {
  const originalMethods = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  console.log = (...args: any[]) => {
    originalMethods.log.apply(console, args);
    debugLog.log(...args);
  };

  console.error = (...args: any[]) => {
    originalMethods.error.apply(console, args);
    debugLog.error(...args);
  };

  console.warn = (...args: any[]) => {
    originalMethods.warn.apply(console, args);
    debugLog.warn(...args);
  };

  console.info = (...args: any[]) => {
    originalMethods.info.apply(console, args);
    debugLog.info(...args);
  };
}

/**
 * 注册窗口相关的 IPC 处理器
 */
function registerWindowIpcHandlers(): void {
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
      import('./windows/previewWindow')
        .then(({ hidePreviewWindow }) => hidePreviewWindow())
        .catch((error) => console.error('Error hiding preview window:', error));
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
}

// 设置 debug 日志
setupDebugLogging();

// 初始化 debug 日志工具（在设置服务加载后）
setImmediate(async () => {
  await debugLog.init();
});

// 注册窗口相关的 IPC 处理器
registerWindowIpcHandlers();

// 注册所有 IPC 处理器
HANDLER_REGISTRATIONS.forEach((register) => register());

/**
 * 初始化应用服务
 */
app.on('ready', async () => {
  // 初始化别名服务
  await aliasService.initialize();
  
  // 初始化并注册全局快捷键
  shortcutService.initialize();
  
  // 监听设置变化，重新注册快捷键
  ipcMain.on('settings-updated', () => {
    shortcutService.loadAndRegister();
  });

  console.log('Lumina is ready!');
});
