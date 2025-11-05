import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

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
  };

  // ========== 私有属性 ==========
  private settings: AppSettings = this.DEFAULT_SETTINGS;
  private loaded: boolean = false;

  // ========== 公共 API ==========

  constructor() {
    this.loadSettings();
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
  public updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    
    // 应用设置
    this.applySettings(updates);
  }

  /**
   * 重置设置
   */
  public resetSettings(): void {
    this.settings = { ...this.DEFAULT_SETTINGS };
    this.saveSettings();
    this.applySettings(this.settings);
  }

  // ========== 私有方法 ==========

  /**
   * 加载设置
   */
  private loadSettings(): void {
    try {
      if (fs.existsSync(this.SETTINGS_FILE)) {
        const content = fs.readFileSync(this.SETTINGS_FILE, 'utf-8');
        this.settings = { ...this.DEFAULT_SETTINGS, ...JSON.parse(content) };
        
        console.log('✅ [设置服务] 已加载用户设置');
      } else {
        this.settings = { ...this.DEFAULT_SETTINGS };
        console.log('✅ [设置服务] 使用默认设置');
      }
      
      // 应用启动设置
      this.applyStartupSettings();
      
      this.loaded = true;
    } catch (error) {
      console.error('❌ [设置服务] 加载设置失败:', error);
      this.settings = { ...this.DEFAULT_SETTINGS };
      this.loaded = true;
    }
  }

  /**
   * 保存设置
   */
  private saveSettings(): void {
    try {
      fs.writeFileSync(this.SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
      console.log('✅ [设置服务] 已保存设置');
    } catch (error) {
      console.error('❌ [设置服务] 保存设置失败:', error);
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

