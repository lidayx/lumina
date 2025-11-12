import { registerHandler } from './handlerUtils';

/**
 * 注册设置相关的 IPC 处理器
 * 管理应用的配置设置和日志文件路径
 */
export function registerSettingsHandlers() {
  // 获取所有应用设置
  registerHandler(
    'settings-get-all',
    '获取所有设置',
    async () => {
      const { default: settingsService } = await import('../services/settingsService');
      return settingsService.getSettings();
    },
    {
      logPrefix: '⚙️ [设置Handler]',
    }
  );

  // 更新应用设置（支持部分更新）
  registerHandler(
    'settings-update',
    '更新设置',
    async (_event, updates: any) => {
      if (!updates || typeof updates !== 'object') {
        throw new Error('updates 必须是对象类型');
      }
      const { default: settingsService } = await import('../services/settingsService');
      await settingsService.updateSettings(updates);
      return { success: true };
    },
    {
      logPrefix: '⚙️ [设置Handler]',
    }
  );

  // 重置所有设置为默认值
  registerHandler(
    'settings-reset',
    '重置设置',
    async () => {
      const { default: settingsService } = await import('../services/settingsService');
      await settingsService.resetSettings();
      return { success: true };
    },
    {
      logPrefix: '⚙️ [设置Handler]',
    }
  );

  // 获取调试日志文件的完整路径
  registerHandler(
    'settings-get-log-file',
    '获取日志文件路径',
    async () => {
      const { debugLog } = await import('../utils/debugLog');
      return debugLog.getLogFile();
    },
    {
      logPrefix: '⚙️ [设置Handler]',
    }
  );
}

