import { SearchResult } from '../../../ResultList';

/**
 * 构建功能补全结果
 */
export const buildFeatureCompletionResults = (
  featureType: string | null,
  featureHelp: any,
  featureCompletions: any[],
  shouldShowFeatureCompletion: boolean,
  combinedResults: SearchResult[]
): void => {
  if (!shouldShowFeatureCompletion || !featureType) {
    return;
  }

  // 显示功能帮助（如果有）
  if (featureHelp) {
    combinedResults.push({
      id: `feature-help-${featureType}`,
      type: 'command' as const,
      title: `📖 ${featureHelp.title}`,
      description: featureHelp.description,
      action: `feature:help:${featureType}`,
      score: 2600,
      priorityScore: 2600,
    });

    // 显示功能格式示例
    if (featureHelp.formats && featureHelp.formats.length > 0) {
      featureHelp.formats.slice(0, 3).forEach((format: any, index: number) => {
        combinedResults.push({
          id: `feature-format-${featureType}-${index}`,
          type: 'command' as const,
          title: format.format,
          description: `${format.description} - 示例: ${format.example}`,
          action: `feature:example:${featureType}:${format.example}`,
          score: 2500 - index,
          priorityScore: 2500 - index,
        });
      });
    }
  }

  // 显示功能补全建议（提高优先级，确保显示在最前面）
  const completionsToShow = featureCompletions;
  completionsToShow.forEach((suggestion: any, index: number) => {
    // 提取参数信息（如果有）
    const formatParts = suggestion.format.split(' ');
    const hasParams = formatParts.length > 2 || suggestion.format.includes('<');

    // 根据功能类型选择结果类型和图标
    const featureTypeMap: Record<string, 'encode' | 'string' | 'time' | 'command'> = {
      'encode': 'encode',
      'string': 'string',
      'time': 'time',
      'translate': 'command',
      'random': 'command',
      'varname': 'command',
      'todo': 'command',
    };
    const resultType = featureTypeMap[featureType] || 'command';

    // 根据功能类型选择图标（emoji，用于标题显示）
    const featureIcons: Record<string, string> = {
      'encode': '🔐',
      'translate': '🌐',
      'random': '🎲',
      'string': '📝',
      'varname': '🏷️',
      'time': '⏰',
      'todo': '📋',
    };
    const icon = featureIcons[featureType] || '💡';

    combinedResults.push({
      id: `feature-complete-${featureType}-${index}`,
      type: resultType as any,
      title: `${icon} ${suggestion.format}`,
      description: hasParams
        ? `${suggestion.description} | 示例: ${suggestion.example}`
        : suggestion.description,
      // 使用 format 而不是 example，这样选中后只填充命令格式，不填充示例内容
      action: `feature:complete:${featureType}:${suggestion.format}`,
      score: 2700 - index, // 提高优先级，确保显示在网页搜索之前
      priorityScore: 2700 - index,
      // 保存完整建议信息，用于Tab补全和参数提示
      suggestionData: suggestion,
    });
  });

  // 如果没有补全建议且没有帮助，显示提示
  if (completionsToShow.length === 0 && !featureHelp) {
    combinedResults.push({
      id: `feature-no-suggestion-${featureType}`,
      type: 'command' as const,
      title: '继续输入以使用此功能',
      description: `输入完整命令或查看帮助`,
      action: `feature:continue:${featureType}`,
      score: 2000,
      priorityScore: 2000,
    });
  }
};

