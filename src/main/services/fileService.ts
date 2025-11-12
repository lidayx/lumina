import { FileInfo } from '../../shared/types/file';
import * as fs from 'fs';
import * as path from 'path';
import { app as electronApp } from 'electron';
import { SystemSearchService } from '../utils/systemSearch';

/**
 * 文件服务
 * 负责文件索引、搜索和监控
 */
class FileService {
  // ========== 常量 ==========
  // 文件搜索完全使用系统 API，无需索引相关设置

  // ========== 私有属性 ==========
  // 文件搜索完全使用系统 API，无需索引状态管理

  // ========== 公共 API ==========

  /**
   * 获取所有文件（不再使用，因为使用系统 API 实时搜索）
   * 保留此方法以兼容现有调用
   */
  public async getAllFiles(): Promise<FileInfo[]> {
    // 使用系统 API 不再需要预索引
    return [];
  }

  /**
   * 索引文件（不再使用，所有搜索通过系统 API）
   * 保留此方法以兼容现有调用
   */
  public async indexFiles(_targetPaths?: string[]): Promise<void> {
    const { default: settingsService } = await import('./settingsService');
    const fileSearchEnabled = settingsService.getSetting('fileSearchEnabled');
    if (!fileSearchEnabled) {
      console.log('📁 [文件服务] 文件搜索已禁用');
    } else {
      console.log('ℹ️ [文件服务] 文件搜索使用系统 API，无需预索引');
    }
  }

  /**
   * 强制重新扫描文件（不再使用）
   * 保留此方法以兼容现有调用
   */
  public async reindexFiles(_targetPaths?: string[]): Promise<void> {
    console.log('ℹ️ [文件服务] 文件搜索使用系统 API，无需重新索引');
  }

  /**
   * 搜索文件（完全使用系统 API）
   */
  public async searchFiles(query: string, fileType?: string, maxResults: number = 50): Promise<FileInfo[]> {
    console.log(`🔍 [文件服务] 搜索文件: "${query}"`);
    
    // 检查是否启用了文件搜索
    const { default: settingsService } = await import('./settingsService');
    const fileSearchEnabled = settingsService.getSetting('fileSearchEnabled');
    console.log(`🔍 [文件服务] 文件搜索是否启用: ${fileSearchEnabled}`);
    
    if (!fileSearchEnabled) {
      console.log(`⚠️ [文件服务] 文件搜索已禁用`);
      return [];
    }

    if (!query) {
      console.log(`⚠️ [文件服务] 查询为空`);
      return [];
    }

    // 使用系统 API 搜索所有目录
    const allPaths = await this.getIndexPaths();
    console.log(`🔍 [文件服务] 搜索路径: ${JSON.stringify(allPaths)}`);
    const results = await this.searchWithSystemAPI(query, allPaths, maxResults, fileType);
    console.log(`🔍 [文件服务] 找到 ${results.length} 个文件`);
    
    // 对结果进行评分和排序
    const searchTerm = query.toLowerCase().trim();
    const sortedResults = this.sortAndLimitResults(results, searchTerm, maxResults);
    console.log(`🔍 [文件服务] 排序后返回 ${sortedResults.length} 个结果`);
    return sortedResults;
  }

  /**
   * 使用系统 API 搜索（所有目录）
   */
  private async searchWithSystemAPI(
    query: string,
    searchPaths: string[],
    maxResults: number,
    fileType?: string
  ): Promise<FileInfo[]> {
    try {
      const systemResults = await SystemSearchService.search(query, searchPaths, maxResults * 2); // 多获取一些以进行筛选
      
      const fileInfos = systemResults
        .filter(result => !result.isDirectory) // 只返回文件，不返回目录
        .map(result => {
          try {
            const stat = fs.statSync(result.path);
            const extension = path.extname(result.path).replace('.', '') || undefined;
            
            // 文件类型筛选
            if (fileType && extension && !extension.toLowerCase().includes(fileType.toLowerCase())) {
              return null;
            }
            
            const fileInfo: FileInfo = {
              id: `file-${result.path}`,
              name: result.name,
              path: result.path,
              type: 'file' as const,
              extension,
              size: stat.size,
              modified: stat.mtime,
              indexedAt: new Date(),
            };
            
            return fileInfo;
          } catch (error) {
            console.warn(`⚠️ [文件服务] 无法获取文件信息: ${result.path}`, error);
            return null;
          }
        })
        .filter((file): file is FileInfo => file !== null);
      
      return fileInfos;
    } catch (error) {
      console.error('❌ [文件服务] 系统 API 搜索失败:', error);
      return [];
    }
  }

  /**
   * 打开文件
   */
  public async openFile(filePath: string): Promise<void> {
    const { shell } = require('electron');
    await shell.openPath(filePath);
  }


  /**
   * 获取索引路径（始终包含默认路径 + 自定义路径）
   */
  private async getIndexPaths(): Promise<string[]> {
    const defaultPaths = this.getDefaultIndexPaths();
    const { default: settingsService } = await import('./settingsService');
    const customPaths = settingsService.getSetting('fileSearchPaths');
    
    // 始终使用默认路径
    const allPaths = [...defaultPaths];
    
    // 如果设置了自定义路径，追加到默认路径后面（去重）
    if (customPaths && customPaths.length > 0) {
      for (const customPath of customPaths) {
        // 验证路径是否存在
        if (fs.existsSync(customPath)) {
          // 如果不在默认路径中，则添加
          if (!allPaths.includes(customPath)) {
            allPaths.push(customPath);
          }
        } else {
          console.warn(`⚠️ [文件服务] 自定义路径不存在，已跳过: ${customPath}`);
        }
      }
    }
    
    return allPaths;
  }

  /**
   * 获取默认索引路径
   */
  private getDefaultIndexPaths(): string[] {
    const platform = process.platform;
    const homePath = electronApp.getPath('home');
    
    if (platform === 'darwin') {
      // macOS
      return [
        path.join(homePath, 'Documents'),
        path.join(homePath, 'Downloads'),
        path.join(homePath, 'Desktop'),
      ];
    } else if (platform === 'win32') {
      // Windows: 仅扫描用户常用目录
      return [
        path.join(homePath, 'Documents'),
        path.join(homePath, 'Downloads'),
        path.join(homePath, 'Desktop'),
      ];
    } else {
      // Linux
      return [
        path.join(homePath, 'Documents'),
        path.join(homePath, 'Downloads'),
        path.join(homePath, 'Desktop'),
      ];
    }
  }
  // ========== 搜索相关 ==========

  /**
   * 计算文件匹配分数
   * 优化：缓存小写转换结果
   */
  private calculateFileScore(file: FileInfo, searchTerm: string): number {
    let score = 0;
    
    // 缓存文件名和路径的小写版本（避免重复转换）
    const nameLower = file.name.toLowerCase();
    const pathLower = file.path.toLowerCase();
    
    // 检查文件名（权重高）
    if (nameLower.includes(searchTerm)) {
      if (nameLower === searchTerm) {
        score = 100; // 完全匹配
      } else if (nameLower.startsWith(searchTerm)) {
        score = 80; // 开头匹配
      } else {
        score = 60; // 包含匹配
      }
    }
    // 检查路径（权重低）
    else if (pathLower.includes(searchTerm)) {
      score = 40; // 路径匹配
    }
    
    return score;
  }

  /**
   * 排序并限制结果数量
   * 优化：提前过滤低分结果，减少排序工作量
   */
  private sortAndLimitResults(results: FileInfo[], searchTerm: string, maxResults: number): FileInfo[] {
    // 计算每个文件的评分
    const resultsWithScore = results.map(file => ({
      file,
      score: this.calculateFileScore(file, searchTerm),
    }));
    
    // 过滤掉评分为0的结果（不匹配）
    const filtered = resultsWithScore.filter(item => item.score > 0);
    
    // 如果过滤后结果仍然很多，只对高分结果排序
    if (filtered.length > maxResults * 2) {
      // 只保留评分较高的结果进行排序
      filtered.sort((a, b) => b.score - a.score);
      return filtered.slice(0, maxResults).map(item => item.file);
    }
    
    // 正常排序
    return filtered
      .sort((a, b) => {
        // 按评分排序（降序）
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        
        const aName = a.file.name.toLowerCase();
        const bName = b.file.name.toLowerCase();
        
        // 名称长度（短优先）
        return aName.length - bName.length;
      })
      .map(item => item.file)
      .slice(0, maxResults);
  }

  /**
   * 停止文件监控（保留接口兼容性，但已不使用）
   */
  public stopWatching(): void {
    // 使用系统 API 不再需要文件监控
    console.log('ℹ️ [文件服务] 文件搜索使用系统 API，无需监控');
  }
}

export const fileService = new FileService();
export default fileService;
