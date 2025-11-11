/**
 * 随机数生成服务
 * 支持 UUID 生成、随机字符串、随机密码、随机数字
 */

import { randomBytes, randomInt } from 'crypto';
import { settingsService } from './settingsService';

// ========== 类型定义 ==========

export interface RandomResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
  outputs?: string[]; // 用于返回多个结果（如多个密码）
  isMultiple?: boolean; // 标识是否为多个结果
}

/**
 * 随机数生成服务类
 */
class RandomService {
  // ========== 公共 API ==========

  /**
   * 处理随机数生成查询
   * 返回 RandomResult 如果识别为随机数生成查询，否则返回 null
   */
  public handleRandomQuery(query: string): RandomResult | null {
    try {
      const trimmedQuery = query.trim();
      const settings = settingsService.getSettings();

      // 1. 检测密码生成（pwd/password/密码）- 优先检测，因为更常用
      if (settings.featurePasswordGeneration !== false) {
        const passwordResult = this.handlePasswordGeneration(trimmedQuery);
        if (passwordResult) {
          return passwordResult;
        }
      }

      // 2. 检测 UUID 生成
      if (settings.featureUuidGeneration !== false) {
      const uuidResult = this.handleUuid(trimmedQuery);
      if (uuidResult) {
        return uuidResult;
        }
      }

      // 3. 检测随机字符串
      if (settings.featureRandomString !== false) {
      const randomStringResult = this.handleRandomString(trimmedQuery);
      if (randomStringResult) {
        return randomStringResult;
        }
      }

      // 4. 检测随机密码（旧格式：random password）
      if (settings.featureRandomPassword !== false) {
      const randomPasswordResult = this.handleRandomPassword(trimmedQuery);
      if (randomPasswordResult) {
        return randomPasswordResult;
        }
      }

      // 5. 检测随机数字
      if (settings.featureRandomNumber !== false) {
      const randomNumberResult = this.handleRandomNumber(trimmedQuery);
      if (randomNumberResult) {
        return randomNumberResult;
        }
      }

      return null;
    } catch (error: any) {
      console.error(`❌ [随机数服务] 处理失败: ${error.message}`);
      const errorMsg = error.message || '随机数生成错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== UUID 生成 ==========

  /**
   * 处理 UUID 生成
   */
  private handleUuid(query: string): RandomResult | null {
    // 匹配: uuid 或 generate uuid（UUID v4）
    let pattern = /^(?:uuid|generate\s+uuid)$/i;
    let match = query.match(pattern);
    let uuidVersion: 'v4' | 'v1' = 'v4';

    if (!match) {
      // 匹配: uuid v1 或 uuid v4
      pattern = /^uuid\s+v([14])$/i;
      match = query.match(pattern);
      if (match) {
        uuidVersion = match[1] === '1' ? 'v1' : 'v4';
      }
    }

    if (!match) {
      return null;
    }

    try {
      const uuid = this.generateUuid(uuidVersion);
      return {
        input: query,
        output: uuid,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `UUID 生成失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 生成 UUID
   */
  private generateUuid(version: 'v1' | 'v4'): string {
    if (version === 'v4') {
      // UUID v4 (随机)
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    } else {
      // UUID v1 (基于时间戳，简化实现)
      // 注意：这里使用简化实现，真正的 UUID v1 需要 MAC 地址等信息
      const timestamp = Date.now();
      const random = Math.random().toString(16).substring(2, 14);
      return `${this.hexPad(Math.floor(timestamp / 0x100000000), 8)}-${this.hexPad(timestamp & 0xffffffff, 4)}-1${this.hexPad(Math.floor(Math.random() * 0x1000), 3)}-${this.hexPad(Math.floor(Math.random() * 0x4000) + 0x8000, 4)}-${random}`;
    }
  }

  /**
   * 将数字转换为十六进制并补齐
   */
  private hexPad(num: number, length: number): string {
    return num.toString(16).padStart(length, '0');
  }

  // ========== 随机字符串 ==========

  /**
   * 处理随机字符串生成
   */
  private handleRandomString(query: string): RandomResult | null {
    // 匹配: random string <长度>
    let pattern = /^random\s+string\s+(\d+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: <长度> random string
      pattern = /^(\d+)\s+random\s+string$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const length = parseInt(match[1], 10);

    if (length < 1 || length > 1000) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: '长度必须在 1-1000 之间',
      };
    }

    try {
      const randomStr = this.generateRandomString(length);
      return {
        input: query,
        output: randomStr,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: `随机字符串生成失败: ${error.message}`,
      };
    }
  }

  /**
   * 生成随机字符串（字母和数字）
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomBytesArray = randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[randomBytesArray[i] % chars.length];
    }
    
    return result;
  }

  // ========== 密码生成（新功能：pwd/password/密码） ==========

  /**
   * 处理密码生成（支持 pwd/password/密码 关键词）
   * 默认生成10个密码，每个密码是一个结果选项
   * 支持 pwd 10 格式，10代表密码长度
   */
  private async handlePasswordGenerationAsync(query: string): Promise<RandomResult | null> {
    // 匹配: pwd、password、密码（可选后跟长度）
    // 支持: pwd、pwd 10、password 16、密码 20 等格式
    let pattern = /^(?:pwd|password|密码)(?:\s+(\d+))?$/i;
    let match = query.match(pattern);

    if (!match) {
      return null;
    }

    // 获取设置服务以读取默认配置
    let defaultLength = 16; // 默认密码长度
    let defaultCount = 10; // 默认生成数量
    let includeLowercase = true;
    let includeUppercase = true;
    let includeNumbers = true;
    let includeSpecial = true;

    try {
      // 动态导入设置服务（避免循环依赖）
      const { default: settingsService } = await import('./settingsService');
      const settings = settingsService.getSettings();
      
      // 从设置中读取密码生成规则
      if (settings.passwordDefaultLength !== undefined) {
        defaultLength = settings.passwordDefaultLength;
      }
      if (settings.passwordDefaultCount !== undefined) {
        defaultCount = settings.passwordDefaultCount;
      }
      if (settings.passwordIncludeLowercase !== undefined) {
        includeLowercase = Boolean(settings.passwordIncludeLowercase);
      }
      if (settings.passwordIncludeUppercase !== undefined) {
        includeUppercase = Boolean(settings.passwordIncludeUppercase);
      }
      if (settings.passwordIncludeNumbers !== undefined) {
        includeNumbers = Boolean(settings.passwordIncludeNumbers);
      }
      if (settings.passwordIncludeSpecial !== undefined) {
        includeSpecial = Boolean(settings.passwordIncludeSpecial);
      }
    } catch (error) {
      console.warn('⚠️ [随机数服务] 无法读取设置，使用默认值:', error);
    }

    // 解析长度（如果提供）
    const length = match[1] ? parseInt(match[1], 10) : defaultLength;

    if (length < 1 || length > 1000) {
      return {
        input: query,
        output: '长度必须在 1-1000 之间',
        success: false,
        error: '长度必须在 1-1000 之间',
      };
    }

    try {
      // 生成多个密码
      const passwords: string[] = [];
      for (let i = 0; i < defaultCount; i++) {
        const password = this.generatePasswordWithRules(
          length,
          includeLowercase,
          includeUppercase,
          includeNumbers,
          includeSpecial
        );
        passwords.push(password);
      }

      return {
        input: query,
        output: passwords[0], // 第一个密码作为主输出（向后兼容）
        outputs: passwords, // 所有密码
        success: true,
        isMultiple: true, // 标识为多个结果
      };
    } catch (error: any) {
      return {
        input: query,
        output: '密码生成失败',
        success: false,
        error: `密码生成失败: ${error.message}`,
      };
    }
  }

  /**
   * 处理密码生成（同步包装器）
   */
  private handlePasswordGeneration(query: string): RandomResult | null {
    // 由于 handleRandomQuery 是同步的，我们需要使用同步方式
    // 但为了获取最新设置，我们使用 require 但清除缓存
    let pattern = /^(?:pwd|password|密码)(?:\s+(\d+))?$/i;
    let match = query.match(pattern);

    if (!match) {
      return null;
    }

    // 获取设置服务以读取默认配置
    let defaultLength = 16; // 默认密码长度
    let defaultCount = 10; // 默认生成数量
    let includeLowercase = true;
    let includeUppercase = true;
    let includeNumbers = true;
    let includeSpecial = true;

    try {
      // 直接使用导入的 settingsService 单例实例
      const settings = settingsService.getSettings();
      
      // 从设置中读取密码生成规则
      // 重要：必须检查 undefined，因为如果设置从未保存过，值会是 undefined
      // 但如果设置被保存为 false，必须正确读取 false 值
      if (settings.passwordDefaultLength !== undefined) {
        defaultLength = settings.passwordDefaultLength;
      }
      if (settings.passwordDefaultCount !== undefined) {
        defaultCount = settings.passwordDefaultCount;
      }
      if (settings.passwordIncludeLowercase !== undefined) {
        includeLowercase = Boolean(settings.passwordIncludeLowercase);
      }
      if (settings.passwordIncludeUppercase !== undefined) {
        includeUppercase = Boolean(settings.passwordIncludeUppercase);
      }
      if (settings.passwordIncludeNumbers !== undefined) {
        includeNumbers = Boolean(settings.passwordIncludeNumbers);
      }
      // 关键：必须明确检查 undefined，false 是有效值
      if ('passwordIncludeSpecial' in settings) {
        includeSpecial = Boolean(settings.passwordIncludeSpecial);
      }
      
    } catch (error) {
      console.warn('⚠️ [随机数服务] 无法读取设置，使用默认值:', error);
    }

    // 解析长度（如果提供）
    const length = match[1] ? parseInt(match[1], 10) : defaultLength;

    if (length < 1 || length > 1000) {
      return {
        input: query,
        output: '长度必须在 1-1000 之间',
        success: false,
        error: '长度必须在 1-1000 之间',
      };
    }

    try {
      // 生成多个密码
      const passwords: string[] = [];
      for (let i = 0; i < defaultCount; i++) {
        const password = this.generatePasswordWithRules(
          length,
          includeLowercase,
          includeUppercase,
          includeNumbers,
          includeSpecial
        );
        passwords.push(password);
      }

      return {
        input: query,
        output: passwords[0], // 第一个密码作为主输出（向后兼容）
        outputs: passwords, // 所有密码
        success: true,
        isMultiple: true, // 标识为多个结果
      };
    } catch (error: any) {
      return {
        input: query,
        output: '密码生成失败',
        success: false,
        error: `密码生成失败: ${error.message}`,
      };
    }
  }

  /**
   * 根据规则生成密码
   */
  private generatePasswordWithRules(
    length: number,
    includeLowercase: boolean,
    includeUppercase: boolean,
    includeNumbers: boolean,
    includeSpecial: boolean
  ): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // 确保参数是布尔值
    const hasLowercase = Boolean(includeLowercase);
    const hasUppercase = Boolean(includeUppercase);
    const hasNumbers = Boolean(includeNumbers);
    const hasSpecial = Boolean(includeSpecial);

    // 构建字符集
    let charSet = '';
    const requiredChars: string[] = [];

    if (hasLowercase) {
      charSet += lowercase;
      requiredChars.push(lowercase[Math.floor(Math.random() * lowercase.length)]);
    }
    if (hasUppercase) {
      charSet += uppercase;
      requiredChars.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
    }
    if (hasNumbers) {
      charSet += numbers;
      requiredChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
    }
    if (hasSpecial) {
      charSet += special;
      requiredChars.push(special[Math.floor(Math.random() * special.length)]);
    }

    if (charSet.length === 0) {
      throw new Error('至少需要选择一种字符类型');
    }


    // 确保至少包含每种类型的一个字符
    let result = requiredChars.join('');
    
    // 填充剩余长度
    const randomBytesArray = randomBytes(length);
    for (let i = result.length; i < length; i++) {
      result += charSet[randomBytesArray[i] % charSet.length];
    }
    
    // 打乱顺序
    return result.split('').sort(() => Math.random() - 0.5).join('');
  }

  // ========== 随机密码（旧格式：random password） ==========

  /**
   * 处理随机密码生成
   */
  private handleRandomPassword(query: string): RandomResult | null {
    // 匹配: random password <长度>
    let pattern = /^random\s+password\s+(\d+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: <长度> random password
      pattern = /^(\d+)\s+random\s+password$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const length = parseInt(match[1], 10);

    if (length < 1 || length > 1000) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: '长度必须在 1-1000 之间',
      };
    }

    try {
      const password = this.generateRandomPassword(length);
      return {
        input: query,
        output: password,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: `随机密码生成失败: ${error.message}`,
      };
    }
  }

  /**
   * 生成随机密码（包含大小写字母、数字、特殊字符）
   */
  private generateRandomPassword(length: number): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;
    
    let result = '';
    const randomBytesArray = randomBytes(length);
    
    // 确保至少包含每种类型的一个字符
    result += lowercase[Math.floor(Math.random() * lowercase.length)];
    result += uppercase[Math.floor(Math.random() * uppercase.length)];
    result += numbers[Math.floor(Math.random() * numbers.length)];
    result += special[Math.floor(Math.random() * special.length)];
    
    // 填充剩余长度
    for (let i = result.length; i < length; i++) {
      result += allChars[randomBytesArray[i] % allChars.length];
    }
    
    // 打乱顺序
    return result.split('').sort(() => Math.random() - 0.5).join('');
  }

  // ========== 随机数字 ==========

  /**
   * 处理随机数字生成
   */
  private handleRandomNumber(query: string): RandomResult | null {
    // 匹配: random number <min> <max>
    let pattern = /^random\s+number\s+(\d+)\s+(\d+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: random number <max>（min 默认为 0）
      pattern = /^random\s+number\s+(\d+)$/i;
      match = query.match(pattern);
      if (match) {
        const max = parseInt(match[1], 10);
        return this.generateRandomNumberResult(0, max, query);
      }
    }

    if (!match) {
      return null;
    }

    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);

    return this.generateRandomNumberResult(min, max, query);
  }

  /**
   * 生成随机数字结果
   */
  private generateRandomNumberResult(min: number, max: number, query: string): RandomResult {
    if (min > max) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: '最小值不能大于最大值',
      };
    }

    if (min < -Number.MAX_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: '数值超出安全范围',
      };
    }

    try {
      // 使用 crypto.randomInt 生成安全的随机数
      const randomNum = randomInt(min, max + 1);
      return {
        input: query,
        output: String(randomNum),
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: `随机数字生成失败: ${error.message}`,
      };
    }
  }

  /**
   * 随机数生成补全（智能建议）
   * @param partial 部分输入的查询
   * @returns 匹配的格式建议
   */
  public completeRandom(partial: string): Array<{ format: string; description: string; example: string }> {
    if (!partial || !partial.trim()) {
      return [];
    }

    const query = partial.toLowerCase().trim();
    const suggestions: Array<{ format: string; description: string; example: string; score: number }> = [];

    // 随机数生成格式列表
    const formats = [
      { format: 'pwd', description: '生成密码（默认10个，长度16）', example: 'pwd', keywords: ['pwd', 'password', '密码'] },
      { format: 'pwd <长度>', description: '生成指定长度的密码', example: 'pwd 20', keywords: ['pwd', 'password', '密码', '长度'] },
      { format: 'password', description: '生成密码（同 pwd）', example: 'password', keywords: ['password', 'pwd', '密码'] },
      { format: '密码', description: '生成密码（中文）', example: '密码 16', keywords: ['密码', 'pwd', 'password'] },
      { format: 'uuid', description: '生成 UUID v4', example: 'uuid', keywords: ['uuid'] },
      { format: 'uuid v1', description: '生成 UUID v1', example: 'uuid v1', keywords: ['uuid', 'v1'] },
      { format: 'random string', description: '生成随机字符串', example: 'random string 10', keywords: ['random', 'string', '字符串'] },
      { format: 'random number', description: '生成随机数字', example: 'random number 1-100', keywords: ['random', 'number', '数字'] },
    ];

    // 智能匹配：支持部分输入匹配
    for (const format of formats) {
      let score = 0;
      const formatLower = format.format.toLowerCase();
      const queryWords = query.split(/\s+/).filter(w => w.length > 0);
      
      // 完全匹配（最高优先级）
      if (formatLower === query || formatLower.replace(/<[^>]+>/g, '').trim() === query) {
        score = 1000;
      }
      // 开头匹配
      else if (formatLower.startsWith(query) || formatLower.replace(/<[^>]+>/g, '').trim().startsWith(query)) {
        score = 500;
      }
      // 包含匹配
      else if (formatLower.includes(query)) {
        score = 200;
      }
      // 关键词匹配
      else if (queryWords.length > 0) {
        const matchedKeywords = queryWords.filter(word => 
          format.keywords.some(kw => kw.toLowerCase().includes(word) || word.includes(kw.toLowerCase()))
        );
        if (matchedKeywords.length > 0) {
          score = 300 + matchedKeywords.length * 50;
        }
      }
      // 描述匹配
      if (format.description.includes(query)) {
        score = Math.max(score, 100);
      }

      if (score > 0) {
        suggestions.push({ ...format, score });
      }
    }

    // 按分数降序排序
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.slice(0, 5).map(({ score, ...rest }) => rest);
  }

  /**
   * 获取随机数生成帮助信息
   */
  public getRandomHelp(): {
    title: string;
    description: string;
    formats: Array<{ format: string; description: string; example: string }>;
  } {
    return {
      title: '随机数生成',
      description: '支持密码、UUID、随机字符串、随机数字生成',
      formats: [
        { format: 'pwd [长度]', description: '生成密码（默认10个，长度16）', example: 'pwd 或 pwd 20' },
        { format: 'password [长度]', description: '生成密码（同 pwd）', example: 'password 16' },
        { format: '密码 [长度]', description: '生成密码（中文）', example: '密码 20' },
        { format: 'uuid [v1|v4]', description: '生成 UUID', example: 'uuid 或 uuid v1' },
        { format: 'random string <长度>', description: '生成随机字符串', example: 'random string 10' },
        { format: 'random number <最小值>-<最大值>', description: '生成随机数字', example: 'random number 1-100' },
      ],
    };
  }
}

export const randomService = new RandomService();

