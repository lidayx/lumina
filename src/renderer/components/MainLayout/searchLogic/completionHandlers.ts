import { completionCache } from '../../../../shared/utils/completionCache';
import { KeywordDetection } from './keywordDetectors';

/**
 * 补全结果接口
 */
export interface CompletionData {
  commandCompletions: any[];
  commandHelp: any;
  featureCompletions: any[];
  featureHelp: any;
  featureType: string | null;
}

/**
 * 获取命令补全
 */
export const getCommandCompletions = async (
  isCommandMode: boolean,
  commandQuery: string | undefined
): Promise<{ completions: any[]; help: any }> => {
  if (!isCommandMode) {
    return { completions: [], help: null };
  }

  try {
    let commandCompletions: any[] = [];
    let commandHelp: any = null;

    if (commandQuery) {
      // 有输入，进行命令补全
      commandCompletions = await (window.electron.command as any).complete(commandQuery).catch(() => []);
      // 如果只有一个匹配结果，获取帮助信息
      if (commandCompletions.length === 1) {
        commandHelp = await (window.electron.command as any).help(commandCompletions[0].id).catch(() => null);
      }
    } else {
      // 没有输入，显示所有命令
      commandCompletions = await window.electron.command.getAll().catch(() => []);
    }

    return { completions: commandCompletions, help: commandHelp };
  } catch (error) {
    console.error('命令补全失败:', error);
    return { completions: [], help: null };
  }
};

/**
 * 获取功能补全
 */
export const getFeatureCompletions = async (
  keywordDetection: KeywordDetection,
  actualQuery: string,
  isCommandMode: boolean,
  isFileSearch: boolean,
  isURL: boolean
): Promise<{ completions: any[]; help: any; featureType: string | null }> => {
  if (isCommandMode || isFileSearch || isURL) {
    return { completions: [], help: null, featureType: null };
  }

  const {
    isTranslateKeyword,
    isRandomKeyword,
    isEncodeKeyword,
    isStringKeyword,
    isVarnameKeyword,
    isTimeKeyword,
    isTodoKeyword,
  } = keywordDetection;

  try {
    let featureCompletions: any[] = [];
    let featureHelp: any = null;
    let featureType: string | null = null;

    if (isTranslateKeyword) {
      featureType = 'translate';
      const queryForComplete = actualQuery.replace(/^(?:translate|翻译|fanyi|fy|en|zh|cn)\s*/i, '').trim();
      if (queryForComplete) {
        featureCompletions = await (window.electron as any).translate.complete(queryForComplete).catch(() => []);
      } else {
        featureHelp = await (window.electron as any).translate.help().catch(() => null);
      }
    } else if (isRandomKeyword) {
      featureType = 'random';
      const queryForComplete = actualQuery.replace(/^(?:pwd|password|密码|uuid|random)\s*/i, '').trim();
      if (queryForComplete) {
        featureCompletions = await (window.electron as any).random.complete(queryForComplete).catch(() => []);
      } else {
        featureHelp = await (window.electron as any).random.help().catch(() => null);
      }
    } else if (isEncodeKeyword) {
      featureType = 'encode';
      // 保留完整的查询用于补全，以便匹配 "url en" -> "url encode"
      const queryForComplete = actualQuery.trim();
      if (queryForComplete) {
        // 尝试从缓存获取
        const cached = completionCache.get('encode', queryForComplete);
        if (cached && Array.isArray(cached)) {
          featureCompletions = cached;
        } else {
          featureCompletions = await (window.electron as any).encode.complete(queryForComplete).catch(() => []);
          console.log('🔍 [编码补全]', { queryForComplete, completions: featureCompletions });
          if (featureCompletions.length > 0) {
            completionCache.set('encode', queryForComplete, featureCompletions);
          }
        }
      } else {
        featureHelp = await (window.electron as any).encode.help().catch(() => null);
      }
    } else if (isStringKeyword) {
      featureType = 'string';
      // 保留完整查询以便补全功能能够更好地匹配部分关键词（如 "upper" 匹配 "uppercase"）
      const queryForComplete = actualQuery.trim();
      if (queryForComplete) {
        const cached = completionCache.get('string', queryForComplete);
        if (cached && Array.isArray(cached)) {
          featureCompletions = cached;
        } else {
          featureCompletions = await (window.electron as any).string.complete(queryForComplete).catch(() => []);
          console.log('🔍 [字符串补全]', { queryForComplete, completions: featureCompletions });
          if (featureCompletions.length > 0) {
            completionCache.set('string', queryForComplete, featureCompletions);
          }
        }
      } else {
        featureHelp = await (window.electron as any).string.help().catch(() => null);
      }
    } else if (isVarnameKeyword) {
      featureType = 'varname';
      const queryForComplete = actualQuery.replace(/^(?:varname|变量名|camel|snake|pascal)\s*/i, '').trim();
      if (queryForComplete) {
        const cached = completionCache.get('varname', queryForComplete);
        if (cached && Array.isArray(cached)) {
          featureCompletions = cached;
        } else {
          featureCompletions = await (window.electron as any).varname.complete(queryForComplete).catch(() => []);
          if (featureCompletions.length > 0) {
            completionCache.set('varname', queryForComplete, featureCompletions);
          }
        }
      } else {
        featureHelp = await (window.electron as any).varname.help().catch(() => null);
      }
    } else if (isTimeKeyword) {
      featureType = 'time';
      const queryForComplete = actualQuery.replace(/^(?:time|时间|timestamp|date|日期)\s*/i, '').trim();
      if (queryForComplete) {
        const cached = completionCache.get('time', queryForComplete);
        if (cached && Array.isArray(cached)) {
          featureCompletions = cached;
        } else {
          featureCompletions = await (window.electron as any).time.complete(queryForComplete).catch(() => []);
          if (featureCompletions.length > 0) {
            completionCache.set('time', queryForComplete, featureCompletions);
          }
        }
      } else {
        featureHelp = await (window.electron as any).time.help().catch(() => null);
      }
    } else if (isTodoKeyword) {
      featureType = 'todo';
      const queryForComplete = actualQuery.trim();
      if (queryForComplete) {
        const cached = completionCache.get('todo', queryForComplete);
        if (cached && Array.isArray(cached)) {
          featureCompletions = cached;
        } else {
          featureCompletions = await (window.electron as any).todo.complete(queryForComplete).catch(() => []);
          if (featureCompletions.length > 0) {
            completionCache.set('todo', queryForComplete, featureCompletions);
          }
        }
      } else {
        featureHelp = await (window.electron as any).todo.help().catch(() => null);
      }
    }

    return { completions: featureCompletions, help: featureHelp, featureType };
  } catch (error) {
    console.error('功能补全失败:', error);
    return { completions: [], help: null, featureType: null };
  }
};

