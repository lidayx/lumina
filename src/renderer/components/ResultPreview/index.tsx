import React, { memo } from 'react';
import { SearchResult } from '../ResultList';
import {
  AppPreview,
  FilePreview,
  WebPreview,
  BookmarkPreview,
  CommandPreview,
  CalculatorPreview,
  EncodePreview,
  StringPreview,
  TimePreview,
  TodoPreview,
  DefaultPreview,
} from './previews';

export interface ResultPreviewProps {
  result: SearchResult | null;
  query: string;
}

/**
 * 结果预览主组件
 */
export const ResultPreview: React.FC<ResultPreviewProps> = memo(({ result, query }) => {
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[200px]">
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">选择一项查看详情</p>
        </div>
      </div>
    );
  }

  // 根据数据类型和类型选择预览组件
  if (result.calcData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <CalculatorPreview result={result} />
      </div>
    );
  }

  if (result.encodeData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <EncodePreview result={result} />
      </div>
    );
  }

  if (result.stringData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <StringPreview result={result} />
      </div>
    );
  }

  if (result.timeData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <TimePreview result={result} />
      </div>
    );
  }

  if (result.todoData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <TodoPreview result={result} />
      </div>
    );
  }

  if (result.action.startsWith('bookmark:')) {
    return (
      <div className="w-full">
        <BookmarkPreview result={result} />
      </div>
    );
  }

  // 根据类型显示不同的预览
  switch (result.type) {
    case 'app':
      return (
        <div className="w-full">
          <AppPreview result={result} />
        </div>
      );
    case 'file':
      return (
        <div className="w-full">
          <FilePreview result={result} />
        </div>
      );
    case 'web':
      return (
        <div className="w-full">
          <WebPreview result={result} query={query} />
        </div>
      );
    case 'command':
      return (
        <div className="w-full">
          <CommandPreview result={result} />
        </div>
      );
    case 'encode':
      return (
        <div className="w-full">
          <EncodePreview result={result} />
        </div>
      );
    case 'string':
      return (
        <div className="w-full">
          <StringPreview result={result} />
        </div>
      );
    case 'time':
      return (
        <div className="w-full">
          <TimePreview result={result} />
        </div>
      );
    default:
      return (
        <div className="w-full">
          <DefaultPreview result={result} />
        </div>
      );
  }
});
ResultPreview.displayName = 'ResultPreview';

