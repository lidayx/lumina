import { ipcMain } from 'electron';
import { translateService } from '../services/translateService';
import { randomService } from '../services/randomService';
import { encodeService } from '../services/encodeService';
import { stringService } from '../services/stringService';
import { variableNameService } from '../services/variableNameService';
import { timeService } from '../services/timeService';

/**
 * 注册功能补全相关的 IPC 处理器
 */
export function registerFeatureCompletionHandlers() {
  // 翻译补全
  ipcMain.handle('translate-complete', async (_event, partial: string) => {
    try {
      return translateService.completeTranslate(partial);
    } catch (error) {
      console.error('翻译补全失败:', error);
      throw error;
    }
  });

  // 翻译帮助
  ipcMain.handle('translate-help', async () => {
    try {
      return translateService.getTranslateHelp();
    } catch (error) {
      console.error('获取翻译帮助失败:', error);
      throw error;
    }
  });

  // 随机数生成补全
  ipcMain.handle('random-complete', async (_event, partial: string) => {
    try {
      return randomService.completeRandom(partial);
    } catch (error) {
      console.error('随机数补全失败:', error);
      throw error;
    }
  });

  // 随机数生成帮助
  ipcMain.handle('random-help', async () => {
    try {
      return randomService.getRandomHelp();
    } catch (error) {
      console.error('获取随机数帮助失败:', error);
      throw error;
    }
  });

  // 编码解码补全
  ipcMain.handle('encode-complete', async (_event, partial: string) => {
    try {
      return encodeService.completeEncode(partial);
    } catch (error) {
      console.error('编码解码补全失败:', error);
      throw error;
    }
  });

  // 编码解码帮助
  ipcMain.handle('encode-help', async () => {
    try {
      return encodeService.getEncodeHelp();
    } catch (error) {
      console.error('获取编码解码帮助失败:', error);
      throw error;
    }
  });

  // 字符串工具补全
  ipcMain.handle('string-complete', async (_event, partial: string) => {
    try {
      return stringService.completeString(partial);
    } catch (error) {
      console.error('字符串工具补全失败:', error);
      throw error;
    }
  });

  // 字符串工具帮助
  ipcMain.handle('string-help', async () => {
    try {
      return stringService.getStringHelp();
    } catch (error) {
      console.error('获取字符串工具帮助失败:', error);
      throw error;
    }
  });

  // 变量名生成补全
  ipcMain.handle('varname-complete', async (_event, partial: string) => {
    try {
      return variableNameService.completeVariableName(partial);
    } catch (error) {
      console.error('变量名生成补全失败:', error);
      throw error;
    }
  });

  // 变量名生成帮助
  ipcMain.handle('varname-help', async () => {
    try {
      return variableNameService.getVariableNameHelp();
    } catch (error) {
      console.error('获取变量名生成帮助失败:', error);
      throw error;
    }
  });

  // 时间工具补全
  ipcMain.handle('time-complete', async (_event, partial: string) => {
    try {
      return timeService.completeTime(partial);
    } catch (error) {
      console.error('时间工具补全失败:', error);
      throw error;
    }
  });

  // 时间工具帮助
  ipcMain.handle('time-help', async () => {
    try {
      return timeService.getTimeHelp();
    } catch (error) {
      console.error('获取时间工具帮助失败:', error);
      throw error;
    }
  });
}

