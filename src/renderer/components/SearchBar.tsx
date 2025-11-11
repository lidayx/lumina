import React, { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onEscape?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  isLoading?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  onTabComplete?: () => void; // Tab补全回调
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onEscape,
  placeholder = '搜索应用、文件或命令...',
  autoFocus = true,
  isLoading = false,
  query: externalQuery,
  onQueryChange,
  onTabComplete,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 使用外部传入的 query，如果没有则使用内部状态
  const query = externalQuery !== undefined ? externalQuery : internalQuery;

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // 延迟一点确保窗口完全显示后再聚焦
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // 监听窗口显示事件，自动聚焦输入框
  useEffect(() => {
    const handleFocus = () => {
      if (inputRef.current && !inputRef.current.matches(':focus')) {
        inputRef.current.focus();
      }
    };

    const handleMainWindowShow = () => {
      // 主窗口显示时，延迟一点后聚焦
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    };

    // 窗口获得焦点时聚焦输入框
    window.addEventListener('focus', handleFocus);
    
    // 监听主窗口显示事件
    if (window.electron) {
      window.electron.on('main-window-show', handleMainWindowShow);
    }
    
    // 组件挂载时也聚焦
    handleFocus();

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (window.electron) {
        window.electron.removeListener('main-window-show', handleMainWindowShow);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onQueryChange) {
      onQueryChange(value);
    } else {
      setInternalQuery(value);
    }
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (query) {
        // 如果有内容，清空内容
        if (onQueryChange) {
          onQueryChange('');
        } else {
          setInternalQuery('');
        }
        onSearch('');
      } else {
        // 如果已经为空，隐藏窗口
        if (onEscape) {
          onEscape();
        }
      }
    } else if (e.key === 'Tab' && onTabComplete && !e.shiftKey) {
      // Tab补全：如果当前有选中的补全建议，自动填充
      e.preventDefault();
      onTabComplete();
    }
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? '正在初始化（仅首次需要）...' : placeholder}
        disabled={isLoading}
        className="block w-full pl-10 pr-10 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {isLoading && !query && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      {!isLoading && query && (
        <button
          onClick={() => {
            if (onQueryChange) {
              onQueryChange('');
            } else {
              setInternalQuery('');
            }
            onSearch('');
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

