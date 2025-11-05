/**
 * 翻译服务
 * 支持多语言翻译，设计时考虑可扩展性，支持后期切换到在线API
 */

import { translate as googleTranslate } from '@vitalets/google-translate-api';
import * as https from 'https';
import * as querystring from 'querystring';
import * as crypto from 'crypto';

// ========== 类型定义 ==========

export interface TranslateResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
  from?: string;  // 源语言
  to?: string;    // 目标语言
}

// 语言代码映射
const LANGUAGE_MAP: Record<string, string> = {
  // 中文
  'zh': 'zh-CN',
  'zh-cn': 'zh-CN',
  '中文': 'zh-CN',
  'chinese': 'zh-CN',
  'cn': 'zh-CN',
  // 英文
  'en': 'en',
  'en-us': 'en',
  '英文': 'en',
  'english': 'en',
  '英': 'en',
  // 可扩展的其他语言
  'ja': 'ja',
  '日语': 'ja',
  'japanese': 'ja',
  'ko': 'ko',
  '韩语': 'ko',
  'korean': 'ko',
  'fr': 'fr',
  '法语': 'fr',
  'french': 'fr',
  'de': 'de',
  '德语': 'de',
  'german': 'de',
  'es': 'es',
  '西班牙语': 'es',
  'spanish': 'es',
};

// ========== 翻译提供者接口（为后期扩展API设计）==========

/**
 * 翻译提供者接口
 * 后期可以创建不同的实现类：
 * - GoogleTranslateProvider（当前使用的本地库）
 * - GoogleTranslateAPIProvider（Google API）
 * - BaiduTranslateAPIProvider（百度API）
 * - DeepLAPIProvider（DeepL API）
 */
export interface ITranslateProvider {
  /**
   * 翻译文本
   * @param text 要翻译的文本
   * @param from 源语言代码（可选，自动检测）
   * @param to 目标语言代码
   */
  translate(text: string, from?: string, to?: string): Promise<{
    text: string;
    from: string;
    to: string;
  }>;
}

// 百度翻译语言代码映射
const BAIDU_LANG_MAP: Record<string, string> = {
  'zh-CN': 'zh',
  'zh': 'zh',
  'cn': 'zh',
  'en': 'en',
  'ja': 'jp',
  'ko': 'kor',
  'fr': 'fra',
  'de': 'de',
  'es': 'spa',
  'auto': 'auto',
};

/**
 * 百度翻译提供者（使用官方API）
 */
class BaiduTranslateProvider implements ITranslateProvider {
  private readonly appid: string = '20210901000932657';
  private readonly key: string = 'ww5HsXzP8SBNntiGUoLk';
  
  async translate(text: string, from?: string, to?: string): Promise<{
    text: string;
    from: string;
    to: string;
  }> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🌐 [BaiduTranslateProvider] 调用翻译API: text="${text}", from="${from || 'auto'}", to="${to || 'en'}"`);
        
        // 转换语言代码
        const fromLang = this.convertLangCode(from || 'auto');
        const toLang = this.convertLangCode(to || 'en');
        
        // 生成随机数（salt）
        const salt = Date.now().toString();
        
        // 生成签名: MD5(appid + query + salt + key)
        const signStr = this.appid + text + salt + this.key;
        const sign = crypto.createHash('md5').update(signStr).digest('hex');
        
        // 构建请求参数
        const params = {
          q: text,
          from: fromLang,
          to: toLang,
          appid: this.appid,
          salt: salt,
          sign: sign,
        };
        
        const queryString = querystring.stringify(params);
        const path = `/api/trans/vip/translate?${queryString}`;
        
        const options = {
          hostname: 'api.fanyi.baidu.com',
          path: path,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          timeout: 10000,
        };
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              console.log(`🌐 [BaiduTranslateProvider] API返回原始数据:`, data);
              const result = JSON.parse(data);
              
              // 检查错误
              if (result.error_code) {
                const errorMsg = this.getErrorMessage(result.error_code);
                throw new Error(errorMsg);
              }
              
              // 解析翻译结果
              if (result.trans_result && Array.isArray(result.trans_result)) {
                const translatedText = result.trans_result.map((item: any) => item.dst).join(' ');
                const detectedFrom = result.from || fromLang;
                
                const response = {
                  text: translatedText,
                  from: this.reverseLangCode(detectedFrom),
                  to: this.reverseLangCode(toLang),
                };
                
                console.log(`🌐 [BaiduTranslateProvider] 处理后的结果:`, response);
                resolve(response);
              } else {
                throw new Error(`翻译API返回格式错误: ${JSON.stringify(result)}`);
              }
            } catch (error: any) {
              console.error(`❌ [BaiduTranslateProvider] 解析响应错误:`, error);
              console.error(`❌ [BaiduTranslateProvider] 原始响应:`, data);
              reject(error);
            }
          });
        });
        
        req.on('error', (error) => {
          console.error(`❌ [BaiduTranslateProvider] 请求错误:`, error);
          reject(error);
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('翻译请求超时'));
        });
        
        req.end();
      } catch (error: any) {
        console.error(`❌ [BaiduTranslateProvider] 翻译API错误:`, error);
        reject(error);
      }
    });
  }
  
  /**
   * 转换语言代码为百度翻译格式
   */
  private convertLangCode(lang: string): string {
    const normalized = lang.toLowerCase().trim();
    const baiduLang = BAIDU_LANG_MAP[normalized];
    if (baiduLang) {
      return baiduLang;
    }
    // 如果不在映射表中，尝试直接使用（去掉-CN后缀等）
    if (normalized.startsWith('zh')) {
      return 'zh';
    }
    return normalized;
  }
  
  /**
   * 将百度返回的语言代码转回标准代码
   */
  private reverseLangCode(lang: string): string {
    const reverseMap: Record<string, string> = {
      'zh': 'zh-CN',
      'jp': 'ja',
      'kor': 'ko',
      'fra': 'fr',
      'spa': 'es',
    };
    return reverseMap[lang] || lang;
  }
  
  /**
   * 获取错误信息
   */
  private getErrorMessage(errorCode: string | number): string {
    const errorMap: Record<string, string> = {
      '52000': '成功',
      '52001': '请求超时，请重试',
      '52002': '系统错误，请重试',
      '52003': '未授权用户，请检查appid是否正确',
      '54000': '必填参数为空，请检查是否少传参数',
      '54001': '签名错误，请检查您的签名生成方法',
      '54003': '访问频率受限，请降低您的调用频率',
      '54004': '账户余额不足，请前往控制台为账户充值',
      '54005': '长query请求频繁，请降低长query的发送频率，3s后再试',
      '58000': '客户端IP非法，检查个人资料里填写的IP地址是否正确',
      '90107': '认证未通过或未生效，请前往我的认证查看认证进度',
    };
    
    const code = errorCode.toString();
    return errorMap[code] || `翻译API错误，错误代码: ${errorCode}`;
  }
}

/**
 * Google Translate 本地库提供者（备用方案）
 */
class GoogleTranslateProvider implements ITranslateProvider {
  async translate(text: string, from?: string, to?: string): Promise<{
    text: string;
    from: string;
    to: string;
  }> {
    try {
      console.log(`🌐 [GoogleTranslateProvider] 调用翻译API: text="${text}", from="${from || 'auto'}", to="${to || 'en'}"`);
      
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('翻译请求超时')), 10000); // 10秒超时
      });
      
      const translatePromise = googleTranslate(text, {
        from: from || 'auto',
        to: to || 'en',
      });
      
      const result = await Promise.race([translatePromise, timeoutPromise]) as any;
      console.log(`🌐 [GoogleTranslateProvider] API返回结果:`, result);
      
      // 检查结果格式
      if (!result || !result.text) {
        throw new Error('翻译API返回格式错误');
      }
      
      const response = {
        text: result.text,
        from: result.from?.language?.iso || result.from?.iso || from || 'auto',
        to: result.to || to || 'en',
      };
      console.log(`🌐 [GoogleTranslateProvider] 处理后的结果:`, response);
      return response;
    } catch (error: any) {
      console.error(`❌ [GoogleTranslateProvider] 翻译API错误:`, error);
      console.error(`❌ [GoogleTranslateProvider] 错误详情:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }
}

/**
 * 翻译服务类
 */
class TranslateService {
  private provider: ITranslateProvider;
  private fallbackProvider: ITranslateProvider;

  constructor(provider?: ITranslateProvider) {
    // 默认使用百度翻译（国内访问更快）
    // 允许注入自定义提供者，便于测试和扩展
    this.provider = provider || new BaiduTranslateProvider();
    this.fallbackProvider = new GoogleTranslateProvider();
  }

  /**
   * 设置翻译提供者（用于后期切换到API）
   */
  public setProvider(provider: ITranslateProvider): void {
    this.provider = provider;
  }

  /**
   * 处理翻译查询
   * 返回 TranslateResult 如果识别为翻译查询，否则返回 null
   */
  public async handleTranslateQuery(query: string): Promise<TranslateResult | null> {
    try {
      const trimmedQuery = query.trim();
      console.log(`🌐 [翻译服务] 处理查询: "${trimmedQuery}"`);

      // 解析翻译查询
      const parsed = this.parseTranslateQuery(trimmedQuery);
      console.log(`🌐 [翻译服务] 解析结果:`, parsed);
      if (!parsed) {
        console.log(`🌐 [翻译服务] 未识别为翻译查询`);
        return null;
      }

      const { text, from, to } = parsed;

      if (!text) {
        return {
          input: query,
          output: '',
          success: false,
          error: '请输入要翻译的文本',
        };
      }

      console.log(`🌐 [翻译服务] 准备翻译: text="${text}", from="${from || 'auto'}", to="${to || 'en'}"`);

      // 执行翻译（带降级策略）
      let result;
      try {
        result = await this.provider.translate(text, from, to);
        console.log(`🌐 [翻译服务] 翻译结果:`, result);
      } catch (error: any) {
        console.error(`❌ [翻译服务] 主翻译API调用失败，尝试备用方案:`, error.message);
        
        // 如果主提供者失败，尝试备用提供者
        if (this.provider !== this.fallbackProvider) {
          try {
            console.log(`🌐 [翻译服务] 使用备用翻译提供者`);
            result = await this.fallbackProvider.translate(text, from, to);
            console.log(`🌐 [翻译服务] 备用翻译结果:`, result);
          } catch (fallbackError: any) {
            console.error(`❌ [翻译服务] 备用翻译API也失败:`, fallbackError);
            throw fallbackError;
          }
        } else {
          throw error;
        }
      }

      // 格式化输出（只显示翻译结果）
      const output = result.text;

      console.log(`🌐 [翻译服务] 格式化输出: "${output}"`);

      return {
        input: query,
        output,
        success: true,
        from: result.from,
        to: result.to,
      };
    } catch (error: any) {
      console.error(`❌ [翻译服务] 翻译失败: ${error.message}`);
      return {
        input: query,
        output: '',
        success: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * 解析翻译查询
   */
  private parseTranslateQuery(query: string): {
    text: string;
    from?: string;
    to?: string;
  } | null {
    // 1. 快捷翻译：en <文本> 或 zh <文本>
    let pattern = /^(en|zh|cn)\s+(.+)$/i;
    let match = query.match(pattern);
    if (match) {
      const lang = match[1].toLowerCase();
      const text = match[2].trim();
      return {
        text,
        to: lang === 'cn' ? 'zh-CN' : lang === 'zh' ? 'zh-CN' : 'en',
      };
    }

    // 2. 基础翻译：translate <文本> 或 翻译 <文本> 或 fanyi <文本> 或 fy <文本>
    pattern = /^(?:translate|翻译|fanyi|fy)\s+(.+)$/i;
    match = query.match(pattern);
    if (match) {
      const text = match[1].trim();
      // 检查是否包含 "to" 或 "到"
      const toPattern = /(.+?)\s+(?:to|到)\s+(.+)$/i;
      const toMatch = text.match(toPattern);
      if (toMatch) {
        return {
          text: toMatch[1].trim(),
          to: this.normalizeLanguageCode(toMatch[2].trim()),
        };
      }
      return { text };
    }

    // 3. <文本> translate 或 <文本> 翻译 或 <文本> fanyi 或 <文本> fy
    pattern = /^(.+?)\s+(?:translate|翻译|fanyi|fy)$/i;
    match = query.match(pattern);
    if (match) {
      const text = match[1].trim();
      return { text };
    }

    // 4. translate <文本> to <语言> 或 翻译 <文本> 到 <语言> 或 fanyi <文本> to <语言> 或 fy <文本> to <语言>
    pattern = /^(?:translate|翻译|fanyi|fy)\s+(.+?)\s+(?:to|到)\s+(.+)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
        to: this.normalizeLanguageCode(match[2].trim()),
      };
    }

    // 5. <文本> to <语言> 或 <文本> 到 <语言>
    pattern = /^(.+?)\s+(?:to|到)\s+(.+)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
        to: this.normalizeLanguageCode(match[2].trim()),
      };
    }

    // 6. translate <文本> from <源语言> to <目标语言> 或 fanyi <文本> from <源语言> to <目标语言> 或 fy <文本> from <源语言> to <目标语言>
    pattern = /^(?:translate|翻译|fanyi|fy)\s+(.+?)\s+from\s+(.+?)\s+to\s+(.+)$/i;
    match = query.match(pattern);
    if (match) {
      return {
        text: match[1].trim(),
        from: this.normalizeLanguageCode(match[2].trim()),
        to: this.normalizeLanguageCode(match[3].trim()),
      };
    }

    return null;
  }

  /**
   * 标准化语言代码
   */
  private normalizeLanguageCode(lang: string): string {
    const normalized = lang.toLowerCase().trim();
    return LANGUAGE_MAP[normalized] || normalized;
  }


  /**
   * 获取错误消息
   */
  private getErrorMessage(error: any): string {
    const message = error.message || '翻译失败';
    
    if (message.includes('network') || message.includes('ECONNREFUSED')) {
      return '网络连接失败，请检查网络连接';
    }
    if (message.includes('timeout')) {
      return '翻译请求超时，请重试';
    }
    if (message.includes('rate limit') || message.includes('quota')) {
      return '翻译服务暂时不可用，请稍后重试';
    }
    
    return `翻译失败: ${message}`;
  }
}

// ========== 导出 ==========

export const translateService = new TranslateService();

