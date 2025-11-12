/**
 * 简单的拼音转换工具
 * 将中文字符转换为拼音首字母
 */

// 常用汉字拼音首字母映射表（简化版）
const pinyinMap: Record<string, string[]> = {
  '微': ['w', 'wei'],
  '信': ['x', 'xin'],
  '网': ['w', 'wang'],
  '易': ['y', 'yi'],
  '酷': ['k', 'ku'],
  '狗': ['g', 'gou'],
  '音乐': ['y', 'yin', 'yue'],
  '视频': ['s', 'shi', 'pin'],
  '腾': ['t', 'teng'],
  '讯': ['x', 'xun'],
  'QQ': ['q'],
  '微信': ['w', 'wx', 'weixin', 'wechat'],
  '支付宝': ['z', 'zf', 'zfb', 'zhifubao'],
  '钉钉': ['d', 'dd', 'dingding'],
  '网易云': ['w', 'wy', 'wyy', 'wangyiyun'],
};

// 扩展映射，添加常见应用的拼音
const appNameMap: Record<string, string[]> = {
  'WeChat': ['wechat', 'weixin', 'wx', '微', '信', '微信'],
  '微信': ['wechat', 'weixin', 'wx', '微', '信', 'w'],
  'WeChat.app': ['wechat', 'weixin', 'wx', '微', '信', '微信'],
  'Chrome': ['chrome', 'google', 'ch', '浏览器'],
  'Chrome.app': ['chrome', 'google', 'ch', '浏览器'],
};

/**
 * 获取拼音首字母
 */
export function getPinyinInitial(text: string): string {
  if (!text) return '';
  
  let result = '';
  for (const char of text) {
    const pinyin = getCharPinyin(char);
    if (pinyin) {
      result += pinyin.toLowerCase();
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase();
    }
  }
  return result;
}

/**
 * 获取字符的拼音首字母
 * 优化：使用 Map 提高查找性能
 */
// 预构建查找映射，避免每次遍历对象
const appNameLookup = new Map<string, string>();
const pinyinLookup = new Map<string, string>();

// 初始化查找映射
for (const [key, variations] of Object.entries(appNameMap)) {
  for (const char of key) {
    if (!appNameLookup.has(char) && variations[0]) {
      appNameLookup.set(char, variations[0]);
    }
  }
}

for (const [key, variations] of Object.entries(pinyinMap)) {
  for (const char of key) {
    if (!pinyinLookup.has(char) && variations[0]) {
      pinyinLookup.set(char, variations[0]);
    }
  }
}

function getCharPinyin(char: string): string {
  // 优先检查应用名称映射
  const appPinyin = appNameLookup.get(char);
  if (appPinyin) {
    return appPinyin;
  }
  
  // 检查拼音映射
  const pinyin = pinyinLookup.get(char);
  if (pinyin) {
    return pinyin;
  }
  
  return char;
}

/**
 * 获取所有拼音变化
 * 优化：缓存字符串转换结果，减少重复计算
 * 
 * @param text 输入文本
 * @returns 所有可能的拼音变化（去重）
 */
export function getPinyinVariations(text: string): string[] {
  if (!text) return [];
  
  const variations = new Set<string>();
  const textLower = text.toLowerCase();
  
  // 添加原始文本（小写）
  variations.add(textLower);
  
  // 添加英文和数字（去除非字母数字字符）
  const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  if (alphanumeric) {
    variations.add(alphanumeric);
  }
  
  // 检查应用名称映射（优化：只检查一次 toLowerCase）
  for (const [key, values] of Object.entries(appNameMap)) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes(textLower) || textLower.includes(keyLower)) {
      values.forEach(v => variations.add(v.toLowerCase()));
    }
  }
  
  // 添加拼音首字母组合
  const initials = getPinyinInitial(text);
  if (initials) {
    variations.add(initials);
  }
  
  // 添加常见拼音组合（优化：使用 includes 检查，避免重复 toLowerCase）
  if (text.includes('微信')) {
    variations.add('wechat');
    variations.add('weixin');
    variations.add('wx');
  }
  if (text.includes('QQ')) {
    variations.add('qq');
  }
  if (text.includes('钉钉')) {
    variations.add('dingding');
    variations.add('dd');
  }
  if (text.includes('支付宝')) {
    variations.add('zhifubao');
    variations.add('zfb');
    variations.add('alipay');
  }
  
  return Array.from(variations);
}

/**
 * 高级搜索匹配 - 支持拼音、英文、中文
 * 优化：提前返回，减少不必要的计算
 * 
 * @param query 查询字符串
 * @param target 目标字符串
 * @returns 是否匹配
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return false;
  
  const lowerTarget = target.toLowerCase().trim();
  
  // 1. 完全匹配（最快，优先检查）
  if (lowerTarget.includes(lowerQuery)) {
    return true;
  }
  
  // 2. 首字母匹配（快速检查）
  const targetInitials = getPinyinInitial(target);
  if (targetInitials && targetInitials.includes(lowerQuery)) {
    return true;
  }
  
  // 3. 单词首字母匹配（例如：WeChat -> wc）
  const words = lowerTarget.split(/[\s-]+/);
  const wordInitials = words.map(w => w[0] || '').join('');
  if (wordInitials && wordInitials.includes(lowerQuery)) {
    return true;
  }
  
  // 4. 拼音匹配（计算成本较高，放在后面）
  const targetPinyin = getPinyinVariations(target);
  for (const variant of targetPinyin) {
    if (variant.includes(lowerQuery)) {
      return true;
    }
  }
  
  // 5. 查询的拼音匹配
  const queryPinyin = getPinyinVariations(lowerQuery);
  for (const variant of queryPinyin) {
    if (lowerTarget.includes(variant)) {
      return true;
    }
  }
  
  return false;
}


