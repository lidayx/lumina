import React, { useEffect, useState } from 'react';
import { ResultPreview } from './ResultPreview';
import { SearchResult } from './ResultList';

/**
 * 预览窗口页面组件
 */
export const PreviewPage: React.FC = () => {
  const [previewData, setPreviewData] = useState<{ result: SearchResult | null; query: string }>({
    result: null,
    query: '',
  });

  useEffect(() => {
    console.log('[PreviewPage] 组件已挂载');
    
    // 监听来自主窗口的预览更新消息
    const handlePreviewUpdate = (...args: any[]) => {
      console.log('[PreviewPage] handlePreviewUpdate 被调用，参数:', args);
      // preload 中的 on 方法已经处理了 event，所以 args 直接是数据
      const data = args.length > 0 ? args[0] : null;
      console.log('[PreviewPage] 收到预览更新，数据:', data);
      
      if (data && typeof data === 'object' && (data.result !== undefined || data.query !== undefined)) {
        console.log('[PreviewPage] 设置预览数据');
        setPreviewData(data);
      } else {
        console.warn('[PreviewPage] 数据格式不正确:', data);
      }
    };

    // 监听 IPC 消息
    if (window.electron && window.electron.on) {
      console.log('[PreviewPage] 注册预览更新监听器');
      // 使用 Electron IPC 监听
      window.electron.on('preview-update', handlePreviewUpdate);
      console.log('[PreviewPage] 监听器已注册');
    } else {
      console.error('[PreviewPage] window.electron 或 on 方法不存在');
      console.error('[PreviewPage] window.electron:', window.electron);
    }

    return () => {
      console.log('[PreviewPage] 组件卸载，移除监听器');
      if (window.electron && window.electron.off) {
        window.electron.off('preview-update', handlePreviewUpdate);
      }
    };
  }, []);

  // 添加调试信息
  React.useEffect(() => {
    console.log('[PreviewPage] 预览数据更新:', previewData);
  }, [previewData]);

  // 如果没有数据，不显示任何内容
  if (!previewData.result) {
    return null;
  }

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 overflow-y-auto preview-content">
      <div className="max-w-full overflow-x-hidden">
        <ResultPreview result={previewData.result} query={previewData.query} />
      </div>
    </div>
  );
};

