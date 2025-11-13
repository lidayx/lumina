/**
 * 功能关键词检测
 */

export interface KeywordDetection {
  isTranslateKeyword: boolean;
  isRandomKeyword: boolean;
  isEncodeKeyword: boolean;
  isStringKeyword: boolean;
  isVarnameKeyword: boolean;
  isTimeKeyword: boolean;
  isTodoKeyword: boolean;
}

/**
 * 检测功能关键词
 */
export const detectKeywords = (query: string): KeywordDetection => {
  const queryLower = query.toLowerCase().trim();
  
  // 改进关键词检测：支持部分输入，如 "url e" 也能识别为编码关键词
  const isTranslateKeyword = /^(?:translate|翻译|fanyi|fy|en|zh|cn)(\s|$)/i.test(queryLower) || 
                            /^(?:translate|翻译|fanyi|fy|en|zh|cn)\s+\w/i.test(queryLower);
  const isRandomKeyword = /^(?:pwd|password|密码|uuid|random)(\s|$)/i.test(queryLower) ||
                         /^(?:pwd|password|密码|uuid|random)\s+\w/i.test(queryLower);
  // 编码关键词检测：支持拼音输入（bianma, jiema, jiami, jiemi）
  const isEncodeKeyword = /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)(\s|$)/i.test(queryLower) ||
                         /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)\s+\w/i.test(queryLower) ||
                         /^(?:bianma|jiema|jiami|jiemi|bm|jm)/i.test(queryLower);
  
  // 调试日志
  if (queryLower.startsWith('url') || queryLower.startsWith('html') || queryLower.startsWith('base64') || queryLower.startsWith('bianma') || queryLower.startsWith('jiema')) {
    console.log('🔍 [编码关键词检测]', { 
      queryLower, 
      isEncodeKeyword, 
      test1: /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)(\s|$)/i.test(queryLower), 
      test2: /^(?:url|html|base64|md5|encode|decode|编码|解码|bianma|jiema|jiami|jiemi|bm|jm)\s+\w/i.test(queryLower),
      test3: /^(?:bianma|jiema|jiami|jiemi|bm|jm)/i.test(queryLower)
    });
  }
  
  // 字符串工具关键词检测：支持部分匹配（如 "upper" 匹配 "uppercase"）
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

