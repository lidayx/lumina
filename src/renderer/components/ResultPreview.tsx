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
  const [imageSize, setImageSize] = React.useState<any>(null);
  const [loadingSize, setLoadingSize] = React.useState(true);

  // 从路径中提取文件名
  const getFileName = (path: string): string => {
    if (!path) return '未知';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  const fileName = getFileName(filePath);

  // 格式化日期
  const formatDate = (date: Date | string | number): string => {
    if (!date) return '-';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化权限
  const formatPermissions = (info: any): string => {
    if (!info) return '-';
    const perms: string[] = [];
    if (info.readable) perms.push('读');
    if (info.writable) perms.push('写');
    if (info.mode && (info.mode & parseInt('111', 8))) perms.push('执行');
    return perms.length > 0 ? perms.join('、') : '-';
  };

  // 异步加载文件信息
  React.useEffect(() => {
    if (filePath) {
      setLoadingSize(true);
      window.electron.file.getInfo(filePath).then((response: any) => {
        if (response.success) {
          setFileInfo(response.info);
          
          // 如果是图片文件，异步加载图片尺寸
          if (response.info.ext && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(response.info.ext)) {
            window.electron.file.getImageSize(filePath).then((imgResponse: any) => {
              if (imgResponse.success) {
                setImageSize(imgResponse);
              }
            }).catch(() => {});
          }
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

        {/* 文件类型/MIME 类型 */}
        {fileInfo && !fileInfo.isDirectory && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件类型</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {fileInfo.mimeType || (fileInfo.ext ? fileInfo.ext : '-')}
            </p>
          </div>
        )}

        {/* 创建时间 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">创建时间</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
            {fileInfo?.createdDate ? formatDate(fileInfo.createdDate) : '-'}
          </p>
        </div>

        {/* 修改时间 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">修改时间</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
            {fileInfo?.modifiedDate ? formatDate(fileInfo.modifiedDate) : '-'}
          </p>
        </div>

        {/* 访问权限 */}
        {fileInfo && !fileInfo.isDirectory && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">访问权限</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {formatPermissions(fileInfo)}
            </p>
          </div>
        )}

        {/* 文件哈希 */}
        {fileInfo && !fileInfo.isDirectory && (fileInfo.md5 || fileInfo.sha256) && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件哈希</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {fileInfo.md5 && (
                <p className="font-mono text-xs break-all">MD5: {fileInfo.md5}</p>
              )}
              {fileInfo.sha256 && (
                <p className="font-mono text-xs break-all">SHA256: {fileInfo.sha256}</p>
              )}
            </div>
          </div>
        )}

        {/* 文件编码（文本文件） */}
        {fileInfo && !fileInfo.isDirectory && fileInfo.encoding && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文件编码</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {fileInfo.encoding || '-'}
            </p>
          </div>
        )}

        {/* 行数/字符数（文本文件） */}
        {fileInfo && !fileInfo.isDirectory && (fileInfo.lineCount !== undefined || fileInfo.charCount !== undefined) && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">文本统计</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {fileInfo.lineCount !== undefined && (
                <p>行数: {fileInfo.lineCount}</p>
              )}
              {fileInfo.charCount !== undefined && (
                <p>字符数: {fileInfo.charCount}</p>
              )}
            </div>
          </div>
        )}

        {/* 图片尺寸 */}
        {fileInfo && !fileInfo.isDirectory && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(fileInfo.ext || '') && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">图片尺寸</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {imageSize && imageSize.success ? `${imageSize.width} × ${imageSize.height} 像素` : '-'}
            </p>
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
const WebPreview: React.FC<{ result: SearchResult; query: string }> = ({ result, query }) => {
  const url = result.action.startsWith('web:') 
    ? result.action.replace('web:', '')
    : result.description || '';

  const [webInfo, setWebInfo] = React.useState<any>(null);
  const [searchHistory, setSearchHistory] = React.useState<any[]>([]);
  const [engines, setEngines] = React.useState<any[]>([]);

  // 从 URL 中提取搜索引擎名称
  const getEngineName = (url: string): string => {
    if (url.includes('baidu.com')) return '百度';
    if (url.includes('google.com')) return 'Google';
    if (url.includes('bing.com')) return 'Bing';
    if (url.includes('github.com')) return 'GitHub';
    return '-';
  };

  const engineName = getEngineName(url);

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 加载搜索引擎和搜索历史
  React.useEffect(() => {
    // 获取搜索引擎列表
    window.electron.web.getEngines().then(engs => {
      setEngines(engs || []);
    }).catch(() => {});

    // 获取搜索历史
    window.electron.web.getHistory(5).then(history => {
      setSearchHistory(history || []);
    }).catch(() => {});
  }, []);

  const handleCopySearchUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleSearchInEngine = (engineName: string) => {
    if (query) {
      window.electron.web.search(query, engineName).then(results => {
        if (results && results.length > 0) {
          window.electron.web.open(results[0].searchUrl).catch(() => {});
        }
      }).catch(() => {});
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">网页搜索</h3>
      <div className="space-y-4">
        {/* 搜索引擎 */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">搜索引擎</span>
          </div>
          <div className="flex items-center gap-2">
            {result.icon && (
              result.icon.startsWith('data:') || result.icon.startsWith('file://') ? (
                <img 
                  src={result.icon} 
                  alt={engineName}
                  className="w-5 h-5 rounded flex-shrink-0"
                  onError={(e) => {
                    // 图标加载失败时隐藏
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-lg">{result.icon}</span>
              )
            )}
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">{engineName}</p>
          </div>
        </div>

        {/* URL */}
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">URL</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 break-words break-all leading-relaxed">{url}</p>
        </div>

        {/* 搜索历史 */}
        {searchHistory.length > 0 && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">最近搜索</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {searchHistory.slice(0, 3).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="truncate flex-1">{item.query}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {item.count > 1 ? `${item.count}次` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleCopySearchUrl}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors mr-4"
          >
            复制搜索 URL
          </button>
          {engines.length > 1 && query && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">在其他搜索引擎中搜索：</div>
              <div className="flex flex-wrap gap-2">
                {engines.slice(0, 3).map((engine: any) => (
                  <button
                    key={engine.name}
                    onClick={() => handleSearchInEngine(engine.name)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
                  >
                    {engine.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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

  const [bookmarkInfo, setBookmarkInfo] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  // 格式化日期
  const formatDate = (date: Date | string | number): string => {
    if (!date) return '-';
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 获取网站安全状态
  const getSecurityStatus = (url: string): string => {
    if (!url) return '-';
    return url.startsWith('https://') ? 'HTTPS (安全)' : url.startsWith('http://') ? 'HTTP (不安全)' : '-';
  };

  // 异步加载书签信息
  React.useEffect(() => {
    if (url) {
      setLoading(true);
      window.electron.bookmark.getInfo(url).then((response: any) => {
        if (response.success) {
          setBookmarkInfo(response.info);
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [url]);

  const handleCopyUrl = () => {
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">书签信息</h3>
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 书签图标和标题 */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            {bookmarkInfo?.icon && (
              <img 
                src={bookmarkInfo.icon} 
                alt={title}
                className="w-8 h-8 rounded flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{title}</h4>
            </div>
          </div>

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

          {/* 网站安全状态 */}
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">安全状态</span>
            </div>
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {getSecurityStatus(url)}
            </p>
          </div>

          {/* 添加时间 */}
          {bookmarkInfo && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">添加时间</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                {bookmarkInfo.dateAdded ? formatDate(bookmarkInfo.dateAdded) : '-'}
              </p>
            </div>
          )}

          {/* 最后访问时间 */}
          {bookmarkInfo && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">最后访问</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                {bookmarkInfo.dateLastUsed ? formatDate(bookmarkInfo.dateLastUsed) : '-'}
              </p>
            </div>
          )}

          {/* 访问次数 */}
          {bookmarkInfo && bookmarkInfo.accessCount !== undefined && (
            <div>
              <div className="mb-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">访问次数</span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                {bookmarkInfo.accessCount || 0}
              </p>
            </div>
          )}

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
      )}
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

  // 生成计算步骤（简化版）
  const generateCalculationSteps = (input: string, output: string): string[] => {
    if (!input || !output) return [];
    
    const steps: string[] = [];
    const expr = input.trim();
    
    // 简单表达式：尝试解析运算符优先级
    // 例如: 2 + 3 * 4 = 2 + 12 = 14
    try {
      // 检查是否包含括号
      if (expr.includes('(') || expr.includes(')')) {
        steps.push(`处理括号表达式: ${expr}`);
        steps.push(`计算结果: ${output}`);
        return steps;
      }
      
      // 检查是否包含乘除
      const hasMulDiv = /[\*\/×÷]/.test(expr);
      const hasAddSub = /[\+\-]/.test(expr);
      
      if (hasMulDiv && hasAddSub) {
        // 先计算乘除
        steps.push(`先计算乘除运算`);
        steps.push(`然后计算加减运算`);
        steps.push(`最终结果: ${output}`);
      } else if (hasMulDiv) {
        steps.push(`执行乘除运算: ${expr}`);
        steps.push(`结果: ${output}`);
      } else if (hasAddSub) {
        steps.push(`执行加减运算: ${expr}`);
        steps.push(`结果: ${output}`);
      } else {
        // 简单表达式，直接显示
        steps.push(`${expr} = ${output}`);
      }
    } catch {
      // 解析失败，返回简单步骤
      steps.push(`计算表达式: ${expr}`);
      steps.push(`结果: ${output}`);
    }
    
    return steps;
  };

  const steps = generateCalculationSteps(result.calcData.input, result.calcData.output);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">计算结果</h3>
      <div className="space-y-4">
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">输入</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{result.calcData.input || '(空)'}</p>
        </div>
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{result.calcData.output || '(无结果)'}</p>
        </div>
        {/* 计算步骤 */}
        {steps.length > 0 && (
          <div className="max-w-full overflow-x-hidden">
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">计算步骤</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {steps.map((step, index) => (
                <p key={index} className="font-mono text-xs break-words break-all whitespace-pre-wrap">
                  {index + 1}. {step}
                </p>
              ))}
            </div>
          </div>
        )}
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

/**
 * 编码解码结果预览组件
 */
const EncodePreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  if (!result.encodeData) return null;

  const encodeData = result.encodeData;
  const isEncode = encodeData.output && !encodeData.output.includes('解码');
  const operationType = isEncode ? '编码' : '解码';

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">编码解码结果</h3>
      <div className="space-y-4">
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">输入</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{encodeData.input || '(空)'}</p>
        </div>
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{operationType}结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{encodeData.output || '(无结果)'}</p>
        </div>
        {encodeData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{encodeData.error}</p>
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
 * 字符串工具结果预览组件
 */
const StringPreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  if (!result.stringData) return null;

  const stringData = result.stringData;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">字符串处理结果</h3>
      <div className="space-y-4">
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">输入</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{stringData.input || '(空)'}</p>
        </div>
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{stringData.output || '(无结果)'}</p>
        </div>
        {stringData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{stringData.error}</p>
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
 * 时间工具结果预览组件
 */
const TimePreview: React.FC<{ result: SearchResult }> = ({ result }) => {
  if (!result.timeData) return null;

  const timeData = result.timeData;

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">时间工具结果</h3>
      <div className="space-y-4">
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">输入</span>
          </div>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{timeData.input || '(空)'}</p>
        </div>
        <div className="max-w-full overflow-x-hidden">
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">{timeData.output || '(无结果)'}</p>
        </div>
        {timeData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{timeData.error}</p>
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
      <div className="w-full max-w-full overflow-x-hidden">
        <CalculatorPreview result={result} />
      </div>
    );
  }


  // 如果有编码解码数据，显示编码解码预览
  if (result.encodeData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <EncodePreview result={result} />
      </div>
    );
  }

  // 如果有字符串工具数据，显示字符串工具预览
  if (result.stringData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <StringPreview result={result} />
      </div>
    );
  }

  // 如果有时间工具数据，显示时间工具预览
  if (result.timeData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <TimePreview result={result} />
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
};

