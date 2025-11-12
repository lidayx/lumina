import { openSettingsWindow } from '../windows/settingsWindow';
import { openPluginWindow } from '../windows/pluginWindow';
import { toggleMainWindow, getMainWindow } from '../windows/mainWindow';
import { showPreviewWindow, hidePreviewWindow, updatePreviewContent, closePreviewWindow } from '../windows/previewWindow';
import { registerHandler, validateString } from './handlerUtils';

/**
 * 注册窗口相关的 IPC 处理器
 * 处理应用窗口的显示、隐藏和切换
 */
export function registerWindowHandlers() {
  // 打开设置窗口
  registerHandler(
    'open-settings',
    '打开设置窗口',
    () => {
      openSettingsWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 打开插件管理窗口
  registerHandler(
    'open-plugins',
    '打开插件管理窗口',
    () => {
      openPluginWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 切换主窗口的显示/隐藏状态
  registerHandler(
    'toggle-main-window',
    '切换主窗口',
    () => {
      toggleMainWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 显示预览窗口
  registerHandler(
    'preview-show',
    '显示预览窗口',
    () => {
      showPreviewWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 隐藏预览窗口
  registerHandler(
    'preview-hide',
    '隐藏预览窗口',
    () => {
      hidePreviewWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 更新预览内容
  registerHandler(
    'preview-update',
    '更新预览内容',
    async (_event, result: any, query: string) => {
      const validatedQuery = validateString(query, 'query');
      if (!result || typeof result !== 'object') {
        throw new Error('result 必须是对象类型');
      }
      await updatePreviewContent(result, validatedQuery);
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 关闭预览窗口
  registerHandler(
    'preview-close',
    '关闭预览窗口',
    () => {
      closePreviewWindow();
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );

  // 刷新主窗口搜索结果
  registerHandler(
    'main-window-refresh-search',
    '刷新主窗口搜索结果',
    () => {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        // 发送刷新搜索的消息到主窗口
        mainWindow.webContents.send('refresh-search');
      }
    },
    {
      logPrefix: '🪟 [窗口Handler]',
    }
  );
}

