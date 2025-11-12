/**
 * 剪贴板历史管理服务
 * 自动记录剪贴板内容，支持搜索和快速粘贴
 */

import { clipboard } from 'electron';
import { dbManager } from '../database/db';
import * as crypto from 'crypto';

// ========== 类型定义 ==========

export interface ClipboardItem {
  id: string;
  content: string;
  contentPreview: string;
  contentType: 'text' | 'html';
  copyCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

// ========== 剪贴板服务类 ==========

class ClipboardService {
  private isEnabled: boolean = false;
  private lastContent: string = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private watchInterval: ReturnType<typeof setInterval> | null = null;
  private readonly DEBOUNCE_DELAY = 500; // 500ms 防抖
  private readonly WATCH_INTERVAL = 1000; // 1秒检查一次剪贴板
  
  // 缓存预览结果（性能优化）
  private previewCache: Map<string, string> = new Map();
  private readonly PREVIEW_CACHE_MAX_SIZE = 100;

  // ========== 公共 API ==========

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    try {
      // 确保数据库已初始化（通过 getDb 来触发）
      await dbManager.getDb();
      await this.loadSettings();
      
      if (this.isEnabled) {
        this.startWatching();
      }
      
      // 定期清理过期记录
      this.scheduleCleanup();
      
      console.log('✅ [剪贴板服务] 初始化完成');
    } catch (error) {
      console.error('❌ [剪贴板服务] 初始化失败:', error);
    }
  }

  /**
   * 开始监听剪贴板
   */
  public startWatching(): void {
    if (this.watchInterval) {
      return; // 已经在监听
    }

    this.isEnabled = true;
    this.lastContent = clipboard.readText();
    
    // 定期检查剪贴板变化
    this.watchInterval = setInterval(() => {
      this.checkClipboard();
    }, this.WATCH_INTERVAL);

    console.log('📋 [剪贴板服务] 开始监听剪贴板');
  }

  /**
   * 停止监听剪贴板
   */
  public stopWatching(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.isEnabled = false;
    console.log('📋 [剪贴板服务] 停止监听剪贴板');
  }

  /**
   * 获取历史记录
   */
  public async getHistory(limit: number = 50): Promise<ClipboardItem[]> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return [];
      }

      const stmt = db.prepare(`
        SELECT 
          id, 
          content, 
          content_preview, 
          content_type, 
          copy_count, 
          created_at, 
          last_used_at
        FROM clipboard_history
        ORDER BY created_at DESC
        LIMIT ?
      `);
      
      stmt.bind([limit]);
      
      const items: ClipboardItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        items.push({
          id: row.id,
          content: row.content,
          contentPreview: row.content_preview || this.getPreview(row.content),
          contentType: row.content_type || 'text',
          copyCount: row.copy_count || 1,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at || undefined,
        });
      }
      
      stmt.free();
      return items;
    } catch (error) {
      console.error('❌ [剪贴板服务] 获取历史失败:', error);
      return [];
    }
  }

  /**
   * 搜索历史记录
   */
  public async searchHistory(query: string, limit: number = 20): Promise<ClipboardItem[]> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return [];
      }

      const searchQuery = `%${query}%`;
      const stmt = db.prepare(`
        SELECT 
          id, 
          content, 
          content_preview, 
          content_type, 
          copy_count, 
          created_at, 
          last_used_at
        FROM clipboard_history
        WHERE content LIKE ? OR content_preview LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      
      stmt.bind([searchQuery, searchQuery, limit]);
      
      const items: ClipboardItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        items.push({
          id: row.id,
          content: row.content,
          contentPreview: row.content_preview || this.getPreview(row.content),
          contentType: row.content_type || 'text',
          copyCount: row.copy_count || 1,
          createdAt: row.created_at,
          lastUsedAt: row.last_used_at || undefined,
        });
      }
      
      stmt.free();
      return items;
    } catch (error) {
      console.error('❌ [剪贴板服务] 搜索历史失败:', error);
      return [];
    }
  }

  /**
   * 删除指定记录
   */
  public async deleteItem(id: string): Promise<void> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      const stmt = db.prepare('DELETE FROM clipboard_history WHERE id = ?');
      stmt.bind([id]);
      stmt.step();
      stmt.free();
      
      dbManager.saveDatabase();
      console.log(`✅ [剪贴板服务] 删除记录: ${id}`);
    } catch (error) {
      console.error('❌ [剪贴板服务] 删除记录失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有历史
   */
  public async clearHistory(): Promise<void> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      db.run('DELETE FROM clipboard_history');
      dbManager.saveDatabase();
      
      console.log('✅ [剪贴板服务] 清空所有历史');
    } catch (error) {
      console.error('❌ [剪贴板服务] 清空历史失败:', error);
      throw error;
    }
  }

  /**
   * 粘贴指定项到剪贴板
   */
  public async pasteItem(id: string): Promise<void> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      const stmt = db.prepare('SELECT content, content_type FROM clipboard_history WHERE id = ?');
      stmt.bind([id]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject() as any;
        const content = row.content;
        const contentType = row.content_type || 'text';
        
        // 写入剪贴板
        if (contentType === 'html') {
          clipboard.writeHTML(content);
        } else {
          clipboard.writeText(content);
        }
        
        // 更新最后使用时间
        const updateStmt = db.prepare('UPDATE clipboard_history SET last_used_at = ? WHERE id = ?');
        updateStmt.bind([new Date().toISOString(), id]);
        updateStmt.step();
        updateStmt.free();
        
        dbManager.saveDatabase();
        
        console.log(`✅ [剪贴板服务] 粘贴记录: ${id}`);
      }
      
      stmt.free();
    } catch (error) {
      console.error('❌ [剪贴板服务] 粘贴失败:', error);
      throw error;
    }
  }

  /**
   * 更新设置（从设置服务加载）
   */
  public async updateSettings(): Promise<void> {
    await this.loadSettings();
    
    if (this.isEnabled) {
      if (!this.watchInterval) {
        this.startWatching();
      }
    } else {
      this.stopWatching();
    }
  }

  // ========== 私有方法 ==========

  /**
   * 从设置服务加载配置
   */
  private async loadSettings(): Promise<void> {
    try {
      const { default: settingsService } = await import('./settingsService');
      const settings = settingsService.getSettings();
      this.isEnabled = settings.clipboardEnabled !== false;
    } catch (error) {
      console.error('❌ [剪贴板服务] 加载设置失败:', error);
      this.isEnabled = true; // 默认启用
    }
  }

  /**
   * 检查剪贴板变化
   */
  private checkClipboard(): void {
    if (!this.isEnabled) {
      return;
    }

    try {
      const currentContent = clipboard.readText();
      
      // 忽略空内容和重复内容
      if (!currentContent || currentContent === this.lastContent) {
        return;
      }

      this.lastContent = currentContent;
      
      // 防抖处理
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(() => {
        this.recordClipboard(currentContent);
      }, this.DEBOUNCE_DELAY);
    } catch (error) {
      // 忽略错误（可能是权限问题）
    }
  }

  /**
   * 记录剪贴板内容
   */
  private async recordClipboard(content: string): Promise<void> {
    try {
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      // 生成内容哈希作为 ID（用于去重）
      const contentHash = crypto.createHash('md5').update(content).digest('hex');
      const preview = this.getPreview(content);
      const now = new Date().toISOString();

      // 检查是否已存在
      const checkStmt = db.prepare('SELECT id, copy_count FROM clipboard_history WHERE id = ?');
      checkStmt.bind([contentHash]);
      
      if (checkStmt.step()) {
        // 已存在，更新复制次数和时间
        const row = checkStmt.getAsObject() as any;
        const newCount = (row.copy_count || 1) + 1;
        
        const updateStmt = db.prepare(`
          UPDATE clipboard_history 
          SET copy_count = ?, created_at = ?, last_used_at = ?
          WHERE id = ?
        `);
        updateStmt.bind([newCount, now, now, contentHash]);
        updateStmt.step();
        updateStmt.free();
      } else {
        // 新记录，插入
        const insertStmt = db.prepare(`
          INSERT INTO clipboard_history 
          (id, content, content_preview, content_type, copy_count, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insertStmt.bind([contentHash, content, preview, 'text', 1, now, now]);
        insertStmt.step();
        insertStmt.free();
      }
      
      checkStmt.free();
      
      // 限制记录数量
      await this.limitHistorySize();
      
      dbManager.saveDatabase();
    } catch (error) {
      console.error('❌ [剪贴板服务] 记录失败:', error);
    }
  }

  /**
   * 限制历史记录数量
   */
  private async limitHistorySize(): Promise<void> {
    try {
      const { default: settingsService } = await import('./settingsService');
      const settings = settingsService.getSettings();
      const maxItems = settings.clipboardMaxItems || 50;
      
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      // 获取当前记录数
      const countStmt = db.prepare('SELECT COUNT(*) as count FROM clipboard_history');
      countStmt.step();
      const count = (countStmt.getAsObject() as any).count;
      countStmt.free();
      
      if (count > maxItems) {
        // 删除最旧的记录
        const deleteCount = count - maxItems;
        const deleteStmt = db.prepare(`
          DELETE FROM clipboard_history 
          WHERE id IN (
            SELECT id FROM clipboard_history 
            ORDER BY created_at ASC 
            LIMIT ?
          )
        `);
        deleteStmt.bind([deleteCount]);
        deleteStmt.step();
        deleteStmt.free();
        
        console.log(`📋 [剪贴板服务] 清理了 ${deleteCount} 条旧记录`);
      }
    } catch (error) {
      console.error('❌ [剪贴板服务] 限制历史数量失败:', error);
    }
  }

  /**
   * 获取内容预览（前100字符）
   * 优化：使用缓存减少重复计算
   */
  private getPreview(content: string): string {
    if (!content) {
      return '';
    }
    
    // 检查缓存
    const cached = this.previewCache.get(content);
    if (cached !== undefined) {
      return cached;
    }
    
    // 移除换行符，替换为空格
    const cleaned = content.replace(/\n/g, ' ').replace(/\r/g, '');
    
    // 截取前100字符
    const preview = cleaned.length <= 100 
      ? cleaned 
      : cleaned.substring(0, 100) + '...';
    
    // 缓存结果（限制缓存大小）
    if (this.previewCache.size >= this.PREVIEW_CACHE_MAX_SIZE) {
      // 删除最旧的条目（FIFO）
      const firstKey = this.previewCache.keys().next().value;
      if (firstKey) {
        this.previewCache.delete(firstKey);
      }
    }
    this.previewCache.set(content, preview);
    
    return preview;
  }

  /**
   * 定期清理过期记录
   */
  private scheduleCleanup(): void {
    // 每小时清理一次
    setInterval(() => {
      this.cleanupExpired().catch(err => {
        console.error('❌ [剪贴板服务] 定时清理失败:', err);
      });
    }, 60 * 60 * 1000);
    
    // 启动时也清理一次
    this.cleanupExpired().catch(err => {
      console.error('❌ [剪贴板服务] 启动清理失败:', err);
    });
  }

  /**
   * 清理过期记录
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const { default: settingsService } = await import('./settingsService');
      const settings = settingsService.getSettings();
      const retentionDays = settings.clipboardRetentionDays || 7;
      
      const db = await dbManager.getDb();
      
      if (!db) {
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffDateStr = cutoffDate.toISOString();

      const deleteStmt = db.prepare('DELETE FROM clipboard_history WHERE created_at < ?');
      deleteStmt.bind([cutoffDateStr]);
      deleteStmt.step();
      deleteStmt.free();
      
      dbManager.saveDatabase();
      
      console.log(`📋 [剪贴板服务] 清理过期记录（保留 ${retentionDays} 天）`);
    } catch (error) {
      console.error('❌ [剪贴板服务] 清理过期记录失败:', error);
    }
  }
}

export const clipboardService = new ClipboardService();
export default clipboardService;

