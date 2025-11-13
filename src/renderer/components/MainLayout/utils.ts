import { SearchResult } from '../ResultList';

/**
 * 检测是否为 URL
 */
export const isURL = (str: string): { isURL: boolean; url?: string } => {
  try {
    // 如果已经有 http:// 或 https://
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return { isURL: true, url: str };
    }
    
    // 检测常见的域名格式
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    if (str.match(domainPattern)) {
      // 检查是否包含空格或斜杠，如果有则不认为是纯域名
      if (str.includes(' ') || str.includes('/')) {
        return { isURL: false };
      }
      return { isURL: true, url: `https://${str}` };
    }
    return { isURL: false };
  } catch {
    return { isURL: false };
  }
};

/**
 * 重置搜索状态
 */
export const resetSearchState = (
  setQuery: React.Dispatch<React.SetStateAction<string>>,
  setResults: React.Dispatch<React.SetStateAction<SearchResult[]>>,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  setIgnoreHover: React.Dispatch<React.SetStateAction<boolean>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
): void => {
  setQuery('');
  setResults([]);
  setSelectedIndex(0);
  setIgnoreHover(false);
  setLoading(false);
};

/**
 * 生成浏览器选项
 */
export const generateBrowserOptions = async (url: string): Promise<SearchResult[]> => {
  try {
    const allBrowsers = await window.electron.browser.getAll();
    
    const options: SearchResult[] = allBrowsers.map((browser: any, index: number) => {
      console.log('浏览器图标:', browser.name, 'icon:', browser.icon ? '有' : '无');
      return {
        id: `browser-${browser.id}-${url}`,
        type: 'web' as const,
        title: browser.isDefault ? `${browser.name}（默认）` : browser.name,
        description: '打开此网址',
        action: `browser:${browser.id}:${url}`,
        score: browser.isDefault ? 1500 + index : 1000 + index,
        priorityScore: browser.isDefault ? 1500 : 1000,
        icon: browser.icon, // 使用浏览器图标
      };
    });
    
    // 确保默认浏览器在第一位
    return options.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('生成浏览器选项失败:', error);
    return [];
  }
};

