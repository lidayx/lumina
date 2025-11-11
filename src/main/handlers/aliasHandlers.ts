import { ipcMain } from 'electron';
import { aliasService } from '../services/aliasService';

/**
 * 注册别名相关的 IPC 处理器
 */
export function registerAliasHandlers() {
  // 获取所有别名
  ipcMain.handle('alias-get-all', async () => {
    try {
      return aliasService.getAllAliases();
    } catch (error) {
      console.error('获取别名列表失败:', error);
      throw error;
    }
  });

  // 添加别名
  ipcMain.handle('alias-add', async (_event, name: string, command: string, type: string, description?: string) => {
    try {
      const alias = await aliasService.addAlias(name, command, type as any, description);
      return { success: true, alias };
    } catch (error: any) {
      console.error('添加别名失败:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除别名
  ipcMain.handle('alias-remove', async (_event, name: string) => {
    try {
      const success = await aliasService.removeAlias(name);
      return { success };
    } catch (error) {
      console.error('删除别名失败:', error);
      throw error;
    }
  });

  // 更新别名
  ipcMain.handle('alias-update', async (_event, name: string, updates: any) => {
    try {
      const success = await aliasService.updateAlias(name, updates);
      return { success };
    } catch (error) {
      console.error('更新别名失败:', error);
      throw error;
    }
  });

  // 获取别名
  ipcMain.handle('alias-get', async (_event, name: string) => {
    try {
      const alias = aliasService.getAlias(name);
      return { alias };
    } catch (error) {
      console.error('获取别名失败:', error);
      throw error;
    }
  });

  // 解析别名
  ipcMain.handle('alias-resolve', async (_event, input: string) => {
    try {
      const result = aliasService.resolveAlias(input);
      return result;
    } catch (error) {
      console.error('解析别名失败:', error);
      throw error;
    }
  });
}

