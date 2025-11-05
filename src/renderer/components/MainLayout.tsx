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
  const [browsers, setBrowsers] = React.useState<any[]>([]);
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
        
        // 加载浏览器列表
        const browsersResult = await window.electron.invoke('browser-get-all');
        setBrowsers(browsersResult);
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
      const defaultBrowser = await window.electron.invoke('browser-get-default');
      
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

    // 如果高度变化较大（超过5px）或者首次设置，立即更新
    const heightDiff = Math.abs(height - lastHeightRef.current);
    if (heightDiff > 5 || lastHeightRef.current === 80) {
      // 立即执行
      lastHeightRef.current = height;
      window.electron.invoke('window-resize', 700, height).catch(err => {
        console.error('调整窗口大小失败:', err);
      });
    } else {
      // 小幅变化时使用短防抖（16ms，接近一帧时间）
      resizeTimerRef.current = setTimeout(() => {
        lastHeightRef.current = height;
        window.electron.invoke('window-resize', 700, height).catch(err => {
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
            // 检测是否为 URL
            const urlCheck = isURL(query.trim());
            
            // 检测是否为设置关键词
            const isSettingsQuery = ['设置', 'settings', 'setting', '配置', 'preferences'].includes(query.trim().toLowerCase());
            
            // 检测是否为计算表达式或时间查询（需要包含运算符、函数、单位转换符号或时间关键词）
            const queryTrimmed = query.trim();
            const isCalculation = (
              // 包含运算符或特殊字符，且不是纯数字
              (/[\+\-*/().,π \t]/.test(queryTrimmed) && !/^[\d.,\s]+$/.test(queryTrimmed)) ||
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
              /^(string|password|number)\s+random/i.test(queryTrimmed)
            );
            
            // 检测是否为文件搜索（file + 空格 + 关键字）
            const fileSearchMatch = query.trim().match(/^file\s+(.+)$/i);
            const isFileSearch = fileSearchMatch !== null;
            const fileSearchQuery = fileSearchMatch ? fileSearchMatch[1] : '';
            
            console.log('🔍 [文件搜索] 检测:', { 
              query, 
              isFileSearch, 
              fileSearchQuery,
              match: fileSearchMatch 
            });
            
            // 获取设置以决定是否搜索文件
            const settings = await window.electron.settings.getAll().catch(() => ({}));
            const fileSearchEnabled = settings?.fileSearchEnabled !== false; // 默认启用
            
            console.log('🔍 [文件搜索] 设置:', { fileSearchEnabled });

            // 并行搜索所有类型（统一防抖，确保结果同时返回以便正确排序）
            const [appsFromIPC, files, webResults, bookmarks, commands, calcResult, defaultBrowser] = await Promise.all([
              // 直接调用 IPC 搜索应用，而不是使用 useAppSearch hook 的结果（避免防抖延迟）
              window.electron.app.search(query).catch(() => []),
              // 只在输入 "file + 空格 + 关键字" 时才搜索文件
              (isFileSearch && fileSearchEnabled && fileSearchQuery) 
                ? window.electron.file.search(fileSearchQuery).catch(() => []) 
                : Promise.resolve([]),
              window.electron.web.search(query).catch(() => []),
              window.electron.bookmark.search(query).catch(() => []),
              window.electron.command.search(query).catch(() => []),
              isCalculation ? window.electron.calculator.calculate(query).catch(() => null) : Promise.resolve(null),
              // 获取默认浏览器（用于为书签/网页结果显示默认浏览器图标）
              window.electron.browser.getDefault().catch(() => null),
            ]);

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
            
            // 计算器结果（如果有，包括时间查询结果）
            if (calcResult && calcResult.success) {
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
              
              // 判断是否为时间查询结果（通过输出内容判断）
              const isTimeResult = !isTimeDifference && !isTimeCalculation && !isTextStats && (
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
              } else {
                // 文本统计结果：直接显示多行结果
                if (isTextStats) {
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
              const browserOptions = await generateBrowserOptions(urlCheck.url);
              combinedResults.push(...browserOptions);
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
            const queryLower = query.toLowerCase();
            const sortFunction = (a: SearchResultType, b: SearchResultType) => {
              // 1. 优先级分数（priorityScore）优先 - 命令 > 应用 > 文件
              const aPriority = a.priorityScore || 0;
              const bPriority = b.priorityScore || 0;
              if (aPriority !== bPriority) return bPriority - aPriority;
              
              // 2. 完全匹配优先
              const aName = a.title.toLowerCase();
              const bName = b.title.toLowerCase();
              
              if (aName === queryLower && bName !== queryLower) return -1;
              if (bName === queryLower && aName !== queryLower) return 1;
              
              // 3. 开头匹配优先
              const aStarts = aName.startsWith(queryLower);
              const bStarts = bName.startsWith(queryLower);
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
          const browserId = match[1];
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
        const commandId = result.action.replace('command:', '');
        try {
          await window.electron.command.execute(commandId);
          console.log('Command executed:', commandId);
          hideMainWindow();
        } catch (error) {
          console.error('Failed to execute command:', error);
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

  // 键盘导航
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
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
  }, [results, selectedIndex]);

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
                <ResultList results={results} selectedIndex={selectedIndex} onSelect={handleSelect} />
              ) : showNoResult ? (
                <ResultList results={[]} selectedIndex={selectedIndex} onSelect={handleSelect} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

