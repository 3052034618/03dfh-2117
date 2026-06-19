import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Game, AssignmentResult } from '@/types/game';
import { getGames, saveGame, getGameResult, saveGameResult } from '@/utils/storage';
import { mockGames } from '@/data/mockGames';

interface GameContextType {
  games: Game[];
  loading: boolean;
  refreshGames: () => void;
  addGame: (game: Game) => void;
  updateGame: (game: Game) => void;
  getGame: (id: string) => Game | undefined;
  getResult: (gameId: string) => AssignmentResult | undefined;
  saveResult: (result: AssignmentResult) => void;
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

  const addGame = (game: Game) => {
    try {
      saveGame(game);
      setGames(prev => [game, ...prev]);
      console.log('[GameContext] Game added:', game.id);
    } catch (e) {
      console.error('[GameContext] addGame error:', e);
    }
  };

  const updateGame = (game: Game) => {
    try {
      saveGame(game);
      setGames(prev => prev.map(g => (g.id === game.id ? game : g)));
      console.log('[GameContext] Game updated:', game.id);
    } catch (e) {
      console.error('[GameContext] updateGame error:', e);
    }
  };

  const getGame = (id: string): Game | undefined => {
    return games.find(g => g.id === id);
  };

  const getResult = (gameId: string): AssignmentResult | undefined => {
    return getGameResult(gameId);
  };

  const saveResult = (result: AssignmentResult) => {
    try {
      saveGameResult(result);
      console.log('[GameContext] Result saved:', result.gameId);
    } catch (e) {
      console.error('[GameContext] saveResult error:', e);
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
        saveResult
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
