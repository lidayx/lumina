import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 调用主进程方法
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 监听主进程事件
  on: (channel: string, callback: (...args: any[]) => void) => {
    const wrappedCallback = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, wrappedCallback);
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
    getAll: () => ipcRenderer.invoke('app-get-all'),
    search: (query: string) => ipcRenderer.invoke('app-search', query),
    launch: (appId: string) => ipcRenderer.invoke('app-launch', appId),
    index: () => ipcRenderer.invoke('app-index'),
    revealFolder: (appId: string) => ipcRenderer.invoke('app-reveal-folder', appId),
    getInfo: (appId: string) => ipcRenderer.invoke('app-get-info', appId),
  },
  
      // 文件相关
      file: {
        getAll: () => ipcRenderer.invoke('file-get-all'),
        search: (query: string) => ipcRenderer.invoke('file-search', query),
        open: (filePath: string) => ipcRenderer.invoke('file-open', filePath),
        revealFolder: (filePath: string) => ipcRenderer.invoke('file-reveal-folder', filePath),
        getInfo: (filePath: string) => ipcRenderer.invoke('file-get-info', filePath),
        getImageSize: (filePath: string) => ipcRenderer.invoke('file-get-image-size', filePath),
        getVideoInfo: (filePath: string) => ipcRenderer.invoke('file-get-video-info', filePath),
        index: (paths?: string[]) => ipcRenderer.invoke('file-index', paths),
      },
      
      // 网页搜索相关
      web: {
        getEngines: () => ipcRenderer.invoke('web-get-engines'),
        search: (query: string, engineName?: string) => ipcRenderer.invoke('web-search', query, engineName),
        open: (url: string) => ipcRenderer.invoke('web-open', url),
        getHistory: (limit?: number) => ipcRenderer.invoke('web-get-history', limit),
        clearHistory: () => ipcRenderer.invoke('web-clear-history'),
        getCommonSites: () => ipcRenderer.invoke('web-get-common-sites'),
        addEngine: (engine: any) => ipcRenderer.invoke('web-add-engine', engine),
        updateEngine: (name: string, updates: any) => ipcRenderer.invoke('web-update-engine', name, updates),
        deleteEngine: (name: string) => ipcRenderer.invoke('web-delete-engine', name),
        setDefaultEngine: (name: string) => ipcRenderer.invoke('web-set-default-engine', name),
      },
      
      // 浏览器设置相关
      browser: {
        getAll: () => ipcRenderer.invoke('browser-get-all'),
        add: (browser: any) => ipcRenderer.invoke('browser-add', browser),
        update: (id: string, updates: any) => ipcRenderer.invoke('browser-update', id, updates),
        delete: (id: string) => ipcRenderer.invoke('browser-delete', id),
        setDefault: (id: string) => ipcRenderer.invoke('browser-set-default', id),
        getDefault: () => ipcRenderer.invoke('browser-get-default'),
        openUrl: (url: string) => ipcRenderer.invoke('browser-open-url', url),
      },
      
      // 命令执行相关
      command: {
        getAll: () => ipcRenderer.invoke('command-get-all'),
        search: (query: string) => ipcRenderer.invoke('command-search', query),
        execute: (commandId: string) => ipcRenderer.invoke('command-execute', commandId),
        executeRaw: (command: string) => ipcRenderer.invoke('command-execute-raw', command),
        getHistory: (limit?: number) => ipcRenderer.invoke('command-get-history', limit),
        clearHistory: () => ipcRenderer.invoke('command-clear-history'),
        complete: (partial: string) => ipcRenderer.invoke('command-complete', partial),
        help: (commandId: string) => ipcRenderer.invoke('command-help', commandId),
      },
      
      // 计算器相关
      calculator: {
        calculate: (expression: string) => ipcRenderer.invoke('calculator-calculate', expression),
      },
      
      // 时间相关
      time: {
        getAllFormats: (dateISOString?: string) => ipcRenderer.invoke('time-get-all-formats', dateISOString),
        handleQuery: (query: string) => ipcRenderer.invoke('time-handle-query', query),
        complete: (partial: string) => ipcRenderer.invoke('time-complete', partial),
        help: () => ipcRenderer.invoke('time-help'),
      },
      
      // 功能补全相关
      translate: {
        complete: (partial: string) => ipcRenderer.invoke('translate-complete', partial),
        help: () => ipcRenderer.invoke('translate-help'),
      },
      random: {
        complete: (partial: string) => ipcRenderer.invoke('random-complete', partial),
        help: () => ipcRenderer.invoke('random-help'),
      },
      encode: {
        handleQuery: (query: string) => ipcRenderer.invoke('encode-handle-query', query),
        complete: (partial: string) => ipcRenderer.invoke('encode-complete', partial),
        help: () => ipcRenderer.invoke('encode-help'),
      },
      string: {
        handleQuery: (query: string) => ipcRenderer.invoke('string-handle-query', query),
        complete: (partial: string) => ipcRenderer.invoke('string-complete', partial),
        help: () => ipcRenderer.invoke('string-help'),
      },
      varname: {
        complete: (partial: string) => ipcRenderer.invoke('varname-complete', partial),
        help: () => ipcRenderer.invoke('varname-help'),
      },
      
      // 书签相关
      bookmark: {
        getAll: () => ipcRenderer.invoke('bookmark-get-all'),
        search: (query: string) => ipcRenderer.invoke('bookmark-search', query),
        reload: () => ipcRenderer.invoke('bookmark-reload'),
        getInfo: (url: string) => ipcRenderer.invoke('bookmark-get-info', url),
      },
      
      // 应用设置相关
      settings: {
        getAll: () => ipcRenderer.invoke('settings-get-all'),
        update: (updates: any) => ipcRenderer.invoke('settings-update', updates),
        reset: () => ipcRenderer.invoke('settings-reset'),
        getLogFile: () => ipcRenderer.invoke('settings-get-log-file'),
      },
      
      // 快捷键相关
      shortcut: {
        getCurrent: () => ipcRenderer.invoke('shortcut-get-current'),
        set: (shortcut: string) => ipcRenderer.invoke('shortcut-set', shortcut),
        checkAvailable: (shortcut: string) => ipcRenderer.invoke('shortcut-check-available', shortcut),
        format: (shortcut: string) => ipcRenderer.invoke('shortcut-format', shortcut),
      },
      
      // 别名相关
      alias: {
        getAll: () => ipcRenderer.invoke('alias-get-all'),
        add: (name: string, command: string, type: string, description?: string) => ipcRenderer.invoke('alias-add', name, command, type, description),
        remove: (name: string) => ipcRenderer.invoke('alias-remove', name),
        update: (name: string, updates: any) => ipcRenderer.invoke('alias-update', name, updates),
        get: (name: string) => ipcRenderer.invoke('alias-get', name),
        resolve: (input: string) => ipcRenderer.invoke('alias-resolve', input),
      },
      
      // 剪贴板相关
      clipboard: {
        getHistory: (limit?: number) => ipcRenderer.invoke('clipboard-get-history', limit),
        search: (query: string, limit?: number) => ipcRenderer.invoke('clipboard-search', query, limit),
        delete: (id: string) => ipcRenderer.invoke('clipboard-delete', id),
        clear: () => ipcRenderer.invoke('clipboard-clear'),
        paste: (id: string) => ipcRenderer.invoke('clipboard-paste', id),
      },
      
      // 窗口相关
      windowResize: (width: number, height: number) => 
        ipcRenderer.invoke('window-resize', width, height),
      windowHide: (windowType: string) =>
        ipcRenderer.invoke('window-hide', windowType),
      
      // 预览窗口相关
      preview: {
        show: () => ipcRenderer.invoke('preview-show'),
        hide: () => ipcRenderer.invoke('preview-hide'),
        update: (result: any, query: string) => ipcRenderer.invoke('preview-update', result, query).then(() => undefined),
        close: () => ipcRenderer.invoke('preview-close'),
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
