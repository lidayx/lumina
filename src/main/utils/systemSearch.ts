import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

// 常量定义
const MAX_BUFFER_SIZE = 1024 * 1024 * 10; // 10MB
const DEFAULT_MAX_RESULTS = 50;
const WINDOWS_SEARCH_TIMEOUT = 5000; // 5秒
const FIND_SEARCH_TIMEOUT = 10000; // 10秒
const LOG_PREFIX = '[系统搜索]';

export interface SystemSearchResult {
  path: string;
  name: string;
  isDirectory: boolean;
}

/**
 * 系统级搜索服务
 * 根据平台使用不同的系统级搜索 API
 */
export class SystemSearchService {
  /**
   * 转义查询字符串中的特殊字符
   */
  private static escapeQuery(query: string): string {
    return query.replace(/[\\'"()\[\]]/g, '\\$&');
  }

  /**
   * 转义路径字符串（Windows）
   */
  private static escapePathForWindows(filePath: string): string {
    return filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * 从文件路径创建搜索结果对象
   */
  private static createSearchResult(filePath: string): SystemSearchResult | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const stat = fs.statSync(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        isDirectory: stat.isDirectory(),
      };
    } catch {
      return null;
    }
  }

  /**
   * 处理命令输出，转换为搜索结果数组
   */
  private static parseCommandOutput(
    stdout: string,
    searchPaths?: string[]
  ): SystemSearchResult[] {
    const results: SystemSearchResult[] = [];
    const paths = stdout.trim().split('\n').filter(Boolean);

    for (const filePath of paths) {
      // 如果指定了搜索路径，过滤结果
      if (searchPaths && searchPaths.length > 0) {
        const isInSearchPath = searchPaths.some(sp => filePath.startsWith(sp));
        if (!isInSearchPath) continue;
      }

      const result = this.createSearchResult(filePath);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 使用系统 API 搜索文件
   */
  public static async search(
    query: string,
    searchPaths: string[] = [],
    maxResults: number = DEFAULT_MAX_RESULTS
  ): Promise<SystemSearchResult[]> {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        return await this.searchMacOS(query, searchPaths, maxResults);
      } else if (platform === 'win32') {
        return await this.searchWindows(query, searchPaths, maxResults);
      } else if (platform === 'linux') {
        return await this.searchLinux(query, searchPaths, maxResults);
      } else {
        console.warn(`⚠️ ${LOG_PREFIX} 未支持的平台: ${platform}`);
        return [];
      }
    } catch (error) {
      console.error(`❌ ${LOG_PREFIX} 搜索失败:`, error);
      return [];
    }
  }

  /**
   * 使用 mdfind 在指定路径中搜索（macOS）
   */
  private static async searchWithMdfind(
    query: string,
    searchPath: string,
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const escapedQuery = this.escapeQuery(query);
    const command = `mdfind -name "${escapedQuery}" -onlyin "${searchPath}" 2>/dev/null | head -${maxResults}`;
    
    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: MAX_BUFFER_SIZE,
      });
      return this.parseCommandOutput(stdout);
    } catch (error) {
      throw error; // 让调用者处理降级
    }
  }

  /**
   * macOS: 使用 mdfind (Spotlight)
   * 优点：快，系统级索引，支持全文搜索
   */
  private static async searchMacOS(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const results: SystemSearchResult[] = [];

    // 如果没有指定路径，在所有路径中搜索
    if (searchPaths.length === 0) {
      const homePath = process.env.HOME || process.env.USERPROFILE || '';
      
      try {
        const mdfindResults = await this.searchWithMdfind(query, homePath, maxResults);
        results.push(...mdfindResults);
      } catch (error) {
        // mdfind 可能在某些情况下失败，降级到 find
        console.warn(`⚠️ ${LOG_PREFIX} mdfind 失败，使用 find 降级搜索`);
        return await this.searchWithFind(query, searchPaths, maxResults);
      }
    } else {
      // 在指定路径中搜索
      for (const searchPath of searchPaths) {
        if (!fs.existsSync(searchPath)) continue;

        try {
          const mdfindResults = await this.searchWithMdfind(query, searchPath, maxResults);
          results.push(...mdfindResults);
        } catch (error) {
          // 降级到 find
          const findResults = await this.searchWithFind(query, [searchPath], maxResults);
          results.push(...findResults);
        }

        if (results.length >= maxResults) break;
      }
    }

    return results.slice(0, maxResults);
  }

  /**
   * 使用 PowerShell 搜索（Windows）
   */
  private static async searchWithPowerShell(
    query: string,
    searchPath: string,
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const escapedPath = this.escapePathForWindows(searchPath);
    const escapedQuery = this.escapeQuery(query);
    const command = `powershell -Command "Get-ChildItem -Path '${escapedPath}' -Recurse -Filter '*${escapedQuery}*' -ErrorAction SilentlyContinue | Select-Object -First ${maxResults} | ForEach-Object { $_.FullName }"`;
    
    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: MAX_BUFFER_SIZE,
        timeout: WINDOWS_SEARCH_TIMEOUT,
      });
      return this.parseCommandOutput(stdout);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Windows: 使用 PowerShell 或 dir 命令
   */
  private static async searchWindows(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const results: SystemSearchResult[] = [];
    
    const searchPathsToUse = searchPaths.length > 0 
      ? searchPaths 
      : [process.env.USERPROFILE || 'C:\\Users'];

    for (const searchPath of searchPathsToUse) {
      if (!fs.existsSync(searchPath)) continue;

      try {
        const powerShellResults = await this.searchWithPowerShell(query, searchPath, maxResults);
        results.push(...powerShellResults);
      } catch (error) {
        console.warn(`⚠️ ${LOG_PREFIX} PowerShell 搜索失败 (${searchPath}):`, error);
      }

      if (results.length >= maxResults) break;
    }

    return results.slice(0, maxResults);
  }

  /**
   * 使用 locate 命令搜索（Linux）
   */
  private static async searchWithLocate(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const escapedQuery = this.escapeQuery(query);
    const command = `locate -b --regex ".*${escapedQuery}.*" 2>/dev/null | head -${maxResults}`;
    
    try {
      const { stdout } = await execAsync(command, {
        maxBuffer: MAX_BUFFER_SIZE,
      });
      return this.parseCommandOutput(stdout, searchPaths);
    } catch (error) {
      console.warn(`⚠️ ${LOG_PREFIX} locate 失败:`, error);
      return [];
    }
  }

  /**
   * Linux: 使用 locate 或 find
   */
  private static async searchLinux(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    // 先尝试使用 locate（如果可用）
    try {
      const { stdout } = await execAsync('which locate');
      if (stdout.trim()) {
        return await this.searchWithLocate(query, searchPaths, maxResults);
      }
    } catch {
      // locate 不可用，使用 find
    }

    // 降级到 find
    return await this.searchWithFind(query, searchPaths, maxResults);
  }

  /**
   * 使用 find 命令搜索（跨平台降级方案）
   */
  private static async searchWithFind(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const results: SystemSearchResult[] = [];

    const pathsToSearch = searchPaths.length > 0 
      ? searchPaths 
      : [process.env.HOME || process.env.USERPROFILE || process.cwd()];

    for (const searchPath of pathsToSearch) {
      if (!fs.existsSync(searchPath)) continue;

      const escapedQuery = this.escapeQuery(query);
      const isWindows = process.platform === 'win32';
      
      try {
        let findResults: SystemSearchResult[];
        
        if (isWindows) {
          // Windows find 命令语法不同，使用 PowerShell
          findResults = await this.searchWithPowerShell(query, searchPath, maxResults);
        } else {
          // Unix-like (macOS/Linux)
          const findCommand = `find "${searchPath}" -iname "*${escapedQuery}*" -type f 2>/dev/null | head -${maxResults}`;
          const { stdout } = await execAsync(findCommand, {
            maxBuffer: MAX_BUFFER_SIZE,
            timeout: FIND_SEARCH_TIMEOUT,
          });
          findResults = this.parseCommandOutput(stdout);
        }

        results.push(...findResults);
      } catch (error) {
        console.warn(`⚠️ ${LOG_PREFIX} find 搜索失败 (${searchPath}):`, error);
      }

      if (results.length >= maxResults) break;
    }

    return results.slice(0, maxResults);
  }
}

