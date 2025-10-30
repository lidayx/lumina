import { ipcMain } from 'electron';
import commandService from '../services/commandService';

/**
 * 注册命令相关的 IPC 处理器
 */
export function registerCommandHandlers() {
  // 获取所有命令
  ipcMain.handle('command-get-all', async () => {
    try {
      return commandService.getAllCommands();
    } catch (error: any) {
      console.error('获取命令列表失败:', error);
      throw error;
    }
  });

  // 搜索命令
  ipcMain.handle('command-search', async (_event, query: string) => {
    try {
      return commandService.searchCommands(query);
    } catch (error: any) {
      console.error('搜索命令失败:', error);
      throw error;
    }
  });

  // 执行命令
  ipcMain.handle('command-execute', async (_event, commandId: string) => {
    try {
      return await commandService.executeCommand(commandId);
    } catch (error: any) {
      console.error('执行命令失败:', error);
      throw error;
    }
  });

  // 执行原始命令
  ipcMain.handle('command-execute-raw', async (_event, command: string) => {
    try {
      return await commandService.executeRawCommand(command);
    } catch (error: any) {
      console.error('执行原始命令失败:', error);
      throw error;
    }
  });

  // 获取命令历史
  ipcMain.handle('command-get-history', async (_event, limit?: number) => {
    try {
      return commandService.getHistory(limit);
    } catch (error: any) {
      console.error('获取命令历史失败:', error);
      throw error;
    }
  });

  // 清除命令历史
  ipcMain.handle('command-clear-history', async () => {
    try {
      commandService.clearHistory();
      return { success: true };
    } catch (error: any) {
      console.error('清除命令历史失败:', error);
      throw error;
    }
  });

  console.log('✅ 命令 IPC 处理器已注册');
}

