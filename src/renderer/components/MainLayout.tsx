import React from 'react';
import { completionCache } from '../../shared/utils/completionCache';
import { SearchBar } from './SearchBar';
import { ResultList, SearchResult as SearchResultType } from './ResultList';
import { 
  WINDOW_HIDE_DELAY, 
  SEARCH_DEBOUNCE_DELAY_NORMAL, 
  SEARCH_DEBOUNCE_DELAY_COMPLETION,
} from './MainLayout/constants';
import { resetSearchState } from './MainLayout/utils';
import { useWindowResize } from './MainLayout/hooks/useWindowResize';
import { useFirstLaunch } from './MainLayout/hooks/useFirstLaunch';
import { usePreviewWindow } from './MainLayout/hooks/usePreviewWindow';
import { createSelectHandler, createKeyboardHandler } from './MainLayout/eventHandlers';
import { handleSearch } from './MainLayout/searchLogic/searchHandler';

interface MainLayoutProps {
  onExecute?: (result: SearchResultType) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ onExecute }) => {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [results, setResults] = React.useState<SearchResultType[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showNoResult, setShowNoResult] = React.useState(false);
  const [ignoreHover, setIgnoreHover] = React.useState(false);
  
  // 使用 ref 来标记是否正在进行 TODO 操作（创建、删除、编辑）
  // ref 不会触发重新渲染，可以立即更新和读取
  const isTodoOperationRef = React.useRef(false);

  // 使用自定义 hooks
  const isFirstLaunch = useFirstLaunch();
  useWindowResize(query, results, showNoResult, isFirstLaunch);

  // 监听主窗口显示事件，清空输入并获取焦点
  React.useEffect(() => {
    const handleMainWindowShow = () => {
      console.log('主窗口显示，清空输入并获取焦点');
      resetSearchState(setQuery, setResults, setSelectedIndex, setIgnoreHover, setLoading);
    };

    window.electron.on('main-window-show', handleMainWindowShow);

    return () => {
      window.electron.removeListener('main-window-show', handleMainWindowShow);
    };
  }, []);


  // 隐藏主窗口的辅助函数
  const hideMainWindow = React.useCallback(() => {
    // 先隐藏预览窗口（立即执行，不等待状态更新）
    window.electron.preview.hide().catch((err: any) => {
      console.error('Failed to hide preview window:', err);
    });
    // 重置搜索状态
    resetSearchState(setQuery, setResults, setSelectedIndex, setIgnoreHover, setLoading);
    // 延迟隐藏窗口，确保状态更新完成
    setTimeout(() => {
      window.electron.windowHide('main').catch((err: any) => {
        console.error('Failed to hide window:', err);
      });
    }, WINDOW_HIDE_DELAY);
  }, []);
  
  // 延迟显示"未找到匹配结果"
  React.useEffect(() => {
    if (loading || !query) {
      setShowNoResult(false);
      return;
    }
    
    const timer = setTimeout(() => {
      if (results.length === 0 && !loading) {
        setShowNoResult(true);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [query, results, loading]);


  const handleSearchChange = (searchQuery: string) => {
    setQuery(searchQuery);
    setSelectedIndex(0);
  };

  // 搜索应用和文件
  React.useEffect(() => {
    // 如果正在进行 TODO 操作（创建、删除、编辑），不执行搜索
    if (isTodoOperationRef.current) {
      console.log('⏱️ [防抖] 检测到 TODO 操作，跳过搜索');
      return;
    }
    
    // 防抖搜索（统一防抖，所有搜索同时执行）
    // 补全查询使用较短延迟，普通搜索使用较长延迟
    const isCompletionQuery = query.trim().length > 0 && (
      query.trim().startsWith('>') || // 命令模式
      /^(?:translate|翻译|fanyi|fy|en|zh|cn|url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|pwd|password|密码|uuid|random|time|时间|timestamp|date|日期|uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract|varname|变量名)/i.test(query.trim())
    );
    const debounceDelay = isCompletionQuery
      ? SEARCH_DEBOUNCE_DELAY_COMPLETION
      : SEARCH_DEBOUNCE_DELAY_NORMAL;

    console.log('⏱️ [防抖] 设置延迟:', debounceDelay, 'ms, query:', query);
    const timer = setTimeout(() => {
      // 再次检查是否正在进行 TODO 操作
      if (isTodoOperationRef.current) {
        console.log('⏱️ [防抖] 延迟结束，但检测到 TODO 操作，跳过搜索');
        return;
      }
      console.log('⏱️ [防抖] 延迟结束，开始执行搜索');
      handleSearch(
        query,
        setResults,
        setSelectedIndex,
        setIgnoreHover,
        setLoading,
        setShowNoResult
      );
    }, debounceDelay);
    return () => {
      console.log('⏱️ [防抖] 清除定时器');
      clearTimeout(timer);
      // 定期清理过期缓存
      completionCache.clearExpired();
    };
  }, [query]); // 移除 appResults 依赖，直接通过 IPC 搜索

  // 处理鼠标悬停（只更新选中索引，不执行操作）
  const handleHover = (index: number) => {
    // 如果搜索结果刚刚更新，忽略悬停事件，保持第一个选中
    if (ignoreHover) {
      return;
    }
    if (index >= 0 && index < results.length) {
      setSelectedIndex(index);
    }
  };

  // 创建事件处理器
  const handleSelect = React.useCallback(
    createSelectHandler(
      results,
      selectedIndex,
      setSelectedIndex,
      setQuery,
      hideMainWindow,
      onExecute
    ),
    [results, selectedIndex, hideMainWindow, onExecute]
  );

  // 按类型分组结果（用于键盘导航）
  const groupResultsByType = React.useMemo(() => {
    const grouped: Record<string, typeof results> = {};
    results.forEach((result) => {
      const type = result.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });
    return grouped;
  }, [results]);

  // 获取下一个类型
  const getNextType = React.useCallback((currentType: string) => {
    const types = Object.keys(groupResultsByType).sort();
    if (types.length <= 1) return null;
    
    const currentIndex = types.indexOf(currentType);
    if (currentIndex === -1) return types[0];
    
    return types[(currentIndex + 1) % types.length];
  }, [groupResultsByType]);

  // 切换到指定类型的第一个结果
  const switchToType = React.useCallback((type: string) => {
    const typeResults = groupResultsByType[type];
    if (typeResults && typeResults.length > 0) {
      const firstResult = typeResults[0];
      const index = results.findIndex(r => r.id === firstResult.id);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [groupResultsByType, results]);

  // 键盘导航
  React.useEffect(() => {
    const handleKeyDown = createKeyboardHandler(
      results,
      selectedIndex,
      setSelectedIndex,
      setQuery,
      query,
      getNextType,
      switchToType,
      handleSelect,
      hideMainWindow,
      setResults,
      isTodoOperationRef
    );

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [results, selectedIndex, query, getNextType, switchToType, handleSelect, hideMainWindow]);

  // 获取当前选中的结果，用于预览
  const selectedResult = React.useMemo(() => {
    return results[selectedIndex] || null;
  }, [results, selectedIndex]);

  // 使用预览窗口 hook（传递 isTodoOperationRef 以阻止 TODO 操作期间的预览更新）
  usePreviewWindow(selectedResult, query, isTodoOperationRef);


  // 监听刷新搜索的消息
  React.useEffect(() => {
    const handleRefreshSearch = () => {
      console.log('[MainLayout] 收到刷新搜索消息，重新搜索');
      // 重新触发搜索：直接设置 query 会触发 searchAll
      if (query.trim()) {
        setQuery(query); // 这会触发 searchAll useEffect
      }
    };

    if (window.electron && window.electron.on) {
      window.electron.on('refresh-search', handleRefreshSearch);
    }

    return () => {
      if (window.electron && window.electron.off) {
        window.electron.off('refresh-search', handleRefreshSearch);
      }
    };
  }, [query]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-center p-4 overflow-x-hidden">
        <div className="w-full max-w-2xl flex flex-col min-w-0">
          {/* 主搜索框 */}
          <div className="w-full">
            <SearchBar 
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearchChange} 
              onEscape={() => hideMainWindow()}
              isLoading={isFirstLaunch} 
            />
          </div>

          {/* 搜索结果区域 */}
          {query && (
            <div className="w-full mt-2 max-h-[450px] overflow-y-auto overflow-x-hidden">
              {results.length > 0 ? (
                <ResultList results={results} selectedIndex={selectedIndex} query={query} onSelect={handleSelect} onHover={handleHover} />
              ) : showNoResult ? (
                <ResultList results={[]} selectedIndex={selectedIndex} query={query} onSelect={handleSelect} onHover={handleHover} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

