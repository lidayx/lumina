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
  // 标记预览窗口是否应该显示
  const [shouldShowPreview, setShouldShowPreview] = React.useState(false);

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

  // 定时检查主窗口显示状态（每100毫秒检查一次）
  React.useEffect(() => {
    // 只有当预览窗口应该显示时才启动定时检查
    if (!shouldShowPreview) {
      return;
    }

    console.log('[MainLayout] 启动主窗口显示状态定时检查');
    const checkInterval = setInterval(async () => {
      try {
        // 检查主窗口是否可见
        const isMainWindowVisible = await window.electron.windowIsVisible('main');
        if (!isMainWindowVisible) {
          console.log('[MainLayout] 检测到主窗口已隐藏，隐藏预览窗口');
          // 主窗口已隐藏，隐藏预览窗口
          await window.electron.preview.hide();
          setShouldShowPreview(false);
        }
      } catch (error) {
        console.error('[MainLayout] 检查主窗口显示状态失败:', error);
        // 如果检查失败，也隐藏预览窗口（安全起见）
        try {
          await window.electron.preview.hide();
          setShouldShowPreview(false);
        } catch (hideError) {
          console.error('[MainLayout] 隐藏预览窗口失败:', hideError);
        }
      }
    }, 100); // 每100毫秒检查一次

    return () => {
      console.log('[MainLayout] 停止主窗口显示状态定时检查');
      clearInterval(checkInterval);
    };
  }, [shouldShowPreview]);

  // 更新预览窗口
  React.useEffect(() => {
    // 如果正在进行 TODO 操作（创建、删除、编辑），不更新预览窗口，直接隐藏
    // 注意：这里检查 ref.current 的值，即使 ref 对象本身不变，我们也要检查其 current 属性
    if (isTodoOperationRef?.current) {
      console.log('[MainLayout] 检测到 TODO 操作标志，隐藏预览窗口，不发送预览更新消息');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      setShouldShowPreview(false);
      return;
    }
    
    // 如果选中的结果是 TODO 修改操作的确认提示（删除、编辑、完成、创建），不显示预览窗口
    if (selectedResult && (selectedResult as any).isTodoModifyOperation) {
      console.log('[MainLayout] 检测到 TODO 修改操作确认提示，隐藏预览窗口，不发送预览更新消息');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      setShouldShowPreview(false);
      return;
    }
    
    // 如果 query 为空，说明可能是 TODO 操作导致的清空，直接隐藏预览窗口
    if (!query) {
      console.log('[MainLayout] 查询为空，隐藏预览窗口');
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      setShouldShowPreview(false);
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
        setShouldShowPreview(false);
        return;
      }
      
      // 再次检查是否是 TODO 修改操作确认提示
      if ((selectedResult as any).isTodoModifyOperation) {
        console.log('[MainLayout] 在执行预览更新前检测到 TODO 修改操作确认提示，取消预览更新');
        window.electron.preview.hide().catch((err: any) => {
          console.error('[MainLayout] 隐藏预览窗口失败:', err);
        });
        setShouldShowPreview(false);
        return;
      }
      
      // 检查主窗口是否可见
      window.electron.windowIsVisible('main').then((isMainWindowVisible) => {
        if (!isMainWindowVisible) {
          console.log('[MainLayout] 主窗口不可见，不显示预览窗口');
          window.electron.preview.hide().catch((err: any) => {
            console.error('[MainLayout] 隐藏预览窗口失败:', err);
          });
          setShouldShowPreview(false);
          return;
        }
        
        // 主窗口可见，更新并显示预览窗口
        window.electron.preview.update(selectedResult, query).then(() => {
          // 在执行 show 前再次检查 TODO 操作标志
          if (isTodoOperationRef?.current) {
            console.log('[MainLayout] 在执行显示预览窗口前检测到 TODO 操作，取消显示');
            setShouldShowPreview(false);
            return window.electron.preview.hide();
          }
          // 在执行 show 前再次检查是否是 TODO 修改操作确认提示
          if ((selectedResult as any).isTodoModifyOperation) {
            console.log('[MainLayout] 在执行显示预览窗口前检测到 TODO 修改操作确认提示，取消显示');
            setShouldShowPreview(false);
            return window.electron.preview.hide();
          }
          // 再次检查主窗口是否可见
          return window.electron.windowIsVisible('main').then((stillVisible) => {
            if (!stillVisible) {
              console.log('[MainLayout] 在执行显示预览窗口前检测到主窗口已隐藏，取消显示');
              setShouldShowPreview(false);
              return window.electron.preview.hide();
            }
            console.log('[MainLayout] 内容已更新，显示预览窗口');
            setShouldShowPreview(true); // 标记预览窗口应该显示，启动定时检查
            return window.electron.preview.show();
          });
        }).catch((err: any) => {
          console.error('[MainLayout] 显示预览窗口失败:', err);
          setShouldShowPreview(false);
        });
      }).catch((err: any) => {
        console.error('[MainLayout] 检查主窗口显示状态失败:', err);
        // 如果检查失败，不显示预览窗口（安全起见）
        setShouldShowPreview(false);
      });
    } else {
      // 如果没有选中结果，立即隐藏预览窗口
      console.log('[MainLayout] 隐藏预览窗口 - selectedResult:', selectedResult, 'query:', query);
      window.electron.preview.hide().catch((err: any) => {
        console.error('[MainLayout] 隐藏预览窗口失败:', err);
      });
      setShouldShowPreview(false);
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


