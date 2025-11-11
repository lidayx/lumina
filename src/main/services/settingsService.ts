import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { dbManager } from '../database/db';

/**
 * 应用设置接口
 */
export interface AppSettings {
  // 启动设置
  autoStart: boolean;
  minimizeToTray: boolean;
  fastStart: boolean;
  
  // 文件索引设置
  fileSearchEnabled: boolean; // 是否开启文件搜索
  fileSearchPaths: string[]; // 自定义搜索文件目录
  searchDebounce: number;
  
  // 应用设置
  indexingInterval: number;
  
  // 界面设置
  theme: 'light' | 'dark' | 'auto';
  
  // 开发者模式
  developerMode: boolean; // 开发者模式，开启后记录 debug 日志
  
  // 翻译设置
  baiduTranslateAppId: string; // 百度翻译 AppID
  baiduTranslateSecretKey: string; // 百度翻译 Secret Key
  
  // 剪贴板设置
  clipboardEnabled: boolean; // 是否启用剪贴板历史
  clipboardMaxItems: number; // 最大记录数（默认 50）
  clipboardRetentionDays: number; // 保留天数（默认 7）
  
  // 密码生成设置
  passwordDefaultLength: number; // 默认密码长度（默认 16）
  passwordDefaultCount: number; // 默认生成密码数量（默认 10）
  passwordIncludeLowercase: boolean; // 包含小写字母（默认 true）
  passwordIncludeUppercase: boolean; // 包含大写字母（默认 true）
  passwordIncludeNumbers: boolean; // 包含数字（默认 true）
  passwordIncludeSpecial: boolean; // 包含特殊字符（默认 true）
  
  // 功能开关设置
  featurePasswordGeneration: boolean; // 密码生成功能（pwd/password/密码）（默认 true）
  featureUuidGeneration: boolean; // UUID 生成功能（默认 true）
  featureRandomString: boolean; // 随机字符串功能（默认 true）
  featureRandomPassword: boolean; // 随机密码功能（旧格式）（默认 true）
  featureRandomNumber: boolean; // 随机数字功能（默认 true）
  featureEncodeDecode: boolean; // 编码解码功能（URL、HTML、Base64、MD5）（默认 true）
  featureStringTools: boolean; // 字符串工具功能（默认 true）
  featureTimeTools: boolean; // 时间工具功能（默认 true）
  featureTranslation: boolean; // 翻译功能（默认 true）
  featureVariableName: boolean; // 变量名生成功能（默认 true）
  featureCalculator: boolean; // 计算器功能（默认 true）
}

/**
 * 设置服务
 */
class SettingsService {
  // ========== 常量 ==========
  private readonly SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
  private readonly DEFAULT_SETTINGS: AppSettings = {
    autoStart: false,
    minimizeToTray: false,
    fastStart: true,
    fileSearchEnabled: true, // 默认开启文件搜索
    fileSearchPaths: [], // 空数组表示使用默认路径
    searchDebounce: 300,
    indexingInterval: 30,
    theme: 'auto',
    developerMode: false, // 默认关闭开发者模式
    baiduTranslateAppId: '', // 百度翻译 AppID（需要在设置中配置）
    baiduTranslateSecretKey: '', // 百度翻译 Secret Key（需要在设置中配置）
    clipboardEnabled: true, // 默认启用剪贴板历史
    clipboardMaxItems: 50, // 默认最大记录 50 条
    clipboardRetentionDays: 7, // 默认保留 7 天
    passwordDefaultLength: 16, // 默认密码长度 16
    passwordDefaultCount: 10, // 默认生成 10 个密码
    passwordIncludeLowercase: true, // 默认包含小写字母
    passwordIncludeUppercase: true, // 默认包含大写字母
    passwordIncludeNumbers: true, // 默认包含数字
    passwordIncludeSpecial: true, // 默认包含特殊字符
    featurePasswordGeneration: true, // 默认启用密码生成功能
    featureUuidGeneration: true, // 默认启用 UUID 生成功能
    featureRandomString: true, // 默认启用随机字符串功能
    featureRandomPassword: true, // 默认启用随机密码功能
    featureRandomNumber: true, // 默认启用随机数字功能
    featureEncodeDecode: true, // 默认启用编码解码功能
    featureStringTools: true, // 默认启用字符串工具功能
    featureTimeTools: true, // 默认启用时间工具功能
    featureTranslation: true, // 默认启用翻译功能
    featureVariableName: true, // 默认启用变量名生成功能
    featureCalculator: true, // 默认启用计算器功能
  };

  // ========== 私有属性 ==========
  private settings: AppSettings = this.DEFAULT_SETTINGS;
  private loaded: boolean = false;
  private useDatabase: boolean = true; // 是否使用数据库存储

  // ========== 公共 API ==========

  constructor() {
    // 异步加载设置
    this.loadSettings().catch(err => {
      console.error('❌ [设置服务] 初始化加载失败:', err);
    });
  }

  /**
   * 获取所有设置
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * 获取单个设置
   */
  public getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  /**
   * 更新设置
   */
  public async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
    
    // 应用设置
    this.applySettings(updates);
  }

  /**
   * 重置设置
   */
  public async resetSettings(): Promise<void> {
    this.settings = { ...this.DEFAULT_SETTINGS };
    await this.saveSettings();
    this.applySettings(this.settings);
  }

  // ========== 私有方法 ==========

  /**
   * 加载设置
   */
  private async loadSettings(): Promise<void> {
    try {
      // 尝试从数据库加载
      try {
        const db = await dbManager.getDb();
        if (db) {
          const dbSettings = await this.loadSettingsFromDatabase();
          if (dbSettings && Object.keys(dbSettings).length > 0) {
            this.settings = { ...this.DEFAULT_SETTINGS, ...dbSettings };
            console.log('✅ [设置服务] 已从数据库加载用户设置');
            this.useDatabase = true;
            this.loaded = true;
            this.applyStartupSettings();
            return;
          }
        }
      } catch (dbError) {
        console.warn('⚠️ [设置服务] 从数据库加载失败，尝试从文件加载:', dbError);
        this.useDatabase = false;
      }

      // 如果数据库没有设置，尝试从 JSON 文件加载（向后兼容）
      if (fs.existsSync(this.SETTINGS_FILE)) {
        const content = fs.readFileSync(this.SETTINGS_FILE, 'utf-8');
        const fileSettings = JSON.parse(content);
        this.settings = { ...this.DEFAULT_SETTINGS, ...fileSettings };
        
        console.log('✅ [设置服务] 已从文件加载用户设置');
        
        // 迁移到数据库
        await this.migrateSettingsToDatabase(fileSettings);
        
        this.loaded = true;
      } else {
        this.settings = { ...this.DEFAULT_SETTINGS };
        console.log('✅ [设置服务] 使用默认设置');
        
        // 保存默认设置到数据库
        await this.saveSettingsToDatabase(this.settings);
        
        this.loaded = true;
      }
      
      // 应用启动设置
      this.applyStartupSettings();
    } catch (error) {
      console.error('❌ [设置服务] 加载设置失败:', error);
      this.settings = { ...this.DEFAULT_SETTINGS };
      this.loaded = true;
    }
  }

  /**
   * 保存设置
   */
  private async saveSettings(): Promise<void> {
    try {
      if (this.useDatabase) {
        await this.saveSettingsToDatabase(this.settings);
      } else {
        // 如果数据库不可用，回退到文件
      fs.writeFileSync(this.SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
        console.log('✅ [设置服务] 已保存设置到文件');
      }
    } catch (error) {
      console.error('❌ [设置服务] 保存设置失败:', error);
      // 如果数据库保存失败，尝试保存到文件作为备份
      try {
        fs.writeFileSync(this.SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      } catch (fileError) {
        console.error('❌ [设置服务] 保存到文件也失败:', fileError);
      }
    }
  }

  /**
   * 从数据库加载设置
   */
  private async loadSettingsFromDatabase(): Promise<Partial<AppSettings>> {
    try {
      const db = await dbManager.getDb();
      if (!db) {
        return {};
      }

      const stmt = db.prepare('SELECT key, value FROM settings');
      const settings: Record<string, any> = {};
      
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        try {
          const parsedValue = JSON.parse(row.value);
          settings[row.key] = parsedValue;
        } catch (e) {
          // 如果解析失败，尝试直接使用值
          settings[row.key] = row.value;
          console.warn(`⚠️ [设置服务] 解析设置 ${row.key} 失败，使用原始值:`, row.value);
        }
      }
      
      stmt.free();
      return settings as Partial<AppSettings>;
    } catch (error) {
      console.error('❌ [设置服务] 从数据库加载设置失败:', error);
      return {};
    }
  }

  /**
   * 保存设置到数据库
   */
  private async saveSettingsToDatabase(settings: AppSettings): Promise<void> {
    try {
      const db = await dbManager.getDb();
      if (!db) {
        throw new Error('数据库未初始化');
      }

      const now = new Date().toISOString();
      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `);

      // 保存所有设置项
      for (const [key, value] of Object.entries(settings)) {
        const valueStr = JSON.stringify(value);
        stmt.run([key, valueStr, now]);
      }

      stmt.free();
      dbManager.saveDatabase();
      console.log('✅ [设置服务] 已保存设置到数据库');
    } catch (error) {
      console.error('❌ [设置服务] 保存设置到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 迁移设置从文件到数据库
   */
  private async migrateSettingsToDatabase(fileSettings: Partial<AppSettings>): Promise<void> {
    try {
      await this.saveSettingsToDatabase({ ...this.DEFAULT_SETTINGS, ...fileSettings });
      console.log('✅ [设置服务] 已迁移设置到数据库');
      
      // 迁移成功后，可以删除旧文件（可选）
      // fs.unlinkSync(this.SETTINGS_FILE);
      // console.log('✅ [设置服务] 已删除旧设置文件');
    } catch (error) {
      console.error('❌ [设置服务] 迁移设置到数据库失败:', error);
    }
  }

  /**
   * 应用启动设置
   */
  private applyStartupSettings(): void {
    // 开机自启动
    if (this.settings.autoStart) {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: this.settings.minimizeToTray,
      });
      console.log('✅ [设置服务] 已启用开机自启动');
    } else {
      app.setLoginItemSettings({
        openAtLogin: false,
      });
    }
  }

  /**
   * 应用设置
   */
  private applySettings(updates: Partial<AppSettings>): void {
    if ('autoStart' in updates || 'minimizeToTray' in updates) {
      this.applyStartupSettings();
    }
    
    if ('developerMode' in updates) {
      // 开发者模式变更时，使用动态 import 以避免循环依赖
      setImmediate(async () => {
        try {
          const { debugLog } = await import('../utils/debugLog');
          debugLog.setEnabled(updates.developerMode);
        } catch (error) {
          console.error('更新开发者模式失败:', error);
        }
      });
    }
    
    if ('baiduTranslateAppId' in updates || 'baiduTranslateSecretKey' in updates) {
      // 翻译配置变更时，更新翻译服务（异步调用）
      setImmediate(async () => {
        try {
          const { translateService } = await import('./translateService');
          await translateService.updateProviderConfig();
          console.log('✅ [设置服务] 已更新翻译服务配置');
        } catch (error) {
          console.error('❌ [设置服务] 更新翻译配置失败:', error);
        }
      });
    }
    
    if ('clipboardEnabled' in updates || 'clipboardMaxItems' in updates || 'clipboardRetentionDays' in updates) {
      // 剪贴板设置变更时，更新剪贴板服务（异步调用）
      setImmediate(async () => {
        try {
          const { clipboardService } = await import('./clipboardService');
          await clipboardService.updateSettings();
          console.log('✅ [设置服务] 已更新剪贴板服务配置');
        } catch (error) {
          console.error('❌ [设置服务] 更新剪贴板配置失败:', error);
        }
      });
    }
  }
}

export const settingsService = new SettingsService();
export default settingsService;

