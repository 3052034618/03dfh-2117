import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Taro from '@tarojs/taro';
import type { Game, AssignmentResult } from '@/types/game';
import { getGames, saveGame, getGameResult, saveGameResult, generateId } from '@/utils/storage';
import { mockGames } from '@/data/mockGames';
import {
  saveGameToCloud,
  getGameFromCloud,
  saveResultToCloud,
  getResultFromCloud,
  refreshGameFromCloud,
  saveGameToLocalCache
} from '@/services/cloudService';

interface GameContextType {
  games: Game[];
  loading: boolean;
  refreshGames: () => void;
  addGame: (game: Game) => void;
  updateGame: (game: Game) => void;
  getGame: (id: string) => Game | undefined;
  getResult: (gameId: string) => AssignmentResult | undefined;
  saveResult: (result: AssignmentResult) => void;
  joinGameByCode: (shareCode: string, playerName: string) => Promise<Game | null>;
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
        console.log('[GameContext] No stored games, using mock data');
        storedGames = mockGames;
        storedGames.forEach(game => {
          saveGame(game);
          saveGameToCloud(game);
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

  const addGame = (game: Game) => {
    try {
      saveGame(game);
      saveGameToLocalCache(game);
      saveGameToCloud(game);
      setGames(prev => [game, ...prev]);
      console.log('[GameContext] Game added and synced:', game.id, game.shareCode);
    } catch (e) {
      console.error('[GameContext] addGame error:', e);
    }
  };

  const updateGame = (game: Game) => {
    try {
      saveGame(game);
      saveGameToLocalCache(game);
      saveGameToCloud(game);
      setGames(prev => prev.map(g => (g.id === game.id ? game : g)));
      console.log('[GameContext] Game updated and synced:', game.id, game.shareCode);
    } catch (e) {
      console.error('[GameContext] updateGame error:', e);
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
      console.log('[GameContext] Result saved and synced to cloud:', result.gameId);
    } catch (e) {
      console.error('[GameContext] saveResult error:', e);
    }
  };

  const joinGameByCode = async (shareCode: string, playerName: string): Promise<Game | null> => {
    try {
      const cloudGame = await getGameFromCloud(shareCode);
      if (!cloudGame) {
        Taro.showToast({ title: '邀请码无效', icon: 'none' });
        return null;
      }

      const localExisting = games.find(g => g.id === cloudGame.id);
      const nowJoined = localExisting || cloudGame;

      const emptySlot = nowJoined.players.find(
        p => p.isReplaced && !p.hasSubmitted
      );
      const playerExists = nowJoined.players.some(p => p.name === playerName);

      if (emptySlot && !playerExists) {
        const userId = generateId();
        emptySlot.id = userId;
        emptySlot.name = playerName;
        emptySlot.isReplaced = false;
        emptySlot.originalName = undefined;
        emptySlot.tags = [];
        emptySlot.keywordRanking = [];
        emptySlot.hasSubmitted = false;
        emptySlot.avatar = `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`;
        
        updateGame(nowJoined);
        Taro.showToast({ title: '已认领空位，请选择偏好', icon: 'success' });
        
        if (!localExisting) {
          setGames(prev => [nowJoined, ...prev]);
        }
        return nowJoined;
      }

      if (playerExists) {
        Taro.showToast({ title: '你已在车中', icon: 'none' });
        if (!localExisting) {
          saveGame(nowJoined);
          setGames(prev => [nowJoined, ...prev]);
        }
        return nowJoined;
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
        updateGame(nowJoined);
        Taro.showToast({ title: '加入成功', icon: 'success' });
      } else {
        Taro.showToast({ title: '车已满员', icon: 'none' });
        return null;
      }

      if (!localExisting) {
        setGames(prev => [nowJoined, ...prev]);
      }

      return nowJoined;
    } catch (e) {
      console.error('[GameContext] joinGameByCode error:', e);
      Taro.showToast({ title: '加入失败', icon: 'none' });
      return null;
    }
  };

  const refreshGameFromCloudSync = async (gameId: string, shareCode: string): Promise<Game | null> => {
    try {
      const cloudGame = await refreshGameFromCloud(gameId, shareCode);
      if (cloudGame) {
        saveGame(cloudGame);
        setGames(prev => prev.map(g => (g.id === cloudGame.id ? cloudGame : g)));
        console.log('[GameContext] Game refreshed from cloud:', shareCode);
        return cloudGame;
      }
      return null;
    } catch (e) {
      console.error('[GameContext] refreshGameFromCloudSync error:', e);
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
