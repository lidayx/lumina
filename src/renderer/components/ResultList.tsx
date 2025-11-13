import React, { useRef, useEffect, useMemo } from 'react';
import { highlightText } from '../utils/highlightText';
import { getTypeIcon, getTypeColor, TodoPriorityIcon } from '../utils/resultIcons';

export interface SearchResult {
  id: string;
  type: 'app' | 'file' | 'command' | 'web' | 'history' | 'encode' | 'string' | 'time';
  title: string;
  description?: string;
  icon?: string;
  action: string;
  score: number;
  priorityScore?: number;
  calcData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  };
  encodeData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  };
  stringData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  };
  timeData?: {
    input: string;
    output: string;
    success: boolean;
    error?: string;
  };
  todoData?: {
    id: number;
    content: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'done';
    createdAt: number;
    completedAt?: number;
    tags?: string;
  };
  suggestionData?: unknown;
  isTodoModifyOperation?: boolean;
}

interface ResultListProps {
  results: SearchResult[];
  selectedIndex: number;
  query: string;
  onSelect: (index: number) => void;
  onHover?: (index: number) => void;
}

/**
 * 结果项组件 Props
 */
interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  query: string;
  onSelect: () => void;
  onHover?: () => void;
  itemRef: (el: HTMLDivElement | null) => void;
}

/**
 * 图标渲染组件（使用 memo 优化性能）
 */
const ResultIcon: React.FC<{
  icon?: string;
  type: string;
  title?: string;
  description?: string;
}> = React.memo(({ icon, type, title, description }) => {
  const typeColorClass = useMemo(() => getTypeColor(type), [type]);
  const typeIconElement = useMemo(
    () => getTypeIcon(type, title, description),
    [type, title, description]
  );

  // 如果有自定义图标（data URI 或文件路径）
  if (icon && (icon.startsWith('data:') || icon.startsWith('file://'))) {
    return (
      <img
        src={icon}
        alt={title || ''}
        className="w-10 h-10 rounded"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // 使用类型图标
  return <div className={typeColorClass}>{typeIconElement}</div>;
}, (prevProps, nextProps) => {
  // 只有当图标相关属性变化时才重新渲染
  return (
    prevProps.icon === nextProps.icon &&
    prevProps.type === nextProps.type &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description
  );
});
ResultIcon.displayName = 'ResultIcon';

/**
 * 结果项组件（使用 memo 优化性能）
 */
const ResultItem = React.memo<ResultItemProps>(
  ({ result, isSelected, query, onSelect, onHover, itemRef }) => {
    // 使用 useMemo 缓存高亮文本
    const highlightedTitle = useMemo(
      () => highlightText(result.title, query),
      [result.title, query]
    );
    const highlightedDescription = useMemo(
      () => result.description ? highlightText(result.description, query) : null,
      [result.description, query]
    );

    // 使用 useMemo 缓存样式类名
    const itemClassName = useMemo(
      () =>
        `flex items-center px-4 py-2.5 rounded cursor-pointer transition-all duration-150 ease-in-out ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-700 transform scale-[1.02] shadow-sm'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`,
      [isSelected]
    );

    return (
      <div
        ref={itemRef}
        onClick={onSelect}
        onMouseEnter={onHover}
        className={itemClassName}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
          <ResultIcon
            icon={result.icon}
            type={result.type}
            title={result.title}
            description={result.description}
          />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1 min-w-0 overflow-hidden">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate break-words flex items-center gap-1.5">
            {/* TODO 优先级图标 */}
            {result.todoData?.priority && (
              <span className="flex-shrink-0">
                <TodoPriorityIcon priority={result.todoData.priority} />
              </span>
            )}
            <span>{highlightedTitle}</span>
          </div>
          {highlightedDescription && (
            <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5 break-words">
              {highlightedDescription}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数：只有当关键属性变化时才重新渲染
    return (
      prevProps.result.id === nextProps.result.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.result.title === nextProps.result.title &&
      prevProps.result.description === nextProps.result.description &&
      prevProps.result.icon === nextProps.result.icon &&
      prevProps.result.type === nextProps.result.type &&
      prevProps.result.todoData?.priority === nextProps.result.todoData?.priority &&
      prevProps.query === nextProps.query
    );
  }
);

ResultItem.displayName = 'ResultItem';

/**
 * 空结果组件
 */
const EmptyResult: React.FC = () => (
  <div className="flex items-center px-4 py-2.5">
    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>
    <div className="ml-3 flex-1 min-w-0">
      <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配结果</p>
    </div>
  </div>
);

/**
 * 结果列表组件
 */
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
    const selectedItem = itemRefs.current[selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  // 性能优化：重置 refs 数组大小
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, results.length);
  }, [results.length]);

  // 使用 useMemo 缓存结果项列表，避免不必要的重新渲染
  const resultItems = useMemo(() => {
    return results.map((result, index) => {
      const isSelected = index === selectedIndex;
      
      return (
        <ResultItem
          key={result.id}
          result={result}
          isSelected={isSelected}
          query={query}
          onSelect={() => onSelect(index)}
          onHover={onHover ? () => onHover(index) : undefined}
          itemRef={(el) => {
            itemRefs.current[index] = el;
          }}
        />
      );
    });
  }, [results, selectedIndex, query, onSelect, onHover]);

  if (results.length === 0) {
    return <EmptyResult />;
  }

  return <div className="space-y-0.5">{resultItems}</div>;
};

