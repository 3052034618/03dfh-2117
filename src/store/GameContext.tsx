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
  deleteGameFromCloud,
  refreshGameFromCloud
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
  joinGameByCode: (shareCode: string, playerName: string) => Game | null;
  refreshGameFromCloudSync: (gameId: string, shareCode: string) => Game | null;
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
      saveGameToCloud(game);
      setGames(prev => [game, ...prev]);
      console.log('[GameContext] Game added and synced to cloud:', game.id, game.shareCode);
    } catch (e) {
      console.error('[GameContext] addGame error:', e);
    }
  };

  const updateGame = (game: Game) => {
    try {
      saveGame(game);
      saveGameToCloud(game);
      setGames(prev => prev.map(g => (g.id === game.id ? game : g)));
      console.log('[GameContext] Game updated and synced to cloud:', game.id, game.shareCode);
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
    
    const game = games.find(g => g.id === gameId);
    if (game) {
      const cloudResult = getResultFromCloud(game.shareCode);
      if (cloudResult) {
        saveGameResult(cloudResult);
        return cloudResult;
      }
    }
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

  const joinGameByCode = (shareCode: string, playerName: string): Game | null => {
    try {
      const cloudGame = getGameFromCloud(shareCode);
      if (!cloudGame) {
        Taro.showToast({ title: '邀请码无效', icon: 'none' });
        return null;
      }

      const localExisting = games.find(g => g.id === cloudGame.id);
      
      const nowJoined = localExisting || cloudGame;
      const playerExists = nowJoined.players.some(p => p.name === playerName);
      
      if (!playerExists && nowJoined.players.length < nowJoined.playerCount) {
        const newPlayer = {
          id: generateId(),
          name: playerName,
          tags: [],
          keywordRanking: [],
          hasSubmitted: false,
          isCreator: false,
          isReplaced: false
        };
        nowJoined.players.push(newPlayer);
        updateGame(nowJoined);
        Taro.showToast({ title: '加入成功', icon: 'success' });
      } else if (playerExists) {
        Taro.showToast({ title: '你已在车中', icon: 'none' });
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

  const refreshGameFromCloudSync = (gameId: string, shareCode: string): Game | null => {
    try {
      const cloudGame = refreshGameFromCloud(gameId, shareCode);
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
