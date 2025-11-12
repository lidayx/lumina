/**
 * 计算器服务
 * 支持基本数学运算、科学计算和表达式解析
 */

import { settingsService } from './settingsService';

// ========== 类型定义 ==========

export interface CalculationResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

// ========== 常量定义 ==========

/**
 * 计算器服务类
 */
class CalculatorService {
  // ========== 常量 ==========
  // 预编译正则表达式（性能优化）
  private readonly PURE_NUMBER_REGEX = /^-?\d+\.?\d*$/;
  private readonly MATH_OPERATORS_REGEX = /[\+\-*/().,π]/;
  private readonly MATH_FUNCTIONS_REGEX = /\b(sin|cos|tan|log|sqrt)\b/i;

  // 函数映射表（缓存，避免重复创建）
  private readonly FUNCTION_MAP: Record<string, string> = {
    'π': 'Math.PI',
    'pi': 'Math.PI',
    'e': 'Math.E',
    'sin': 'Math.sin',
    'cos': 'Math.cos',
    'tan': 'Math.tan',
    'asin': 'Math.asin',
    'acos': 'Math.acos',
    'atan': 'Math.atan',
    'sinh': 'Math.sinh',
    'cosh': 'Math.cosh',
    'tanh': 'Math.tanh',
    'asinh': 'Math.asinh',
    'acosh': 'Math.acosh',
    'atanh': 'Math.atanh',
    'log': 'Math.log10',
    'ln': 'Math.log',
    'lg': 'Math.log10',
    'exp': 'Math.exp',
    'sqrt': 'Math.sqrt',
    'cbrt': 'Math.cbrt',
    'abs': 'Math.abs',
    'floor': 'Math.floor',
    'ceil': 'Math.ceil',
    'round': 'Math.round',
    'max': 'Math.max',
    'min': 'Math.min',
  };

  // ========== 公共 API ==========

  /**
   * 计算表达式
   * 如果无法识别为计算查询，返回 null，让系统继续尝试其他搜索方式
   */
  public calculate(expression: string): CalculationResult | null {
    try {
      console.log(`🧮 [计算器] 计算表达式: ${expression}`);

      // 检查计算器功能开关
      const settings = settingsService.getSettings();
      if (settings.featureCalculator === false) {
        // 功能关闭时返回 null，让系统继续尝试其他搜索方式
        console.log(`ℹ️ [计算器] 功能已关闭，返回 null: ${expression}`);
        return null;
      }

      // 去除空格
      expression = expression.trim();

      // 检查是否为空
      if (!expression) {
        const errorMsg = '表达式为空';
        return { input: expression, output: errorMsg, success: false, error: errorMsg };
      }

      // 检查是否为纯数字（使用预编译正则）
      if (this.PURE_NUMBER_REGEX.test(expression)) {
        return { input: expression, output: expression, success: true };
      }

      // 注意：编码解码查询已移至独立的 encodeHandlers，不再通过计算器服务处理
      // 注意：字符串工具查询已移至独立的 stringHandlers，不再通过计算器服务处理
      // 注意：时间工具查询已移至独立的 timeHandlers，不再通过计算器服务处理
      // 注意：随机数生成查询已移至独立的 randomHandlers，不再通过计算器服务处理
      // 注意：翻译查询已移至独立的 translateHandlers，不再通过计算器服务处理
      // 注意：变量名生成查询已移至独立的 variableNameHandlers，不再通过计算器服务处理

      // 如果所有功能都返回 null，且不是纯数字，也不尝试计算数学表达式
      // 这样可以避免在功能关闭时显示"表达式格式错误"，而是继续显示其他搜索结果
      // 检查是否包含数学运算符或函数（使用预编译正则）
      const hasMathOperators = this.MATH_OPERATORS_REGEX.test(expression) || 
                               this.MATH_FUNCTIONS_REGEX.test(expression);
      
      if (!hasMathOperators) {
        // 没有数学运算符，返回 null，让系统继续尝试其他搜索方式
        console.log(`ℹ️ [计算器] 未识别为计算查询，返回 null: ${expression}`);
        return null as any; // 返回 null，让前端继续显示其他搜索结果
      }

      // 解析和计算数学表达式
      const result = this.evaluateExpression(expression);
      
      console.log(`✅ [计算器] 计算结果: ${expression} = ${result}`);
      
      return {
        input: expression,
        output: this.formatNumber(result),
        success: true,
      };
    } catch (error: any) {
      console.error(`❌ [计算器] 计算失败: ${error.message}`);
      // 如果计算失败，且不是明显的数学表达式，返回 null 而不是错误
      // 这样可以避免在功能关闭时显示错误，而是继续显示其他搜索结果
      const hasMathOperators = this.MATH_OPERATORS_REGEX.test(expression) || 
                               this.MATH_FUNCTIONS_REGEX.test(expression);
      if (!hasMathOperators) {
        console.log(`ℹ️ [计算器] 计算失败但无数学运算符，返回 null: ${expression}`);
        return null as any; // 返回 null，让前端继续显示其他搜索结果
      }
      const errorMsg = error.message || '计算错误';
      return {
        input: expression,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 表达式解析和计算 ==========

  /**
   * 评估数学表达式
   */
  private evaluateExpression(expression: string): number {
    // 替换科学函数
    expression = this.replaceScientificFunctions(expression);
    
    // 替换操作符
    expression = expression.replace(/×/g, '*');
    expression = expression.replace(/÷/g, '/');
    expression = expression.replace(/\^/g, '**');
    
    // 安全评估
    try {
      // 使用 Function 构造函数进行安全评估（不使用 eval）
      const result = new Function('Math', 'return ' + expression)(Math);
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('计算结果无效');
      }
      
      return result;
    } catch (error) {
      throw new Error('表达式格式错误');
    }
  }

  /**
   * 替换科学函数
   * 优化：使用缓存的函数映射，预编译正则表达式
   */
  private readonly FUNCTION_REGEX_CACHE: Map<string, RegExp> = new Map();

  private replaceScientificFunctions(expression: string): string {
    let result = expression.toLowerCase();
    
    // 替换函数名（使用缓存的函数映射）
    for (const [func, replacement] of Object.entries(this.FUNCTION_MAP)) {
      // 使用缓存的正则表达式
      let regex = this.FUNCTION_REGEX_CACHE.get(func);
      if (!regex) {
        regex = new RegExp(`\\b${func}\\b`, 'gi');
        this.FUNCTION_REGEX_CACHE.set(func, regex);
      }
      result = result.replace(regex, replacement);
    }

    // 处理函数调用（添加括号）
    result = result.replace(/(\d+)\s*([A-Za-z]+)/g, (match, num, func) => {
      if (this.FUNCTION_MAP[func.toLowerCase()]) {
        return `${this.FUNCTION_MAP[func.toLowerCase()]}(${num})`;
      }
      return match;
    });

    return result;
  }

  // ========== 辅助方法 ==========

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    // 如果是整数，不显示小数点
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // 浮点数保留适当的小数位数
    const str = num.toFixed(10);
    // 移除末尾的零
    return str.replace(/\.?0+$/, '');
  }
}

export const calculatorService = new CalculatorService();
export default calculatorService;

