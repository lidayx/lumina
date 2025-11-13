import React, { memo } from 'react';

/**
 * 加载状态组件
 */
export const LoadingSkeleton: React.FC = memo(() => (
  <div className="p-4">
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
));
LoadingSkeleton.displayName = 'LoadingSkeleton';

/**
 * 预览字段组件
 */
export interface PreviewFieldProps {
  label: string;
  value: string | React.ReactNode;
  className?: string;
  monospace?: boolean;
}

export const PreviewField: React.FC<PreviewFieldProps> = memo(({ label, value, className = '', monospace = false }) => (
  <div>
    <div className="mb-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <p className={`text-sm text-gray-900 dark:text-gray-100 leading-relaxed break-words ${monospace ? 'font-mono' : ''} ${className}`}>
      {value}
    </p>
  </div>
));
PreviewField.displayName = 'PreviewField';

/**
 * 预览标题组件
 */
export interface PreviewTitleProps {
  title: string;
}

export const PreviewTitle: React.FC<PreviewTitleProps> = memo(({ title }) => (
  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
));
PreviewTitle.displayName = 'PreviewTitle';

/**
 * 操作按钮组件
 */
export interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = memo(({ onClick, children, className = '', disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
));
ActionButton.displayName = 'ActionButton';

/**
 * 图标组件（带错误处理）
 */
export interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export const SafeImage: React.FC<SafeImageProps> = memo(({ src, alt, className = '', size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-16 h-16',
    large: 'w-24 h-24',
  };

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} rounded-lg object-contain flex-shrink-0 ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
  );
});
SafeImage.displayName = 'SafeImage';

/**
 * 搜索引擎图标组件
 */
export interface EngineIconProps {
  name: string;
}

export const EngineIcon: React.FC<EngineIconProps> = memo(({ name }) => {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('百度') || nameLower.includes('baidu')) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#2932E1"/>
        <circle cx="8.5" cy="9" r="1.8" fill="white"/>
        <circle cx="11.5" cy="7.5" r="1.8" fill="white"/>
        <circle cx="14.5" cy="9" r="1.8" fill="white"/>
        <circle cx="13" cy="10.5" r="1.8" fill="white"/>
        <ellipse cx="12" cy="14" rx="3.5" ry="2.8" fill="white"/>
      </svg>
    );
  }
  
  if (nameLower.includes('google')) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }
  
  if (nameLower.includes('bing')) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M5.5 3.5h4.5l-1 4 7 5-2 1L5.5 3.5zm-.5.5L2.5 19l7-3.5-2-1L3 4zm13.5 0L12.5 9l2 1 6.5-4.5h-2zm2 0L21 4.5l-6.5 4.5 2 1 6.5-4.5zm-6.5 4.5l-2-1L5 4.5 3 4.5l6.5 4.5z" fill="#008373"/>
      </svg>
    );
  }
  
  if (nameLower.includes('github')) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="#181717"/>
      </svg>
    );
  }
  
  if (nameLower.includes('知乎') || nameLower.includes('zhihu')) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12.344 0C5.562 0 0 5.562 0 12.344S5.562 24.688 12.344 24.688 24.688 19.126 24.688 12.344 19.126 0 12.344 0zm.96 18.304h-1.92v-4.608h1.92v4.608zm0-5.76h-1.92V5.76h1.92v6.784z" fill="#0084FF"/>
      </svg>
    );
  }
  
  return null;
});
EngineIcon.displayName = 'EngineIcon';

