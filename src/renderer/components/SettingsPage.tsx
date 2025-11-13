import React, { useState, useEffect } from 'react';
import { BrowserConfig } from '../../shared/types/browser';

interface SettingsPageProps {}

interface CommandItemProps {
  name: string;
  shortcut?: string;
  description: string;
}

const CommandItem: React.FC<CommandItemProps> = ({ name, shortcut, description }) => (
  <div className="flex items-start justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
    <div className="flex-1">
      <div className="font-medium text-gray-900">{name}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
    {shortcut && (
      <span className="ml-3 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
        {shortcut}
      </span>
    )}
  </div>
);

type TabType = 'browser' | 'search-engines' | 'file' | 'general' | 'translate' | 'clipboard' | 'password' | 'help' | 'shortcuts' | 'aliases';

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [browsers, setBrowsers] = useState<BrowserConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrowserName, setNewBrowserName] = useState('');
  const [newBrowserPath, setNewBrowserPath] = useState('');
  const [newBrowserHomepage, setNewBrowserHomepage] = useState('');
  const [isAddingBrowser, setIsAddingBrowser] = useState(false);
  const [editingBrowser, setEditingBrowser] = useState<BrowserConfig | null>(null);
  const [searchEngines, setSearchEngines] = useState<any[]>([]);
  const [isAddingEngine, setIsAddingEngine] = useState(false);
  const [editingEngine, setEditingEngine] = useState<any>(null);
  const [newEngineName, setNewEngineName] = useState('');
  const [newEngineUrl, setNewEngineUrl] = useState('');
  const [appSettings, setAppSettings] = useState<any>({});
  const [fileSearchPaths, setFileSearchPaths] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [logFilePath, setLogFilePath] = useState<string>('');
  const [aliases, setAliases] = useState<any[]>([]);
  const [isAddingAlias, setIsAddingAlias] = useState(false);
  const [editingAlias, setEditingAlias] = useState<any>(null);
  const [newAliasName, setNewAliasName] = useState('');
  const [newAliasCommand, setNewAliasCommand] = useState('');
  const [newAliasType, setNewAliasType] = useState<'app' | 'web' | 'command' | 'search'>('app');
  const [newAliasDescription, setNewAliasDescription] = useState('');
  
  useEffect(() => {
    loadBrowsers();
    loadSearchEngines();
    loadSettings();
    loadAliases();
    
    // 监听来自主进程的标签切换消息
    const handleTabSwitch = (tab: TabType) => {
      setActiveTab(tab);
    };
    
    window.electron.on('settings-switch-tab', handleTabSwitch);
    
    return () => {
      window.electron.removeListener('settings-switch-tab', handleTabSwitch);
    };
  }, []);

  const loadAliases = async () => {
    try {
      const result = await window.electron.alias.getAll();
      setAliases(result || []);
    } catch (error) {
      console.error('加载别名列表失败:', error);
    }
  };

  const handleSaveAlias = async () => {
    if (!newAliasName.trim() || !newAliasCommand.trim()) {
      alert('请输入别名和命令');
      return;
    }

    try {
      if (editingAlias) {
        // 更新别名
        const { success } = await window.electron.alias.update(editingAlias.name, {
          command: newAliasCommand,
          type: newAliasType,
          description: newAliasDescription || undefined,
        });
        if (success) {
          await loadAliases();
          handleCancelAlias();
        } else {
          alert('更新别名失败');
        }
      } else {
        // 添加新别名
        const { success, error } = await window.electron.alias.add(
          newAliasName,
          newAliasCommand,
          newAliasType,
          newAliasDescription || undefined
        );
        if (success) {
          await loadAliases();
          handleCancelAlias();
        } else {
          alert(error || '添加别名失败');
        }
      }
    } catch (error) {
      console.error('保存别名失败:', error);
      alert('保存别名失败');
    }
  };

  const handleCancelAlias = () => {
    setIsAddingAlias(false);
    setEditingAlias(null);
    setNewAliasName('');
    setNewAliasCommand('');
    setNewAliasType('app');
    setNewAliasDescription('');
  };

  const handleEditAlias = (alias: any) => {
    setEditingAlias(alias);
    setNewAliasName(alias.name);
    setNewAliasCommand(alias.command);
    setNewAliasType(alias.type);
    setNewAliasDescription(alias.description || '');
    setIsAddingAlias(true);
  };

  const handleDeleteAlias = async (name: string) => {
    if (!confirm(`确定要删除别名 "${name}" 吗？`)) {
      return;
    }

    try {
      const { success } = await window.electron.alias.remove(name);
      if (success) {
        await loadAliases();
      } else {
        alert('删除别名失败');
      }
    } catch (error) {
      console.error('删除别名失败:', error);
      alert('删除别名失败');
    }
  };
  
  const loadSettings = async () => {
    try {
      const settings = await window.electron.settings.getAll();
      setAppSettings(settings);
      // 加载文件搜索路径
      if (settings.fileSearchPaths && Array.isArray(settings.fileSearchPaths)) {
        setFileSearchPaths(settings.fileSearchPaths);
      }
      
      // 加载日志文件路径
      try {
        const logFile = await window.electron.settings.getLogFile();
        setLogFilePath(logFile);
      } catch (error) {
        console.error('获取日志文件路径失败:', error);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };
  
  const updateSetting = async (key: string, value: any) => {
    try {
      await window.electron.settings.update({ [key]: value });
      const newSettings = { ...appSettings, [key]: value };
      setAppSettings(newSettings);
      
      // 如果关闭了密码生成功能，且当前在密码设置页面，切换到通用设置
      if (key === 'featurePasswordGeneration' && value === false && activeTab === 'password') {
        setActiveTab('general');
      }
      
      // 如果关闭了翻译功能，且当前在翻译设置页面，切换到通用设置
      if (key === 'featureTranslation' && value === false && activeTab === 'translate') {
        setActiveTab('general');
      }
      
      // 如果更新了全局快捷键，通知主进程重新注册（settingsService 也会处理，这里作为双重保障）
      if (key === 'globalShortcut') {
        try {
          await window.electron.shortcut.set(value);
        } catch (error) {
          console.error('更新快捷键失败:', error);
        }
      }
    } catch (error) {
      console.error('更新设置失败:', error);
      alert('更新设置失败');
    }
  };
  
  const loadSearchEngines = async () => {
    try {
      const result = await window.electron.invoke('web-get-engines');
      // 为每个引擎添加唯一标识符
      const enginesWithId = result.map((engine: any, index: number) => ({
        ...engine,
        id: engine.id || `engine-${index}-${engine.name}`,
      }));
      setSearchEngines(enginesWithId);
    } catch (error) {
      console.error('加载搜索引擎列表失败:', error);
    }
  };

  const handleSetDefaultEngine = async (engine: any) => {
    try {
      await window.electron.invoke('web-set-default-engine', engine.name);
      await loadSearchEngines();
    } catch (error) {
      console.error('设置默认搜索引擎失败:', error);
    }
  };

  const handleEditEngine = (engine: any) => {
    setEditingEngine(engine);
    setNewEngineName(engine.name);
    setNewEngineUrl(engine.url);
    setIsAddingEngine(true);
  };

  const handleDeleteEngine = async (engine: any) => {
    if (!confirm(`确定要删除搜索引擎 "${engine.name}" 吗？`)) {
      return;
    }

    try {
      await window.electron.invoke('web-delete-engine', engine.name);
      await loadSearchEngines();
    } catch (error) {
      console.error('删除搜索引擎失败:', error);
      alert('删除搜索引擎失败，请检查是否为默认引擎');
    }
  };

  const handleSaveEngine = async () => {
    if (!newEngineName.trim() || !newEngineUrl.trim()) {
      alert('请输入搜索引擎名称和 URL');
      return;
    }

    try {
      if (editingEngine) {
        // 更新引擎
        await window.electron.invoke('web-update-engine', editingEngine.name, {
          name: newEngineName,
          url: newEngineUrl,
        });
      } else {
        // 添加新引擎
        await window.electron.invoke('web-add-engine', {
          name: newEngineName,
          url: newEngineUrl,
          default: false,
        });
      }
      
      // 重置状态
      setIsAddingEngine(false);
      setEditingEngine(null);
      setNewEngineName('');
      setNewEngineUrl('');
      await loadSearchEngines();
    } catch (error) {
      console.error('保存搜索引擎失败:', error);
    }
  };

  const handleCancelEngine = () => {
    setIsAddingEngine(false);
    setEditingEngine(null);
    setNewEngineName('');
    setNewEngineUrl('');
  };


  const loadBrowsers = async () => {
    try {
      const result = await window.electron.invoke('browser-get-all');
      setBrowsers(result);
      
      // 如果没有默认浏览器，自动设置"系统默认"为默认
      const hasDefault = result.some((browser: BrowserConfig) => browser.isDefault);
      if (!hasDefault && result.length > 0) {
        const defaultBrowser = result.find((browser: BrowserConfig) => browser.id === 'default');
        if (defaultBrowser) {
          console.log('自动设置系统默认为默认浏览器');
          await handleSetDefault('default');
        }
      }
    } catch (error) {
      console.error('加载浏览器列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await window.electron.invoke('browser-set-default', id);
      await loadBrowsers();
    } catch (error) {
      console.error('设置默认浏览器失败:', error);
    }
  };

  const handleEditBrowser = (browser: BrowserConfig) => {
    // 系统默认浏览器不能编辑
    if (browser.id === 'default') {
      alert('系统默认浏览器不能编辑');
      return;
    }
    
    setEditingBrowser(browser);
    setNewBrowserName(browser.name);
    setNewBrowserPath(browser.path);
    setNewBrowserHomepage(browser.homepage || '');
    setIsAddingBrowser(true);
  };

  const handleCancelBrowser = () => {
    setIsAddingBrowser(false);
    setEditingBrowser(null);
    setNewBrowserName('');
    setNewBrowserPath('');
    setNewBrowserHomepage('');
  };

  const handleSaveBrowser = async () => {
    if (!newBrowserName.trim() || !newBrowserPath.trim()) {
      alert('请输入浏览器名称和路径');
      return;
    }

    try {
      if (editingBrowser) {
        // 更新浏览器
        await window.electron.invoke('browser-update', editingBrowser.id, {
          name: newBrowserName,
          path: newBrowserPath,
          homepage: newBrowserHomepage.trim() || undefined,
        });
      } else {
        // 添加新浏览器
        const newBrowser: BrowserConfig = {
          id: `browser-${Date.now()}`,
          name: newBrowserName,
          path: newBrowserPath,
          isDefault: false,
          homepage: newBrowserHomepage.trim() || undefined, // 选填
        };

        await window.electron.invoke('browser-add', newBrowser);
      }

      // 重置状态
      setIsAddingBrowser(false);
      setEditingBrowser(null);
      setNewBrowserName('');
      setNewBrowserPath('');
      setNewBrowserHomepage('');
      await loadBrowsers();
    } catch (error) {
      console.error('保存浏览器失败:', error);
    }
  };

  const handleAddBrowser = async () => {
    setIsAddingBrowser(true);
  };

  const handleDeleteBrowser = async (id: string) => {
    if (browsers.length <= 1) {
      alert('至少需要保留一个浏览器');
      return;
    }

    if (!confirm('确定要删除这个浏览器吗？')) {
      return;
    }

    try {
      await window.electron.invoke('browser-delete', id);
      await loadBrowsers();
    } catch (error) {
      console.error('删除浏览器失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧选项卡 */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">设置</h1>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('general')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                通用设置
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('browser')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'browser'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                浏览器
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('search-engines')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'search-engines'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索引擎
              </div>
            </button>

            <button
              onClick={() => setActiveTab('file')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'file'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                文件设置
              </div>
            </button>
            
            {appSettings.featureTranslation !== false && (
            <button
              onClick={() => setActiveTab('translate')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'translate'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                翻译设置
              </div>
            </button>
            )}
            
            <button
              onClick={() => setActiveTab('clipboard')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'clipboard'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                剪贴板设置
              </div>
            </button>
            
            {appSettings.featurePasswordGeneration !== false && (
              <button
                onClick={() => setActiveTab('password')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === 'password'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  密码生成设置
                </div>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'shortcuts'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                快捷键设置
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('aliases')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'aliases'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                命令别名
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('help')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'help'
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                帮助中心
              </div>
            </button>
            
          </nav>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {activeTab === 'browser' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">浏览器设置</h2>
              <p className="text-gray-600 mb-6">配置打开网页时使用的浏览器</p>

              {/* 浏览器列表 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 space-y-3">
                  {browsers.map((browser) => (
                    <div
                      key={browser.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="defaultBrowser"
                          checked={browser.isDefault}
                          onChange={() => handleSetDefault(browser.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{browser.name}</div>
                          <div className="text-sm text-gray-500">{browser.path || '系统默认'}</div>
                          {browser.homepage && (
                            <div className="text-xs text-blue-600 mt-0.5">书签: {browser.homepage}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {browser.id !== 'default' && (
                          <button
                            onClick={() => handleEditBrowser(browser)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            编辑
                          </button>
                        )}
                        {!browser.isDefault && browser.id !== 'default' && (
                          <button
                            onClick={() => handleDeleteBrowser(browser.id)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 添加/编辑浏览器 */}
              {isAddingBrowser ? (
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      {editingBrowser ? '编辑浏览器' : '添加浏览器'}
                    </h3>
                    <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        浏览器名称
                      </label>
                      <input
                        type="text"
                        placeholder="例如：Chrome, Firefox, Opera"
                        value={newBrowserName}
                        onChange={(e) => setNewBrowserName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        浏览器路径
                      </label>
                      <input
                        type="text"
                        placeholder="例如：/Applications/Google Chrome.app"
                        value={newBrowserPath}
                        onChange={(e) => setNewBrowserPath(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        书签地址 <span className="text-gray-400 text-xs">(选填)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="例如：https://www.example.com"
                        value={newBrowserHomepage}
                        onChange={(e) => setNewBrowserHomepage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSaveBrowser}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          {editingBrowser ? '保存' : '添加'}
                        </button>
                        <button
                          onClick={handleCancelBrowser}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <button
                    onClick={handleAddBrowser}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    + 添加浏览器
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search-engines' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">搜索引擎设置</h2>
              <p className="text-gray-600 mb-6">配置网页搜索的搜索引擎。系统会自动为每个搜索引擎生成对应的品牌 logo，无需手动上传图标。</p>
              
              {/* 搜索引擎列表 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">已配置的搜索引擎</h3>
                    {!isAddingEngine && (
                      <button
                        onClick={() => setIsAddingEngine(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        + 添加搜索引擎
                      </button>
                    )}
                  </div>
                  
                  {!isAddingEngine ? (
                    <div className="space-y-3">
                      {searchEngines.map((engine) => (
                        <div
                          key={engine.id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 flex items-center justify-center bg-purple-100 rounded-lg flex-shrink-0">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900 truncate">{engine.name}</span>
                                {engine.default && (
                                  <span className="px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                                    默认
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 truncate">{engine.url}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                            {!engine.default && (
                              <button
                                onClick={() => handleSetDefaultEngine(engine)}
                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                设为默认
                              </button>
                            )}
                            <button
                              onClick={() => handleEditEngine(engine)}
                              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteEngine(engine)}
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          搜索引擎名称
                        </label>
                        <input
                          type="text"
                          placeholder="例如：百度、Google"
                          value={newEngineName}
                          onChange={(e) => setNewEngineName(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL 模板
                        </label>
                        <input
                          type="text"
                          placeholder="例如：https://www.baidu.com/s?wd="
                          value={newEngineUrl}
                          onChange={(e) => setNewEngineUrl(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">使用 {`{query}`} 作为查询关键词占位符</p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSaveEngine}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          {editingEngine ? '保存' : '添加'}
                        </button>
                        <button
                          onClick={handleCancelEngine}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">文件设置</h2>
              <p className="text-gray-600 mb-6">配置文件搜索的索引范围和选项</p>

              {/* 文件搜索开关 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">搜索选项</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">启用文件搜索</div>
                        <div className="text-sm text-gray-500">关闭后将不会索引和搜索文件</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.fileSearchEnabled !== false}
                          onChange={async (e) => {
                            await updateSetting('fileSearchEnabled', e.target.checked);
                            // 如果关闭文件搜索，清除文件索引
                            if (!e.target.checked) {
                              try {
                                await window.electron.invoke('file-clear-index');
                              } catch (error) {
                                console.error('清除文件索引失败:', error);
                              }
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                  </div>
                </div>
              </div>

              {/* 自定义搜索目录 */}
              {appSettings.fileSearchEnabled !== false && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">自定义搜索目录</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      添加额外的搜索目录。默认目录（Documents、Downloads、Desktop）会始终被索引，自定义目录会追加到默认目录之后。
                    </p>

                    {/* 已添加的目录列表 */}
                    <div className="space-y-2 mb-4">
                      {fileSearchPaths.map((path, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{path}</div>
                          </div>
                          <button
                            onClick={async () => {
                              const newPaths = fileSearchPaths.filter((_, i) => i !== index);
                              setFileSearchPaths(newPaths);
                              await updateSetting('fileSearchPaths', newPaths);
                              // 触发重新索引
                              try {
                                await window.electron.invoke('file-index', newPaths.length > 0 ? newPaths : undefined);
                              } catch (error) {
                                console.error('重新索引失败:', error);
                              }
                            }}
                            className="ml-3 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 添加新目录 */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          添加目录路径
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            placeholder="例如：/Users/username/Projects"
                            value={newFilePath}
                            onChange={(e) => setNewFilePath(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            onClick={async () => {
                              if (!newFilePath.trim()) {
                                alert('请输入目录路径');
                                return;
                              }

                              // 检查是否已存在
                              if (fileSearchPaths.includes(newFilePath.trim())) {
                                alert('该路径已添加');
                                return;
                              }

                              const newPaths = [...fileSearchPaths, newFilePath.trim()];
                              setFileSearchPaths(newPaths);
                              setNewFilePath('');
                              await updateSetting('fileSearchPaths', newPaths);
                              // 触发重新索引（如果路径不存在，索引时会自动跳过）
                              try {
                                await window.electron.invoke('file-index', newPaths);
                              } catch (error) {
                                console.error('重新索引失败:', error);
                                alert('索引失败，请检查路径是否正确');
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            添加
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          输入要索引的目录完整路径。留空将使用默认目录
                        </p>
                      </div>

                      {/* 使用默认目录按钮 */}
                      {fileSearchPaths.length > 0 && (
                        <button
                          onClick={async () => {
                            setFileSearchPaths([]);
                            await updateSetting('fileSearchPaths', []);
                            // 触发重新索引（使用默认路径）
                            try {
                              await window.electron.invoke('file-index');
                            } catch (error) {
                              console.error('重新索引失败:', error);
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          恢复默认目录
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'general' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">通用设置</h2>
              <p className="text-gray-600 mb-6">配置应用的基本选项</p>

              {/* 启动设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">启动设置</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">开机自启动</div>
                        <div className="text-sm text-gray-500">系统启动时自动运行 Lumina</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.autoStart || false}
                          onChange={(e) => updateSetting('autoStart', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">启动时最小化到托盘</div>
                        <div className="text-sm text-gray-500">启动后自动隐藏到系统托盘</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.minimizeToTray !== false}
                          onChange={(e) => updateSetting('minimizeToTray', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">快速启动</div>
                        <div className="text-sm text-gray-500">优先从缓存加载数据</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.fastStart !== false}
                          onChange={(e) => updateSetting('fastStart', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 预览窗口设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">预览窗口设置</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">启用预览窗口</div>
                        <div className="text-sm text-gray-500">选择搜索结果时在右侧显示详细信息预览</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.previewWindowEnabled !== false}
                          onChange={(e) => updateSetting('previewWindowEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 开发者设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">开发者设置</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">开发者模式</div>
                        <div className="text-sm text-gray-500">开启后将记录所有 debug 日志到 run_debug.log 文件</div>
                        {appSettings.developerMode && logFilePath && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="text-xs text-gray-600 mb-1">日志文件路径：</div>
                            <div className="text-xs font-mono text-blue-600 break-all">{logFilePath}</div>
                          </div>
                        )}
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={appSettings.developerMode || false}
                          onChange={(e) => updateSetting('developerMode', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 功能开关设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">功能开关</h3>
                  <p className="text-sm text-gray-500 mb-4">控制各个功能的启用或关闭</p>
                  <div className="space-y-4">
                    {/* 密码生成功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">密码生成（pwd/password/密码）</div>
                        <div className="text-sm text-gray-500">快速生成多个安全密码</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featurePasswordGeneration !== false}
                          onChange={(e) => updateSetting('featurePasswordGeneration', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* UUID 生成功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">UUID 生成</div>
                        <div className="text-sm text-gray-500">生成 UUID v1 或 v4</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureUuidGeneration !== false}
                          onChange={(e) => updateSetting('featureUuidGeneration', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 随机字符串功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">随机字符串</div>
                        <div className="text-sm text-gray-500">生成指定长度的随机字符串</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureRandomString !== false}
                          onChange={(e) => updateSetting('featureRandomString', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 随机密码功能（旧格式） */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100" style={{ display: 'none' }}>
                      <div>
                        <div className="font-medium text-gray-900">随机密码（旧格式）</div>
                        <div className="text-sm text-gray-500">random password 格式的密码生成</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureRandomPassword !== false}
                          onChange={(e) => updateSetting('featureRandomPassword', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 随机数字功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">随机数字</div>
                        <div className="text-sm text-gray-500">生成指定范围内的随机整数</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureRandomNumber !== false}
                          onChange={(e) => updateSetting('featureRandomNumber', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 编码解码功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">编码解码</div>
                        <div className="text-sm text-gray-500">URL、HTML、Base64 编码/解码，MD5 加密</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureEncodeDecode !== false}
                          onChange={(e) => updateSetting('featureEncodeDecode', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 字符串工具功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">字符串工具</div>
                        <div className="text-sm text-gray-500">大小写转换、命名格式转换、反转、统计等</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureStringTools !== false}
                          onChange={(e) => updateSetting('featureStringTools', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 时间工具功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">时间工具</div>
                        <div className="text-sm text-gray-500">时间查询、时间戳转换、时间计算、时区转换</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureTimeTools !== false}
                          onChange={(e) => updateSetting('featureTimeTools', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 翻译功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">翻译功能</div>
                        <div className="text-sm text-gray-500">多语言翻译（需要配置百度翻译 API）</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureTranslation !== false}
                          onChange={(e) => updateSetting('featureTranslation', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 变量名生成功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">变量名生成</div>
                        <div className="text-sm text-gray-500">根据描述生成多种命名风格的变量名</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureVariableName !== false}
                          onChange={(e) => updateSetting('featureVariableName', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 计算器功能 */}
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">计算器</div>
                        <div className="text-sm text-gray-500">数学计算、科学函数</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureCalculator !== false}
                          onChange={(e) => updateSetting('featureCalculator', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* TODO 管理功能 */}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-gray-900">TODO 管理</div>
                        <div className="text-sm text-gray-500">任务创建、查询、完成、删除、编辑和搜索</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={appSettings.featureTodo !== false}
                          onChange={(e) => updateSetting('featureTodo', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {/* 使用说明 */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
                        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                          <li>关闭某个功能后，该功能将不再响应相关查询</li>
                          <li>关闭功能可以减少不必要的处理，提高搜索速度</li>
                          <li>所有功能默认启用，可根据需要关闭不需要的功能</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 重置设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">其他设置</h3>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">全局快捷键：<span className="font-mono bg-gray-100 px-2 py-1 rounded">{appSettings.globalShortcut || 'Shift+Space'}</span></p>
                      <p className="text-gray-500">可在"快捷键设置"标签页中自定义</p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={async () => {
                          if (confirm('确定要重置所有设置吗？')) {
                            try {
                              await window.electron.settings.reset();
                              await loadSettings();
                              alert('设置已重置为默认值');
                            } catch (error) {
                              console.error('重置设置失败:', error);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                      >
                        重置为默认值
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">快捷键设置</h2>
              <p className="text-gray-600 mb-6">自定义全局快捷键</p>
              
              {/* 全局快捷键设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">全局快捷键</h3>
                <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        打开搜索窗口
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          id="shortcut-input"
                          value={appSettings.globalShortcut || 'Shift+Space'}
                          onChange={() => {
                            // 允许手动输入，但不自动保存
                            // 用户可以通过按下快捷键或手动输入后按 Enter 来保存
                          }}
                          onKeyDown={async (e) => {
                            const input = e.target as HTMLInputElement;
                            
                            // 如果按下了修饰键，说明用户想要捕获快捷键
                            if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
                              e.preventDefault();
                              const parts: string[] = [];
                              
                              // 检测修饰键
                              // macOS: metaKey = Command, altKey = Option
                              // Windows/Linux: metaKey = Windows key, ctrlKey = Control, altKey = Alt
                              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                              if (e.metaKey) parts.push(isMac ? 'Command' : 'Control');
                              if (e.ctrlKey && !isMac) parts.push('Control'); // macOS 上 ctrlKey 通常不使用
                              if (e.altKey) parts.push(isMac ? 'Option' : 'Alt');
                              if (e.shiftKey) parts.push('Shift');
                              
                              // 检测普通键
                              if (e.key && e.key.length === 1 && /[A-Z0-9]/.test(e.key.toUpperCase())) {
                                parts.push(e.key.toUpperCase());
                              } else if (e.key === ' ') {
                                parts.push('Space');
                              } else if (e.key === 'Enter' || e.key === 'Return') {
                                parts.push('Enter');
                              } else if (e.key === 'Tab') {
                                parts.push('Tab');
                              } else if (e.key === 'Escape' || e.key === 'Esc') {
                                parts.push('Escape');
                              } else if (e.key.startsWith('F') && /^F[1-9]|F1[0-2]$/.test(e.key)) {
                                parts.push(e.key);
                              } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                parts.push(e.key.replace('Arrow', ''));
                              } else if (e.key === 'Backspace') {
                                parts.push('Backspace');
                              } else if (e.key === 'Delete') {
                                parts.push('Delete');
                              }
                              
                              // 如果有修饰键和普通键，组合成快捷键
                              if (parts.length >= 2) {
                                const newShortcut = parts.join('+');
                                input.value = newShortcut;
                                
                                // 自动保存
                                try {
                                  const { available } = await window.electron.shortcut.checkAvailable(newShortcut);
                                  if (!available && newShortcut !== (appSettings.globalShortcut || 'Shift+Space')) {
                                    alert('该快捷键已被占用，请选择其他快捷键');
                                    return;
                                  }
                                  const { success } = await window.electron.shortcut.set(newShortcut);
                                  if (success) {
                                    await updateSetting('globalShortcut', newShortcut);
                                    // 不显示 alert，避免打断用户体验
                                  } else {
                                    alert('快捷键设置失败，请检查格式');
                                  }
                                } catch (error) {
                                  console.error('设置快捷键失败:', error);
                                  alert('设置快捷键失败');
                                }
                              }
                            } else if (e.key === 'Enter') {
                              // 手动输入后按 Enter 保存
                              e.preventDefault();
                              const newShortcut = input.value.trim();
                              if (newShortcut && newShortcut !== (appSettings.globalShortcut || 'Shift+Space')) {
                                try {
                                  const { available } = await window.electron.shortcut.checkAvailable(newShortcut);
                                  if (!available) {
                                    alert('该快捷键已被占用，请选择其他快捷键');
                                    return;
                                  }
                                  const { success } = await window.electron.shortcut.set(newShortcut);
                                  if (success) {
                                    await updateSetting('globalShortcut', newShortcut);
                                    alert('快捷键设置成功！');
                                  } else {
                                    alert('快捷键设置失败，请检查格式');
                                  }
                                } catch (error) {
                                  console.error('设置快捷键失败:', error);
                                  alert('设置快捷键失败');
                                }
                              }
                            }
                          }}
                          placeholder="点击输入框后按下快捷键，或手动输入（例如: Shift+Space）"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        />
                        <button
                          onClick={async () => {
                            try {
                              const { shortcut, formatted } = await window.electron.shortcut.getCurrent();
                              if (shortcut) {
                                alert(`当前快捷键: ${formatted || shortcut}`);
                              } else {
                                alert('当前未设置快捷键');
                              }
                            } catch (error) {
                              console.error('获取快捷键失败:', error);
                            }
                          }}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          查看当前
                        </button>
                    </div>
                      <p className="mt-2 text-sm text-gray-500">
                        💡 提示：点击输入框后直接按下快捷键即可自动设置，或手动输入格式（例如: Shift+Space, Ctrl+Shift+K）
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        支持的修饰键：Shift, Ctrl, Alt, Option, Command/Cmd, Super, Meta
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'aliases' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">命令别名</h2>
              <p className="text-gray-600 mb-6">为常用应用、命令或搜索设置快捷别名</p>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">别名列表</h3>
                    <button
                      onClick={() => {
                        handleCancelAlias();
                        setIsAddingAlias(true);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      + 添加别名
                    </button>
                  </div>

                  {/* 别名列表 */}
                  {aliases.length > 0 ? (
                    <div className="space-y-2">
                      {aliases.map((alias) => (
                        <div key={alias.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-medium text-blue-600">{alias.name}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-700">{alias.command}</span>
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {alias.type}
                              </span>
                            </div>
                            {alias.description && (
                              <div className="text-sm text-gray-500 mt-1">{alias.description}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">使用 {alias.useCount || 0} 次</div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditAlias(alias)}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteAlias(alias.name)}
                              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      暂无别名，点击"添加别名"创建第一个别名
                    </div>
                  )}
                </div>
              </div>

              {/* 添加/编辑别名 */}
              {isAddingAlias && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="p-6">
                    <h3 className="text-lg font-medium mb-4">
                      {editingAlias ? '编辑别名' : '添加别名'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          别名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例如: g, c, chrome"
                          value={newAliasName}
                          onChange={(e) => setNewAliasName(e.target.value)}
                          disabled={!!editingAlias}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                        />
                        <p className="mt-1 text-sm text-gray-500">简短易记的别名，用于快速访问</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          命令 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例如: google, chrome, 或完整的搜索命令"
                          value={newAliasCommand}
                          onChange={(e) => setNewAliasCommand(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-sm text-gray-500">实际执行的命令或应用名称</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          类型
                        </label>
                        <select
                          value={newAliasType}
                          onChange={(e) => setNewAliasType(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="app">应用</option>
                          <option value="web">网页搜索</option>
                          <option value="command">命令</option>
                          <option value="search">搜索</option>
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                          app: 启动应用 | web: 网页搜索（支持命令链，如 "g 搜索词"）| command: 系统命令 | search: 通用搜索
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          描述 <span className="text-gray-400">(选填)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="例如: 打开 Google 搜索"
                          value={newAliasDescription}
                          onChange={(e) => setNewAliasDescription(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex space-x-3 pt-4">
                        <button
                          onClick={handleSaveAlias}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          {editingAlias ? '保存' : '添加'}
                        </button>
                        <button
                          onClick={handleCancelAlias}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 使用说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>别名用于快速访问常用应用、命令或搜索</li>
                  <li>例如：设置别名 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">g</code> → <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">google</code></li>
                  <li>输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">g</code> 可快速打开 Google</li>
                  <li>输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">g 搜索词</code> 可在 Google 搜索（命令链功能）</li>
                  <li>网页搜索类型支持命令链，应用类型不支持参数</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'translate' && appSettings.featureTranslation !== false && (
            <div>
              <h2 className="text-2xl font-bold mb-2">翻译设置</h2>
              <p className="text-gray-600 mb-6">配置百度翻译 API 的 AppID 和 Secret Key</p>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      百度翻译 AppID
                    </label>
                    <input
                      type="text"
                      value={appSettings.baiduTranslateAppId || ''}
                      onChange={(e) => updateSetting('baiduTranslateAppId', e.target.value)}
                      placeholder="请输入百度翻译 AppID"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      在 <a href="https://fanyi-api.baidu.com/manage/developer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">百度翻译开放平台</a> 申请获取
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      百度翻译 Secret Key
                    </label>
                    <input
                      type="password"
                      value={appSettings.baiduTranslateSecretKey || ''}
                      onChange={(e) => updateSetting('baiduTranslateSecretKey', e.target.value)}
                      placeholder="请输入百度翻译 Secret Key"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      与 AppID 对应的密钥，请妥善保管
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>必须配置 AppID 和 Secret Key 才能使用翻译功能</li>
                        <li>如果未配置，触发翻译时将提示"请在设置中配置翻译参数"</li>
                        <li>修改配置后，新的翻译请求将立即生效</li>
                        <li>请确保您的 AppID 和 Secret Key 有效且有足够的调用额度</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clipboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">剪贴板设置</h2>
              <p className="text-gray-600 mb-6">配置剪贴板历史记录功能</p>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-6">
                  {/* 启用剪贴板历史 */}
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-gray-900">启用剪贴板历史</div>
                      <div className="text-sm text-gray-500">开启后自动记录复制的内容</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appSettings.clipboardEnabled !== false}
                        onChange={(e) => updateSetting('clipboardEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {/* 最大记录数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      最大记录数
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={appSettings.clipboardMaxItems || 50}
                      onChange={(e) => updateSetting('clipboardMaxItems', parseInt(e.target.value) || 50)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      建议值：20-100 条。超出此数量的旧记录将自动删除。
                    </p>
                  </div>
                  
                  {/* 保留天数 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      保留天数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={appSettings.clipboardRetentionDays || 7}
                      onChange={(e) => updateSetting('clipboardRetentionDays', parseInt(e.target.value) || 7)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      建议值：3-30 天。超过此天数的记录将自动清理。
                    </p>
                  </div>
                  
                  {/* 使用说明 */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>在搜索框中输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">clip</code> 或 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">剪贴板</code> 查看历史记录</li>
                        <li>输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">clip 关键词</code> 可以搜索历史记录</li>
                        <li>选择历史记录后按 Enter 键快速粘贴</li>
                        <li>所有数据仅存储在本地，不会上传到任何服务器</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'password' && appSettings.featurePasswordGeneration !== false && (
            <div>
              <h2 className="text-2xl font-bold mb-2">密码生成设置</h2>
              <p className="text-gray-600 mb-6">配置密码生成的默认规则</p>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-6">
                  {/* 默认密码长度 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认密码长度
                    </label>
                    <input
                      type="number"
                      min="4"
                      max="1000"
                      value={appSettings.passwordDefaultLength || 16}
                      onChange={(e) => updateSetting('passwordDefaultLength', parseInt(e.target.value) || 16)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      建议值：12-32 位。当输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">pwd</code> 时使用此长度。
                    </p>
                  </div>
                  
                  {/* 默认生成数量 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      默认生成数量
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={appSettings.passwordDefaultCount || 10}
                      onChange={(e) => updateSetting('passwordDefaultCount', parseInt(e.target.value) || 10)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      建议值：5-20 个。每次生成密码时默认生成的数量。
                    </p>
                  </div>
                  
                  {/* 字符集设置 */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      包含字符类型
                    </label>
                    <div className="space-y-3">
                      {/* 小写字母 */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-gray-900">小写字母 (a-z)</div>
                          <div className="text-sm text-gray-500">包含小写英文字母</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={appSettings.passwordIncludeLowercase ?? true}
                            onChange={(e) => updateSetting('passwordIncludeLowercase', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      {/* 大写字母 */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-gray-900">大写字母 (A-Z)</div>
                          <div className="text-sm text-gray-500">包含大写英文字母</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={appSettings.passwordIncludeUppercase ?? true}
                            onChange={(e) => updateSetting('passwordIncludeUppercase', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      {/* 数字 */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-gray-900">数字 (0-9)</div>
                          <div className="text-sm text-gray-500">包含数字字符</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={appSettings.passwordIncludeNumbers ?? true}
                            onChange={(e) => updateSetting('passwordIncludeNumbers', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      {/* 特殊字符 */}
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-gray-900">特殊字符 (!@#$%...)</div>
                          <div className="text-sm text-gray-500">包含特殊符号</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={appSettings.passwordIncludeSpecial ?? true}
                            onChange={(e) => updateSetting('passwordIncludeSpecial', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* 使用说明 */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-blue-900 mb-2">使用说明</h3>
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li>在搜索框中输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">pwd</code>、<code className="px-1 py-0.5 bg-blue-100 rounded text-xs">password</code> 或 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">密码</code> 生成密码</li>
                        <li>输入 <code className="px-1 py-0.5 bg-blue-100 rounded text-xs">pwd 20</code> 可以指定密码长度为 20 位</li>
                        <li>默认生成 10 个密码，每个密码是一个结果选项，可以选择任意一个复制</li>
                        <li>密码生成规则可在本页面配置，包括长度、数量和字符类型</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div>
              <h2 className="text-2xl font-bold mb-2">帮助中心</h2>
              <p className="text-gray-600 mb-6">了解如何使用 Lumina（快搜）</p>

              {/* 基本使用 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">基本使用</h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div>
                      <div className="font-medium text-gray-900 mb-1">1. 打开搜索</div>
                      <p className="text-gray-600">使用快捷键 <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Command+Space</kbd> (Mac) 或 <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Alt+Space</kbd> (Windows/Linux)</p>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 mb-1">2. 输入关键词搜索</div>
                      <p className="text-gray-600">支持搜索应用、文件、书签、网页等</p>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 mb-1">3. 选择结果</div>
                      <p className="text-gray-600">使用上下箭头键选择，回车或鼠标点击打开</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 搜索功能 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">搜索功能</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">应用搜索</div>
                      <p className="text-xs text-gray-600 mb-2">快速搜索已安装的应用，支持：</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                        <li>应用名称模糊匹配（支持中文、英文、拼音）</li>
                        <li>智能排序（精确匹配优先，使用频率排序）</li>
                        <li>自动提取应用图标</li>
                        <li>跨平台支持（macOS Spotlight、Windows Start Menu、Linux .desktop）</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">文件搜索</div>
                      <p className="text-xs text-gray-600 mb-2">搜索本地文件和文件夹，支持：</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                        <li>输入 <code className="px-1 py-0.5 bg-white rounded text-xs">file 文件名</code> 进行搜索</li>
                        <li>使用系统原生搜索 API（Spotlight、Everything、locate）</li>
                        <li>自定义搜索路径和范围</li>
                        <li>实时搜索，无需预索引</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">书签搜索</div>
                      <p className="text-xs text-gray-600 mb-2">搜索浏览器收藏的书签，支持：</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                        <li>自动检测多浏览器（Chrome、Safari、Firefox、Edge、Brave 等）</li>
                        <li>多用户配置文件自动加载</li>
                        <li>支持标题和 URL 搜索</li>
                        <li>实时同步，自动检测书签变化</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">网页搜索</div>
                      <p className="text-xs text-gray-600 mb-2">快速访问搜索引擎，支持：</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                        <li>多个搜索引擎（百度、谷歌、必应、GitHub、知乎等）</li>
                        <li>自动识别图标：系统会自动为每个搜索引擎生成对应的品牌 logo</li>
                        <li>自定义搜索引擎（只需配置名称和 URL 模板）</li>
                        <li>历史记录追踪常用网站</li>
                        <li>快捷键快速切换引擎</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 命令列表 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">系统命令</h3>
                  <div className="space-y-3">
                    <CommandItem name="锁屏" shortcut="lock" description="锁定屏幕" />
                    <CommandItem name="睡眠" description="进入睡眠模式" />
                    <CommandItem name="重启" description="重启计算机" />
                    <CommandItem name="关机" description="关闭计算机" />
                  </div>
                </div>
              </div>

              {/* 媒体控制 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">媒体控制</h3>
                  <div className="space-y-3">
                    <CommandItem name="静音" shortcut="mute" description="切换静音" />
                    <CommandItem name="音量+" shortcut="vol+" description="增加音量" />
                    <CommandItem name="音量-" shortcut="vol-" description="减小音量" />
                    <CommandItem name="播放/暂停" shortcut="play" description="播放或暂停媒体" />
                  </div>
                </div>
              </div>

              {/* 应用启动 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">应用启动</h3>
                  <div className="space-y-3">
                    <CommandItem name="系统设置" description="打开系统设置" />
                    <CommandItem name="文件管理器" description="打开文件管理器" />
                    <CommandItem name="终端" description="打开终端" />
                    <CommandItem name="计算器" description="打开计算器" />
                  </div>
                </div>
              </div>

              {/* 计算器 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">计算器功能</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">基本运算</div>
                      <div className="flex flex-wrap gap-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">1+1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">10*20</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">(3+5)/2</code>
                      </div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">科学函数</div>
                      <div className="flex flex-wrap gap-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">sqrt(16)</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">sin(30)</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">log(100)</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 时间转换 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">时间转换</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">当前时间查询</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">time</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">时间</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">date</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">now</code>
                      </div>
                      <p className="text-xs text-gray-600">显示当前时间的多种格式（标准格式、中文格式、ISO、时间戳等）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">时间戳转换</div>
                      <div className="text-xs text-gray-600 mb-2">时间戳转日期</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">date 1705312245</code>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">日期转时间戳</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">ts 2024-01-15</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">timestamp 2024-01-15</code>
                      </div>
                      <p className="text-xs text-gray-600">时间戳与日期互转，支持秒级和毫秒级时间戳</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">时间计算</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">2024-01-15 - 2024-01-10</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">2024-01-15 + 2 days</code>
                      </div>
                      <p className="text-xs text-gray-600">计算时间差或时间加减（支持天、小时、分钟、秒）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">时区转换</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">UTC 2024-01-15</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">EST 2024-01-15</code>
                      </div>
                      <p className="text-xs text-gray-600">支持 UTC、CST、EST、PST、JST 等时区转换</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 编码解码 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">编码解码</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">URL 编码/解码</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">url encode hello world</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">url decode hello%20world</code>
                      </div>
                      <p className="text-xs text-gray-600">URL 编码和解码，支持中文和特殊字符</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">HTML 编码/解码</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">html encode &lt;div&gt;</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">html decode &amp;lt;div&amp;gt;</code>
                      </div>
                      <p className="text-xs text-gray-600">HTML 实体编码和解码，防止 XSS 攻击</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">Base64 编码/解码</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">base64 encode hello</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">base64 decode aGVsbG8=</code>
                      </div>
                      <p className="text-xs text-gray-600">Base64 编码和解码，支持中文</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">MD5 加密</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">md5 hello</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">hello md5</code>
                      </div>
                      <p className="text-xs text-gray-600">计算字符串的 MD5 哈希值（32位十六进制）</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 字符串工具 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">字符串工具</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">大小写转换</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">uppercase hello</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">lowercase HELLO</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">title case hello world</code>
                      </div>
                      <p className="text-xs text-gray-600">转换为大写、小写或标题格式（首字母大写）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">命名格式转换</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">camel case hello world</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">snake case hello world</code>
                      </div>
                      <p className="text-xs text-gray-600">转换为驼峰命名（helloWorld）或蛇形命名（hello_world）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">字符串操作</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">reverse abc</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">trim " hello "</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">trim all "hello world"</code>
                      </div>
                      <p className="text-xs text-gray-600">字符串反转、去除首尾空格或所有空格</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">文本统计</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">count hello world</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">word count text</code>
                      </div>
                      <p className="text-xs text-gray-600">统计字符数、单词数、行数、段落数等</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">字符串替换</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">replace hello world hello hi</code>
                      </div>
                      <p className="text-xs text-gray-600">替换字符串中的指定文本</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">正则提取</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">extract hello123 \d+</code>
                      </div>
                      <p className="text-xs text-gray-600">使用正则表达式提取匹配的内容</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 翻译功能 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">翻译功能</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">基础翻译</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">translate hello</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">翻译 你好</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">hello 翻译</code>
                      </div>
                      <p className="text-xs text-gray-600">自动检测语言并翻译，默认中英文互译</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">快捷翻译</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">en 你好</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">zh hello</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">cn hello world</code>
                      </div>
                      <p className="text-xs text-gray-600">快速翻译为英文或中文</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">指定目标语言</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">translate hello to 中文</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">你好 to English</code>
                      </div>
                      <p className="text-xs text-gray-600">指定翻译的目标语言</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 变量名生成 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">变量名生成</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">基础生成</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">varname 用户名称</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">变量名 订单列表</code>
                      </div>
                      <p className="text-xs text-gray-600">生成所有命名风格的变量名（camelCase、snake_case、PascalCase、CONSTANT_CASE、kebab-case）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">指定风格</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">camel 用户名称</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">snake 订单ID</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">pascal 商品价格</code>
                      </div>
                      <p className="text-xs text-gray-600">直接生成指定命名风格的变量名</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">混合输入</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">varname user name</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">varname 用户User名称</code>
                      </div>
                      <p className="text-xs text-gray-600">支持中英文混合输入，自动识别并转换</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 随机数生成 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">随机数生成</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">UUID 生成</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">uuid</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">generate uuid</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">uuid v1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">uuid v4</code>
                      </div>
                      <p className="text-xs text-gray-600">生成 UUID v4（随机）或 v1（基于时间）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">随机字符串</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">random string 16</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">16 random string</code>
                      </div>
                      <p className="text-xs text-gray-600">生成指定长度的随机字符串（字母+数字）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">随机密码（旧格式）</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">random password 20</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">20 random password</code>
                      </div>
                      <p className="text-xs text-gray-600">生成指定长度的随机密码（包含大小写字母、数字、特殊字符）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">密码生成（新功能）</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">pwd</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">pwd 20</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">password</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">密码</code>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">快速生成多个安全密码，默认生成 10 个，每个密码是一个结果选项，可选择任意一个复制</p>
                      <p className="text-xs text-gray-500">• 输入 <code className="px-1 py-0.5 bg-white rounded text-xs">pwd</code> 使用默认长度生成密码</p>
                      <p className="text-xs text-gray-500">• 输入 <code className="px-1 py-0.5 bg-white rounded text-xs">pwd 20</code> 生成 20 位长度的密码</p>
                      <p className="text-xs text-gray-500">• 可在设置中配置默认长度、生成数量和字符类型（大小写字母、数字、特殊字符）</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">随机数字</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">random number 1 100</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">random number 100</code>
                      </div>
                      <p className="text-xs text-gray-600">生成指定范围内的随机整数（如：1-100 或 0-100）</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* IP 网络信息 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">IP 网络信息</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">查看网络信息</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">ip</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">查看ip</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">网络信息</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">network</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">ipinfo</code>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">快速查看网络信息，包括：</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                        <li>内网IP地址（自动检测所有网卡）</li>
                        <li>外网IP地址（通过外部API获取，可能需要几秒钟）</li>
                        <li>默认网关（通过系统命令获取）</li>
                        <li>DNS服务器（系统配置的DNS服务器）</li>
                      </ul>
                      <p className="text-xs text-gray-500 mt-2">• 每个信息作为独立结果项，点击即可复制</p>
                      <p className="text-xs text-gray-500">• 复制时自动提取IP地址部分（如"内网IP: 192.168.1.100"只复制"192.168.1.100"）</p>
                      <p className="text-xs text-gray-500">• 支持跨平台（macOS、Windows、Linux）</p>
                    </div>
                  </div>
                </div>
              </div>
 

              {/* TODO 管理 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">TODO 管理</h3>
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">创建任务</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">todo 完成项目文档</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">待办 明天开会准备材料</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo 修复bug #high</code>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">快速创建待办事项，支持设置优先级</p>
                      <p className="text-xs text-gray-500">• 使用 <code className="px-1 py-0.5 bg-white rounded text-xs">#high</code>、<code className="px-1 py-0.5 bg-white rounded text-xs">#medium</code>、<code className="px-1 py-0.5 bg-white rounded text-xs">#low</code> 标记优先级</p>
                      <p className="text-xs text-gray-500">• 优先级通过红绿灯图标显示：🔴 高优先级、🟡 中优先级、🟢 低优先级</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">查询任务</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">todo</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo all</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo done</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo search 项目</code>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">查看任务列表，支持筛选和搜索</p>
                      <p className="text-xs text-gray-500">• <code className="px-1 py-0.5 bg-white rounded text-xs">todo</code> 查看所有未完成任务</p>
                      <p className="text-xs text-gray-500">• <code className="px-1 py-0.5 bg-white rounded text-xs">todo all</code> 查看所有任务（包括已完成）</p>
                      <p className="text-xs text-gray-500">• <code className="px-1 py-0.5 bg-white rounded text-xs">todo done</code> 查看已完成任务</p>
                      <p className="text-xs text-gray-500">• <code className="px-1 py-0.5 bg-white rounded text-xs">todo search 关键词</code> 搜索任务</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">完成任务</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">todo done 1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo complete 1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">done 1</code>
                      </div>
                      <p className="text-xs text-gray-600">标记任务为已完成，记录完成时间</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">删除任务</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">todo delete 1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo remove 1</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo del 1</code>
                      </div>
                      <p className="text-xs text-gray-600">删除不需要的任务，删除前会提示确认</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">编辑任务</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">todo edit 1 新内容</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">todo edit 1 内容 --priority high</code>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">修改任务内容和优先级</p>
                      <p className="text-xs text-gray-500">• 使用 <code className="px-1 py-0.5 bg-white rounded text-xs">--priority high|medium|low</code> 参数修改优先级</p>
                      <p className="text-xs text-gray-500">• 优先级作为独立参数，不会混入任务内容</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">预览窗口快速操作</div>
                      <p className="text-xs text-gray-600 mb-2">选择任务后，在右侧预览窗口可以：</p>
                      <p className="text-xs text-gray-500">• 快速修改优先级：点击"设为高/中/低"按钮</p>
                      <p className="text-xs text-gray-500">• 标记完成：点击"标记为已完成"或"完成"按钮</p>
                      <p className="text-xs text-gray-500">• 删除任务：点击"删除"按钮（会提示确认）</p>
                      <p className="text-xs text-gray-500">• 查看详细信息：任务 ID、内容、优先级、状态、创建时间、完成时间</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">智能补全</div>
                      <p className="text-xs text-gray-600 mb-2">输入过程中自动显示命令提示和任务模板建议</p>
                      <p className="text-xs text-gray-500">• 输入 <code className="px-1 py-0.5 bg-white rounded text-xs">todo</code> 显示所有可用命令</p>
                      <p className="text-xs text-gray-500">• 输入 <code className="px-1 py-0.5 bg-white rounded text-xs">todo 2</code> 显示"创建任务 2，回车确认"提示</p>
                      <p className="text-xs text-gray-500">• 输入 <code className="px-1 py-0.5 bg-white rounded text-xs">todo delete 6</code> 显示任务详情和确认提示</p>
                      <p className="text-xs text-gray-500">• 自动检查任务 ID 是否存在，提供友好提示</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">优先级图标</div>
                      <p className="text-xs text-gray-600 mb-2">优先级通过红绿灯样式的图标显示，直观易识别：</p>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="#DC2626" stroke="#991B1B" strokeWidth="0.5"/>
                            <circle cx="8" cy="8" r="4" fill="#FEE2E2" opacity="0.3"/>
                          </svg>
                          <span className="text-xs text-gray-700">高优先级</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="#D97706" stroke="#92400E" strokeWidth="0.5"/>
                            <circle cx="8" cy="8" r="4" fill="#FEF3C7" opacity="0.3"/>
                          </svg>
                          <span className="text-xs text-gray-700">中优先级</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" fill="#059669" stroke="#047857" strokeWidth="0.5"/>
                            <circle cx="8" cy="8" r="4" fill="#D1FAE5" opacity="0.3"/>
                          </svg>
                          <span className="text-xs text-gray-700">低优先级</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">图标显示在搜索结果列表和预览窗口中，颜色清晰，易于识别</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
