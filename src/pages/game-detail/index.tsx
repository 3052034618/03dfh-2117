import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import PlayerTag from '@/components/PlayerTag';
import KeywordSort from '@/components/KeywordSort';
import { playerTags } from '@/data/roleKeywords';
import { getUserId, generateId, getUserName } from '@/utils/storage';
import { generateAssignmentPlans, incrementalRecalculate } from '@/utils/algorithm';
import { shareGameToFriend, checkSyncHealth, setSyncBaseUrl, getSyncBaseUrl } from '@/services/cloudService';
import type { Game, Player, PlayerTagType } from '@/types/game';
import styles from './index.module.scss';

const GameDetailPage: React.FC = () => {
  const router = useRouter();
  const { games, updateGame, saveResult, refreshGames, refreshGameFromCloudSync } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedTags, setSelectedTags] = useState<PlayerTagType[]>([]);
  const [keywordRanking, setKeywordRanking] = useState<string[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [replacePlayerId, setReplacePlayerId] = useState<string | null>(null);
  const [syncOnline, setSyncOnline] = useState<boolean | null>(null);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadGame();
  }, [gameId, games]);

  useDidShow(async () => {
    refreshGames();
    loadGame();
    
    try {
      const health = await checkSyncHealth();
      setSyncOnline(health === 'online');
    } catch {
      setSyncOnline(false);
    }
    
    if (game?.shareCode) {
      const refreshed = await refreshGameFromCloudSync(game.id, game.shareCode);
      if (refreshed) {
        setGame(refreshed);
        const userId = getUserId();
        const player = refreshed.players.find(p => p.id === userId);
        if (player) {
          setCurrentPlayer(player);
          setSelectedTags([...player.tags]);
          setKeywordRanking([...player.keywordRanking]);
        }
      }
    }
  });

  useShareAppMessage(() => {
    if (!game) return { title: '剧本杀角色分配', path: '/pages/home/index' };
    return {
      title: `🎭 ${game.scriptName} - 剧本杀角色分配`,
      path: `/pages/home/index?invite=${game.shareCode}`,
      imageUrl: ''
    };
  });

  useShareTimeline(() => {
    if (!game) return { title: '剧本杀角色分配', query: '' };
    return {
      title: `🎭 ${game.scriptName} - 邀请码 ${game.shareCode}`,
      query: `invite=${game.shareCode}`,
      imageUrl: ''
    };
  });

  const loadGame = () => {
    const foundGame = games.find(g => g.id === gameId);
    if (foundGame) {
      setGame(foundGame);
      const userId = getUserId();
      setIsCreator(foundGame.creatorId === userId);
      
      const player = foundGame.players.find(p => p.id === userId);
      if (player) {
        setCurrentPlayer(player);
        setSelectedTags([...player.tags]);
        setKeywordRanking([...player.keywordRanking]);
      } else {
        const unclaimed = foundGame.players.find(
          p => p.isReplaced && !p.hasSubmitted && p.name === getUserName()
        );
        if (unclaimed) {
          unclaimed.id = userId;
          unclaimed.isReplaced = false;
          unclaimed.originalName = undefined;
          setCurrentPlayer(unclaimed);
          setSelectedTags([]);
          setKeywordRanking([]);
          updateGame(foundGame);
          setGame(foundGame);
        }
      }
    }
  };

  const handleShare = async () => {
    if (!game) return;
    await shareGameToFriend(game);
  };

  const toggleTag = (tag: PlayerTagType) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const isGameReady = (g: Game): boolean => {
    const isFull = g.players.length >= g.playerCount;
    const allSubmitted = g.players.every(p => p.hasSubmitted);
    return isFull && allSubmitted;
  };

  const handleSubmit = () => {
    if (!game || !currentPlayer) return;

    if (selectedTags.length === 0) {
      Taro.showToast({ title: '请至少选择一个标签', icon: 'none' });
      return;
    }

    if (keywordRanking.length !== game.roleKeywords.length) {
      Taro.showToast({ 
        title: `请对所有${game.roleKeywords.length}个关键词排序`, 
        icon: 'none' 
      });
      return;
    }

    const updatedPlayers = game.players.map(p => {
      if (p.id === currentPlayer.id) {
        return {
          ...p,
          tags: selectedTags,
          keywordRanking,
          hasSubmitted: true,
          isReplaced: false,
          originalName: undefined
        };
      }
      return p;
    });

    const ready = updatedPlayers.length >= game.playerCount && 
                  updatedPlayers.every(p => p.hasSubmitted);

    const updatedGame: Game = {
      ...game,
      players: updatedPlayers,
      status: ready ? 'completed' : (updatedPlayers.length >= game.playerCount ? 'submitting' : 'recruiting')
    };

    updateGame(updatedGame);
    setGame(updatedGame);

    if (ready) {
      const plans = generateAssignmentPlans(updatedGame);
      saveResult({
        gameId: game.id,
        plans,
        currentPlanIndex: 0,
        calculatedAt: Date.now(),
        previousPlayerIds: updatedPlayers.map(p => p.id)
      });

      Taro.showModal({
        title: '🎉 所有人已提交',
        content: '已为你生成三种分配方案，是否立即查看？',
        confirmText: '查看结果',
        cancelText: '稍后再说'
      }).then(res => {
        if (res.confirm) {
          Taro.navigateTo({ url: `/pages/game-result/index?id=${game.id}` });
        }
      });
    } else {
      Taro.showToast({ title: '提交成功', icon: 'success' });
    }
  };

  const handleViewResult = () => {
    if (!game) return;
    if (!isGameReady(game)) {
      Taro.showToast({ title: '请等满员且全员提交后再查看', icon: 'none' });
      return;
    }
    Taro.navigateTo({ url: `/pages/game-result/index?id=${game.id}` });
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!game || !isCreator) return;
    
    const res = await Taro.showModal({
      title: '移除玩家',
      content: '确定要移除该玩家吗？',
      confirmText: '移除',
      confirmColor: '#F53F3F'
    });

    if (res.confirm) {
      const updatedPlayers = game.players.filter(p => p.id !== playerId);
      const updatedGame: Game = {
        ...game,
        players: updatedPlayers,
        status: updatedPlayers.length >= game.playerCount ? 'submitting' : 'recruiting'
      };
      updateGame(updatedGame);
      setGame(updatedGame);
      Taro.showToast({ title: '已移除', icon: 'success' });
    }
  };

  const handleVacatePlayer = async (playerId: string) => {
    if (!game || !isCreator) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    const res = await Taro.showModal({
      title: `腾出「${player.name}」的位子`,
      content: '该位置将变为空位，新玩家输入邀请码后可认领此空位。',
      confirmText: '腾出空位',
      cancelText: '取消'
    });

    if (res.confirm) {
      const updatedPlayers = game.players.map(p => {
        if (p.id === playerId) {
          return {
            ...p,
            id: 'vacant_' + playerId,
            name: '空位（待认领）',
            avatar: '',
            tags: [],
            keywordRanking: [],
            hasSubmitted: false,
            joinedAt: Date.now(),
            isReplaced: true,
            originalName: player.name
          };
        }
        return p;
      });

      const updatedGame: Game = {
        ...game,
        players: updatedPlayers,
        status: 'submitting'
      };

      updateGame(updatedGame);
      setGame(updatedGame);
      setReplacePlayerId(null);
      Taro.showToast({ title: '已腾出空位，新玩家输入邀请码即可认领', icon: 'success', duration: 2000 });
    }
  };

  const handleAddPlayer = async () => {
    if (!game || !isCreator) return;

    if (game.players.length >= game.playerCount) {
      Taro.showToast({ title: '已达最大人数', icon: 'none' });
      return;
    }

    const res = await Taro.showModal({
      title: '添加玩家',
      editable: true,
      placeholderText: '请输入玩家昵称'
    });

    if (res.confirm && res.content && res.content.trim()) {
      const newPlayer: Player = {
        id: generateId(),
        name: res.content.trim(),
        avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
        tags: [],
        keywordRanking: [],
        hasSubmitted: false,
        joinedAt: Date.now()
      };

      const updatedGame: Game = {
        ...game,
        players: [...game.players, newPlayer],
        status: game.players.length + 1 >= game.playerCount ? 'submitting' : game.status
      };

      updateGame(updatedGame);
      setGame(updatedGame);
      Taro.showToast({ title: '添加成功', icon: 'success' });
    }
  };

  if (!game) {
    return (
      <ScrollView className={styles.page} scrollY>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🔍</Text>
          <Text className={styles.emptyText}>未找到该车次</Text>
        </View>
      </ScrollView>
    );
  }

  const submittedCount = game.players.filter(p => p.hasSubmitted).length;
  const isFull = game.players.length >= game.playerCount;
  const allSubmitted = isFull && game.players.every(p => p.hasSubmitted);
  const canSubmit = currentPlayer && !currentPlayer.hasSubmitted && 
                    selectedTags.length > 0 && 
                    keywordRanking.length === game.roleKeywords.length;
  const progressPercent = game.playerCount > 0 ? 
    Math.min(100, Math.round((submittedCount / game.playerCount) * 100)) : 0;
  const hasVacantSlot = game.players.some(p => p.isReplaced && !p.hasSubmitted);

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.gameInfo}>
        <Text className={styles.scriptName}>{game.scriptName}</Text>
        
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>人数</Text>
            <Text className={classnames(styles.infoValue, isFull && styles.full)}>
              {game.players.length}/{game.playerCount}人
              {isFull && ' ✓'}
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>开本时间</Text>
            <Text className={styles.infoValue}>
              {dayjs(game.startTime).format('MM-DD HH:mm')}
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>发起人</Text>
            <Text className={styles.infoValue}>{game.creatorName}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>是否可反串</Text>
            <Text className={styles.infoValue}>
              {game.allowCrossGender ? '是' : '否'}
            </Text>
          </View>
        </View>

        <View className={styles.shareSection}>
          <View style={{ flex: 1 }}>
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: '8rpx' }}>
              <Text className={styles.infoLabel}>邀请码</Text>
              {syncOnline === true && (
                <View style={{ marginLeft: '16rpx', display: 'flex', alignItems: 'center' }}>
                  <View style={{
                    width: '12rpx', height: '12rpx', borderRadius: '50%',
                    backgroundColor: '#00B894', marginRight: '6rpx'
                  }} />
                  <Text style={{ fontSize: '22rpx', color: '#00B894' }}>可跨设备</Text>
                </View>
              )}
              {syncOnline === false && (
                <View style={{ marginLeft: '16rpx', display: 'flex', alignItems: 'center' }}>
                  <View style={{
                    width: '12rpx', height: '12rpx', borderRadius: '50%',
                    backgroundColor: '#F39C12', marginRight: '6rpx'
                  }} />
                  <Text style={{ fontSize: '22rpx', color: '#F39C12' }}>本机模式</Text>
                </View>
              )}
            </View>
            <View style={{ display: 'flex', alignItems: 'center', gap: '16rpx' }}>
              <Text className={styles.shareCode} selectable>{game.shareCode}</Text>
              <Text
                style={{
                  fontSize: '22rpx',
                  color: '#6C5CE7',
                  padding: '4rpx 12rpx',
                  backgroundColor: 'rgba(108, 92, 231, 0.1)',
                  borderRadius: '8rpx'
                }}
                onClick={async () => {
                  const res = await Taro.showModal({
                    title: '同步服务地址',
                    editable: true,
                    placeholderText: 'http://你的服务器IP:3456/api',
                    content: getSyncBaseUrl()
                  });
                  if (res.confirm && res.content?.trim()) {
                    const url = res.content.trim();
                    setSyncBaseUrl(url);
                    Taro.showToast({ title: '已保存，将自动检测', icon: 'success' });
                  }
                }}
              >
                ⚙️ 服务器
              </Text>
            </View>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', gap: '12rpx' }}>
            <Button className={styles.shareBtn} onClick={handleShare}>
              📤 分享邀请
            </Button>
            <Button
              className={styles.refreshSyncBtn}
              onClick={async () => {
                const refreshed = await refreshGameFromCloudSync(game!.id, game!.shareCode);
                if (refreshed) {
                  setGame(refreshed);
                  const userId = getUserId();
                  const p = refreshed.players.find(pl => pl.id === userId);
                  if (p) {
                    setCurrentPlayer(p);
                    setSelectedTags([...p.tags]);
                    setKeywordRanking([...p.keywordRanking]);
                  }
                  Taro.showToast({ title: '已刷新', icon: 'success' });
                } else {
                  Taro.showToast({ title: '暂无新数据', icon: 'none' });
                }
              }}
            >
              🔄 同步
            </Button>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📊 提交进度</Text>
        </View>
        <View className={styles.progressCard}>
          <View className={styles.progressInfo}>
            <Text className={styles.progressText}>
              已提交 {submittedCount}/{game.playerCount}
            </Text>
            <Text className={classnames(
              styles.progressStatus,
              allSubmitted ? styles.done : (isFull ? styles.waiting : styles.recruiting)
            )}>
              {allSubmitted ? '✓ 全员已提交' : (hasVacantSlot ? '⚠️ 有空位待认领' : (isFull ? '⏳ 等待剩余玩家提交' : '👥 招募中'))}
            </Text>
          </View>
          <View className={styles.progressBar}>
            <View 
              className={classnames(
                styles.progressFill,
                allSubmitted ? styles.doneFill : styles.normalFill
              )} 
              style={{ width: `${progressPercent}%` }} 
            />
          </View>
          {!isFull && !hasVacantSlot && (
            <Text className={styles.progressTip}>
              💡 还差 {game.playerCount - game.players.length} 人满员，快邀请好友加入吧！
            </Text>
          )}
          {hasVacantSlot && (
            <Text className={styles.progressTip}>
              ⚠️ 有空位待认领，请把邀请码 {game.shareCode} 发给新玩家
            </Text>
          )}
          {isFull && !allSubmitted && !hasVacantSlot && (
            <Text className={styles.progressTip}>
              ⏳ 还差 {game.players.length - submittedCount} 人提交，结果将在全员提交后生成
            </Text>
          )}
          {allSubmitted && (
            <Text className={styles.progressTip}>
              🎉 所有人已完成提交，点击下方按钮查看分配结果
            </Text>
          )}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>👥 玩家列表</Text>
          {isCreator && (
            <Text className={styles.sectionTip}>点击非发起人可操作</Text>
          )}
        </View>

        <View className={styles.playerList}>
          {game.players.map(player => (
            <View 
              key={player.id} 
              className={classnames(
                styles.playerItem,
                player.isReplaced && !player.hasSubmitted && styles.vacantItem,
                isCreator && player.id !== game.creatorId && !player.isReplaced && styles.playerClickable
              )}
              onClick={() => {
                if (isCreator && player.id !== game.creatorId && !player.isReplaced) {
                  setReplacePlayerId(replacePlayerId === player.id ? null : player.id);
                }
              }}
            >
              {player.avatar ? (
                <Image
                  className={styles.playerAvatar}
                  src={player.avatar}
                  mode="aspectFill"
                />
              ) : (
                <View className={styles.vacantAvatar}>
                  <Text className={styles.vacantIcon}>?</Text>
                </View>
              )}
              <View className={styles.playerInfo}>
                <View className={styles.playerNameRow}>
                  <Text className={classnames(
                    styles.playerName,
                    player.isReplaced && !player.hasSubmitted && styles.vacantName
                  )}>
                    {player.name}
                  </Text>
                  {player.id === game.creatorId && (
                    <View className={styles.creatorBadge}>
                      <Text className={styles.creatorText}>发起人</Text>
                    </View>
                  )}
                  {player.isReplaced && !player.hasSubmitted && (
                    <View className={styles.vacantBadge}>
                      <Text className={styles.vacantBadgeText}>空位</Text>
                    </View>
                  )}
                </View>
                {player.originalName && player.isReplaced && (
                  <Text className={styles.originalName}>原：{player.originalName}</Text>
                )}
                <View className={styles.playerTags}>
                  {player.tags.map(tag => (
                    <PlayerTag key={tag} tag={tag} size="sm" />
                  ))}
                  {player.tags.length === 0 && !player.hasSubmitted && !player.isReplaced && (
                    <Text style={{ fontSize: '24rpx', color: '#B2BEC3' }}>
                      待选择标签
                    </Text>
                  )}
                </View>
              </View>
              <View className={styles.playerStatus}>
                {!player.isReplaced && (
                  <>
                    <View
                      className={classnames(
                        styles.statusDot,
                        player.hasSubmitted && styles.submitted
                      )}
                    />
                    <Text className={styles.statusText}>
                      {player.hasSubmitted ? '已提交' : '待提交'}
                    </Text>
                  </>
                )}
              </View>
              {isCreator && replacePlayerId === player.id && player.id !== game.creatorId && !player.isReplaced && (
                <View className={styles.replaceActions}>
                  <Button 
                    className={styles.vacateBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVacatePlayer(player.id);
                    }}
                  >
                    腾出空位
                  </Button>
                  <Button 
                    className={styles.removeBtnSmall}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlayer(player.id);
                    }}
                  >
                    移除
                  </Button>
                </View>
              )}
            </View>
          ))}
        </View>

        {isCreator && game.players.length < game.playerCount && (
          <Button className={styles.addPlayerBtn} onClick={handleAddPlayer}>
            + 添加玩家
          </Button>
        )}
      </View>

      {currentPlayer && !currentPlayer.hasSubmitted && (
        <View className={styles.section}>
          <View className={styles.card}>
            <View className={styles.tagsSection}>
              <Text className={styles.tagsTitle}>🏷️ 选择你的玩本状态</Text>
              <Text className={styles.tagsDesc}>
                选择符合你的标签，帮助系统更好地分配角色
              </Text>
              <View className={styles.tagsList}>
                {playerTags.map(tag => (
                  <PlayerTag
                    key={tag.key}
                    tag={tag.key}
                    selected={selectedTags.includes(tag.key)}
                    onClick={() => toggleTag(tag.key)}
                  />
                ))}
              </View>
            </View>

            <KeywordSort
              keywords={game.roleKeywords}
              value={keywordRanking}
              onChange={setKeywordRanking}
            />
          </View>
        </View>
      )}

      {currentPlayer?.hasSubmitted && !allSubmitted && (
        <View className={styles.section}>
          <View className={styles.card}>
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16rpx' }}>
              <Text style={{ fontSize: '32rpx', color: '#00B894', fontWeight: 600 }}>
                ✓ 你已提交偏好
              </Text>
              <Text style={{ fontSize: '26rpx', color: '#636E72', textAlign: 'center' }}>
                {hasVacantSlot
                  ? '等待新玩家认领空位并提交...'
                  : (isFull 
                    ? `等待其他 ${game.players.length - submittedCount} 位玩家提交...`
                    : '等待满员和其他玩家提交...'
                  )
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      {allSubmitted && (
        <Button
          className={classnames(styles.submitBtn, styles.viewResult)}
          onClick={handleViewResult}
        >
          🎉 查看分配结果
        </Button>
      )}

      {!allSubmitted && currentPlayer && !currentPlayer.hasSubmitted && (
        <Button
          className={classnames(styles.submitBtn, !canSubmit && styles.disabled)}
          onClick={handleSubmit}
        >
          提交我的偏好
        </Button>
      )}
    </ScrollView>
  );
};

export default GameDetailPage;
