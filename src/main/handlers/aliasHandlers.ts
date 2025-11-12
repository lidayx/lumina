import { aliasService } from '../services/aliasService';
import { registerHandler, validateString, validateStringOptional } from './handlerUtils';

/**
 * 注册别名相关的 IPC 处理器
 */
export function registerAliasHandlers() {
  // 获取所有别名
  registerHandler(
    'alias-get-all',
    '获取所有别名',
    async () => {
      return aliasService.getAllAliases();
    },
    {
      logPrefix: '🔗 [别名Handler]',
    }
  );

  // 添加别名
  registerHandler(
    'alias-add',
    '添加别名',
    async (_event, name: string, command: string, type: string, description?: string) => {
      const validatedName = validateString(name, 'name');
      const validatedCommand = validateString(command, 'command');
      const validatedType = validateString(type, 'type');
      const validatedDescription = validateStringOptional(description, 'description');
      
      const alias = await aliasService.addAlias(validatedName, validatedCommand, validatedType as any, validatedDescription);
      return { success: true, alias };
    },
    {
      logPrefix: '🔗 [别名Handler]',
      returnNullOnError: false,
      defaultValue: { success: false, error: '添加别名失败' },
    }
  );

  // 删除别名
  registerHandler(
    'alias-remove',
    '删除别名',
    async (_event, name: string) => {
      const validatedName = validateString(name, 'name');
      const success = await aliasService.removeAlias(validatedName);
      return { success };
    },
    {
      logPrefix: '🔗 [别名Handler]',
    }
  );

  // 更新别名
  registerHandler(
    'alias-update',
    '更新别名',
    async (_event, name: string, updates: any) => {
      const validatedName = validateString(name, 'name');
      if (!updates || typeof updates !== 'object') {
        throw new Error('updates 必须是对象类型');
      }
      const success = await aliasService.updateAlias(validatedName, updates);
      return { success };
    },
    {
      logPrefix: '🔗 [别名Handler]',
    }
  );

  // 获取别名
  registerHandler(
    'alias-get',
    '获取别名',
    async (_event, name: string) => {
      const validatedName = validateString(name, 'name');
      const alias = aliasService.getAlias(validatedName);
      return { alias };
    },
    {
      logPrefix: '🔗 [别名Handler]',
    }
  );

  // 解析别名
  registerHandler(
    'alias-resolve',
    '解析别名',
    async (_event, input: string) => {
      const validatedInput = validateString(input, 'input');
      const result = aliasService.resolveAlias(validatedInput);
      return result;
    },
    {
      logPrefix: '🔗 [别名Handler]',
    }
  );
}

