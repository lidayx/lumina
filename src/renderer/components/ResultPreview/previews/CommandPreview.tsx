import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const CommandPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
    <PreviewTitle title="命令" />
      <div className="space-y-4">
      <PreviewField label="命令" value={result.title} monospace className="break-all" />
      {result.description && <PreviewField label="描述" value={result.description} />}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键执行命令</p>
        </div>
      </div>
    </div>
));
CommandPreview.displayName = 'CommandPreview';
