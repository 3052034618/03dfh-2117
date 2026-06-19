import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import PlayerTag from '@/components/PlayerTag';
import KeywordSort from '@/components/KeywordSort';
import { playerTags } from '@/data/roleKeywords';
import { getUserId, getUserName, generateId } from '@/utils/storage';
import { generateAssignmentPlans } from '@/utils/algorithm';
import type { Game, Player, PlayerTagType } from '@/types/game';
import styles from './index.module.scss';

const GameDetailPage: React.FC = () => {
  const router = useRouter();
  const { games, updateGame, saveResult, refreshGames } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedTags, setSelectedTags] = useState<PlayerTagType[]>([]);
  const [keywordRanking, setKeywordRanking] = useState<string[]>([]);
  const [isCreator, setIsCreator] = useState(false);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadGame();
  }, [gameId, games]);

  useDidShow(() => {
    refreshGames();
    loadGame();
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
      }
    }
  };

  const handleShare = async () => {
    if (!game) return;
    
    try {
      await Taro.setClipboardData({ data: game.shareCode });
      Taro.showToast({ 
        title: `邀请码 ${game.shareCode} 已复制`, 
        icon: 'success' 
      });
    } catch (e) {
      console.error('[GameDetail] Share error:', e);
      Taro.showToast({ title: '复制失败', icon: 'none' });
    }
  };

  const toggleTag = (tag: PlayerTagType) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
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
          submitted: true
        };
      }
      return p;
    });

    const allSubmitted = updatedPlayers.every(p => p.submitted);
    const updatedGame: Game = {
      ...game,
      players: updatedPlayers,
      status: allSubmitted ? 'completed' : game.status
    };

    updateGame(updatedGame);
    setGame(updatedGame);

    if (allSubmitted) {
      const plans = generateAssignmentPlans(updatedGame);
      saveResult({
        gameId: game.id,
        plans,
        currentPlanIndex: 0,
        calculatedAt: Date.now()
      });

      Taro.showModal({
        title: '🎉 所有人已提交',
        content: '是否立即查看分配结果？',
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
    Taro.navigateTo({ url: `/pages/game-result/index?id=${game.id}` });
  };

  const handleRemovePlayer = async (playerId: string) => {
    if (!game || !isCreator) return;
    
    const res = await Taro.showModal({
      title: '确认移除',
      content: '确定要移除该玩家吗？',
      confirmText: '移除',
      confirmColor: '#F53F3F'
    });

    if (res.confirm) {
      const updatedPlayers = game.players.filter(p => p.id !== playerId);
      const updatedGame: Game = {
        ...game,
        players: updatedPlayers,
        status: updatedPlayers.length >= game.playerCount ? game.status : 'recruiting'
      };
      updateGame(updatedGame);
      setGame(updatedGame);
      Taro.showToast({ title: '已移除', icon: 'success' });
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
        submitted: false,
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

  const submittedCount = game.players.filter(p => p.submitted).length;
  const allSubmitted = submittedCount === game.players.length && game.players.length === game.playerCount;
  const canSubmit = !currentPlayer?.submitted && 
                    selectedTags.length > 0 && 
                    keywordRanking.length === game.roleKeywords.length;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.gameInfo}>
        <Text className={styles.scriptName}>{game.scriptName}</Text>
        
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>人数</Text>
            <Text className={styles.infoValue}>
              {game.players.length}/{game.playerCount}人
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
          <View>
            <Text className={styles.infoLabel}>邀请码</Text>
            <Text className={styles.shareCode}>{game.shareCode}</Text>
          </View>
          <Button className={styles.shareBtn} onClick={handleShare}>
            复制邀请码
          </Button>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>👥 玩家列表</Text>
          <Text className={styles.sectionCount}>
            已提交 {submittedCount}/{game.players.length}
          </Text>
        </View>

        <View className={styles.playerList}>
          {game.players.map(player => (
            <View key={player.id} className={styles.playerItem}>
              <Image
                className={styles.playerAvatar}
                src={player.avatar}
                mode="aspectFill"
              />
              <View className={styles.playerInfo}>
                <View className={styles.playerNameRow}>
                  <Text className={styles.playerName}>{player.name}</Text>
                  {player.id === game.creatorId && (
                    <View className={styles.creatorBadge}>
                      <Text className={styles.creatorText}>发起人</Text>
                    </View>
                  )}
                </View>
                <View className={styles.playerTags}>
                  {player.tags.map(tag => (
                    <PlayerTag key={tag} tag={tag} size="sm" />
                  ))}
                  {player.tags.length === 0 && player.submitted === false && (
                    <Text style={{ fontSize: '24rpx', color: '#B2BEC3' }}>
                      待选择标签
                    </Text>
                  )}
                </View>
              </View>
              <View className={styles.playerStatus}>
                <View
                  className={classnames(
                    styles.statusDot,
                    player.submitted && styles.submitted
                  )}
                />
                <Text className={styles.statusText}>
                  {player.submitted ? '已提交' : '待提交'}
                </Text>
              </View>
              {isCreator && player.id !== game.creatorId && (
                <Button
                  className={styles.removeBtn}
                  onClick={() => handleRemovePlayer(player.id)}
                >
                  <Text className={styles.removeIcon}>×</Text>
                </Button>
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

      {currentPlayer && !currentPlayer.submitted && (
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

      {currentPlayer?.submitted && !allSubmitted && (
        <View className={styles.section}>
          <View className={styles.card}>
            <Text style={{ fontSize: '28rpx', color: '#636E72', textAlign: 'center' }}>
              ✓ 你已提交偏好，等待其他玩家提交...
            </Text>
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

      {!allSubmitted && currentPlayer && !currentPlayer.submitted && (
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
