import { translateService } from '../services/translateService';
import { randomService } from '../services/randomService';
import { encodeService } from '../services/encodeService';
import { stringService } from '../services/stringService';
import { variableNameService } from '../services/variableNameService';
import { timeService } from '../services/timeService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册功能补全相关的 IPC 处理器
 */
export function registerFeatureCompletionHandlers() {
  // 翻译补全
  registerHandler(
    'translate-complete',
    '翻译补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return translateService.completeTranslate(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 翻译帮助
  registerHandler(
    'translate-help',
    '翻译帮助',
    async () => {
      return translateService.getTranslateHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 随机数生成补全
  registerHandler(
    'random-complete',
    '随机数补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return randomService.completeRandom(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 随机数生成帮助
  registerHandler(
    'random-help',
    '随机数帮助',
    async () => {
      return randomService.getRandomHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 编码解码补全
  registerHandler(
    'encode-complete',
    '编码解码补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return encodeService.completeEncode(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 编码解码帮助
  registerHandler(
    'encode-help',
    '编码解码帮助',
    async () => {
      return encodeService.getEncodeHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 字符串工具补全
  registerHandler(
    'string-complete',
    '字符串工具补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return stringService.completeString(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 字符串工具帮助
  registerHandler(
    'string-help',
    '字符串工具帮助',
    async () => {
      return stringService.getStringHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 变量名生成补全
  registerHandler(
    'varname-complete',
    '变量名生成补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return variableNameService.completeVariableName(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 变量名生成帮助
  registerHandler(
    'varname-help',
    '变量名生成帮助',
    async () => {
      return variableNameService.getVariableNameHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 时间工具补全
  registerHandler(
    'time-complete',
    '时间工具补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return timeService.completeTime(validatedPartial);
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );

  // 时间工具帮助
  registerHandler(
    'time-help',
    '时间工具帮助',
    async () => {
      return timeService.getTimeHelp();
    },
    {
      logPrefix: '✨ [功能补全Handler]',
    }
  );
}

