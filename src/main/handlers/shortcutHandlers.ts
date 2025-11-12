import { shortcutService } from '../services/shortcutService';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册快捷键相关的 IPC 处理器
 */
export function registerShortcutHandlers() {
  // 获取当前快捷键
  registerHandler(
    'shortcut-get-current',
    '获取当前快捷键',
    async () => {
      const shortcut = shortcutService.getCurrentShortcut();
      return { shortcut, formatted: shortcut ? shortcutService.formatShortcut(shortcut) : null };
    },
    {
      logPrefix: '⌨️ [快捷键Handler]',
    }
  );

  // 设置全局快捷键
  registerHandler(
    'shortcut-set',
    '设置全局快捷键',
    async (_event, shortcut: string) => {
      const validatedShortcut = validateString(shortcut, 'shortcut');
      const success = shortcutService.register(validatedShortcut);
      if (success) {
        // 更新设置
        const { default: settingsService } = await import('../services/settingsService');
        await settingsService.updateSettings({ globalShortcut: validatedShortcut });
      }
      return { success };
    },
    {
      logPrefix: '⌨️ [快捷键Handler]',
    }
  );

  // 检查快捷键是否可用
  registerHandler(
    'shortcut-check-available',
    '检查快捷键是否可用',
    async (_event, shortcut: string) => {
      const validatedShortcut = validateString(shortcut, 'shortcut');
      const available = shortcutService.isAvailable(validatedShortcut);
      return { available };
    },
    {
      logPrefix: '⌨️ [快捷键Handler]',
    }
  );

  // 格式化快捷键显示
  registerHandler(
    'shortcut-format',
    '格式化快捷键显示',
    async (_event, shortcut: string) => {
      const validatedShortcut = validateString(shortcut, 'shortcut');
      return { formatted: shortcutService.formatShortcut(validatedShortcut) };
    },
    {
      logPrefix: '⌨️ [快捷键Handler]',
    }
  );
}

