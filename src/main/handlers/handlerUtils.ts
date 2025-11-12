import { ipcMain, IpcMainInvokeEvent } from 'electron';

/**
 * IPC Handler 工具函数
 * 提供统一的错误处理、日志记录和类型安全
 */

/**
 * 统一的错误处理包装器
 * @param handlerName Handler 名称（用于日志）
 * @param handler 实际的处理器函数
 * @param options 选项
 */
export function createHandler<T extends any[]>(
  handlerName: string,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any> | any,
  options: {
    logPrefix?: string; // 日志前缀（如 "📝 [TODO Handler]"）
    returnNullOnError?: boolean; // 错误时返回 null 而不是抛出异常
    defaultValue?: any; // 错误时的默认返回值
  } = {}
): (event: IpcMainInvokeEvent, ...args: T) => Promise<any> {
  const { logPrefix = '', returnNullOnError = false, defaultValue = null } = options;

  return async (event: IpcMainInvokeEvent, ...args: T) => {
    try {
      const result = await handler(event, ...args);
      return result;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error(`${logPrefix || handlerName} 处理失败:`, errorMessage);
      
      if (returnNullOnError) {
        return defaultValue;
      }
      throw error;
    }
  };
}

/**
 * 注册 IPC Handler（自动移除旧处理器）
 * @param channel IPC 通道名称
 * @param handlerName Handler 名称（用于日志）
 * @param handler 处理器函数
 * @param options 选项
 */
export function registerHandler<T extends any[]>(
  channel: string,
  handlerName: string,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any> | any,
  options: {
    logPrefix?: string;
    returnNullOnError?: boolean;
    defaultValue?: any;
  } = {}
): void {
  // 移除旧的处理器（如果存在）
  ipcMain.removeHandler(channel);
  
  // 注册新的处理器
  ipcMain.handle(channel, createHandler(handlerName, handler, options));
}

/**
 * 类型安全的参数验证
 */
export function validateString(value: any, paramName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${paramName} 必须是字符串类型，实际类型: ${typeof value}`);
  }
  return value;
}

/**
 * 类型安全的参数验证（可选）
 */
export function validateStringOptional(value: any, paramName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return validateString(value, paramName);
}

/**
 * 类型安全的参数验证（数字）
 */
export function validateNumber(value: any, paramName: string): number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${paramName} 必须是数字类型，实际类型: ${typeof value}`);
  }
  return value;
}

/**
 * 类型安全的参数验证（数字，可选）
 */
export function validateNumberOptional(value: any, paramName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return validateNumber(value, paramName);
}

