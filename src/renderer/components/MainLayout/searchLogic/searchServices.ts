import { QueryTypeDetection } from '../queryDetectors';

/**
 * 调用搜索服务
 */
export const callSearchServices = async (
  actualQuery: string,
  detection: QueryTypeDetection,
  shouldSearchWeb: boolean,
  fileSearchEnabled: boolean
) => {
  const { isCommandMode, isFileSearch, fileSearchQuery, isClipboardSearch, clipboardQuery } = detection;
  
  const [appsFromIPC, files, webResults, bookmarks, commands, clipboardResults] = await Promise.all([
    // 应用搜索
    isCommandMode ? Promise.resolve([]) : window.electron.app.search(actualQuery).catch(() => []),
    // 文件搜索
    (isFileSearch && fileSearchEnabled && fileSearchQuery) 
      ? window.electron.file.search(fileSearchQuery).catch(() => []) 
      : Promise.resolve([]),
    // 网页搜索
    (isCommandMode || !shouldSearchWeb) ? Promise.resolve([]) : window.electron.web.search(actualQuery).catch(() => []),
    // 书签搜索
    isCommandMode ? Promise.resolve([]) : window.electron.bookmark.search(actualQuery).catch(() => []),
    // 命令搜索
    isCommandMode ? Promise.resolve([]) : window.electron.command.search(actualQuery).catch(() => []),
    // 剪贴板搜索
    isClipboardSearch 
      ? (clipboardQuery 
          ? window.electron.clipboard.search(clipboardQuery, 20).catch(() => [])
          : window.electron.clipboard.getHistory(20).catch(() => []))
      : Promise.resolve([]),
  ]);
  
  // 获取默认浏览器
  const defaultBrowser = await window.electron.browser.getDefault().catch(() => null);
  
  return {
    appsFromIPC,
    files,
    webResults,
    bookmarks,
    commands,
    clipboardResults,
    defaultBrowser,
  };
};



