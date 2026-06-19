import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import { useGame } from '@/store/GameContext';
import GameCard from '@/components/GameCard';
import { getGameByShareCode, getUserName, getUserId } from '@/utils/storage';
import type { Game } from '@/types/game';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const { games, loading, refreshGames, addGame, updateGame } = useGame();
  const [inviteCode, setInviteCode] = useState('');
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);

  useEffect(() => {
    filterGames();
  }, [games]);

  useDidShow(() => {
    refreshGames();
  });

  usePullDownRefresh(() => {
    refreshGames();
    setTimeout(() => {
      Taro.stopPullDownRefresh();
    }, 1000);
  });

  const filterGames = () => {
    const active = games.filter(g => g.status !== 'completed');
    const completed = games.filter(g => g.status === 'completed');
    setActiveGames(active);
    setCompletedGames(completed);
  };

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }

    const game = getGameByShareCode(inviteCode.trim());
    if (!game) {
      Taro.showToast({ title: '未找到该车次', icon: 'none' });
      return;
    }

    const currentUserId = getUserId();
    const currentUserName = getUserName();
    
    const isAlreadyJoined = game.players.some(p => p.id === currentUserId);
    
    if (isAlreadyJoined) {
      Taro.navigateTo({ url: `/pages/game-detail/index?id=${game.id}` });
      return;
    }

    if (game.players.length >= game.playerCount) {
      Taro.showToast({ title: '该车次已满员', icon: 'none' });
      return;
    }

    const updatedGame: Game = {
      ...game,
      status: game.players.length + 1 >= game.playerCount ? 'submitting' : game.status,
      players: [
        ...game.players,
        {
          id: currentUserId,
          name: currentUserName,
          avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
          tags: [],
          keywordRanking: [],
          submitted: false,
          joinedAt: Date.now()
        }
      ]
    };

    updateGame(updatedGame);
    Taro.showToast({ title: '加入成功', icon: 'success' });
    setInviteCode('');
    Taro.navigateTo({ url: `/pages/game-detail/index?id=${game.id}` });
  };

  const handleCreateGame = () => {
    console.log('[Home] Navigate to create game');
    Taro.navigateTo({ url: '/pages/create-game/index' });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>🎭 剧本杀角色分配</Text>
        <Text className={styles.subtitle}>轻松搞定熟人局角色分配</Text>
      </View>

      <View className={styles.searchSection}>
        <View className={styles.searchBar}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            placeholder="输入邀请码加入"
            placeholderClass={styles.searchInput}
            value={inviteCode}
            onInput={e => setInviteCode(e.detail.value.toUpperCase())}
            maxLength={6}
          />
          <Button className={styles.joinBtn} onClick={handleJoinByCode}>
            加入
          </Button>
        </View>

        <Button className={styles.createBtn} onClick={handleCreateGame}>
          + 发起一车
        </Button>
      </View>

      {loading ? (
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      ) : (
        <>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>进行中</Text>
              <Text className={styles.sectionCount}>{activeGames.length}车</Text>
            </View>

            {activeGames.length === 0 ? (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>🎮</Text>
                <Text className={styles.emptyText}>还没有进行中的车</Text>
                <Text className={styles.emptyHint}>点击上方按钮发起一车吧</Text>
              </View>
            ) : (
              activeGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))
            )}
          </View>

          {completedGames.length > 0 && (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>已完成</Text>
                <Text className={styles.sectionCount}>{completedGames.length}车</Text>
              </View>

              {completedGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default HomePage;
