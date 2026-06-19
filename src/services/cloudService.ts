import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';

const CLOUD_STORAGE_PREFIX = 'cloud_game_';

const getCloudKey = (shareCode: string): string => {
  return `${CLOUD_STORAGE_PREFIX}${shareCode.toUpperCase()}`;
};

const getResultCloudKey = (shareCode: string): string => {
  return `${CLOUD_STORAGE_PREFIX}result_${shareCode.toUpperCase()}`;
};

export const saveGameToCloud = (game: Game): boolean => {
  try {
    const key = getCloudKey(game.shareCode);
    Taro.setStorageSync(key, JSON.stringify(game));
    console.log('[CloudService] Game saved to cloud:', game.shareCode);
    return true;
  } catch (e) {
    console.error('[CloudService] saveGameToCloud error:', e);
    return false;
  }
};

export const getGameFromCloud = (shareCode: string): Game | null => {
  try {
    const key = getCloudKey(shareCode);
    const data = Taro.getStorageSync(key);
    if (data) {
      console.log('[CloudService] Game loaded from cloud:', shareCode);
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('[CloudService] getGameFromCloud error:', e);
    return null;
  }
};

export const deleteGameFromCloud = (shareCode: string): boolean => {
  try {
    const key = getCloudKey(shareCode);
    Taro.removeStorageSync(key);
    const resultKey = getResultCloudKey(shareCode);
    Taro.removeStorageSync(resultKey);
    console.log('[CloudService] Game deleted from cloud:', shareCode);
    return true;
  } catch (e) {
    console.error('[CloudService] deleteGameFromCloud error:', e);
    return false;
  }
};

export const saveResultToCloud = (shareCode: string, result: AssignmentResult): boolean => {
  try {
    const key = getResultCloudKey(shareCode);
    Taro.setStorageSync(key, JSON.stringify(result));
    console.log('[CloudService] Result saved to cloud:', shareCode);
    return true;
  } catch (e) {
    console.error('[CloudService] saveResultToCloud error:', e);
    return false;
  }
};

export const getResultFromCloud = (shareCode: string): AssignmentResult | null => {
  try {
    const key = getResultCloudKey(shareCode);
    const data = Taro.getStorageSync(key);
    if (data) {
      console.log('[CloudService] Result loaded from cloud:', shareCode);
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('[CloudService] getResultFromCloud error:', e);
    return null;
  }
};

export const generateShareLink = (shareCode: string): string => {
  const pages = Taro.getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const baseUrl = currentPage?.route || 'pages/home/index';
  
  let baseOrigin = '';
  if (process.env.TARO_ENV === 'h5') {
    baseOrigin = window.location.origin + window.location.pathname;
    return `${baseOrigin}#/pages/home/index?invite=${shareCode.toUpperCase()}`;
  }
  
  return `pages/home/index?invite=${shareCode.toUpperCase()}`;
};

export const shareGameToFriend = async (game: Game): Promise<boolean> => {
  const shareLink = generateShareLink(game.shareCode);
  const shareTitle = `🎭 ${game.scriptName} - 剧本杀角色分配`;
  const shareDesc = `邀请码：${game.shareCode}，快来加入我们的剧本杀！`;
  
  console.log('[CloudService] Share link:', shareLink);
  
  if (process.env.TARO_ENV === 'h5') {
    try {
      await Taro.setClipboardData({ data: shareLink });
      Taro.showModal({
        title: '分享链接已复制',
        content: `邀请码：${game.shareCode}\n\n链接已复制到剪贴板，发送给好友即可加入。\n\n好友也可以在小程序首页输入邀请码「${game.shareCode}」加入。`,
        showCancel: false,
        confirmText: '好的'
      });
      return true;
    } catch (e) {
      console.error('[CloudService] Share copy error:', e);
      Taro.showModal({
        title: '邀请好友加入',
        content: `邀请码：${game.shareCode}\n\n请把邀请码发给好友，好友在小程序首页输入即可加入。`,
        showCancel: false
      });
      return false;
    }
  }
  
  try {
    await Taro.showShareMenu({ withShareTicket: true });
    return true;
  } catch (e) {
    console.error('[CloudService] Share menu error:', e);
    return false;
  }
};

export const refreshGameFromCloud = (gameId: string, shareCode: string): Game | null => {
  const cloudGame = getGameFromCloud(shareCode);
  if (cloudGame && cloudGame.id === gameId) {
    return cloudGame;
  }
  return null;
};

export const syncGameToCloudAndLocal = (
  game: Game,
  localSaveFn: (game: Game) => void
): void => {
  saveGameToCloud(game);
  localSaveFn(game);
  console.log('[CloudService] Game synced:', game.shareCode);
};
