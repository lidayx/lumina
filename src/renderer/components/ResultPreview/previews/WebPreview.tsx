import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const WebPreview: React.FC<{ result: SearchResult; query: string }> = memo(({ result, query }) => {
  const url = useMemo(() => {
    return result.action.startsWith('web:') 
      ? result.action.replace('web:', '')
      : result.description || '';
  }, [result.action, result.description]);

  const engineName = useMemo(() => getEngineName(url), [url]);

  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [engines, setEngines] = useState<any[]>([]);

  // 加载搜索引擎和搜索历史
  useEffect(() => {
    window.electron.web.getEngines()
      .then(engs => setEngines(engs || []))
      .catch(() => {});

    window.electron.web.getHistory(5)
      .then(history => setSearchHistory(history || []))
      .catch(() => {});
  }, []);

  const handleCopySearchUrl = useCallback(() => {
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [url]);

  const handleSearchInEngine = useCallback((engineName: string) => {
    if (query) {
      window.electron.web.search(query, engineName)
        .then(results => {
          if (results && results.length > 0) {
            window.electron.web.open(results[0].searchUrl).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [query]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <PreviewTitle title="网页搜索" />
      <div className="space-y-4">
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">搜索引擎</span>
          </div>
          <div className="flex items-center gap-2">
            <EngineIcon name={engineName} />
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{engineName}</p>
          </div>
        </div>

        <PreviewField label="URL" value={url} className="break-all" />

        {searchHistory.length > 0 && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">最近搜索</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {searchHistory.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="truncate flex-1">{item.query}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {item.count > 1 ? `${item.count}次` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <ActionButton onClick={handleCopySearchUrl} className="mr-4">复制搜索 URL</ActionButton>
          {engines.length > 1 && query && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">在其他搜索引擎中搜索：</div>
              <div className="flex flex-wrap gap-2">
                {engines.slice(0, 3).map((engine: any) => (
                  <ActionButton key={engine.name} onClick={() => handleSearchInEngine(engine.name)}>
                    {engine.name}
                  </ActionButton>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键在浏览器中打开</p>
        </div>
      </div>
    </div>
  );
});
WebPreview.displayName = 'WebPreview';
