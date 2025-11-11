/**
 * 补全结果缓存工具
 * 缓存常用查询的补全结果，减少重复计算
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CompletionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly MAX_CACHE_SIZE = 100; // 最大缓存条目数
  private readonly CACHE_TTL = 5 * 60 * 1000; // 缓存有效期：5分钟

  /**
   * 获取缓存键
   */
  private getCacheKey(type: string, query: string): string {
    return `${type}:${query.toLowerCase().trim()}`;
  }

  /**
   * 获取缓存结果
   */
  get<T>(type: string, query: string): T | null {
    const key = this.getCacheKey(type, query);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * 设置缓存结果
   */
  set<T>(type: string, query: string, data: T): void {
    const key = this.getCacheKey(type, query);
    
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const completionCache = new CompletionCache();

