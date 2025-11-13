/**
 * 调用功能模块处理查询
 */
export const callFeatureModules = async (
  actualQuery: string,
  isFileSearch: boolean,
  urlCheck: { isURL: boolean; url?: string }
) => {
  let encodeResult = null;
  let stringResult = null;
  let timeResult = null;
  let randomResult = null;
  let translateResult = null;
  let variableNameResult = null;
  let todoResult = null;
  let ipResult = null;
  
  if (!isFileSearch && !urlCheck.isURL) {
    // 先检查是否是数学函数表达式
    const hasMathFunctions = /\b(sin|cos|tan|log|sqrt)\s*\(/i.test(actualQuery.trim());
    if (hasMathFunctions) {
      console.log('🔍 [模块检测] 检测到数学函数表达式，跳过其他模块:', actualQuery);
    } else {
      // 按优先级顺序尝试各个模块
      encodeResult = await (window.electron as any).encode.handleQuery(actualQuery).catch(() => null);
      if (encodeResult) {
        console.log('🔍 [模块检测] encodeResult 匹配:', actualQuery);
      }
      if (!encodeResult) {
        stringResult = await (window.electron as any).string.handleQuery(actualQuery).catch(() => null);
        if (stringResult) {
          console.log('🔍 [模块检测] stringResult 匹配:', actualQuery);
        }
      }
      if (!encodeResult && !stringResult) {
        timeResult = await (window.electron as any).time.handleQuery(actualQuery).catch(() => null);
        if (timeResult) {
          console.log('🔍 [模块检测] timeResult 匹配:', actualQuery);
        }
      }
      if (!encodeResult && !stringResult && !timeResult) {
        randomResult = await (window.electron as any).random.handleQuery(actualQuery).catch(() => null);
        if (randomResult) {
          console.log('🔍 [模块检测] randomResult 匹配:', actualQuery);
        }
      }
      if (!encodeResult && !stringResult && !timeResult && !randomResult) {
        translateResult = await (window.electron as any).translate.handleQuery(actualQuery).catch(() => null);
        if (translateResult) {
          console.log('🔍 [模块检测] translateResult 匹配:', actualQuery);
        }
      }
      if (!encodeResult && !stringResult && !timeResult && !randomResult && !translateResult) {
        todoResult = await (window.electron as any).todo.handleQuery(actualQuery, false).catch(() => null);
        if (todoResult) {
          console.log('🔍 [模块检测] todoResult 匹配:', actualQuery);
        }
      }
      if (!encodeResult && !stringResult && !timeResult && !randomResult && !translateResult && !todoResult) {
        ipResult = await (window.electron as any).ip.handleQuery(actualQuery).catch(() => null);
        if (ipResult) {
          console.log('🔍 [模块检测] ipResult 匹配:', actualQuery);
        }
      }
    }
    
    if (!encodeResult && !stringResult && !timeResult && !randomResult && !translateResult && !todoResult && !ipResult) {
      // 先检查是否是数学表达式
      const isMathExpression = /^\d+\s*[\+\-*/]\s*\d+$/.test(actualQuery.trim()) ||
                               /^[\d\s\+\-*/().,π]+$/.test(actualQuery.trim()) && /[\+\-*/().,π]/.test(actualQuery.trim()) ||
                               /\b(sin|cos|tan|log|sqrt)\s*\(/i.test(actualQuery.trim());
      if (!isMathExpression) {
        variableNameResult = await (window.electron as any).varname.handleQuery(actualQuery).catch(() => null);
        if (variableNameResult) {
          console.log('🔍 [模块检测] variableNameResult 匹配:', actualQuery);
        }
      } else {
        console.log('🔍 [模块检测] 跳过变量名生成（数学表达式）:', actualQuery);
        variableNameResult = null;
      }
    }
  }
  
  return {
    encodeResult,
    stringResult,
    timeResult,
    randomResult,
    translateResult,
    variableNameResult,
    todoResult,
    ipResult,
  };
};


