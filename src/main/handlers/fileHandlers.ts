import { ipcMain } from 'electron';
import { fileService } from '../services/fileService';

/**
 * 注册文件相关的 IPC 处理器
 */
export function registerFileHandlers() {
  // 获取所有文件
  ipcMain.handle('file-get-all', async () => {
    try {
      return await fileService.getAllFiles();
    } catch (error) {
      console.error('Error getting all files:', error);
      return [];
    }
  });

  // 搜索文件
  ipcMain.handle('file-search', async (_event, query: string, maxResults?: number) => {
    try {
      return await fileService.searchFiles(query, undefined, maxResults || 50);
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  });

  // 打开文件
  ipcMain.handle('file-open', async (_event, filePath: string) => {
    try {
      await fileService.openFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error opening file:', error);
      return { success: false, error: String(error) };
    }
  });

  // 索引文件
  ipcMain.handle('file-index', async (_event, paths?: string[]) => {
    try {
      await fileService.indexFiles(paths);
      return { success: true };
    } catch (error) {
      console.error('Error indexing files:', error);
      return { success: false, error: String(error) };
    }
  });

  // 清除文件索引
  ipcMain.handle('file-clear-index', async () => {
    try {
      await fileService.stopWatching();
      // 清空内存中的文件索引
      const { dbManager } = await import('../database/db');
      await dbManager.clearItemsByType('file');
      console.log('✅ [文件处理器] 已清除文件索引');
      return { success: true };
    } catch (error) {
      console.error('Error clearing file index:', error);
      return { success: false, error: String(error) };
    }
  });
}

