/**
 * 时间服务
 * 支持时间查询、时间戳转换、时间计算、日期格式化、时区转换
 */

// ========== 类型定义 ==========

export interface TimeResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
}

// ========== 常量定义 ==========

// 时区映射表
const TIMEZONE_MAP: Record<string, number> = {
  'utc': 0, 'gmt': 0,
  'cst': 8, 'china': 8, '中国': 8, 'beijing': 8, '北京': 8,
  'est': -5, 'eastern': -5,
  'pst': -8, 'pacific': -8,
  'jst': 9, 'japan': 9, '日本': 9, 'tokyo': 9, '东京': 9,
  'bst': 1, 'london': 1,
  'cet': 1, 'europe': 1,
  'ist': 5.5, 'india': 5.5, '印度': 5.5,
  'kst': 9, 'korea': 9, '韩国': 9,
  'aest': 10, 'australia': 10, '悉尼': 10,
};

/**
 * 时间服务类
 */
class TimeService {
  // ========== 公共 API ==========

  /**
   * 处理时间查询
   * 返回 TimeResult 如果识别为时间查询，否则返回 null
   */
  public handleTimeQuery(query: string): TimeResult | null {
    try {
      const trimmedQuery = query.trim();
      
      // 1. 检测当前时间查询
      if (this.isTimeQuery(trimmedQuery)) {
        return this.getCurrentTimeResult();
      }
      
      // 2. 检测时间戳转日期
      const timestampResult = this.convertTimestamp(trimmedQuery);
      if (timestampResult) {
        return timestampResult;
      }
      
      // 3. 检测日期转时间戳
      const dateToTimestampResult = this.convertDateToTimestamp(trimmedQuery);
      if (dateToTimestampResult) {
        return dateToTimestampResult;
      }
      
      // 4. 检测纯日期时间字符串（如：2024-01-15 14:30:45）
      const pureDateResult = this.parsePureDateTime(trimmedQuery);
      if (pureDateResult) {
        return pureDateResult;
      }
      
      // 5. 检测时间计算
      const timeCalcResult = this.calculateTimeDifference(trimmedQuery);
      if (timeCalcResult) {
        return timeCalcResult;
      }
      
      // 6. 检测日期格式化
      const formatResult = this.formatDate(trimmedQuery);
      if (formatResult) {
        return formatResult;
      }
      
      // 7. 检测时区转换
      const timezoneResult = this.convertTimezone(trimmedQuery);
      if (timezoneResult) {
        return timezoneResult;
      }
      
      return null;
    } catch (error: any) {
      console.error(`❌ [时间服务] 处理失败: ${error.message}`);
      return {
        input: query,
        output: '',
        success: false,
        error: error.message || '时间处理错误',
      };
    }
  }

  // ========== 时间查询检测 ==========

  /**
   * 检测是否为时间查询
   */
  private isTimeQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const timeKeywords = [
      'time', '时间', '现在几点', '当前时间', 'now',
      'date', '日期', '今天', '今天日期',
    ];
    return timeKeywords.some(keyword => lowerQuery === keyword);
  }

  /**
   * 获取当前时间结果
   * 返回格式化的时间字符串（单行格式，用于单个选项显示）
   */
  private getCurrentTimeResult(): TimeResult {
    const now = new Date();
    const defaultFormat = this.formatDateTime(now, 'YYYY-MM-DD HH:mm:ss');
    
    return {
      input: 'time',
      output: defaultFormat,
      success: true,
    };
  }

  /**
   * 检测并解析纯日期时间字符串（如：2024-01-15 14:30:45）
   * 如果输入看起来像日期时间格式，返回该时间的格式化结果
   */
  private parsePureDateTime(query: string): TimeResult | null {
    // 检测常见的日期时间格式
    const dateTimePatterns = [
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // YYYY-MM-DD HH:mm
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
      // YYYY-MM-DD
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
      // ISO 格式
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
    ];

    for (const pattern of dateTimePatterns) {
      const match = query.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 月份从 0 开始
        const day = parseInt(match[3], 10);
        const hours = match[4] ? parseInt(match[4], 10) : 0;
        const minutes = match[5] ? parseInt(match[5], 10) : 0;
        const seconds = match[6] ? parseInt(match[6], 10) : 0;

        const date = new Date(year, month, day, hours, minutes, seconds);
        
        if (!isNaN(date.getTime())) {
          // 返回格式化的时间字符串（用于触发 getAllTimeFormats 调用）
          const formatted = this.formatDateTime(date, 'YYYY-MM-DD HH:mm:ss');
          return {
            input: query,
            output: formatted,
            success: true,
          };
        }
      }
    }

    // 如果正则匹配失败，尝试使用 Date 构造函数直接解析
    const tryDate = new Date(query);
    if (!isNaN(tryDate.getTime()) && query.length > 8) {
      // 确保不是纯数字（纯数字不应该被识别为日期）
      if (!/^\d+$/.test(query.trim())) {
        const formatted = this.formatDateTime(tryDate, 'YYYY-MM-DD HH:mm:ss');
        return {
          input: query,
          output: formatted,
          success: true,
        };
      }
    }

    return null;
  }

  /**
   * 获取所有时间格式结果（用于生成多个选项）
   * @param date 可选，指定要格式化的日期。如果不提供，使用当前时间
   */
  public getAllTimeFormats(date?: Date): Array<{ label: string; value: string }> {
    const targetDate = date || new Date();
    
    return [
      {
        label: '标准格式',
        value: this.formatDateTime(targetDate, 'YYYY-MM-DD HH:mm:ss'),
      },
      {
        label: '中文格式',
        value: this.formatDateTime(targetDate, 'YYYY年MM月DD日 HH:mm:ss'),
      },
      {
        label: 'ISO 格式',
        value: targetDate.toISOString(),
      },
      {
        label: '时间戳（秒）',
        value: String(Math.floor(targetDate.getTime() / 1000)),
      },
      {
        label: '时间戳（毫秒）',
        value: String(targetDate.getTime()),
      },
      {
        label: '日期格式',
        value: this.formatDateTime(targetDate, 'YYYY-MM-DD'),
      },
      {
        label: '时间格式',
        value: this.formatDateTime(targetDate, 'HH:mm:ss'),
      },
    ];
  }

  /**
   * 从时间戳字符串解析日期
   * @param timestampStr 时间戳字符串（秒级或毫秒级）
   */
  public parseTimestamp(timestampStr: string): Date | null {
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return null;
    }
    
    // 判断是秒级还是毫秒级
    const isSeconds = timestampStr.length === 10;
    const date = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  }

  /**
   * 从日期字符串解析日期
   * @param dateStr 日期字符串
   */
  public parseDateString(dateStr: string): Date | null {
    return this.parseDate(dateStr);
  }

  // ========== 时间戳转换 ==========

  /**
   * 转换时间戳为日期
   */
  private convertTimestamp(query: string): TimeResult | null {
    // 匹配: timestamp 1705312245 或 ts 1705312245
    const timestampPattern = /^(?:timestamp|ts)\s+(\d{10,13})$/i;
    let match = query.match(timestampPattern);
    
    if (!match) {
      // 匹配: 1705312245 to date 或 1705312245 转日期
      const toDatePattern = /^(\d{10,13})\s+(?:to|转)\s+date$/i;
      match = query.match(toDatePattern);
    }
    
    if (!match) {
      return null;
    }
    
    const timestampStr = match[1];
    const timestamp = parseInt(timestampStr, 10);
    
    // 判断是秒级还是毫秒级
    const isSeconds = timestampStr.length === 10;
    const date = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return {
        input: query,
        output: '',
        success: false,
        error: '无效的时间戳',
      };
    }
    
    const formatted = this.formatDateTime(date, 'YYYY-MM-DD HH:mm:ss');
    const chineseFormatted = this.formatDateTime(date, 'YYYY年MM月DD日 HH:mm:ss');
    const isoFormatted = date.toISOString();
    
    return {
      input: query,
      output: `${formatted}\n${chineseFormatted}\nISO: ${isoFormatted}`,
      success: true,
    };
  }

  /**
   * 转换日期为时间戳
   */
  private convertDateToTimestamp(query: string): TimeResult | null {
    // 匹配: <日期> to timestamp 或 <日期> 转时间戳
    const pattern = /^(.+?)\s+(?:to|转)\s+timestamp$/i;
    const match = query.match(pattern);
    
    if (!match) {
      return null;
    }
    
    const dateStr = match[1].trim();
    const date = this.parseDate(dateStr);
    
    if (!date || isNaN(date.getTime())) {
      return {
        input: query,
        output: '',
        success: false,
        error: '无法解析日期格式',
      };
    }
    
    const timestampSec = Math.floor(date.getTime() / 1000);
    const timestampMs = date.getTime();
    
    return {
      input: query,
      output: `时间戳(秒): ${timestampSec}\n时间戳(毫秒): ${timestampMs}`,
      success: true,
    };
  }

  // ========== 时间计算 ==========

  /**
   * 计算时间差
   */
  private calculateTimeDifference(query: string): TimeResult | null {
    // 首先检查是否是日期格式的时间差计算（避免误匹配数学表达式）
    // 匹配: <日期时间1> - <日期时间2>
    const dateTimeDiffPattern = /^(\d{4}[-\/]\d{2}[-\/]\d{2}(?:\s+\d{2}:\d{2}(:\d{2})?)?)\s*-\s*(\d{4}[-\/]\d{2}[-\/]\d{2}(?:\s+\d{2}:\d{2}(:\d{2})?)?)$/;
    let match = query.match(dateTimeDiffPattern);
    
    if (!match) {
      // 匹配: between <时间1> and <时间2>
      const betweenPattern = /^between\s+(.+?)\s+and\s+(.+?)$/i;
      match = query.match(betweenPattern);
    }
    
    if (match) {
      // 对于日期时间差模式，match[1] 是第一个日期，match[3] 是第二个日期
      // 对于 between 模式，match[1] 是第一个时间，match[2] 是第二个时间
      const time1Str = match[3] ? match[1].trim() : match[1].trim(); // 日期时间差模式或 between 模式
      const time2Str = match[3] ? match[3].trim() : match[2].trim(); // 日期时间差模式或 between 模式
      
      // 尝试解析日期时间
      let date1: Date | null = null;
      let date2: Date | null = null;
      
      // 解析第一个时间
      date1 = this.parseDate(time1Str);
      if (!date1 || isNaN(date1.getTime())) {
        // 尝试手动解析日期时间格式
        date1 = this.parseDateTimeString(time1Str);
      }
      
      // 解析第二个时间
      date2 = this.parseDate(time2Str);
      if (!date2 || isNaN(date2.getTime())) {
        // 尝试手动解析日期时间格式
        date2 = this.parseDateTimeString(time2Str);
      }
      
      if (!date1 || !date2 || isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        return {
          input: query,
          output: '',
          success: false,
          error: '无法解析时间格式',
        };
      }
      
      const diffMs = Math.abs(date1.getTime() - date2.getTime());
      const diffResult = this.formatTimeDifference(diffMs);
      
      return {
        input: query,
        output: diffResult,
        success: true,
      };
    }
    
    // 匹配时间加减: <时间> + <时长> 或 <时间> - <时长>
    // 注意：需要精确匹配，避免误匹配日期中的 - 符号
    // 匹配规则：日期时间格式 + 空格 + +或- + 空格 + 时长
    // 使用非捕获组避免影响捕获组索引
    const addPattern = /^(\d{4}[-\/]\d{2}[-\/]\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)\s*([+\-])\s*(.+)$/;
    match = query.match(addPattern);
    
    if (match) {
      const baseTimeStr = match[1].trim();
      const operator = match[2];
      const durationStr = match[3].trim();
      
      // 尝试解析基准时间
      let baseDate = this.parseDate(baseTimeStr);
      if (!baseDate || isNaN(baseDate.getTime())) {
        // 尝试使用 parseDateTimeString 解析
        baseDate = this.parseDateTimeString(baseTimeStr);
      }
      
      if (!baseDate || isNaN(baseDate.getTime())) {
        return {
          input: query,
          output: '',
          success: false,
          error: '无法解析基准时间',
        };
      }
      
      const durationMs = this.parseDuration(durationStr);
      if (durationMs === null) {
        return {
          input: query,
          output: '',
          success: false,
          error: '无法解析时长格式',
        };
      }
      
      const resultMs = operator === '+' 
        ? baseDate.getTime() + durationMs 
        : baseDate.getTime() - durationMs;
      
      const resultDate = new Date(resultMs);
      const formatted = this.formatDateTime(resultDate, 'YYYY-MM-DD HH:mm:ss');
      
      return {
        input: query,
        output: formatted,
        success: true,
      };
    }
    
    return null;
  }

  // ========== 日期格式化 ==========

  /**
   * 格式化日期
   */
  private formatDate(query: string): TimeResult | null {
    // 匹配: format <日期> <格式> 或 <日期> format <格式>
    let pattern = /^(?:format|格式化)\s+(.+?)\s+(.+?)$/i;
    let match = query.match(pattern);
    
    if (!match) {
      pattern = /^(.+?)\s+(?:format|格式化)\s+(.+?)$/i;
      match = query.match(pattern);
    }
    
    if (!match) {
      return null;
    }
    
    const dateStr = match[1].trim();
    const format = match[2].trim();
    
    // 尝试解析日期
    let date = this.parseDate(dateStr);
    if (!date || isNaN(date.getTime())) {
      // 尝试使用 parseDateTimeString 解析
      date = this.parseDateTimeString(dateStr);
    }
    
    if (!date || isNaN(date.getTime())) {
      return {
        input: query,
        output: '',
        success: false,
        error: '无法解析日期格式',
      };
    }
    
    const formatted = this.formatDateTime(date, format);
    
    return {
      input: query,
      output: formatted,
      success: true,
    };
  }

  // ========== 时区转换 ==========

  /**
   * 转换时区
   */
  private convertTimezone(query: string): TimeResult | null {
    // 首先匹配: <时间> <时区1> to <时区2>（三个部分）
    const pattern2 = /^(.+?)\s+(.+?)\s+(?:to|到)\s+(.+?)$/i;
    const match2 = query.match(pattern2);
    
    if (match2) {
      const timeStr = match2[1].trim();
      const fromZone = match2[2].trim();
      const toZone = match2[3].trim();
      
      // 检查 fromZone 是否是时区
      if (this.parseTimezone(fromZone) !== null || /^utc[+\-]\d+$/i.test(fromZone)) {
        return this.convertTimezoneHelper(timeStr, fromZone, toZone);
      }
    }
    
    // 匹配: <时间> to <时区> 或 <时间> in <时区>
    const pattern = /^(.+?)\s+(?:to|in|到)\s+(.+?)$/i;
    const match = query.match(pattern);
    
    if (!match) {
      return null;
    }
    
    const timeStr = match[1].trim();
    const targetZone = match[2].trim();
    
    // 检查目标时区是否有效
    if (!this.parseTimezone(targetZone) && !/^utc[+\-]\d+$/i.test(targetZone)) {
      return null;
    }
    
    // 如果时间字符串包含时区信息，提取它
    const timeWithZonePattern = /^(.+?)\s+(.+?)$/;
    const timeMatch = timeStr.match(timeWithZonePattern);
    
    if (timeMatch && this.parseTimezone(timeMatch[2]) !== null) {
      // 格式: <时间> <时区1> to <时区2>
      return this.convertTimezoneHelper(timeMatch[1], timeMatch[2], targetZone);
    }
    
    // 默认从本地时间转换到目标时区
    return this.convertTimezoneHelper(timeStr, null, targetZone);
  }

  /**
   * 时区转换辅助方法
   */
  private convertTimezoneHelper(
    timeStr: string, 
    fromZone: string | null, 
    toZone: string
  ): TimeResult | null {
    let date: Date;
    
    if (fromZone) {
      // 从指定时区解析时间
      const fromOffset = this.parseTimezone(fromZone);
      if (fromOffset === null) {
        return {
          input: timeStr,
          output: '',
          success: false,
          error: `无法识别源时区: ${fromZone}`,
        };
      }
      
      let parsedDate = this.parseDate(timeStr);
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        // 尝试使用 parseDateTimeString 解析
        parsedDate = this.parseDateTimeString(timeStr);
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        return {
          input: timeStr,
          output: '',
          success: false,
          error: '无法解析时间格式',
        };
      }
      
      // 将本地时间转换为 UTC，然后加上源时区偏移
      const utcTime = parsedDate.getTime() - (parsedDate.getTimezoneOffset() * 60000);
      date = new Date(utcTime - (fromOffset * 3600000));
    } else {
      // 从本地时间解析
      date = this.parseDate(timeStr);
      if (!date || isNaN(date.getTime())) {
        // 尝试使用 parseDateTimeString 解析
        date = this.parseDateTimeString(timeStr);
      }
      
      if (!date || isNaN(date.getTime())) {
        return {
          input: timeStr,
          output: '',
          success: false,
          error: '无法解析时间格式',
        };
      }
    }
    
    const toOffset = this.parseTimezone(toZone);
    if (toOffset === null) {
      // 尝试解析 UTC 偏移量格式，如 UTC+8
      const utcPattern = /^utc([+\-]\d+)$/i;
      const utcMatch = toZone.match(utcPattern);
      if (utcMatch) {
        const offset = parseInt(utcMatch[1], 10);
        const utcTime = date.getTime() - (date.getTimezoneOffset() * 60000);
        const targetTime = new Date(utcTime + (offset * 3600000));
        const formatted = this.formatDateTime(targetTime, 'YYYY-MM-DD HH:mm:ss');
        
        return {
          input: timeStr,
          output: `${formatted} (UTC${offset >= 0 ? '+' : ''}${offset})`,
          success: true,
        };
      }
      
      return {
        input: timeStr,
        output: '',
        success: false,
        error: `无法识别目标时区: ${toZone}`,
      };
    }
    
    // 转换时区
    const utcTime = date.getTime() - (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (toOffset * 3600000));
    const formatted = this.formatDateTime(targetTime, 'YYYY-MM-DD HH:mm:ss');
    
    return {
      input: timeStr,
      output: `${formatted} (${toZone.toUpperCase()})`,
      success: true,
    };
  }

  // ========== 辅助方法 ==========

  /**
   * 解析日期时间字符串（支持 YYYY-MM-DD HH:mm:ss 格式）
   */
  private parseDateTimeString(dateStr: string): Date | null {
    // 匹配 YYYY-MM-DD HH:mm:ss 或 YYYY-MM-DD HH:mm 或 YYYY-MM-DD
    const dateTimePatterns = [
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
      // YYYY-MM-DD HH:mm
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
      // YYYY-MM-DD
      /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
    ];
    
    for (const pattern of dateTimePatterns) {
      const match = dateStr.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 月份从 0 开始
        const day = parseInt(match[3], 10);
        const hours = match[4] ? parseInt(match[4], 10) : 0;
        const minutes = match[5] ? parseInt(match[5], 10) : 0;
        const seconds = match[6] ? parseInt(match[6], 10) : 0;
        
        const date = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    return null;
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateStr: string): Date | null {
    // 尝试多种日期格式
    const formats = [
      // ISO 格式
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/,
      // 标准格式: YYYY-MM-DD HH:mm:ss
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
      // 标准格式: YYYY-MM-DD HH:mm
      /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/,
      // 标准格式: YYYY-MM-DD
      /^\d{4}-\d{2}-\d{2}$/,
      // 斜杠格式: YYYY/MM/DD HH:mm:ss
      /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/,
      // 斜杠格式: YYYY/MM/DD
      /^\d{4}\/\d{2}\/\d{2}$/,
    ];
    
    // 先尝试直接解析
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // 尝试标准化格式
    const normalized = dateStr.replace(/\//g, '-').trim();
    date = new Date(normalized);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    return null;
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date, format: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    let result = format;
    result = result.replace(/YYYY/g, String(year));
    result = result.replace(/MM/g, month);
    result = result.replace(/DD/g, day);
    result = result.replace(/HH/g, hours);
    result = result.replace(/mm/g, minutes);
    result = result.replace(/ss/g, seconds);
    
    // 特殊格式处理
    if (format.toLowerCase() === 'iso') {
      return date.toISOString();
    }
    if (format.toLowerCase() === 'timestamp') {
      return String(Math.floor(date.getTime() / 1000));
    }
    
    return result;
  }

  /**
   * 解析时区
   */
  private parseTimezone(zone: string): number | null {
    const lowerZone = zone.toLowerCase();
    if (lowerZone in TIMEZONE_MAP) {
      return TIMEZONE_MAP[lowerZone];
    }
    
    // 尝试解析 UTC+8 格式
    const utcPattern = /^utc([+\-]\d+)$/i;
    const match = zone.match(utcPattern);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    return null;
  }

  /**
   * 解析时长字符串
   */
  private parseDuration(durationStr: string): number | null {
    const lowerDuration = durationStr.toLowerCase();
    
    // 匹配: 1d 2h 30m 或 1天 2小时 30分钟
    const patterns = [
      // 英文格式: 1 day 2 hours 30 minutes
      { regex: /(\d+)\s*(?:day|days|d)\s*/gi, multiplier: 86400000 },
      { regex: /(\d+)\s*(?:hour|hours|h)\s*/gi, multiplier: 3600000 },
      { regex: /(\d+)\s*(?:minute|minutes|min|m)\s*/gi, multiplier: 60000 },
      { regex: /(\d+)\s*(?:second|seconds|sec|s)\s*/gi, multiplier: 1000 },
      // 中文格式: 1天 2小时 30分钟
      { regex: /(\d+)\s*天\s*/g, multiplier: 86400000 },
      { regex: /(\d+)\s*小时\s*/g, multiplier: 3600000 },
      { regex: /(\d+)\s*分钟\s*/g, multiplier: 60000 },
      { regex: /(\d+)\s*秒\s*/g, multiplier: 1000 },
    ];
    
    let totalMs = 0;
    let matched = false;
    
    for (const pattern of patterns) {
      const matches = [...lowerDuration.matchAll(pattern.regex)];
      for (const match of matches) {
        const value = parseInt(match[1], 10);
        totalMs += value * pattern.multiplier;
        matched = true;
      }
    }
    
    if (!matched) {
      // 尝试纯数字（默认作为分钟）
      const numberMatch = durationStr.match(/^(\d+)$/);
      if (numberMatch) {
        return parseInt(numberMatch[1], 10) * 60000; // 默认作为分钟
      }
      return null;
    }
    
    return totalMs;
  }

  /**
   * 格式化时间差
   */
  private formatTimeDifference(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (remainingHours > 0) parts.push(`${remainingHours}小时`);
    if (remainingMinutes > 0) parts.push(`${remainingMinutes}分钟`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}秒`);
    
    const totalMs = ms % 1000;
    if (totalMs > 0 && days === 0 && remainingHours === 0 && remainingMinutes === 0) {
      parts.push(`${totalMs}毫秒`);
    }
    
    return parts.join(' ') + `\n总计: ${ms}毫秒`;
  }
}

export const timeService = new TimeService();
export default timeService;

