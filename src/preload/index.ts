import { contextBridge, ipcRenderer } from 'electron';

/**
 * 创建 IPC 调用函数
 */
function createInvoke(channel: string) {
  return (...args: any[]) => ipcRenderer.invoke(channel, ...args);
}

/**
 * 创建事件监听器包装函数
 */
function createEventListener(callback: (...args: any[]) => void) {
  return (_event: any, ...args: any[]) => callback(...args);
}

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 调用主进程方法
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 监听主进程事件
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, createEventListener(callback));
  },

  // 移除事件监听器
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
  
  // 移除事件监听器（别名）
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 应用相关
  app: {
    getAll: createInvoke('app-get-all'),
    search: createInvoke('app-search'),
    launch: createInvoke('app-launch'),
    index: createInvoke('app-index'),
    revealFolder: createInvoke('app-reveal-folder'),
    getInfo: createInvoke('app-get-info'),
  },
  
      // 文件相关
      file: {
    getAll: createInvoke('file-get-all'),
    search: createInvoke('file-search'),
    open: createInvoke('file-open'),
    revealFolder: createInvoke('file-reveal-folder'),
    getInfo: createInvoke('file-get-info'),
    getImageSize: createInvoke('file-get-image-size'),
    getVideoInfo: createInvoke('file-get-video-info'),
    index: createInvoke('file-index'),
      },
      
      // 网页搜索相关
      web: {
    getEngines: createInvoke('web-get-engines'),
    search: createInvoke('web-search'),
    open: createInvoke('web-open'),
    getHistory: createInvoke('web-get-history'),
    clearHistory: createInvoke('web-clear-history'),
    getCommonSites: createInvoke('web-get-common-sites'),
    addEngine: createInvoke('web-add-engine'),
    updateEngine: createInvoke('web-update-engine'),
    deleteEngine: createInvoke('web-delete-engine'),
    setDefaultEngine: createInvoke('web-set-default-engine'),
      },
      
      // 浏览器设置相关
      browser: {
    getAll: createInvoke('browser-get-all'),
    add: createInvoke('browser-add'),
    update: createInvoke('browser-update'),
    delete: createInvoke('browser-delete'),
    setDefault: createInvoke('browser-set-default'),
    getDefault: createInvoke('browser-get-default'),
    openUrl: createInvoke('browser-open-url'),
      },
      
      // 命令执行相关
      command: {
    getAll: createInvoke('command-get-all'),
    search: createInvoke('command-search'),
    execute: createInvoke('command-execute'),
    executeRaw: createInvoke('command-execute-raw'),
    getHistory: createInvoke('command-get-history'),
    clearHistory: createInvoke('command-clear-history'),
    complete: createInvoke('command-complete'),
    help: createInvoke('command-help'),
      },
      
      // 计算器相关
      calculator: {
    calculate: createInvoke('calculator-calculate'),
      },
      
      // 时间相关
      time: {
    getAllFormats: createInvoke('time-get-all-formats'),
    handleQuery: createInvoke('time-handle-query'),
    complete: createInvoke('time-complete'),
    help: createInvoke('time-help'),
      },
      
      // TODO 相关
      todo: {
    handleQuery: createInvoke('todo-handle-query'),
    complete: createInvoke('todo-complete'),
    help: createInvoke('todo-help'),
      },
      
      // 随机数相关
      random: {
    handleQuery: createInvoke('random-handle-query'),
    complete: createInvoke('random-complete'),
    help: createInvoke('random-help'),
      },
      
      // 翻译相关
      translate: {
    handleQuery: createInvoke('translate-handle-query'),
    complete: createInvoke('translate-complete'),
    help: createInvoke('translate-help'),
      },
      
      // 变量名相关
      varname: {
    handleQuery: createInvoke('varname-handle-query'),
    complete: createInvoke('varname-complete'),
    help: createInvoke('varname-help'),
      },
      
      // 编码解码相关
      encode: {
    handleQuery: createInvoke('encode-handle-query'),
    complete: createInvoke('encode-complete'),
    help: createInvoke('encode-help'),
      },
      
      // 字符串工具相关
      string: {
    handleQuery: createInvoke('string-handle-query'),
    complete: createInvoke('string-complete'),
    help: createInvoke('string-help'),
      },
      
      // 书签相关
      bookmark: {
    getAll: createInvoke('bookmark-get-all'),
    search: createInvoke('bookmark-search'),
    reload: createInvoke('bookmark-reload'),
    getInfo: createInvoke('bookmark-get-info'),
      },
      
      // 应用设置相关
      settings: {
    getAll: createInvoke('settings-get-all'),
    update: createInvoke('settings-update'),
    reset: createInvoke('settings-reset'),
    getLogFile: createInvoke('settings-get-log-file'),
      },
      
      // 快捷键相关
      shortcut: {
    getCurrent: createInvoke('shortcut-get-current'),
    set: createInvoke('shortcut-set'),
    checkAvailable: createInvoke('shortcut-check-available'),
    format: createInvoke('shortcut-format'),
      },
      
      // 别名相关
      alias: {
    getAll: createInvoke('alias-get-all'),
    add: createInvoke('alias-add'),
    remove: createInvoke('alias-remove'),
    update: createInvoke('alias-update'),
    get: createInvoke('alias-get'),
    resolve: createInvoke('alias-resolve'),
      },
      
      // 剪贴板相关
      clipboard: {
    getHistory: createInvoke('clipboard-get-history'),
    search: createInvoke('clipboard-search'),
    delete: createInvoke('clipboard-delete'),
    clear: createInvoke('clipboard-clear'),
    paste: createInvoke('clipboard-paste'),
      },
      
      // 窗口相关
  windowResize: createInvoke('window-resize'),
  windowHide: createInvoke('window-hide'),
      
      // 预览窗口相关
      preview: {
    show: createInvoke('preview-show'),
    hide: createInvoke('preview-hide'),
    update: (result: any, query: string) => 
      ipcRenderer.invoke('preview-update', result, query).then(() => undefined),
    close: createInvoke('preview-close'),
      },
});

  // 类型定义
  export interface ElectronAPI {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, callback: (...args: any[]) => void) => void;
    removeListener: (channel: string, callback: (...args: any[]) => void) => void;
    app: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      launch: (appId: string) => Promise<any>;
      index: () => Promise<any>;
      revealFolder: (appId: string) => Promise<any>;
      getInfo: (appId: string) => Promise<any>;
    };
    file: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      open: (filePath: string) => Promise<any>;
      revealFolder: (filePath: string) => Promise<any>;
      getInfo: (filePath: string) => Promise<any>;
      getImageSize: (filePath: string) => Promise<any>;
      getVideoInfo: (filePath: string) => Promise<any>;
      index: (paths?: string[]) => Promise<any>;
    };
    web: {
      getEngines: () => Promise<any[]>;
      search: (query: string, engineName?: string) => Promise<any[]>;
      open: (url: string) => Promise<any>;
      getHistory: (limit?: number) => Promise<any[]>;
      clearHistory: () => Promise<any>;
      getCommonSites: () => Promise<any[]>;
      addEngine: (engine: any) => Promise<any>;
      updateEngine: (name: string, updates: any) => Promise<any>;
      deleteEngine: (name: string) => Promise<any>;
      setDefaultEngine: (name: string) => Promise<any>;
    };
    browser: {
      getAll: () => Promise<any[]>;
      add: (browser: any) => Promise<any>;
      update: (id: string, updates: any) => Promise<any>;
      delete: (id: string) => Promise<any>;
      setDefault: (id: string) => Promise<any>;
      getDefault: () => Promise<any>;
      openUrl: (url: string) => Promise<any>;
    };
    command: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      execute: (commandId: string) => Promise<any>;
      executeRaw: (command: string) => Promise<any>;
      getHistory: (limit?: number) => Promise<any[]>;
      clearHistory: () => Promise<any>;
    };
    calculator: {
      calculate: (expression: string) => Promise<any>;
    };
    time: {
      getAllFormats: (dateISOString?: string) => Promise<any[]>;
      handleQuery: (query: string) => Promise<any>;
    };
    bookmark: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      reload: () => Promise<any>;
      getInfo: (url: string) => Promise<any>;
    };
    settings: {
      getAll: () => Promise<any>;
      update: (updates: any) => Promise<any>;
      reset: () => Promise<any>;
      getLogFile: () => Promise<string>;
    };
    shortcut: {
      getCurrent: () => Promise<{ shortcut: string | null; formatted: string | null }>;
      set: (shortcut: string) => Promise<{ success: boolean }>;
      checkAvailable: (shortcut: string) => Promise<{ available: boolean }>;
      format: (shortcut: string) => Promise<{ formatted: string }>;
    };
    alias: {
      getAll: () => Promise<any[]>;
      add: (name: string, command: string, type: string, description?: string) => Promise<{ success: boolean; alias?: any; error?: string }>;
      remove: (name: string) => Promise<{ success: boolean }>;
      update: (name: string, updates: any) => Promise<{ success: boolean }>;
      get: (name: string) => Promise<{ alias?: any }>;
      resolve: (input: string) => Promise<{ resolved: string; alias?: any; hasArgs: boolean } | null>;
    };
    clipboard: {
      getHistory: (limit?: number) => Promise<any[]>;
      search: (query: string, limit?: number) => Promise<any[]>;
      delete: (id: string) => Promise<any>;
      clear: () => Promise<any>;
      paste: (id: string) => Promise<any>;
    };
    windowResize: (width: number, height: number) => Promise<void>;
    windowHide: (windowType: string) => Promise<void>;
    off: (channel: string, callback: (...args: any[]) => void) => void;
    preview: {
      show: () => Promise<void>;
      hide: () => Promise<void>;
      update: (result: any, query: string) => Promise<void>;
      close: () => Promise<void>;
    };
  }

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
