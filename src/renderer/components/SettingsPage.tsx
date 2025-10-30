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

type TabType = 'browser' | 'search-engines' | 'file' | 'general' | 'help';

export const SettingsPage: React.FC<SettingsPageProps> = () => {
  const [activeTab, setActiveTab] = useState<TabType>('browser');
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
  
  useEffect(() => {
    loadBrowsers();
    loadSearchEngines();
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const settings = await window.electron.settings.getAll();
      setAppSettings(settings);
      // 加载文件搜索路径
      if (settings.fileSearchPaths && Array.isArray(settings.fileSearchPaths)) {
        setFileSearchPaths(settings.fileSearchPaths);
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
