import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { SearchResult } from '../../ResultList';
import { LoadingSkeleton, PreviewTitle, PreviewField, ActionButton, SafeImage, EngineIcon } from '../components';
import { formatDate, formatFileSize, getFileName, formatPermissions, getSecurityStatus, getEngineName, IMAGE_EXTENSIONS } from '../utils';

export const TodoPreview: React.FC<{ result: SearchResult }> = memo(({ result }) => {
  if (!result.todoData) return null;

  const [todo, setTodo] = useState(result.todoData);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isChangingPriority, setIsChangingPriority] = useState(false);

  useEffect(() => {
    if (result.todoData) {
      setTodo(result.todoData);
    }
  }, [result.todoData]);

  const reloadTodo = useCallback(async () => {
    try {
      const query = `todo all`;
      const result = await (window.electron as any).todo.handleQuery(query, false);
      if (result?.todos?.length > 0) {
        const updatedTodo = result.todos.find((t: any) => t.id === todo.id);
        if (updatedTodo) {
          setTodo(updatedTodo);
        }
      }
    } catch (error) {
      console.error('重新加载任务失败:', error);
    }
  }, [todo.id]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`确定要删除任务 "${todo.content}" 吗？`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const query = `todo delete ${todo.id}`;
      const result = await (window.electron as any).todo.handleQuery(query, true);
      if (result?.success) {
        window.electron.preview.hide();
        if (window.electron?.invoke) {
          window.electron.invoke('main-window-refresh-search').catch(() => {});
        }
      } else {
        alert(result?.error || '删除失败');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务失败');
      setIsDeleting(false);
    }
  }, [todo.id, todo.content]);

  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      const query = `todo done ${todo.id}`;
      const result = await (window.electron as any).todo.handleQuery(query, true);
      if (result?.success) {
        await reloadTodo();
        setIsCompleting(false);
        if (window.electron?.invoke) {
          window.electron.invoke('main-window-refresh-search').catch(() => {});
        }
      } else {
        alert(result?.error || '操作失败');
        setIsCompleting(false);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      alert('完成任务失败');
      setIsCompleting(false);
    }
  }, [todo.id, reloadTodo]);

  const handleChangePriority = useCallback(async (priority: 'high' | 'medium' | 'low') => {
    if (priority === todo.priority) return;

    setIsChangingPriority(true);
    try {
      const query = `todo edit ${todo.id} ${todo.content} --priority ${priority}`;
      const result = await (window.electron as any).todo.handleQuery(query, true);
      if (result?.success) {
        await reloadTodo();
        setIsChangingPriority(false);
        if (window.electron?.invoke) {
          window.electron.invoke('main-window-refresh-search').catch(() => {});
        }
      } else {
        alert(result?.error || '修改优先级失败');
        setIsChangingPriority(false);
      }
    } catch (error) {
      console.error('修改优先级失败:', error);
      alert('修改优先级失败');
      setIsChangingPriority(false);
    }
  }, [todo.id, todo.content, todo.priority, reloadTodo]);

  const priorityLabel = useMemo(() => {
    return todo.priority === 'high' ? '高' : todo.priority === 'low' ? '低' : '中';
  }, [todo.priority]);

  const statusLabel = useMemo(() => {
    return todo.status === 'done' ? '已完成' : '待办';
  }, [todo.status]);

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 max-w-full overflow-x-hidden">
      <PreviewTitle title="任务详情" />
      <div className="space-y-4">
        <PreviewField label="任务 ID" value={`#${todo.id}`} monospace />
        <PreviewField label="任务内容" value={todo.content} />

        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">优先级</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${
              todo.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
              todo.priority === 'low' ? 'bg-green-100 dark:bg-green-900/30' :
              'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              {todo.priority === 'high' ? (
                <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#FEE2E2" opacity="0.3"/>
                </svg>
              ) : todo.priority === 'low' ? (
                <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#059669" stroke="#047857" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#D1FAE5" opacity="0.3"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" fill="#D97706" stroke="#92400E" strokeWidth="0.5"/>
                  <circle cx="8" cy="8" r="4" fill="#FEF3C7" opacity="0.3"/>
                </svg>
              )}
              <span className={`text-xs font-medium ${
                todo.priority === 'high' ? 'text-red-800 dark:text-red-200' :
                todo.priority === 'low' ? 'text-green-800 dark:text-green-200' :
                'text-yellow-800 dark:text-yellow-200'
              }`}>
                {priorityLabel}
              </span>
            </div>
            {!isChangingPriority && (
              <div className="flex gap-1">
                {(['high', 'medium', 'low'] as const).map((priority) => (
                  priority !== todo.priority && (
                    <ActionButton
                      key={priority}
                      onClick={() => handleChangePriority(priority)}
                    >
                      设为{priority === 'high' ? '高' : priority === 'low' ? '低' : '中'}
                    </ActionButton>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">状态</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              todo.status === 'done' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {statusLabel}
            </span>
            {todo.status === 'pending' && !isCompleting && (
              <ActionButton onClick={handleComplete}>标记为已完成</ActionButton>
            )}
          </div>
        </div>

        <PreviewField label="创建时间" value={formatDate(todo.createdAt, '')} />
        
        {todo.completedAt && (
          <PreviewField label="完成时间" value={formatDate(todo.completedAt, '')} />
        )}

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex flex-wrap gap-2">
            {todo.status === 'pending' && (
              <ActionButton onClick={handleComplete} disabled={isCompleting}>
                {isCompleting ? '处理中...' : '完成'}
              </ActionButton>
            )}
            <ActionButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '删除'}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
});
TodoPreview.displayName = 'TodoPreview';
