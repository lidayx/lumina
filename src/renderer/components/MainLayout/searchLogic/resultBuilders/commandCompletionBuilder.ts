import { SearchResult } from '../../../ResultList';

/**
 * 构建命令补全结果
 */
export const buildCommandCompletionResults = (
  commandHelp: any,
  commandCompletions: any[],
  commandQuery: string | undefined,
  combinedResults: SearchResult[]
): void => {
  // 显示命令帮助（如果有）
  if (commandHelp && commandHelp.command) {
    combinedResults.push({
      id: `command-help-${commandHelp.command.id}`,
      type: 'command' as const,
      title: `📖 ${commandHelp.command.name}`,
      description: commandHelp.help,
      action: `command:help:${commandHelp.command.id}`,
      score: 2500,
      priorityScore: 2500,
    });

    // 显示命令示例
    if (commandHelp.examples && commandHelp.examples.length > 0) {
      commandHelp.examples.forEach((example: string, index: number) => {
        combinedResults.push({
          id: `command-example-${commandHelp.command.id}-${index}`,
          type: 'command' as const,
          title: example,
          description: `执行: ${commandHelp.command.description}`,
          action: `command:execute:${commandHelp.command.id}`,
          score: 2400 - index,
          priorityScore: 2400 - index,
        });
      });
    }
  }

  // 显示命令补全列表
  commandCompletions.forEach((cmd: any, index: number) => {
    // 如果已经显示了帮助，跳过第一个（因为帮助已经显示了）
    if (commandHelp && commandHelp.command && cmd.id === commandHelp.command.id) {
      return;
    }

    combinedResults.push({
      id: `command-complete-${cmd.id}`,
      type: 'command' as const,
      title: cmd.name,
      description: cmd.description || cmd.category,
      action: `command:execute:${cmd.id}`,
      score: 2000 - index,
      priorityScore: 2000 - index,
    });
  });

  // 如果没有匹配的命令，显示提示
  if (commandCompletions.length === 0 && commandQuery) {
    combinedResults.push({
      id: 'command-no-match',
      type: 'command' as const,
      title: '未找到匹配的命令',
      description: `输入 "> " 查看所有可用命令`,
      action: 'command:list',
      score: 1000,
      priorityScore: 1000,
    });
  }
};

