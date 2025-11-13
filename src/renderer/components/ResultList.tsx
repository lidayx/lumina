import React, { useRef, useEffect } from 'react';
import { highlightText } from '../utils/highlightText';

export interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'command' | 'web' | 'history' | 'encode' | 'string' | 'time';
  title: string;
  description?: string;
  icon?: string;
  action: string;
  score: number;
  priorityScore?: number; // 类型优先级评分
  calcData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  }; // 计算器结果数据
  encodeData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  }; // 编码解码结果数据
  stringData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  }; // 字符串工具结果数据
  timeData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  }; // 时间工具结果数据
  todoData?: {
    id: number;
    content: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'done';
    createdAt: number;
    completedAt?: number;
    tags?: string;
  }; // TODO 任务数据
  suggestionData?: any; // 补全建议数据（用于Tab补全）
  isTodoModifyOperation?: boolean; // 标记是否是 TODO 修改操作（创建、删除、编辑、完成）的确认提示
}

interface ResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  query: string; // 查询关键词，用于高亮
  onSelect: (index: number) => void;
  onHover?: (index: number) => void; // 鼠标悬停时的回调
}

/**
 * 从标题或 URL 中识别搜索引擎
 */
const getSearchEngine = (title: string, description?: string): string | null => {
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  // 从标题中提取（格式：在 百度 搜索）
  if (titleLower.includes('百度') || descLower.includes('baidu.com')) {
    return 'baidu';
  }
  if (titleLower.includes('google') || descLower.includes('google.com')) {
    return 'google';
  }
  if (titleLower.includes('bing') || descLower.includes('bing.com')) {
    return 'bing';
  }
  if (titleLower.includes('github') || descLower.includes('github.com')) {
    return 'github';
  }
  if (titleLower.includes('知乎') || descLower.includes('zhihu.com')) {
    return 'zhihu';
  }
  
  return null;
};

/**
 * 获取搜索引擎的 SVG logo
 */
const getSearchEngineIcon = (engine: string) => {
  switch (engine) {
    case 'baidu':
      return (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#2932E1"/>
          {/* 百度熊掌图标 - 4个脚趾 + 手掌，放大尺寸 */}
          <circle cx="8.5" cy="9" r="1.8" fill="white"/>
          <circle cx="11.5" cy="7.5" r="1.8" fill="white"/>
          <circle cx="14.5" cy="9" r="1.8" fill="white"/>
          <circle cx="13" cy="10.5" r="1.8" fill="white"/>
          <ellipse cx="12" cy="14" rx="3.5" ry="2.8" fill="white"/>
        </svg>
      );
    case 'google':
      return (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case 'bing':
      return (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
          <path d="M5.5 3.5h4.5l-1 4 7 5-2 1L5.5 3.5zm-.5.5L2.5 19l7-3.5-2-1L3 4zm13.5 0L12.5 9l2 1 6.5-4.5h-2zm2 0L21 4.5l-6.5 4.5 2 1 6.5-4.5zm-6.5 4.5l-2-1L5 4.5 3 4.5l6.5 4.5z" fill="#008373"/>
        </svg>
      );
    case 'github':
      return (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="#181717"/>
        </svg>
      );
    case 'zhihu':
      return (
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none">
          <path d="M12.344 0C5.562 0 0 5.562 0 12.344S5.562 24.688 12.344 24.688 24.688 19.126 24.688 12.344 19.126 0 12.344 0zm.96 18.304h-1.92v-4.608h1.92v4.608zm0-5.76h-1.92V5.76h1.92v6.784z" fill="#0084FF"/>
        </svg>
      );
    default:
      return null;
  }
};

const getTypeIcon = (type: string, title?: string, description?: string) => {
  switch (type) {
    case 'app':
      return (
        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case 'file':
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'web':
      // 尝试识别搜索引擎并返回对应的 logo
      if (title || description) {
        const engine = getSearchEngine(title || '', description);
        if (engine) {
          const engineIcon = getSearchEngineIcon(engine);
          if (engineIcon) {
            return engineIcon;
          }
        }
      }
      // 默认返回地球图标
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      );
    case 'command':
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case 'encode':
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    case 'string':
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    case 'time':
      return (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return (
        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
      );
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'app':
      return 'text-blue-500';
    case 'file':
      return 'text-gray-500';
    case 'web':
      return 'text-purple-500';
    case 'command':
      return 'text-purple-500';
    case 'encode':
      return 'text-green-500';
    case 'string':
      return 'text-orange-500';
    case 'time':
      return 'text-indigo-500';
    default:
      return 'text-gray-500';
  }
};

// 性能优化：单个结果项组件，使用 memo 避免不必要的重渲染
const ResultItem = React.memo<{
  result: SearchResult;
  index: number;
  isSelected: boolean;
  query: string; // 查询关键词，用于高亮
  onSelect: () => void;
  onHover?: () => void; // 鼠标悬停回调
  itemRef: (el: HTMLDivElement | null) => void;
}>(({ result, index, isSelected, query, onSelect, onHover, itemRef }) => {
  // 调试图标渲染
  if (index === 0 && result.icon) {
    console.log('🔍 [前端渲染] 第一个结果图标:', {
      title: result.title,
      hasIcon: !!result.icon,
      iconLength: result.icon.length,
      iconType: result.icon.substring(0, 30),
      iconStartsWithData: result.icon.startsWith('data:'),
      iconStartsWithFile: result.icon.startsWith('file://')
    });
  }
  
  return (
    <div
      key={result.id}
      ref={itemRef}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`
        flex items-center px-4 py-2.5 rounded cursor-pointer 
        transition-all duration-150 ease-in-out
        ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-700 transform scale-[1.02] shadow-sm'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
        {result.icon ? (
          <>
            {/* data URI 或本地文件路径 */}
            {result.icon.startsWith('data:') || result.icon.startsWith('file://') ? (
              <img 
                src={result.icon} 
                alt={result.title}
                className="w-10 h-10 rounded"
                loading="lazy" // 性能优化：懒加载图标
                onError={(e) => {
                  // 图标加载失败时显示默认图标
                  console.error(`❌ [前端渲染] 图标加载失败: ${result.title}`, e);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  if (index === 0) {
                    console.log('✅ [前端渲染] 图标加载成功:', result.title);
                  }
                }}
              />
            ) : (
              <div className={`${getTypeColor(result.type)}`}>
                {getTypeIcon(result.type, result.title, result.description)}
              </div>
            )}
          </>
        ) : (
          <div className={`${getTypeColor(result.type)}`}>
            {getTypeIcon(result.type, result.title, result.description)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="ml-3 flex-1 min-w-0 overflow-hidden">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate break-words flex items-center gap-1.5">
          {/* 如果是 TODO 任务，显示优先级图标（红绿灯样式） */}
          {result.todoData && (
            <span className="flex-shrink-0">
              {result.todoData.priority === 'high' ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#FEE2E2" opacity="0.3"/>
                </svg>
              ) : result.todoData.priority === 'low' ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#059669" stroke="#047857" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#D1FAE5" opacity="0.3"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#D97706" stroke="#92400E" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#FEF3C7" opacity="0.3"/>
                </svg>
              )}
            </span>
          )}
          <span>{highlightText(result.title, query)}</span>
        </div>
        {result.description && (
          <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5 break-words">
            {highlightText(result.description, query)}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有当关键属性变化时才重新渲染
  return (
    prevProps.result.id === nextProps.result.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.result.title === nextProps.result.title &&
    prevProps.result.description === nextProps.result.description &&
    prevProps.result.icon === nextProps.result.icon &&
    prevProps.result.todoData?.priority === nextProps.result.todoData?.priority &&
    prevProps.query === nextProps.query
  );
});

ResultItem.displayName = 'ResultItem';

export const ResultList: React.FC<ResultListProps> = ({
  results,
  selectedIndex,
  query,
  onSelect,
  onHover,
}) => {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 当选中的索引变化时，滚动到该项
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // 性能优化：重置 refs 数组大小
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, results.length);
  }, [results.length]);

  if (results.length === 0) {
    return (
      <div className="flex items-center px-4 py-2.5">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配结果</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {results.map((result, index) => (
        <ResultItem
          key={result.id}
          result={result}
          index={index}
          isSelected={index === selectedIndex}
          query={query}
          onSelect={() => onSelect(index)}
          onHover={onHover ? () => onHover(index) : undefined}
          itemRef={(el) => {
            itemRefs.current[index] = el;
          }}
        />
      ))}
    </div>
  );
};

