import React from 'react';
import { SearchResult } from './ResultList';

interface ResultPreviewProps {
  result: SearchResult | null;
  query: string;
}

/**
 * 应用预览组件
 */
const AppPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  const [appInfo, setAppInfo] = React.useState<any>(null);
  const [appDetails, setAppDetails] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // 加载应用信息的函数
  const loadAppInfo = React.useCallback(() => {
    if (result.action.startsWith('app:')) {
      const appId = result.action.replace('app:', '');
      setLoading(true);
      // 先获取基本应用信息
      window.electron.app.getAll().then(apps => {
        const app = apps.find((a: any) => a.id === appId);
        setAppInfo(app);
        
        // 获取详细信息（包括安装时间等）
        if (app) {
          window.electron.app.getInfo(appId).then((response: any) => {
            if (response.success) {
              setAppDetails(response.info);
            }
            setLoading(false);
          }).catch(() => {
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [result.action]); // 依赖 action 而不是整个 result

  React.useEffect(() => {
    loadAppInfo();
  }, [loadAppInfo]);

  const handleRevealFolder = () => {
    if (result.action.startsWith('app:')) {
      const appId = result.action.replace('app:', '');
      window.electron.app.revealFolder(appId).catch(err => {
        console.error('打开文件夹失败:', err);
      });
    }
  };

  const formatDate = (date: Date | string) => {
    if (!date) return '未知';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">应用信息</h3>
      {appInfo ? (
        <div className="space-y-4">
          {/* 应用图标和名称 */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            {appInfo.icon && (
              <img 
                src={appInfo.icon} 
                alt={appInfo.name}
                className="w-16 h-16 rounded-lg object-contain flex-shrink-0"
                onError={(e) => {
                  // 图标加载失败时隐藏
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{appInfo.name}</h4>
              {appInfo.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{appInfo.description}</p>
              )}
            </div>
          </div>

          {/* 路径 */}
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">路径</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-all font-mono leading-relaxed">{appInfo.path || '未知'}</p>
          </div>

          {/* 安装时间 */}
          {appDetails?.installDate && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">安装时间</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{formatDate(appDetails.installDate)}</p>
            </div>
          )}

          {/* 分类 */}
          {appInfo.category && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">分类</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{appInfo.category}</p>
            </div>
          )}

          {/* 使用统计 */}
          {(appInfo.launchCount !== undefined || appInfo.lastUsed) && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">使用统计</span>
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
                {appInfo.launchCount !== undefined && (
                  <p>启动次数: {appInfo.launchCount}</p>
                )}
                {appInfo.lastUsed && (
                  <p>最后使用: {formatDate(appInfo.lastUsed)}</p>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleRevealFolder}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
            >
              打开安装文件夹
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">无法获取应用详细信息</p>
      )}
    </div>
  );
};

/**
 * 文件预览组件
 */
const FilePreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  const filePath = result.action.startsWith('file:') 
    ? result.action.replace('file:', '')
    : result.description || '';

  const [fileInfo, setFileInfo] = React.useState<any>(null);
  const [loadingSize, setLoadingSize] = React.useState(true);

  // 从路径中提取文件名
  const getFileName = (path: string): string => {
    if (!path) return '未知';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  const fileName = getFileName(filePath);

  // 异步加载文件信息
  React.useEffect(() => {
    if (filePath) {
      setLoadingSize(true);
      window.electron.file.getInfo(filePath).then((response: any) => {
        if (response.success) {
          setFileInfo(response.info);
        }
        setLoadingSize(false);
      }).catch(() => {
        setLoadingSize(false);
      });
    } else {
      setLoadingSize(false);
    }
  }, [filePath]);

  const formatFileSize = (bytes: number): string => {
    if (!bytes && bytes !== 0) return '未知';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const handleOpenFile = () => {
    if (filePath) {
      window.electron.file.open(filePath).catch(err => {
        console.error('打开文件失败:', err);
      });
    }
  };

  const handleRevealFolder = () => {
    if (filePath) {
      window.electron.file.revealFolder(filePath).catch(err => {
        console.error('打开文件夹失败:', err);
      });
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">文件信息</h3>
      <div className="space-y-4">
        {/* 文件名 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件名</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{fileName}</p>
        </div>

        {/* 文件大小（异步加载） */}
        {fileInfo && !fileInfo.isDirectory && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件大小</span>
            </div>
            {loadingSize ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">加载中...</p>
            ) : (
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                {formatFileSize(fileInfo.size)}
              </p>
            )}
          </div>
        )}

        {/* 路径 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">路径</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-all font-mono leading-relaxed">{filePath}</p>
        </div>

        {result.description && filePath !== result.description && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">描述</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{result.description}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleOpenFile}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors mr-4"
          >
            打开文件
          </button>
          <button
            onClick={handleRevealFolder}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
          >
            打开文件夹
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 网页预览组件
 */
const WebPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  const url = result.action.startsWith('web:') 
    ? result.action.replace('web:', '')
    : result.description || '';

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">网页搜索</h3>
      <div className="space-y-4">
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-all leading-relaxed">{url}</p>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            按 Enter 键在浏览器中打开
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 书签预览组件
 */
const BookmarkPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  const url = result.action.startsWith('bookmark:') 
    ? result.action.replace('bookmark:', '')
    : result.description || '';
  const title = result.title || '未知标题';

  const handleCopyUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        console.log('URL copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy URL:', err);
      });
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">书签信息</h3>
      <div className="space-y-4">
        {/* 标题 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">标题</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{title}</p>
        </div>

        {/* 网址 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">网址</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-all font-mono leading-relaxed">{url}</p>
        </div>

        {/* 操作按钮 */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCopyUrl}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
          >
            复制网址
          </button>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            按 Enter 键在浏览器中打开
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 命令预览组件
 */
const CommandPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">命令</h3>
      <div className="space-y-4">
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">命令</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed">{result.title}</p>
        </div>
        {result.description && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">描述</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{result.description}</p>
          </div>
        )}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            按 Enter 键执行命令
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 计算器结果预览组件
 */
const CalculatorPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  if (!result.calcData) return null;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">计算结果</h3>
      <div className="space-y-4">
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">输入</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed">{result.calcData.input || '(空)'}</p>
        </div>
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed">{result.calcData.output || '(无结果)'}</p>
        </div>
        {result.calcData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{result.calcData.error}</p>
          </div>
        )}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            按 Enter 键复制结果
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * 默认预览组件
 */
const DefaultPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">详细信息</h3>
      <div className="space-y-4">
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">标题</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{result.title}</p>
        </div>
        {result.description && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">描述</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words">{result.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 结果预览主组件
 */
export const ResultPreview: React.FC<ResultPreviewProps> = ({ result, query }) => {
  if (!result) {
    return (
      <div className="w-full h-full flex items-center justify-center min-h-[200px]">
        <div className="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            选择一项查看详情
          </p>
        </div>
      </div>
    );
  }

  // 如果有计算器数据，优先显示计算器预览
  if (result.calcData) {
    return (
      <div className="w-full">
        <CalculatorPreview result={result} />
      </div>
    );
  }

  // 如果是书签，使用书签预览组件
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
          <WebPreview result={result} />
        </div>
      );
    case 'command':
      return (
        <div className="w-full">
          <CommandPreview result={result} />
        </div>
      );
    default:
      return (
        <div className="w-full">
          <DefaultPreview result={result} />
        </div>
      );
  }
};

