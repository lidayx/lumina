import React from 'react';
import { FIRST_LAUNCH_TIMEOUT } from '../constants';

/**
 * 首次启动检测 Hook
 */
export const useFirstLaunch = () => {
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(true);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let handleIndexingComplete: (() => void) | null = null;

    const loadData = async () => {
      try {
        const apps = await window.electron.invoke('app-get-all');
        if (apps && apps.length > 0) {
          setIsFirstLaunch(false);
        } else {
          console.log('首次启动检测：无缓存，显示加载引导');
          setIsFirstLaunch(true);
          
          // 设置备用超时
          timeoutId = setTimeout(() => {
            console.log('⏰ 超时30秒，强制清除loading');
            setIsFirstLaunch(false);
          }, FIRST_LAUNCH_TIMEOUT);

          // 监听索引完成事件
          handleIndexingComplete = () => {
            console.log('✅ 收到索引完成事件，清除loading');
            if (timeoutId) clearTimeout(timeoutId);
            setIsFirstLaunch(false);
          };

          window.electron.on('indexing-complete', handleIndexingComplete);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };
    
    loadData();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (handleIndexingComplete) {
        window.electron.removeListener('indexing-complete', handleIndexingComplete);
      }
    };
  }, []);

  return isFirstLaunch;
};


