import { contextBridge, ipcRenderer } from 'electron';

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 调用主进程方法
  invoke: (channel: string, ...args: any[]) => {
    return ipcRenderer.invoke(channel, ...args);
  },

  // 监听主进程事件
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  // 移除事件监听器
  removeListener: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // 应用相关
  app: {
    getAll: () => ipcRenderer.invoke('app-get-all'),
    search: (query: string) => ipcRenderer.invoke('app-search', query),
    launch: (appId: string) => ipcRenderer.invoke('app-launch', appId),
    index: () => ipcRenderer.invoke('app-index'),
  },
  
      // 文件相关
      file: {
        getAll: () => ipcRenderer.invoke('file-get-all'),
        search: (query: string) => ipcRenderer.invoke('file-search', query),
        open: (filePath: string) => ipcRenderer.invoke('file-open', filePath),
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
      },
      
      // 计算器相关
      calculator: {
        calculate: (expression: string) => ipcRenderer.invoke('calculator-calculate', expression),
      },
      
      // 书签相关
      bookmark: {
        getAll: () => ipcRenderer.invoke('bookmark-get-all'),
        search: (query: string) => ipcRenderer.invoke('bookmark-search', query),
        reload: () => ipcRenderer.invoke('bookmark-reload'),
      },
      
      // 应用设置相关
      settings: {
        getAll: () => ipcRenderer.invoke('settings-get-all'),
        update: (updates: any) => ipcRenderer.invoke('settings-update', updates),
        reset: () => ipcRenderer.invoke('settings-reset'),
        getLogFile: () => ipcRenderer.invoke('settings-get-log-file'),
      },
      
      // 窗口相关
      windowResize: (width: number, height: number) => 
        ipcRenderer.invoke('window-resize', width, height),
      windowHide: (windowType: string) =>
        ipcRenderer.invoke('window-hide', windowType),
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
    };
    file: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      open: (filePath: string) => Promise<any>;
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
    bookmark: {
      getAll: () => Promise<any[]>;
      search: (query: string) => Promise<any[]>;
      reload: () => Promise<any>;
    };
    settings: {
      getAll: () => Promise<any>;
      update: (updates: any) => Promise<any>;
      reset: () => Promise<any>;
      getLogFile: () => Promise<string>;
    };
    windowResize: (width: number, height: number) => Promise<void>;
    windowHide: (windowType: string) => Promise<void>;
  }

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
