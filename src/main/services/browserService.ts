import { shell } from 'electron';
import { BrowserConfig } from '../../shared/types/browser';

/**
 * 浏览器配置接口（内部使用）
 */
interface BrowserConfigData {
  isDefault: boolean;
  addedAt?: string;
  updatedAt?: string;
}

/**
 * 浏览器管理服务
 */
class BrowserService {
  // ========== 常量 ==========
  private readonly CONFIG_ITEM_ID = 'browser-config';
  private readonly BROWSER_PREFIX = 'browser-';
  private readonly DEFAULT_BROWSER_SCORE = 100;
  private readonly BROWSER_NAMES = ['chrome', 'edge', 'firefox', 'safari'];

  // ========== 私有属性 ==========
  private browsers: BrowserConfig[] = [];
  private defaultBrowserId: string | null = null;

  constructor() {
    console.log('BrowserService 初始化...');
    // 异步初始化，不阻塞构造函数
    (async () => {
      await this.loadBrowsers();
    })().catch(err => {
      console.error('BrowserService 初始化失败:', err);
    });
  }

  // ========== 初始化相关 ==========

  /**
   * 加载浏览器配置
   */
  private async loadBrowsers(): Promise<void> {
    try {
      await this.loadDefaultBrowserId();
      await this.loadBrowsersFromDatabase();
      
      if (this.browsers.length === 0) {
        await this.initDefaultBrowsers();
      }
    } catch (error) {
      console.error('加载浏览器配置失败:', error);
      await this.initDefaultBrowsers();
    }
  }

  /**
   * 初始化默认浏览器
   */
  private async initDefaultBrowsers(): Promise<void> {
    // 添加系统默认浏览器
    this.browsers = [{
      id: 'default',
      name: '系统默认',
      path: '',
      isDefault: true,
      icon: undefined
    }];

    // 从应用数据库自动发现浏览器
    const browserApps = await this.discoverBrowsersFromApps();
    this.browsers.push(...browserApps);

    // 保存到数据库
    await this.saveBrowsersToDatabase();
    console.log('已保存默认浏览器到数据库');
  }

  /**
   * 从应用数据库自动发现浏览器
   */
  private async discoverBrowsersFromApps(): Promise<BrowserConfig[]> {
    try {
      // 等待应用数据库准备就绪（最多重试10次，每次500ms）
      let apps: any[] = [];
      let retries = 10;
      
      while (retries > 0 && apps.length === 0) {
        const { dbManager } = await import('../database/db');
        apps = await dbManager.getAllItems('app');
        if (apps.length === 0) {
          console.log(`⏳ [浏览器服务] 等待应用数据库准备就绪 (剩余 ${retries} 次重试)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          retries--;
        }
      }

      if (apps.length === 0) {
        console.log('⚠️ [浏览器服务] 应用数据库尚未准备就绪，使用默认浏览器列表');
        return [];
      }

      console.log(`🔍 [浏览器服务] 在 ${apps.length} 个应用中查找浏览器...`);
      
      const browsers: BrowserConfig[] = [];

      for (const app of apps) {
        if (this.isBrowserApp(app.name, app.nameCn, app.nameEn)) {
          browsers.push({
            id: app.id,
            name: app.name,
            path: app.path,
            isDefault: false,
            icon: app.icon || undefined,
          });
          console.log(`✅ [浏览器服务] 发现浏览器: ${app.name}`);
        }
      }

      console.log(`📋 [浏览器服务] 共发现 ${browsers.length} 个浏览器`);
      return browsers;
    } catch (error) {
      console.error('❌ [浏览器服务] 从应用数据库发现浏览器失败:', error);
      return [];
    }
  }

  /**
   * 判断是否为浏览器应用
   * 优化：提前返回，减少不必要的遍历
   */
  private isBrowserApp(name?: string, nameCn?: string | null, nameEn?: string | null): boolean {
    if (!name && !nameCn && !nameEn) {
      return false;
    }
    
    // 缓存小写转换结果
    const nameLower = name?.toLowerCase() || '';
    const nameCnLower = nameCn?.toLowerCase() || '';
    const nameEnLower = nameEn?.toLowerCase() || '';
    
    // 检查是否包含任何浏览器名称
    for (const browserName of this.BROWSER_NAMES) {
      if (nameLower.includes(browserName) || 
          nameCnLower.includes(browserName) || 
          nameEnLower.includes(browserName)) {
        return true;
      }
    }
    
    return false;
  }

  // ========== 数据库加载相关 ==========

  /**
   * 从数据库加载默认浏览器ID
   */
  private async loadDefaultBrowserId(): Promise<void> {
    try {
      const { dbManager } = await import('../database/db');
      const config = await dbManager.getItemById(this.CONFIG_ITEM_ID);
      if (config?.description) {
        const configData = JSON.parse(config.description);
        this.defaultBrowserId = configData.defaultBrowserId || null;
        console.log('从数据库加载默认浏览器ID:', this.defaultBrowserId);
      }
    } catch (error) {
      console.log('未找到默认浏览器配置，使用默认值');
    }
  }

  /**
   * 从数据库加载浏览器
   */
  private async loadBrowsersFromDatabase(): Promise<void> {
    try {
      const { dbManager } = await import('../database/db');
      const items = await dbManager.getAllItems('browser');
      this.browsers = items.map(item => this.convertDbItemToBrowser(item));
      console.log(`从数据库加载了 ${this.browsers.length} 个浏览器`);
    } catch (error) {
      console.error('从数据库加载浏览器失败:', error);
    }
  }

  /**
   * 将数据库项转换为浏览器配置
   */
  private convertDbItemToBrowser(item: any): BrowserConfig {
    const browserId = this.removeBrowserPrefix(item.id);

    return {
      id: browserId,
      name: item.name,
      path: item.path,
      isDefault: this.isDefaultBrowser(browserId),
      icon: item.icon || undefined,
      homepage: item.homepage,
    };
  }


  /**
   * 判断是否为默认浏览器
   */
  private isDefaultBrowser(id: string): boolean {
    return this.defaultBrowserId ? id === this.defaultBrowserId : false;
  }

  /**
   * 移除浏览器ID前缀
   */
  private removeBrowserPrefix(id: string): string {
    return id.replace(this.BROWSER_PREFIX, '');
  }

  // ========== 数据库保存相关 ==========

  /**
   * 保存所有浏览器到数据库
   */
  private async saveBrowsersToDatabase(): Promise<void> {
    const now = new Date();
    
    for (const browser of this.browsers) {
      await this.saveBrowserToDatabase(browser, now);
    }
  }

  /**
   * 保存单个浏览器到数据库
   */
  private async saveBrowserToDatabase(browser: BrowserConfig, timestamp: Date = new Date()): Promise<void> {
    const configData: BrowserConfigData = {
      isDefault: browser.isDefault || false,
      addedAt: timestamp.toISOString(),
    };

    try {
      const { dbManager } = await import('../database/db');
      await dbManager.upsertItem({
        id: `${this.BROWSER_PREFIX}${browser.id}`,
        type: 'browser',
        name: browser.name,
        path: browser.path,
        icon: browser.icon,
        category: 'browser',
        description: JSON.stringify(configData),
        launchCount: 0,
        lastUsed: undefined,
        score: this.getBrowserScore(browser),
        indexedAt: timestamp,
        searchKeywords: browser.name.toLowerCase(),
      });
    } catch (error) {
      console.error(`保存浏览器 ${browser.name} 到数据库失败:`, error);
    }
  }

  /**
   * 获取浏览器评分
   */
  private getBrowserScore(browser: BrowserConfig): number {
    return browser.isDefault ? this.DEFAULT_BROWSER_SCORE : 0;
  }

  /**
   * 保存默认浏览器配置到数据库
   */
  private async saveDefaultBrowserId(): Promise<void> {
    const configData = {
      defaultBrowserId: this.defaultBrowserId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const { dbManager } = await import('../database/db');
      await dbManager.upsertItem({
        id: this.CONFIG_ITEM_ID,
        type: 'config',
        name: '浏览器配置',
        path: '',
        description: JSON.stringify(configData),
        category: 'config',
        launchCount: 0,
        lastUsed: undefined,
        score: 0,
        indexedAt: new Date(),
      });
      
      console.log('已保存默认浏览器ID到数据库:', this.defaultBrowserId);
    } catch (error) {
      console.error('保存默认浏览器ID到数据库失败:', error);
    }
  }

  // ========== 公共 API ==========

  /**
   * 获取所有浏览器
   */
  public getAllBrowsers(): BrowserConfig[] {
    return this.browsers;
  }

  /**
   * 添加浏览器
   */
  public async addBrowser(browser: BrowserConfig): Promise<void> {
    browser.id = browser.id || `browser-${Date.now()}`;
    browser.isDefault = false;
    
    this.browsers.push(browser);
    await this.saveBrowserToDatabase(browser);
    await this.saveConfig();
    
    console.log(`已添加浏览器: ${browser.name}`);
  }

  /**
   * 更新浏览器
   */
  public async updateBrowser(id: string, updates: Partial<BrowserConfig>): Promise<void> {
    const index = this.browsers.findIndex(b => b.id === id);
    if (index === -1) return;

    this.browsers[index] = { ...this.browsers[index], ...updates };
    await this.saveBrowserToDatabase(this.browsers[index]);
    await this.saveConfig();
    
    console.log(`已更新浏览器: ${this.browsers[index].name}`);
  }

  /**
   * 删除浏览器
   */
  public async deleteBrowser(id: string): Promise<void> {
    const browser = this.browsers.find(b => b.id === id);
    if (!browser) return;

    this.browsers = this.browsers.filter(b => b.id !== id);

    // 如果删除的是默认浏览器，选择第一个作为默认
    if (this.defaultBrowserId === id && this.browsers.length > 0) {
      this.defaultBrowserId = this.browsers[0].id;
    }

    // 从数据库删除
    try {
      const { dbManager } = await import('../database/db');
      await dbManager.deleteItem(`${this.BROWSER_PREFIX}${browser.id}`);
      console.log(`已从数据库删除浏览器: ${browser.name}`);
    } catch (error) {
      console.error('从数据库删除浏览器失败:', error);
    }

    await this.saveConfig();
  }

  /**
   * 设置默认浏览器
   */
  public async setDefaultBrowser(id: string): Promise<void> {
    this.defaultBrowserId = id;

    // 更新所有浏览器的 isDefault 标记
    this.browsers.forEach(browser => {
      browser.isDefault = browser.id === id;
    });

    // 更新数据库
    await this.updateBrowsersInDatabase();
    await this.saveConfig();

    console.log(`已设置默认浏览器: ${id}`);
  }

  /**
   * 更新数据库中所有浏览器的状态
   */
  private async updateBrowsersInDatabase(): Promise<void> {
    const now = new Date();
    
    for (const browser of this.browsers) {
      const configData: BrowserConfigData = {
        isDefault: browser.isDefault,
        updatedAt: now.toISOString(),
      };

      try {
        const { dbManager } = await import('../database/db');
        await dbManager.upsertItem({
          id: `${this.BROWSER_PREFIX}${browser.id}`,
          type: 'browser',
          name: browser.name,
          path: browser.path,
          icon: browser.icon,
          category: 'browser',
          description: JSON.stringify(configData),
          score: this.getBrowserScore(browser),
          indexedAt: new Date(),
          searchKeywords: browser.name.toLowerCase(),
        });
      } catch (error) {
        console.error(`更新浏览器 ${browser.name} 到数据库失败:`, error);
      }
    }
  }

  /**
   * 获取默认浏览器
   */
  public getDefaultBrowser(): BrowserConfig | null {
    return this.browsers.find(b => b.id === this.defaultBrowserId) || null;
  }

  /**
   * 打开 URL
   */
  public async openUrl(url: string): Promise<void> {
    const defaultBrowser = this.getDefaultBrowser();

    if (defaultBrowser?.path) {
      await this.openWithBrowser(defaultBrowser, url);
    } else {
      await shell.openExternal(url);
    }
  }

  /**
   * 使用指定浏览器打开 URL
   */
  private async openWithBrowser(browser: BrowserConfig, url: string): Promise<void> {
    try {
      const { exec } = require('child_process');
      const command = this.getBrowserOpenCommand(browser.path, url);

      await exec(command);
      console.log(`使用 ${browser.name} 打开: ${url}`);
    } catch (error) {
      console.error('使用指定浏览器打开失败，使用系统默认:', error);
      await shell.openExternal(url);
    }
  }

  /**
   * 获取浏览器打开命令
   */
  private getBrowserOpenCommand(path: string, url: string): string {
    const platform = process.platform;

    if (platform === 'darwin') {
      return `open -a "${path}" "${url}"`;
    } else if (platform === 'win32') {
      return `start "${path}" "${url}"`;
    } else {
      return `${path} "${url}"`;
    }
  }

  // ========== 工具方法 ==========

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      await this.saveDefaultBrowserId();
    } catch (error) {
      console.error('保存浏览器配置失败:', error);
    }
  }
}

export const browserService = new BrowserService();
export default browserService;

console.log('BrowserService 模块已加载');

