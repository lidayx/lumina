/**
 * 命令别名服务
 * 管理命令别名，支持快捷命令和命令链
 */

import { dbManager } from '../database/db';

export interface Alias {
  id: string;
  name: string; // 别名，如 "g", "c"
  command: string; // 实际命令，如 "google", "chrome"
  type: 'app' | 'web' | 'command' | 'search'; // 类型
  description?: string; // 描述
  createdAt: string;
  useCount: number; // 使用次数
}

/**
 * 命令别名服务类
 */
class AliasService {
  private aliases: Map<string, Alias> = new Map();
  private loaded: boolean = false;

  /**
   * 初始化服务
   */
  public async initialize(): Promise<void> {
    await this.loadAliases();
  }

  /**
   * 从数据库加载别名
   */
  private async loadAliases(): Promise<void> {
    try {
      const db = await dbManager.getDb();
      
      // 创建别名表（如果不存在）
      db.run(`
        CREATE TABLE IF NOT EXISTS aliases (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          command TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          createdAt TEXT NOT NULL,
          useCount INTEGER DEFAULT 0
        )
      `);

      // 加载所有别名（使用 prepare + step 方式）
      const stmt = db.prepare('SELECT * FROM aliases ORDER BY useCount DESC, createdAt DESC');
      const rows: Alias[] = [];
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        rows.push(row as Alias);
      }
      stmt.free();
      
      this.aliases.clear();
      for (const row of rows) {
        this.aliases.set(row.name.toLowerCase(), row as Alias);
      }

      this.loaded = true;
      console.log(`✅ [别名服务] 已加载 ${this.aliases.size} 个别名`);
    } catch (error) {
      console.error('❌ [别名服务] 加载别名失败:', error);
      this.loaded = true; // 即使失败也标记为已加载，避免重复尝试
    }
  }

  /**
   * 添加别名
   */
  public async addAlias(name: string, command: string, type: Alias['type'], description?: string): Promise<Alias> {
    try {
      const aliasName = name.toLowerCase().trim();
      
      if (!aliasName) {
        throw new Error('别名不能为空');
      }

      if (!command) {
        throw new Error('命令不能为空');
      }

      // 检查别名是否已存在
      if (this.aliases.has(aliasName)) {
        throw new Error(`别名 "${name}" 已存在`);
      }

      const alias: Alias = {
        id: `alias-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: aliasName,
        command: command.trim(),
        type,
        description,
        createdAt: new Date().toISOString(),
        useCount: 0,
      };

      // 保存到数据库
      const db = await dbManager.getDb();
      const stmt = db.prepare(
        'INSERT INTO aliases (id, name, command, type, description, createdAt, useCount) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      stmt.run([alias.id, alias.name, alias.command, alias.type, alias.description || null, alias.createdAt, alias.useCount]);
      stmt.free();
      dbManager.saveDatabase();

      // 添加到内存
      this.aliases.set(aliasName, alias);
      this.clearSortedCache(); // 清除排序缓存

      console.log(`✅ [别名服务] 已添加别名: ${name} -> ${command}`);
      return alias;
    } catch (error: any) {
      console.error(`❌ [别名服务] 添加别名失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 删除别名
   */
  public async removeAlias(name: string): Promise<boolean> {
    try {
      const aliasName = name.toLowerCase().trim();
      
      if (!this.aliases.has(aliasName)) {
        return false;
      }

      // 从数据库删除
      const db = await dbManager.getDb();
      const stmt = db.prepare('DELETE FROM aliases WHERE name = ?');
      stmt.run([aliasName]);
      stmt.free();
      dbManager.saveDatabase();

      // 从内存删除
      this.aliases.delete(aliasName);
      this.clearSortedCache(); // 清除排序缓存

      console.log(`✅ [别名服务] 已删除别名: ${name}`);
      return true;
    } catch (error) {
      console.error(`❌ [别名服务] 删除别名失败: ${error}`);
      return false;
    }
  }

  /**
   * 更新别名
   */
  public async updateAlias(name: string, updates: Partial<Pick<Alias, 'command' | 'type' | 'description'>>): Promise<boolean> {
    try {
      const aliasName = name.toLowerCase().trim();
      const alias = this.aliases.get(aliasName);
      
      if (!alias) {
        return false;
      }

      // 更新字段
      if (updates.command !== undefined) alias.command = updates.command.trim();
      if (updates.type !== undefined) alias.type = updates.type;
      if (updates.description !== undefined) alias.description = updates.description;

      // 更新数据库
      const db = await dbManager.getDb();
      const stmt = db.prepare('UPDATE aliases SET command = ?, type = ?, description = ? WHERE name = ?');
      stmt.run([alias.command, alias.type, alias.description || null, aliasName]);
      stmt.free();
      dbManager.saveDatabase();
      this.clearSortedCache(); // 清除排序缓存

      console.log(`✅ [别名服务] 已更新别名: ${name}`);
      return true;
    } catch (error) {
      console.error(`❌ [别名服务] 更新别名失败: ${error}`);
      return false;
    }
  }

  /**
   * 解析输入，检查是否匹配别名
   * 支持命令链：`g 搜索词` -> `google 搜索词`
   * 优化：使用防抖减少数据库写入频率
   */
  private useCountUpdateQueue: Map<string, number> = new Map();
  private useCountUpdateTimer: NodeJS.Timeout | null = null;
  private readonly USE_COUNT_UPDATE_DELAY = 2000; // 2秒防抖

  public resolveAlias(input: string): { resolved: string; alias?: Alias; hasArgs: boolean } | null {
    if (!this.loaded) {
      return null;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // 检查是否以别名开头（支持空格分隔的参数）
    const parts = trimmed.split(/\s+/, 2);
    const aliasName = parts[0].toLowerCase();
    const args = parts[1] || '';

    const alias = this.aliases.get(aliasName);
    if (!alias) {
      return null;
    }

    // 增加使用次数（异步，不阻塞）
    this.incrementUseCount(aliasName);

    // 构建解析后的命令
    let resolved: string;
    if (args) {
      // 有参数：命令链模式
      if (alias.type === 'web' || alias.type === 'search') {
        // 网页搜索：`g 搜索词` -> `google 搜索词`
        resolved = `${alias.command} ${args}`;
      } else if (alias.type === 'app') {
        // 应用启动：`c` -> `chrome`，如果有参数则忽略
        resolved = alias.command;
      } else {
        // 其他命令：`cmd arg` -> `command arg`
        resolved = `${alias.command} ${args}`;
      }
    } else {
      // 无参数：直接替换
      resolved = alias.command;
    }

    return {
      resolved,
      alias,
      hasArgs: !!args,
    };
  }

  /**
   * 增加使用次数（优化：使用防抖批量更新）
   */
  private incrementUseCount(name: string): void {
    const alias = this.aliases.get(name.toLowerCase());
    if (!alias) return;

    // 立即更新内存中的计数
    alias.useCount = (alias.useCount || 0) + 1;

    // 加入更新队列
    this.useCountUpdateQueue.set(name, alias.useCount);

    // 防抖：延迟批量更新数据库
    if (this.useCountUpdateTimer) {
      clearTimeout(this.useCountUpdateTimer);
    }

    this.useCountUpdateTimer = setTimeout(() => {
      this.flushUseCountUpdates();
    }, this.USE_COUNT_UPDATE_DELAY);
  }

  /**
   * 批量刷新使用次数到数据库
   */
  private async flushUseCountUpdates(): Promise<void> {
    if (this.useCountUpdateQueue.size === 0) {
      return;
    }

    try {
      const db = await dbManager.getDb();
      const updates = Array.from(this.useCountUpdateQueue.entries());
      this.useCountUpdateQueue.clear();

      // 批量更新
      for (const [name, count] of updates) {
        const stmt = db.prepare('UPDATE aliases SET useCount = ? WHERE name = ?');
        stmt.run([count, name]);
        stmt.free();
      }

      dbManager.saveDatabase();
    } catch (error) {
      console.error(`❌ [别名服务] 批量更新使用次数失败: ${error}`);
    }
  }

  /**
   * 获取所有别名
   * 优化：缓存排序结果，减少重复计算
   */
  private sortedAliasesCache: Alias[] | null = null;

  public getAllAliases(): Alias[] {
    // 如果缓存有效，直接返回
    if (this.sortedAliasesCache) {
      return this.sortedAliasesCache;
    }

    // 计算排序结果
    const sorted = Array.from(this.aliases.values()).sort((a, b) => {
      // 按使用次数降序，然后按创建时间降序
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 缓存结果
    this.sortedAliasesCache = sorted;
    return sorted;
  }

  /**
   * 清除排序缓存（在别名变更时调用）
   */
  private clearSortedCache(): void {
    this.sortedAliasesCache = null;
  }

  /**
   * 获取别名
   */
  public getAlias(name: string): Alias | undefined {
    return this.aliases.get(name.toLowerCase());
  }

  /**
   * 检查别名是否存在
   */
  public hasAlias(name: string): boolean {
    return this.aliases.has(name.toLowerCase());
  }
}

export const aliasService = new AliasService();

