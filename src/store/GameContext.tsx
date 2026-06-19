import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';
import { getGames, saveGame, getGameResult, saveGameResult, generateId } from '@/utils/storage';
import { mockGames } from '@/data/mockGames';
import {
  saveGameToCloud,
  getGameFromCloud,
  saveResultToCloud,
  refreshGameFromCloud,
  formatSyncStatus
} from '@/services/cloudService';

interface GameContextType {
  games: Game[];
  loading: boolean;
  refreshGames: () => void;
  addGame: (game: Game) => Promise<{ online: boolean }>;
  updateGame: (game: Game) => Promise<{ online: boolean }>;
  getGame: (id: string) => Game | undefined;
  getResult: (gameId: string) => AssignmentResult | undefined;
  saveResult: (result: AssignmentResult) => void;
  joinGameByCode: (shareCode: string, playerName: string) => Promise<{
    game: Game | null;
    online: boolean;
    fromCache: boolean;
  }>;
  refreshGameFromCloudSync: (gameId: string, shareCode: string) => Promise<Game | null>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = () => {
    try {
      setLoading(true);
      let storedGames = getGames();
      
      if (storedGames.length === 0) {
        storedGames = mockGames;
        storedGames.forEach(game => {
          saveGame(game);
        });
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

  const addGame = async (game: Game): Promise<{ online: boolean }> => {
    try {
      saveGame(game);
      setGames(prev => [game, ...prev]);
      
      const { online } = await saveGameToCloud(game);
      
      if (online) {
        console.log('[GameContext] Game added and synced ONLINE:', game.shareCode);
      } else {
        console.log('[GameContext] Game added to LOCAL only:', game.shareCode);
      }
      
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
    const localResult = getGameResult(gameId);
    if (localResult) return localResult;
    return undefined;
  };

  const saveResult = (result: AssignmentResult) => {
    try {
      saveGameResult(result);
      const game = games.find(g => g.id === result.gameId);
      if (game) {
        saveResultToCloud(game.shareCode, result);
      }
    } catch (e) {
      console.error('[GameContext] saveResult error:', e);
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
          Taro.showToast({ title: '暂无网络，无法找到车次', icon: 'none', duration: 2000 });
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
        
        await updateGame(nowJoined);
        Taro.showToast({ 
          title: online ? '已认领空位！请选择偏好' : '已认领（本机）', 
          icon: 'success', 
          duration: 1500 
        });
        
        if (!localExisting) {
          setGames(prev => [nowJoined, ...prev]);
        }
        return { game: nowJoined, online, fromCache };
      }

      if (playerExists) {
        const status = formatSyncStatus(online);
        Taro.showToast({ 
          title: '你已在车中', 
          icon: 'none' 
        });
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
        await updateGame(nowJoined);
        const status = formatSyncStatus(online);
        Taro.showToast({ 
          title: online ? '加入成功！' : '已加入（本机）', 
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
      const cloudGame = await refreshGameFromCloud(gameId, shareCode);
      if (cloudGame) {
        saveGame(cloudGame);
        setGames(prev => prev.map(g => (g.id === cloudGame.id ? cloudGame : g)));
        console.log('[GameContext] Refreshed from cloud:', shareCode);
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
        refreshGames,
        addGame,
        updateGame,
        getGame,
        getResult,
        saveResult,
        joinGameByCode,
        refreshGameFromCloudSync
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
