/**
 * 编码解码服务
 * 支持 URL 编码/解码、HTML 编码/解码、Base64 编码/解码、MD5 加密
 */

import { createHash } from 'crypto';
import { settingsService } from './settingsService';

// ========== 类型定义 ==========

export interface EncodeResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

import { calculateMatchScore } from '../../shared/utils/matchUtils';

/**
 * 编码解码服务类
 */
class EncodeService {
  // ========== 公共 API ==========

  /**
   * 处理编码解码查询
   * 返回 EncodeResult 如果识别为编码解码查询，否则返回 null
   */
  public handleEncodeQuery(query: string): EncodeResult | null {
    // 检查功能开关
    const settings = settingsService.getSettings();
    if (settings.featureEncodeDecode === false) {
      return null;
    }

    try {
      const trimmedQuery = query.trim();

      // 1. 检测 URL 编码/解码
      const urlResult = this.handleUrlEncode(trimmedQuery);
      if (urlResult) {
        return urlResult;
      }

      // 2. 检测 HTML 编码/解码
      const htmlResult = this.handleHtmlEncode(trimmedQuery);
      if (htmlResult) {
        return htmlResult;
      }

      // 3. 检测 Base64 编码/解码
      const base64Result = this.handleBase64Encode(trimmedQuery);
      if (base64Result) {
        return base64Result;
      }

      // 4. 检测 MD5 加密
      const md5Result = this.handleMd5(trimmedQuery);
      if (md5Result) {
        return md5Result;
      }

      return null;
    } catch (error: any) {
      console.error(`❌ [编码服务] 处理失败: ${error.message}`);
      const errorMsg = error.message || '编码处理错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== URL 编码/解码 ==========

  /**
   * 处理 URL 编码/解码
   */
  private handleUrlEncode(query: string): EncodeResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const encodeCommandPattern = /^(?:url\s+encode|url编码)(?:\s+(.+))?$/i;
    const decodeCommandPattern = /^(?:url\s+decode|url解码)(?:\s+(.+))?$/i;
    const encodeCommandReversePattern = /^(.+?)\s+(?:url\s+encode|url编码)$/i;
    const decodeCommandReversePattern = /^(.+?)\s+(?:url\s+decode|url解码)$/i;
    
    let match: RegExpMatchArray | null = null;
    let isEncode = true;
    let text = '';

    // 检查正向格式: url encode <字符串> 或 url编码 <字符串>
    match = query.match(encodeCommandPattern);
    if (match) {
      isEncode = true;
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: url decode <字符串> 或 url解码 <字符串>
    if (!match) {
      match = query.match(decodeCommandPattern);
      if (match) {
        isEncode = false;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> url encode 或 <字符串> url编码
    if (!match) {
      match = query.match(encodeCommandReversePattern);
      if (match) {
        isEncode = true;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> url decode 或 <字符串> url解码
    if (!match) {
      match = query.match(decodeCommandReversePattern);
      if (match) {
      isEncode = false;
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
        error: `请输入要${isEncode ? '编码' : '解码'}的内容`,
      };
    }

    try {
      if (isEncode) {
        const encoded = encodeURIComponent(text);
        return {
          input: query,
          output: encoded,
          success: true,
        };
      } else {
        const decoded = decodeURIComponent(text);
        return {
          input: query,
          output: decoded,
          success: true,
        };
      }
    } catch (error: any) {
      const errorMsg = `URL ${isEncode ? '编码' : '解码'}失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== HTML 编码/解码 ==========

  /**
   * 处理 HTML 编码/解码
   */
  private handleHtmlEncode(query: string): EncodeResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const encodeCommandPattern = /^(?:html\s+encode|html编码)(?:\s+(.+))?$/i;
    const decodeCommandPattern = /^(?:html\s+decode|html解码)(?:\s+(.+))?$/i;
    const encodeCommandReversePattern = /^(.+?)\s+(?:html\s+encode|html编码)$/i;
    const decodeCommandReversePattern = /^(.+?)\s+(?:html\s+decode|html解码)$/i;
    
    let match: RegExpMatchArray | null = null;
    let isEncode = true;
    let text = '';

    // 检查正向格式: html encode <字符串> 或 html编码 <字符串>
    match = query.match(encodeCommandPattern);
    if (match) {
      isEncode = true;
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: html decode <字符串> 或 html解码 <字符串>
    if (!match) {
      match = query.match(decodeCommandPattern);
      if (match) {
        isEncode = false;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> html encode 或 <字符串> html编码
    if (!match) {
      match = query.match(encodeCommandReversePattern);
      if (match) {
        isEncode = true;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> html decode 或 <字符串> html解码
    if (!match) {
      match = query.match(decodeCommandReversePattern);
      if (match) {
      isEncode = false;
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
        error: `请输入要${isEncode ? '编码' : '解码'}的内容`,
      };
    }

    try {
      if (isEncode) {
        const encoded = this.htmlEncode(text);
        return {
          input: query,
          output: encoded,
          success: true,
        };
      } else {
        const decoded = this.htmlDecode(text);
        return {
          input: query,
          output: decoded,
          success: true,
        };
      }
    } catch (error: any) {
      const errorMsg = `HTML ${isEncode ? '编码' : '解码'}失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * HTML 编码
   */
  private htmlEncode(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * HTML 解码
   */
  private htmlDecode(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#x60;/g, '`')
      .replace(/&#x3D;/g, '=');
  }

  // ========== Base64 编码/解码 ==========

  /**
   * 处理 Base64 编码/解码
   */
  private handleBase64Encode(query: string): EncodeResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const encodeCommandPattern = /^(?:base64\s+encode|base64编码)(?:\s+(.+))?$/i;
    const decodeCommandPattern = /^(?:base64\s+decode|base64解码)(?:\s+(.+))?$/i;
    const encodeCommandReversePattern = /^(.+?)\s+(?:base64\s+encode|base64编码)$/i;
    const decodeCommandReversePattern = /^(.+?)\s+(?:base64\s+decode|base64解码)$/i;
    
    let match: RegExpMatchArray | null = null;
    let isEncode = true;
    let text = '';

    // 检查正向格式: base64 encode <字符串> 或 base64编码 <字符串>
    match = query.match(encodeCommandPattern);
    if (match) {
      isEncode = true;
      text = match[1] ? match[1].trim() : '';
    }

    // 检查正向格式: base64 decode <字符串> 或 base64解码 <字符串>
    if (!match) {
      match = query.match(decodeCommandPattern);
      if (match) {
        isEncode = false;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> base64 encode 或 <字符串> base64编码
    if (!match) {
      match = query.match(encodeCommandReversePattern);
      if (match) {
        isEncode = true;
        text = match[1] ? match[1].trim() : '';
      }
    }

    // 检查反向格式: <字符串> base64 decode 或 <字符串> base64解码
    if (!match) {
      match = query.match(decodeCommandReversePattern);
      if (match) {
      isEncode = false;
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
        error: `请输入要${isEncode ? '编码' : '解码'}的内容`,
      };
    }

    try {
      if (isEncode) {
        const encoded = Buffer.from(text, 'utf-8').toString('base64');
        return {
          input: query,
          output: encoded,
          success: true,
        };
      } else {
        const decoded = Buffer.from(text, 'base64').toString('utf-8');
        return {
          input: query,
          output: decoded,
          success: true,
        };
      }
    } catch (error: any) {
      const errorMsg = `Base64 ${isEncode ? '编码' : '解码'}失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ========== MD5 加密 ==========

  /**
   * 处理 MD5 加密
   */
  private handleMd5(query: string): EncodeResult | null {
    // 先检查是否匹配完整的命令格式（即使没有参数）
    const md5CommandPattern = /^md5(?:\s+(.+))?$/i;
    const md5CommandReversePattern = /^(.+?)\s+md5$/i;
    
    let match: RegExpMatchArray | null = null;
    let text = '';

    // 检查正向格式: md5 <字符串>
    match = query.match(md5CommandPattern);
    if (match) {
      text = match[1] ? match[1].trim() : '';
    }

    // 检查反向格式: <字符串> md5
    if (!match) {
      match = query.match(md5CommandReversePattern);
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
        error: '请输入要加密的内容',
      };
    }

    try {
      const hash = createHash('md5').update(text).digest('hex');
      return {
        input: query,
        output: hash,
        success: true,
      };
    } catch (error: any) {
      const errorMsg = `MD5 加密失败: ${error.message}`;
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 编码解码补全（智能建议）
   */
  public completeEncode(partial: string): Array<{ format: string; description: string; example: string }> {
    if (!partial || !partial.trim()) {
      return [];
    }

    const query = partial.toLowerCase().trim();
    const suggestions: Array<{ format: string; description: string; example: string; score: number }> = [];

    const formats = [
      { format: 'url encode', description: 'URL 编码', example: 'url encode hello world', keywords: ['url', 'encode', '编码', 'en', 'bianma', 'bm'] },
      { format: 'url decode', description: 'URL 解码', example: 'url decode hello%20world', keywords: ['url', 'decode', '解码', 'de', 'jiema', 'jm'] },
      { format: 'html encode', description: 'HTML 编码', example: 'html encode <div>', keywords: ['html', 'encode', '编码', 'en', 'bianma', 'bm'] },
      { format: 'html decode', description: 'HTML 解码', example: 'html decode &lt;div&gt;', keywords: ['html', 'decode', '解码', 'de', 'jiema', 'jm'] },
      { format: 'base64 encode', description: 'Base64 编码', example: 'base64 encode hello', keywords: ['base64', 'encode', '编码', 'en', 'bianma', 'bm'] },
      { format: 'base64 decode', description: 'Base64 解码', example: 'base64 decode aGVsbG8=', keywords: ['base64', 'decode', '解码', 'de', 'jiema', 'jm'] },
      { format: 'md5', description: 'MD5 加密', example: 'md5 hello world', keywords: ['md5', '加密', 'jiami', 'jm'] },
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
   * 获取编码解码帮助信息
   */
  public getEncodeHelp(): {
    title: string;
    description: string;
    formats: Array<{ format: string; description: string; example: string }>;
  } {
    return {
      title: '编码解码',
      description: '支持 URL、HTML、Base64 编码/解码和 MD5 加密',
      formats: [
        { format: 'url encode <文本>', description: 'URL 编码', example: 'url encode hello world' },
        { format: 'url decode <文本>', description: 'URL 解码', example: 'url decode hello%20world' },
        { format: 'html encode <文本>', description: 'HTML 编码', example: 'html encode <div>' },
        { format: 'html decode <文本>', description: 'HTML 解码', example: 'html decode &lt;div&gt;' },
        { format: 'base64 encode <文本>', description: 'Base64 编码', example: 'base64 encode hello' },
        { format: 'base64 decode <文本>', description: 'Base64 解码', example: 'base64 decode aGVsbG8=' },
        { format: 'md5 <文本>', description: 'MD5 加密', example: 'md5 hello world' },
      ],
    };
  }
}

export const encodeService = new EncodeService();

