export type SearchResultType =
  | 'app' // 应用
  | 'file' // 文件
  | 'command' // 命令
  | 'web' // 网页
  | 'history' // 历史
  | 'custom'; // 自定义

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description: string;
  icon?: string;
  action: string;
  score: number;
}

export interface SearchOptions {
  limit?: number; // 结果数量限制
  sources?: SearchResultType[]; // 搜索源
  minScore?: number; // 最小匹配分数
}

export interface GlobalSearchOptions extends SearchOptions {
  query: string;
}
