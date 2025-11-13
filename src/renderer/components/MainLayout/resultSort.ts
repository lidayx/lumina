import { SearchResult } from '../ResultList';

/**
 * 结果排序函数
 */
export const sortResults = (results: SearchResult[], query: string): SearchResult[] => {
  const queryLower = query.toLowerCase();
  
  return [...results].sort((a, b) => {
    // 1. 优先级分数（priorityScore）优先
    const aPriority = a.priorityScore || 0;
    const bPriority = b.priorityScore || 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    // 2. 完全匹配优先
    const aName = a.title.toLowerCase();
    const bName = b.title.toLowerCase();
    
    if (aName === queryLower && bName !== queryLower) return -1;
    if (bName === queryLower && aName !== queryLower) return 1;
    
    // 3. 开头匹配优先
    const aStarts = aName.startsWith(queryLower);
    const bStarts = bName.startsWith(queryLower);
    if (aStarts && !bStarts) return -1;
    if (bStarts && !aStarts) return 1;
    
    // 4. 按评分排序
    return b.score - a.score;
  });
};


