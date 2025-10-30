import { ipcMain } from 'electron';
import calculatorService from '../services/calculatorService';

/**
 * 注册计算器相关的 IPC 处理器
 */
export function registerCalculatorHandlers() {
  // 计算表达式
  ipcMain.handle('calculator-calculate', async (_event, expression: string) => {
    try {
      return calculatorService.calculate(expression);
    } catch (error: any) {
      console.error('计算失败:', error);
      throw error;
    }
  });

  console.log('✅ 计算器 IPC 处理器已注册');
}

