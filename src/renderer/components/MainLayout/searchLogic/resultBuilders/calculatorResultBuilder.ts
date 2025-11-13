import { SearchResult } from '../../../ResultList';

/**
 * 解析日期时间
 */
const parseDateFromQuery = (query: string, calcOutput: string): Date | null => {
  const queryTrimmed = query.trim();
  let targetDate: Date | null = null;

  // 1. 检测时间戳转日期: timestamp 1705312245 或 ts 1705312245
  const timestampPattern = /^(?:timestamp|ts)\s+(\d{10,13})$/i;
  const timestampMatch = queryTrimmed.match(timestampPattern);

  if (timestampMatch) {
    const timestampStr = timestampMatch[1];
    const timestamp = parseInt(timestampStr, 10);
    const isSeconds = timestampStr.length === 10;
    targetDate = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
    return targetDate;
  }

  // 2. 检测时间戳转日期: 1705312245 to date 或 1705312245 转日期
  const toDatePattern = /^(\d{10,13})\s+(?:to|转)\s+date$/i;
  const toDateMatch = queryTrimmed.match(toDatePattern);
  if (toDateMatch) {
    const timestampStr = toDateMatch[1];
    const timestamp = parseInt(timestampStr, 10);
    const isSeconds = timestampStr.length === 10;
    targetDate = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
    return targetDate;
  }

  // 3. 检测日期转时间戳: 日期 + to timestamp 或 日期 + 转时间戳
  const dateToTimestampPattern = /^(.+?)\s+(?:to|转)\s+timestamp$/i;
  const dateToTimestampMatch = queryTrimmed.match(dateToTimestampPattern);
  if (dateToTimestampMatch) {
    const dateStr = dateToTimestampMatch[1].trim();
    // 尝试多种日期格式解析
    const dateFormats = [
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // YYYY-MM-DD HH:mm
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
      // YYYY-MM-DD
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
      // ISO 格式
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
    ];

    let parsed = false;
    for (const format of dateFormats) {
      const match = dateStr.match(format);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 月份从 0 开始
        const day = parseInt(match[3], 10);
        const hours = match[4] ? parseInt(match[4], 10) : 0;
        const minutes = match[5] ? parseInt(match[5], 10) : 0;
        const seconds = match[6] ? parseInt(match[6], 10) : 0;

        targetDate = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(targetDate.getTime())) {
          parsed = true;
          break;
        }
      }
    }

    // 如果正则解析失败，尝试使用 Date 构造函数
    if (!parsed) {
      const tryDate = new Date(dateStr);
      if (!isNaN(tryDate.getTime())) {
        targetDate = tryDate;
      }
    }
    if (targetDate && !isNaN(targetDate.getTime())) {
      return targetDate;
    }
  }

  // 4. 如果还没有找到日期，尝试从输出中解析第一个日期格式
  if (calcOutput) {
    const dateMatch = calcOutput.match(/^(\d{4}[-\/]\d{2}[-\/]\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/);
    if (dateMatch) {
      targetDate = new Date(dateMatch[1].replace(/\//g, '-'));
      if (!isNaN(targetDate.getTime())) {
        return targetDate;
      }
    }
  }

  // 5. 如果还没有找到，尝试直接解析查询字符串（纯日期时间格式）
  const pureDatePatterns = [
    // YYYY-MM-DD HH:mm:ss
    /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    // YYYY-MM-DD HH:mm
    /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
    // YYYY-MM-DD
    /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
    // ISO 格式
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  ];

  for (const pattern of pureDatePatterns) {
    const match = queryTrimmed.match(pattern);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hours = match[4] ? parseInt(match[4], 10) : 0;
      const minutes = match[5] ? parseInt(match[5], 10) : 0;
      const seconds = match[6] ? parseInt(match[6], 10) : 0;

      targetDate = new Date(year, month, day, hours, minutes, seconds);
      if (!isNaN(targetDate.getTime())) {
        return targetDate;
      }
    }
  }

  // 如果正则解析失败，尝试使用 Date 构造函数
  if (!/^\d+$/.test(queryTrimmed)) {
    const tryDate = new Date(queryTrimmed);
    if (!isNaN(tryDate.getTime())) {
      return tryDate;
    }
  }

  // 6. 如果仍然没有找到，使用当前时间（用于 time/date 查询）
  return new Date();
};

/**
 * 判断计算器结果类型
 */
const detectCalculatorResultType = (calcResult: any, query: string) => {
  const output = calcResult.output;
  const queryTrimmed = query.trim();

  // 判断是否为时间差计算结果（优先判断，避免误判）
  const isTimeDifference = output.includes('总计:') &&
    (/\d+\s*(天|小时|分钟|秒)/.test(output) ||
      output.includes('毫秒'));

  // 判断是否为时间加减计算结果（包含日期时间格式，且是单个日期时间）
  const isTimeCalculation = !isTimeDifference &&
    /^\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(output) &&
    /[\+\-]/.test(queryTrimmed) &&
    (/\b(days?|hours?|minutes?|minutes?|seconds?|天|小时|分钟|秒)\b/i.test(queryTrimmed) ||
      /\d+\s*(d|h|m|s|天|小时|分钟|秒)/i.test(queryTrimmed));

  // 判断是否为文本统计结果（多行输出，包含"字符数"、"单词数"等关键词）
  const isTextStats = output.includes('字符数') ||
    output.includes('单词数') ||
    output.includes('行数') ||
    output.includes('段落数') ||
    /^字符数:/m.test(output);

  // 判断是否为变量名生成结果（优先判断）
  const isVariableNameResult = /原始描述:|camelCase:|snake_case:|PascalCase:|CONSTANT:|kebab-case:/i.test(output);

  // 判断是否为密码生成结果（多个密码）
  const isPasswordGeneration = (calcResult as any).outputs && (calcResult as any).isMultiple;

  // 判断是否为时间查询结果（通过输出内容判断）
  const isTimeResult = !isTimeDifference && !isTimeCalculation && !isTextStats && !isVariableNameResult && !isPasswordGeneration && (
    output.includes('\n') ||
    /^\d{4}[-\/]\d{2}/.test(output) ||
    /时间戳|timestamp|ISO|UTC|CST|EST|PST|JST|格式/i.test(output)
  );

  return {
    isTimeDifference,
    isTimeCalculation,
    isTextStats,
    isVariableNameResult,
    isPasswordGeneration,
    isTimeResult,
  };
};

/**
 * 构建时间差计算结果
 */
const buildTimeDifferenceResult = (
  calcResult: any,
  combinedResults: SearchResult[]
): void => {
  combinedResults.push({
    id: 'time-difference-result',
    type: 'command' as const,
    title: calcResult.output.split('\n')[0] || '时间差',
    description: calcResult.output.includes('\n') ? calcResult.output.split('\n').slice(1).join(' ') : '点击复制',
    action: 'time:copy',
    score: 1900,
    priorityScore: 1900,
    calcData: calcResult,
  });
};

/**
 * 构建时间加减计算结果
 */
const buildTimeCalculationResult = async (
  calcResult: any,
  combinedResults: SearchResult[]
): Promise<void> => {
  try {
    // 从输出中解析计算结果日期
    const resultDateStr = calcResult.output.trim();

    // 使用正则精确解析日期时间格式，避免时区问题
    let resultDate: Date | null = null;
    const dateTimePattern = /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;
    const match = resultDateStr.match(dateTimePattern);

    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hours = parseInt(match[4], 10);
      const minutes = parseInt(match[5], 10);
      const seconds = parseInt(match[6], 10);

      resultDate = new Date(year, month, day, hours, minutes, seconds);
    } else {
      // 如果正则解析失败，尝试使用 Date 构造函数
      resultDate = new Date(resultDateStr);
    }

    if (resultDate && !isNaN(resultDate.getTime())) {
      // 获取计算结果的所有格式
      const timeFormats = await window.electron.time.getAllFormats(resultDate.toISOString());

      // 为每个时间格式创建一个选项
      timeFormats.forEach((format: { label: string; value: string }, index: number) => {
        combinedResults.push({
          id: `time-calculation-${index}`,
          type: 'command' as const,
          title: format.value,
          description: format.label,
          action: 'time:copy',
          score: 1900 - index,
          priorityScore: 1900 - index,
          calcData: {
            input: calcResult.input,
            output: format.value,
            success: true,
          },
        });
      });
    } else {
      // 如果解析失败，直接显示结果
      combinedResults.push({
        id: 'time-calculation-result',
        type: 'command' as const,
        title: calcResult.output,
        description: '计算结果',
        action: 'time:copy',
        score: 1900,
        priorityScore: 1900,
        calcData: calcResult,
      });
    }
  } catch (error) {
    console.error('Failed to process time calculation result:', error);
    // 如果处理失败，直接显示结果
    combinedResults.push({
      id: 'time-calculation-result',
      type: 'command' as const,
      title: calcResult.output,
      description: '计算结果',
      action: 'time:copy',
      score: 1900,
      priorityScore: 1900,
      calcData: calcResult,
    });
  }
};

/**
 * 构建时间查询结果
 */
const buildTimeQueryResult = async (
  calcResult: any,
  query: string,
  combinedResults: SearchResult[]
): Promise<void> => {
  try {
    // 尝试从输入中提取时间信息
    const targetDate = parseDateFromQuery(query, calcResult.output);

    // 获取该日期所有格式（传递日期参数）
    const timeFormats = await window.electron.time.getAllFormats(targetDate.toISOString());

    // 为每个时间格式创建一个选项
    timeFormats.forEach((format: { label: string; value: string }, index: number) => {
      combinedResults.push({
        id: `time-result-${index}`,
        type: 'command' as const,
        title: format.value,
        description: format.label,
        action: 'time:copy',
        score: 1900 - index, // 第一个选项优先级最高
        priorityScore: 1900 - index,
        calcData: {
          input: calcResult.input,
          output: format.value,
          success: true,
        },
      });
    });
  } catch (error) {
    console.error('Failed to get time formats:', error);
    // 如果获取失败，回退到单个结果
    combinedResults.push({
      id: 'time-result',
      type: 'command' as const,
      title: calcResult.output.split('\n')[0] || '时间查询',
      description: '点击复制',
      action: 'time:copy',
      score: 1900,
      priorityScore: 1900,
      calcData: calcResult,
    });
  }
};

/**
 * 构建变量名生成结果
 */
const buildVariableNameResult = (
  calcResult: any,
  combinedResults: SearchResult[]
): void => {
  // 将多行结果拆分成多个选项
  const lines = calcResult.output.split('\n');
  lines.forEach((line: string, index: number) => {
    if (line.trim()) {
      const colonIndex = line.indexOf(':');
      // 只处理包含变量名格式的行
      if (colonIndex > 0 && /^(camelCase|snake_case|PascalCase|CONSTANT|kebab-case):/i.test(line.trim())) {
        const variableName = line.substring(colonIndex + 1).trim();
        const styleName = line.substring(0, colonIndex).trim();

        // 标题只显示变量名
        combinedResults.push({
          id: `varname-result-${index}`,
          type: 'command' as const,
          title: variableName,
          description: styleName,
          action: 'calc:copy',
          score: 1900 - index,
          priorityScore: 1900 - index,
          calcData: {
            input: calcResult.input,
            output: variableName, // 只复制变量名，不包含其他内容
            success: true,
          },
        });
      }
    }
  });
};

/**
 * 构建计算器结果
 */
export const buildCalculatorResults = async (
  calcResult: any,
  query: string,
  combinedResults: SearchResult[]
): Promise<void> => {
  if (!calcResult || !calcResult.success) {
    return;
  }

  const {
    isTimeDifference,
    isTimeCalculation,
    isTextStats,
    isVariableNameResult,
    isPasswordGeneration,
    isTimeResult,
  } = detectCalculatorResultType(calcResult, query);

  // 时间差计算结果：直接显示，不拆分
  if (isTimeDifference) {
    buildTimeDifferenceResult(calcResult, combinedResults);
    return;
  }

  // 时间加减计算结果：显示计算结果的所有格式
  if (isTimeCalculation) {
    await buildTimeCalculationResult(calcResult, combinedResults);
    return;
  }

  // 时间查询结果：需要获取所有时间格式并拆分成多个选项
  if (isTimeResult) {
    await buildTimeQueryResult(calcResult, query, combinedResults);
    return;
  }

  // 变量名生成结果：显示多行结果
  if (isVariableNameResult) {
    buildVariableNameResult(calcResult, combinedResults);
    return;
  }

  // 密码生成结果：为每个密码创建一个选项
  if (isPasswordGeneration && (calcResult as any).outputs) {
    const passwords = (calcResult as any).outputs as string[];
    passwords.forEach((password: string, index: number) => {
      combinedResults.push({
        id: `password-${index}`,
        type: 'command' as const,
        title: password,
        description: `密码 ${index + 1}/${passwords.length} - 点击复制`,
        action: 'calc:copy',
        score: 1900 - index,
        priorityScore: 1900 - index,
        calcData: {
          input: calcResult.input,
          output: password,
          success: true,
        },
      });
    });
    return;
  }

  // 文本统计结果：直接显示多行结果
  if (isTextStats) {
    combinedResults.push({
      id: 'text-stats-result',
      type: 'command' as const,
      title: calcResult.output.split('\n')[0] || '文本统计',
      description: calcResult.output.split('\n').slice(1).join(' ').substring(0, 50) || '点击复制',
      action: 'calc:copy',
      score: 1900,
      priorityScore: 1900,
      calcData: calcResult,
    });
    return;
  }

  // 普通计算器结果
  combinedResults.push({
    id: 'calc-result',
    type: 'command' as const,
    title: `= ${calcResult.output.split('\n')[0]}`,
    description: `计算：${calcResult.input}`,
    action: 'calc:copy',
    score: 1800,
    priorityScore: 1800,
    calcData: calcResult,
  });
};

