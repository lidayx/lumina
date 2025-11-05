import { ipcMain } from 'electron';
import calculatorService from '../services/calculatorService';
import { translateService } from '../services/translateService';
import { variableNameService } from '../services/variableNameService';

/**
 * 注册计算器相关的 IPC 处理器
 * 提供数学表达式计算和单位转换功能
 */
export function registerCalculatorHandlers() {
  // 计算数学表达式或执行单位转换
  ipcMain.handle('calculator-calculate', async (_event, expression: string) => {
    try {
      console.log(`🧮 [计算器Handler] 处理表达式: "${expression}"`);
      // 先尝试识别翻译查询（异步）
      const translateResult = await translateService.handleTranslateQuery(expression);
      console.log(`🧮 [计算器Handler] 翻译结果:`, translateResult);
      if (translateResult) {
        // 如果识别为翻译查询（无论成功或失败），都返回翻译结果
        console.log(`🧮 [计算器Handler] 返回翻译结果`);
        return {
          input: translateResult.input,
          output: translateResult.output,
          success: translateResult.success,
          error: translateResult.error,
        };
      }

      // 再尝试识别变量名生成查询（异步）
      const variableNameResult = await variableNameService.handleVariableNameQuery(expression);
      console.log(`🧮 [计算器Handler] 变量名生成结果:`, variableNameResult);
      if (variableNameResult) {
        // 如果识别为变量名生成查询（无论成功或失败），都返回结果
        console.log(`🧮 [计算器Handler] 返回变量名生成结果`);
        return {
          input: variableNameResult.input,
          output: variableNameResult.output,
          success: variableNameResult.success,
          error: variableNameResult.error,
        };
      }

      // 最后尝试其他计算功能（同步）
      return calculatorService.calculate(expression);
    } catch (error) {
      console.error('计算失败:', error);
      throw error;
    }
  });
}

