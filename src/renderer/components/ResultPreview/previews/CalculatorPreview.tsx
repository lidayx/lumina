import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const CalculatorPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  if (!result.calcData) return null;

  // 生成计算步骤
  const steps = useMemo(() => {
    const { input, output } = result.calcData!;
    if (!input || !output) return [];
    
    const stepList: string[] = [];
    const expr = input.trim();
    
    try {
      if (expr.includes('(') || expr.includes(')')) {
        stepList.push(`处理括号表达式: ${expr}`);
        stepList.push(`计算结果: ${output}`);
        return stepList;
      }
      
      const hasMulDiv = /[\*\/×÷]/.test(expr);
      const hasAddSub = /[\+\-]/.test(expr);
      
      if (hasMulDiv && hasAddSub) {
        stepList.push('先计算乘除运算');
        stepList.push('然后计算加减运算');
        stepList.push(`最终结果: ${output}`);
      } else if (hasMulDiv) {
        stepList.push(`执行乘除运算: ${expr}`);
        stepList.push(`结果: ${output}`);
      } else if (hasAddSub) {
        stepList.push(`执行加减运算: ${expr}`);
        stepList.push(`结果: ${output}`);
      } else {
        stepList.push(`${expr} = ${output}`);
      }
    } catch {
      stepList.push(`计算表达式: ${expr}`);
      stepList.push(`结果: ${output}`);
    }
    
    return stepList;
  }, [result.calcData]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <PreviewTitle title="计算结果" />
      <div className="space-y-4">
        <PreviewField label="输入" value={result.calcData.input || '(空)'} monospace className="break-all whitespace-pre-wrap" />
        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">结果</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono break-words break-all leading-relaxed whitespace-pre-wrap">
            {result.calcData.output || '(无结果)'}
          </p>
        </div>
        
        {steps.length > 0 && (
          <div>
            <div className="mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">计算步骤</span>
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed space-y-1">
              {steps.map((step, index) => (
                <p key={index} className="font-mono text-xs break-words break-all whitespace-pre-wrap">
                  {index + 1}. {step}
                </p>
              ))}
            </div>
          </div>
        )}
        
        {result.calcData.error && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="mb-1">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wide">错误</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 break-words leading-relaxed">{result.calcData.error}</p>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">按 Enter 键复制结果</p>
        </div>
      </div>
    </div>
  );
});
CalculatorPreview.displayName = 'CalculatorPreview';
