import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const FilePreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  const filePath = useMemo(() => {
    return result.action.startsWith('file:') 
    ? result.action.replace('file:', '')
    : result.description || '';
  }, [result.action, result.description]);

  const fileName = useMemo(() => getFileName(filePath), [filePath]);

  const [fileInfo, setFileInfo] = useState<any>(null);
  const [imageSize, setImageSize] = useState<any>(null);
  const [loadingSize, setLoadingSize] = useState(true);

  // 检查是否为图片文件
  const isImageFile = useMemo(() => {
    return fileInfo?.ext && IMAGE_EXTENSIONS.includes(fileInfo.ext);
  }, [fileInfo?.ext]);

  // 加载文件信息
  useEffect(() => {
    if (!filePath) {
      setLoadingSize(false);
      return;
    }

      setLoadingSize(true);
    window.electron.file.getInfo(filePath)
      .then((response: any) => {
        if (response.success) {
          setFileInfo(response.info);
          
          // 如果是图片文件，异步加载图片尺寸
          if (response.info.ext && IMAGE_EXTENSIONS.includes(response.info.ext)) {
            window.electron.file.getImageSize(filePath)
              .then((imgResponse: any) => {
              if (imgResponse.success) {
                setImageSize(imgResponse);
              }
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingSize(false);
      });
  }, [filePath]);

  const handleOpenFile = useCallback(() => {
    if (filePath) {
      window.electron.file.open(filePath).catch(err => {
        console.error('打开文件失败:', err);
      });
    }
  }, [filePath]);

  const handleRevealFolder = useCallback(() => {
    if (filePath) {
      window.electron.file.revealFolder(filePath).catch(err => {
        console.error('打开文件夹失败:', err);
      });
    }
  }, [filePath]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <PreviewTitle title="文件信息" />
      <div className="space-y-4">
        <PreviewField label="文件名" value={fileName} />

        {fileInfo && !fileInfo.isDirectory && (
          <>
            <PreviewField
              label="文件大小"
              value={loadingSize ? '加载中...' : formatFileSize(fileInfo.size)}
            />
            <PreviewField
              label="文件类型"
              value={fileInfo.mimeType || (fileInfo.ext ? fileInfo.ext : '-')}
            />
          </>
        )}

        <PreviewField label="创建时间" value={fileInfo?.createdDate ? formatDate(fileInfo.createdDate) : '-'} />
        <PreviewField label="修改时间" value={fileInfo?.modifiedDate ? formatDate(fileInfo.modifiedDate) : '-'} />

        {fileInfo && !fileInfo.isDirectory && (
          <PreviewField label="访问权限" value={formatPermissions(fileInfo)} />
        )}

        {fileInfo && !fileInfo.isDirectory && (fileInfo.md5 || fileInfo.sha256) && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件哈希</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {fileInfo.md5 && <p className="font-mono text-xs break-all">MD5: {fileInfo.md5}</p>}
              {fileInfo.sha256 && <p className="font-mono text-xs break-all">SHA256: {fileInfo.sha256}</p>}
            </div>
          </div>
        )}

        {fileInfo && !fileInfo.isDirectory && fileInfo.encoding && (
          <PreviewField label="文件编码" value={fileInfo.encoding || '-'} />
        )}

        {fileInfo && !fileInfo.isDirectory && (fileInfo.lineCount !== undefined || fileInfo.charCount !== undefined) && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文本统计</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {fileInfo.lineCount !== undefined && <p>行数: {fileInfo.lineCount}</p>}
              {fileInfo.charCount !== undefined && <p>字符数: {fileInfo.charCount}</p>}
            </div>
          </div>
        )}

        {isImageFile && (
          <PreviewField
            label="图片尺寸"
            value={imageSize?.success ? `${imageSize.width} × ${imageSize.height} 像素` : '-'}
          />
        )}

        <PreviewField label="路径" value={filePath} monospace className="break-all" />

        {result.description && filePath !== result.description && (
          <PreviewField label="描述" value={result.description} />
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <ActionButton onClick={handleOpenFile} className="mr-4">打开文件</ActionButton>
          <ActionButton onClick={handleRevealFolder}>打开文件夹</ActionButton>
        </div>
      </div>
    </div>
  );
});
FilePreview.displayName = 'FilePreview';
