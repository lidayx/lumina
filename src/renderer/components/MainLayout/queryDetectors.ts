import { SETTINGS_KEYWORDS, CLIPBOARD_KEYWORDS, FILE_SEARCH_PATTERN, COMMAND_MODE_PATTERN } from './constants';
import { isURL } from './utils';

/**
 * 查询类型检测结果
 */
export interface QueryTypeDetection {
  urlCheck: { isURL: boolean; url?: string };
  isSettingsQuery: boolean;
  isClipboardSearch: boolean;
  clipboardQuery: string;
  isFileSearch: boolean;
  fileSearchQuery: string;
  isCommandMode: boolean;
  commandQuery: string;
  isSimpleMath: boolean;
  isCalculation: boolean;
  finalIsCalculation: boolean;
}

/**
 * 检测查询类型
 */
export const detectQueryType = (query: string, actualQuery: string): QueryTypeDetection => {
  const queryTrimmed = actualQuery.trim();
  
  // 检测是否为 URL
  const urlCheck = isURL(queryTrimmed);
  
  // 检测是否为设置关键词
  const isSettingsQuery = SETTINGS_KEYWORDS.includes(queryTrimmed.toLowerCase());
  
  // 检测是否为剪贴板搜索
  const clipboardMatch = queryTrimmed.match(CLIPBOARD_KEYWORDS);
  const isClipboardSearch = clipboardMatch !== null;
  const clipboardQuery = clipboardMatch ? (clipboardMatch[1] || '') : '';
  
  // 检测是否为文件搜索
  const fileSearchMatch = query.trim().match(FILE_SEARCH_PATTERN);
  const isFileSearch = fileSearchMatch !== null;
  const fileSearchQuery = fileSearchMatch ? fileSearchMatch[1] : '';
  
  // 检测是否为命令模式
  const commandMatch = query.trim().match(COMMAND_MODE_PATTERN);
  const isCommandMode = commandMatch !== null;
  const commandQuery = commandMatch ? commandMatch[1] : '';
  
  // 检测简单的数学表达式
  const isSimpleMath = /^\d+\s*[\+\-*/]\s*\d+$/.test(queryTrimmed);
  
  // 检测是否为计算表达式
  const isCalculation = (
    // 简单数学表达式（优先）
    isSimpleMath ||
    // 包含运算符或特殊字符（不包括空格），且不是纯数字
    (/[\+\-*/().,π]/.test(queryTrimmed) && !/^[\d.,\s]+$/.test(queryTrimmed)) ||
    // 包含数学函数（使用单词边界，避免误匹配如 "weixin" 中的 "in"）
    /\b(sin|cos|tan|log|sqrt)\b/i.test(queryTrimmed) ||
    // 保留 to/到 的检测，但排除时间/翻译/变量名相关的 to
    (/\b(to|到|in|=>)\b/i.test(queryTrimmed) && 
     !/^(?:translate|翻译|fanyi|fy|en|zh|cn)\s+/i.test(queryTrimmed) &&
     !/^(?:varname|变量名|camel|snake|pascal)\s+/i.test(queryTrimmed) &&
     !/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(queryTrimmed) &&
     !/^(timestamp|ts)\s+\d{10,13}$/i.test(queryTrimmed) &&
     !/^\d{10,13}\s+(?:to|转)\s+date$/i.test(queryTrimmed) &&
     !/^.+?\s+(?:to|转)\s+timestamp$/i.test(queryTrimmed)) ||
    // 包含单位转换箭头符号
    /=>/.test(queryTrimmed) ||
    // 时间查询关键词（精确匹配单个词，避免误匹配应用名）
    /^(time|时间|date|日期|now|今天|今天日期|当前时间|现在几点)\s*$/i.test(queryTrimmed) ||
    // 纯日期时间字符串（如：2024-01-15 14:30:45）
    /^\d{4}[-\/]\d{2}[-\/]\d{2}(\s+\d{2}:\d{2}(:\d{2})?)?$/i.test(queryTrimmed) ||
    // ISO 日期时间格式
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/i.test(queryTrimmed) ||
    // 时间戳模式：timestamp 或 ts 开头加数字
    /^(timestamp|ts)\s+\d{10,13}$/i.test(queryTrimmed) ||
    // 时间戳转日期：数字 + to date
    /^\d{10,13}\s+(?:to|转)\s+date$/i.test(queryTrimmed) ||
    // 日期转时间戳：日期 + to timestamp
    /^.+?\s+(?:to|转)\s+timestamp$/i.test(queryTrimmed) ||
    // 翻译关键词检测
    /^(?:translate|翻译|fanyi|fy|en|zh|cn)\s+/i.test(queryTrimmed) ||
    /\s+(?:translate|翻译|fanyi|fy|to|到)$/i.test(queryTrimmed) ||
    /(?:translate|翻译|fanyi|fy)\s+.+\s+(?:to|到)\s+/i.test(queryTrimmed) ||
    // 变量名生成关键词检测
    /^(?:varname|变量名|camel|snake|pascal)\s+/i.test(queryTrimmed) ||
    /\s+(?:varname|变量名)$/i.test(queryTrimmed) ||
    // 时间计算：包含 - 或 + 且看起来像日期格式
    (/^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(queryTrimmed) && /[\+\-]/.test(queryTrimmed)) ||
    // 日期格式化：format 或格式化关键字
    /^(?:format|格式化)\s+.+?\s+.+?$/i.test(queryTrimmed) ||
    /^.+?\s+(?:format|格式化)\s+.+?$/i.test(queryTrimmed) ||
    // 时区转换：包含 to/in/到 和时区关键词（更宽松的匹配）
    /\s+(?:to|in|到)\s+(utc|gmt|cst|est|pst|jst|bst|cet|ist|kst|aest|china|中国|beijing|北京|japan|日本|tokyo|东京|eastern|pacific|london|europe|india|印度|korea|韩国|australia|悉尼|utc[+\-]\d+)/i.test(queryTrimmed) ||
    // 编码解码关键词检测
    /(?:url\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+url)/i.test(queryTrimmed) ||
    /(?:html\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+html)/i.test(queryTrimmed) ||
    /(?:base64\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+base64)/i.test(queryTrimmed) ||
    /^md5\s+/i.test(queryTrimmed) ||
    /\s+md5$/i.test(queryTrimmed) ||
    // 字符串工具关键词检测
    /(?:uppercase|lowercase|大写|小写|title\s+case|标题)/i.test(queryTrimmed) ||
    /(?:camel\s+case|snake\s+case)/i.test(queryTrimmed) ||
    /(?:reverse|反转)/i.test(queryTrimmed) ||
    /(?:trim|去除空格)/i.test(queryTrimmed) ||
    /(?:count|统计|word\s+count)/i.test(queryTrimmed) ||
    /^replace\s+/i.test(queryTrimmed) ||
    /^extract\s+/i.test(queryTrimmed) ||
    // 随机数生成关键词检测
    /^(?:uuid|generate\s+uuid)$/i.test(queryTrimmed) ||
    /^uuid\s+v[14]$/i.test(queryTrimmed) ||
    /^random\s+(string|password|number)/i.test(queryTrimmed) ||
    /^(string|password|number)\s+random/i.test(queryTrimmed) ||
    // 密码生成关键词检测（pwd/password/密码）
    /^(?:pwd|password|密码)(?:\s+\d+)?$/i.test(queryTrimmed)
  );
  
  // 如果检测到文件搜索或 URL，禁用计算器（文件搜索和 URL 优先）
  const finalIsCalculation = (isFileSearch || urlCheck.isURL) ? false : isCalculation;
  
  return {
    urlCheck,
    isSettingsQuery,
    isClipboardSearch,
    clipboardQuery,
    isFileSearch,
    fileSearchQuery,
    isCommandMode,
    commandQuery,
    isSimpleMath,
    isCalculation,
    finalIsCalculation,
  };
};

/**
 * 检测功能关键词（用于智能补全）
 */
export interface FeatureKeywordDetection {
  isTranslateKeyword: boolean;
  isRandomKeyword: boolean;
  isEncodeKeyword: boolean;
  isStringKeyword: boolean;
  isVarnameKeyword: boolean;
  isTimeKeyword: boolean;
  isTodoKeyword: boolean;
}

export const detectFeatureKeywords = (query: string): FeatureKeywordDetection => {
  const queryLower = query.toLowerCase().trim();
  
  const isTranslateKeyword = /^(?:translate|翻译|fanyi|fy|en|zh|cn)(\s|$)/i.test(queryLower) || 
                            /^(?:translate|翻译|fanyi|fy|en|zh|cn)\s+\w/i.test(queryLower);
  
  const isRandomKeyword = /^(?:pwd|password|密码|uuid|random)(\s|$)/i.test(queryLower) ||
                         /^(?:pwd|password|密码|uuid|random)\s+\w/i.test(queryLower);
  
  const isEncodeKeyword = /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)(\s|$)/i.test(queryLower) ||
                         /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)\s+\w/i.test(queryLower) ||
                         /^(?:bianma|jiema|jiami|jiemi|bm|jm)/i.test(queryLower);
  
  const isStringKeyword = /^(?:uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract)(\s|$)/i.test(queryLower) ||
                         /^(?:uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract)\s+\w/i.test(queryLower) ||
                         /^(?:upper|lower|tit|cam|sna|rev|tri|cou|rep|ext|大写|小写|反转|统计|替换|提取)/i.test(queryLower);
  
  const isVarnameKeyword = /^(?:varname|变量名|camel|snake|pascal)(\s|$)/i.test(queryLower) ||
                          /^(?:varname|变量名|camel|snake|pascal)\s+\w/i.test(queryLower);
  
  const isTimeKeyword = /^(?:time|时间|timestamp|date|日期)(\s|$)/i.test(queryLower) ||
                       /^(?:time|时间|timestamp|date|日期)\s+\w/i.test(queryLower);
  
  const isTodoKeyword = /^(?:todo|待办|任务)(\s|$)/i.test(queryLower) ||
                       /^(?:todo|待办|任务)\s+\w/i.test(queryLower) ||
                       /^(?:done|完成|delete|删除|edit|编辑|search|搜索)/i.test(queryLower);
  
  return {
    isTranslateKeyword,
    isRandomKeyword,
    isEncodeKeyword,
    isStringKeyword,
    isVarnameKeyword,
    isTimeKeyword,
    isTodoKeyword,
  };
};

