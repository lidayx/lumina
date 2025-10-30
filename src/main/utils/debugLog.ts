import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Debug 日志记录工具
 */
class DebugLog {
  private logFile: string = '';
  private enabled: boolean = false;
  private stream: fs.WriteStream | null = null;

  constructor() {
    // 延迟初始化路径，等 app 准备好
  }
  
  /**
   * 初始化文件路径
   */
  private initializePath() {
    if (!this.logFile) {
      try {
        const userDataPath = app.getPath('userData');
        this.logFile = path.join(userDataPath, 'run_debug.log');
        console.log(`📁 [DebugLog] 日志文件路径: ${this.logFile}`);
      } catch (error) {
        console.error('❌ [DebugLog] 获取用户数据路径失败:', error);
        // 使用临时路径作为后备
        this.logFile = path.join(__dirname, 'run_debug.log');
      }
    }
  }

  /**
   * 初始化（在设置服务加载后调用）
   */
  public async init() {
    try {
      const { settingsService } = await import('../services/settingsService');
      const settings = settingsService.getSettings();
      this.enabled = settings.developerMode || false;
      
      if (this.enabled) {
        this.openStream();
      }
    } catch (error) {
      console.error('检查开发者模式状态失败:', error);
    }
  }

  /**
   * 设置启用状态
   */
  public setEnabled(enabled: boolean) {
    if (enabled === this.enabled) {
      return;
    }
    
    this.enabled = enabled;
    
    if (enabled) {
      this.openStream();
      this.log('[Debug] 开发者模式已开启');
    } else {
      this.log('[Debug] 开发者模式已关闭');
      this.closeStream();
    }
  }

  /**
   * 打开日志流
   */
  private openStream() {
    try {
      this.initializePath();
      
      // 如果流已存在且未关闭，先关闭
      if (this.stream && !this.stream.closed) {
        this.stream.close();
      }
      
      // 创建追加模式的写入流
      this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
      
      // 写入启动标记
      const timestamp = new Date().toISOString();
      this.stream.write(`\n\n========== ${timestamp} - 应用启动 ==========\n`);
      
      console.log(`✅ [DebugLog] 日志文件已创建: ${this.logFile}`);
    } catch (error) {
      console.error('❌ [DebugLog] 打开日志文件失败:', error);
    }
  }

  /**
   * 关闭日志流
   */
  private closeStream() {
    if (this.stream && !this.stream.closed) {
      const timestamp = new Date().toISOString();
      this.stream.write(`========== ${timestamp} - 应用关闭 ==========\n\n`);
      this.stream.close();
      this.stream = null;
    }
  }

  /**
   * 记录日志
   */
  public log(...args: any[]) {
    if (!this.enabled) {
      return;
    }
    
    try {
      if (!this.stream || this.stream.closed) {
        this.openStream();
      }
      
      const timestamp = new Date().toISOString();
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      const logLine = `[${timestamp}] ${message}\n`;
      
      if (this.stream && !this.stream.closed) {
        this.stream.write(logLine);
      }
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  /**
   * 记录错误日志
   */
  public error(...args: any[]) {
    this.log('[ERROR]', ...args);
  }

  /**
   * 记录警告日志
   */
  public warn(...args: any[]) {
    this.log('[WARN]', ...args);
  }

  /**
   * 记录信息日志
   */
  public info(...args: any[]) {
    this.log('[INFO]', ...args);
  }

  /**
   * 清理日志文件
   */
  public clear() {
    try {
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
        this.log('[Debug] 日志已清理');
      }
    } catch (error) {
      console.error('清理日志文件失败:', error);
    }
  }

  /**
   * 获取日志文件路径
   */
  public getLogFile(): string {
    this.initializePath();
    return this.logFile;
  }

  /**
   * 应用退出时关闭流
   */
  public cleanup() {
    this.closeStream();
  }
}

export const debugLog = new DebugLog();

