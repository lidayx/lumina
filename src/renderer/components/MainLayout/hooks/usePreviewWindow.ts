import React from 'react';
import { SearchResult } from '../../ResultList';
import { PREVIEW_SETTING_CHECK_INTERVAL } from '../constants';

/**
 * 预览窗口管理 Hook
 */
export const usePreviewWindow = (
  selectedResult: SearchResult | null,
  query: string,
  isTodoOperationRef?: React.MutableRefObject<boolean>
) => {
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
    // 如果正在进行 TODO 操作（创建、删除、编辑），不更新预览窗口，直接隐藏
    // 注意：这里检查 ref.current 的值，即使 ref 对象本身不变，我们也要检查其 current 属性
    if (isTodoOperationRef?.current) {
      console.log('[MainLayout] 检测到 TODO 操作标志，隐藏预览窗口，不发送预览更新消息');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      return;
    }
    
    // 如果选中的结果是 TODO 修改操作的确认提示（删除、编辑、完成、创建），不显示预览窗口
    if (selectedResult && (selectedResult as any).isTodoModifyOperation) {
      console.log('[MainLayout] 检测到 TODO 修改操作确认提示，隐藏预览窗口，不发送预览更新消息');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      return;
    }
    
    // 如果 query 为空，说明可能是 TODO 操作导致的清空，直接隐藏预览窗口
    if (!query) {
      console.log('[MainLayout] 查询为空，隐藏预览窗口');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      return;
    }
    
    if (selectedResult && previewWindowEnabled) {
      console.log('[MainLayout] 更新预览内容，选中结果:', selectedResult);
      
      // 再次检查是否正在进行 TODO 操作（防止异步操作期间的竞争条件）
      if (isTodoOperationRef?.current) {
        console.log('[MainLayout] 在执行预览更新前检测到 TODO 操作，取消预览更新');
        window.electron.preview.hide().catch((err: any) => {
          console.error('[MainLayout] 隐藏预览窗口失败:', err);
        });
        return;
      }
      
      // 再次检查是否是 TODO 修改操作确认提示
      if ((selectedResult as any).isTodoModifyOperation) {
        console.log('[MainLayout] 在执行预览更新前检测到 TODO 修改操作确认提示，取消预览更新');
        window.electron.preview.hide().catch((err: any) => {
          console.error('[MainLayout] 隐藏预览窗口失败:', err);
        });
        return;
      }
      
      window.electron.preview.update(selectedResult, query).then(() => {
        // 在执行 show 前再次检查 TODO 操作标志
        if (isTodoOperationRef?.current) {
          console.log('[MainLayout] 在执行显示预览窗口前检测到 TODO 操作，取消显示');
          return window.electron.preview.hide();
        }
        // 在执行 show 前再次检查是否是 TODO 修改操作确认提示
        if ((selectedResult as any).isTodoModifyOperation) {
          console.log('[MainLayout] 在执行显示预览窗口前检测到 TODO 修改操作确认提示，取消显示');
          return window.electron.preview.hide();
        }
        console.log('[MainLayout] 内容已更新，显示预览窗口');
        return window.electron.preview.show();
      }).catch((err: any) => {
        console.error('[MainLayout] 显示预览窗口失败:', err);
      });
    } else {
      // 如果没有选中结果，立即隐藏预览窗口
      console.log('[MainLayout] 隐藏预览窗口 - selectedResult:', selectedResult, 'query:', query);
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
    }

    // cleanup 函数：当组件卸载或依赖项变化时，如果条件不满足则隐藏预览窗口
    return () => {
      // 如果正在进行 TODO 操作，不执行 cleanup 的预览更新
      if (isTodoOperationRef?.current) {
        return;
      }
      if (!selectedResult || !query || !previewWindowEnabled) {
        window.electron.preview.hide().catch((err: any) => {
          console.error('[MainLayout] cleanup 隐藏预览窗口失败:', err);
        });
      }
    };
  }, [selectedResult, query, previewWindowEnabled, isTodoOperationRef]);
};


