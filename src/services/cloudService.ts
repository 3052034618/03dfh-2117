import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';

const ENV = process.env.TARO_ENV || 'h5';
const IS_H5 = ENV === 'h5';
const IS_WEAPP = ENV === 'weapp';

const DEFAULT_LOCAL_BASE = IS_H5 ? 'http://localhost:3456/api' : 'http://localhost:3456/api';

const CONFIG_STORAGE_KEY = 'sync_config_v1';

interface SyncConfig {
  baseUrl: string;
  mode: 'auto' | 'online' | 'offline';
  lastHealthyAt?: number;
}

const getConfig = (): SyncConfig => {
  try {
    const raw = Taro.getStorageSync(CONFIG_STORAGE_KEY);
    if (raw && typeof raw === 'object') {
      return raw as SyncConfig;
    }
  } catch (_) {}
  return { baseUrl: DEFAULT_LOCAL_BASE, mode: 'auto' };
};

const saveConfig = (config: Partial<SyncConfig>) => {
  const current = getConfig();
  const merged = { ...current, ...config };
  try {
    Taro.setStorageSync(CONFIG_STORAGE_KEY, merged);
  } catch (_) {}
  return merged;
};

export const setSyncBaseUrl = (url: string) => {
  return saveConfig({ baseUrl: url });
};

export const getSyncBaseUrl = (): string => {
  return getConfig().baseUrl;
};

export const setSyncMode = (mode: SyncConfig['mode']) => {
  return saveConfig({ mode });
};

export const getSyncMode = (): SyncConfig['mode'] => {
  return getConfig().mode;
};

const request = async (method: string, path: string, body?: any): Promise<{ ok: boolean; data?: any; error?: string; offline: boolean }> => {
  const config = getConfig();
  
  if (config.mode === 'offline') {
    return { ok: false, offline: true, error: 'offline_mode' };
  }

  try {
    const controller = { timeout: 4000 };
    const options: any = {
      url: `${config.baseUrl}${path}`,
      method,
      header: { 'Content-Type': 'application/json' },
      timeout: 4000
    };
    if (body) options.data = body;

    const res: any = await Taro.request(options);
    
    if (res.statusCode === 200 && res.data?.ok) {
      saveConfig({ lastHealthyAt: Date.now() });
      return { ok: true, data: res.data.data || true, offline: false };
    }
    if (res.statusCode === 404) {
      return { ok: false, offline: false, error: 'not_found' };
    }
    return { ok: false, offline: false, error: `status_${res.statusCode}` };
  } catch (e) {
    return { ok: false, offline: true, error: (e as Error).message };
  }
};

export type SyncStatus = 'online' | 'offline' | 'checking';

export const checkSyncHealth = async (): Promise<SyncStatus> => {
  const res = await request('GET', '/health');
  return res.ok ? 'online' : 'offline';
};

const LOCAL_CACHE_PREFIX = 'sync_cache_v2_';

const getCacheKey = (code: string) => `${LOCAL_CACHE_PREFIX}${code.toUpperCase()}`;

const saveLocalCache = (key: string, data: any) => {
  try {
    Taro.setStorageSync(getCacheKey(key), JSON.stringify({
      data,
      savedAt: Date.now(),
      offline: true
    }));
  } catch (_) {}
};

const getLocalCache = (key: string): any | null => {
  try {
    const raw = Taro.getStorageSync(getCacheKey(key));
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed.data;
    }
  } catch (_) {}
  return null;
};

export const saveGameToCloud = async (game: Game): Promise<{ saved: boolean; online: boolean }> => {
  const res = await request('POST', '/game', game);
  if (res.ok) {
    saveLocalCache(`g_${game.shareCode}`, game);
    console.log('[Sync] Game saved ONLINE:', game.shareCode);
    return { saved: true, online: true };
  }
  saveLocalCache(`g_${game.shareCode}`, game);
  console.log('[Sync] Game saved OFFLINE:', game.shareCode, res.error);
  return { saved: true, online: false };
};

export const getGameFromCloud = async (shareCode: string): Promise<{ game: Game | null; online: boolean; fromCache: boolean }> => {
  const res = await request('GET', `/game?code=${shareCode.toUpperCase()}`);
  if (res.ok && res.data) {
    saveLocalCache(`g_${shareCode}`, res.data);
    return { game: res.data as Game, online: true, fromCache: false };
  }
  const cached = getLocalCache(`g_${shareCode}`);
  if (cached) {
    return { game: cached as Game, online: false, fromCache: true };
  }
  return { game: null, online: res.ok, fromCache: false };
};

export const saveResultToCloud = async (shareCode: string, result: AssignmentResult): Promise<boolean> => {
  const res = await request('POST', '/result', { ...result, shareCode });
  if (res.ok) {
    return true;
  }
  return false;
};

export const getResultFromCloud = async (shareCode: string): Promise<AssignmentResult | null> => {
  const res = await request('GET', `/result?code=${shareCode.toUpperCase()}`);
  if (res.ok && res.data) {
    return res.data as AssignmentResult;
  }
  return null;
};

export const refreshGameFromCloud = async (gameId: string, shareCode: string): Promise<Game | null> => {
  const { game } = await getGameFromCloud(shareCode);
  if (game && game.id === gameId) {
    return game;
  }
  return null;
};

export const generateShareLink = (shareCode: string): string => {
  const code = shareCode.toUpperCase();
  if (IS_H5) {
    try {
      const base = window.location.origin + window.location.pathname;
      return `${base}#/pages/home/index?invite=${code}`;
    } catch {
      return `#/pages/home/index?invite=${code}`;
    }
  }
  return `pages/home/index?invite=${code}`;
};

export const shareGameToFriend = async (game: Game): Promise<{
  mode: 'wx_card' | 'h5_copy' | 'manual_code';
  message?: string;
}> => {
  if (IS_WEAPP) {
    try {
      await Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
      Taro.showActionSheet({
        itemList: ['📤 发给微信好友', '📋 复制邀请码和链接']
      }).then(async (res) => {
        if (res.tapIndex === 1) {
          const link = generateShareLink(game.shareCode);
          const copyText = `🎭 ${game.scriptName}\n邀请码：${game.shareCode}\n加入链接：${link}`;
          await Taro.setClipboardData({ data: copyText });
          Taro.showToast({ title: '邀请信息已复制', icon: 'success' });
        } else if (res.tapIndex === 0) {
          Taro.showModal({
            title: '请点击右上角',
            content: '请点击右上角菜单 → 选择「发送给朋友」或「分享到朋友圈」\n\n分享卡片会自动带上邀请码哦',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }).catch(() => {});
      return { mode: 'wx_card' };
    } catch (e) {
      const link = generateShareLink(game.shareCode);
      const copyText = `🎭 ${game.scriptName}\n邀请码：${game.shareCode}\n加入链接：${link}`;
      try {
        await Taro.setClipboardData({ data: copyText });
        Taro.showToast({ title: '邀请信息已复制', icon: 'success' });
      } catch (_) {}
      return { mode: 'manual_code', message: '已复制邀请码' };
    }
  }

  if (IS_H5) {
    const link = generateShareLink(game.shareCode);
    const copyText = `🎭 ${game.scriptName}\n邀请码：${game.shareCode}\n加入链接：${link}`;
    try {
      await Taro.setClipboardData({ data: copyText });
      Taro.showModal({
        title: '邀请信息已复制 ✅',
        content: `🎭 ${game.scriptName}\n\n邀请码：${game.shareCode}\n加入链接：${link}\n\n发送给好友即可加入！`,
        showCancel: false,
        confirmText: '好的'
      });
      return { mode: 'h5_copy' };
    } catch (_) {
      Taro.showModal({
        title: '邀请好友加入',
        content: `🎭 ${game.scriptName}\n\n邀请码：${game.shareCode}\n加入链接：${link}`,
        showCancel: false
      });
      return { mode: 'manual_code' };
    }
  }

  return { mode: 'manual_code' };
};

export const syncGameToCloudAndLocal = async (
  game: Game,
  localSaveFn: (game: Game) => void
): Promise<boolean> => {
  const { online } = await saveGameToCloud(game);
  localSaveFn(game);
  return online;
};

export const formatSyncStatus = (online: boolean): { text: string; color: string; icon: string } => {
  if (online) {
    return { text: '已同步', color: '#00B894', icon: '🌐' };
  }
  return { text: '本机模式', color: '#F39C12', icon: '📱' };
};
