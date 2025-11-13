// ==================== 常量定义 ====================
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
export const DATE_LOCALE = 'zh-CN';
export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

// ==================== 工具函数 ====================
/**
 * 格式化日期
 */
export const formatDate = (date: Date | string | number | null | undefined, fallback: string = '-'): string => {
  if (!date) return fallback;
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleString(DATE_LOCALE, DATE_OPTIONS);
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined) return '未知';
  if (bytes === 0) return '0 B';
  
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${FILE_SIZE_UNITS[unitIndex]}`;
};

/**
 * 从路径中提取文件名
 */
export const getFileName = (path: string): string => {
  if (!path) return '未知';
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
};

/**
 * 格式化文件权限
 */
export const formatPermissions = (info: any): string => {
  if (!info) return '-';
  const perms: string[] = [];
  if (info.readable) perms.push('读');
  if (info.writable) perms.push('写');
  if (info.mode && (info.mode & parseInt('111', 8))) perms.push('执行');
  return perms.length > 0 ? perms.join('、') : '-';
};

/**
 * 获取网站安全状态
 */
export const getSecurityStatus = (url: string): string => {
  if (!url) return '-';
  if (url.startsWith('https://')) return 'HTTPS (安全)';
  if (url.startsWith('http://')) return 'HTTP (不安全)';
  return '-';
};

/**
 * 从 URL 中提取搜索引擎名称
 */
export const getEngineName = (url: string): string => {
  if (url.includes('baidu.com')) return '百度';
  if (url.includes('google.com')) return 'Google';
  if (url.includes('bing.com')) return 'Bing';
  if (url.includes('github.com')) return 'GitHub';
  return '-';
};

