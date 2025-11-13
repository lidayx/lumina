import React from 'react';
import { SearchResult } from '../../ResultList';
import { PREVIEW_SETTING_CHECK_INTERVAL } from '../constants';

/**
 * 预览窗口管理 Hook
 */
export const usePreviewWindow = (selectedResult: SearchResult | null, query: string) => {
  const [previewWindowEnabled, setPreviewWindowEnabled] = React.useState(true);

  // 加载预览窗口设置
  React.useEffect(() => {
    const loadPreviewSetting = async () => {
      try {
        const settings = await window.electron.settings.getAll();
        setPreviewWindowEnabled(settings.previewWindowEnabled !== false);
      } catch {
        setPreviewWindowEnabled(true);
      }
    };

    loadPreviewSetting();
    const interval = setInterval(loadPreviewSetting, PREVIEW_SETTING_CHECK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // 更新预览窗口
  React.useEffect(() => {
    if (selectedResult && query && previewWindowEnabled) {
      console.log('[MainLayout] 更新预览内容，选中结果:', selectedResult);
      
      window.electron.preview.update(selectedResult, query).then(() => {
        console.log('[MainLayout] 内容已更新，显示预览窗口');
        return window.electron.preview.show();
      }).catch((err: any) => {
        console.error('[MainLayout] 显示预览窗口失败:', err);
      });
    } else {
      window.electron.preview.hide();
    }

    return () => {
      if (!selectedResult || !query || !previewWindowEnabled) {
        window.electron.preview.hide();
      }
    };
  }, [selectedResult, query, previewWindowEnabled]);
};


