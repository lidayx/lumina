import * as fs from 'fs';
import * as path from 'path';
import { app as electronApp } from 'electron';

/**
 * 书签项接口
 */
export interface Bookmark {
  id: string;
  name: string;
  url: string;
  dateAdded?: number;
  dateLastUsed?: number;
  indexedAt?: string;
  icon?: string; // favicon URL 或图标路径
  favIconUrl?: string; // 书签中的 favicon URL
}

/**
 * Chrome 书签文件结构
 */
interface ChromeBookmarkNode {
  children?: ChromeBookmarkNode[];
  date_added?: string;
  date_last_used?: string;
  guid?: string;
  id?: string;
  name?: string;
  type?: 'url' | 'folder';
  url?: string;
  icon_url?: string; // favicon URL
}

interface ChromeBookmarks {
  checksum?: string;
  roots: {
    bookmark_bar?: ChromeBookmarkNode;
    other?: ChromeBookmarkNode;
    synced?: ChromeBookmarkNode;
  };
}


/**
 * 书签服务
 */
class BookmarkService {
  // ========== 私有属性 ==========
  private bookmarks: Bookmark[] = [];
  private bookmarksLoaded: boolean = false;
  private bookmarkWatcher: fs.FSWatcher | null = null; // 文件监控器

  // ========== 公共 API ==========

  /**
   * 加载所有书签（支持多浏览器、多 Profile）
   * @param ignoreCache 是否忽略缓存，强制重新扫描
   */
  public async loadBookmarks(ignoreCache: boolean = false): Promise<void> {
    if (this.bookmarksLoaded && !ignoreCache) return;
    
    // 如果忽略缓存，重置加载状态
    if (ignoreCache) {
      this.bookmarksLoaded = false;
    }

    try {
      console.log('📚 [书签服务] 开始加载书签...');
      this.bookmarks = [];

      // 查找所有可用的书签文件（多浏览器、多 Profile）
      const bookmarkPaths = this.findAllBookmarkPaths();

      if (bookmarkPaths.length > 0) {
        console.log(`📍 [书签服务] 找到 ${bookmarkPaths.length} 个书签源`);
        
        // 如果忽略缓存或没有缓存，执行全量扫描
        if (ignoreCache) {
          console.log('📚 [书签服务] 忽略缓存，重新扫描所有书签文件...');
          await this.scanAllBookmarks(bookmarkPaths);
        } else {
          // 先从数据库加载
          const cachedBookmarks = await this.loadBookmarksFromCache();
          
          if (cachedBookmarks.length > 0) {
            // 使用缓存，启动快速
            this.bookmarks = cachedBookmarks;
            console.log(`✅ [书签服务] 从缓存加载 ${this.bookmarks.length} 个书签（启动快速）`);
          } else {
            // 没有缓存，扫描所有书签文件
            console.log('📚 [书签服务] 无缓存，首次扫描书签文件...');
            await this.scanAllBookmarks(bookmarkPaths);
          }
        }
        
        // 启动文件监控（监控第一个书签文件，通常是最常更新的）
        if (bookmarkPaths.length > 0) {
          this.startBookmarkWatcher(bookmarkPaths[0]);
        }
        
        console.log(`✅ [书签服务] 共加载 ${this.bookmarks.length} 个书签`);
      } else {
        console.log('⚠️ [书签服务] 未找到书签文件');
      }

      this.bookmarksLoaded = true;
    } catch (error) {
      console.error('❌ [书签服务] 加载书签失败:', error);
      this.bookmarks = [];
      this.bookmarksLoaded = true;
    }
  }

  /**
   * 扫描所有书签文件（支持多 Profile，并行读取）
   * 优化：改进去重逻辑，减少数组操作
   */
  private async scanAllBookmarks(bookmarkPaths: string[]): Promise<void> {
    // 并行读取所有书签文件（性能优化：从串行改为并行）
    const bookmarkPromises = bookmarkPaths.map(bookmarkPath =>
      this.readBookmarks(bookmarkPath).catch((error) => {
        console.error(`⚠️ [书签服务] 读取书签文件失败 ${bookmarkPath}:`, error);
        return [] as Bookmark[];
      })
    );
    
    const bookmarkArrays = await Promise.all(bookmarkPromises);
    
    // 合并并去重（优化：使用 Map 直接存储书签，避免双重循环）
    const bookmarkMap = new Map<string, Bookmark>(); // URL -> Bookmark

    for (const bookmarks of bookmarkArrays) {
      for (const bookmark of bookmarks) {
        const existing = bookmarkMap.get(bookmark.url);
        
        if (!existing) {
          // 新书签，直接添加
          bookmarkMap.set(bookmark.url, bookmark);
        } else {
          // 已存在，比较日期，保留更新的那个
          const existingTime = existing.dateLastUsed || existing.dateAdded || 0;
          const newTime = bookmark.dateLastUsed || bookmark.dateAdded || 0;
          
          if (newTime > existingTime) {
            bookmarkMap.set(bookmark.url, bookmark);
          }
        }
      }
    }

    // 转换为数组
    this.bookmarks = Array.from(bookmarkMap.values());
    
    // 保存到数据库
    await this.saveBookmarksToDatabase(this.bookmarks);
  }

  /**
   * 扫描单个书签文件（用于增量更新）
   */
  private async scanBookmarks(bookmarkPath: string): Promise<void> {
    await this.scanAllBookmarks([bookmarkPath]);
  }

  /**
   * 从数据库加载书签
   */
  private async loadBookmarksFromCache(): Promise<Bookmark[]> {
    try {
      const { dbManager } = await import('../database/db');
      const items = await dbManager.getAllItems('bookmark');
      
      // 筛选出书签类型的项（使用 path 字段存储 URL）
      return items
        .filter(item => item.type === 'bookmark' && item.path && item.path.startsWith('http'))
        .map(item => {
          return {
            id: item.id,
            name: item.name,
            url: item.path, // 使用 path 字段存储 URL
            icon: item.icon || undefined,
            dateAdded: undefined, // 数据库中没有存储，需要时从文件重新读取
            dateLastUsed: undefined,
            indexedAt: item.indexedAt ? String(item.indexedAt) : undefined,
          };
        });
    } catch (error) {
      console.error('从数据库加载书签失败:', error);
      return [];
    }
  }

  /**
   * 保存书签到数据库
   * 注意：会保留数据库中现有的统计数据（launchCount, lastUsed），避免重置
   */
  private async saveBookmarksToDatabase(bookmarks: Bookmark[]): Promise<void> {
    if (bookmarks.length === 0) return;

    try {
      console.log('💾 [书签服务] 保存书签到数据库...');
      
      const { dbManager } = await import('../database/db');
      const now = new Date();
      
      // 先获取数据库中现有的书签统计数据，避免重置
      // 注意：书签的 ID 格式是 `bookmark-${bookmark.id}`，但我们需要通过 URL (path) 来匹配
      const existingBookmarks = await dbManager.getAllItems('bookmark');
      const existingStatsMap = new Map<string, { launchCount: number; lastUsed: Date | null; score: number }>();
      for (const existingBookmark of existingBookmarks) {
        // 使用 URL (path) 作为键，因为书签 ID 可能会变化
        existingStatsMap.set(existingBookmark.path, {
          launchCount: existingBookmark.launchCount || 0,
          lastUsed: existingBookmark.lastUsed ? new Date(existingBookmark.lastUsed) : null,
          score: existingBookmark.score || 0,
        });
      }
      
      // 批量保存新书签
      const bookmarkItems = bookmarks.map(bookmark => {
        const bookmarkId = `bookmark-${bookmark.id}`;
        
        // 通过 URL 查找现有统计数据
        const existingStats = existingStatsMap.get(bookmark.url);
        
        // 验证并转换日期（避免无效日期导致错误）
        let lastUsed: Date | undefined = undefined;
        if (bookmark.dateLastUsed) {
          const date = new Date(bookmark.dateLastUsed);
          if (!isNaN(date.getTime())) {
            // 确保日期有效
            lastUsed = date;
          }
        }
        
        // 使用现有统计数据，如果不存在则使用默认值
        const launchCount = existingStats ? existingStats.launchCount : 0;
        const finalLastUsed = existingStats && existingStats.lastUsed 
          ? existingStats.lastUsed 
          : (lastUsed || undefined);
        const score = existingStats ? existingStats.score : 0;
        
        return {
          id: bookmarkId,
          type: 'bookmark' as const,
          name: bookmark.name,
          nameEn: undefined,
          nameCn: undefined,
          path: bookmark.url, // 将 URL 存储在 path 字段
          icon: bookmark.icon || bookmark.favIconUrl || undefined, // 保存图标 URL
          description: undefined,
          category: undefined,
          launchCount: launchCount,
          lastUsed: finalLastUsed,
          score: score,
          indexedAt: now,
          searchKeywords: `${bookmark.name} ${bookmark.url}`.toLowerCase(),
        };
      });
      
      // 先删除所有旧的书签记录（使用批量删除优化性能）
      // 注意：删除后再保存，但我们已经保存了统计数据
      await dbManager.clearItemsByType('bookmark');
      
      // 批量保存新书签（包含保留的统计数据）
      await dbManager.batchUpsertItems(bookmarkItems);
      
      console.log(`✅ [书签服务] 已保存 ${bookmarks.length} 个书签到数据库`);
    } catch (error) {
      console.error('保存书签到数据库失败:', error);
    }
  }

  /**
   * 获取所有书签
   */
  public getAllBookmarks(): Bookmark[] {
    return this.bookmarks;
  }

  /**
   * 搜索书签（优化排序：精确匹配>前缀>URL命中>最近使用）
   * 性能优化：使用搜索关键词缓存，提前过滤，缓存小写转换
   */
  public searchBookmarks(query: string, maxResults: number = 50): Bookmark[] {
    if (!query) {
      return this.bookmarks.slice(0, maxResults);
    }

    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) {
      return this.bookmarks.slice(0, maxResults);
    }
    
    const results: Array<{ bookmark: Bookmark; score: number }> = [];
    const minSearchLength = 2;
    const now = Date.now();
    
    for (const bookmark of this.bookmarks) {
      // 缓存小写转换结果（避免重复转换）
      const nameLower = bookmark.name.toLowerCase();
      const urlLower = bookmark.url.toLowerCase();
      
      // 快速预过滤：如果名称和URL都不包含查询词，直接跳过
      if (searchTerm.length >= minSearchLength && 
          !nameLower.includes(searchTerm) && 
          !urlLower.includes(searchTerm)) {
        continue;
      }
      
      let score = 0;
      
      // 精确匹配（名称）
      if (nameLower === searchTerm) {
        score = 100;
      }
      // 前缀匹配（名称）
      else if (nameLower.startsWith(searchTerm)) {
        score = 80;
      }
      // 包含匹配（名称）
      else if (nameLower.includes(searchTerm)) {
        score = 60;
      }
      // URL 精确匹配
      else if (urlLower === searchTerm) {
        score = 50;
      }
      // URL 包含匹配
      else if (urlLower.includes(searchTerm)) {
        score = 30;
      }

      if (score > 0) {
        // 加分：最近使用的书签（优化：减少重复计算）
        if (bookmark.dateLastUsed) {
          const daysSinceUsed = (now - bookmark.dateLastUsed) / (1000 * 60 * 60 * 24);
          if (daysSinceUsed < 7) {
            score += 10; // 7天内使用过，加10分
          } else if (daysSinceUsed < 30) {
            score += 5; // 30天内使用过，加5分
          }
        }
        
        results.push({ bookmark, score });
      }
    }

    // 排序：按分数降序，然后按最近使用时间
    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 分数相同，按最近使用时间排序
      const aTime = a.bookmark.dateLastUsed || a.bookmark.dateAdded || 0;
      const bTime = b.bookmark.dateLastUsed || b.bookmark.dateAdded || 0;
      return bTime - aTime;
    });

    return results.slice(0, maxResults).map(r => r.bookmark);
  }

  /**
   * 重新加载书签（强制扫描文件）
   */
  public async reloadBookmarks(): Promise<void> {
    this.bookmarksLoaded = false;
    
    // 重新查找所有书签文件
    const bookmarkPaths = this.findAllBookmarkPaths();
    
    if (bookmarkPaths.length > 0) {
      await this.scanAllBookmarks(bookmarkPaths);
      
      // 重新启动监控
      this.stopBookmarkWatcher();
      if (bookmarkPaths.length > 0) {
        this.startBookmarkWatcher(bookmarkPaths[0]);
      }
    }
    
    this.bookmarksLoaded = true;
  }

  /**
   * 停止文件监控
   */
  public stopWatching(): void {
    this.stopBookmarkWatcher();
  }

  /**
   * 启动书签文件监控（增量更新）
   */
  private startBookmarkWatcher(bookmarkPath: string): void {
    // 停止之前的监控
    this.stopBookmarkWatcher();
    
    if (!fs.existsSync(bookmarkPath)) {
      return;
    }
    
    try {
      let reloadTimer: NodeJS.Timeout | null = null;
      
      this.bookmarkWatcher = fs.watch(bookmarkPath, (eventType) => {
        if (eventType === 'change') {
          console.log('📚 [书签服务] 检测到书签文件变化，准备重新加载...');
          
          // 防抖：延迟 1 秒后重新加载（避免频繁触发）
          if (reloadTimer) {
            clearTimeout(reloadTimer);
          }
          
          reloadTimer = setTimeout(async () => {
            try {
              console.log('📚 [书签服务] 重新加载书签文件...');
              await this.scanBookmarks(bookmarkPath);
              console.log(`✅ [书签服务] 已更新 ${this.bookmarks.length} 个书签`);
            } catch (error) {
              console.error('❌ [书签服务] 重新加载书签失败:', error);
            }
          }, 1000);
        }
      });
      
      this.bookmarkWatcher.on('error', (error) => {
        console.error('❌ [书签服务] 书签文件监控错误:', error);
      });
      
      console.log(`👁️  [书签服务] 已启动文件监控: ${bookmarkPath}`);
    } catch (error) {
      console.error('❌ [书签服务] 启动文件监控失败:', error);
    }
  }

  /**
   * 停止书签文件监控
   */
  private stopBookmarkWatcher(): void {
    if (this.bookmarkWatcher) {
      this.bookmarkWatcher.close();
      this.bookmarkWatcher = null;
      console.log('👁️  [书签服务] 已停止文件监控');
    }
  }

  // ========== 私有方法 ==========

  /**
   * 查找所有书签文件路径（支持多浏览器、多 Profile）
   */
  private findAllBookmarkPaths(): string[] {
    const platform = process.platform;
    const homeDir = electronApp.getPath('home');
    const paths: string[] = [];

    if (platform === 'darwin') {
      // macOS
      
      // Chromium 系：查找所有 Profile
      const chromiumBrowsers = [
        { name: 'Google Chrome', basePath: path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome') },
        { name: 'Microsoft Edge', basePath: path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge') },
        { name: 'Brave', basePath: path.join(homeDir, 'Library', 'Application Support', 'BraveSoftware', 'Brave-Browser') },
        { name: 'Arc', basePath: path.join(homeDir, 'Library', 'Application Support', 'Arc', 'User Data') },
      ];
      
      for (const browser of chromiumBrowsers) {
        if (fs.existsSync(browser.basePath)) {
          // 查找所有 Profile 目录
          const userDataPath = browser.basePath;
          try {
            const profiles = fs.readdirSync(userDataPath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory() && (dirent.name === 'Default' || dirent.name.startsWith('Profile')))
              .map(dirent => dirent.name);
            
            for (const profile of profiles) {
              const bookmarkPath = path.join(userDataPath, profile, 'Bookmarks');
              if (fs.existsSync(bookmarkPath)) {
                paths.push(bookmarkPath);
              }
            }
          } catch (error) {
            // 忽略读取错误
          }
        }
      }
      
      // Safari
      const safariPath = path.join(homeDir, 'Library', 'Safari', 'Bookmarks.plist');
      if (fs.existsSync(safariPath)) {
        paths.push(safariPath);
      }
      
      // Firefox: 查找所有 Profile 的 places.sqlite
      const firefoxPath = path.join(homeDir, 'Library', 'Application Support', 'Firefox', 'Profiles');
      if (fs.existsSync(firefoxPath)) {
        try {
          const profiles = fs.readdirSync(firefoxPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          for (const profile of profiles) {
            const placesPath = path.join(firefoxPath, profile, 'places.sqlite');
            if (fs.existsSync(placesPath)) {
              paths.push(placesPath);
            }
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    } else if (platform === 'win32') {
      // Windows
      
      // Chromium 系
      const chromiumBrowsers = [
        { name: 'Chrome', basePath: path.join(homeDir, 'AppData', 'Local', 'Google', 'Chrome', 'User Data') },
        { name: 'Edge', basePath: path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data') },
      ];
      
      for (const browser of chromiumBrowsers) {
        if (fs.existsSync(browser.basePath)) {
          try {
            const profiles = fs.readdirSync(browser.basePath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory() && (dirent.name === 'Default' || dirent.name.startsWith('Profile')))
              .map(dirent => dirent.name);
            
            for (const profile of profiles) {
              const bookmarkPath = path.join(browser.basePath, profile, 'Bookmarks');
              if (fs.existsSync(bookmarkPath)) {
                paths.push(bookmarkPath);
              }
            }
          } catch (error) {
            // 忽略读取错误
          }
        }
      }
      
      // Firefox
      const firefoxPath = path.join(homeDir, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles');
      if (fs.existsSync(firefoxPath)) {
        try {
          const profiles = fs.readdirSync(firefoxPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          for (const profile of profiles) {
            const placesPath = path.join(firefoxPath, profile, 'places.sqlite');
            if (fs.existsSync(placesPath)) {
              paths.push(placesPath);
            }
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    } else {
      // Linux
      
      // Chromium 系
      const chromiumBrowsers = [
        { name: 'Chrome', basePath: path.join(homeDir, '.config', 'google-chrome') },
        { name: 'Chromium', basePath: path.join(homeDir, '.config', 'chromium') },
      ];
      
      for (const browser of chromiumBrowsers) {
        if (fs.existsSync(browser.basePath)) {
          try {
            const profiles = fs.readdirSync(browser.basePath, { withFileTypes: true })
              .filter(dirent => dirent.isDirectory() && (dirent.name === 'Default' || dirent.name.startsWith('Profile')))
              .map(dirent => dirent.name);
            
            for (const profile of profiles) {
              const bookmarkPath = path.join(browser.basePath, profile, 'Bookmarks');
              if (fs.existsSync(bookmarkPath)) {
                paths.push(bookmarkPath);
              }
            }
          } catch (error) {
            // 忽略读取错误
          }
        }
      }
      
      // Firefox
      const firefoxPath = path.join(homeDir, '.mozilla', 'firefox');
      if (fs.existsSync(firefoxPath)) {
        try {
          const profiles = fs.readdirSync(firefoxPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          for (const profile of profiles) {
            const placesPath = path.join(firefoxPath, profile, 'places.sqlite');
            if (fs.existsSync(placesPath)) {
              paths.push(placesPath);
            }
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
    }

    return paths;
  }

  /**
   * 读取书签文件（自动识别格式）
   */
  private async readBookmarks(bookmarkPath: string): Promise<Bookmark[]> {
    // 根据文件扩展名和路径判断格式
    const ext = path.extname(bookmarkPath).toLowerCase();
    const filename = path.basename(bookmarkPath).toLowerCase();
    
    if (filename === 'places.sqlite' || ext === '.sqlite') {
      // Firefox SQLite 数据库
      return this.readFirefoxBookmarksFromSQLite(bookmarkPath);
    } else if (ext === '.plist') {
      // Safari plist 文件
      return this.readSafariBookmarks(bookmarkPath);
    } else if (filename === 'bookmarks' || ext === '.json') {
      // Chromium 系 JSON 格式
      return this.readChromeBookmarks(bookmarkPath);
    } else if (ext === '.html') {
      // 旧版 Firefox HTML 格式
      return this.readFirefoxBookmarksHTML(bookmarkPath);
    } else {
      // 默认尝试 Chrome 格式
      return this.readChromeBookmarks(bookmarkPath);
    }
  }

  /**
   * 读取 Chrome/Edge/Opera 书签文件（JSON 格式）
   */
  private async readChromeBookmarks(bookmarkPath: string): Promise<Bookmark[]> {
    try {
      const content = fs.readFileSync(bookmarkPath, 'utf-8');
      const data: ChromeBookmarks = JSON.parse(content);

      const bookmarks: Bookmark[] = [];

      // 递归读取书签树
      const traverse = (node: ChromeBookmarkNode) => {
        if (node.type === 'url' && node.name && node.url) {
          bookmarks.push({
            id: node.id || node.guid || `bookmark-${Date.now()}-${Math.random()}`,
            name: node.name,
            url: node.url,
            dateAdded: node.date_added ? parseInt(node.date_added) : undefined,
            dateLastUsed: node.date_last_used ? parseInt(node.date_last_used) : undefined,
            favIconUrl: node.icon_url || undefined,
            icon: node.icon_url || undefined, // 使用 favicon URL 作为图标
          });
        }

        if (node.children) {
          node.children.forEach(child => traverse(child));
        }
      };

      // 遍历所有书签根节点
      if (data.roots) {
        if (data.roots.bookmark_bar) traverse(data.roots.bookmark_bar);
        if (data.roots.other) traverse(data.roots.other);
        if (data.roots.synced) traverse(data.roots.synced);
      }

      console.log(`✅ [书签服务] Chrome 格式：读取了 ${bookmarks.length} 个书签`);
      return bookmarks;
    } catch (error) {
      console.error('读取 Chrome 书签失败:', error);
      return [];
    }
  }

  /**
   * 读取 Firefox 书签（SQLite 格式，现代 Firefox）
   */
  private async readFirefoxBookmarksFromSQLite(placesPath: string): Promise<Bookmark[]> {
    try {
      // 使用 better-sqlite3 或原生 SQLite
      // 注意：如果项目中没有 SQLite 库，可能需要使用 child_process 调用 sqlite3 命令
      const { execSync } = require('child_process');
      
      // 使用 sqlite3 命令行工具查询（如果可用）
      // 需要设置分隔符和输出格式
      const query = `.mode list
.separator |
SELECT 
  b.id,
  COALESCE(b.title, '') as name,
  p.url,
  CAST(b.dateAdded AS REAL) / 1000000 as dateAdded,
  (SELECT CAST(MAX(visit_date) AS REAL) / 1000000 FROM moz_historyvisits WHERE place_id = p.id) as dateLastUsed
FROM moz_bookmarks b
JOIN moz_places p ON b.fk = p.id
WHERE b.type = 1 AND p.url IS NOT NULL AND p.url NOT LIKE 'place:%' AND p.url LIKE 'http%'
ORDER BY b.dateAdded DESC`;
      
      try {
        // 尝试使用 sqlite3 命令行工具（需要设置分隔符模式）
        const output = execSync(
          `sqlite3 -cmd ".mode list" -cmd ".separator |" "${placesPath}" "${query.replace(/\.mode list\n\.separator \|\n/, '')}"`,
          { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
        );
        
        const bookmarks: Bookmark[] = [];
        const lines = output.trim().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const parts = line.split('|');
          if (parts.length >= 3) {
            const id = parts[0];
            const name = parts[1] || 'Untitled';
            const url = parts[2];
            
            // 安全转换日期（避免无效值）
            let dateAdded: number | undefined = undefined;
            if (parts[3] && parts[3].trim()) {
              const parsed = parseFloat(parts[3]);
              if (!isNaN(parsed) && parsed > 0) {
                dateAdded = Math.floor(parsed) * 1000;
              }
            }
            
            let dateLastUsed: number | undefined = undefined;
            if (parts[4] && parts[4].trim()) {
              const parsed = parseFloat(parts[4]);
              if (!isNaN(parsed) && parsed > 0) {
                dateLastUsed = Math.floor(parsed) * 1000;
              }
            }
            
            if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
              bookmarks.push({
                id: `ff-${id}`,
                name: name || url,
                url: url,
                dateAdded,
                dateLastUsed,
              });
            }
          }
        }
        
        console.log(`✅ [书签服务] Firefox SQLite：读取了 ${bookmarks.length} 个书签`);
        return bookmarks;
      } catch (sqliteError) {
        // sqlite3 命令不可用，尝试使用 Node.js SQLite 库（需要安装）
        console.log('⚠️ [书签服务] sqlite3 命令不可用，Firefox 书签读取失败');
        return [];
      }
    } catch (error) {
      console.error('读取 Firefox SQLite 书签失败:', error);
      return [];
    }
  }

  /**
   * 读取 Firefox 书签文件（HTML 格式，旧版）
   */
  private async readFirefoxBookmarksHTML(bookmarkPath: string): Promise<Bookmark[]> {
    try {
      const content = fs.readFileSync(bookmarkPath, 'utf-8');
      const bookmarks: Bookmark[] = [];
      
      // 简单的 HTML 解析
      const linkRegex = /<A HREF="([^"]+)"[^>]*ADD_DATE="(\d+)"[^>]*>([^<]+)<\/A>/gi;
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        bookmarks.push({
          id: `bookmark-ff-${match[2]}-${bookmarks.length}`,
          name: match[3],
          url: match[1],
          dateAdded: parseInt(match[2]),
        });
      }
      
      console.log(`✅ [书签服务] Firefox HTML：读取了 ${bookmarks.length} 个书签`);
      return bookmarks;
    } catch (error) {
      console.error('读取 Firefox HTML 书签失败:', error);
      return [];
    }
  }

  /**
   * 读取 Safari 书签文件（Plist 格式）
   */
  private async readSafariBookmarks(bookmarkPath: string): Promise<Bookmark[]> {
    try {
      const { execSync } = require('child_process');
      
      // 使用 plutil 转换为 JSON（macOS 自带）
      const command = `plutil -convert json -o - "${bookmarkPath}"`;
      let output: string;
      try {
        output = execSync(command, { encoding: 'utf-8', timeout: 10000, stdio: 'pipe' });
      } catch (execError: any) {
        // 处理权限错误或文件不存在
        if (execError.status === 1 || execError.message?.includes('permission') || execError.message?.includes('not permitted')) {
          console.log('⚠️ [书签服务] Safari 书签文件需要权限访问（可能需要授予完全磁盘访问权限）');
          return [];
        }
        throw execError;
      }
      
      const data = JSON.parse(output);
      
      const bookmarks: Bookmark[] = [];
      
      // 递归遍历 Safari 书签树
      const traverse = (node: any) => {
        if (node.WebBookmarkType === 'WebBookmarkTypeLeaf' && node.URLString) {
          const title = node.URIDictionary?.title?.string || node.URLString;
          const url = node.URLString;
          
          bookmarks.push({
            id: `safari-${node.WebBookmarkUUID || Date.now()}-${bookmarks.length}`,
            name: title,
            url: url,
            dateAdded: node.ReadingListNonSync?.DateAdded?.timestamp 
              ? Math.floor(node.ReadingListNonSync.DateAdded.timestamp) * 1000 
              : undefined,
          });
        }
        
        // 递归处理子节点
        if (node.Children) {
          if (Array.isArray(node.Children)) {
            node.Children.forEach((child: any) => traverse(child));
          } else if (node.Children instanceof Object) {
            // 有时 Children 是对象而不是数组
            Object.values(node.Children).forEach((child: any) => traverse(child));
          }
        }
      };
      
      // 从根节点开始遍历
      if (data.Children) {
        if (Array.isArray(data.Children)) {
          data.Children.forEach((child: any) => traverse(child));
        } else if (data.Children instanceof Object) {
          Object.values(data.Children).forEach((child: any) => traverse(child));
        }
      } else {
        // 尝试直接遍历 data
        traverse(data);
      }
      
      console.log(`✅ [书签服务] Safari plist：读取了 ${bookmarks.length} 个书签`);
      return bookmarks;
    } catch (error) {
      console.error('读取 Safari 书签失败:', error);
      return [];
    }
  }
}

export const bookmarkService = new BookmarkService();
export default bookmarkService;

