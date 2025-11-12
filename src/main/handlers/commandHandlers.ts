import commandService from '../services/commandService';
import { registerHandler, validateString, validateNumberOptional } from './handlerUtils';

/**
 * 注册命令相关的 IPC 处理器
 * 提供系统命令的获取、搜索、执行和历史管理
 */
export function registerCommandHandlers() {
  // 获取所有可用的系统命令
  registerHandler(
    'command-get-all',
    '获取所有命令',
    async () => {
      return commandService.getAllCommands();
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 根据关键词搜索命令
  registerHandler(
    'command-search',
    '搜索命令',
    async (_event, query: string) => {
      const validatedQuery = validateString(query, 'query');
      return commandService.searchCommands(validatedQuery);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 执行预定义的命令
  registerHandler(
    'command-execute',
    '执行命令',
    async (_event, commandId: string) => {
      const validatedCommandId = validateString(commandId, 'commandId');
      return await commandService.executeCommand(validatedCommandId);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 执行原始命令字符串（自定义命令）
  registerHandler(
    'command-execute-raw',
    '执行原始命令',
    async (_event, command: string) => {
      const validatedCommand = validateString(command, 'command');
      return await commandService.executeRawCommand(validatedCommand);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 获取命令执行历史记录
  registerHandler(
    'command-get-history',
    '获取命令历史',
    async (_event, limit?: number) => {
      const validatedLimit = validateNumberOptional(limit, 'limit');
      return commandService.getHistory(validatedLimit);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 清除命令执行历史
  registerHandler(
    'command-clear-history',
    '清除命令历史',
    async () => {
      commandService.clearHistory();
      return { success: true };
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 命令补全
  registerHandler(
    'command-complete',
    '命令补全',
    async (_event, partial: string) => {
      const validatedPartial = validateString(partial, 'partial');
      return commandService.completeCommand(validatedPartial);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );

  // 获取命令帮助
  registerHandler(
    'command-help',
    '获取命令帮助',
    async (_event, commandId: string) => {
      const validatedCommandId = validateString(commandId, 'commandId');
      return commandService.getCommandHelp(validatedCommandId);
    },
    {
      logPrefix: '💻 [命令Handler]',
    }
  );
}

