import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage } from '../components';
import { formatDate } from '../utils';

export const AppPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  const [appInfo, setAppInfo] = useState<any>(null);
  const [appDetails, setAppDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const appId = useMemo(() => {
    return result.action.startsWith('app:') ? result.action.replace('app:', '') : null;
  }, [result.action]);

  const loadAppInfo = useCallback(() => {
    if (!appId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    window.electron.app.getAll()
      .then(apps => {
        const app = apps.find((a: any) => a.id === appId);
        setAppInfo(app);
        
        if (app) {
          return window.electron.app.getInfo(appId);
        }
        return null;
      })
      .then((response: any) => {
        if (response?.success) {
          setAppDetails(response.info);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [appId]);

  useEffect(() => {
    loadAppInfo();
  }, [loadAppInfo]);

  const handleRevealFolder = useCallback(() => {
    if (appId) {
      window.electron.app.revealFolder(appId).catch(err => {
        console.error('打开文件夹失败:', err);
      });
    }
  }, [appId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <PreviewTitle title="应用信息" />
      {appInfo ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            {appInfo.icon && <SafeImage src={appInfo.icon} alt={appInfo.name} size="medium" />}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{appInfo.name}</h4>
              {appInfo.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{appInfo.description}</p>
              )}
            </div>
          </div>

          <PreviewField label="路径" value={appInfo.path || '未知'} monospace />
          
          {appDetails?.installDate && (
            <PreviewField label="安装时间" value={formatDate(appDetails.installDate)} />
          )}

          {appInfo.category && (
            <PreviewField label="分类" value={appInfo.category} />
          )}

          {(appInfo.launchCount !== undefined || appInfo.lastUsed) && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">使用统计</span>
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
                {appInfo.launchCount !== undefined && <p>启动次数: {appInfo.launchCount}</p>}
                {appInfo.lastUsed && <p>最后使用: {formatDate(appInfo.lastUsed)}</p>}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <ActionButton onClick={handleRevealFolder}>打开安装文件夹</ActionButton>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">无法获取应用详细信息</p>
      )}
    </div>
  );
});
AppPreview.displayName = 'AppPreview';

