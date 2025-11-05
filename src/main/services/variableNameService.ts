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
        currentWord += char;
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
}

// ========== 导出 ==========

export const variableNameService = new VariableNameService();


