import React from 'react';

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 高亮文本中的匹配关键词
 * @param text 要高亮的文本
 * @param query 查询关键词
 * @returns React 节点，包含高亮标记
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  const escapedQuery = escapeRegex(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  let lastIndex = 0;
  let match;
  let matchIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // 添加高亮的匹配文本
    parts.push(
      <mark 
        key={`highlight-${matchIndex}`}
        className="bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded font-medium"
      >
        {match[0]}
      </mark>
    );
    
    lastIndex = regex.lastIndex;
    matchIndex++;
    
    // 防止无限循环（如果正则匹配空字符串）
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  // 添加剩余的文本
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // 如果没有匹配到任何内容，返回原文本
  return parts.length > 0 ? <>{parts}</> : text;
}

