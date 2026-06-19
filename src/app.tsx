import React, { useEffect } from 'react';
import { useDidShow, useDidHide } from '@tarojs/taro';
import { GameProvider } from '@/store/GameContext';
// 全局样式
import './app.scss';

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {
    console.log('[App] App initialized');
  });

  // 对应 onShow
  useDidShow(() => {
    console.log('[App] App did show');
  });

  // 对应 onHide
  useDidHide(() => {
    console.log('[App] App did hide');
  });

  return <GameProvider>{props.children}</GameProvider>;
}

export default App;
