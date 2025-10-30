import { ipcMain } from 'electron';
import calculatorService from '../services/calculatorService';

/**
 * 注册计算器相关的 IPC 处理器
 * 提供数学表达式计算和单位转换功能
 */
export function registerCalculatorHandlers() {
  // 计算数学表达式或执行单位转换
  ipcMain.handle('calculator-calculate', async (_event, expression: string) => {
    try {
      return calculatorService.calculate(expression);
    } catch (error) {
      console.error('计算失败:', error);
      throw error;
    }
  });
}

