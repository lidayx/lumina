import React from 'react';
import { SearchResult } from '../ResultList';

/**
 * 创建结果选择处理器
 */
export const createSelectHandler = (
  results: SearchResult[],
  selectedIndex: number,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  setQuery: React.Dispatch<React.SetStateAction<string>>,
  hideMainWindow: () => void,
  onExecute?: (result: SearchResult) => void
) => {
  return async (index: number) => {
    setSelectedIndex(index);
    if (results[index] && onExecute) {
      const result = results[index];
      
      // 处理设置打开
      if (result.action === 'settings:open') {
        try {
          await window.electron.invoke('open-settings');
          console.log('Settings opened');
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open settings:', error);
        }
        return;
      }
      
      // 处理应用启动
      if (result.action.startsWith('app:')) {
        const appId = result.action.replace('app:', '');
        try {
          await window.electron.invoke('app-launch', appId);
          console.log('App launched:', appId);
          if (selectedIndex === index) {
            setTimeout(() => {
              setSelectedIndex(index);
            }, 300);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to launch app:', error);
        }
        return;
      }
      
      // 处理文件打开
      if (result.action.startsWith('file:')) {
        const filePath = result.action.replace('file:', '');
        try {
          await window.electron.file.open(filePath);
          console.log('File opened:', filePath);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open file:', error);
        }
        return;
      }
      
      // 处理网页搜索
      if (result.action.startsWith('web:')) {
        const url = result.action.replace('web:', '');
        try {
          await window.electron.web.open(url);
          console.log('Web search opened:', url);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open web search:', error);
        }
        return;
      }
      
      // 处理浏览器打开
      if (result.action.startsWith('browser:')) {
        const match = result.action.match(/^browser:([^:]+):(.+)$/);
        if (match) {
          const url = match[2];
          try {
            await window.electron.invoke('browser-open-url', url);
            console.log('Browser opened:', url);
            hideMainWindow();
          } catch (error) {
            console.error('Failed to open browser:', error);
          }
        }
        return;
      }
      
      // 处理命令执行
      if (result.action.startsWith('command:')) {
        const actionParts = result.action.split(':');
        if (actionParts.length >= 3 && actionParts[1] === 'execute') {
          const commandId = actionParts.slice(2).join(':');
          try {
            const execResult = await window.electron.command.execute(commandId);
            if (execResult.success) {
              console.log('Command executed:', commandId);
            } else {
              console.error('Command execution failed:', execResult.error);
            }
            hideMainWindow();
          } catch (error) {
            console.error('Failed to execute command:', error);
          }
        } else if (actionParts.length >= 3 && actionParts[1] === 'help') {
          console.log('Command help requested:', actionParts[2]);
        } else if (actionParts[1] === 'list') {
          setQuery('> ');
        } else {
          const commandId = result.action.replace('command:', '');
          try {
            const execResult = await window.electron.command.execute(commandId);
            if (execResult.success) {
              console.log('Command executed:', commandId);
            } else {
              console.error('Command execution failed:', execResult.error);
            }
            hideMainWindow();
          } catch (error) {
            console.error('Failed to execute command:', error);
          }
        }
        return;
      }
      
      // 处理书签打开
      if (result.action.startsWith('bookmark:')) {
        const url = result.action.replace('bookmark:', '');
        try {
          await window.electron.invoke('browser-open-url', url);
          console.log('Bookmark opened:', url);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open bookmark:', error);
        }
        return;
      }
      
      // 处理时间查询结果
      if (result.action === 'time:copy') {
        try {
          const timeData = (result as any).timeData;
          const calcData = (result as any).calcData;
          let textToCopy = '';
          
          if (timeData?.output) {
            textToCopy = timeData.output;
          } else if (calcData?.output) {
            textToCopy = calcData.output;
          }
          
          if (textToCopy) {
            await navigator.clipboard.writeText(textToCopy);
            console.log('Time result copied:', textToCopy);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to copy time result:', error);
        }
        return;
      }
      
      // 处理剪贴板粘贴
      if (result.action.startsWith('clipboard:paste:')) {
        const itemId = result.action.replace('clipboard:paste:', '');
        try {
          await window.electron.clipboard.paste(itemId);
          console.log('Clipboard item pasted:', itemId);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to paste clipboard item:', error);
        }
        return;
      }
      
      // 处理功能补全
      if (result.action.startsWith('feature:')) {
        const actionParts = result.action.split(':');
        if (actionParts[1] === 'complete') {
          const completeText = actionParts.slice(3).join(':');
          const formatText = completeText.replace(/<[^>]+>/g, '').trim();
          setQuery(formatText + ' ');
        } else if (actionParts[1] === 'example') {
          const exampleText = actionParts.slice(3).join(':');
          setQuery(exampleText);
        } else if (actionParts[1] === 'help') {
          console.log('功能帮助已显示');
        } else if (actionParts[1] === 'continue') {
          console.log('继续输入功能文本');
        }
        return;
      }
      
      // 处理编码解码结果
      if (result.action === 'encode:copy') {
        try {
          const encodeData = (result as any).encodeData;
          if (encodeData?.output) {
            let textToCopy = encodeData.output;
            if (textToCopy.includes(' → ')) {
              const parts = textToCopy.split(' → ');
              if (parts.length === 2) {
                textToCopy = parts[1].trim();
              }
            }
            await navigator.clipboard.writeText(textToCopy);
            console.log('Encode result copied:', textToCopy);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to copy encode result:', error);
        }
        return;
      }
      
      // 处理字符串工具结果
      if (result.action === 'string:copy') {
        try {
          const stringData = (result as any).stringData;
          if (stringData?.output) {
            await navigator.clipboard.writeText(stringData.output);
            console.log('String result copied:', stringData.output);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to copy string result:', error);
        }
        return;
      }
      
      // 处理计算器结果
      if (result.action === 'calc:copy') {
        try {
          const calcData = (result as any).calcData;
          if (calcData?.output) {
            let textToCopy = calcData.output;
            if (textToCopy.includes(' → ')) {
              const parts = textToCopy.split(' → ');
              if (parts.length === 2) {
                textToCopy = parts[1].trim();
              }
            }
            await navigator.clipboard.writeText(textToCopy);
            console.log('Calculator result copied:', textToCopy);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to copy result:', error);
        }
        return;
      }
      
      // 处理 IP 网络信息结果
      if (result.action === 'ip:copy') {
        try {
          const calcData = (result as any).calcData;
          // IP结果可能是"内网IP: 192.168.1.100"格式，复制整个title或只复制IP地址
          let textToCopy = result.title || '';
          if (calcData?.output) {
            textToCopy = calcData.output;
            // 如果包含冒号，尝试只提取IP地址部分
            if (textToCopy.includes(': ')) {
              const parts = textToCopy.split(': ');
              if (parts.length === 2) {
                // 如果第二部分是IP地址格式，只复制IP地址
                if (/^(\d{1,3}\.){3}\d{1,3}$/.test(parts[1].trim())) {
                  textToCopy = parts[1].trim();
                } else {
                  // 否则复制整个字符串
                  textToCopy = textToCopy.trim();
                }
              }
            }
          }
          if (textToCopy) {
            await navigator.clipboard.writeText(textToCopy);
            console.log('IP result copied:', textToCopy);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to copy IP result:', error);
        }
        return;
      }
      
      // 处理 TODO 结果
      if (result.action.startsWith('todo:')) {
        if (result.action === 'todo:copy') {
          // 复制 TODO 结果
          try {
            const todoData = (result as any).todoData;
            if (todoData?.content) {
              await navigator.clipboard.writeText(todoData.content);
              console.log('TODO result copied:', todoData.content);
            }
          } catch (error) {
            console.error('Failed to copy TODO result:', error);
          }
          hideMainWindow();
        } else if (result.action.startsWith('todo:view:')) {
          // 查看 TODO 项详情（这里可以显示详情或执行其他操作）
          // 目前只是关闭窗口，因为 TODO 详情已经在预览窗口中显示
          console.log('TODO item viewed:', result.action);
          hideMainWindow();
        }
        return;
      }
      
      // 默认处理
      onExecute(result);
      hideMainWindow();
    }
  };
};

/**
 * 创建键盘导航处理器
 */
export const createKeyboardHandler = (
  results: SearchResult[],
  selectedIndex: number,
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
  setQuery: React.Dispatch<React.SetStateAction<string>>,
  query: string,
  getNextType: (currentType: string) => string | null,
  switchToType: (type: string) => void,
  handleSelect: (index: number) => void | Promise<void>,
  hideMainWindow: () => void,
  setResults: React.Dispatch<React.SetStateAction<SearchResult[]>>,
  isTodoOperationRef: React.MutableRefObject<boolean>
) => {
  return (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const currentResult = results[selectedIndex];
      if (currentResult?.action.startsWith('feature:complete:')) {
        const actionParts = currentResult.action.split(':');
        if (actionParts[1] === 'complete') {
          const completeText = actionParts.slice(3).join(':');
          const formatText = completeText.replace(/<[^>]+>/g, '').trim();
          setQuery(formatText + ' ');
          setSelectedIndex(0);
        }
      } else if (results.length > 0 && currentResult) {
        const nextType = getNextType(currentResult.type);
        if (nextType) {
          switchToType(nextType);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedQuery = query.trim();
      
      // 检查是否是 TODO 操作（创建、删除、编辑、完成）
      // 匹配：todo delete 1, todo done 1, todo edit 1 xxx, todo create xxx, 待办删除 1 等
      const isTodoModifyOperation = /^(?:todo|待办)\s+(?:delete|remove|del|done|complete|finish|edit|update|完成|删除|移除|删|编辑|更新)\s+\d+/i.test(trimmedQuery) ||
                                   /^(?:todo|待办)\s+(?!all|done|pending|search|全部|已完成|未完成|搜索)\S+/i.test(trimmedQuery);
      
      if (isTodoModifyOperation) {
        console.log('🔍 [前端] 检测到 TODO 操作，执行:', trimmedQuery);
        // 设置 TODO 操作标志，阻止搜索和预览更新
        isTodoOperationRef.current = true;
        // 立即隐藏预览窗口，避免发送预览更新消息
        window.electron.preview.hide().catch((err: any) => {
          console.error('Failed to hide preview window before TODO operation:', err);
        });
        // 立即清空结果和查询，确保 selectedResult 变成 null
        setResults([]);
        setSelectedIndex(0);
        setQuery('');
        // 执行 TODO 操作
        (window.electron as any).todo.handleQuery(trimmedQuery, true).then((result: any) => {
          console.log('🔍 [前端] TODO 操作结果:', result);
          // 清除 TODO 操作标志
          isTodoOperationRef.current = false;
          if (result?.success) {
            // 操作成功，关闭主窗口和预览窗口
            hideMainWindow();
          } else if (result) {
            // 操作失败，重新搜索以更新结果
            setQuery(trimmedQuery);
          } else {
            // 如果 result 为 null 或 undefined，也关闭窗口
            hideMainWindow();
          }
        }).catch((error: any) => {
          console.error('❌ [前端] TODO 操作失败:', error);
          // 清除 TODO 操作标志
          isTodoOperationRef.current = false;
          // 即使操作失败，也关闭窗口
          hideMainWindow();
        });
        return; // 提前返回，避免继续执行后续逻辑
      } else if (results[selectedIndex]) {
        handleSelect(selectedIndex);
      } else if (results.length > 0) {
        handleSelect(0);
      }
    }
  };
};


