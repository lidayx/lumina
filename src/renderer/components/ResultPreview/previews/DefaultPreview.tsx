import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const DefaultPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
    <PreviewTitle title="详细信息" />
      <div className="space-y-4">
      <PreviewField label="标题" value={result.title} />
      {result.description && <PreviewField label="描述" value={result.description} />}
          </div>
        </div>
));
DefaultPreview.displayName = 'DefaultPreview';
