import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/MainLayout';
import { SettingsPage } from './components/SettingsPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(() => {
    // 初始检查 URL hash
    return window.location.hash;
  });
  
  useEffect(() => {
    // 监听 hash 变化
    const handleHashChange = () => {
      setCurrentPage(window.location.hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    // 初始加载时也检查一次
    setCurrentPage(window.location.hash);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  const handleExecute = (result: any) => {
    console.log('Executing:', result);
    // TODO: 实现具体的执行逻辑
  };

  // 检查是否是设置页面
  if (currentPage === '#settings') {
    console.log('显示设置页面');
    return <SettingsPage />;
  }

  console.log('显示主界面，hash:', currentPage);
  return <MainLayout onExecute={handleExecute} />;
};

export default App;
