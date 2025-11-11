/**
 * 计算器服务
 * 支持基本数学运算、科学计算、单位换算和表达式解析
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

// 单位换算表
const UNIT_CONVERSIONS: Record<string, Record<string, number | string>> = {
  // 长度
  'length': {
    'm': 1, 'meter': 1, 'meters': 1, '米': 1,
    'cm': 0.01, 'centimeter': 0.01, 'centimeters': 0.01, '厘米': 0.01,
    'km': 1000, 'kilometer': 1000, 'kilometers': 1000, '千米': 1000,
    'mm': 0.001, 'millimeter': 0.001, 'millimeters': 0.001, '毫米': 0.001,
    'ft': 0.3048, 'foot': 0.3048, 'feet': 0.3048, '英尺': 0.3048,
    'in': 0.0254, 'inch': 0.0254, 'inches': 0.0254, '英寸': 0.0254,
    'mi': 1609.34, 'mile': 1609.34, 'miles': 1609.34, '英里': 1609.34,
    'yd': 0.9144, 'yard': 0.9144, 'yards': 0.9144, '码': 0.9144,
    'nm': 1852, 'nautical-mile': 1852, '海里': 1852,
  },
  // 重量
  'weight': {
    'kg': 1, 'kilogram': 1, 'kilograms': 1, '千克': 1, '公斤': 1,
    'g': 0.001, 'gram': 0.001, 'grams': 0.001, '克': 0.001,
    'mg': 0.000001, 'milligram': 0.000001, 'milligrams': 0.000001, '毫克': 0.000001,
    't': 1000, 'ton': 1000, 'tons': 1000, '吨': 1000,
    'lb': 0.453592, 'pound': 0.453592, 'pounds': 0.453592, '磅': 0.453592,
    'oz': 0.0283495, 'ounce': 0.0283495, 'ounces': 0.0283495, '盎司': 0.0283495,
  },
  // 温度
  'temperature': {
    'c': 'celsius' as string, 'f': 'fahrenheit' as string, 'k': 'kelvin' as string,
    'celsius': 'celsius' as string, 'fahrenheit': 'fahrenheit' as string, 'kelvin': 'kelvin' as string,
    '°c': 'celsius' as string, '°f': 'fahrenheit' as string, '°k': 'kelvin' as string,
  },
  // 时间
  'time': {
    's': 1, 'sec': 1, 'second': 1, 'seconds': 1, '秒': 1,
    'm': 60, 'min': 60, 'minute': 60, 'minutes': 60, '分钟': 60,
    'h': 3600, 'hour': 3600, 'hours': 3600, '小时': 3600,
    'd': 86400, 'day': 86400, 'days': 86400, '天': 86400,
    'w': 604800, 'week': 604800, 'weeks': 604800, '周': 604800,
  },
};

/**
 * 计算器服务类
 */
class CalculatorService {
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

      // 检查是否为纯数字
      if (/^-?\d+\.?\d*$/.test(expression)) {
        return { input: expression, output: expression, success: true };
      }

      // 注意：编码解码查询已移至独立的 encodeHandlers，不再通过计算器服务处理
      // 注意：字符串工具查询已移至独立的 stringHandlers，不再通过计算器服务处理
      // 注意：时间工具查询已移至独立的 timeHandlers，不再通过计算器服务处理
      // 注意：随机数生成查询已移至独立的 randomHandlers，不再通过计算器服务处理
      // 注意：翻译查询已移至独立的 translateHandlers，不再通过计算器服务处理
      // 注意：变量名生成查询已移至独立的 variableNameHandlers，不再通过计算器服务处理

      // 尝试识别单位换算
      const unitConvertResult = this.tryUnitConversion(expression);
      if (unitConvertResult.success) {
        return unitConvertResult;
      }

      // 如果所有功能都返回 null，且不是纯数字，也不尝试计算数学表达式
      // 这样可以避免在功能关闭时显示"表达式格式错误"，而是继续显示其他搜索结果
      // 检查是否包含数学运算符或函数，如果没有，则不尝试计算
      const hasMathOperators = /[\+\-*/().,π]/.test(expression) || /\b(sin|cos|tan|log|sqrt)\b/i.test(expression);
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
      const hasMathOperators = /[\+\-*/().,π]/.test(expression) || /\b(sin|cos|tan|log|sqrt)\b/i.test(expression);
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
   */
  private replaceScientificFunctions(expression: string): string {
    let result = expression.toLowerCase();
    
    // 替换数学函数
    const functionMap: Record<string, string> = {
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

    // 替换函数名
    for (const [func, replacement] of Object.entries(functionMap)) {
      const regex = new RegExp(`\\b${func}\\b`, 'gi');
      result = result.replace(regex, replacement);
    }

    // 处理函数调用（添加括号）
    result = result.replace(/(\d+)\s*([A-Za-z]+)/g, (match, num, func) => {
      if (functionMap[func.toLowerCase()]) {
        return `${functionMap[func.toLowerCase()]}(${num})`;
      }
      return match;
    });

    return result;
  }

  // ========== 单位换算 ==========

  /**
   * 尝试单位换算
   */
  private tryUnitConversion(expression: string): CalculationResult {
    // 匹配模式：数字 + 单位1 + to/in/=> + 单位2
    const conversionPattern = /(\d+\.?\d*)\s*([a-z°]+)\s*(to|in|=>|到|换成)\s*([a-z°]+)/i;
    const match = expression.match(conversionPattern);
    
    if (!match) {
      const errorMsg = '无法识别的单位换算格式';
      return { input: expression, output: errorMsg, success: false, error: errorMsg };
    }

    const value = parseFloat(match[1]);
    const fromUnit = match[2].toLowerCase();
    const toUnit = match[4].toLowerCase();

    console.log(`🔄 [计算器] 尝试单位换算: ${value} ${fromUnit} → ${toUnit}`);

    // 尝试温度换算
    const tempResult = this.convertTemperature(value, fromUnit, toUnit);
    if (tempResult !== null) {
      return {
        input: expression,
        output: `${tempResult.toFixed(2)} ${toUnit}`,
        success: true,
      };
    }

    // 尝试其他单位换算
    for (const [category, units] of Object.entries(UNIT_CONVERSIONS)) {
      if (category === 'temperature') continue;
      
      if (fromUnit in units && toUnit in units) {
        const fromValue = units[fromUnit];
        const toValue = units[toUnit];
        
        if (typeof fromValue === 'number' && typeof toValue === 'number') {
          const result = value * fromValue / toValue;
          return {
            input: expression,
            output: `${this.formatNumber(result)} ${toUnit}`,
            success: true,
          };
        }
      }
    }

    const errorMsg = '不支持的单位换算';
    return { input: expression, output: errorMsg, success: false, error: errorMsg };
  }

  /**
   * 温度换算
   */
  private convertTemperature(value: number, fromUnit: string, toUnit: string): number | null {
    const tempUnits = UNIT_CONVERSIONS.temperature;
    const fromType = tempUnits[fromUnit] as string;
    const toType = tempUnits[toUnit] as string;

    if (!fromType || !toType) {
      return null;
    }

    // 先转换到摄氏度
    let celsius: number;
    switch (fromType) {
      case 'celsius':
        celsius = value;
        break;
      case 'fahrenheit':
        celsius = (value - 32) * 5 / 9;
        break;
      case 'kelvin':
        celsius = value - 273.15;
        break;
      default:
        return null;
    }

    // 再转换到目标单位
    switch (toType) {
      case 'celsius':
        return celsius;
      case 'fahrenheit':
        return celsius * 9 / 5 + 32;
      case 'kelvin':
        return celsius + 273.15;
      default:
        return null;
    }
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

