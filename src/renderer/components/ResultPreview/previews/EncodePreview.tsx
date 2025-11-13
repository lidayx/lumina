import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const EncodePreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  if (!result.encodeData) return null;

  const operationType = useMemo(() => {
    const inputLower = (result.encodeData?.input || '').toLowerCase();
    if (/decode|解码|jiema|jiemi|jm/.test(inputLower)) return '解码';
    if (/encode|编码|bianma|jiami|bm/.test(inputLower)) return '编码';
    if (/md5/.test(inputLower)) return '加密';
    return '编码解码';
  }, [result.encodeData?.input]);

  const outputValue = useMemo(() => {
    if (!result.encodeData) return '(无结果)';
    if (result.encodeData.success) {
      return result.encodeData.output.includes(' → ') 
        ? result.encodeData.output.split(' → ')[1] 
        : result.encodeData.output || '(无结果)';
    }
    return result.encodeData.error || '(无结果)';
  }, [result.encodeData]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <PreviewTitle title={`${operationType}结果`} />
      <div className="space-y-4">
        <PreviewField label="输入" value={result.encodeData.input || '(空)'} monospace className="break-all whitespace-pre-wrap" />
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{operationType}结果</span>
          </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">
            {outputValue}
            </p>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键复制结果</p>
        </div>
      </div>
    </div>
  );
});
EncodePreview.displayName = 'EncodePreview';
