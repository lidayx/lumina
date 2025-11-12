/**
 * 智能匹配工具
 * 提供模糊匹配、编辑距离、拼音匹配等功能
 */

/**
 * 计算两个字符串的编辑距离（Levenshtein Distance）
 * 使用空间优化版本，只保留两行数据而不是整个矩阵
 * 编辑距离越小，相似度越高
 * 
 * @param str1 第一个字符串
 * @param str2 第二个字符串
 * @returns 编辑距离
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // 快速路径：如果其中一个字符串为空
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  // 空间优化：只使用两行数据
  let prevRow: number[] = Array(len2 + 1).fill(0).map((_, i) => i);
  let currRow: number[] = new Array(len2 + 1);
  
  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        currRow[j] = prevRow[j - 1];
      } else {
        currRow[j] = Math.min(
          prevRow[j] + 1,      // 删除
          currRow[j - 1] + 1,  // 插入
          prevRow[j - 1] + 1   // 替换
        );
      }
    }
    
    // 交换行
    [prevRow, currRow] = [currRow, prevRow];
  }
  
  return prevRow[len2];
}

/**
 * 计算相似度分数（0-1，1表示完全匹配）
 */
export function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * 模糊匹配：检查 query 是否模糊匹配 target
 * @param query 查询字符串
 * @param target 目标字符串
 * @param threshold 相似度阈值（0-1），默认 0.6
 */
export function fuzzyMatch(query: string, target: string, threshold: number = 0.6): boolean {
  const sim = similarity(query.toLowerCase(), target.toLowerCase());
  return sim >= threshold;
}

/**
 * 检查 query 是否按顺序包含 target 的所有字符（允许中间插入其他字符）
 * 例如："url en" 匹配 "url encode"（e, n 按顺序出现）
 */
export function containsInOrder(query: string, target: string): boolean {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  let queryIndex = 0;
  for (let i = 0; i < targetLower.length; i++) {
    const char = targetLower[i];
    // 跳过空格
    if (char === ' ') continue;
    
    // 在 query 中查找当前字符
    const foundIndex = queryLower.indexOf(char, queryIndex);
    if (foundIndex === -1) {
      return false;
    }
    queryIndex = foundIndex + 1;
  }
  
  return true;
}

/**
 * 拼音映射表（常用中文词汇的拼音）
 */
const PINYIN_MAP: Record<string, string[]> = {
  '编码': ['bianma', 'bm', 'bian', 'ma'],
  '解码': ['jiema', 'jm', 'jie', 'ma'],
  '加密': ['jiami', 'jm', 'jia', 'mi'],
  '解密': ['jiemi', 'jm', 'jie', 'mi'],
  '翻译': ['fanyi', 'fy', 'fan', 'yi'],
  '时间': ['shijian', 'sj', 'shi', 'jian'],
  '日期': ['riqi', 'rq', 'ri', 'qi'],
  '时间戳': ['shijianchuo', 'sjc', 'shi', 'jian', 'chuo'],
  '变量名': ['bianliangming', 'blm', 'bian', 'liang', 'ming'],
  '大写': ['daxie', 'dx', 'da', 'xie'],
  '小写': ['xiaoxie', 'xx', 'xiao', 'xie'],
  '驼峰': ['tuofeng', 'tf', 'tuo', 'feng'],
  '蛇形': ['shexing', 'sx', 'she', 'xing'],
  '帕斯卡': ['pasika', 'psk', 'pa', 'si', 'ka'],
  '反转': ['fanzhuan', 'fz', 'fan', 'zhuan'],
  '统计': ['tongji', 'tj', 'tong', 'ji'],
  '替换': ['tihuan', 'th', 'ti', 'huan'],
  '提取': ['tiqu', 'tq', 'ti', 'qu'],
  '去除': ['quchu', 'qc', 'qu', 'chu'],
};

// 反向映射：从拼音到中文
const PINYIN_TO_CHINESE: Record<string, string[]> = {};
for (const [chinese, pinyins] of Object.entries(PINYIN_MAP)) {
  for (const pinyin of pinyins) {
    if (!PINYIN_TO_CHINESE[pinyin]) {
      PINYIN_TO_CHINESE[pinyin] = [];
    }
    PINYIN_TO_CHINESE[pinyin].push(chinese);
  }
}

/**
 * 中文转拼音（简化版，仅支持常用词汇）
 * 使用 Set 去重，提高性能
 * 
 * @param chinese 中文字符串
 * @returns 拼音数组（去重）
 */
export function chineseToPinyin(chinese: string): string[] {
  const results = new Set<string>();
  
  // 直接查找映射表
  const directMatch = PINYIN_MAP[chinese];
  if (directMatch) {
    directMatch.forEach(pinyin => results.add(pinyin));
  }
  
  // 尝试部分匹配（只检查包含关系，避免重复添加）
  for (const [key, pinyins] of Object.entries(PINYIN_MAP)) {
    if (key !== chinese && chinese.includes(key)) {
      pinyins.forEach(pinyin => results.add(pinyin));
    }
  }
  
  return Array.from(results);
}

/**
 * 检查拼音匹配
 * 优化：缓存字符串转换结果，减少重复计算
 * 
 * @param query 查询字符串（可能是拼音）
 * @param target 目标字符串（中文或英文）
 * @returns 是否匹配
 */
export function pinyinMatch(query: string, target: string): boolean {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return false;
  
  const hasChinese = /[\u4e00-\u9fa5]/.test(target);
  
  // 如果 target 是中文，检查 query 是否匹配其拼音
  if (hasChinese) {
    const pinyins = chineseToPinyin(target);
    for (const pinyin of pinyins) {
      if (pinyin === queryLower || pinyin.includes(queryLower) || queryLower.includes(pinyin)) {
        return true;
      }
    }
  }
  
  // 反向检查：如果 query 是拼音，检查是否匹配 target 的中文
  const chineseWords = PINYIN_TO_CHINESE[queryLower];
  if (chineseWords) {
    for (const chinese of chineseWords) {
      if (target.includes(chinese)) {
        return true;
      }
    }
  }
  
  // 部分拼音匹配：检查 query 是否是 target 中某个中文字的拼音
  if (hasChinese) {
    const chineseChars = target.match(/[\u4e00-\u9fa5]/g);
    if (chineseChars) {
      for (const char of chineseChars) {
        const charPinyins = chineseToPinyin(char);
        for (const pinyin of charPinyins) {
          if (pinyin === queryLower || pinyin.includes(queryLower) || queryLower.includes(pinyin)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * 同义词映射表
 */
const SYNONYM_MAP: Record<string, string[]> = {
  'encode': ['编码', '加密', '转换'],
  '编码': ['encode', '加密', '转换'],
  'decode': ['解码', '解密', '还原'],
  '解码': ['decode', '解密', '还原'],
  'encrypt': ['加密', '编码'],
  '加密': ['encrypt', 'encode', '编码'],
  'decrypt': ['解密', '解码'],
  '解密': ['decrypt', 'decode', '解码'],
  'translate': ['翻译', '转换'],
  '翻译': ['translate', '转换'],
  'time': ['时间', '日期'],
  '时间': ['time', '日期'],
  'date': ['日期', '时间'],
  '日期': ['date', '时间'],
  'uppercase': ['大写', 'upper'],
  '大写': ['uppercase', 'upper'],
  'lowercase': ['小写', 'lower'],
  '小写': ['lowercase', 'lower'],
  'camel': ['驼峰', 'camelCase'],
  '驼峰': ['camel', 'camelCase'],
  'snake': ['蛇形', 'snake_case'],
  '蛇形': ['snake', 'snake_case'],
  'pascal': ['帕斯卡', 'PascalCase'],
  '帕斯卡': ['pascal', 'PascalCase'],
};

/**
 * 获取同义词列表
 */
export function getSynonyms(term: string): string[] {
  const termLower = term.toLowerCase();
  return SYNONYM_MAP[termLower] || SYNONYM_MAP[term] || [];
}

/**
 * 检查同义词匹配
 * @param query 查询字符串
 * @param target 目标字符串
 */
export function synonymMatch(query: string, target: string): boolean {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // 直接匹配
  if (queryLower === targetLower) {
    return true;
  }
  
  // 检查 query 是否是 target 的同义词
  const targetSynonyms = getSynonyms(target);
  if (targetSynonyms.some(syn => syn.toLowerCase() === queryLower)) {
    return true;
  }
  
  // 检查 target 是否是 query 的同义词
  const querySynonyms = getSynonyms(query);
  if (querySynonyms.some(syn => syn.toLowerCase() === targetLower)) {
    return true;
  }
  
  // 检查部分匹配
  for (const synonym of targetSynonyms) {
    if (queryLower.includes(synonym.toLowerCase()) || synonym.toLowerCase().includes(queryLower)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 综合匹配评分
 * 结合多种匹配算法，返回综合评分（0-1000）
 */
export interface MatchScore {
  score: number;
  reasons: string[];
}

/**
 * 综合匹配评分
 * 结合多种匹配算法，返回综合评分（0-1000）
 * 优化：提前返回完全匹配，减少不必要的计算
 * 
 * @param query 查询字符串
 * @param target 目标字符串
 * @param keywords 可选的关键词列表
 * @returns 匹配分数和原因
 */
export function calculateMatchScore(
  query: string,
  target: string,
  keywords?: string[]
): MatchScore {
  const queryLower = query.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  const reasons: string[] = [];
  let score = 0;
  
  // 1. 完全匹配（最高优先级，提前返回）
  if (queryLower === targetLower) {
    return { score: 1000, reasons: ['完全匹配'] };
  }
  
  // 2. 开头匹配（高优先级）
  if (targetLower.startsWith(queryLower)) {
    score = 500;
    reasons.push('开头匹配');
  }
  
  // 3. 包含匹配（基础匹配）
  if (targetLower.includes(queryLower)) {
    score = Math.max(score, 200);
    reasons.push('包含匹配');
  }
  
  // 4. 按顺序包含字符（部分匹配）
  if (containsInOrder(queryLower, targetLower)) {
    score = Math.max(score, 300);
    reasons.push('顺序匹配');
  }
  
  // 5. 模糊匹配（编辑距离，计算成本较高，放在后面）
  const sim = similarity(queryLower, targetLower);
  if (sim >= 0.8) {
    score = Math.max(score, 400);
    reasons.push('高相似度匹配');
  } else if (sim >= 0.6) {
    score = Math.max(score, 250);
    reasons.push('中等相似度匹配');
  } else if (sim >= 0.4) {
    score = Math.max(score, 150);
    reasons.push('低相似度匹配');
  }
  
  // 6. 拼音匹配（中文场景）
  if (pinyinMatch(queryLower, targetLower)) {
    score = Math.max(score, 350);
    reasons.push('拼音匹配');
  }
  
  // 7. 同义词匹配
  if (synonymMatch(queryLower, targetLower)) {
    score = Math.max(score, 300);
    reasons.push('同义词匹配');
  }
  
  // 8. 关键词匹配（可选）
  if (keywords && keywords.length > 0 && queryLower.length > 0) {
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    const matchedKeywords = queryWords.filter(word => 
      keywords.some(kw => {
        const kwLower = kw.toLowerCase();
        return kwLower.includes(word) || word.includes(kwLower) ||
               pinyinMatch(word, kw) || synonymMatch(word, kw);
      })
    );
    if (matchedKeywords.length > 0) {
      score = Math.max(score, 200 + matchedKeywords.length * 50);
      reasons.push(`关键词匹配(${matchedKeywords.length})`);
    }
  }
  
  return { score, reasons };
}

