import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter, usePullDownRefresh, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useGame } from '@/store/GameContext';
import GameCard from '@/components/GameCard';
import { getUserName, getUserId, setUserName } from '@/utils/storage';
import type { Game } from '@/types/game';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const router = useRouter();
  const { games, loading, refreshGames, joinGameByCode } = useGame();
  const [inviteCode, setInviteCode] = useState('');
  const [activeGames, setActiveGames] = useState<Game[]>([]);
  const [completedGames, setCompletedGames] = useState<Game[]>([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [pendingCode, setPendingCode] = useState('');

  useEffect(() => {
    checkInviteParam();
  }, []);

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

  const checkInviteParam = async () => {
    const inviteParam = router.params.invite as string;
    if (inviteParam) {
      const code = inviteParam.toUpperCase().trim();
      setInviteCode(code);
      handleJoinWithCheck(code);
    }
  };

  const filterGames = () => {
    const active = games.filter(g => g.status !== 'completed');
    const completed = games.filter(g => g.status === 'completed');
    setActiveGames(active);
    setCompletedGames(completed);
  };

  const handleJoinWithCheck = async (code: string) => {
    const currentName = getUserName();
    if (!currentName || currentName === '玩家') {
      setPendingCode(code);
      setShowNameModal(true);
      return;
    }

    await doJoin(code, currentName);
  };

  const doJoin = async (code: string, playerName: string) => {
    const joinedGame = await joinGameByCode(code, playerName);
    if (joinedGame) {
      setInviteCode('');
      setTimeout(() => {
        Taro.navigateTo({ url: `/pages/game-detail/index?id=${joinedGame.id}` });
      }, 500);
    }
  };

  const handleJoinByCode = () => {
    if (!inviteCode.trim()) {
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    handleJoinWithCheck(inviteCode.trim().toUpperCase());
  };

  const handleConfirmName = async () => {
    if (!tempName.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    const name = tempName.trim();
    setUserName(name);
    setShowNameModal(false);
    
    if (pendingCode) {
      await doJoin(pendingCode, name);
      setPendingCode('');
    }
    setTempName('');
  };

  const handleCreateGame = () => {
    const currentName = getUserName();
    if (!currentName || currentName === '玩家') {
      setPendingCode('');
      setShowNameModal(true);
      return;
    }
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
            placeholderClass={styles.searchPlaceholder}
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

      {showNameModal && (
        <View className={styles.modalOverlay} onClick={() => setShowNameModal(false)}>
          <View className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <Text className={styles.modalTitle}>设置你的昵称</Text>
            <Text className={styles.modalDesc}>请输入你在游戏中使用的昵称</Text>
            <Input
              className={styles.modalInput}
              placeholder="请输入昵称"
              placeholderClass={styles.searchPlaceholder}
              value={tempName}
              onInput={e => setTempName(e.detail.value)}
              maxLength={10}
              focus
            />
            <View className={styles.modalActions}>
              <Button 
                className={styles.modalCancelBtn} 
                onClick={() => {
                  setShowNameModal(false);
                  setPendingCode('');
                  setTempName('');
                }}
              >
                取消
              </Button>
              <Button className={styles.modalConfirmBtn} onClick={handleConfirmName}>
                确认
              </Button>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default HomePage;
