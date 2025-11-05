import { ipcMain } from 'electron';
import { timeService } from '../services/timeService';

/**
 * 注册时间相关的 IPC 处理器
 * 提供时间查询和格式转换功能
 */
export function registerTimeHandlers() {
  // 获取所有时间格式
  ipcMain.handle('time-get-all-formats', async (_event, dateISOString?: string) => {
    try {
      const date = dateISOString ? new Date(dateISOString) : undefined;
      return timeService.getAllTimeFormats(date);
    } catch (error) {
      console.error('获取时间格式失败:', error);
      throw error;
    }
  });

  // 处理时间查询（与计算器集成）
  ipcMain.handle('time-handle-query', async (_event, query: string) => {
    try {
      return timeService.handleTimeQuery(query);
    } catch (error) {
      console.error('时间查询失败:', error);
      throw error;
    }
  });
}

