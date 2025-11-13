import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ResultPreview } from './ResultPreview';
import { SearchResult } from './ResultList';

/**
 * 预览数据接口
 */
interface PreviewData {
  result: SearchResult | null;
  query: string;
}

/**
 * 验证预览数据格式
 */
const isValidPreviewData = (data: unknown): data is PreviewData => {
  return (
    data !== null &&
    typeof data === 'object' &&
    'result' in data &&
    'query' in data &&
    (data.result !== undefined || data.query !== undefined)
  );
};

/**
 * 预览窗口页面组件
 */
export const PreviewPage: React.FC = () => {
  const [previewData, setPreviewData] = useState<PreviewData>({
    result: null,
    query: '',
  });

  // 处理预览更新消息
  const handlePreviewUpdate = useCallback((...args: unknown[]) => {
    // preload 中的 on 方法已经处理了 event，所以 args 直接是数据
    const data = args.length > 0 ? args[0] : null;
    
    // 验证数据格式
    if (isValidPreviewData(data)) {
      setPreviewData(data);
    }
  }, []);

  // 注册 IPC 消息监听
  useEffect(() => {
    if (!window.electron?.on) {
      return;
    }

    window.electron.on('preview-update', handlePreviewUpdate);

    return () => {
      if (window.electron?.off) {
        window.electron.off('preview-update', handlePreviewUpdate);
      }
    };
  }, [handlePreviewUpdate]);

  // 如果没有数据，不显示任何内容
  const hasPreviewData = useMemo(() => Boolean(previewData.result), [previewData.result]);

  if (!hasPreviewData) {
    return null;
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 overflow-y-auto preview-content">
      <div className="max-w-full overflow-x-hidden">
        <ResultPreview result={previewData.result!} query={previewData.query} />
      </div>
    </div>
  );
};

