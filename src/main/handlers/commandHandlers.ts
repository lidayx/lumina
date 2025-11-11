import { ipcMain } from 'electron';
import commandService from '../services/commandService';

/**
 * 注册命令相关的 IPC 处理器
 * 提供系统命令的获取、搜索、执行和历史管理
 */
export function registerCommandHandlers() {
  // 获取所有可用的系统命令
  ipcMain.handle('command-get-all', async () => {
    try {
      return commandService.getAllCommands();
    } catch (error) {
      console.error('获取命令列表失败:', error);
      throw error;
    }
  });

  // 根据关键词搜索命令
  ipcMain.handle('command-search', async (_event, query: string) => {
    try {
      return commandService.searchCommands(query);
    } catch (error) {
      console.error('搜索命令失败:', error);
      throw error;
    }
  });

  // 执行预定义的命令
  ipcMain.handle('command-execute', async (_event, commandId: string) => {
    try {
      return await commandService.executeCommand(commandId);
    } catch (error) {
      console.error('执行命令失败:', error);
      throw error;
    }
  });

  // 执行原始命令字符串（自定义命令）
  ipcMain.handle('command-execute-raw', async (_event, command: string) => {
    try {
      return await commandService.executeRawCommand(command);
    } catch (error) {
      console.error('执行原始命令失败:', error);
      throw error;
    }
  });

  // 获取命令执行历史记录
  ipcMain.handle('command-get-history', async (_event, limit?: number) => {
    try {
      return commandService.getHistory(limit);
    } catch (error) {
      console.error('获取命令历史失败:', error);
      throw error;
    }
  });

  // 清除命令执行历史
  ipcMain.handle('command-clear-history', async () => {
    try {
      commandService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('清除命令历史失败:', error);
      throw error;
    }
  });

  // 命令补全
  ipcMain.handle('command-complete', async (_event, partial: string) => {
    try {
      return commandService.completeCommand(partial);
    } catch (error) {
      console.error('命令补全失败:', error);
      throw error;
    }
  });

  // 获取命令帮助
  ipcMain.handle('command-help', async (_event, commandId: string) => {
    try {
      return commandService.getCommandHelp(commandId);
    } catch (error) {
      console.error('获取命令帮助失败:', error);
      throw error;
    }
  });
}

