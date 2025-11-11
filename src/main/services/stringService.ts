/**
 * 字符串工具服务
 * 支持字符串转换、反转、去除空格、文本统计、字符串操作
 */

import { settingsService } from './settingsService';
import { calculateMatchScore } from '../../shared/utils/matchUtils';

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
    // 检查功能开关
    const settings = settingsService.getSettings();
    if (settings.featureStringTools === false) {
      return null;
    }

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
      const errorMsg = error.message || '字符串处理错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 大小写转换 ==========

  /**
   * 处理大小写转换
   */
  private handleCaseConversion(query: string): StringResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const uppercaseCommandPattern = /^(?:uppercase|大写)(?:\s+(.+))?$/i;
    const lowercaseCommandPattern = /^(?:lowercase|小写)(?:\s+(.+))?$/i;
    const titleCommandPattern = /^(?:title\s+case|标题)(?:\s+(.+))?$/i;
    const uppercaseCommandReversePattern = /^(.+?)\s+(?:uppercase|大写)$/i;
    const lowercaseCommandReversePattern = /^(.+?)\s+(?:lowercase|小写)$/i;
    const titleCommandReversePattern = /^(.+?)\s+(?:title\s+case|标题)$/i;
    
    let match: RegExpMatchArray | null = null;
    let conversionType: 'uppercase' | 'lowercase' | 'title' | null = null;
    let text = '';

    // 检查正向格式: uppercase <字符串> 或 大写 <字符串>
    match = query.match(uppercaseCommandPattern);
    if (match) {
      conversionType = 'uppercase';
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: lowercase <字符串> 或 小写 <字符串>
    if (!match) {
      match = query.match(lowercaseCommandPattern);
      if (match) {
        conversionType = 'lowercase';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查正向格式: title case <字符串> 或 标题 <字符串>
    if (!match) {
      match = query.match(titleCommandPattern);
      if (match) {
        conversionType = 'title';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> uppercase 或 <字符串> 大写
    if (!match) {
      match = query.match(uppercaseCommandReversePattern);
      if (match) {
        conversionType = 'uppercase';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> lowercase 或 <字符串> 小写
    if (!match) {
      match = query.match(lowercaseCommandReversePattern);
      if (match) {
        conversionType = 'lowercase';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> title case 或 <字符串> 标题
    if (!match) {
      match = query.match(titleCommandReversePattern);
      if (match) {
        conversionType = 'title';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 如果没有匹配到任何格式，返回 null
    if (!match) {
      return null;
    }

    // 如果匹配到命令格式但没有参数，返回错误提示
    if (!text) {
      const operationName = conversionType === 'uppercase' ? '大写' : conversionType === 'lowercase' ? '小写' : '标题格式';
      return {
        input: query,
        output: '',
        success: false,
        error: `请输入要转换为${operationName}的内容`,
      };
    }

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
        output: result,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `大小写转换失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
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
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const camelCommandPattern = /^camel\s+case(?:\s+(.+))?$/i;
    const snakeCommandPattern = /^snake\s+case(?:\s+(.+))?$/i;
    const camelCommandReversePattern = /^(.+?)\s+camel\s+case$/i;
    const snakeCommandReversePattern = /^(.+?)\s+snake\s+case$/i;
    
    let match: RegExpMatchArray | null = null;
    let conversionType: 'camel' | 'snake' | null = null;
    let text = '';

    // 检查正向格式: camel case <字符串>
    match = query.match(camelCommandPattern);
    if (match) {
      conversionType = 'camel';
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: snake case <字符串>
    if (!match) {
      match = query.match(snakeCommandPattern);
      if (match) {
        conversionType = 'snake';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> camel case
    if (!match) {
      match = query.match(camelCommandReversePattern);
      if (match) {
        conversionType = 'camel';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> snake case
    if (!match) {
      match = query.match(snakeCommandReversePattern);
      if (match) {
        conversionType = 'snake';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 如果没有匹配到任何格式，返回 null
    if (!match) {
      return null;
    }

    // 如果匹配到命令格式但没有参数，返回错误提示
    if (!text) {
      const operationName = conversionType === 'camel' ? '驼峰命名' : '蛇形命名';
      return {
        input: query,
        output: '',
        success: false,
        error: `请输入要转换为${operationName}的内容`,
      };
    }

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
        output: result,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `命名格式转换失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
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
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const reverseCommandPattern = /^(?:reverse|反转)(?:\s+(.+))?$/i;
    const reverseCommandReversePattern = /^(.+?)\s+(?:reverse|反转)$/i;
    
    let match: RegExpMatchArray | null = null;
    let text = '';

    // 检查正向格式: reverse <字符串> 或 反转 <字符串>
    match = query.match(reverseCommandPattern);
    if (match) {
      text = match[1] ? match[1].trim() : '';
    }

    // 检查反向格式: <字符串> reverse 或 <字符串> 反转
    if (!match) {
      match = query.match(reverseCommandReversePattern);
      if (match) {
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 如果没有匹配到任何格式，返回 null
    if (!match) {
      return null;
    }

    // 如果匹配到命令格式但没有参数，返回错误提示
    if (!text) {
      return {
        input: query,
        output: '',
        success: false,
        error: '请输入要反转的内容',
      };
    }

    try {
      const reversed = text.split('').reverse().join('');
      return {
        input: query,
        output: reversed,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `字符串反转失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 去除空格 ==========

  /**
   * 处理去除空格
   */
  private handleTrim(query: string): StringResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const trimAllCommandPattern = /^trim\s+all(?:\s+(.+))?$/i;
    const trimCommandPattern = /^trim(?:\s+(.+))?$/i;
    const trimAllCommandReversePattern = /^(.+?)\s+trim\s+all$/i;
    const trimCommandReversePattern = /^(.+?)\s+trim$/i;
    
    let match: RegExpMatchArray | null = null;
    let trimType: 'trim' | 'trimAll' = 'trim';
    let text = '';

    // 检查正向格式: trim all <字符串>
    match = query.match(trimAllCommandPattern);
    if (match) {
      trimType = 'trimAll';
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: trim <字符串>
    if (!match) {
      match = query.match(trimCommandPattern);
      if (match) {
        trimType = 'trim';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> trim all
    if (!match) {
      match = query.match(trimAllCommandReversePattern);
      if (match) {
        trimType = 'trimAll';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> trim
    if (!match) {
      match = query.match(trimCommandReversePattern);
      if (match) {
        trimType = 'trim';
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 如果没有匹配到任何格式，返回 null
    if (!match) {
      return null;
    }

    // 如果匹配到命令格式但没有参数，返回错误提示
    if (!text) {
      return {
        input: query,
        output: '',
        success: false,
        error: '请输入要去除空格的内容',
      };
    }

    try {
      let result: string;
      if (trimType === 'trimAll') {
        result = text.replace(/\s+/g, '');
      } else {
        result = text.trim();
      }

      return {
        input: query,
        output: result,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `去除空格失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== 文本统计 ==========

  /**
   * 处理文本统计
   */
  private handleCount(query: string): StringResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const wordCountCommandPattern = /^word\s+count(?:\s+(.+))?$/i;
    const countCommandPattern = /^(?:count|统计)(?:\s+(.+))?$/i;
    const wordCountCommandReversePattern = /^(.+?)\s+word\s+count$/i;
    const countCommandReversePattern = /^(.+?)\s+(?:count|统计)$/i;
    
    let match: RegExpMatchArray | null = null;
    let text = '';

    // 检查正向格式: word count <字符串>
    match = query.match(wordCountCommandPattern);
    if (match) {
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: count <字符串> 或 统计 <字符串>
    if (!match) {
      match = query.match(countCommandPattern);
      if (match) {
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> word count
    if (!match) {
      match = query.match(wordCountCommandReversePattern);
      if (match) {
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> count 或 <字符串> 统计
    if (!match) {
      match = query.match(countCommandReversePattern);
      if (match) {
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 如果没有匹配到任何格式，返回 null
    if (!match) {
      return null;
    }

    // 如果匹配到命令格式但没有参数，返回错误提示
    if (!text) {
      return {
        input: query,
        output: '',
        success: false,
        error: '请输入要统计的内容',
      };
    }

    try {
      const stats = this.getTextStats(text);
      return {
        input: query,
        output: stats,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `文本统计失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
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
        output: result,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `字符串替换失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
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
        const errorMsg = `无效的正则表达式: ${regexStr}`;
        return {
          input: query,
          output: errorMsg,
          success: false,
          error: errorMsg,
        };
      }

      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        const result = matches.join(', ');
        return {
          input: query,
          output: `[${result}]`,
          success: true,
        };
      } else {
        return {
          input: query,
          output: '(未找到匹配)',
          success: true,
        };
      }
    } catch (error: any) {
      const errorMsg = `正则提取失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 字符串工具补全（智能建议）
   */
  public completeString(partial: string): Array<{ format: string; description: string; example: string }> {
    if (!partial || !partial.trim()) {
      return [];
    }

    const query = partial.toLowerCase().trim();
    const suggestions: Array<{ format: string; description: string; example: string; score: number }> = [];

    const formats = [
      { format: 'uppercase', description: '转换为大写', example: 'uppercase hello world', keywords: ['uppercase', 'upper', '大写', 'daxie', 'dx'] },
      { format: 'lowercase', description: '转换为小写', example: 'lowercase HELLO WORLD', keywords: ['lowercase', 'lower', '小写', 'xiaoxie', 'xx'] },
      { format: 'title case', description: '转换为标题格式', example: 'title case hello world', keywords: ['title', 'tit', '标题', 'biaoti', 'bt'] },
      { format: 'camel case', description: '转换为驼峰命名', example: 'camel case hello world', keywords: ['camel', 'cam', '驼峰', 'tuofeng', 'tf'] },
      { format: 'snake case', description: '转换为蛇形命名', example: 'snake case hello world', keywords: ['snake', 'sna', '蛇形', 'shexing', 'sx'] },
      { format: 'reverse', description: '反转字符串', example: 'reverse hello', keywords: ['reverse', 'rev', '反转', 'fanzhuan', 'fz'] },
      { format: 'trim', description: '去除空格', example: 'trim  hello  ', keywords: ['trim', 'tri', '去除', 'quchu', 'qc'] },
      { format: 'count', description: '统计字符数', example: 'count hello world', keywords: ['count', 'cou', '统计', 'tongji', 'tj'] },
      { format: 'replace', description: '替换字符串', example: 'replace hello world hello hi', keywords: ['replace', 'rep', '替换', 'tihuan', 'th'] },
    ];

    // 智能匹配：使用综合匹配算法
    for (const format of formats) {
      const matchResult = calculateMatchScore(query, format.format, format.keywords);
      
      // 如果描述包含查询，额外加分
      if (format.description.includes(query)) {
        matchResult.score = Math.max(matchResult.score, 100);
      }
      
      if (matchResult.score > 0) {
        suggestions.push({ ...format, score: matchResult.score });
      }
    }

    // 按分数降序排序
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.slice(0, 5).map(({ score, ...rest }) => rest);
  }

  /**
   * 获取字符串工具帮助信息
   */
  public getStringHelp(): {
    title: string;
    description: string;
    formats: Array<{ format: string; description: string; example: string }>;
  } {
    return {
      title: '字符串工具',
      description: '支持大小写转换、命名格式转换、字符串操作等',
      formats: [
        { format: 'uppercase <文本>', description: '转换为大写', example: 'uppercase hello' },
        { format: 'lowercase <文本>', description: '转换为小写', example: 'lowercase HELLO' },
        { format: 'title case <文本>', description: '转换为标题格式', example: 'title case hello world' },
        { format: 'camel case <文本>', description: '转换为驼峰命名', example: 'camel case hello world' },
        { format: 'snake case <文本>', description: '转换为蛇形命名', example: 'snake case hello world' },
        { format: 'reverse <文本>', description: '反转字符串', example: 'reverse hello' },
        { format: 'trim <文本>', description: '去除首尾空格', example: 'trim  hello  ' },
        { format: 'count <文本>', description: '统计字符数、单词数', example: 'count hello world' },
        { format: 'replace <文本> <旧> <新>', description: '替换字符串', example: 'replace hello world hello hi' },
      ],
    };
  }
}

export const stringService = new StringService();

