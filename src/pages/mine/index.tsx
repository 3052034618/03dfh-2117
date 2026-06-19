import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import dayjs from 'dayjs';
import { useGame } from '@/store/GameContext';
import { getUserId, getUserName, saveUserName } from '@/utils/storage';
import type { Game } from '@/types/game';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  const { games, refreshGames } = useGame();
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [createdGames, setCreatedGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<Game[]>([]);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    filterGames();
  }, [games]);

  useDidShow(() => {
    refreshGames();
    loadUserInfo();
  });

  const loadUserInfo = () => {
    setUserName(getUserName());
    setUserId(getUserId());
  };

  const filterGames = () => {
    const currentUserId = getUserId();
    const created = games.filter(g => g.creatorId === currentUserId);
    const joined = games.filter(
      g => g.creatorId !== currentUserId && g.players.some(p => p.id === currentUserId)
    );
    setCreatedGames(created);
    setJoinedGames(joined);
  };

  const handleEditName = async () => {
    const res = await Taro.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: userName
    });

    if (res.confirm && res.content && res.content.trim()) {
      const newName = res.content.trim();
      saveUserName(newName);
      setUserName(newName);
      Taro.showToast({ title: '修改成功', icon: 'success' });
    }
  };

  const handleGameClick = (gameId: string) => {
    Taro.navigateTo({ url: `/pages/game-detail/index?id=${gameId}` });
  };

  const getPlayerRole = (game: Game): string => {
    const currentUserId = getUserId();
    if (game.creatorId === currentUserId) {
      return '发起人';
    }
    const player = game.players.find(p => p.id === currentUserId);
    return player?.hasSubmitted ? '已提交' : '待提交';
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.profileCard}>
        <View className={styles.profileHeader}>
          <Image
            className={styles.avatar}
            src={`https://picsum.photos/id/${parseInt(userId.slice(-2), 36) % 100}/200/200`}
            mode="aspectFill"
          />
          <View className={styles.nameSection}>
            <View className={styles.nameRow} onClick={handleEditName}>
              <Text className={styles.name}>{userName}</Text>
              <Text className={styles.editIcon}>✏️</Text>
            </View>
            <Text className={styles.userId}>ID: {userId.slice(0, 8)}</Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{createdGames.length}</Text>
            <Text className={styles.statLabel}>发起</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{joinedGames.length}</Text>
            <Text className={styles.statLabel}>参与</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{createdGames.length + joinedGames.length}</Text>
            <Text className={styles.statLabel}>总计</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我发起的</Text>
          <Text className={styles.sectionCount}>{createdGames.length}车</Text>
        </View>

        {createdGames.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>还没有发起过车</Text>
          </View>
        ) : (
          <View className={styles.gameList}>
            {createdGames.map(game => (
              <View
                key={game.id}
                className={styles.gameItem}
                onClick={() => handleGameClick(game.id)}
              >
                <View className={styles.gameHeader}>
                  <Text className={styles.scriptName}>{game.scriptName}</Text>
                  <View className={styles.roleBadge}>
                    <Text className={styles.roleText}>{getPlayerRole(game)}</Text>
                  </View>
                </View>
                <View className={styles.gameInfo}>
                  <Text className={styles.infoText}>
                    {game.players.length}/{game.playerCount}人
                  </Text>
                  <Text className={styles.infoText}>
                    {dayjs(game.startTime).format('MM-DD HH:mm')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我参与的</Text>
          <Text className={styles.sectionCount}>{joinedGames.length}车</Text>
        </View>

        {joinedGames.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>🎮</Text>
            <Text className={styles.emptyText}>还没有参与过车</Text>
          </View>
        ) : (
          <View className={styles.gameList}>
            {joinedGames.map(game => (
              <View
                key={game.id}
                className={styles.gameItem}
                onClick={() => handleGameClick(game.id)}
              >
                <View className={styles.gameHeader}>
                  <Text className={styles.scriptName}>{game.scriptName}</Text>
                  <View className={styles.roleBadge}>
                    <Text className={styles.roleText}>{getPlayerRole(game)}</Text>
                  </View>
                </View>
                <View className={styles.gameInfo}>
                  <Text className={styles.infoText}>发起人: {game.creatorName}</Text>
                  <Text className={styles.infoText}>
                    {dayjs(game.startTime).format('MM-DD HH:mm')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default MinePage;
