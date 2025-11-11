/**
 * 变量名生成服务
 * 根据描述文本自动生成符合规范的变量名（支持多种命名风格）
 * 如果输入是中文，会先调用翻译服务翻译成英文
 */

import { pinyin } from 'pinyin-pro';
import { translateService } from './translateService';

// ========== 类型定义 ==========

export interface VariableNameResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
  options?: {
    camelCase: string;
    snakeCase: string;
    pascalCase: string;
    constantCase: string;
    kebabCase: string;
  };
}

type NamingStyle = 'camel' | 'snake' | 'pascal' | 'constant' | 'kebab';

/**
 * 变量名生成服务类
 */
class VariableNameService {
  // ========== 公共 API ==========

  /**
   * 处理变量名生成查询
   * 返回 VariableNameResult 如果识别为变量名生成查询，否则返回 null
   */
  public async handleVariableNameQuery(query: string): Promise<VariableNameResult | null> {
    // 检查功能开关
    const { default: settingsService } = await import('./settingsService');
    const settings = settingsService.getSettings();
    if (settings.featureVariableName === false) {
      return null;
    }

    try {
      const trimmedQuery = query.trim();

      // 解析查询
      const parsed = this.parseVariableNameQuery(trimmedQuery);
      if (!parsed) {
        return null;
      }

      const { text, style } = parsed;

      if (!text) {
        const errorMsg = '请输入描述文本';
        return {
          input: query,
          output: errorMsg,
          success: false,
          error: errorMsg,
        };
      }

      // 检测输入是否包含中文
      let processedText = text;
      const hasChinese = /[\u4e00-\u9fa5]/.test(text);
      
      if (hasChinese) {
        console.log(`🌐 [变量名生成] 检测到中文输入，先翻译为英文: "${text}"`);
        try {
          // 调用翻译服务将中文翻译成英文
          const translateResult = await translateService.handleTranslateQuery(`en ${text}`);
          if (translateResult && translateResult.success && translateResult.output) {
            // 从翻译结果中提取英文文本（格式：原文 → 译文）
            const translatedText = translateResult.output.split(' → ')[1] || translateResult.output;
            processedText = translatedText.trim();
            console.log(`🌐 [变量名生成] 翻译结果: "${text}" → "${processedText}"`);
          } else {
            console.warn(`⚠️ [变量名生成] 翻译失败，使用拼音转换: ${translateResult?.error || '未知错误'}`);
            // 翻译失败时，继续使用原来的拼音转换逻辑
          }
        } catch (error: any) {
          console.error(`❌ [变量名生成] 翻译服务调用失败: ${error.message}`);
          // 翻译失败时，继续使用原来的拼音转换逻辑
        }
      }

      // 生成所有风格的变量名
      const options = this.generateAllStyles(processedText);
      
      if (!options) {
        throw new Error('无法生成变量名');
      }

      // 如果指定了风格，只返回该风格
      if (style) {
        const selectedName = options[`${style}Case` as keyof typeof options] || options.camelCase;
        // 只显示最终变量名
        return {
          input: query,
          output: selectedName,
          success: true,
          options,
        };
      }

      // 返回所有风格选项
      const output = [
        `camelCase: ${options.camelCase}`,
        `snake_case: ${options.snakeCase}`,
        `PascalCase: ${options.pascalCase}`,
        `CONSTANT:   ${options.constantCase}`,
        `kebab-case: ${options.kebabCase}`,
      ].join('\n');

      return {
        input: query,
        output,
        success: true,
        options,
      };
    } catch (error: any) {
      console.error(`❌ [变量名生成] 处理失败: ${error.message}`);
      const errorMsg = `变量名生成失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 解析变量名生成查询
   */
  private parseVariableNameQuery(query: string): {
    text: string;
    style?: NamingStyle;
  } | null {
    // 1. 快捷方式：camel <文本>、snake <文本>、pascal <文本>
    let pattern = /^(camel|snake|pascal)\s+(.+)$/i;
    let match = query.match(pattern);
    if (match) {
      return {
        text: match[2].trim(),
        style: match[1].toLowerCase() as NamingStyle,
      };
    }

    // 2. varname <文本> <风格> 或 变量名 <文本> <风格>
    pattern = /^(?:varname|变量名)\s+(.+?)\s+(camel|snake|pascal|constant|kebab)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
        style: match[2].toLowerCase() as NamingStyle,
      };
    }

    // 3. varname <文本> 或 变量名 <文本>
    pattern = /^(?:varname|变量名)\s+(.+)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
      };
    }

    // 4. <文本> varname 或 <文本> 变量名
    pattern = /^(.+?)\s+(?:varname|变量名)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
      };
    }

    return null;
  }

  /**
   * 生成所有风格的变量名
   */
  private generateAllStyles(text: string): VariableNameResult['options'] {
    // 处理文本，转换为单词数组
    const words = this.processText(text);

    if (words.length === 0) {
      throw new Error('无法识别输入文本');
    }

    // 生成各种风格
    return {
      camelCase: this.toCamelCase(words),
      snakeCase: this.toSnakeCase(words),
      pascalCase: this.toPascalCase(words),
      constantCase: this.toConstantCase(words),
      kebabCase: this.toKebabCase(words),
    };
  }

  /**
   * 处理文本，转换为单词数组
   */
  private processText(text: string): string[] {
    const words: string[] = [];
    let currentWord = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 中文字符
      if (/[\u4e00-\u9fa5]/.test(char)) {
        if (currentWord) {
          words.push(currentWord);
          currentWord = '';
        }
        // 将中文转换为拼音
        // 注意：由于中文会先翻译成英文，这里的中文处理主要用于翻译失败时的降级方案
        const pinyinStr = pinyin(char, { toneType: 'none', type: 'all', multiple: true });
        // 取第一个拼音（处理多音字）
        // 将结果转换为字符串再处理
        const pinyinStrValue = String(pinyinStr);
        const pinyinWord = pinyinStrValue.split(' ')[0] || pinyinStrValue;
        if (pinyinWord) {
          words.push(pinyinWord.toLowerCase());
        }
      }
      // 英文字母或数字
      else if (/[a-zA-Z0-9]/.test(char)) {
        // 检测驼峰命名：如果当前字符是大写，且前面有小写字母，说明是新单词的开始
        if (/[A-Z]/.test(char) && currentWord && /[a-z]/.test(currentWord)) {
          // 将当前累积的单词加入数组
          words.push(currentWord);
          currentWord = char;
        } else {
          currentWord += char;
        }
      }
      // 分隔符（空格、连字符、下划线等）
      else {
        if (currentWord) {
          words.push(currentWord);
          currentWord = '';
        }
      }
    }

    // 处理最后一个单词
    if (currentWord) {
      words.push(currentWord);
    }

    // 如果只有一个单词，尝试识别驼峰命名并分割
    if (words.length === 1 && words[0]) {
      const singleWord = words[0];
      // 检测是否包含大写字母（驼峰命名或帕斯卡命名）
      if (/[A-Z]/.test(singleWord)) {
        // 按大写字母分割：在驼峰命名中，大写字母通常是新单词的开始
        // 例如：userName -> user, Name
        const camelCaseWords = singleWord.split(/(?=[A-Z])/);
        if (camelCaseWords.length > 1) {
          // 返回分割后的单词数组（全部转为小写）
          return camelCaseWords
            .filter(word => word.length > 0)
            .map(word => word.toLowerCase());
        }
      }
    }

    // 过滤空单词并规范化
    return words
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());
  }

  /**
   * 转换为驼峰命名（camelCase）
   */
  private toCamelCase(words: string[]): string {
    if (words.length === 0) return '';
    
    return words
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return this.capitalizeFirst(word);
      })
      .join('');
  }

  /**
   * 转换为蛇形命名（snake_case）
   */
  private toSnakeCase(words: string[]): string {
    return words.join('_');
  }

  /**
   * 转换为帕斯卡命名（PascalCase）
   */
  private toPascalCase(words: string[]): string {
    return words.map(word => this.capitalizeFirst(word)).join('');
  }

  /**
   * 转换为常量命名（CONSTANT_CASE）
   */
  private toConstantCase(words: string[]): string {
    return words.map(word => word.toUpperCase()).join('_');
  }

  /**
   * 转换为短横线命名（kebab-case）
   */
  private toKebabCase(words: string[]): string {
    return words.join('-');
  }

  /**
   * 首字母大写
   */
  private capitalizeFirst(word: string): string {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * 变量名生成补全（智能建议）
   */
  public completeVariableName(partial: string): Array<{ format: string; description: string; example: string }> {
    if (!partial || !partial.trim()) {
      return [];
    }

    const query = partial.toLowerCase().trim();
    const suggestions: Array<{ format: string; description: string; example: string; score: number }> = [];

    const formats = [
      { format: 'varname', description: '生成变量名（所有风格）', example: 'varname user name', keywords: ['varname', '变量名'] },
      { format: '变量名', description: '生成变量名（中文）', example: '变量名 用户名', keywords: ['变量名', 'varname'] },
      { format: 'camel', description: '生成驼峰命名', example: 'camel user name', keywords: ['camel', '驼峰'] },
      { format: 'snake', description: '生成蛇形命名', example: 'snake user name', keywords: ['snake', '蛇形'] },
      { format: 'pascal', description: '生成帕斯卡命名', example: 'pascal user name', keywords: ['pascal', '帕斯卡'] },
    ];

    // 智能匹配：支持部分输入匹配
    for (const format of formats) {
      let score = 0;
      const formatLower = format.format.toLowerCase();
      const queryWords = query.split(/\s+/).filter(w => w.length > 0);
      
      // 完全匹配（最高优先级）
      if (formatLower === query) {
        score = 1000;
      }
      // 开头匹配
      else if (formatLower.startsWith(query)) {
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
   * 获取变量名生成帮助信息
   */
  public getVariableNameHelp(): {
    title: string;
    description: string;
    formats: Array<{ format: string; description: string; example: string }>;
  } {
    return {
      title: '变量名生成',
      description: '根据描述生成多种命名风格的变量名',
      formats: [
        { format: 'varname <描述>', description: '生成所有风格的变量名', example: 'varname user name' },
        { format: '变量名 <描述>', description: '生成变量名（中文）', example: '变量名 用户名' },
        { format: 'camel <描述>', description: '生成驼峰命名（camelCase）', example: 'camel user name' },
        { format: 'snake <描述>', description: '生成蛇形命名（snake_case）', example: 'snake user name' },
        { format: 'pascal <描述>', description: '生成帕斯卡命名（PascalCase）', example: 'pascal user name' },
      ],
    };
  }
}

// ========== 导出 ==========

export const variableNameService = new VariableNameService();


