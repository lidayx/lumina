import calculatorService from '../services/calculatorService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册计算器相关的 IPC 处理器
 * 提供数学表达式计算和单位转换功能
 */
export function registerCalculatorHandlers() {
  registerHandler(
    'calculator-calculate',
    '计算器计算',
    async (_event, expression: string) => {
      const validatedExpression = validateString(expression, 'expression');
      console.log(`🧮 [计算器Handler] 处理表达式: "${validatedExpression}"`);
      // 注意：翻译查询已移至独立的 translateHandlers，不再通过计算器服务处理
      // 注意：变量名生成查询已移至独立的 variableNameHandlers，不再通过计算器服务处理
      
      // 计算数学表达式或执行单位转换
      const calcResult = calculatorService.calculate(validatedExpression);
      // 如果返回 null，表示无法识别为计算查询，返回 null 让前端继续显示其他搜索结果
      return calcResult;
    },
    {
      logPrefix: '🧮 [计算器Handler]',
    }
  );
}
