/**
 * 字符串工具服务
 * 支持字符串转换、反转、去除空格、文本统计、字符串操作
 */

// ========== 类型定义 ==========

export interface StringResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

/**
 * 字符串工具服务类
 */
class StringService {
  // ========== 公共 API ==========

  /**
   * 处理字符串工具查询
   * 返回 StringResult 如果识别为字符串工具查询，否则返回 null
   */
  public handleStringQuery(query: string): StringResult | null {
    try {
      const trimmedQuery = query.trim();

      // 1. 检测大小写转换
      const caseResult = this.handleCaseConversion(trimmedQuery);
      if (caseResult) {
        return caseResult;
      }

      // 2. 检测命名格式转换
      const namingResult = this.handleNamingConversion(trimmedQuery);
      if (namingResult) {
        return namingResult;
      }

      // 3. 检测字符串反转
      const reverseResult = this.handleReverse(trimmedQuery);
      if (reverseResult) {
        return reverseResult;
      }

      // 4. 检测去除空格
      const trimResult = this.handleTrim(trimmedQuery);
      if (trimResult) {
        return trimResult;
      }

      // 5. 检测文本统计
      const countResult = this.handleCount(trimmedQuery);
      if (countResult) {
        return countResult;
      }

      // 6. 检测字符串替换
      const replaceResult = this.handleReplace(trimmedQuery);
      if (replaceResult) {
        return replaceResult;
      }

      // 7. 检测正则提取
      const extractResult = this.handleExtract(trimmedQuery);
      if (extractResult) {
        return extractResult;
      }

      return null;
    } catch (error: any) {
      console.error(`❌ [字符串工具] 处理失败: ${error.message}`);
      return {
        input: query,
        output: '',
        success: false,
        error: error.message || '字符串处理错误',
      };
    }
  }

  // ========== 大小写转换 ==========

  /**
   * 处理大小写转换
   */
  private handleCaseConversion(query: string): StringResult | null {
    // 匹配: uppercase <字符串> 或 大写 <字符串>
    let pattern = /^(?:uppercase|大写)\s+(.+)$/i;
    let match = query.match(pattern);
    let conversionType: 'uppercase' | 'lowercase' | 'title' | null = 'uppercase';

    if (!match) {
      // 匹配: <字符串> uppercase 或 <字符串> 大写
      pattern = /^(.+?)\s+(?:uppercase|大写)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: lowercase <字符串> 或 小写 <字符串>
      pattern = /^(?:lowercase|小写)\s+(.+)$/i;
      match = query.match(pattern);
      conversionType = 'lowercase';
    }

    if (!match) {
      // 匹配: <字符串> lowercase 或 <字符串> 小写
      pattern = /^(.+?)\s+(?:lowercase|小写)$/i;
      match = query.match(pattern);
      conversionType = 'lowercase';
    }

    if (!match) {
      // 匹配: title case <字符串> 或 标题 <字符串>
      pattern = /^(?:title\s+case|标题)\s+(.+)$/i;
      match = query.match(pattern);
      conversionType = 'title';
    }

    if (!match) {
      // 匹配: <字符串> title case 或 <字符串> 标题
      pattern = /^(.+?)\s+(?:title\s+case|标题)$/i;
      match = query.match(pattern);
      conversionType = 'title';
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

    try {
      let result: string;
      switch (conversionType) {
        case 'uppercase':
          result = text.toUpperCase();
          break;
        case 'lowercase':
          result = text.toLowerCase();
          break;
        case 'title':
          result = this.toTitleCase(text);
          break;
        default:
          return null;
      }

      return {
        input: query,
        output: `${text} → ${result}`,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `大小写转换失败: ${error.message}`,
      };
    }
  }

  /**
   * 转换为标题格式（首字母大写）
   */
  private toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // ========== 命名格式转换 ==========

  /**
   * 处理命名格式转换
   */
  private handleNamingConversion(query: string): StringResult | null {
    // 匹配: camel case <字符串>
    let pattern = /^camel\s+case\s+(.+)$/i;
    let match = query.match(pattern);
    let conversionType: 'camel' | 'snake' | null = 'camel';

    if (!match) {
      // 匹配: <字符串> camel case
      pattern = /^(.+?)\s+camel\s+case$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: snake case <字符串>
      pattern = /^snake\s+case\s+(.+)$/i;
      match = query.match(pattern);
      conversionType = 'snake';
    }

    if (!match) {
      // 匹配: <字符串> snake case
      pattern = /^(.+?)\s+snake\s+case$/i;
      match = query.match(pattern);
      conversionType = 'snake';
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

    try {
      let result: string;
      switch (conversionType) {
        case 'camel':
          result = this.toCamelCase(text);
          break;
        case 'snake':
          result = this.toSnakeCase(text);
          break;
        default:
          return null;
      }

      return {
        input: query,
        output: `${text} → ${result}`,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `命名格式转换失败: ${error.message}`,
      };
    }
  }

  /**
   * 转换为驼峰命名
   */
  private toCamelCase(text: string): string {
    return text
      .split(/[\s\-_]+/)
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  /**
   * 转换为蛇形命名
   */
  private toSnakeCase(text: string): string {
    return text
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // ========== 字符串反转 ==========

  /**
   * 处理字符串反转
   */
  private handleReverse(query: string): StringResult | null {
    // 匹配: reverse <字符串> 或 反转 <字符串>
    let pattern = /^(?:reverse|反转)\s+(.+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: <字符串> reverse 或 <字符串> 反转
      pattern = /^(.+?)\s+(?:reverse|反转)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

    try {
      const reversed = text.split('').reverse().join('');
      return {
        input: query,
        output: `${text} → ${reversed}`,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `字符串反转失败: ${error.message}`,
      };
    }
  }

  // ========== 去除空格 ==========

  /**
   * 处理去除空格
   */
  private handleTrim(query: string): StringResult | null {
    // 先匹配 trim all（更具体的模式）
    // 匹配: trim all <字符串>
    let pattern = /^trim\s+all\s+(.+)$/i;
    let match = query.match(pattern);
    let trimType: 'trim' | 'trimAll' = 'trimAll';

    if (!match) {
      // 匹配: <字符串> trim all
      pattern = /^(.+?)\s+trim\s+all$/i;
      match = query.match(pattern);
      trimType = 'trimAll';
    }

    if (!match) {
      // 匹配: trim <字符串>（普通 trim）
      pattern = /^trim\s+(.+)$/i;
      match = query.match(pattern);
      trimType = 'trim';
    }

    if (!match) {
      // 匹配: <字符串> trim
      pattern = /^(.+?)\s+trim$/i;
      match = query.match(pattern);
      trimType = 'trim';
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

    try {
      let result: string;
      if (trimType === 'trimAll') {
        result = text.replace(/\s+/g, '');
      } else {
        result = text.trim();
      }

      return {
        input: query,
        output: `${text} → ${result}`,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `去除空格失败: ${error.message}`,
      };
    }
  }

  // ========== 文本统计 ==========

  /**
   * 处理文本统计
   */
  private handleCount(query: string): StringResult | null {
    // 先匹配 word count（更具体的模式）
    // 匹配: word count <字符串>
    let pattern = /^word\s+count\s+(.+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: <字符串> word count
      pattern = /^(.+?)\s+word\s+count$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: count <字符串> 或 统计 <字符串>
      pattern = /^(?:count|统计)\s+(.+)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: <字符串> count 或 <字符串> 统计
      pattern = /^(.+?)\s+(?:count|统计)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

    try {
      const stats = this.getTextStats(text);
      return {
        input: query,
        output: stats,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `文本统计失败: ${error.message}`,
      };
    }
  }

  /**
   * 获取文本统计信息
   */
  private getTextStats(text: string): string {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;

    return `字符数: ${chars}\n字符数(不含空格): ${charsNoSpaces}\n单词数: ${words}\n行数: ${lines}\n段落数: ${paragraphs}`;
  }

  // ========== 字符串替换 ==========

  /**
   * 处理字符串替换
   */
  private handleReplace(query: string): StringResult | null {
    // 匹配: replace <字符串> <查找> <替换>
    // 注意：需要处理包含空格的替换字符串
    const pattern = /^replace\s+(.+?)\s+(.+?)\s+(.+)$/i;
    const match = query.match(pattern);

    if (!match) {
      return null;
    }

    const text = match[1].trim();
    const search = match[2].trim();
    const replace = match[3].trim();

    try {
      const result = text.replace(new RegExp(this.escapeRegex(search), 'g'), replace);
      return {
        input: query,
        output: `${text} → ${result}`,
        success: true,
      };
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `字符串替换失败: ${error.message}`,
      };
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ========== 正则提取 ==========

  /**
   * 处理正则提取
   */
  private handleExtract(query: string): StringResult | null {
    // 匹配: extract <字符串> <正则表达式>
    const pattern = /^extract\s+(.+?)\s+(.+)$/i;
    const match = query.match(pattern);

    if (!match) {
      return null;
    }

    const text = match[1].trim();
    const regexStr = match[2].trim();

    try {
      // 尝试解析正则表达式
      let regex: RegExp;
      try {
        // 如果正则表达式没有包含 /，尝试添加
        if (!regexStr.startsWith('/')) {
          regex = new RegExp(regexStr, 'g');
        } else {
          // 处理 /pattern/flags 格式
          const regexMatch = regexStr.match(/^\/(.+)\/([gimuy]*)$/);
          if (regexMatch) {
            regex = new RegExp(regexMatch[1], regexMatch[2] || 'g');
          } else {
            regex = new RegExp(regexStr, 'g');
          }
        }
      } catch (e) {
        return {
          input: query,
          output: '',
          success: false,
          error: `无效的正则表达式: ${regexStr}`,
        };
      }

      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        const result = matches.join(', ');
        return {
          input: query,
          output: `${text} → [${result}]`,
          success: true,
        };
      } else {
        return {
          input: query,
          output: `${text} → (未找到匹配)`,
          success: true,
        };
      }
    } catch (error: any) {
      return {
        input: query,
        output: '',
        success: false,
        error: `正则提取失败: ${error.message}`,
      };
    }
  }
}

export const stringService = new StringService();

