/**
 * 补全结果缓存工具
 * 缓存常用查询的补全结果，减少重复计算
 * 使用 LRU 策略管理缓存大小
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CompletionCache {
  private readonly cache: Map<string, CacheEntry<any>> = new Map();
  private readonly MAX_CACHE_SIZE: number = 100;
  private readonly CACHE_TTL: number = 5 * 60 * 1000; // 5分钟

  /**
   * 生成缓存键
   * @param type 缓存类型
   * @param query 查询字符串
   * @returns 缓存键
   */
  private getCacheKey(type: string, query: string): string {
    return `${type}:${query.toLowerCase().trim()}`;
  }

  /**
   * 获取缓存结果
   * @param type 缓存类型
   * @param query 查询字符串
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get<T>(type: string, query: string): T | null {
    const key = this.getCacheKey(type, query);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // LRU: 将访问的条目移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data as T;
  }

  /**
   * 设置缓存结果
   * @param type 缓存类型
   * @param query 查询字符串
   * @param data 要缓存的数据
   */
  set<T>(type: string, query: string, data: T): void {
    const key = this.getCacheKey(type, query);
    
    // 如果已存在，先删除（LRU 策略）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // 缓存已满，删除最旧的条目（Map 的第一个条目）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    // 添加新条目到末尾（最近使用）
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   * 建议定期调用以清理过期条目
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // 收集过期键（避免在迭代时修改 Map）
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key);
      }
    }
    
    // 批量删除过期键
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存大小和最大容量
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

export const completionCache = new CompletionCache();

