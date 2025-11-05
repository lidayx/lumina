import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// 动态导入 sql.js（兼容开发/生产环境）
let initSqlJsSync: any;

const loadSqlJs = async () => {
  if (!initSqlJsSync) {
    try {
      // 尝试从 node_modules 加载
      initSqlJsSync = require('sql.js/dist/sql-wasm');
    } catch (error) {
      // 如果失败，尝试从打包后的路径加载
      const sqljsPath = require.resolve('sql.js/dist/sql-wasm');
      initSqlJsSync = require(sqljsPath);
    }
  }
  return initSqlJsSync;
};

interface DatabaseItem {
  id: string;
  type: string;
  name: string;
  nameEn?: string | null;
  nameCn?: string | null;
  path: string;
  icon?: string | null;
  description?: string | null;
  category?: string | null;
  launchCount: number;
  lastUsed: string | null;
  score: number;
  indexedAt: string;
  searchKeywords?: string | null;
}

interface DatabaseItemInput {
  id: string;
  type: string;
  name: string;
  nameEn?: string;
  nameCn?: string;
  path: string;
  icon?: string;
  description?: string;
  category?: string;
  launchCount?: number;
  lastUsed?: Date;
  score?: number;
  indexedAt: Date;
  searchKeywords?: string;
}

class SimpleDatabase {
  private db: any = null; // sql.js Database type
  private dataPath: string;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dataPath = path.join(userDataPath, 'lumina.db');
  }

  private async ensureInit() {
    if (this.initialized || this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }
    
    this.initPromise = this.doInit();
    await this.initPromise;
  }

  private async doInit(): Promise<void> {
    if (this.initialized || this.db) return;
    
    console.log('📊 [数据库] 开始初始化...');
    console.log('📁 [数据库] 路径:', this.dataPath);
    
    try {
      const sqlJsModule = await loadSqlJs();
      const SQL = await sqlJsModule();
      console.log('✅ [数据库] sql.js 模块加载成功');
      
      const dbExists = fs.existsSync(this.dataPath);
      if (dbExists) {
        const fileBuffer = fs.readFileSync(this.dataPath);
        this.db = new SQL.Database(fileBuffer);
        console.log('📂 [数据库] 加载现有数据库');
        
        // 确保表结构是最新的（包括新添加的表）
        this.initSchema();
        this.save(); // 保存表结构更新
        
        const stats = this.getStats();
        console.log('📊 [数据库] 统计数据:');
        console.log(`   - 总项目数: ${stats.totalItems}`);
        console.log(`   - 类型分布:`, stats.typeStats);
      } else {
        this.db = new SQL.Database();
        this.initSchema();
        this.save();
        console.log('🆕 [数据库] 创建新数据库');
      }
      
      this.initDefaultTypes();
      this.initialized = true;
      console.log('✅ [数据库] 初始化完成');
    } catch (error) {
      console.error('❌ [数据库] 初始化失败:', error);
      this.initPromise = null; // 重置 promise，允许重试
      throw error;
    }
  }

  private initSchema() {
    if (!this.db) return;

    // items 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        nameEn TEXT,
        nameCn TEXT,
        path TEXT NOT NULL,
        icon TEXT,
        description TEXT,
        category TEXT,
        launchCount INTEGER DEFAULT 0,
        lastUsed TEXT,
        score REAL DEFAULT 0,
        indexedAt TEXT NOT NULL,
        searchKeywords TEXT
      )
    `);

    // item_types 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS item_types (
        type TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        description TEXT
      )
    `);

    // clipboard_history 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS clipboard_history (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        content_preview TEXT,
        content_type TEXT DEFAULT 'text',
        copy_count INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      )
    `);

    // settings 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 索引
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_type ON items(type)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_score ON items(score DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_launchCount ON items(launchCount DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_clipboard_created_at ON clipboard_history(created_at DESC)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_clipboard_preview ON clipboard_history(content_preview)`);
    
    // 如果旧表存在但没有 searchKeywords 列，添加该列
    try {
      this.db.run(`ALTER TABLE items ADD COLUMN searchKeywords TEXT`);
    } catch (e) {
      // 列已存在
    }
  }

  private initDefaultTypes() {
    if (!this.db) return;

    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM item_types');
    const result = stmt.getAsObject() as { count: number };
    stmt.free();

    if (result.count === 0) {
      const types = [
        { type: 'app', label: '应用', icon: 'app', description: '应用程序' },
        { type: 'file', label: '文件', icon: 'file', description: '文件' },
        { type: 'command', label: '命令', icon: 'command', description: '命令行' },
        { type: 'web', label: '网页', icon: 'web', description: '网页' },
        { type: 'browser', label: '浏览器', icon: 'browser', description: '浏览器' },
        { type: 'search-engine', label: '搜索引擎', icon: 'search', description: '搜索引擎' },
        { type: 'history', label: '历史', icon: 'history', description: '历史记录' },
        { type: 'custom', label: '自定义', icon: 'custom', description: '自定义' },
      ];

      const insertStmt = this.db.prepare(
        'INSERT INTO item_types (type, label, icon, description) VALUES (?, ?, ?, ?)'
      );

      for (const t of types) {
        insertStmt.run([t.type, t.label, t.icon, t.description]);
      }
      
      insertStmt.free();
      this.save();
    }
  }

  private save() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dataPath, Buffer.from(data));
    } catch (error) {
      console.error('保存数据库失败:', error);
    }
  }

  /**
   * 公共保存方法（用于外部手动保存）
   */
  public saveDatabase(): void {
    this.save();
  }

  /**
   * 获取数据库实例（用于执行自定义 SQL）
   */
  public async getDb(): Promise<any> {
    await this.ensureInit();
    return this.db;
  }

  public async upsertItem(item: DatabaseItemInput) {
    await this.ensureInit();
    if (!this.db) return;

    const stmt = this.db.prepare(`
      INSERT INTO items (
        id, type, name, nameEn, nameCn, path, icon, description, category,
        launchCount, lastUsed, score, indexedAt, searchKeywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        nameEn = excluded.nameEn,
        nameCn = excluded.nameCn,
        path = excluded.path,
        icon = excluded.icon,
        description = excluded.description,
        category = excluded.category,
        launchCount = excluded.launchCount,
        lastUsed = excluded.lastUsed,
        score = excluded.score,
        indexedAt = excluded.indexedAt,
        searchKeywords = excluded.searchKeywords
    `);

    stmt.run([
      item.id,
      item.type,
      item.name,
      item.nameEn || null,
      item.nameCn || null,
      item.path,
      item.icon || null,
      item.description || null,
      item.category || null,
      item.launchCount || 0,
      item.lastUsed ? item.lastUsed.toISOString() : null,
      item.score || 0,
      item.indexedAt.toISOString(),
      item.searchKeywords || null,
    ]);

    stmt.free();
    this.save();
    
    // 只对重要的操作输出日志
    if (item.type === 'config' || item.type === 'browser' || item.type === 'search-engine') {
      console.log(`💾 [数据库] ${item.type}: ${item.name}`);
    }
  }

  public async batchUpsertItems(items: DatabaseItemInput[]) {
    await this.ensureInit();
    if (!this.db || items.length === 0) return;

    // 事务 + 批量执行，提高性能
    const stmt = this.db.prepare(`
      INSERT INTO items (
        id, type, name, nameEn, nameCn, path, icon, description, category,
        launchCount, lastUsed, score, indexedAt, searchKeywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        type = excluded.type,
        name = excluded.name,
        nameEn = excluded.nameEn,
        nameCn = excluded.nameCn,
        path = excluded.path,
        icon = excluded.icon,
        description = excluded.description,
        category = excluded.category,
        launchCount = excluded.launchCount,
        lastUsed = excluded.lastUsed,
        score = excluded.score,
        indexedAt = excluded.indexedAt,
        searchKeywords = excluded.searchKeywords
    `);

    // 批量执行，只在最后保存一次
    for (const item of items) {
      stmt.run([
        item.id,
        item.type,
        item.name,
        item.nameEn || null,
        item.nameCn || null,
        item.path,
        item.icon || null,
        item.description || null,
        item.category || null,
        item.launchCount || 0,
        item.lastUsed ? item.lastUsed.toISOString() : null,
        item.score || 0,
        item.indexedAt.toISOString(),
        item.searchKeywords || null,
      ]);
    }

    stmt.free();
    // 仅最后保存一次
    this.save();
  }

  public async getItemById(id: string): Promise<DatabaseItem | null> {
    await this.ensureInit();
    if (!this.db) return null;

    const stmt = this.db.prepare('SELECT * FROM items WHERE id = ?');
    stmt.bind([id]);

    let item: DatabaseItem | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject() as any;
    }

    stmt.free();
    
    if (item) {
      console.log(`🔍 [数据库] 查询项: ${id}`);
    }
    
    return item;
  }

  public async getAllItems(type?: string): Promise<DatabaseItem[]> {
    await this.ensureInit();
    if (!this.db) return [];

    let query = 'SELECT * FROM items';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY score DESC, launchCount DESC, lastUsed DESC';

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const items: DatabaseItem[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as any);
    }
    
    stmt.free();
    
    return items;
  }

  public async searchItems(query: string, type?: string): Promise<DatabaseItem[]> {
    await this.ensureInit();
    if (!this.db) return [];

    let sql = `
      SELECT * FROM items 
      WHERE (name LIKE ? OR nameEn LIKE ? OR nameCn LIKE ? OR description LIKE ? OR searchKeywords LIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ` ORDER BY 
      CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
      CASE WHEN searchKeywords LIKE ? THEN 1 ELSE 2 END,
      score DESC, 
      launchCount DESC 
      LIMIT 50`;
    
    params.push(`${query}%`, `%,${query},%`);

    const stmt = this.db.prepare(sql);
    stmt.bind(params);

    const items: DatabaseItem[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as any);
    }
    
    stmt.free();
    return items;
  }

  public updateItemUsage(itemId: string) {
    if (!this.db) return;

    const stmt = this.db.prepare(`
      UPDATE items 
      SET launchCount = launchCount + 1,
          lastUsed = ?,
          score = score + 0.1
      WHERE id = ?
    `);
    
    stmt.run([new Date().toISOString(), itemId]);
    stmt.free();
    this.save();
  }

  public deleteItem(itemId: string) {
    if (!this.db) return;

    const stmt = this.db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run([itemId]);
    stmt.free();
    this.save();
  }

  public clearOldItems(currentItemIds: string[], maxAgeDays: number = 7) {
    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    const stmt = this.db.prepare(`
      DELETE FROM items 
      WHERE indexedAt < ? AND id NOT IN (${currentItemIds.map(() => '?').join(',')})
    `);
    
    stmt.run([cutoffDate.toISOString(), ...currentItemIds]);
    stmt.free();
    this.save();
  }

  /**
   * 清除指定类型的所有项目
   */
  public async clearItemsByType(type: string): Promise<void> {
    await this.ensureInit();
    if (!this.db) return;

    const stmt = this.db.prepare('DELETE FROM items WHERE type = ?');
    stmt.run([type]);
    stmt.free();
    this.save();
    
    console.log(`✅ [数据库] 已清除类型 "${type}" 的所有项目`);
  }

  public getStats() {
    if (!this.db) {
      return { totalItems: 0, lastIndexed: '', typeStats: [] };
    }

    const stmt = this.db.prepare(`
      SELECT 
        type,
        COUNT(*) as count
      FROM items
      GROUP BY type
    `);

    const typeStats: Array<{ type: string; count: number }> = [];
    while (stmt.step()) {
      typeStats.push(stmt.getAsObject() as any);
    }
    
    stmt.free();

    const total = typeStats.reduce((sum, t) => sum + (t.count as number), 0);

    return {
      totalItems: total,
      lastIndexed: '',
      typeStats,
    };
  }

  public getTypes() {
    if (!this.db) return [];

    const stmt = this.db.prepare('SELECT * FROM item_types');
    const types = [];
    
    while (stmt.step()) {
      types.push(stmt.getAsObject());
    }
    
    stmt.free();
    return types as any[];
  }
}

export const dbManager = new SimpleDatabase();
export default dbManager;
