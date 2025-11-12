import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { app as electronApp } from 'electron';

const execAsync = promisify(exec);

/**
 * 命令配置接口
 */
export interface CommandInfo {
  id: string;
  name: string;
  command: string;
  description: string;
  category: string;
  icon?: string;
  shortcut?: string;
}

/**
 * 命令历史记录接口
 */
interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  success: boolean;
}

/**
 * 命令执行服务
 */
class CommandService {
  // ========== 常量 ==========
  private readonly MAX_HISTORY = 100;
  private readonly HISTORY_FILE = path.join(electronApp.getPath('userData'), 'command-history.json');

  // ========== 私有属性 ==========
  private commands: Map<string, CommandInfo> = new Map();
  private history: CommandHistory[] = [];
  private historyLoaded: boolean = false;
  
  // 缓存搜索结果（性能优化）
  private searchCache: Map<string, CommandInfo[]> = new Map();
  private readonly SEARCH_CACHE_MAX_SIZE = 50;

  constructor() {
    this.initDefaultCommands();
    this.loadHistory();
  }

  // ========== 初始化相关 ==========

  /**
   * 初始化默认命令
   */
  private initDefaultCommands(): void {
    const defaultCommands: CommandInfo[] = [
      // 系统命令
      { id: 'cmd-lock', name: '锁屏', command: this.getLockScreenCommand(), description: '锁定屏幕', category: 'system', shortcut: 'lock' },
      { id: 'cmd-sleep', name: '睡眠', command: this.getSleepCommand(), description: '进入睡眠模式', category: 'system' },
      { id: 'cmd-restart', name: '重启', command: this.getRestartCommand(), description: '重启计算机', category: 'system' },
      { id: 'cmd-shutdown', name: '关机', command: this.getShutdownCommand(), description: '关闭计算机', category: 'system' },
      
      // 媒体控制
      { id: 'cmd-mute', name: '静音', command: this.getMuteCommand(), description: '切换静音', category: 'media', shortcut: 'mute' },
      { id: 'cmd-vol-up', name: '音量+', command: this.getVolumeUpCommand(), description: '增加音量', category: 'media', shortcut: 'vol+' },
      { id: 'cmd-vol-down', name: '音量-', command: this.getVolumeDownCommand(), description: '减小音量', category: 'media', shortcut: 'vol-' },
      { id: 'cmd-play-pause', name: '播放/暂停', command: this.getPlayPauseCommand(), description: '播放或暂停媒体', category: 'media', shortcut: 'play' },
      
      // 应用操作
      { id: 'cmd-settings', name: '系统设置', command: this.getSettingsCommand(), description: '打开系统设置', category: 'app' },
      { id: 'cmd-finder', name: '文件管理器', command: this.getFinderCommand(), description: '打开文件管理器', category: 'app' },
      { id: 'cmd-terminal', name: '终端', command: this.getTerminalCommand(), description: '打开终端', category: 'app' },
      { id: 'cmd-calculator', name: '计算器', command: this.getCalculatorCommand(), description: '打开计算器', category: 'app' },
    ];

    for (const cmd of defaultCommands) {
      if (cmd.command) {
        this.commands.set(cmd.id, cmd);
      }
    }
    
    console.log(`✅ [命令服务] 已初始化 ${this.commands.size} 个命令`);
  }

  // ========== 公共 API ==========

  /**
   * 获取所有命令
   */
  public getAllCommands(): CommandInfo[] {
    return Array.from(this.commands.values());
  }

  /**
   * 执行命令
   */
  public async executeCommand(commandId: string): Promise<{ success: boolean; output?: string; error?: string }> {
    const cmd = this.commands.get(commandId);
    
    if (!cmd) {
      throw new Error(`Command not found: ${commandId}`);
    }

    try {
      console.log(`🚀 [命令服务] 执行命令: ${cmd.name} (${cmd.command})`);
      
      // 执行命令
      const { stdout, stderr } = await execAsync(cmd.command, {
        timeout: 10000, // 10秒超时
      });

      // 记录历史
      this.addToHistory(cmd.command, true);

      console.log(`✅ [命令服务] 命令执行成功: ${cmd.name}`);
      
      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (error: any) {
      console.error(`❌ [命令服务] 命令执行失败: ${cmd.name}`, error);
      
      // 记录历史
      this.addToHistory(cmd.command, false);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 执行原始命令
   */
  public async executeRawCommand(command: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      console.log(`🚀 [命令服务] 执行原始命令: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000,
      });

      // 记录历史
      this.addToHistory(command, true);

      return {
        success: true,
        output: stdout.trim(),
      };
    } catch (error: any) {
      console.error(`❌ [命令服务] 原始命令执行失败:`, error);
      
      // 记录历史
      this.addToHistory(command, false);

      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * 搜索命令
   * 优化：使用缓存减少重复计算
   */
  public searchCommands(query: string): CommandInfo[] {
    if (!query) {
      return this.getAllCommands();
    }

    const searchTerm = query.toLowerCase().trim();
    
    // 检查缓存
    const cached = this.searchCache.get(searchTerm);
    if (cached !== undefined) {
      return cached;
    }

    const results: CommandInfo[] = [];

    for (const cmd of this.commands.values()) {
      // 按名称、描述、快捷键搜索
      if (
        cmd.name.toLowerCase().includes(searchTerm) ||
        cmd.description.toLowerCase().includes(searchTerm) ||
        cmd.shortcut?.toLowerCase().includes(searchTerm)
      ) {
        results.push(cmd);
      }
    }

    // 缓存结果（限制缓存大小）
    if (this.searchCache.size >= this.SEARCH_CACHE_MAX_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(searchTerm, results);

    return results;
  }

  /**
   * 命令补全（类似 shell 的 Tab 补全）
   * @param partial 部分输入的命令名或描述
   * @returns 匹配的命令列表，按相关性排序
   */
  public completeCommand(partial: string): CommandInfo[] {
    if (!partial || !partial.trim()) {
      return [];
    }

    const searchTerm = partial.toLowerCase().trim();
    const results: CommandInfo[] = [];
    const scoredResults: Array<{ cmd: CommandInfo; score: number }> = [];

    for (const cmd of this.commands.values()) {
      let score = 0;
      
      // 名称完全匹配（最高优先级）
      if (cmd.name.toLowerCase() === searchTerm) {
        score = 1000;
      }
      // 名称开头匹配
      else if (cmd.name.toLowerCase().startsWith(searchTerm)) {
        score = 500;
      }
      // 名称包含
      else if (cmd.name.toLowerCase().includes(searchTerm)) {
        score = 200;
      }
      // 快捷键匹配
      else if (cmd.shortcut?.toLowerCase() === searchTerm) {
        score = 400;
      }
      // 快捷键开头匹配
      else if (cmd.shortcut?.toLowerCase().startsWith(searchTerm)) {
        score = 300;
      }
      // 描述包含
      else if (cmd.description.toLowerCase().includes(searchTerm)) {
        score = 100;
      }

      if (score > 0) {
        scoredResults.push({ cmd, score });
      }
    }

    // 按分数降序排序
    scoredResults.sort((a, b) => b.score - a.score);
    
    return scoredResults.map(item => item.cmd);
  }

  /**
   * 获取命令帮助信息（参数提示）
   * @param commandId 命令ID或命令名称
   * @returns 命令的帮助信息
   */
  public getCommandHelp(commandId: string): {
    command: CommandInfo | null;
    help: string;
    examples: string[];
    parameters?: string[];
  } | null {
    // 先尝试通过 ID 查找
    let cmd = this.commands.get(commandId);
    
    // 如果没找到，尝试通过名称查找
    if (!cmd) {
      for (const c of this.commands.values()) {
        if (c.name === commandId || c.name.toLowerCase() === commandId.toLowerCase()) {
          cmd = c;
          break;
        }
      }
    }

    if (!cmd) {
      return null;
    }

    // 根据命令类型生成帮助信息
    const help: string = cmd.description || '无描述';
    const examples: string[] = [];
    const parameters: string[] = [];

    // 为不同类型的命令生成示例
    switch (cmd.category) {
      case 'system':
        if (cmd.id === 'cmd-lock') {
          examples.push('> 锁屏');
          examples.push('> lock');
        } else if (cmd.id === 'cmd-sleep') {
          examples.push('> 睡眠');
        } else if (cmd.id === 'cmd-restart') {
          examples.push('> 重启');
        } else if (cmd.id === 'cmd-shutdown') {
          examples.push('> 关机');
        }
        break;
      case 'media':
        if (cmd.id === 'cmd-mute') {
          examples.push('> 静音');
          examples.push('> mute');
        } else if (cmd.id === 'cmd-vol-up') {
          examples.push('> 音量+');
          examples.push('> vol+');
        } else if (cmd.id === 'cmd-vol-down') {
          examples.push('> 音量-');
          examples.push('> vol-');
        } else if (cmd.id === 'cmd-play-pause') {
          examples.push('> 播放/暂停');
          examples.push('> play');
        }
        break;
      case 'app':
        examples.push(`> ${cmd.name}`);
        if (cmd.shortcut) {
          examples.push(`> ${cmd.shortcut}`);
        }
        break;
    }

    return {
      command: cmd,
      help,
      examples,
      parameters,
    };
  }

  /**
   * 获取命令历史
   */
  public getHistory(limit: number = 10): CommandHistory[] {
    return this.history.slice(0, limit);
  }

  /**
   * 清除命令历史
   */
  public clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  // ========== 历史记录相关 ==========

  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    if (this.historyLoaded) return;

    try {
      if (fs.existsSync(this.HISTORY_FILE)) {
        const data = fs.readFileSync(this.HISTORY_FILE, 'utf-8');
        this.history = JSON.parse(data);
        console.log(`✅ [命令服务] 已加载 ${this.history.length} 条历史记录`);
      }
    } catch (error) {
      console.error('❌ [命令服务] 加载历史记录失败:', error);
      this.history = [];
    }

    this.historyLoaded = true;
  }

  /**
   * 保存历史记录
   */
  private saveHistory(): void {
    try {
      fs.writeFileSync(this.HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('❌ [命令服务] 保存历史记录失败:', error);
    }
  }

  /**
   * 添加历史记录
   */
  private addToHistory(command: string, success: boolean): void {
    const historyItem: CommandHistory = {
      id: `history-${Date.now()}`,
      command,
      timestamp: new Date(),
      success,
    };

    this.history.unshift(historyItem);

    // 限制历史记录数量
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(0, this.MAX_HISTORY);
    }

    this.saveHistory();
  }

  // ========== 平台特定命令 ==========

  /**
   * 获取锁屏命令
   */
  private getLockScreenCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      // 使用快捷键 CMD+CTRL+Q 锁定屏幕（需要输入密码）
      return 'osascript -e \'tell application "System Events" to keystroke "q" using {command down, control down}\'';
    } else if (platform === 'win32') {
      return 'rundll32.exe user32.dll,LockWorkStation';
    } else {
      return 'gnome-screensaver-command -l || xdg-screensaver lock';
    }
  }

  /**
   * 获取睡眠命令
   */
  private getSleepCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'pmset sleepnow';
    } else if (platform === 'win32') {
      return 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0';
    } else {
      return 'systemctl suspend';
    }
  }

  /**
   * 获取重启命令
   */
  private getRestartCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "tell app \\"System Events\\" to restart"';
    } else if (platform === 'win32') {
      return 'shutdown /r /t 0';
    } else {
      return 'systemctl reboot';
    }
  }

  /**
   * 获取关机命令
   */
  private getShutdownCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "tell app \\"System Events\\" to shut down"';
    } else if (platform === 'win32') {
      return 'shutdown /s /t 0';
    } else {
      return 'systemctl poweroff';
    }
  }

  /**
   * 获取静音命令
   */
  private getMuteCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "set volume output muted not (output muted of (get volume settings))"';
    } else if (platform === 'win32') {
      return 'powershell -Command "[Console]::Beep(500,300)" && nircmd mutesysvolume 2';
    } else {
      return 'amixer set Master toggle';
    }
  }

  /**
   * 获取音量+命令
   */
  private getVolumeUpCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "set volume output volume (output volume of (get volume settings) + 10)"';
    } else if (platform === 'win32') {
      return 'powershell -Command "[Console]::Beep(500,300)" && nircmd changesysvolume 5000';
    } else {
      return 'amixer set Master 10%+';
    }
  }

  /**
   * 获取音量-命令
   */
  private getVolumeDownCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "set volume output volume (output volume of (get volume settings) - 10)"';
    } else if (platform === 'win32') {
      return 'powershell -Command "[Console]::Beep(500,300)" && nircmd changesysvolume -5000';
    } else {
      return 'amixer set Master 10%-';
    }
  }

  /**
   * 获取播放/暂停命令
   */
  private getPlayPauseCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'osascript -e "tell application \\"System Events\\" to keystroke space using {command down}"';
    } else if (platform === 'win32') {
      return 'powershell -Command "[Console]::Beep(500,300)" && nircmd sendkey 0xB3 press';
    } else {
      return 'playerctl play-pause';
    }
  }

  /**
   * 获取系统设置命令
   */
  private getSettingsCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'open /System/Library/PreferencePanes/Security.prefPane';
    } else if (platform === 'win32') {
      return 'start ms-settings:';
    } else {
      return 'gnome-control-center || kde5-control';
    }
  }

  /**
   * 获取文件管理器命令
   */
  private getFinderCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'open .';
    } else if (platform === 'win32') {
      return 'explorer .';
    } else {
      return 'nautilus . || dolphin . || thunar .';
    }
  }

  /**
   * 获取终端命令
   */
  private getTerminalCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'open -a Terminal .';
    } else if (platform === 'win32') {
      return 'start cmd';
    } else {
      return 'gnome-terminal || konsole || xterm';
    }
  }

  /**
   * 获取计算器命令
   */
  private getCalculatorCommand(): string {
    const platform = process.platform;
    if (platform === 'darwin') {
      return 'open -a Calculator';
    } else if (platform === 'win32') {
      return 'start calc';
    } else {
      return 'gnome-calculator || kcalc || qalculate-gtk';
    }
  }
}

export const commandService = new CommandService();
export default commandService;

