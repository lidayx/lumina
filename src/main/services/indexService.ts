import { appService } from './appService';
import fileService from './fileService';
import bookmarkService from './bookmarkService';

/**
 * 索引服务
 * 负责定期重新索引，检测新增和已卸载的应用
 */
class IndexService {
  private intervalId: NodeJS.Timeout | null = null;
  private isIndexing: boolean = false;

  // ========== 定时任务管理 ==========

  /**
   * 启动定期索引
   * @param intervalMinutes 索引间隔（分钟），默认30分钟
   */
  public startPeriodicIndexing(intervalMinutes: number = 30): void {
    this.stopPeriodicIndexing();
    this.intervalId = setInterval(async () => {
      await this.executeIndexing();
    }, intervalMinutes * 60 * 1000);
    console.log(`✅ [索引服务] 已启动定期索引（每 ${intervalMinutes} 分钟）`);
  }

  /**
   * 停止定期索引
   */
  public stopPeriodicIndexing(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 手动触发重新索引
   */
  public async forceReIndex(): Promise<void> {
    if (this.isIndexing) {
      console.log('⏳ [索引服务] 索引正在进行中，请稍候...');
      return;
    }

    console.log('🔄 [索引服务] 手动触发重新索引...');
    await this.executeIndexing('manual');
  }

  // ========== 索引执行逻辑 ==========

  /**
   * 执行索引任务
   */
  private async executeIndexing(mode: 'auto' | 'manual' = 'auto'): Promise<void> {
    if (this.isIndexing) {
      console.log('⏳ [索引服务] 索引正在进行中，跳过本次索引');
      return;
    }

    this.isIndexing = true;
    const startTime = Date.now();

    try {
      console.log(`📊 [索引服务] 开始${mode === 'manual' ? '手动' : '定期'}索引更新...`);
      
      await this.performIndexing();
      
      const duration = Date.now() - startTime;
      console.log(`✅ [索引服务] 索引更新完成（耗时 ${duration}ms）`);
      
      // 通知UI索引完成
      this.notifyIndexingComplete();
    } catch (error) {
      console.error('❌ [索引服务] 索引失败:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * 执行实际的索引操作
   */
  private async performIndexing(): Promise<void> {
    // 强制重新扫描（忽略缓存）
    console.log('🔄 [索引服务] 开始重新扫描...');
    
    // 重新索引应用
    await appService.reindexApps();
    
    // 重新扫描文件（根据设置决定是否索引）
    const { default: settingsService } = await import('./settingsService');
    const fileSearchEnabled = settingsService.getSetting('fileSearchEnabled');
    if (fileSearchEnabled) {
      await fileService.reindexFiles();
    } else {
      console.log('📁 [索引服务] 文件搜索已禁用，跳过文件索引');
    }
    
    // 重新加载书签
    await bookmarkService.loadBookmarks();
    
    console.log('✅ [索引服务] 重新扫描完成');
  }

  // ========== 状态查询 ==========

  /**
   * 获取索引状态
   */
  public getIndexingStatus(): { isIndexing: boolean; hasInterval: boolean } {
    return {
      isIndexing: this.isIndexing,
      hasInterval: this.intervalId !== null,
    };
  }

  /**
   * 获取索引统计
   */
  public async getStats() {
    const { dbManager } = await import('../database/db');
    return dbManager.getStats();
  }

  /**
   * 通知索引完成
   */
  private notifyIndexingComplete(): void {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window: Electron.BrowserWindow) => {
      if (!window.isDestroyed()) {
        window.webContents.send('indexing-complete');
      }
    });
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.stopPeriodicIndexing();
    console.log('🗑️ [索引服务] 服务已销毁');
  }
}

export const indexService = new IndexService();
export default indexService;
