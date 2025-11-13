import React from 'react';
import { BASE_HEIGHT, RESULT_ITEM_HEIGHT, MAX_VISIBLE_ITEMS, NO_RESULT_HEIGHT, BASE_WIDTH, RESIZE_DEBOUNCE_DELAY } from '../constants';

/**
 * 窗口大小调整 Hook
 */
export const useWindowResize = (
  query: string,
  results: any[],
  showNoResult: boolean,
  isFirstLaunch: boolean
) => {
  const resizeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastHeightRef = React.useRef<number>(BASE_HEIGHT);
  const lastWidthRef = React.useRef<number>(BASE_WIDTH);

  React.useEffect(() => {
    if (!window.electron) return;

    let height = BASE_HEIGHT;

    if (isFirstLaunch) {
      height = BASE_HEIGHT;
    } else if (query) {
      if (results.length > 0) {
        const visibleItems = Math.min(results.length, MAX_VISIBLE_ITEMS);
        height = BASE_HEIGHT + visibleItems * RESULT_ITEM_HEIGHT + 20;
      } else if (showNoResult) {
        height = BASE_HEIGHT + NO_RESULT_HEIGHT;
      } else {
        height = BASE_HEIGHT;
      }
    } else {
      height = BASE_HEIGHT;
    }

    // 清除之前的定时器
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }

    const targetWidth = BASE_WIDTH;

    // 如果高度变化较大（超过5px）或者首次设置，立即更新
    const heightDiff = Math.abs(height - lastHeightRef.current);
    const widthDiff = Math.abs(targetWidth - (lastWidthRef.current || BASE_WIDTH));
    const shouldUpdateImmediately = heightDiff > 5 || widthDiff > 5 || lastHeightRef.current === BASE_HEIGHT;
    
    if (shouldUpdateImmediately) {
      lastHeightRef.current = height;
      lastWidthRef.current = targetWidth;
      window.electron.windowResize(targetWidth, height).catch((err: any) => {
        console.error('调整窗口大小失败:', err);
      });
    } else {
      // 小幅变化时使用短防抖
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        lastHeightRef.current = height;
        lastWidthRef.current = targetWidth;
        window.electron.windowResize(targetWidth, height).catch((err: any) => {
          console.error('调整窗口大小失败:', err);
        });
      }, RESIZE_DEBOUNCE_DELAY);
    }

    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [query, results.length, showNoResult, isFirstLaunch]);
};

