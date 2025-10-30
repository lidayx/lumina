import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

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
   * 使用系统 API 搜索文件
   */
  public static async search(
    query: string,
    searchPaths: string[] = [],
    maxResults: number = 50
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
        console.warn(`⚠️ [系统搜索] 未支持的平台: ${platform}`);
        return [];
      }
    } catch (error) {
      console.error('❌ [系统搜索] 搜索失败:', error);
      return [];
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
      // 使用 mdfind 在全系统搜索（限制在当前用户目录）
      const homePath = process.env.HOME || process.env.USERPROFILE || '';
      const escapedQuery = query.replace(/[\\'"()]/g, '\\$&');
      
      try {
        const { stdout } = await execAsync(
          `mdfind -name "${escapedQuery}" -onlyin "${homePath}" 2>/dev/null | head -${maxResults}`,
          { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
        );

        const paths = stdout.trim().split('\n').filter(Boolean);
        for (const filePath of paths) {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            results.push({
              path: filePath,
              name: path.basename(filePath),
              isDirectory: stat.isDirectory(),
            });
          }
        }
      } catch (error) {
        // mdfind 可能在某些情况下失败，降级到 find
        console.warn('⚠️ [系统搜索] mdfind 失败，使用 find 降级搜索');
        return await this.searchWithFind(query, searchPaths, maxResults);
      }
    } else {
      // 在指定路径中搜索
      for (const searchPath of searchPaths) {
        if (!fs.existsSync(searchPath)) continue;

        const escapedQuery = query.replace(/[\\'"()]/g, '\\$&');
        try {
          const { stdout } = await execAsync(
            `mdfind -name "${escapedQuery}" -onlyin "${searchPath}" 2>/dev/null | head -${maxResults}`,
            { maxBuffer: 1024 * 1024 * 10 }
          );

          const paths = stdout.trim().split('\n').filter(Boolean);
          for (const filePath of paths) {
            if (fs.existsSync(filePath)) {
              const stat = fs.statSync(filePath);
              results.push({
                path: filePath,
                name: path.basename(filePath),
                isDirectory: stat.isDirectory(),
              });
            }
          }
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
   * Windows: 使用 PowerShell 或 dir 命令
   */
  private static async searchWindows(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    // Windows 系统级搜索较为复杂，这里使用 PowerShell Get-ChildItem
    const results: SystemSearchResult[] = [];
    
    const searchPathsToUse = searchPaths.length > 0 
      ? searchPaths 
      : [process.env.USERPROFILE || 'C:\\Users'];

    for (const searchPath of searchPathsToUse) {
      if (!fs.existsSync(searchPath)) continue;

      try {
        // 使用 PowerShell 搜索（支持通配符）
        const escapedPath = searchPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const escapedQuery = query.replace(/[\\'"()]/g, '\\$&');
        
        const { stdout } = await execAsync(
          `powershell -Command "Get-ChildItem -Path '${escapedPath}' -Recurse -Filter '*${escapedQuery}*' -ErrorAction SilentlyContinue | Select-Object -First ${maxResults} | ForEach-Object { $_.FullName }"`,
          { maxBuffer: 1024 * 1024 * 10, timeout: 5000 }
        );

        const paths = stdout.trim().split('\n').filter(Boolean);
        for (const filePath of paths) {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            results.push({
              path: filePath,
              name: path.basename(filePath),
              isDirectory: stat.isDirectory(),
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ [系统搜索] PowerShell 搜索失败 (${searchPath}):`, error);
      }

      if (results.length >= maxResults) break;
    }

    return results.slice(0, maxResults);
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
   * 使用 locate 命令搜索（Linux）
   */
  private static async searchWithLocate(
    query: string,
    searchPaths: string[],
    maxResults: number
  ): Promise<SystemSearchResult[]> {
    const results: SystemSearchResult[] = [];
    const escapedQuery = query.replace(/[\\'"()]/g, '\\$&');

    try {
      const { stdout } = await execAsync(
        `locate -b --regex ".*${escapedQuery}.*" 2>/dev/null | head -${maxResults}`,
        { maxBuffer: 1024 * 1024 * 10 }
      );

      const paths = stdout.trim().split('\n').filter(Boolean);
      for (const filePath of paths) {
        // 如果指定了搜索路径，过滤结果
        if (searchPaths.length > 0) {
          const isInSearchPath = searchPaths.some(sp => filePath.startsWith(sp));
          if (!isInSearchPath) continue;
        }

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          results.push({
            path: filePath,
            name: path.basename(filePath),
            isDirectory: stat.isDirectory(),
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ [系统搜索] locate 失败:', error);
    }

    return results;
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

      const escapedQuery = query.replace(/[\\'"()\[\]]/g, '\\$&');
      const isWindows = process.platform === 'win32';
      
      try {
        // find 命令在不同平台的语法略有不同
        let findCommand: string;
        
        if (isWindows) {
          // Windows find 命令语法不同，使用 PowerShell
          const escapedPath = searchPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          findCommand = `powershell -Command "Get-ChildItem -Path '${escapedPath}' -Recurse -Filter '*${escapedQuery}*' -ErrorAction SilentlyContinue | Select-Object -First ${maxResults} | ForEach-Object { $_.FullName }"`;
        } else {
          // Unix-like (macOS/Linux)
          findCommand = `find "${searchPath}" -iname "*${escapedQuery}*" -type f 2>/dev/null | head -${maxResults}`;
        }

        const { stdout } = await execAsync(findCommand, {
          maxBuffer: 1024 * 1024 * 10,
          timeout: 10000, // 10秒超时
        });

        const paths = stdout.trim().split('\n').filter(Boolean);
        for (const filePath of paths) {
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            results.push({
              path: filePath,
              name: path.basename(filePath),
              isDirectory: stat.isDirectory(),
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ [系统搜索] find 搜索失败 (${searchPath}):`, error);
      }

      if (results.length >= maxResults) break;
    }

    return results.slice(0, maxResults);
  }
}

