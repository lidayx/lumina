import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// 常量定义
const LOG_FILE_NAME = 'run_debug.log';
const FALLBACK_LOG_FILE_NAME = 'run_debug.log';
const LOG_PREFIX = '[DebugLog]';
const START_MARKER = '==========';
const END_MARKER = '==========';

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
  private initializePath(): void {
    if (!this.logFile) {
      try {
        const userDataPath = app.getPath('userData');
        this.logFile = path.join(userDataPath, LOG_FILE_NAME);
        console.log(`📁 ${LOG_PREFIX} 日志文件路径: ${this.logFile}`);
      } catch (error) {
        console.error(`❌ ${LOG_PREFIX} 获取用户数据路径失败:`, error);
        // 使用临时路径作为后备
        this.logFile = path.join(__dirname, FALLBACK_LOG_FILE_NAME);
      }
    }
  }

  /**
   * 初始化（在设置服务加载后调用）
   */
  public async init(): Promise<void> {
    try {
      const { settingsService } = await import('../services/settingsService');
      const settings = settingsService.getSettings();
      this.enabled = settings.developerMode || false;
      
      if (this.enabled) {
        this.openStream();
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 检查开发者模式状态失败:`, error);
    }
  }

  /**
   * 设置启用状态
   */
  public setEnabled(enabled: boolean): void {
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
   * 获取当前时间戳
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * 写入日志标记
   */
  private writeMarker(message: string): void {
    if (this.stream && !this.stream.closed) {
      const timestamp = this.getTimestamp();
      this.stream.write(`${START_MARKER} ${timestamp} - ${message} ${END_MARKER}\n`);
    }
  }

  /**
   * 检查并确保流可用
   */
  private ensureStream(): boolean {
    if (!this.stream || this.stream.closed) {
      this.openStream();
    }
    return this.stream !== null && !this.stream.closed;
  }

  /**
   * 打开日志流
   */
  private openStream(): void {
    try {
      this.initializePath();
      
      // 如果流已存在且未关闭，先关闭
      if (this.stream && !this.stream.closed) {
        this.stream.close();
      }
      
      // 创建追加模式的写入流
      this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
      
      // 写入启动标记
      this.writeMarker('应用启动');
      
      console.log(`✅ ${LOG_PREFIX} 日志文件已创建: ${this.logFile}`);
    } catch (error) {
      console.error(`❌ ${LOG_PREFIX} 打开日志文件失败:`, error);
    }
  }

  /**
   * 关闭日志流
   */
  private closeStream(): void {
    if (this.stream && !this.stream.closed) {
      this.writeMarker('应用关闭');
      this.stream.close();
      this.stream = null;
    }
  }

  /**
   * 格式化日志参数
   */
  private formatArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  /**
   * 记录日志
   */
  public log(...args: any[]): void {
    if (!this.enabled) {
      return;
    }
    
    try {
      if (!this.ensureStream()) {
        return;
      }
      
      const timestamp = this.getTimestamp();
      const message = this.formatArgs(args);
      const logLine = `[${timestamp}] ${message}\n`;
      
      if (this.stream && !this.stream.closed) {
        this.stream.write(logLine);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 写入日志失败:`, error);
    }
  }

  /**
   * 记录错误日志
   */
  public error(...args: any[]): void {
    this.log('[ERROR]', ...args);
  }

  /**
   * 记录警告日志
   */
  public warn(...args: any[]): void {
    this.log('[WARN]', ...args);
  }

  /**
   * 记录信息日志
   */
  public info(...args: any[]): void {
    this.log('[INFO]', ...args);
  }

  /**
   * 清理日志文件
   */
  public clear(): void {
    try {
      this.initializePath();
      if (fs.existsSync(this.logFile)) {
        fs.writeFileSync(this.logFile, '');
        this.log('[Debug] 日志已清理');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} 清理日志文件失败:`, error);
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
  public cleanup(): void {
    this.closeStream();
  }
}

export const debugLog = new DebugLog();

