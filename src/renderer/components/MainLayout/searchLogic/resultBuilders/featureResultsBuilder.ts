import { SearchResult } from '../../../ResultList';

/**
 * 构建编码解码结果
 */
export const buildEncodeResults = (
  encodeResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!encodeResult) {
    return;
  }

  if (encodeResult.success) {
    // 处理编码解码输出格式（可能包含 "→"）
    const outputParts = encodeResult.output.split(' → ');
    const displayOutput = outputParts.length > 1 ? outputParts[1] : encodeResult.output;

    // 根据查询内容判断操作类型
    const inputLower = encodeResult.input.toLowerCase();
    let operationType = '编码解码';
    if (/decode|解码|jiema|jiemi|jm/.test(inputLower)) {
      operationType = '解码';
    } else if (/encode|编码|bianma|jiami|bm/.test(inputLower)) {
      operationType = '编码';
    } else if (/md5/.test(inputLower)) {
      operationType = '加密';
    }

    combinedResults.push({
      id: 'encode-result',
      type: 'encode' as const,
      title: displayOutput.trim(),
      description: `${operationType}：${encodeResult.input}`,
      action: 'encode:copy',
      score: 2000,
      priorityScore: 2000,
      encodeData: encodeResult,
    });
  } else if (encodeResult.error) {
    // 根据查询内容判断操作类型
    const inputLower = (encodeResult.input || query).toLowerCase();
    let operationType = '编码解码';
    if (/decode|解码|jiema|jiemi|jm/.test(inputLower)) {
      operationType = '解码';
    } else if (/encode|编码|bianma|jiami|bm/.test(inputLower)) {
      operationType = '编码';
    } else if (/md5/.test(inputLower)) {
      operationType = '加密';
    }

    combinedResults.push({
      id: 'encode-error',
      type: 'encode' as const,
      title: encodeResult.error, // 不显示"错误:"前缀
      description: `${operationType}：${encodeResult.input || query}`,
      action: 'encode:copy',
      score: 1000,
      priorityScore: 1000,
      encodeData: encodeResult,
    });
  }
};

/**
 * 构建字符串工具结果
 */
export const buildStringResults = (
  stringResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!stringResult) {
    return;
  }

  if (stringResult.success) {
    combinedResults.push({
      id: 'string-result',
      type: 'string' as const,
      title: stringResult.output.trim(),
      description: `字符串处理：${stringResult.input}`,
      action: 'string:copy',
      score: 2000,
      priorityScore: 2000,
      stringData: stringResult,
    });
  } else if (stringResult.error) {
    combinedResults.push({
      id: 'string-error',
      type: 'string' as const,
      title: stringResult.error, // 不显示"错误:"前缀
      description: `字符串处理：${stringResult.input || query}`,
      action: 'string:copy',
      score: 1000,
      priorityScore: 1000,
      stringData: stringResult,
    });
  }
};

/**
 * 构建时间工具结果
 */
export const buildTimeResults = (
  timeResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!timeResult) {
    return;
  }

  if (timeResult.success) {
    // 将多行输出拆分成多条结果
    const outputLines = timeResult.output.split('\n').filter((line: string) => line.trim());
    console.log('🕐 [前端] 时间结果处理:', {
      input: timeResult.input,
      outputLength: timeResult.output.length,
      outputLinesCount: outputLines.length,
      outputPreview: timeResult.output.substring(0, 100),
      hasNewline: timeResult.output.includes('\n'),
    });
    if (outputLines.length > 1) {
      // 多条结果，为每行创建一个选项
      outputLines.forEach((line: string, index: number) => {
        combinedResults.push({
          id: `time-result-${index}`,
          type: 'time' as const,
          title: line.trim(),
          description: `时间工具 ${index + 1}/${outputLines.length}：${timeResult.input}`,
          action: 'time:copy',
          score: 2000 - index,
          priorityScore: 2000 - index,
          timeData: {
            ...timeResult,
            output: line.trim(), // 只包含当前行的输出
          },
        });
      });
    } else {
      // 单条结果
      combinedResults.push({
        id: 'time-result',
        type: 'time' as const,
        title: timeResult.output.trim(),
        description: `时间工具：${timeResult.input}`,
        action: 'time:copy',
        score: 2000,
        priorityScore: 2000,
        timeData: timeResult,
      });
    }
  } else if (timeResult.error) {
    combinedResults.push({
      id: 'time-error',
      type: 'time' as const,
      title: timeResult.error, // 不显示"错误:"前缀
      description: `时间工具：${timeResult.input || query}`,
      action: 'time:copy',
      score: 1000,
      priorityScore: 1000,
      timeData: timeResult,
    });
  }
};

/**
 * 构建 TODO 结果
 */
export const buildTodoResults = (
  todoResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!todoResult) {
    return;
  }

  if (todoResult.success) {
    // 检查是否是任务列表查询（包含多个任务）
    const isListQuery = /^(?:todo|待办)(?:\s+(?:all|done|pending|全部|已完成|未完成))?$/i.test(todoResult.input.trim()) ||
                       /^(?:todo|待办)\s+search/i.test(todoResult.input.trim());

    if (isListQuery && todoResult.todos && todoResult.todos.length > 0) {
      // 任务列表查询：为每个任务创建一个选项
      todoResult.todos.forEach((todo: any, index: number) => {
        const dateStr = new Date(todo.createdAt).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).replace(/\//g, '-');

        if (todo.status === 'pending') {
          combinedResults.push({
            id: `todo-item-${todo.id}`,
            type: 'command' as const,
            title: `[${todo.id}] ${todo.content} (${dateStr})`,
            description: `TODO ${index + 1}/${todoResult.todos.length}：${todoResult.input}`,
            action: `todo:view:${todo.id}`,
            score: 2000 - index,
            priorityScore: 2000 - index,
            todoData: todo, // 保存任务数据用于预览
          });
        } else {
          const completedDateStr = todo.completedAt
            ? new Date(todo.completedAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }).replace(/\//g, '-')
            : '';
          combinedResults.push({
            id: `todo-item-${todo.id}`,
            type: 'command' as const,
            title: `[✓] ${todo.content} (${completedDateStr} 完成)`,
            description: `TODO ${index + 1}/${todoResult.todos.length}：${todoResult.input}`,
            action: `todo:view:${todo.id}`,
            score: 2000 - index,
            priorityScore: 2000 - index,
            todoData: todo, // 保存任务数据用于预览
          });
        }
      });
    } else {
      // 单行结果（创建、完成、删除、编辑等操作）
      combinedResults.push({
        id: 'todo-result',
        type: 'command' as const,
        title: todoResult.output.trim(),
        description: `TODO：${todoResult.input}`,
        action: 'todo:copy',
        score: 2000,
        priorityScore: 2000,
      });
    }
  } else if (todoResult.error) {
    combinedResults.push({
      id: 'todo-error',
      type: 'command' as const,
      title: todoResult.error,
      description: `TODO：${todoResult.input || query}`,
      action: 'todo:copy',
      score: 1000,
      priorityScore: 1000,
    });
  }
};

/**
 * 构建随机数生成结果
 */
export const buildRandomResults = (
  randomResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!randomResult) {
    return;
  }

  if (randomResult.success) {
    // 如果是多个结果（如多个密码），为每个结果创建一个选项
    if (randomResult.outputs && randomResult.outputs.length > 0) {
      randomResult.outputs.forEach((output: string, index: number) => {
        combinedResults.push({
          id: `random-result-${index}`,
          type: 'command' as const,
          title: output,
          description: `随机数生成 ${index + 1}/${randomResult.outputs.length} - 点击复制`,
          action: 'random:copy',
          score: 2000 - index,
          priorityScore: 2000 - index,
          calcData: {
            input: randomResult.input,
            output: output,
            success: true,
          },
        });
      });
    } else {
      // 单个结果
      combinedResults.push({
        id: 'random-result',
        type: 'command' as const,
        title: randomResult.output.trim(),
        description: `随机数生成：${randomResult.input}`,
        action: 'random:copy',
        score: 2000,
        priorityScore: 2000,
        calcData: {
          input: randomResult.input,
          output: randomResult.output,
          success: true,
        },
      });
    }
  } else if (randomResult.error) {
    combinedResults.push({
      id: 'random-error',
      type: 'command' as const,
      title: randomResult.error, // 不显示"错误:"前缀
      description: `随机数生成：${randomResult.input || query}`,
      action: 'random:copy',
      score: 1000,
      priorityScore: 1000,
      calcData: randomResult,
    });
  }
};

/**
 * 构建翻译结果
 */
export const buildTranslateResults = (
  translateResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!translateResult) {
    return;
  }

  if (translateResult.success) {
    combinedResults.push({
      id: 'translate-result',
      type: 'command' as const,
      title: translateResult.output.trim(),
      description: `翻译：${translateResult.input}`,
      action: 'translate:copy',
      score: 2000,
      priorityScore: 2000,
      calcData: {
        input: translateResult.input,
        output: translateResult.output,
        success: true,
      },
    });
  } else if (translateResult.error) {
    combinedResults.push({
      id: 'translate-error',
      type: 'command' as const,
      title: translateResult.error, // 不显示"错误:"前缀
      description: `翻译：${translateResult.input || query}`,
      action: 'translate:copy',
      score: 1000,
      priorityScore: 1000,
      calcData: translateResult,
    });
  }
};

/**
 * 构建变量名生成结果
 */
export const buildVariableNameResults = (
  variableNameResult: any,
  query: string,
  combinedResults: SearchResult[]
): void => {
  if (!variableNameResult) {
    return;
  }

  if (variableNameResult.success) {
    // 变量名生成可能返回多个格式，需要解析输出
    const outputLines = variableNameResult.output.split('\n');
    outputLines.forEach((line: string, index: number) => {
      const colonIndex = line.indexOf(':');
      // 只处理包含变量名格式的行
      if (colonIndex > 0 && /^(camelCase|snake_case|PascalCase|CONSTANT|kebab-case):/i.test(line.trim())) {
        const variableName = line.substring(colonIndex + 1).trim();
        const styleName = line.substring(0, colonIndex).trim();

        combinedResults.push({
          id: `varname-result-${index}`,
          type: 'command' as const,
          title: variableName,
          description: styleName,
          action: 'varname:copy',
          score: 2000 - index,
          priorityScore: 2000 - index,
          calcData: {
            input: variableNameResult.input,
            output: variableName,
            success: true,
          },
        });
      }
    });
  } else if (variableNameResult.error) {
    combinedResults.push({
      id: 'varname-error',
      type: 'command' as const,
      title: variableNameResult.error, // 不显示"错误:"前缀
      description: `变量名生成：${variableNameResult.input || query}`,
      action: 'varname:copy',
      score: 1000,
      priorityScore: 1000,
      calcData: variableNameResult,
    });
  }
};

