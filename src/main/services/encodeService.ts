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
    // 匹配: url encode <字符串> 或 url编码 <字符串>
    let pattern = /^(?:url\s+encode|url编码)\s+(.+)$/i;
    let match = query.match(pattern);
    let isEncode = true;

    if (!match) {
      // 匹配: <字符串> url encode 或 <字符串> url编码
      pattern = /^(.+?)\s+(?:url\s+encode|url编码)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: url decode <字符串> 或 url解码 <字符串>
      pattern = /^(?:url\s+decode|url解码)\s+(.+)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      // 匹配: <字符串> url decode 或 <字符串> url解码
      pattern = /^(.+?)\s+(?:url\s+decode|url解码)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

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
    // 匹配: html encode <字符串> 或 html编码 <字符串>
    let pattern = /^(?:html\s+encode|html编码)\s+(.+)$/i;
    let match = query.match(pattern);
    let isEncode = true;

    if (!match) {
      // 匹配: <字符串> html encode 或 <字符串> html编码
      pattern = /^(.+?)\s+(?:html\s+encode|html编码)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: html decode <字符串> 或 html解码 <字符串>
      pattern = /^(?:html\s+decode|html解码)\s+(.+)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      // 匹配: <字符串> html decode 或 <字符串> html解码
      pattern = /^(.+?)\s+(?:html\s+decode|html解码)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

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
    // 匹配: base64 encode <字符串> 或 base64编码 <字符串>
    let pattern = /^(?:base64\s+encode|base64编码)\s+(.+)$/i;
    let match = query.match(pattern);
    let isEncode = true;

    if (!match) {
      // 匹配: <字符串> base64 encode 或 <字符串> base64编码
      pattern = /^(.+?)\s+(?:base64\s+encode|base64编码)$/i;
      match = query.match(pattern);
    }

    if (!match) {
      // 匹配: base64 decode <字符串> 或 base64解码 <字符串>
      pattern = /^(?:base64\s+decode|base64解码)\s+(.+)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      // 匹配: <字符串> base64 decode 或 <字符串> base64解码
      pattern = /^(.+?)\s+(?:base64\s+decode|base64解码)$/i;
      match = query.match(pattern);
      isEncode = false;
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

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
    // 匹配: md5 <字符串>
    let pattern = /^md5\s+(.+)$/i;
    let match = query.match(pattern);

    if (!match) {
      // 匹配: <字符串> md5
      pattern = /^(.+?)\s+md5$/i;
      match = query.match(pattern);
    }

    if (!match) {
      return null;
    }

    const text = match[1].trim();

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
}

export const encodeService = new EncodeService();

