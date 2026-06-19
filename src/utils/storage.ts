import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';

const STORAGE_KEYS = {
  GAMES: 'games',
  RESULTS: 'game_results',
  USER_ID: 'user_id',
  USER_NAME: 'user_name'
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateShareCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const getGames = (): Game[] => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.GAMES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[Storage] getGames error:', e);
    return [];
  }
};

export const saveGames = (games: Game[]): void => {
  try {
    Taro.setStorageSync(STORAGE_KEYS.GAMES, JSON.stringify(games));
  } catch (e) {
    console.error('[Storage] saveGames error:', e);
  }
};

export const getGameById = (id: string): Game | undefined => {
  const games = getGames();
  return games.find(g => g.id === id);
};

export const getGameByShareCode = (code: string): Game | undefined => {
  const games = getGames();
  return games.find(g => g.shareCode === code.toUpperCase());
};

export const saveGame = (game: Game): void => {
  const games = getGames();
  const index = games.findIndex(g => g.id === game.id);
  if (index >= 0) {
    games[index] = game;
  } else {
    games.unshift(game);
  }
  saveGames(games);
};

export const deleteGame = (id: string): void => {
  const games = getGames();
  const filtered = games.filter(g => g.id !== id);
  saveGames(filtered);
  deleteGameResult(id);
};

export const getGameResult = (gameId: string): AssignmentResult | undefined => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.RESULTS);
    const results = data ? JSON.parse(data) : [];
    return results.find((r: AssignmentResult) => r.gameId === gameId);
  } catch (e) {
    console.error('[Storage] getGameResult error:', e);
    return undefined;
  }
};

export const saveGameResult = (result: AssignmentResult): void => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.RESULTS);
    const results = data ? JSON.parse(data) : [];
    const index = results.findIndex((r: AssignmentResult) => r.gameId === result.gameId);
    if (index >= 0) {
      results[index] = result;
    } else {
      results.push(result);
    }
    Taro.setStorageSync(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  } catch (e) {
    console.error('[Storage] saveGameResult error:', e);
  }
};

export const deleteGameResult = (gameId: string): void => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.RESULTS);
    const results = data ? JSON.parse(data) : [];
    const filtered = results.filter((r: AssignmentResult) => r.gameId !== gameId);
    Taro.setStorageSync(STORAGE_KEYS.RESULTS, JSON.stringify(filtered));
  } catch (e) {
    console.error('[Storage] deleteGameResult error:', e);
  }
};

export const getUserId = (): string => {
  try {
    let userId = Taro.getStorageSync(STORAGE_KEYS.USER_ID);
    if (!userId) {
      userId = generateId();
      Taro.setStorageSync(STORAGE_KEYS.USER_ID, userId);
    }
    return userId;
  } catch (e) {
    console.error('[Storage] getUserId error:', e);
    return 'guest_' + Date.now();
  }
};

export const getUserName = (): string => {
  try {
    return Taro.getStorageSync(STORAGE_KEYS.USER_NAME) || '玩家' + Math.floor(Math.random() * 10000);
  } catch (e) {
    console.error('[Storage] getUserName error:', e);
    return '玩家';
  }
};

export const saveUserName = (name: string): void => {
  try {
    Taro.setStorageSync(STORAGE_KEYS.USER_NAME, name);
  } catch (e) {
    console.error('[Storage] saveUserName error:', e);
  }
};
