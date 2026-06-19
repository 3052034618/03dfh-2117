import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import type { Game, AssignmentResult, GameEvent, GameEventType } from '@/types/game';
import { getGames, saveGame, getGameResult, saveGameResult, generateId } from '@/utils/storage';
import { mockGames } from '@/data/mockGames';
import {
  saveGameToCloud,
  getGameFromCloud,
  saveResultToCloud,
  getResultFromCloud,
  refreshGameFromCloud,
  checkSyncHealth,
  getSyncConfig
} from '@/services/cloudService';

interface SyncState {
  online: boolean | null;
  lastCheckedAt: number | null;
  baseUrl: string;
}

interface GameContextType {
  games: Game[];
  loading: boolean;
  syncState: SyncState;
  refreshGames: () => void;
  addGame: (game: Game) => Promise<{ online: boolean }>;
  updateGame: (game: Game) => Promise<{ online: boolean }>;
  getGame: (id: string) => Game | undefined;
  getResult: (gameId: string) => AssignmentResult | undefined;
  saveResult: (result: AssignmentResult) => Promise<{ online: boolean }>;
  joinGameByCode: (shareCode: string, playerName: string) => Promise<{
    game: Game | null;
    online: boolean;
    fromCache: boolean;
  }>;
  refreshGameFromCloudSync: (gameId: string, shareCode: string) => Promise<Game | null>;
  checkSync: () => Promise<void>;
  addEvent: (gameId: string, type: GameEventType, playerName: string, detail?: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>({
    online: null,
    lastCheckedAt: null,
    baseUrl: 'http://localhost:3456/api'
  });

  useEffect(() => {
    const config = getSyncConfig();
    setSyncState(prev => ({
      ...prev,
      baseUrl: config.baseUrl,
      lastCheckedAt: config.lastCheckedAt || null,
      online: config.lastCheckOnline ?? null
    }));
    loadGames();
  }, []);

  const loadGames = () => {
    try {
      setLoading(true);
      let storedGames = getGames();
      if (storedGames.length === 0) {
        storedGames = mockGames;
        storedGames.forEach(game => saveGame(game));
      }
      setGames(storedGames);
    } catch (e) {
      console.error('[GameContext] loadGames error:', e);
      setGames(mockGames);
    } finally {
      setLoading(false);
    }
  };

  const refreshGames = () => {
    loadGames();
  };

  const checkSync = async () => {
    try {
      const { status, config } = await checkSyncHealth();
      setSyncState({
        online: status === 'online',
        lastCheckedAt: config.lastCheckedAt || Date.now(),
        baseUrl: config.baseUrl
      });
    } catch {
      setSyncState(prev => ({ ...prev, online: false, lastCheckedAt: Date.now() }));
    }
  };

  const addEvent = (gameId: string, type: GameEventType, playerName: string, detail?: string) => {
    setGames(prev => prev.map(g => {
      if (g.id !== gameId) return g;
      const event: GameEvent = {
        id: generateId(),
        type,
        playerName,
        detail,
        timestamp: Date.now()
      };
      const updated = { ...g, events: [...(g.events || []), event] };
      saveGame(updated);
      return updated;
    }));
  };

  const addGame = async (game: Game): Promise<{ online: boolean }> => {
    try {
      if (!game.events || game.events.length === 0) {
        game.events = [{
          id: generateId(),
          type: 'created',
          playerName: game.creatorName,
          detail: `创建了「${game.scriptName}」`,
          timestamp: Date.now()
        }];
      }
      saveGame(game);
      setGames(prev => [game, ...prev]);
      const { online } = await saveGameToCloud(game);
      return { online };
    } catch (e) {
      console.error('[GameContext] addGame error:', e);
      return { online: false };
    }
  };

  const updateGame = async (game: Game): Promise<{ online: boolean }> => {
    try {
      saveGame(game);
      setGames(prev => prev.map(g => (g.id === game.id ? game : g)));
      const { online } = await saveGameToCloud(game);
      return { online };
    } catch (e) {
      console.error('[GameContext] updateGame error:', e);
      return { online: false };
    }
  };

  const getGame = (id: string): Game | undefined => {
    return games.find(g => g.id === id);
  };

  const getResult = (gameId: string): AssignmentResult | undefined => {
    return getGameResult(gameId);
  };

  const saveResultFn = async (result: AssignmentResult): Promise<{ online: boolean }> => {
    try {
      saveGameResult(result);
      const game = games.find(g => g.id === result.gameId);
      if (game) {
        const { online } = await saveResultToCloud(game.shareCode, result);
        return { online };
      }
      return { online: false };
    } catch (e) {
      console.error('[GameContext] saveResult error:', e);
      return { online: false };
    }
  };

  const joinGameByCode = async (shareCode: string, playerName: string): Promise<{
    game: Game | null;
    online: boolean;
    fromCache: boolean;
  }> => {
    try {
      const { game: cloudGame, online, fromCache } = await getGameFromCloud(shareCode);
      
      if (!cloudGame) {
        if (online) {
          Taro.showToast({ title: '邀请码无效或车次未创建', icon: 'none', duration: 2000 });
        } else if (fromCache) {
          Taro.showToast({ title: '暂无网络，无法查找车次', icon: 'none', duration: 2000 });
        } else {
          Taro.showToast({ title: '邀请码无效', icon: 'none' });
        }
        return { game: null, online, fromCache };
      }

      const localExisting = games.find(g => g.id === cloudGame.id);
      const nowJoined = localExisting || { ...cloudGame };

      if (!localExisting) {
        saveGame(nowJoined);
      }

      const emptySlot = nowJoined.players.find(
        p => p.isReplaced && !p.hasSubmitted
      );
      const playerExists = nowJoined.players.some(p => p.name === playerName);

      if (emptySlot && !playerExists) {
        emptySlot.id = generateId();
        emptySlot.name = playerName;
        emptySlot.isReplaced = false;
        emptySlot.originalName = undefined;
        emptySlot.tags = [];
        emptySlot.keywordRanking = [];
        emptySlot.hasSubmitted = false;
        emptySlot.joinedAt = Date.now();
        emptySlot.avatar = `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`;
        
        const event: GameEvent = {
          id: generateId(),
          type: 'claimed',
          playerName,
          detail: `认领了${emptySlot.originalName ? `「${emptySlot.originalName}」的` : ''}空位`,
          timestamp: Date.now()
        };
        nowJoined.events = [...(nowJoined.events || []), event];
        
        await updateGame(nowJoined);
        Taro.showToast({ 
          title: online ? '已认领空位！请选择偏好' : '已认领（仅本机）', 
          icon: 'success', duration: 1500 
        });
        
        if (!localExisting) {
          setGames(prev => [nowJoined, ...prev]);
        }
        return { game: nowJoined, online, fromCache };
      }

      if (playerExists) {
        Taro.showToast({ title: '你已在车中', icon: 'none' });
        if (!localExisting) {
          setGames(prev => [nowJoined, ...prev]);
        }
        return { game: nowJoined, online, fromCache };
      }

      if (nowJoined.players.length < nowJoined.playerCount) {
        const newPlayer = {
          id: generateId(),
          name: playerName,
          avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
          tags: [],
          keywordRanking: [],
          hasSubmitted: false,
          joinedAt: Date.now(),
          isReplaced: false
        };
        nowJoined.players.push(newPlayer);
        
        const event: GameEvent = {
          id: generateId(),
          type: 'joined',
          playerName,
          detail: '加入了车次',
          timestamp: Date.now()
        };
        nowJoined.events = [...(nowJoined.events || []), event];
        
        await updateGame(nowJoined);
        Taro.showToast({ 
          title: online ? '加入成功！' : '已加入（仅本机）', 
          icon: 'success' 
        });
      } else {
        Taro.showToast({ title: '车已满员', icon: 'none' });
        return { game: null, online, fromCache };
      }

      if (!localExisting) {
        setGames(prev => [nowJoined, ...prev]);
      }

      return { game: nowJoined, online, fromCache };
    } catch (e) {
      console.error('[GameContext] joinGameByCode error:', e);
      Taro.showToast({ title: '加入失败，请重试', icon: 'none' });
      return { game: null, online: false, fromCache: false };
    }
  };

  const refreshGameFromCloudSync = async (gameId: string, shareCode: string): Promise<Game | null> => {
    try {
      const { game: cloudGame, online } = await refreshGameFromCloud(gameId, shareCode);
      if (cloudGame) {
        saveGame(cloudGame);
        setGames(prev => prev.map(g => (g.id === cloudGame.id ? cloudGame : g)));
        return cloudGame;
      }
      return null;
    } catch (e) {
      console.error('[GameContext] refresh error:', e);
      return null;
    }
  };

  return (
    <GameContext.Provider
      value={{
        games,
        loading,
        syncState,
        refreshGames,
        addGame,
        updateGame,
        getGame,
        getResult,
        saveResult: saveResultFn,
        joinGameByCode,
        refreshGameFromCloudSync,
        checkSync,
        addEvent
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
