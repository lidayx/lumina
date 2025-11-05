/**
 * 随机数生成服务
 * 支持 UUID 生成、随机字符串、随机密码、随机数字
 */

import { randomBytes, randomInt } from 'crypto';

// ========== 类型定义 ==========

export interface RandomResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
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

      // 1. 检测 UUID 生成
      const uuidResult = this.handleUuid(trimmedQuery);
      if (uuidResult) {
        return uuidResult;
      }

      // 2. 检测随机字符串
      const randomStringResult = this.handleRandomString(trimmedQuery);
      if (randomStringResult) {
        return randomStringResult;
      }

      // 3. 检测随机密码
      const randomPasswordResult = this.handleRandomPassword(trimmedQuery);
      if (randomPasswordResult) {
        return randomPasswordResult;
      }

      // 4. 检测随机数字
      const randomNumberResult = this.handleRandomNumber(trimmedQuery);
      if (randomNumberResult) {
        return randomNumberResult;
      }

      return null;
    } catch (error: any) {
      console.error(`❌ [随机数服务] 处理失败: ${error.message}`);
      return {
        input: query,
        output: '',
        success: false,
        error: error.message || '随机数生成错误',
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
      return {
        input: query,
        output: '',
        success: false,
        error: `UUID 生成失败: ${error.message}`,
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
        output: '',
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
        output: '',
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

  // ========== 随机密码 ==========

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
        output: '',
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
        output: '',
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
        output: '',
        success: false,
        error: '最小值不能大于最大值',
      };
    }

    if (min < -Number.MAX_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER) {
      return {
        input: query,
        output: '',
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
        output: '',
        success: false,
        error: `随机数字生成失败: ${error.message}`,
      };
    }
  }
}

export const randomService = new RandomService();

