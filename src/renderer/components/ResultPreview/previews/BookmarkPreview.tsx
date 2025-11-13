import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const BookmarkPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  const url = useMemo(() => {
    return result.action.startsWith('bookmark:') 
    ? result.action.replace('bookmark:', '')
    : result.description || '';
  }, [result.action, result.description]);

  const title = useMemo(() => result.title || '未知标题', [result.title]);

  const [bookmarkInfo, setBookmarkInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

      setLoading(true);
    window.electron.bookmark.getInfo(url)
      .then((response: any) => {
        if (response.success) {
          setBookmarkInfo(response.info);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [url]);

  const handleCopyUrl = useCallback(() => {
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [url]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <PreviewTitle title="书签信息" />
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          {bookmarkInfo?.icon && <SafeImage src={bookmarkInfo.icon} alt={title} size="small" className="rounded" />}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{title}</h4>
            </div>
          </div>

        <PreviewField label="标题" value={title} />
        <PreviewField label="网址" value={url} monospace className="break-all" />
        <PreviewField label="安全状态" value={getSecurityStatus(url)} />

          {bookmarkInfo && (
          <>
            {bookmarkInfo.dateAdded && (
              <PreviewField label="添加时间" value={formatDate(bookmarkInfo.dateAdded)} />
            )}
            {bookmarkInfo.dateLastUsed && (
              <PreviewField label="最后访问" value={formatDate(bookmarkInfo.dateLastUsed)} />
            )}
            {bookmarkInfo.accessCount !== undefined && (
              <PreviewField label="访问次数" value={String(bookmarkInfo.accessCount || 0)} />
            )}
          </>
        )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <ActionButton onClick={handleCopyUrl}>复制网址</ActionButton>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键在浏览器中打开</p>
          </div>
        </div>
    </div>
  );
});
BookmarkPreview.displayName = 'BookmarkPreview';
