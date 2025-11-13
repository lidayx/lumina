import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const TimePreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  if (!result.timeData) return null;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <PreviewTitle title="时间工具结果" />
      <div className="space-y-4">
        <PreviewField label="输入" value={result.timeData.input || '(空)'} monospace className="break-all whitespace-pre-wrap" />
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">
            {result.timeData.output || '(无结果)'}
          </p>
        </div>
        {result.timeData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{result.timeData.error}</p>
          </div>
        )}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键复制结果</p>
        </div>
      </div>
    </div>
  );
});
TimePreview.displayName = 'TimePreview';
