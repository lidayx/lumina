import { ipcMain } from 'electron';
import { fileService } from '../services/fileService';

/**
 * 注册文件相关的 IPC 处理器
 * 提供文件的获取、搜索、打开和索引管理
 */
export function registerFileHandlers() {
  // 获取所有已索引的文件
  ipcMain.handle('file-get-all', async () => {
    try {
      return await fileService.getAllFiles();
    } catch (error) {
      console.error('Error getting all files:', error);
      return [];
    }
  });

  // 根据关键词搜索文件（支持文件名和路径匹配）
  ipcMain.handle('file-search', async (_event, query: string, maxResults?: number) => {
    try {
      return await fileService.searchFiles(query, undefined, maxResults || 50);
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  });

  // 使用系统默认程序打开文件
  ipcMain.handle('file-open', async (_event, filePath: string) => {
    try {
      await fileService.openFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error opening file:', error);
      return { success: false, error: String(error) };
    }
  });

  // 在文件管理器中显示文件所在文件夹
  ipcMain.handle('file-reveal-folder', async (_event, filePath: string) => {
    try {
      const { shell } = require('electron');
      const path = require('path');
      // 获取文件所在目录
      const folderPath = path.dirname(filePath);
      await shell.showItemInFolder(folderPath);
      return { success: true };
    } catch (error) {
      console.error('Error revealing folder:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取文件信息（包括文件大小等）
  ipcMain.handle('file-get-info', async (_event, filePath: string) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }
      
      const stats = fs.statSync(filePath);
      const isDirectory = stats.isDirectory();
      
      const info: any = {
        size: stats.size,
        createdDate: stats.birthtime || stats.ctime,
        modifiedDate: stats.mtime,
        isDirectory,
        // 文件类型
        ext: path.extname(filePath).toLowerCase(),
        // 访问权限
        mode: stats.mode,
        readable: true, // fs.accessSync 会抛出异常，所以直接用 try-catch
        writable: true,
      };

      // 如果是文件（不是目录），获取更多信息
      if (!isDirectory) {
        // MIME 类型（简单判断）
        const ext = info.ext;
        const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
          '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp',
          '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
          '.mkv': 'video/x-matroska', '.webm': 'video/webm',
          '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
          '.pdf': 'application/pdf',
          '.txt': 'text/plain', '.md': 'text/markdown',
          '.js': 'application/javascript', '.ts': 'application/typescript',
          '.json': 'application/json', '.xml': 'application/xml',
          '.html': 'text/html', '.css': 'text/css',
          '.zip': 'application/zip', '.rar': 'application/x-rar-compressed',
          '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        info.mimeType = mimeTypes[ext] || 'application/octet-stream';

        // 检查文件权限
        try {
          fs.accessSync(filePath, fs.constants.R_OK);
        } catch {
          info.readable = false;
        }
        try {
          fs.accessSync(filePath, fs.constants.W_OK);
        } catch {
          info.writable = false;
        }

        // 文本文件：获取行数和字符数
        if (['.txt', '.md', '.js', '.ts', '.json', '.xml', '.html', '.css', '.py', '.java', '.cpp', '.c', '.h'].includes(ext)) {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            info.lineCount = content.split('\n').length;
            info.charCount = content.length;
            // 尝试检测编码
            const buffer = fs.readFileSync(filePath);
            if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
              info.encoding = 'UTF-8 with BOM';
            } else {
              info.encoding = 'UTF-8'; // 默认假设为 UTF-8
            }
          } catch (err) {
            // 文件可能不是文本文件或读取失败
          }
        }

        // 图片文件：获取尺寸
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
          // 注意：获取图片尺寸需要额外的库，这里先留空，后续可以通过 IPC 调用图像处理库
          // 或者使用 Electron 的 nativeImage API
        }

        // 计算文件哈希（MD5 和 SHA256）- 仅对小文件计算，避免阻塞
        if (stats.size < 10 * 1024 * 1024) { // 小于 10MB
          try {
            const fileBuffer = fs.readFileSync(filePath);
            info.md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
            info.sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          } catch (err) {
            // 计算哈希失败
          }
        }
      }

      return {
        success: true,
        info,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取图片尺寸
  ipcMain.handle('file-get-image-size', async (_event, filePath: string) => {
    try {
      const { nativeImage } = require('electron');
      const image = nativeImage.createFromPath(filePath);
      if (!image.isEmpty()) {
        const size = image.getSize();
        return { success: true, width: size.width, height: size.height };
      }
      return { success: false, error: '无法读取图片' };
    } catch (error) {
      console.error('Error getting image size:', error);
      return { success: false, error: String(error) };
    }
  });

  // 获取视频信息（需要 ffprobe 或类似工具，这里先返回基本信息）
  ipcMain.handle('file-get-video-info', async (_event, filePath: string) => {
    try {
      // 这里可以集成 ffprobe 或使用 Electron 的媒体库
      // 暂时返回 null，后续可以扩展
      return { success: false, error: '暂不支持' };
    } catch (error) {
      console.error('Error getting video info:', error);
      return { success: false, error: String(error) };
    }
  });

  // 扫描并索引指定目录的文件
  ipcMain.handle('file-index', async (_event, paths?: string[]) => {
    try {
      await fileService.indexFiles(paths);
      return { success: true };
    } catch (error) {
      console.error('Error indexing files:', error);
      return { success: false, error: String(error) };
    }
  });

  // 清除所有文件索引数据
  ipcMain.handle('file-clear-index', async () => {
    try {
      await fileService.stopWatching();
      const { dbManager } = await import('../database/db');
      await dbManager.clearItemsByType('file');
      console.log('✅ [文件处理器] 已清除文件索引');
      return { success: true };
    } catch (error) {
      console.error('Error clearing file index:', error);
      return { success: false, error: String(error) };
    }
  });
}

