import React from 'react';

/**
 * 图标尺寸常量
 */
const ICON_SIZE_CLASS = 'h-10 w-10';

/**
 * 搜索引擎类型
 */
type SearchEngine = 'baidu' | 'google' | 'bing' | 'github' | 'zhihu';

/**
 * 从标题或描述中识别搜索引擎
 */
export const detectSearchEngine = (title: string, description?: string): SearchEngine | null => {
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  
  if (titleLower.includes('百度') || descLower.includes('baidu.com')) {
    return 'baidu';
  }
  if (titleLower.includes('google') || descLower.includes('google.com')) {
    return 'google';
  }
  if (titleLower.includes('bing') || descLower.includes('bing.com')) {
    return 'bing';
  }
  if (titleLower.includes('github') || descLower.includes('github.com')) {
    return 'github';
  }
  if (titleLower.includes('知乎') || descLower.includes('zhihu.com')) {
    return 'zhihu';
  }
  
  return null;
};

/**
 * 搜索引擎图标组件
 */
const SearchEngineIcon: React.FC<{ engine: SearchEngine }> = ({ engine }) => {
  switch (engine) {
    case 'baidu':
      return (
        <svg className={ICON_SIZE_CLASS} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#2932E1"/>
          <circle cx="8.5" cy="9" r="1.8" fill="white"/>
          <circle cx="11.5" cy="7.5" r="1.8" fill="white"/>
          <circle cx="14.5" cy="9" r="1.8" fill="white"/>
          <circle cx="13" cy="10.5" r="1.8" fill="white"/>
          <ellipse cx="12" cy="14" rx="3.5" ry="2.8" fill="white"/>
        </svg>
      );
    case 'google':
      return (
        <svg className={ICON_SIZE_CLASS} viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    case 'bing':
      return (
        <svg className={ICON_SIZE_CLASS} viewBox="0 0 24 24" fill="none">
          <path d="M5.5 3.5h4.5l-1 4 7 5-2 1L5.5 3.5zm-.5.5L2.5 19l7-3.5-2-1L3 4zm13.5 0L12.5 9l2 1 6.5-4.5h-2zm2 0L21 4.5l-6.5 4.5 2 1 6.5-4.5zm-6.5 4.5l-2-1L5 4.5 3 4.5l6.5 4.5z" fill="#008373"/>
        </svg>
      );
    case 'github':
      return (
        <svg className={ICON_SIZE_CLASS} viewBox="0 0 24 24" fill="none">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="#181717"/>
        </svg>
      );
    case 'zhihu':
      return (
        <svg className={ICON_SIZE_CLASS} viewBox="0 0 24 24" fill="none">
          <path d="M12.344 0C5.562 0 0 5.562 0 12.344S5.562 24.688 12.344 24.688 24.688 19.126 24.688 12.344 19.126 0 12.344 0zm.96 18.304h-1.92v-4.608h1.92v4.608zm0-5.76h-1.92V5.76h1.92v6.784z" fill="#0084FF"/>
        </svg>
      );
    default:
      return null;
  }
};

/**
 * 类型图标组件（使用 React.memo 优化性能）
 */
const AppIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
));
AppIconComponent.displayName = 'AppIcon';

const FileIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
));
FileIconComponent.displayName = 'FileIcon';

const CommandIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
));
CommandIconComponent.displayName = 'CommandIcon';

const EncodeIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
));
EncodeIconComponent.displayName = 'EncodeIcon';

const StringIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
));
StringIconComponent.displayName = 'StringIcon';

const TimeIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
));
TimeIconComponent.displayName = 'TimeIcon';

const DefaultIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
  </svg>
));
DefaultIconComponent.displayName = 'DefaultIcon';

const GlobeIconComponent = React.memo(() => (
  <svg className={ICON_SIZE_CLASS} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </svg>
));
GlobeIconComponent.displayName = 'GlobeIcon';

/**
 * 类型图标组件映射
 */
const TYPE_ICON_COMPONENTS: Record<string, React.FC> = {
  app: AppIconComponent,
  file: FileIconComponent,
  command: CommandIconComponent,
  encode: EncodeIconComponent,
  string: StringIconComponent,
  time: TimeIconComponent,
  default: DefaultIconComponent,
};

/**
 * 获取类型图标
 * @param type 结果类型
 * @param title 标题（用于 web 类型识别搜索引擎）
 * @param description 描述（用于 web 类型识别搜索引擎）
 * @returns React 元素
 */
export const getTypeIcon = (
  type: string,
  title?: string,
  description?: string
): React.ReactElement => {
  // Web 类型需要识别搜索引擎
  if (type === 'web') {
    const engine = title || description ? detectSearchEngine(title || '', description) : null;
    if (engine) {
      return <SearchEngineIcon engine={engine} />;
    }
    return <GlobeIconComponent />;
  }
  
  // 其他类型直接返回对应的图标组件
  const IconComponent = TYPE_ICON_COMPONENTS[type] || TYPE_ICON_COMPONENTS.default;
  return <IconComponent />;
};

/**
 * 类型颜色映射
 */
const TYPE_COLORS: Record<string, string> = {
  app: 'text-blue-500',
  file: 'text-gray-500',
  web: 'text-purple-500',
  command: 'text-purple-500',
  encode: 'text-green-500',
  string: 'text-orange-500',
  time: 'text-indigo-500',
};

/**
 * 获取类型颜色类名
 */
export const getTypeColor = (type: string): string => {
  return TYPE_COLORS[type] || 'text-gray-500';
};

/**
 * TODO 优先级图标组件
 */
export const TodoPriorityIcon: React.FC<{ priority: 'high' | 'medium' | 'low' }> = ({ priority }) => {
  const configs = {
    high: { fill: '#DC2626', stroke: '#991B1B', innerFill: '#FEE2E2' },
    medium: { fill: '#D97706', stroke: '#92400E', innerFill: '#FEF3C7' },
    low: { fill: '#059669', stroke: '#047857', innerFill: '#D1FAE5' },
  };
  
  const config = configs[priority];
  
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill={config.fill} stroke={config.stroke} strokeWidth="0.5"/>
      <circle cx="8" cy="8" r="4" fill={config.innerFill} opacity="0.3"/>
    </svg>
  );
};

