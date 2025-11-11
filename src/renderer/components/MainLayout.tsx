import React from 'react';
import { SearchBar } from './SearchBar';
import { ResultList, SearchResult as SearchResultType } from './ResultList';

interface MainLayoutProps {
  onExecute?: (result: SearchResultType) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ onExecute }) => {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [results, setResults] = React.useState<SearchResultType[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showNoResult, setShowNoResult] = React.useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = React.useState(true);

  // 监听主窗口显示事件，清空输入并获取焦点
  React.useEffect(() => {
    const handleMainWindowShow = () => {
      console.log('主窗口显示，清空输入并获取焦点');
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    };

    window.electron.on('main-window-show', handleMainWindowShow);

    return () => {
      window.electron.removeListener('main-window-show', handleMainWindowShow);
    };
  }, []);

  // 检测首次启动并加载浏览器列表
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let handleIndexingComplete: (() => void) | null = null;

    const loadData = async () => {
      try {
        // 检测是否是首次启动（检查是否有缓存的应用）
        const apps = await window.electron.invoke('app-get-all');
        if (apps && apps.length > 0) {
          // 有缓存，不是首次启动
          setIsFirstLaunch(false);
        } else {
          // 无缓存，是首次启动
          console.log('首次启动检测：无缓存，显示加载引导');
          setIsFirstLaunch(true);
          
          // 设置备用超时（最多30秒后强制清除loading）
          timeoutId = setTimeout(() => {
            console.log('⏰ 超时30秒，强制清除loading');
            setIsFirstLaunch(false);
          }, 30000);

          // 监听索引完成事件
          handleIndexingComplete = () => {
            console.log('✅ 收到索引完成事件，清除loading');
            if (timeoutId) clearTimeout(timeoutId);
            setIsFirstLaunch(false);
          };

          window.electron.on('indexing-complete', handleIndexingComplete);
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      }
    };
    
    loadData();
    
    // 清理函数
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (handleIndexingComplete) {
        window.electron.removeListener('indexing-complete', handleIndexingComplete);
      }
    };
  }, []);


  // 隐藏主窗口的辅助函数
  const hideMainWindow = () => {
    setQuery(''); // 清空搜索
    setResults([]); // 清空结果
    // 先隐藏预览窗口
    window.electron.preview.hide();
    // 延迟隐藏窗口，确保状态更新完成
    setTimeout(() => {
      window.electron.windowHide('main').catch((err) => {
        console.error('Failed to hide window:', err);
      });
    }, 50);
  };

  // 生成浏览器选项
  const generateBrowserOptions = async (url: string): Promise<SearchResultType[]> => {
    try {
      const allBrowsers = await window.electron.invoke('browser-get-all');
      
      const options: SearchResultType[] = allBrowsers.map((browser: any, index: number) => {
        console.log('浏览器图标:', browser.name, 'icon:', browser.icon ? '有' : '无');
        return {
          id: `browser-${browser.id}-${url}`,
          type: 'web' as const,
          title: browser.isDefault ? `${browser.name}（默认）` : browser.name,
          description: '打开此网址',
          action: `browser:${browser.id}:${url}`,
          score: browser.isDefault ? 1500 + index : 1000 + index,
          priorityScore: browser.isDefault ? 1500 : 1000,
          icon: browser.icon, // 使用浏览器图标
        };
      });
      
      // 确保默认浏览器在第一位
      return options.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('生成浏览器选项失败:', error);
      return [];
    }
  };
  
  // 加载状态（useAppSearch 已移除，只有 loading）
  const loadingState = loading;
  
  // 延迟显示"未找到匹配结果"
  React.useEffect(() => {
    if (loadingState || !query) {
      setShowNoResult(false);
      return;
    }
    
    const timer = setTimeout(() => {
      if (results.length === 0 && !loadingState) {
        setShowNoResult(true);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [query, results, loadingState]);

  // 动态调整窗口大小（优化：立即执行+防抖后续更新）
  const resizeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastHeightRef = React.useRef<number>(80);
  const lastWidthRef = React.useRef<number>(700);
  
  React.useEffect(() => {
    if (!window.electron) return;

    let height = 80; // 基础高度（只有输入框）

    if (isFirstLaunch) {
      // 首次启动时使用基础高度
      height = 80;
    } else if (query) {
      // 有查询时根据结果调整高度
      if (results.length > 0) {
        // 有结果：80 (输入框) + 结果列表 + padding
        const maxVisibleItems = 8;
        const visibleItems = Math.min(results.length, maxVisibleItems);
        height = 80 + visibleItems * 56 + 20;
      } else if (showNoResult) {
        // 无结果提示：80 + "未找到匹配结果"的高度
        height = 80 + 60;
      } else {
        // 搜索中：保持基础高度，避免先增后缩造成跳动
        height = 80;
      }
    } else {
      // 无查询：只有输入框
      height = 80;
    }

    // 清除之前的定时器
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }

    // 主窗口宽度固定（不再受预览影响）
    const baseWidth = 700;
    const targetWidth = baseWidth;

    // 如果高度变化较大（超过5px）或者首次设置，立即更新
    const heightDiff = Math.abs(height - lastHeightRef.current);
    const widthDiff = Math.abs(targetWidth - (lastWidthRef.current || baseWidth));
    const shouldUpdateImmediately = heightDiff > 5 || widthDiff > 5 || lastHeightRef.current === 80;
    
    if (shouldUpdateImmediately) {
      // 立即执行
      lastHeightRef.current = height;
      lastWidthRef.current = targetWidth;
      window.electron.windowResize(targetWidth, height).catch(err => {
        console.error('调整窗口大小失败:', err);
      });
    } else {
      // 小幅变化时使用短防抖（16ms，接近一帧时间）
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      resizeTimerRef.current = setTimeout(() => {
        lastHeightRef.current = height;
        lastWidthRef.current = targetWidth;
        window.electron.windowResize(targetWidth, height).catch(err => {
          console.error('调整窗口大小失败:', err);
        });
      }, 16); // 16ms 防抖（约一帧时间）
    }

    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [query, results.length, showNoResult, isFirstLaunch]);

      // 检测是否为 URL
      const isURL = (str: string): { isURL: boolean; url?: string } => {
        try {
          // 如果已经有 http:// 或 https://
          if (str.startsWith('http://') || str.startsWith('https://')) {
            return { isURL: true, url: str };
          }
          
          // 检测常见的域名格式
          const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
          if (str.match(domainPattern)) {
            // 检查是否包含空格或斜杠，如果有则不认为是纯域名
            if (str.includes(' ') || str.includes('/')) {
              return { isURL: false };
            }
            return { isURL: true, url: `https://${str}` };
          }
          return { isURL: false };
        } catch {
          return { isURL: false };
        }
      };

      const handleSearch = (searchQuery: string) => {
        setQuery(searchQuery);
        setSelectedIndex(0);
      };

      // 搜索应用和文件
      React.useEffect(() => {
        const searchAll = async () => {
          if (!query.trim()) {
            setResults([]);
            setLoading(false);
            return;
          }

          setLoading(true);
          try {
            // 先尝试解析别名（优先级最高）
            let actualQuery = query.trim();
            try {
              const aliasResult = await window.electron.alias.resolve(query.trim());
              if (aliasResult && aliasResult.resolved) {
                actualQuery = aliasResult.resolved;
                console.log(`🔗 [别名] "${query.trim()}" -> "${actualQuery}"`);
              }
            } catch (error) {
              // 别名解析失败，继续使用原查询
              console.log('别名解析失败，使用原查询');
            }

            // 检测是否为 URL
            const urlCheck = isURL(actualQuery.trim());
            
            // 检测是否为设置关键词
            const isSettingsQuery = ['设置', 'settings', 'setting', '配置', 'preferences'].includes(actualQuery.trim().toLowerCase());
            
            // 检测是否为剪贴板搜索（优先检测，避免被其他查询拦截）
            const clipboardMatch = actualQuery.trim().match(/^(?:clip|clipboard|剪贴板|cb)(?:\s+(.+))?$/i);
            const isClipboardSearch = clipboardMatch !== null;
            const clipboardQuery = clipboardMatch ? (clipboardMatch[1] || '') : '';
            
            // 检测是否为计算表达式或时间查询（需要包含运算符、函数、单位转换符号或时间关键词）
            const queryTrimmed = actualQuery.trim();
            const isCalculation = (
              // 包含运算符或特殊字符（不包括空格），且不是纯数字
              // 注意：空格本身不应该触发计算器，只有明确的数学运算符才应该
              (/[\+\-*/().,π]/.test(queryTrimmed) && !/^[\d.,\s]+$/.test(queryTrimmed)) ||
              // 包含数学函数（使用单词边界，避免误匹配如 "weixin" 中的 "in"）
              /\b(sin|cos|tan|log|sqrt)\b/i.test(queryTrimmed) ||
              // 包含单位转换关键字（单词边界）
              /\b(to|到)\b/i.test(queryTrimmed) ||
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
              /^\d{4}[-\/]\d{2}[-\/]\d{2}/.test(queryTrimmed) && /[\+\-]/.test(queryTrimmed) ||
              // 日期格式化：format 或格式化关键字
              /^(?:format|格式化)\s+.+?\s+.+?$/i.test(queryTrimmed) ||
              /^.+?\s+(?:format|格式化)\s+.+?$/i.test(queryTrimmed) ||
              // 时区转换：包含 to/in/到 和时区关键词（更宽松的匹配）
              /\s+(?:to|in|到)\s+(utc|gmt|cst|est|pst|jst|bst|cet|ist|kst|aest|china|中国|beijing|北京|japan|日本|tokyo|东京|eastern|pacific|london|europe|india|印度|korea|韩国|australia|悉尼|utc[+\-]\d+)/i.test(queryTrimmed) ||
              // 编码解码关键词检测
              // URL 编码/解码
              /(?:url\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+url)/i.test(queryTrimmed) ||
              // HTML 编码/解码
              /(?:html\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+html)/i.test(queryTrimmed) ||
              // Base64 编码/解码
              /(?:base64\s+(?:encode|decode|编码|解码)|(?:encode|decode|编码|解码)\s+base64)/i.test(queryTrimmed) ||
              // MD5 加密
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
            
            // 检测是否为文件搜索（file + 空格 + 关键字）
            const fileSearchMatch = query.trim().match(/^file\s+(.+)$/i);
            const isFileSearch = fileSearchMatch !== null;
            const fileSearchQuery = fileSearchMatch ? fileSearchMatch[1] : '';
            
            // 检测是否为命令模式（以 > 开头）
            const commandMatch = query.trim().match(/^>\s*(.*)$/);
            const isCommandMode = commandMatch !== null;
            const commandQuery = commandMatch ? commandMatch[1] : '';
            
            console.log('🔍 [文件搜索] 检测:', { 
              query, 
              isFileSearch, 
              fileSearchQuery,
              match: fileSearchMatch 
            });
            
            // 如果检测到文件搜索或 URL，禁用计算器（文件搜索和 URL 优先）
            const finalIsCalculation = (isFileSearch || urlCheck.isURL) ? false : isCalculation;
            
            // 获取设置以决定是否搜索文件
            const settings = await window.electron.settings.getAll().catch(() => ({}));
            const fileSearchEnabled = settings?.fileSearchEnabled !== false; // 默认启用
            
            console.log('🔍 [文件搜索] 设置:', { fileSearchEnabled });

            // 并行搜索所有类型（统一防抖，确保结果同时返回以便正确排序）
            // 先获取计算结果，以便决定是否搜索网页
            const calcResult = finalIsCalculation 
              ? await window.electron.calculator.calculate(actualQuery).catch((err) => {
                  console.error('计算器计算失败:', err);
                  return null;
                })
              : null;
            
            // 如果计算器返回 null（功能关闭或无法识别），继续搜索网页和其他内容
            const shouldSearchWeb = !isFileSearch && (!finalIsCalculation || calcResult === null);
            
            // 检测功能关键词（用于智能补全）
            // 只在输入关键词本身或关键词后跟空格时触发补全，避免误触发
            const queryLower = actualQuery.toLowerCase().trim();
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
            const isStringKeyword = /^(?:uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract)(\s|$)/i.test(queryLower) ||
                                   /^(?:uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract)\s+\w/i.test(queryLower);
            const isVarnameKeyword = /^(?:varname|变量名|camel|snake|pascal)(\s|$)/i.test(queryLower) ||
                                    /^(?:varname|变量名|camel|snake|pascal)\s+\w/i.test(queryLower);
            const isTimeKeyword = /^(?:time|时间|timestamp|date|日期)(\s|$)/i.test(queryLower) ||
                                 /^(?:time|时间|timestamp|date|日期)\s+\w/i.test(queryLower);
            
            // 命令补全（如果处于命令模式）
            let commandCompletions: any[] = [];
            let commandHelp: any = null;
            if (isCommandMode) {
              try {
                if (commandQuery) {
                  // 有输入，进行命令补全
                  commandCompletions = await window.electron.command.complete(commandQuery).catch(() => []);
                  // 如果只有一个匹配结果，获取帮助信息
                  if (commandCompletions.length === 1) {
                    commandHelp = await window.electron.command.help(commandCompletions[0].id).catch(() => null);
                  }
                } else {
                  // 没有输入，显示所有命令
                  commandCompletions = await window.electron.command.getAll().catch(() => []);
                }
              } catch (error) {
                console.error('命令补全失败:', error);
              }
            }
            
            // 功能补全（如果检测到功能关键词且不在命令模式）
            let featureCompletions: any[] = [];
            let featureHelp: any = null;
            let featureType: string | null = null;
            
            if (!isCommandMode && !isFileSearch && !urlCheck.isURL) {
              try {
                if (isTranslateKeyword) {
                  featureType = 'translate';
                  const queryForComplete = actualQuery.replace(/^(?:translate|翻译|fanyi|fy|en|zh|cn)\s*/i, '').trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.translate.complete(queryForComplete).catch(() => []);
                  } else {
                    featureHelp = await window.electron.translate.help().catch(() => null);
                  }
                } else if (isRandomKeyword) {
                  featureType = 'random';
                  const queryForComplete = actualQuery.replace(/^(?:pwd|password|密码|uuid|random)\s*/i, '').trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.random.complete(queryForComplete).catch(() => []);
                  } else {
                    featureHelp = await window.electron.random.help().catch(() => null);
                  }
                } else if (isEncodeKeyword) {
                  featureType = 'encode';
                  // 保留完整的查询用于补全，以便匹配 "url en" -> "url encode"
                  const queryForComplete = actualQuery.trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.encode.complete(queryForComplete).catch(() => []);
                    console.log('🔍 [编码补全]', { queryForComplete, completions: featureCompletions });
                  } else {
                    featureHelp = await window.electron.encode.help().catch(() => null);
                  }
                } else if (isStringKeyword) {
                  featureType = 'string';
                  const queryForComplete = actualQuery.replace(/^(?:uppercase|lowercase|大写|小写|title|camel|snake|reverse|反转|trim|count|统计|replace|extract)\s*/i, '').trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.string.complete(queryForComplete).catch(() => []);
                  } else {
                    featureHelp = await window.electron.string.help().catch(() => null);
                  }
                } else if (isVarnameKeyword) {
                  featureType = 'varname';
                  const queryForComplete = actualQuery.replace(/^(?:varname|变量名|camel|snake|pascal)\s*/i, '').trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.varname.complete(queryForComplete).catch(() => []);
                  } else {
                    featureHelp = await window.electron.varname.help().catch(() => null);
                  }
                } else if (isTimeKeyword) {
                  featureType = 'time';
                  const queryForComplete = actualQuery.replace(/^(?:time|时间|timestamp|date|日期)\s*/i, '').trim();
                  if (queryForComplete) {
                    featureCompletions = await window.electron.time.complete(queryForComplete).catch(() => []);
                  } else {
                    featureHelp = await window.electron.time.help().catch(() => null);
                  }
                }
              } catch (error) {
                console.error('功能补全失败:', error);
              }
            }
            
            const [appsFromIPC, files, webResults, bookmarks, commands, clipboardResults] = await Promise.all([
              // 直接调用 IPC 搜索应用，而不是使用 useAppSearch hook 的结果（避免防抖延迟）
              isCommandMode ? Promise.resolve([]) : window.electron.app.search(actualQuery).catch(() => []),
              // 只在输入 "file + 空格 + 关键字" 时才搜索文件
              (isFileSearch && fileSearchEnabled && fileSearchQuery) 
                ? window.electron.file.search(fileSearchQuery).catch(() => []) 
                : Promise.resolve([]),
              // 命令模式下不搜索网页
              (isCommandMode || !shouldSearchWeb) ? Promise.resolve([]) : window.electron.web.search(actualQuery).catch(() => []),
              isCommandMode ? Promise.resolve([]) : window.electron.bookmark.search(actualQuery).catch(() => []),
              isCommandMode ? Promise.resolve([]) : window.electron.command.search(actualQuery).catch(() => []),
              // 剪贴板搜索
              isClipboardSearch 
                ? (clipboardQuery 
                    ? window.electron.clipboard.search(clipboardQuery, 20).catch(() => [])
                    : window.electron.clipboard.getHistory(20).catch(() => []))
                : Promise.resolve([]),
            ]);
            
              // 获取默认浏览器（用于为书签/网页结果显示默认浏览器图标）
            const defaultBrowser = await window.electron.browser.getDefault().catch(() => null);
            
            console.log('🔍 [搜索结果]', {
              isCalculation,
              isFileSearch,
              finalIsCalculation,
              calcResult,
              webResultsCount: webResults?.length || 0,
            });

            // 将应用搜索结果转换为统一的格式
            const apps = appsFromIPC.map((app: any) => ({
              id: app.id,
              appId: app.id,
              type: 'app' as const,
              title: app.name,
              description: app.description || app.path,
              action: `app:${app.id}`,
              score: app.score || 1.0,
              icon: app.icon,
            }));

            // 调试日志
            console.log('搜索结果:', { apps: apps.length, files: files.length, webResultsCount: webResults?.length || 0, webResults });
            console.log('🔍 [文件搜索] 返回结果:', { 
              fileCount: files.length, 
              files: files.slice(0, 3).map((f: any) => ({ name: f.name, path: f.path }))
            });
            if (apps.length > 0) {
              console.log('第一个应用:', { 
                name: apps[0].title, 
                hasIcon: !!apps[0].icon, 
                iconLength: apps[0].icon?.length,
                iconPreview: apps[0].icon?.substring(0, 50) 
              });
            }

            // 检查是否有应用或文件结果
            const hasAppOrFileResults = apps.length > 0 || files.length > 0;
            
            // 性能优化：直接构建数组，减少中间数组创建
            const combinedResults: SearchResultType[] = [];
            
            // 功能补全结果（只在没有实际计算结果时显示，优先级高于命令模式）
            // 如果 calcResult 存在且成功，说明已经识别为计算/功能查询，不显示补全建议
            // 但是，如果只是输入了关键词（如 "bianma"），即使 calcResult 为 null，也应该显示补全
            const isOnlyKeyword = featureType && actualQuery.trim().toLowerCase() === queryLower && 
                                 (/^(?:bianma|jiema|jiami|jiemi|bm|jm|url|html|base64|md5|encode|decode|编码|解码)$/i.test(queryLower));
            
            const shouldShowFeatureCompletion = featureType && 
                                               !isCommandMode && 
                                               !isFileSearch && 
                                               !urlCheck.isURL &&
                                               (isOnlyKeyword || !calcResult || !calcResult.success);
            
            // 调试日志
            if (featureType === 'encode' || queryLower.startsWith('bianma') || queryLower.startsWith('jiema')) {
              console.log('🔍 [功能补全显示]', { 
                featureType, 
                shouldShowFeatureCompletion, 
                isCommandMode, 
                isFileSearch, 
                isURL: urlCheck.isURL,
                isOnlyKeyword,
                calcResult: calcResult ? (calcResult.success ? 'success' : 'failed') : 'null',
                featureCompletions: featureCompletions.length,
                featureHelp: !!featureHelp,
                actualQuery: actualQuery.trim(),
                queryLower
              });
            }
            
            if (shouldShowFeatureCompletion) {
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
              featureCompletions.forEach((suggestion: any, index: number) => {
                combinedResults.push({
                  id: `feature-complete-${featureType}-${index}`,
                  type: 'command' as const,
                  title: `💡 ${suggestion.format}`,
                  description: suggestion.description,
                  // 使用 format 而不是 example，这样选中后只填充命令格式，不填充示例内容
                  action: `feature:complete:${featureType}:${suggestion.format}`,
                  score: 2700 - index, // 提高优先级，确保显示在网页搜索之前
                  priorityScore: 2700 - index,
                });
              });
              
              // 如果没有补全建议且没有帮助，显示提示
              if (featureCompletions.length === 0 && !featureHelp) {
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
            }
            
            // 命令补全结果（优先级最高）
            if (isCommandMode) {
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
              
              // 设置结果并返回（命令模式下只显示命令相关结果）
              setResults(combinedResults);
              setLoading(false);
              setShowNoResult(combinedResults.length === 0);
              return;
            }
            
            // 设置检测结果（如果有）
            if (isSettingsQuery) {
              combinedResults.push({
                id: 'open-settings',
                type: 'command' as const,
                title: '打开设置',
                description: '配置应用选项',
                action: 'settings:open',
                score: 2000,
                priorityScore: 2000,
              });
            }
            
            // 剪贴板历史结果（如果有）
            if (clipboardResults && clipboardResults.length > 0) {
              for (const item of clipboardResults) {
                const date = new Date(item.createdAt);
                const timeStr = date.toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                
                combinedResults.push({
                  id: `clipboard-${item.id}`,
                  type: 'command' as const,
                  title: item.contentPreview || item.content.substring(0, 50),
                  description: `${timeStr}${item.copyCount > 1 ? ` · 复制 ${item.copyCount} 次` : ''}`,
                  action: `clipboard:paste:${item.id}`,
                  score: 1900,
                  priorityScore: 1900,
                  calcData: {
                    input: item.content,
                    output: item.content,
                    success: true,
                  },
                });
              }
            }
            
            // 计算器结果（如果有，包括时间查询结果）
            // 处理错误结果（如果检测到 URL，不显示计算器错误）
            if (calcResult && !calcResult.success && calcResult.error && !urlCheck.isURL) {
              combinedResults.push({
                id: 'calc-error',
                type: 'command' as const,
                title: `错误: ${calcResult.error}`,
                description: calcResult.input || query,
                action: 'calc:copy',
                score: 1000,
                priorityScore: 1000,
                calcData: calcResult,
              });
            }
            // 处理成功结果
            else if (calcResult && calcResult.success) {
              // 判断是否为时间差计算结果（优先判断，避免误判）
              // 时间差结果格式：包含"天"、"小时"、"分钟"、"秒"等关键词，并且包含"总计:"
              const isTimeDifference = calcResult.output.includes('总计:') && 
                                       (/\d+\s*(天|小时|分钟|秒)/.test(calcResult.output) || 
                                        calcResult.output.includes('毫秒'));
              
              // 判断是否为时间加减计算结果（包含日期时间格式，且是单个日期时间）
              // 时间加减结果：格式为 YYYY-MM-DD HH:mm:ss，且输入包含 + 或 - 和时长关键词
              const isTimeCalculation = !isTimeDifference && 
                                       /^\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(calcResult.output) &&
                                       /[\+\-]/.test(query.trim()) &&
                                       (/\b(days?|hours?|minutes?|minutes?|seconds?|天|小时|分钟|秒)\b/i.test(query.trim()) ||
                                        /\d+\s*(d|h|m|s|天|小时|分钟|秒)/i.test(query.trim()));
              
              // 判断是否为文本统计结果（多行输出，包含"字符数"、"单词数"等关键词）
              const isTextStats = calcResult.output.includes('字符数') || 
                                 calcResult.output.includes('单词数') ||
                                 calcResult.output.includes('行数') ||
                                 calcResult.output.includes('段落数') ||
                                 /^字符数:/m.test(calcResult.output);
              
              // 判断是否为变量名生成结果（优先判断）
              const isVariableNameResult = /原始描述:|camelCase:|snake_case:|PascalCase:|CONSTANT:|kebab-case:/i.test(calcResult.output);
              
              // 判断是否为密码生成结果（多个密码）
              // 检查 calcData 中是否有 outputs 和 isMultiple 标志
              const isPasswordGeneration = (calcResult as any).outputs && (calcResult as any).isMultiple;
              
              // 判断是否为时间查询结果（通过输出内容判断）
              const isTimeResult = !isTimeDifference && !isTimeCalculation && !isTextStats && !isVariableNameResult && !isPasswordGeneration && (
                calcResult.output.includes('\n') || 
                /^\d{4}[-\/]\d{2}/.test(calcResult.output) ||
                /时间戳|timestamp|ISO|UTC|CST|EST|PST|JST|格式/i.test(calcResult.output)
              );
              
              // 时间差计算结果：直接显示，不拆分
              if (isTimeDifference) {
                combinedResults.push({
                  id: 'time-difference-result',
                  type: 'command' as const,
                  title: calcResult.output.split('\n')[0] || '时间差',
                  description: calcResult.output.includes('\n') ? calcResult.output.split('\n').slice(1).join(' ') : '点击复制',
                  action: 'time:copy',
                  score: 1900,
                  priorityScore: 1900,
                  calcData: calcResult,
                });
              }
              // 时间加减计算结果：显示计算结果的所有格式
              else if (isTimeCalculation) {
                try {
                  // 从输出中解析计算结果日期
                  const resultDateStr = calcResult.output.trim();
                  
                  // 使用正则精确解析日期时间格式，避免时区问题
                  let resultDate: Date | null = null;
                  const dateTimePattern = /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;
                  const match = resultDateStr.match(dateTimePattern);
                  
                  if (match) {
                    const year = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1;
                    const day = parseInt(match[3], 10);
                    const hours = parseInt(match[4], 10);
                    const minutes = parseInt(match[5], 10);
                    const seconds = parseInt(match[6], 10);
                    
                    resultDate = new Date(year, month, day, hours, minutes, seconds);
                  } else {
                    // 如果正则解析失败，尝试使用 Date 构造函数
                    resultDate = new Date(resultDateStr);
                  }
                  
                  if (resultDate && !isNaN(resultDate.getTime())) {
                    // 获取计算结果的所有格式
                    const timeFormats = await window.electron.time.getAllFormats(resultDate.toISOString());
                    
                    // 为每个时间格式创建一个选项
                    timeFormats.forEach((format: { label: string; value: string }, index: number) => {
                      combinedResults.push({
                        id: `time-calculation-${index}`,
                        type: 'command' as const,
                        title: format.value,
                        description: format.label,
                        action: 'time:copy',
                        score: 1900 - index,
                        priorityScore: 1900 - index,
                        calcData: {
                          input: calcResult.input,
                          output: format.value,
                          success: true,
                        },
                      });
                    });
                  } else {
                    // 如果解析失败，直接显示结果
                    combinedResults.push({
                      id: 'time-calculation-result',
                      type: 'command' as const,
                      title: calcResult.output,
                      description: '计算结果',
                      action: 'time:copy',
                      score: 1900,
                      priorityScore: 1900,
                      calcData: calcResult,
                    });
                  }
                } catch (error) {
                  console.error('Failed to process time calculation result:', error);
                  // 如果处理失败，直接显示结果
                  combinedResults.push({
                    id: 'time-calculation-result',
                    type: 'command' as const,
                    title: calcResult.output,
                    description: '计算结果',
                    action: 'time:copy',
                    score: 1900,
                    priorityScore: 1900,
                    calcData: calcResult,
                  });
                }
              }
              // 时间查询结果：需要获取所有时间格式并拆分成多个选项
              else if (isTimeResult) {
                // 时间查询结果：需要获取所有时间格式并拆分成多个选项
                try {
                  // 尝试从输入中提取时间信息
                  let targetDate: Date | null = null;
                  const queryTrimmed = query.trim();
                  
                  // 1. 检测时间戳转日期: timestamp 1705312245 或 ts 1705312245
                  const timestampPattern = /^(?:timestamp|ts)\s+(\d{10,13})$/i;
                  const timestampMatch = queryTrimmed.match(timestampPattern);
                  
                  if (timestampMatch) {
                    const timestampStr = timestampMatch[1];
                    const timestamp = parseInt(timestampStr, 10);
                    const isSeconds = timestampStr.length === 10;
                    targetDate = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
                  } else {
                    // 2. 检测时间戳转日期: 1705312245 to date 或 1705312245 转日期
                    const toDatePattern = /^(\d{10,13})\s+(?:to|转)\s+date$/i;
                    const toDateMatch = queryTrimmed.match(toDatePattern);
                    if (toDateMatch) {
                      const timestampStr = toDateMatch[1];
                      const timestamp = parseInt(timestampStr, 10);
                      const isSeconds = timestampStr.length === 10;
                      targetDate = isSeconds ? new Date(timestamp * 1000) : new Date(timestamp);
                    } else {
                      // 3. 检测日期转时间戳: 日期 + to timestamp 或 日期 + 转时间戳
                      const dateToTimestampPattern = /^(.+?)\s+(?:to|转)\s+timestamp$/i;
                      const dateToTimestampMatch = queryTrimmed.match(dateToTimestampPattern);
                      if (dateToTimestampMatch) {
                        const dateStr = dateToTimestampMatch[1].trim();
                        // 尝试多种日期格式解析
                        const dateFormats = [
                          // YYYY-MM-DD HH:mm:ss
                          /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
                          // YYYY-MM-DD HH:mm
                          /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
                          // YYYY-MM-DD
                          /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
                          // ISO 格式
                          /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
                        ];
                        
                        let parsed = false;
                        for (const format of dateFormats) {
                          const match = dateStr.match(format);
                          if (match) {
                            const year = parseInt(match[1], 10);
                            const month = parseInt(match[2], 10) - 1; // 月份从 0 开始
                            const day = parseInt(match[3], 10);
                            const hours = match[4] ? parseInt(match[4], 10) : 0;
                            const minutes = match[5] ? parseInt(match[5], 10) : 0;
                            const seconds = match[6] ? parseInt(match[6], 10) : 0;
                            
                            targetDate = new Date(year, month, day, hours, minutes, seconds);
                            if (!isNaN(targetDate.getTime())) {
                              parsed = true;
                              break;
                            }
                          }
                        }
                        
                        // 如果正则解析失败，尝试使用 Date 构造函数
                        if (!parsed) {
                          const tryDate = new Date(dateStr);
                          if (!isNaN(tryDate.getTime())) {
                            targetDate = tryDate;
                          }
                        }
                      }
                    }
                  }
                  
                  // 4. 如果还没有找到日期，尝试从输出中解析第一个日期格式
                  if ((!targetDate || isNaN(targetDate.getTime())) && calcResult.output) {
                    const dateMatch = calcResult.output.match(/^(\d{4}[-\/]\d{2}[-\/]\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/);
                    if (dateMatch) {
                      targetDate = new Date(dateMatch[1].replace(/\//g, '-'));
                    }
                  }
                  
                  // 5. 如果还没有找到，尝试直接解析查询字符串（纯日期时间格式）
                  if ((!targetDate || isNaN(targetDate.getTime())) && queryTrimmed) {
                    const pureDatePatterns = [
                      // YYYY-MM-DD HH:mm:ss
                      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
                      // YYYY-MM-DD HH:mm
                      /^(\d{4})[-\/](\d{2})[-\/](\d{2})\s+(\d{2}):(\d{2})$/,
                      // YYYY-MM-DD
                      /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/,
                      // ISO 格式
                      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
                    ];
                    
                    for (const pattern of pureDatePatterns) {
                      const match = queryTrimmed.match(pattern);
                      if (match) {
                        const year = parseInt(match[1], 10);
                        const month = parseInt(match[2], 10) - 1;
                        const day = parseInt(match[3], 10);
                        const hours = match[4] ? parseInt(match[4], 10) : 0;
                        const minutes = match[5] ? parseInt(match[5], 10) : 0;
                        const seconds = match[6] ? parseInt(match[6], 10) : 0;
                        
                        targetDate = new Date(year, month, day, hours, minutes, seconds);
                        if (!isNaN(targetDate.getTime())) {
                          break;
                        }
                      }
                    }
                    
                    // 如果正则解析失败，尝试使用 Date 构造函数
                    if ((!targetDate || isNaN(targetDate.getTime())) && !/^\d+$/.test(queryTrimmed)) {
                      const tryDate = new Date(queryTrimmed);
                      if (!isNaN(tryDate.getTime())) {
                        targetDate = tryDate;
                      }
                    }
                  }
                  
                  // 6. 如果仍然没有找到，使用当前时间（用于 time/date 查询）
                  if (!targetDate || isNaN(targetDate.getTime())) {
                    targetDate = new Date();
                  }
                  
                  // 获取该日期所有格式（传递日期参数）
                  const timeFormats = await window.electron.time.getAllFormats(targetDate.toISOString());
                  
                  // 为每个时间格式创建一个选项
                  timeFormats.forEach((format: { label: string; value: string }, index: number) => {
                    combinedResults.push({
                      id: `time-result-${index}`,
                      type: 'command' as const,
                      title: format.value,
                      description: format.label,
                      action: 'time:copy',
                      score: 1900 - index, // 第一个选项优先级最高
                      priorityScore: 1900 - index,
                      calcData: {
                        input: calcResult.input,
                        output: format.value,
                        success: true,
                      },
                    });
                  });
                } catch (error) {
                  console.error('Failed to get time formats:', error);
                  // 如果获取失败，回退到单个结果
                  combinedResults.push({
                    id: 'time-result',
                    type: 'command' as const,
                    title: calcResult.output.split('\n')[0] || '时间查询',
                    description: '点击复制',
                    action: 'time:copy',
                    score: 1900,
                    priorityScore: 1900,
                    calcData: calcResult,
                  });
                }
              } 
              // 变量名生成结果：显示多行结果
              else if (isVariableNameResult) {
                // 将多行结果拆分成多个选项
                const lines = calcResult.output.split('\n');
                lines.forEach((line: string, index: number) => {
                  if (line.trim()) {
                    const colonIndex = line.indexOf(':');
                    // 只处理包含变量名格式的行
                    if (colonIndex > 0 && /^(camelCase|snake_case|PascalCase|CONSTANT|kebab-case):/i.test(line.trim())) {
                      const variableName = line.substring(colonIndex + 1).trim();
                      const styleName = line.substring(0, colonIndex).trim();
                      
                      // 标题只显示变量名
                      combinedResults.push({
                        id: `varname-result-${index}`,
                        type: 'command' as const,
                        title: variableName,
                        description: styleName,
                        action: 'calc:copy',
                        score: 1900 - index,
                        priorityScore: 1900 - index,
                        calcData: {
                          input: calcResult.input,
                          output: variableName, // 只复制变量名，不包含其他内容
                          success: true,
                        },
                      });
                    }
                  }
                });
              }
              else {
                // 文本统计结果：直接显示多行结果
                // 密码生成结果：为每个密码创建一个选项
                if (isPasswordGeneration && (calcResult as any).outputs) {
                  const passwords = (calcResult as any).outputs as string[];
                  passwords.forEach((password: string, index: number) => {
                    combinedResults.push({
                      id: `password-${index}`,
                      type: 'command' as const,
                      title: password,
                      description: `密码 ${index + 1}/${passwords.length} - 点击复制`,
                      action: 'calc:copy',
                      score: 1900 - index,
                      priorityScore: 1900 - index,
                      calcData: {
                        input: calcResult.input,
                        output: password,
                        success: true,
                      },
                    });
                  });
                } else if (isTextStats) {
                  combinedResults.push({
                    id: 'text-stats-result',
                    type: 'command' as const,
                    title: calcResult.output.split('\n')[0] || '文本统计',
                    description: calcResult.output.split('\n').slice(1).join(' ').substring(0, 50) || '点击复制',
                    action: 'calc:copy',
                    score: 1900,
                    priorityScore: 1900,
                    calcData: calcResult,
                  });
                } else {
                  // 普通计算器结果
              combinedResults.push({
                id: 'calc-result',
                type: 'command' as const,
                    title: `= ${calcResult.output.split('\n')[0]}`,
                description: `计算：${calcResult.input}`,
                action: 'calc:copy',
                score: 1800,
                priorityScore: 1800,
                calcData: calcResult,
              });
                }
              }
            }
            
            // 命令结果（系统命令优先级高于应用）
            if (commands && commands.length > 0) {
              for (const cmd of commands) {
                combinedResults.push({
                  id: cmd.id,
                  type: 'command' as const,
                  title: cmd.name,
                  description: cmd.description,
                  action: `command:${cmd.id}`,
                  score: 1500,
                  priorityScore: 1500,
                  icon: undefined,
                });
              }
            }
            
            // URL 检测结果（如果有）- 显示多个浏览器选项
            if (urlCheck.isURL && urlCheck.url) {
              try {
                const browserOptions = await generateBrowserOptions(urlCheck.url);
                combinedResults.push(...browserOptions);
              } catch (error: any) {
                console.error('生成浏览器选项失败:', error);
                // 即使获取浏览器列表失败，也显示一个默认选项
                combinedResults.push({
                  id: `browser-default-${urlCheck.url}`,
                  type: 'web' as const,
                  title: '系统默认 (默认)',
                  description: '打开此网址',
                  action: `browser:default:${urlCheck.url}`,
                  score: 1500,
                  priorityScore: 1500,
                });
              }
            }
            
            // 应用添加类型优先加分
            if (apps.length > 0) {
              for (const app of apps) {
                combinedResults.push({
                  ...app,
                  priorityScore: 800, // 应用优先级（低于命令）
                });
              }
            }
            
            // 文件保持原评分
            if (files.length > 0) {
              for (const file of files) {
                combinedResults.push({
                  id: file.id,
                  type: 'file' as const,
                  title: file.name,
                  description: file.path,
                  action: `file:${file.path}`,
                  score: file.score || 0,
                  priorityScore: 600, // 文件优先级（低于应用）
                  icon: undefined,
                });
              }
            }
            
            // 书签结果
            if (bookmarks && bookmarks.length > 0) {
              for (const bookmark of bookmarks) {
                combinedResults.push({
                  id: bookmark.id,
                  type: 'web' as const,
                  title: bookmark.name,
                  description: bookmark.url,
                  action: `bookmark:${bookmark.url}`,
                  score: 400,
                  priorityScore: 400,
                  // 如果已设置默认浏览器，则优先显示默认浏览器图标
                  icon: defaultBrowser?.icon || undefined,
                });
              }
            }
            
            // 网页搜索结果（只在没有应用和文件结果时显示）
            if (!hasAppOrFileResults && webResults && webResults.length > 0) {
              for (const web of webResults) {
                combinedResults.push({
                  id: web.id,
                  type: 'web' as const,
                  title: web.title,
                  description: web.searchUrl,
                  action: `web:${web.searchUrl}`,
                  score: 50,
                  priorityScore: 50,
                  // 搜索引擎结果：始终使用搜索引擎自身图标
                  icon: web.icon,
                });
              }
            }

            // 性能优化：使用排序函数，避免在 useMemo 中重复创建
            const queryLowerForSort = query.toLowerCase();
            const sortFunction = (a: SearchResultType, b: SearchResultType) => {
              // 1. 优先级分数（priorityScore）优先 - 命令 > 应用 > 文件
              const aPriority = a.priorityScore || 0;
              const bPriority = b.priorityScore || 0;
              if (aPriority !== bPriority) return bPriority - aPriority;
              
              // 2. 完全匹配优先
              const aName = a.title.toLowerCase();
              const bName = b.title.toLowerCase();
              
              if (aName === queryLowerForSort && bName !== queryLowerForSort) return -1;
              if (bName === queryLowerForSort && aName !== queryLowerForSort) return 1;
              
              // 3. 开头匹配优先
              const aStarts = aName.startsWith(queryLowerForSort);
              const bStarts = bName.startsWith(queryLowerForSort);
              if (aStarts && !bStarts) return -1;
              if (bStarts && !aStarts) return 1;
              
              // 4. 按评分排序
              return b.score - a.score;
            };

            combinedResults.sort(sortFunction);
            setResults(combinedResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    // 防抖搜索（统一防抖，所有搜索同时执行）
    const timer = setTimeout(searchAll, 300);
    return () => clearTimeout(timer);
  }, [query]); // 移除 appResults 依赖，直接通过 IPC 搜索

  // 处理鼠标悬停（只更新选中索引，不执行操作）
  const handleHover = (index: number) => {
    if (index >= 0 && index < results.length) {
      setSelectedIndex(index);
    }
  };

  const handleSelect = async (index: number) => {
    setSelectedIndex(index);
    if (results[index] && onExecute) {
      const result = results[index];
      
      // 处理设置打开
      if (result.action === 'settings:open') {
        try {
          // 打开设置窗口
          await window.electron.invoke('open-settings');
          console.log('Settings opened');
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open settings:', error);
        }
      }
      // 处理应用启动
      else if (result.action.startsWith('app:')) {
        const appId = result.action.replace('app:', '');
        try {
          await window.electron.invoke('app-launch', appId);
          console.log('App launched:', appId);
          // 应用启动后，触发预览窗口刷新（启动次数会更新）
          // 通过重新选择当前结果来触发预览更新
          if (selectedIndex === index) {
            // 延迟一下确保数据库已更新
            setTimeout(() => {
              setSelectedIndex(index); // 触发预览更新
            }, 300);
          }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to launch app:', error);
        }
      } 
      // 处理文件打开
      else if (result.action.startsWith('file:')) {
        const filePath = result.action.replace('file:', '');
        try {
          await window.electron.file.open(filePath);
          console.log('File opened:', filePath);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open file:', error);
        }
      }
      // 处理网页搜索
      else if (result.action.startsWith('web:')) {
        const url = result.action.replace('web:', '');
        try {
          await window.electron.web.open(url);
          console.log('Web search opened:', url);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open web search:', error);
        }
      }
      // 处理浏览器打开
      else if (result.action.startsWith('browser:')) {
        // action 格式：browser:browserId:url
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
      }
      // 处理命令执行
      else if (result.action.startsWith('command:')) {
        const actionParts = result.action.split(':');
        if (actionParts.length >= 3 && actionParts[1] === 'execute') {
          // 命令执行：command:execute:commandId
          const commandId = actionParts.slice(2).join(':');
          try {
            const result = await window.electron.command.execute(commandId);
            if (result.success) {
              console.log('Command executed:', commandId);
            } else {
              console.error('Command execution failed:', result.error);
            }
            hideMainWindow();
          } catch (error) {
            console.error('Failed to execute command:', error);
          }
        } else if (actionParts.length >= 3 && actionParts[1] === 'help') {
          // 命令帮助：command:help:commandId（不执行，只显示帮助）
          // 帮助已经在结果中显示了，这里不需要额外操作
          console.log('Command help requested:', actionParts[2]);
        } else if (actionParts[1] === 'list') {
          // 显示所有命令（清空输入，重新显示命令列表）
          setQuery('> ');
        } else {
          // 兼容旧格式：command:commandId
        const commandId = result.action.replace('command:', '');
        try {
            const result = await window.electron.command.execute(commandId);
            if (result.success) {
          console.log('Command executed:', commandId);
            } else {
              console.error('Command execution failed:', result.error);
            }
          hideMainWindow();
        } catch (error) {
          console.error('Failed to execute command:', error);
          }
        }
      }
      // 处理书签打开
      else if (result.action.startsWith('bookmark:')) {
        const url = result.action.replace('bookmark:', '');
        try {
          await window.electron.invoke('browser-open-url', url);
          console.log('Bookmark opened:', url);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to open bookmark:', error);
        }
      }
      // 处理时间查询结果
      else if (result.action === 'time:copy') {
        if (result.calcData) {
          try {
            // 复制时间结果到剪贴板
            await navigator.clipboard.writeText(result.calcData.output);
            console.log('Time result copied:', result.calcData.output);
            hideMainWindow();
          } catch (error) {
            console.error('Failed to copy time result:', error);
          }
        }
      }
      // 处理剪贴板粘贴
      else if (result.action.startsWith('clipboard:paste:')) {
        const itemId = result.action.replace('clipboard:paste:', '');
        try {
          await window.electron.clipboard.paste(itemId);
          console.log('Clipboard item pasted:', itemId);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to paste clipboard item:', error);
        }
      }
      // 处理功能补全
      else if (result.action.startsWith('feature:')) {
        const actionParts = result.action.split(':');
        if (actionParts[1] === 'complete') {
          // 功能补全：设置输入框为补全文本，并在末尾添加空格以便用户继续输入
          const completeText = actionParts.slice(3).join(':');
          // 移除占位符（如 <长度>），然后添加空格
          const formatText = completeText.replace(/<[^>]+>/g, '').trim();
          setQuery(formatText + ' ');
        } else if (actionParts[1] === 'example') {
          // 功能示例：设置输入框为示例文本
          const exampleText = actionParts.slice(3).join(':');
          setQuery(exampleText);
        } else if (actionParts[1] === 'help') {
          // 功能帮助：不执行操作，帮助信息已显示
          console.log('功能帮助已显示');
        } else if (actionParts[1] === 'continue') {
          // 继续输入：不执行操作
          console.log('继续输入功能文本');
        }
      }
      // 处理计算器结果
      else if (result.action === 'calc:copy') {
        // 将计算结果复制到剪贴板
        try {
          const calcData = (result as any).calcData;
          if (calcData && calcData.output) {
            let textToCopy = calcData.output;
            
            // 如果是编码解码结果（包含 "→"），只复制转换后的部分
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
      } else {
        onExecute(result);
        hideMainWindow();
      }
    }
  };

  // 按类型分组结果
  const groupResultsByType = React.useMemo(() => {
    const grouped: Record<string, typeof results> = {};
    results.forEach((result) => {
      const type = result.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });
    return grouped;
  }, [results]);

  // 获取下一个类型
  const getNextType = React.useCallback((currentType: string) => {
    const types = Object.keys(groupResultsByType).sort();
    if (types.length <= 1) return null;
    
    const currentIndex = types.indexOf(currentType);
    if (currentIndex === -1) return types[0];
    
    return types[(currentIndex + 1) % types.length];
  }, [groupResultsByType]);

  // 切换到指定类型的第一个结果
  const switchToType = React.useCallback((type: string) => {
    const typeResults = groupResultsByType[type];
    if (typeResults && typeResults.length > 0) {
      const firstResult = typeResults[0];
      const index = results.findIndex(r => r.id === firstResult.id);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [groupResultsByType, results]);

  // 键盘导航
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Tab' && !e.shiftKey && results.length > 0) {
        // Tab 键：在结果类型间切换
        e.preventDefault();
        const currentResult = results[selectedIndex];
        if (currentResult) {
          const nextType = getNextType(currentResult.type);
          if (nextType) {
            switchToType(nextType);
          }
        }
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(selectedIndex);
      }
    };

    const handleKeyRepeat = (e: KeyboardEvent) => {
      // 处理长按导致的键盘重复事件
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyRepeat);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyRepeat);
    };
  }, [results, selectedIndex, getNextType, switchToType]);

  // 获取当前选中的结果，用于预览
  const selectedResult = React.useMemo(() => {
    return results[selectedIndex] || null;
  }, [results, selectedIndex]);

  // 管理预览窗口
  const [previewWindowEnabled, setPreviewWindowEnabled] = React.useState(true);

  // 加载预览窗口设置（定期检查，以便实时响应设置变化）
  React.useEffect(() => {
    const loadPreviewSetting = async () => {
      try {
        const settings = await window.electron.settings.getAll();
        setPreviewWindowEnabled(settings.previewWindowEnabled !== false); // 默认启用
      } catch {
        setPreviewWindowEnabled(true); // 默认启用
      }
    };

    // 初始加载
    loadPreviewSetting();

    // 定期检查设置变化（每2秒检查一次，避免过于频繁）
    const interval = setInterval(loadPreviewSetting, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  React.useEffect(() => {
    // 只有在有选中结果、查询不为空且预览窗口启用时才显示预览窗口
    if (selectedResult && query && previewWindowEnabled) {
      // 先更新内容，再显示窗口（确保内容准备好后再显示）
      console.log('[MainLayout] 更新预览内容，选中结果:', selectedResult);
      
      // 先更新内容，确保窗口显示时就有内容
      window.electron.preview.update(selectedResult, query).then(() => {
        // 内容更新后再显示窗口
        console.log('[MainLayout] 内容已更新，显示预览窗口');
        return window.electron.preview.show();
      }).catch(err => {
        console.error('[MainLayout] 显示预览窗口失败:', err);
      });
    } else {
      // 隐藏预览窗口
      window.electron.preview.hide();
    }

    return () => {
      // 清理时隐藏预览窗口
      if (!selectedResult || !query || !previewWindowEnabled) {
        window.electron.preview.hide();
      }
    };
  }, [selectedResult, query, previewWindowEnabled]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl flex flex-col">
          {/* 主搜索框 */}
          <div className="w-full">
            <SearchBar 
              query={query}
              onQueryChange={setQuery}
              onSearch={handleSearch} 
              onEscape={() => hideMainWindow()}
              isLoading={isFirstLaunch} 
            />
          </div>

          {/* 搜索结果区域 */}
          {query && (
            <div className="w-full mt-2 max-h-[450px] overflow-y-auto">
              {results.length > 0 ? (
                <ResultList results={results} selectedIndex={selectedIndex} query={query} onSelect={handleSelect} onHover={handleHover} />
              ) : showNoResult ? (
                <ResultList results={[]} selectedIndex={selectedIndex} query={query} onSelect={handleSelect} onHover={handleHover} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

