import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';

const SYNC_BASE_URL = 'http://localhost:3456/api';

const request = async (method: string, path: string, body?: any): Promise<any> => {
  try {
    const options: any = {
      url: `${SYNC_BASE_URL}${path}`,
      method,
      header: { 'Content-Type': 'application/json' },
      timeout: 5000
    };
    if (body) {
      options.data = body;
    }
    const res = await Taro.request(options);
    if (res.statusCode === 200 && res.data?.ok) {
      return res.data.data || true;
    }
    if (res.statusCode === 404) {
      return null;
    }
    console.warn('[SyncService] Request failed:', method, path, res.statusCode);
    return null;
  } catch (e) {
    console.warn('[SyncService] Network error:', (e as Error).message);
    return undefined;
  }
};

export const saveGameToCloud = async (game: Game): Promise<boolean> => {
  try {
    const result = await request('POST', '/game', { ...game, shareCode: game.shareCode });
    if (result !== undefined) {
      console.log('[SyncService] Game saved to cloud:', game.shareCode);
      return true;
    }
    saveGameToLocalCache(game);
    return false;
  } catch (e) {
    console.warn('[SyncService] Save fallback to local:', e);
    saveGameToLocalCache(game);
    return false;
  }
};

export const getGameFromCloud = async (shareCode: string): Promise<Game | null> => {
  try {
    const result = await request('GET', `/game?code=${shareCode.toUpperCase()}`);
    if (result) {
      console.log('[SyncService] Game loaded from cloud:', shareCode);
      return result as Game;
    }
    if (result === null) {
      const cached = getGameFromLocalCache(shareCode);
      if (cached) return cached;
      return null;
    }
    const cached = getGameFromLocalCache(shareCode);
    return cached;
  } catch (e) {
    console.warn('[SyncService] Get fallback to local:', e);
    return getGameFromLocalCache(shareCode);
  }
};

export const saveResultToCloud = async (shareCode: string, result: AssignmentResult): Promise<boolean> => {
  try {
    const res = await request('POST', '/result', { ...result, shareCode });
    if (res !== undefined) {
      console.log('[SyncService] Result saved to cloud:', shareCode);
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[SyncService] Result save error:', e);
    return false;
  }
};

export const getResultFromCloud = async (shareCode: string): Promise<AssignmentResult | null> => {
  try {
    const result = await request('GET', `/result?code=${shareCode.toUpperCase()}`);
    if (result) {
      console.log('[SyncService] Result loaded from cloud:', shareCode);
      return result as AssignmentResult;
    }
    return null;
  } catch (e) {
    console.warn('[SyncService] Result get error:', e);
    return null;
  }
};

export const refreshGameFromCloud = async (gameId: string, shareCode: string): Promise<Game | null> => {
  const cloudGame = await getGameFromCloud(shareCode);
  if (cloudGame && cloudGame.id === gameId) {
    return cloudGame;
  }
  return null;
};

const LOCAL_CACHE_PREFIX = 'sync_cache_';

const saveGameToLocalCache = (game: Game): void => {
  try {
    Taro.setStorageSync(`${LOCAL_CACHE_PREFIX}${game.shareCode.toUpperCase()}`, JSON.stringify(game));
  } catch (e) {
    console.warn('[SyncService] Local cache save error:', e);
  }
};

const getGameFromLocalCache = (shareCode: string): Game | null => {
  try {
    const data = Taro.getStorageSync(`${LOCAL_CACHE_PREFIX}${shareCode.toUpperCase()}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

export const generateShareLink = (shareCode: string): string => {
  const code = shareCode.toUpperCase();
  if (process.env.TARO_ENV === 'h5') {
    try {
      const base = window.location.origin + window.location.pathname;
      return `${base}#/pages/home/index?invite=${code}`;
    } catch {
      return `#/pages/home/index?invite=${code}`;
    }
  }
  return `pages/home/index?invite=${code}`;
};

export const shareGameToFriend = async (game: Game): Promise<boolean> => {
  const shareLink = generateShareLink(game.shareCode);

  if (process.env.TARO_ENV === 'h5') {
    try {
      await Taro.setClipboardData({ data: shareLink });
      Taro.showModal({
        title: '分享链接已复制',
        content: `邀请码：${game.shareCode}\n\n链接已复制到剪贴板，发送给好友即可加入。\n\n好友也可以在首页输入邀请码「${game.shareCode}」加入。`,
        showCancel: false,
        confirmText: '好的'
      });
      return true;
    } catch {
      Taro.showModal({
        title: '邀请好友加入',
        content: `邀请码：${game.shareCode}\n\n请把邀请码发给好友，好友在首页输入即可加入。`,
        showCancel: false
      });
      return false;
    }
  }

  try {
    await Taro.showShareMenu({ withShareTicket: true });
    return true;
  } catch {
    return false;
  }
};

export const syncGameToCloudAndLocal = async (
  game: Game,
  localSaveFn: (game: Game) => void
): Promise<void> => {
  await saveGameToCloud(game);
  localSaveFn(game);
  saveGameToLocalCache(game);
  console.log('[SyncService] Game synced:', game.shareCode);
};
