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

type TabType = 'browser' | 'search-engines' | 'file' | 'general' | 'translate' | 'clipboard' | 'help' | 'shortcuts';

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
  const [newEngineIcon, setNewEngineIcon] = useState('');
  const [appSettings, setAppSettings] = useState<any>({});
  const [fileSearchPaths, setFileSearchPaths] = useState<string[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const [logFilePath, setLogFilePath] = useState<string>('');
  
  useEffect(() => {
    loadBrowsers();
    loadSearchEngines();
    loadSettings();
    
    // 监听来自主进程的标签切换消息
    const handleTabSwitch = (tab: TabType) => {
      setActiveTab(tab);
    };
    
    window.electron.on('settings-switch-tab', handleTabSwitch);
    
    return () => {
      window.electron.removeListener('settings-switch-tab', handleTabSwitch);
    };
  }, []);
  
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
      setAppSettings({ ...appSettings, [key]: value });
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
    setNewEngineIcon(engine.icon || '');
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
          icon: newEngineIcon || undefined,
        });
      } else {
        // 添加新引擎
        await window.electron.invoke('web-add-engine', {
          name: newEngineName,
          url: newEngineUrl,
          icon: newEngineIcon || undefined,
          default: false,
        });
      }
      
      // 重置状态
      setIsAddingEngine(false);
      setEditingEngine(null);
      setNewEngineName('');
      setNewEngineUrl('');
      setNewEngineIcon('');
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
    setNewEngineIcon('');
  };

  // 处理图片选择并转换为 base64
  const handleIconSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setNewEngineIcon(base64String);
    };
    reader.onerror = () => {
      alert('读取图片失败');
    };
    reader.readAsDataURL(file);
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
              <p className="text-gray-600 mb-6">配置网页搜索的搜索引擎</p>
              
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          图标（可选）
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleIconSelect}
                            className="hidden"
                            id="icon-upload"
                          />
                          <label
                            htmlFor="icon-upload"
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                          >
                            选择图标
                          </label>
                          {newEngineIcon && (
                            <div className="flex items-center space-x-2">
                              <img src={newEngineIcon} alt="预览" className="w-8 h-8 rounded" />
                              <button
                                onClick={() => setNewEngineIcon('')}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                清除
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">支持 PNG、JPG、SVG 格式，建议尺寸 24x24 或 48x48</p>
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

              {/* 重置设置 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">其他设置</h3>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">全局快捷键：<span className="font-mono bg-gray-100 px-2 py-1 rounded">Shift+Space</span></p>
                      <p className="text-gray-500">快捷键已固定为 Shift+Space</p>
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
              <h2 className="text-2xl font-bold mb-2">快捷键</h2>
              <p className="text-gray-600 mb-6">查看和自定义快捷键</p>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <div className="font-medium">打开搜索</div>
                      <div className="text-sm text-gray-500">启动或切换主窗口</div>
                    </div>
                    <kbd className="px-3 py-1.5 bg-gray-100 rounded text-sm font-mono">
                      ⌘ Space
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'translate' && (
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
                        <li>多个搜索引擎（百度、谷歌、必应、DuckDuckGo 等）</li>
                        <li>自定义搜索引擎</li>
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
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 mb-2">单位换算</div>
                      <div className="flex flex-wrap gap-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">100km to m</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">32f to c</code>
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
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">timestamp 1705312245</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">1705312245 to date</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">2024-01-15 to timestamp</code>
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
                        <code className="px-2 py-1 bg-white rounded text-xs">2024-01-15 to UTC</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">2024-01-15 CST to EST</code>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
                      <div className="font-medium text-gray-900 mb-2">随机密码</div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <code className="px-2 py-1 bg-white rounded text-xs">random password 20</code>
                        <code className="px-2 py-1 bg-white rounded text-xs">20 random password</code>
                      </div>
                      <p className="text-xs text-gray-600">生成指定长度的随机密码（包含大小写字母、数字、特殊字符）</p>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
