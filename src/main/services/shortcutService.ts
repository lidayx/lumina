/**
 * 快捷键服务
 * 管理全局快捷键的注册、注销和配置
 */

import { globalShortcut, app } from 'electron';
import { settingsService } from './settingsService';

export interface ShortcutConfig {
  globalShortcut: string; // 全局快捷键，如 "Shift+Space"
}

/**
 * 快捷键服务类
 */
class ShortcutService {
  private currentShortcut: string | null = null;

  /**
   * 初始化快捷键
   */
  public initialize(): void {
    this.loadAndRegister();
    
    // 监听设置变化，重新注册快捷键
    // 注意：这里需要定期检查设置变化，或者通过 IPC 通知
  }

  /**
   * 加载并注册快捷键
   */
  public loadAndRegister(): boolean {
    try {
      const settings = settingsService.getSettings();
      const shortcut = (settings as any).globalShortcut || 'Shift+Space';
      
      // 如果快捷键已注册，先注销
      if (this.currentShortcut) {
        this.unregister();
      }

      // 注册新快捷键
      return this.register(shortcut);
    } catch (error) {
      console.error('❌ [快捷键服务] 加载快捷键失败:', error);
      // 使用默认快捷键
      return this.register('Shift+Space');
    }
  }

  /**
   * 注册全局快捷键
   */
  public register(shortcut: string): boolean {
    try {
      // 标准化快捷键格式
      const normalized = this.normalizeShortcut(shortcut);
      
      // 验证快捷键格式
      if (!this.isValidShortcut(normalized)) {
        console.error(`❌ [快捷键服务] 无效的快捷键格式: ${shortcut} (标准化后: ${normalized})`);
        return false;
      }

      // 先注销旧快捷键（如果有）
      if (this.currentShortcut && this.currentShortcut !== normalized) {
        this.unregister();
      }

      // 检查快捷键是否已被占用（且不是当前快捷键）
      if (globalShortcut.isRegistered(normalized) && this.currentShortcut !== normalized) {
        console.warn(`⚠️ [快捷键服务] 快捷键已被占用: ${normalized}`);
        // 尝试注销后重新注册
        globalShortcut.unregister(normalized);
      }

      // 注册快捷键
      const ret = globalShortcut.register(normalized, async () => {
        // 触发主窗口显示事件（使用动态 import 以避免打包后的模块解析问题）
        try {
          const { showMainWindow } = await import('../windows/mainWindow');
          showMainWindow();
        } catch (error) {
          console.error('❌ [快捷键服务] 显示主窗口失败:', error);
        }
      });

      if (ret) {
        this.currentShortcut = normalized;
        console.log(`✅ [快捷键服务] 已注册全局快捷键: ${normalized}`);
        return true;
      } else {
        console.error(`❌ [快捷键服务] 快捷键注册失败: ${normalized}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [快捷键服务] 注册快捷键异常: ${error}`);
      return false;
    }
  }

  /**
   * 注销当前快捷键
   */
  public unregister(): void {
    if (this.currentShortcut) {
      globalShortcut.unregister(this.currentShortcut);
      console.log(`✅ [快捷键服务] 已注销快捷键: ${this.currentShortcut}`);
      this.currentShortcut = null;
    }
  }

  /**
   * 注销所有快捷键
   */
  public unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.currentShortcut = null;
    console.log('✅ [快捷键服务] 已注销所有快捷键');
  }

  /**
   * 检查快捷键是否有效
   */
  private isValidShortcut(shortcut: string): boolean {
    if (!shortcut || typeof shortcut !== 'string') {
      return false;
    }

    // 标准化快捷键格式（转换为 Electron 格式）
    const normalized = this.normalizeShortcut(shortcut);
    
    // 基本格式验证：至少包含一个修饰键和一个普通键
    // 支持的格式：Shift+Space, Ctrl+Shift+K, Cmd+Option+T, CommandOrControl+K 等
    const modifiers = ['Command', 'Cmd', 'CommandOrControl', 'Control', 'Ctrl', 'Alt', 'Option', 'Shift', 'Super', 'Meta'];
    const modifierPattern = `(${modifiers.join('|')})`;
    
    // 普通键：字母、数字、功能键、特殊键
    const regularKeys = '[A-Z0-9]';
    const functionKeys = 'F(?:1[0-2]|[1-9])';
    const specialKeys = ['Space', 'Enter', 'Return', 'Tab', 'Escape', 'Esc', 'Backspace', 'Delete', 'Insert', 'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown', 'PrintScreen', 'ScrollLock', 'Pause', 'Numlock', 'CapsLock'];
    const keyPattern = `(${regularKeys}|${functionKeys}|${specialKeys.join('|')})`;
    
    // 支持单个修饰键或多个修饰键组合
    const singleModifierPattern = new RegExp(`^${modifierPattern}\\+${keyPattern}$`, 'i');
    const doubleModifierPattern = new RegExp(`^${modifierPattern}\\+${modifierPattern}\\+${keyPattern}$`, 'i');
    const tripleModifierPattern = new RegExp(`^${modifierPattern}\\+${modifierPattern}\\+${modifierPattern}\\+${keyPattern}$`, 'i');
    
    return singleModifierPattern.test(normalized) || 
           doubleModifierPattern.test(normalized) || 
           tripleModifierPattern.test(normalized);
  }

  /**
   * 标准化快捷键格式（转换为 Electron 标准格式）
   */
  private normalizeShortcut(shortcut: string): string {
    let normalized = shortcut.trim();
    
    // 统一修饰键名称
    normalized = normalized.replace(/Cmd/gi, 'Command');
    normalized = normalized.replace(/Ctrl/gi, 'Control');
    
    // macOS 上，Command 和 Control 可以互换使用 CommandOrControl
    // 但为了兼容性，我们保持原样
    
    return normalized;
  }

  /**
   * 检查快捷键是否可用（未被占用）
   */
  public isAvailable(shortcut: string): boolean {
    return !globalShortcut.isRegistered(shortcut);
  }

  /**
   * 获取当前注册的快捷键
   */
  public getCurrentShortcut(): string | null {
    return this.currentShortcut;
  }

  /**
   * 格式化快捷键显示（跨平台）
   */
  public formatShortcut(shortcut: string): string {
    // 将 Command 转换为平台特定的符号
    const isMac = process.platform === 'darwin';
    let formatted = shortcut;
    
    if (isMac) {
      formatted = formatted.replace(/Command|Cmd/gi, '⌘');
      formatted = formatted.replace(/Option/gi, '⌥');
      formatted = formatted.replace(/Control|Ctrl/gi, '⌃');
      formatted = formatted.replace(/Shift/gi, '⇧');
    } else {
      formatted = formatted.replace(/Command|Cmd/gi, 'Ctrl');
      formatted = formatted.replace(/Option/gi, 'Alt');
      formatted = formatted.replace(/Control|Ctrl/gi, 'Ctrl');
    }
    
    return formatted;
  }
}

export const shortcutService = new ShortcutService();

