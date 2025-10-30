import { useState, useEffect } from 'react';
import { SearchResult } from '../components/ResultList';

export interface AppSearchResult extends SearchResult {
  appId: string;
}

export function useAppSearch(query: string) {
  const [results, setResults] = useState<AppSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchApps = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // 调用 IPC 搜索应用
        const apps = await window.electron.invoke('app-search', query);
        
        const appResults: AppSearchResult[] = apps.map((app: any) => ({
          id: app.id,
          appId: app.id,
          type: 'app' as const,
          title: app.name,
          description: app.description || app.path,
          action: `app:${app.id}`,
          score: 1.0,
          icon: app.icon,
        }));

        setResults(appResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchApps, 300); // 防抖
    return () => clearTimeout(timeoutId);
  }, [query]);

  return { results, loading };
}

