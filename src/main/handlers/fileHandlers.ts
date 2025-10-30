import { ipcMain } from 'electron';
import { fileService } from '../services/fileService';

/**
 * 注册文件相关的 IPC 处理器
 * 提供文件的获取、搜索、打开和索引管理
 */
export function registerFileHandlers() {
  // 获取所有已索引的文件
  ipcMain.handle('file-get-all', async () => {
    try {
      return await fileService.getAllFiles();
    } catch (error) {
      console.error('Error getting all files:', error);
      return [];
    }
  });

  // 根据关键词搜索文件（支持文件名和路径匹配）
  ipcMain.handle('file-search', async (_event, query: string, maxResults?: number) => {
    try {
      return await fileService.searchFiles(query, undefined, maxResults || 50);
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  });

  // 使用系统默认程序打开文件
  ipcMain.handle('file-open', async (_event, filePath: string) => {
    try {
      await fileService.openFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error opening file:', error);
      return { success: false, error: String(error) };
    }
  });

  // 扫描并索引指定目录的文件
  ipcMain.handle('file-index', async (_event, paths?: string[]) => {
    try {
      await fileService.indexFiles(paths);
      return { success: true };
    } catch (error) {
      console.error('Error indexing files:', error);
      return { success: false, error: String(error) };
    }
  });

  // 清除所有文件索引数据
  ipcMain.handle('file-clear-index', async () => {
    try {
      await fileService.stopWatching();
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

