import { shell } from 'electron';
import { app as electronApp } from 'electron';
import { AppInfo } from '../../shared/types/app';
import * as fs from 'fs';
import * as path from 'path';
import pinyin from 'pinyin';

/**
 * 应用服务
 * 负责应用索引、搜索和启动
 */
class AppService {
  // ========== 常量 ==========
  // MAX_SCAN_DEPTH 已移除：不再使用递归扫描，改用系统索引

  // ========== 私有属性 ==========
  private apps: Map<string, AppInfo> = new Map();
  private indexed: boolean = false;
  // 性能优化：缓存搜索关键词，避免重复计算拼音
  private searchKeywordsCache: Map<string, string[]> = new Map();

  // ========== 公共 API ==========

  /**
   * 获取所有已安装的应用
   */
  public async getAllApps(): Promise<AppInfo[]> {
    if (!this.indexed) {
      await this.indexApps();
    }
    return Array.from(this.apps.values());
  }

  /**
   * 索引所有应用
   * @param ignoreCache 是否忽略缓存，强制重新扫描
   */
  public async indexApps(ignoreCache: boolean = false): Promise<void> {
    console.log('📱 [应用服务] 开始索引应用...');
    
    // 如果要求忽略缓存，直接执行全量扫描
    if (ignoreCache) {
      console.log('📱 [应用服务] 忽略缓存，执行完整扫描...');
      await this.scanAndUpdateApps();
      return;
    }
    
    // 否则，优先使用缓存（如果有）
    const { dbManager } = await import('../database/db');
    const cachedApps = await dbManager.getAllItems('app');

    if (cachedApps && cachedApps.length > 0) {
      console.log(`✓ [应用服务] 从缓存加载 ${cachedApps.length} 个应用`);
      this.loadAppsFromCache(cachedApps);
      return;
    }
    
    // 无缓存，完整扫描
    console.log('📱 [应用服务] 无缓存，开始完整扫描...');
    await this.scanAndUpdateApps();
  }

  /**
   * 强制重新扫描应用（忽略缓存）
   */
  public async reindexApps(): Promise<void> {
    console.log('📱 [应用服务] 强制重新扫描应用...');
    this.clearCache(); // 清空应用和关键词缓存
    await this.scanAndUpdateApps();
  }

  /**
   * 启动应用（使用系统命令，更可靠）
   */
  public async launchApp(appId: string): Promise<void> {
    const appInfo = this.apps.get(appId);
    
    if (!appInfo) {
      throw new Error(`Application not found: ${appId}`);
    }

    // 验证应用是否还存在
    const exists = await this.verifyAppExists(appId, appInfo.path);
    if (!exists) {
      throw new Error(`Application no longer exists: ${appInfo.path}`);
    }

    try {
      const platform = process.platform;
      const { execSync, spawn } = require('child_process');
      
      if (platform === 'darwin') {
        // macOS: 使用 open -a 命令（优先）或 open <path>（回退）
        // 注意：open -a 需要应用的实际名称（可能包含空格），需要使用路径
        try {
          // 尝试使用 open -a 启动（系统会自动查找应用）
          // 使用应用的显示名称，如果失败则使用路径
          execSync(`open -a "${appInfo.path}"`, { timeout: 5000 });
        } catch (openError) {
          // 回退到直接打开路径（使用 Electron shell API）
          console.log(`⚠️ [应用服务] open -a 失败，使用路径启动: ${openError}`);
          await shell.openPath(appInfo.path);
        }
      } else if (platform === 'win32') {
        // Windows: 如果是 .lnk 快捷方式，使用 shell 启动；否则直接执行路径
        if (appInfo.path.toLowerCase().endsWith('.lnk')) {
          // 快捷方式：使用 Windows shell 启动
          spawn('cmd', ['/c', 'start', '', appInfo.path], { detached: true });
        } else {
          // 可执行文件：直接打开
          await shell.openPath(appInfo.path);
        }
      } else {
        // Linux: 如果是 .desktop 文件，使用 gtk-launch 或 xdg-open
        if (appInfo.path.endsWith('.desktop')) {
          try {
            // 尝试使用 gtk-launch（需要 .desktop 文件名，不带路径）
            const desktopName = path.basename(appInfo.path);
            execSync(`gtk-launch ${desktopName}`, { timeout: 5000 });
          } catch (gtkError) {
            // 回退到 xdg-open
            await shell.openPath(appInfo.path);
          }
        } else {
          // 普通可执行文件
          await shell.openPath(appInfo.path);
        }
      }
      
      // 更新使用统计
      appInfo.launchCount++;
      appInfo.lastUsed = new Date();
      const { dbManager } = await import('../database/db');
      dbManager.updateItemUsage(appId);
      
      console.log(`✅ [应用服务] 已启动应用: ${appInfo.name}`);
    } catch (error) {
      console.error(`❌ [应用服务] 启动应用失败 ${appInfo.name}:`, error);
      throw error;
    }
  }

  /**
   * 搜索应用（支持拼音、中文、英文）
   */
  public async searchApps(query: string): Promise<AppInfo[]> {
    if (!query) {
      return this.getAllApps();
    }

    const searchTerm = query.toLowerCase().trim();
    const results: Array<{ app: AppInfo; score: number }> = [];
    const MAX_RESULTS = 50; // 限制搜索结果数量，提升性能

    for (const app of this.apps.values()) {
      const score = this.calculateAppScore(app, searchTerm);
      
      if (score > 0) {
        results.push({ app, score });
        // 如果已经收集到足够的高分结果（完全匹配），可以提前返回
        // 但为了保持准确性，还是收集所有结果再排序
      }
    }

    // 排序后限制返回数量
    return this.sortAppResults(results, searchTerm)
      .slice(0, MAX_RESULTS)
      .map(item => item.app);
  }

  // ========== 缓存加载 ==========

  /**
   * 从缓存加载应用
   */
  private loadAppsFromCache(cachedApps: any[]): void {
    for (const app of cachedApps) {
      this.apps.set(app.id, {
        id: app.id,
        name: app.name,
        path: app.path,
        icon: app.icon ?? undefined,
        category: app.category ?? undefined,
        launchCount: app.launchCount || 0,
        lastUsed: app.lastUsed ? new Date(app.lastUsed) : new Date(),
      });
      
      // 性能优化：加载缓存的搜索关键词（如果存在）
      if (app.searchKeywords) {
        const keywords = app.searchKeywords.split(',').filter(Boolean);
        this.searchKeywordsCache.set(app.id, keywords);
      }
    }
    
    this.indexed = true;
  }

  // ========== 索引相关 ==========

  /**
   * 扫描并更新应用数据库
   */
  private async scanAndUpdateApps(): Promise<void> {
    const platform = process.platform;
    const scannedApps = new Map<string, AppInfo>();
    
    // 扫描应用
    if (platform === 'darwin') {
      await this.indexMacApps(scannedApps);
    } else if (platform === 'win32') {
      await this.indexWindowsApps(scannedApps);
    } else if (platform === 'linux') {
      await this.indexLinuxApps(scannedApps);
    }

    // 验证并更新应用列表
    const verifiedApps = new Map<string, AppInfo>();
    
    for (const [id, app] of scannedApps) {
      if (fs.existsSync(app.path)) {
        verifiedApps.set(id, app);
        // 性能优化：预计算并缓存搜索关键词
        const keywords = this.getAppSearchKeys(app.name);
        this.searchKeywordsCache.set(id, keywords);
      }
    }
    
    this.apps = verifiedApps;
    await this.saveAppsToDatabase(verifiedApps);

    console.log(`✅ [应用服务] 已索引 ${this.apps.size} 个应用`);
    
    this.indexed = true;
  }

  /**
   * 保存应用到数据库
   */
  private async saveAppsToDatabase(apps: Map<string, AppInfo>): Promise<void> {
    const { dbManager } = await import('../database/db');
    const now = new Date();
    const appArray = Array.from(apps.values()).map(app => {
      const nameEn = /^[a-zA-Z0-9\s.-]+$/.test(app.name) ? app.name : null;
      const nameCn = /[\u4e00-\u9fa5]/.test(app.name) ? app.name : null;
      const searchKeys = this.getAppSearchKeys(app.name);
      const searchKeywords = searchKeys.join(',');
      
      return {
        id: app.id,
        type: 'app',
        name: app.name,
        nameEn: nameEn || undefined,
        nameCn: nameCn || undefined,
        path: app.path,
        icon: app.icon,
        category: app.category,
        launchCount: app.launchCount,
        lastUsed: app.lastUsed,
        score: app.launchCount * 0.1,
        indexedAt: now,
        searchKeywords,
      };
    });
    
    await dbManager.batchUpsertItems(appArray);
    
    // 清理旧的项目
    const currentAppIds = appArray.map(app => app.id);
    dbManager.clearOldItems(currentAppIds);
  }

  // ========== 平台特定扫描 ==========

  /**
   * 清空缓存（用于重新索引）
   */
  private clearCache(): void {
    this.apps.clear();
    this.searchKeywordsCache.clear();
  }

  /**
   * 索引 macOS 应用
   * 优先使用 Spotlight 索引（系统级，快速），失败时回退到目录遍历
   */
  private async indexMacApps(targetMap?: Map<string, AppInfo>): Promise<void> {
    // 优先尝试使用 Spotlight 索引（系统级，毫秒级响应）
    try {
      await this.indexMacAppsWithSpotlight(targetMap);
      return;
    } catch (error) {
      console.log('⚠️ [应用服务] Spotlight 索引失败，回退到目录遍历:', error);
      // 回退到目录遍历方案
      await this.indexMacAppsFallback(targetMap);
    }
  }

  /**
   * 使用 Spotlight (mdfind) 索引 macOS 应用（推荐方案）
   */
  private async indexMacAppsWithSpotlight(targetMap?: Map<string, AppInfo>): Promise<void> {
    const { execSync } = require('child_process');
    const appsMap = targetMap || this.apps;
    const homeDir = electronApp.getPath('home');
    
    try {
      // 使用 mdfind 查询 Spotlight 索引，只查找应用包
      // kMDItemContentType==com.apple.application-bundle 或 kMDItemKind==Application
      const command = 'mdfind "kMDItemContentType==com.apple.application-bundle"';
      const output = execSync(command, { 
        encoding: 'utf-8', 
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000 // 30秒超时
      });
      
      const appPaths = output.trim().split('\n').filter(p => p && p.trim());
      console.log(`🔍 [应用服务] Spotlight 找到 ${appPaths.length} 个应用路径`);
      
      // 只处理标准应用目录中的应用（排除系统应用和用户特定应用）
      const validDirs = [
        '/Applications',
        '/System/Applications',
        path.join(homeDir, 'Applications'),
      ];
      
      let processedCount = 0;
      for (const appPath of appPaths) {
        // 检查是否在有效目录中
        const isValidDir = validDirs.some(dir => appPath.startsWith(dir + '/') || appPath === dir);
        
        if (isValidDir && appPath.endsWith('.app')) {
          const appName = path.basename(appPath, '.app');
          await this.addMacApp(appPath, appName, appsMap);
          processedCount++;
        }
      }
      
      console.log(`✅ [应用服务] Spotlight 索引完成，处理了 ${processedCount} 个应用`);
    } catch (error) {
      console.error('❌ [应用服务] Spotlight 索引失败:', error);
      throw error; // 抛出错误以便回退到目录遍历
    }
  }

  /**
   * 回退方案：目录遍历（当 Spotlight 不可用时）
   */
  private async indexMacAppsFallback(targetMap?: Map<string, AppInfo>): Promise<void> {
    const appDirs = [
      '/Applications',
      path.join(electronApp.getPath('home'), 'Applications'),
    ];

    for (const dir of appDirs) {
      if (fs.existsSync(dir)) {
        await this.scanMacAppDirectory(dir, targetMap);
      }
    }
  }

  /**
   * 扫描 macOS 应用目录
   */
  private async scanMacAppDirectory(dir: string, targetMap?: Map<string, AppInfo>): Promise<void> {
    const appsMap = targetMap || this.apps;
    
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        if (entry.endsWith('.app')) {
          await this.addMacApp(path.join(dir, entry), entry, appsMap);
        }
      }
    } catch (error) {
      console.error(`⚠️ [应用服务] 扫描目录失败 ${dir}:`, error);
    }
  }

  /**
   * 添加 macOS 应用
   */
  private async addMacApp(appPath: string, defaultName: string, appsMap: Map<string, AppInfo>): Promise<void> {
    try {
      const appName = await this.getMacAppDisplayName(appPath, defaultName);
      // 性能优化：图标转换是异步的，但为了保持业务逻辑，仍然尝试获取
      // 如果图标转换失败或耗时，应用仍可正常使用
      let appIcon: string | undefined;
      try {
        // 使用 try-catch 包裹，避免图标转换失败影响索引
        appIcon = await Promise.race([
          this.getMacAppIcon(appPath),
          // 设置超时，避免图标转换阻塞太久（5秒超时）
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
        ]);
      } catch (iconError) {
        // 图标获取失败不影响应用索引
        console.debug(`图标获取跳过 ${appPath}:`, iconError);
      }
      
      const appInfo: AppInfo = {
        id: `mac-${appName}`,
        name: appName,
        path: appPath,
        icon: appIcon,
        launchCount: 0,
        lastUsed: new Date(),
      };

      appsMap.set(appInfo.id, appInfo);
    } catch (error) {
      console.error(`⚠️ [应用服务] 添加应用失败 ${appPath}:`, error);
    }
  }

  /**
   * 获取 macOS 应用的显示名称
   */
  private async getMacAppDisplayName(appPath: string, defaultName: string): Promise<string> {
    try {
      const { execSync } = require('child_process');
      
      // 使用 mdls 命令获取应用的显示名称（支持本地化）
      try {
        const result = execSync(`mdls -name kMDItemDisplayName "${appPath}"`, { encoding: 'utf-8', stdio: 'pipe' });
        const match = result.match(/kMDItemDisplayName = "(.+)"/);
        if (match && match[1]) {
          const displayName = match[1].replace('.app', '');
          if (displayName && displayName !== defaultName.replace('.app', '')) {
            return displayName;
          }
        }
      } catch (e) {
        // mdls 失败时继续尝试其他方法
      }

      // 读取 Info.plist 文件作为备用方案
      const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
      
      if (fs.existsSync(infoPlistPath)) {
        const content = fs.readFileSync(infoPlistPath, 'utf-8');
        
        const displayNameMatch = content.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/);
        if (displayNameMatch && displayNameMatch[1]) {
          return displayNameMatch[1].trim();
        }

        const bundleNameMatch = content.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/);
        if (bundleNameMatch && bundleNameMatch[1]) {
          return bundleNameMatch[1].trim();
        }
      }

      return defaultName.replace('.app', '');
    } catch (error) {
      console.error(`⚠️ [应用服务] 获取应用名称失败 ${appPath}:`, error);
      return defaultName.replace('.app', '');
    }
  }

  /**
   * 获取 macOS 应用的图标（从 .icns 文件转换为 PNG）
   */
  private async getMacAppIcon(appPath: string): Promise<string | undefined> {
    try {
      const iconPath = await this.findAppIconPath(appPath);
      
      if (iconPath && fs.existsSync(iconPath)) {
        return await this.convertIconToBase64(iconPath);
      }
    } catch (error) {
      console.error(`⚠️ [应用服务] 获取应用图标失败 ${appPath}:`, error);
    }
    
    return undefined;
  }

  /**
   * 查找应用图标路径
   */
  private async findAppIconPath(appPath: string): Promise<string | undefined> {
    const infoPlistPath = path.join(appPath, 'Contents', 'Info.plist');
    let iconName: string | undefined;
    
    if (fs.existsSync(infoPlistPath)) {
      const content = fs.readFileSync(infoPlistPath, 'utf-8');
      const iconMatch = content.match(/<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/);
      if (iconMatch && iconMatch[1]) {
        iconName = iconMatch[1].trim();
        if (!iconName.endsWith('.icns')) {
          iconName += '.icns';
        }
      }
    }
    
    const resourcesDir = path.join(appPath, 'Contents', 'Resources');
    
    if (iconName && fs.existsSync(path.join(resourcesDir, iconName))) {
      return path.join(resourcesDir, iconName);
    }
    
    // 备选：查找第一个 .icns 文件
    if (fs.existsSync(resourcesDir)) {
      const files = fs.readdirSync(resourcesDir);
      const iconFile = files.find(f => f.toLowerCase().endsWith('.icns'));
      if (iconFile) {
        return path.join(resourcesDir, iconFile);
      }
    }
    
    return undefined;
  }

  /**
   * 转换图标为 base64
   */
  private async convertIconToBase64(iconPath: string): Promise<string> {
    try {
      const platform = process.platform;
      const { execSync } = require('child_process');
      const tempFile = path.join(__dirname, '../../temp-icon.png');
      
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      let command: string;
      
      if (platform === 'darwin') {
        // macOS: 使用 sips 命令
        command = `sips -s format png "${iconPath}" --out "${tempFile}"`;
      } else if (platform === 'win32') {
        // Windows: 使用 PowerShell 或 Copy-Item
        // 对于 .ico 文件，直接读取原始文件
        if (iconPath.toLowerCase().endsWith('.ico')) {
          const buffer = fs.readFileSync(iconPath);
          const base64 = buffer.toString('base64');
          return `data:image/x-icon;base64,${base64}`;
        }
        // 对于其他格式，尝试直接读取
        const buffer = fs.readFileSync(iconPath);
        const base64 = buffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      } else {
        // Linux: 尝试使用 convert (ImageMagick) 或直接读取
        try {
          command = `convert "${iconPath}" "${tempFile}"`;
          execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        } catch {
          // 如果 ImageMagick 不可用，直接读取原始文件
          const buffer = fs.readFileSync(iconPath);
          const base64 = buffer.toString('base64');
          const ext = path.extname(iconPath).toLowerCase();
          const mime = ext === '.ico' ? 'image/x-icon' : 'image/png';
          return `data:${mime};base64,${base64}`;
        }
      }
      
      // 执行转换命令
      if (command) {
        execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      }
      
      if (fs.existsSync(tempFile)) {
        const pngBuffer = fs.readFileSync(tempFile);
        const base64 = pngBuffer.toString('base64');
        fs.unlinkSync(tempFile);
        
        return `data:image/png;base64,${base64}`;
      }
    } catch (err) {
      console.error(`⚠️ [应用服务] 转换图标失败 ${iconPath}:`, err);
    }
    
    throw new Error('Icon conversion failed');
  }

  /**
   * 索引 Windows 应用
   * 优先使用 Start Menu（用户可见应用），失败时回退到目录扫描
   */
  private async indexWindowsApps(targetMap?: Map<string, AppInfo>): Promise<void> {
    // 优先尝试使用 Start Menu（快速，只包含用户可见应用）
    try {
      await this.indexWindowsAppsFromStartMenu(targetMap);
      
      // Start Menu 成功后，还可以补充扫描用户安装目录（可选）
      const userProgramsPath = path.join(electronApp.getPath('home'), 'AppData', 'Local', 'Programs');
      if (fs.existsSync(userProgramsPath)) {
        await this.scanWindowsAppDirectory(userProgramsPath, targetMap, 2); // 只扫描2层深度
      }
      return;
    } catch (error) {
      console.log('⚠️ [应用服务] Start Menu 索引失败，回退到目录扫描:', error);
      // 回退到目录扫描方案
      await this.indexWindowsAppsFallback(targetMap);
    }
  }

  /**
   * 从 Start Menu 索引 Windows 应用（推荐方案）
   */
  private async indexWindowsAppsFromStartMenu(targetMap?: Map<string, AppInfo>): Promise<void> {
    const { execSync } = require('child_process');
    const appsMap = targetMap || this.apps;
    const homeDir = electronApp.getPath('home');
    
    const startMenuPaths = [
      path.join(homeDir, 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ];
    
    for (const startMenuPath of startMenuPaths) {
      if (!fs.existsSync(startMenuPath)) continue;
      
      try {
        // 使用 PowerShell 递归查找 .lnk 文件并解析快捷方式
        const psCommand = `
          $shortcuts = @()
          Get-ChildItem -Path "${startMenuPath.replace(/\\/g, '/')}" -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
            try {
              $shell = New-Object -ComObject WScript.Shell
              $shortcut = $shell.CreateShortcut($_.FullName)
              if ($shortcut.TargetPath -and (Test-Path $shortcut.TargetPath)) {
                $shortcuts += @{
                  Name = $_.BaseName
                  Path = $shortcut.TargetPath
                  Icon = $shortcut.IconLocation
                  WorkingDir = $shortcut.WorkingDirectory
                }
              }
            } catch {}
          }
          $shortcuts | ConvertTo-Json -Compress
        `;
        
        const output = execSync(
          `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`,
          { 
            encoding: 'utf-8', 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 60000 // 60秒超时
          }
        );
        
        if (output && output.trim()) {
          const shortcuts = JSON.parse(output);
          const shortcutArray = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
          
          for (const shortcut of shortcutArray) {
            if (shortcut.Path && fs.existsSync(shortcut.Path)) {
              const appName = shortcut.Name || path.basename(shortcut.Path, path.extname(shortcut.Path));
              const appInfo: AppInfo = {
                id: `win-${appName}`,
                name: appName,
                path: shortcut.Path, // 存储实际可执行文件路径，不是 .lnk 路径
                icon: shortcut.Icon || undefined,
                launchCount: 0,
                lastUsed: new Date(),
              };
              
              appsMap.set(appInfo.id, appInfo);
            }
          }
        }
      } catch (error) {
        console.error(`⚠️ [应用服务] Start Menu 扫描失败 ${startMenuPath}:`, error);
      }
    }
    
    console.log(`✅ [应用服务] Start Menu 索引完成，找到 ${appsMap.size} 个应用`);
  }

  /**
   * 回退方案：目录扫描（当 Start Menu 不可用时）
   */
  private async indexWindowsAppsFallback(targetMap?: Map<string, AppInfo>): Promise<void> {
    const searchPaths = [
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      path.join(electronApp.getPath('home'), 'AppData', 'Local', 'Programs'),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        await this.scanWindowsAppDirectory(searchPath, targetMap, 3); // 最大深度3
      }
    }
  }

  /**
   * 扫描 Windows 应用目录（回退方案使用）
   */
  private async scanWindowsAppDirectory(dir: string, targetMap?: Map<string, AppInfo>, maxDepth: number = 3): Promise<void> {
    try {
      await this.scanDirectoryRecursive(dir, (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.exe') {
          const appName = path.basename(filePath, '.exe');
          const appInfo: AppInfo = {
            id: `win-${appName}`,
            name: appName,
            path: filePath,
            launchCount: 0,
            lastUsed: new Date(),
          };

          const appsMap = targetMap || this.apps;
          appsMap.set(appInfo.id, appInfo);
        }
      }, maxDepth, 0);
    } catch (error) {
      console.error(`⚠️ [应用服务] 扫描目录失败 ${dir}:`, error);
    }
  }

  /**
   * 索引 Linux 应用
   */
  private async indexLinuxApps(targetMap?: Map<string, AppInfo>): Promise<void> {
    const searchPaths = [
      '/usr/share/applications',
      path.join(electronApp.getPath('home'), '.local', 'share', 'applications'),
    ];

    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        await this.scanLinuxAppDirectory(searchPath, targetMap);
      }
    }
  }

  /**
   * 扫描 Linux 应用目录
   */
  private async scanLinuxAppDirectory(dir: string, targetMap?: Map<string, AppInfo>): Promise<void> {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        if (entry.endsWith('.desktop')) {
          await this.addLinuxApp(path.join(dir, entry), targetMap);
        }
      }
    } catch (error) {
      console.error(`⚠️ [应用服务] 扫描目录失败 ${dir}:`, error);
    }
  }

  /**
   * 添加 Linux 应用（增强版：支持图标、分类、参数处理）
   */
  private async addLinuxApp(desktopPath: string, targetMap?: Map<string, AppInfo>): Promise<void> {
    try {
      const content = fs.readFileSync(desktopPath, 'utf-8');
      
      // 解析 .desktop 文件（支持多行值和转义字符）
      const parseDesktopFile = (content: string): Record<string, string> => {
        const lines = content.split('\n');
        const result: Record<string, string> = {};
        let currentKey = '';
        let currentValue = '';
        
        for (const line of lines) {
          // 跳过注释和空行
          if (line.trim().startsWith('#') || !line.trim()) {
            continue;
          }
          
          // 检查是否是键值对
          if (line.includes('=') && !line.startsWith('[')) {
            const equalIndex = line.indexOf('=');
            const key = line.substring(0, equalIndex).trim();
            let value = line.substring(equalIndex + 1).trim();
            
            // 处理转义字符
            value = value.replace(/\\s/g, ' ')
                        .replace(/\\n/g, '\n')
                        .replace(/\\t/g, '\t')
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
            
            result[key] = value;
          }
        }
        
        return result;
      };
      
      const desktop = parseDesktopFile(content);
      
      // 跳过 NoDisplay=true 或 Hidden=true 的应用
      if (desktop.NoDisplay === 'true' || desktop.Hidden === 'true') {
        return;
      }
      
      if (desktop.Name && desktop.Exec) {
        // 处理 Exec 字段：移除 %f, %u, %F, %U 等参数占位符
        let execPath = desktop.Exec;
        execPath = execPath.replace(/\s+%[fFuUdDnNickvm](\s|$)/g, ' ').trim();
        
        // 提取实际可执行文件路径（第一个空格前的部分）
        const execMatch = execPath.match(/^([^\s]+)/);
        const actualPath = execMatch ? execMatch[1] : execPath;
        
        // 如果路径不是绝对路径，尝试在 PATH 中查找（简化处理，直接使用原始路径）
        let fullPath = actualPath;
        if (!path.isAbsolute(actualPath)) {
          // 简化：直接使用 .desktop 文件路径，启动时使用 gtk-launch 或 xdg-open
          fullPath = desktopPath;
        }
        
        const appInfo: AppInfo = {
          id: `linux-${desktop.Name}`,
          name: desktop.Name,
          path: fullPath, // 存储实际执行路径或 .desktop 路径
          icon: desktop.Icon || undefined, // 支持图标字段
          category: desktop.Categories ? desktop.Categories.split(';').filter(Boolean)[0] : undefined,
          launchCount: 0,
          lastUsed: new Date(),
        };

        const appsMap = targetMap || this.apps;
        appsMap.set(appInfo.id, appInfo);
      }
    } catch (error) {
      console.error(`⚠️ [应用服务] 添加应用失败 ${desktopPath}:`, error);
    }
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectoryRecursive(
    dir: string,
    callback: (filePath: string) => void,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectoryRecursive(fullPath, callback, maxDepth, currentDepth + 1);
        } else if (entry.isFile()) {
          callback(fullPath);
        }
      }
    } catch (error) {
      // 忽略权限错误
      console.error(`⚠️ [应用服务] 扫描目录失败 ${dir}:`, error);
    }
  }

  /**
   * 验证应用是否还存在
   */
  private async verifyAppExists(appId: string, appPath: string): Promise<boolean> {
    try {
      if (fs.existsSync(appPath)) {
        return true;
      }
      
      console.log(`🗑️ [应用服务] 应用已卸载: ${appPath}`);
      this.apps.delete(appId);
      
      try {
        const { dbManager } = await import('../database/db');
        dbManager.deleteItem(appId);
      } catch (e) {
        console.error('❌ [应用服务] 删除应用记录失败:', e);
      }
      
      return false;
    } catch (error) {
      console.error(`❌ [应用服务] 验证应用失败:`, error);
      return false;
    }
  }

  // ========== 搜索相关 ==========

  /**
   * 计算应用匹配分数
   */
  private calculateAppScore(app: AppInfo, searchTerm: string): number {
    // 性能优化：使用缓存的关键词，避免重复计算拼音
    let appKeys = this.searchKeywordsCache.get(app.id);
    
    // 如果缓存中没有，则计算并缓存（第一次搜索时会计算）
    if (!appKeys) {
      appKeys = this.getAppSearchKeys(app.name);
      this.searchKeywordsCache.set(app.id, appKeys);
    }
    
    let maxScore = 0;
    
    // 检查原始名称
    if (app.name.toLowerCase().includes(searchTerm)) {
      const nameLower = app.name.toLowerCase();
      if (nameLower === searchTerm) {
        maxScore = Math.max(maxScore, 100); // 完全匹配
      } else if (nameLower.startsWith(searchTerm)) {
        maxScore = Math.max(maxScore, 80); // 开头匹配
      } else {
        maxScore = Math.max(maxScore, 60); // 包含匹配
      }
    }
    
    // 检查搜索关键词（使用缓存的关键词）
    for (const key of appKeys) {
      if (key.includes(searchTerm) && key.length >= searchTerm.length) {
        maxScore = Math.max(maxScore, 40); // 拼音匹配
        break;
      }
    }
    
    return maxScore;
  }

  /**
   * 排序应用结果
   */
  private sortAppResults(results: Array<{ app: AppInfo; score: number }>, searchTerm: string): Array<{ app: AppInfo; score: number }> {
    return results.sort((a, b) => {
      // 1. 按评分排序
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      const aName = a.app.name.toLowerCase();
      const bName = b.app.name.toLowerCase();
      
      // 2. 开头匹配优先
      const aStarts = aName.startsWith(searchTerm);
      const bStarts = bName.startsWith(searchTerm);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // 3. 索引位置
      const aIndex = aName.indexOf(searchTerm);
      const bIndex = bName.indexOf(searchTerm);
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // 4. 名称长度（短优先）
      if (aName.length !== bName.length) {
        return aName.length - bName.length;
      }
      
      // 5. 使用次数
      return b.app.launchCount - a.app.launchCount;
    });
  }

  /**
   * 获取应用的拼音搜索关键词
   */
  private getAppSearchKeys(appName: string): string[] {
    const keys = new Set<string>();
    
    keys.add(appName.toLowerCase());
    keys.add(appName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
    
    // 中文字符转拼音
    const chineseChars = appName.match(/[\u4e00-\u9fa5]/g);
    if (chineseChars && chineseChars.length > 0) {
      try {
        const pinyinResult = pinyin(appName, { style: 'FIRST_LETTER' });
        const firstLetters = pinyinResult.flat().filter(Boolean).join('').toLowerCase();
        if (firstLetters) {
          keys.add(firstLetters);
        }
        
        const fullPinyinResult = pinyin(appName, { style: 'NORMAL' });
        const fullPinyin = fullPinyinResult.flat().filter(Boolean).join('').toLowerCase();
        if (fullPinyin) {
          keys.add(fullPinyin);
        }
      } catch (error) {
        console.error('⚠️ [应用服务] 拼音转换失败:', error);
      }
    }
    
    // 首字母缩略词
    const words = appName.split(/[\s-]+/);
    if (words.length > 0) {
      const initials = words.map(w => w[0] || '').join('').toLowerCase();
      if (initials && initials.length > 1) {
        keys.add(initials);
      }
    }
    
    return Array.from(keys);
  }
}

export const appService = new AppService();
export default appService;
