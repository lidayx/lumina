/**
 * 网页搜索相关类型定义
 */
export interface WebSearchResult {
  id: string;
  type: 'web';
  title: string;
  url: string;
  description?: string;
  icon?: string;
  searchUrl: string; // 搜索 URL
}

export interface SearchEngine {
  name: string;
  url: string;
  icon?: string;
  default?: boolean;
}

export interface WebSearchHistory {
  id: string;
  query: string;
  url: string;
  timestamp: Date;
  count: number;
}

