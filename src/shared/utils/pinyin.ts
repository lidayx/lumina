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
 */
function getCharPinyin(char: string): string {
  // 检查应用名称映射
  for (const [key, variations] of Object.entries(appNameMap)) {
    if (key.includes(char)) {
      return variations[0] || char;
    }
  }
  
  // 检查拼音映射
  for (const [key, variations] of Object.entries(pinyinMap)) {
    if (key.includes(char)) {
      return variations[0] || char;
    }
  }
  
  return char;
}

/**
 * 获取所有拼音变化
 */
export function getPinyinVariations(text: string): string[] {
  if (!text) return [];
  
  const variations = new Set<string>();
  
  // 添加原始文本
  variations.add(text.toLowerCase());
  
  // 添加英文和数字
  variations.add(text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase());
  
  // 检查应用名称映射
  for (const [key, values] of Object.entries(appNameMap)) {
    if (key.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(key.toLowerCase())) {
      values.forEach(v => variations.add(v.toLowerCase()));
    }
  }
  
  // 添加拼音首字母组合
  const initials = getPinyinInitial(text);
  if (initials) {
    variations.add(initials);
  }
  
  // 添加常见拼音组合
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
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const lowerQuery = query.toLowerCase().trim();
  const lowerTarget = target.toLowerCase().trim();
  
  if (!lowerQuery) return false;
  
  // 1. 完全匹配
  if (lowerTarget.includes(lowerQuery)) {
    return true;
  }
  
  // 2. 拼音匹配
  const targetPinyin = getPinyinVariations(target);
  for (const variant of targetPinyin) {
    if (variant.includes(lowerQuery)) {
      return true;
    }
  }
  
  // 3. 查询的拼音匹配
  const queryPinyin = getPinyinVariations(lowerQuery);
  for (const variant of queryPinyin) {
    if (lowerTarget.includes(variant)) {
      return true;
    }
  }
  
  // 4. 首字母匹配
  const targetInitials = getPinyinInitial(target);
  if (targetInitials.includes(lowerQuery)) {
    return true;
  }
  
  // 5. 单词首字母匹配（例如：WeChat -> wc）
  const words = lowerTarget.split(/[\s-]+/);
  const wordInitials = words.map(w => w[0] || '').join('');
  if (wordInitials.includes(lowerQuery)) {
    return true;
  }
  
  return false;
}

