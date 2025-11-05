import React, { useRef, useEffect } from 'react';

export interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'command' | 'web' | 'history';
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
}

interface ResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const getTypeIcon = (type: string) => {
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
    default:
      return 'text-gray-500';
  }
};

// 性能优化：单个结果项组件，使用 memo 避免不必要的重渲染
const ResultItem = React.memo<{
  result: SearchResult;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}>(({ result, index, isSelected, onSelect, itemRef }) => {
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
      className={`
        flex items-center px-4 py-2.5 rounded cursor-pointer transition-colors
        ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-700'
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
                {getTypeIcon(result.type)}
              </div>
            )}
          </>
        ) : (
          <div className={`${getTypeColor(result.type)}`}>
            {getTypeIcon(result.type)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="ml-3 flex-1 min-w-0 overflow-hidden">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {result.title}
        </div>
        {result.description && (
          <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
            {result.description}
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
    prevProps.result.icon === nextProps.result.icon
  );
});

ResultItem.displayName = 'ResultItem';

export const ResultList: React.FC<ResultListProps> = ({
  results,
  selectedIndex,
  onSelect,
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
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/50 mb-3">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配结果</p>
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
          onSelect={() => onSelect(index)}
          itemRef={(el) => {
            itemRefs.current[index] = el;
          }}
        />
      ))}
    </div>
  );
};

