import { SearchResult } from '../../ResultList';
import { detectQueryType, QueryTypeDetection } from '../queryDetectors';
import { callFeatureModules } from './featureModules';
import { callSearchServices } from './searchServices';
import { detectKeywords } from './keywordDetectors';
import { getCommandCompletions, getFeatureCompletions } from './completionHandlers';
import { buildFeatureCompletionResults } from './resultBuilders/featureCompletionBuilder';
import { buildCommandCompletionResults } from './resultBuilders/commandCompletionBuilder';
import { buildEncodeResults, buildStringResults, buildTimeResults, buildTodoResults, buildRandomResults, buildTranslateResults, buildVariableNameResults, buildIpResults } from './resultBuilders/featureResultsBuilder';
import { buildCalculatorResults } from './resultBuilders/calculatorResultBuilder';
import { buildAppResults, buildFileResults, buildWebResults, buildBookmarkResults, buildCommandResults, buildURLResults, buildClipboardResults, buildSettingsResult } from './resultBuilders/searchResultsBuilder';
import { sortResults } from '../resultSort';
import { HOVER_IGNORE_DELAY } from '../constants';

/**
 * 搜索处理结果
 */
export interface SearchHandlerResult {
  results: SearchResult[];
  shouldReturnEarly: boolean; // 是否应该提前返回（命令模式）
}

/**
 * 主要搜索处理函数
 */
export const handleSearch = async (
  query: string,
  setResults: (results: SearchResult[]) => void,
  setSelectedIndex: (index: number) => void,
  setIgnoreHover: (ignore: boolean) => void,
  setLoading: (loading: boolean) => void,
  setShowNoResult: (show: boolean) => void
): Promise<void> => {
  console.log('🚀 [搜索开始] query:', query);
  
  if (!query.trim()) {
    console.log('⚠️ [搜索] 查询为空，清空结果');
    setResults([]);
    setSelectedIndex(0);
    setIgnoreHover(false);
    setLoading(false);
    setShowNoResult(false);
    return;
  }

  console.log('✅ [搜索] 开始搜索，query:', query);
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

    // 检测查询类型
    const detection = detectQueryType(query, actualQuery);
    const {
      urlCheck,
      isSettingsQuery,
      isFileSearch,
      isCommandMode,
      commandQuery,
      isSimpleMath,
      isCalculation,
      finalIsCalculation,
    } = detection;

    console.log('🔍 [计算器检测-前置]', {
      query: actualQuery,
      queryTrimmed: actualQuery.trim(),
      isSimpleMath,
      isCalculation,
      isFileSearch,
      isURL: urlCheck.isURL,
      finalIsCalculation,
    });

    // 获取设置以决定是否搜索文件
    const settings = await window.electron.settings.getAll().catch(() => ({}));
    const fileSearchEnabled = settings?.fileSearchEnabled !== false; // 默认启用

    console.log('🔍 [文件搜索] 设置:', { fileSearchEnabled });

    // 调用功能模块
    const featureResults = await callFeatureModules(actualQuery, isFileSearch, urlCheck);
    const {
      encodeResult,
      stringResult,
      timeResult,
      randomResult,
      translateResult,
      variableNameResult,
      todoResult,
      ipResult,
    } = featureResults;

    // 如果所有独立模块都没有处理，再尝试计算器
    const shouldCallCalculator = !encodeResult && !stringResult && !timeResult && !randomResult && !translateResult && !variableNameResult && !todoResult && !ipResult && finalIsCalculation;
    console.log('🔍 [计算器检测]', {
      query: actualQuery,
      shouldCallCalculator,
      finalIsCalculation,
      isSimpleMath,
      isCalculation,
      hasOtherResults: !!(encodeResult || stringResult || timeResult || randomResult || translateResult || variableNameResult || todoResult || ipResult),
      encodeResult: encodeResult ? '有结果' : 'null',
      stringResult: stringResult ? '有结果' : 'null',
      timeResult: timeResult ? '有结果' : 'null',
      randomResult: randomResult ? '有结果' : 'null',
      translateResult: translateResult ? '有结果' : 'null',
      variableNameResult: variableNameResult ? '有结果' : 'null',
      todoResult: todoResult ? '有结果' : 'null',
      ipResult: ipResult ? '有结果' : 'null',
    });
    const calcResult = shouldCallCalculator
      ? await window.electron.calculator.calculate(actualQuery).catch((err) => {
          console.error('❌ [前端] 计算器计算失败:', err);
          return null;
        })
      : null;
    if (calcResult) {
      console.log('✅ [前端] 计算器返回结果:', {
        success: calcResult.success,
        output: calcResult.output,
        error: calcResult.error,
      });
    } else if (shouldCallCalculator) {
      console.log('⚠️ [前端] 计算器应该被调用但没有返回结果');
    }

    // 如果计算器返回 null（功能关闭或无法识别）或返回错误，继续搜索网页和其他内容
    const shouldSearchWeb = !isFileSearch && (!finalIsCalculation || calcResult === null || (calcResult && !calcResult.success));

    // 检测功能关键词（用于智能补全）
    const keywordDetection = detectKeywords(actualQuery);

    // 获取命令补全
    const { completions: commandCompletions, help: commandHelp } = await getCommandCompletions(
      isCommandMode,
      commandQuery
    );

    // 获取功能补全
    const { completions: featureCompletions, help: featureHelp, featureType } = await getFeatureCompletions(
      keywordDetection,
      actualQuery,
      isCommandMode,
      isFileSearch,
      urlCheck.isURL
    );

    // 调用搜索服务
    const searchResults = await callSearchServices(
      actualQuery,
      detection,
      shouldSearchWeb,
      fileSearchEnabled
    );
    const {
      appsFromIPC,
      files,
      webResults,
      bookmarks,
      commands,
      clipboardResults,
      defaultBrowser,
    } = searchResults;

    console.log('🔍 [搜索结果]', {
      query: actualQuery,
      isCalculation,
      isFileSearch,
      finalIsCalculation,
      encodeResult: encodeResult ? '有结果' : 'null',
      stringResult: stringResult ? '有结果' : 'null',
      timeResult: timeResult ? '有结果' : 'null',
      randomResult: randomResult ? '有结果' : 'null',
      translateResult: translateResult ? '有结果' : 'null',
      variableNameResult: variableNameResult ? '有结果' : 'null',
      calcResult: calcResult ? `成功: ${calcResult.output}` : 'null',
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
    const combinedResults: SearchResult[] = [];

    // 功能补全结果（只在没有实际计算结果时显示，优先级高于命令模式）
    // 如果 calcResult 存在且成功，说明已经识别为计算/功能查询，不显示补全建议
    // 但是，如果只是输入了关键词（如 "bianma"），即使 calcResult 为 null，也应该显示补全
    const queryLower = actualQuery.toLowerCase().trim();
    const isOnlyKeyword = featureType && actualQuery.trim().toLowerCase() === queryLower &&
      (/^(?:bianma|jiema|jiami|jiemi|bm|jm|url|html|base64|md5|encode|decode|编码|解码)$/i.test(queryLower));

    // 如果有任何功能模块结果（无论成功还是失败），不显示补全建议
    const hasEncodeResult = encodeResult !== null;
    const hasStringResult = stringResult !== null;
    const hasTimeResult = timeResult !== null;
    const hasRandomResult = randomResult !== null;
    const hasTranslateResult = translateResult !== null;
    const hasVariableNameResult = variableNameResult !== null;
    const hasTodoResult = todoResult !== null;
    const hasIpResult = ipResult !== null;

    const shouldShowFeatureCompletion = featureType &&
      !isCommandMode &&
      !isFileSearch &&
      !urlCheck.isURL &&
      !hasEncodeResult && // 如果有编码解码结果（包括错误），不显示补全
      !hasStringResult && // 如果有字符串工具结果（包括错误），不显示补全
      !hasTimeResult && // 如果有时间工具结果（包括错误），不显示补全
      !hasRandomResult && // 如果有随机数生成结果（包括错误），不显示补全
      !hasTranslateResult && // 如果有翻译结果（包括错误），不显示补全
      !hasVariableNameResult && // 如果有变量名生成结果（包括错误），不显示补全
      !hasTodoResult && // 如果有 TODO 结果（包括错误），不显示补全
      !hasIpResult && // 如果有 IP 结果（包括错误），不显示补全
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

    // 构建功能补全结果
    buildFeatureCompletionResults(
      featureType,
      featureHelp,
      featureCompletions,
      shouldShowFeatureCompletion,
      combinedResults
    );

    // 命令补全结果（优先级最高）
    if (isCommandMode) {
      buildCommandCompletionResults(
        commandHelp,
        commandCompletions,
        commandQuery,
        combinedResults
      );

      // 设置结果并返回（命令模式下只显示命令相关结果）
      const sortedResults = sortResults(combinedResults, query);
      setResults(sortedResults);
      setSelectedIndex(0); // 重置选中索引为第一个
      setIgnoreHover(true); // 暂时忽略鼠标悬停，防止覆盖默认选中
      setTimeout(() => setIgnoreHover(false), 200); // 200ms 后恢复悬停功能
      setLoading(false);
      setShowNoResult(combinedResults.length === 0);
      return;
    }

    // 构建设置查询结果
    buildSettingsResult(isSettingsQuery, combinedResults);

    // 构建剪贴板历史结果
    buildClipboardResults(clipboardResults, combinedResults);

    // 构建编码解码结果
    buildEncodeResults(encodeResult, query, combinedResults);

    // 构建字符串工具结果
    buildStringResults(stringResult, query, combinedResults);

    // 构建时间工具结果
    buildTimeResults(timeResult, query, combinedResults);

    // 构建 TODO 结果
    buildTodoResults(todoResult, query, combinedResults);

    // 构建随机数生成结果
    buildRandomResults(randomResult, query, combinedResults);

    // 构建翻译结果
    buildTranslateResults(translateResult, query, combinedResults);

    // 构建变量名生成结果
    buildVariableNameResults(variableNameResult, query, combinedResults);

    // 构建 IP 网络信息结果
    buildIpResults(ipResult, query, combinedResults);

    // 构建计算器结果
    await buildCalculatorResults(calcResult, query, combinedResults);

    // 构建命令结果
    buildCommandResults(commands, combinedResults);

    // 构建 URL 检测结果
    await buildURLResults(urlCheck, combinedResults);

    // 构建应用结果
    buildAppResults(apps, combinedResults);

    // 构建文件结果
    buildFileResults(files, combinedResults);

    // 构建书签结果
    buildBookmarkResults(bookmarks, defaultBrowser, combinedResults);

    // 构建网页搜索结果
    buildWebResults(webResults, hasAppOrFileResults, combinedResults);

    // 排序结果
    const sortedResults = sortResults(combinedResults, query);
    setResults(sortedResults);
    setSelectedIndex(0); // 重置选中索引为第一个
    setIgnoreHover(true); // 暂时忽略鼠标悬停，防止覆盖默认选中
    setTimeout(() => setIgnoreHover(false), HOVER_IGNORE_DELAY);
  } catch (error) {
    console.error('Search error:', error);
    setResults([]);
    setSelectedIndex(0); // 重置选中索引
    setIgnoreHover(true);
    setTimeout(() => setIgnoreHover(false), 200);
  } finally {
    setLoading(false);
  }
};

