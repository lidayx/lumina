import { SearchResult } from '../../../ResultList';
import { generateBrowserOptions } from '../../utils';

/**
 * 构建应用结果
 */
export const buildAppResults = (
  apps: any[],
  combinedResults: SearchResult[]
): void => {
  if (apps.length > 0) {
    for (const app of apps) {
      combinedResults.push({
        ...app,
        priorityScore: 800, // 应用优先级（低于命令）
      });
  }
  }
};

/**
 * 构建文件结果
 */
export const buildFileResults = (
  files: any[],
  combinedResults: SearchResult[]
): void => {
  if (files.length > 0) {
    for (const file of files) {
      combinedResults.push({
        id: file.id,
        type: 'file' as const,
        title: file.name,
        description: file.path,
        action: `file:${file.path}`,
        score: file.score || 0,
        priorityScore: 600, // 文件优先级（低于应用）
        icon: undefined,
      });
    }
  }
};

/**
 * 构建网页搜索结果
 */
export const buildWebResults = (
  webResults: any[],
  hasAppOrFileResults: boolean,
  combinedResults: SearchResult[]
): void => {
  // 网页搜索结果（只在没有应用和文件结果时显示）
  if (!hasAppOrFileResults && webResults && webResults.length > 0) {
    for (const web of webResults) {
      combinedResults.push({
        id: web.id,
        type: 'web' as const,
        title: web.title,
        description: web.searchUrl,
        action: `web:${web.searchUrl}`,
        score: 50,
        priorityScore: 50,
        // 使用统一的 SVG 图标风格，不传递 icon 属性
      });
    }
  }
};

/**
 * 构建书签结果
 */
export const buildBookmarkResults = (
  bookmarks: any[],
  defaultBrowser: any,
  combinedResults: SearchResult[]
): void => {
  if (bookmarks && bookmarks.length > 0) {
    for (const bookmark of bookmarks) {
      combinedResults.push({
        id: bookmark.id,
        type: 'web' as const,
        title: bookmark.name,
        description: bookmark.url,
        action: `bookmark:${bookmark.url}`,
        score: 400,
        priorityScore: 400,
        // 如果已设置默认浏览器，则优先显示默认浏览器图标
        icon: defaultBrowser?.icon || undefined,
      });
    }
  }
};

/**
 * 构建命令结果
 */
export const buildCommandResults = (
  commands: any[],
  combinedResults: SearchResult[]
): void => {
  if (commands && commands.length > 0) {
    for (const cmd of commands) {
      combinedResults.push({
        id: cmd.id,
        type: 'command' as const,
        title: cmd.name,
        description: cmd.description,
        action: `command:${cmd.id}`,
        score: 1500,
        priorityScore: 1500,
        icon: undefined,
      });
    }
  }
};

/**
 * 构建 URL 检测结果
 */
export const buildURLResults = async (
  urlCheck: { isURL: boolean; url?: string },
  combinedResults: SearchResult[]
): Promise<void> => {
  if (urlCheck.isURL && urlCheck.url) {
    try {
      const browserOptions = await generateBrowserOptions(urlCheck.url);
      combinedResults.push(...browserOptions);
    } catch (error: any) {
      console.error('生成浏览器选项失败:', error);
      // 即使获取浏览器列表失败，也显示一个默认选项
      combinedResults.push({
        id: `browser-default-${urlCheck.url}`,
        type: 'web' as const,
        title: '系统默认 (默认)',
        description: '打开此网址',
        action: `browser:default:${urlCheck.url}`,
        score: 1500,
        priorityScore: 1500,
      });
    }
  }
};

/**
 * 构建剪贴板历史结果
 */
export const buildClipboardResults = (
  clipboardResults: any[],
  combinedResults: SearchResult[]
): void => {
  if (clipboardResults && clipboardResults.length > 0) {
    for (const item of clipboardResults) {
      const date = new Date(item.createdAt);
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });

      combinedResults.push({
        id: `clipboard-${item.id}`,
        type: 'command' as const,
        title: item.contentPreview || item.content.substring(0, 50),
        description: `${timeStr}${item.copyCount > 1 ? ` · 复制 ${item.copyCount} 次` : ''}`,
        action: `clipboard:paste:${item.id}`,
        score: 1900,
        priorityScore: 1900,
        calcData: {
          input: item.content,
          output: item.content,
          success: true,
        },
      });
    }
  }
};

/**
 * 构建设置查询结果
 */
export const buildSettingsResult = (
  isSettingsQuery: boolean,
  combinedResults: SearchResult[]
): void => {
  if (isSettingsQuery) {
    combinedResults.push({
      id: 'open-settings',
      type: 'command' as const,
      title: '打开设置',
      description: '配置应用选项',
      action: 'settings:open',
      score: 2000,
      priorityScore: 2000,
    });
  }
};

