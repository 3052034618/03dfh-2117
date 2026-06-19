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
import { shareGameToFriend, setSyncBaseUrl, getSyncBaseUrl } from '@/services/cloudService';
import type { Game, Player, PlayerTagType, GameEvent } from '@/types/game';
import styles from './index.module.scss';

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  created: { icon: '🎬', color: '#6C5CE7' },
  joined: { icon: '👋', color: '#00B894' },
  submitted: { icon: '✅', color: '#0984E3' },
  vacated: { icon: '🚪', color: '#FDCB6E' },
  claimed: { icon: '🎯', color: '#FD79A8' },
  removed: { icon: '🗑️', color: '#FF7675' },
  resultGenerated: { icon: '🎉', color: '#00B894' }
};

const GameDetailPage: React.FC = () => {
  const router = useRouter();
  const { games, updateGame, saveResult, refreshGames, refreshGameFromCloudSync, syncState, checkSync, addEvent } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [selectedTags, setSelectedTags] = useState<PlayerTagType[]>([]);
  const [keywordRanking, setKeywordRanking] = useState<string[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [replacePlayerId, setReplacePlayerId] = useState<string | null>(null);
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadGame();
  }, [gameId, games]);

  useDidShow(async () => {
    refreshGames();
    loadGame();
    await checkSync();
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
      title: `🎭 ${game.scriptName} - 邀请码 ${game.shareCode}`,
      path: `/pages/home/index?invite=${game.shareCode}`,
    };
  });

  useShareTimeline(() => {
    if (!game) return { title: '剧本杀角色分配', query: '' };
    return {
      title: `🎭 ${game.scriptName} - 邀请码 ${game.shareCode}`,
      query: `invite=${game.shareCode}`,
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
      }
    }
  };

  const handleShare = async () => {
    if (!game) return;
    const result = await shareGameToFriend(game);
    if (result.mode === 'wx_card') {
      Taro.showModal({
        title: '分享给好友',
        content: `点击右上角「...」→「发送给朋友」\n\n分享卡片已自动带上邀请码 ${game.shareCode}，好友点击即可加入！`,
        confirmText: '知道了',
        showCancel: false
      });
    }
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

  const handleSubmit = async () => {
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
        return { ...p, tags: selectedTags, keywordRanking, hasSubmitted: true };
      }
      return p;
    });

    addEvent(game.id, 'submitted', currentPlayer.name, '提交了偏好');

    const ready = updatedPlayers.length >= game.playerCount && 
                  updatedPlayers.every(p => p.hasSubmitted);

    const updatedGame: Game = {
      ...game,
      players: updatedPlayers,
      status: ready ? 'completed' : (updatedPlayers.length >= game.playerCount ? 'submitting' : 'recruiting')
    };

    const { online } = await updateGame(updatedGame);
    setGame(updatedGame);

    if (ready) {
      const plans = generateAssignmentPlans(updatedGame);
      const resultRes = await saveResult({
        gameId: game.id,
        plans,
        currentPlanIndex: 0,
        calculatedAt: Date.now(),
        previousPlayerIds: updatedPlayers.map(p => p.id)
      });

      addEvent(game.id, 'resultGenerated', '系统', '全员已提交，分配结果已生成');

      Taro.showModal({
        title: '🎉 所有人已提交',
        content: online
          ? '已为你生成三种分配方案（已同步到云端），是否立即查看？'
          : '已生成分配方案（仅保存在本机），是否立即查看？',
        confirmText: '查看结果',
        cancelText: '稍后再说'
      }).then(res => {
        if (res.confirm) {
          Taro.navigateTo({ url: `/pages/game-result/index?id=${game.id}` });
        }
      });
    } else {
      Taro.showToast({ 
        title: online ? '提交成功' : '提交成功（仅本机）', 
        icon: 'success' 
      });
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
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    const res = await Taro.showModal({
      title: '移除玩家',
      content: `确定要移除「${player.name}」吗？`,
      confirmText: '移除',
      confirmColor: '#F53F3F'
    });

    if (res.confirm) {
      addEvent(game.id, 'removed', player.name, '被发起人移除');
      const updatedPlayers = game.players.filter(p => p.id !== playerId);
      const updatedGame: Game = {
        ...game,
        players: updatedPlayers,
        status: updatedPlayers.length >= game.playerCount ? 'submitting' : 'recruiting'
      };
      await updateGame(updatedGame);
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
      addEvent(game.id, 'vacated', player.name, '被腾出空位，等待新玩家认领');
      
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

      const updatedGame: Game = { ...game, players: updatedPlayers, status: 'submitting' };
      await updateGame(updatedGame);
      setGame(updatedGame);
      setReplacePlayerId(null);
      Taro.showToast({ title: '已腾出空位', icon: 'success' });
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
      const name = res.content.trim();
      const newPlayer: Player = {
        id: generateId(),
        name,
        avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
        tags: [],
        keywordRanking: [],
        hasSubmitted: false,
        joinedAt: Date.now()
      };
      
      addEvent(game.id, 'joined', name, '被发起人添加到车次');

      const updatedGame: Game = {
        ...game,
        players: [...game.players, newPlayer],
        status: game.players.length + 1 >= game.playerCount ? 'submitting' : game.status
      };

      await updateGame(updatedGame);
      setGame(updatedGame);
      Taro.showToast({ title: '添加成功', icon: 'success' });
    }
  };

  const handleSyncRefresh = async () => {
    if (!game) return;
    await checkSync();
    const refreshed = await refreshGameFromCloudSync(game.id, game.shareCode);
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
      Taro.showToast({ title: syncState.online ? '暂无新数据' : '无法连接服务器', icon: 'none' });
    }
  };

  const handleSaveSyncUrl = async (url: string) => {
    setSyncBaseUrl(url);
    await checkSync();
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
  const events = game.events || [];

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.gameInfo}>
        <Text className={styles.scriptName}>{game.scriptName}</Text>
        
        <View className={styles.infoGrid}>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>人数</Text>
            <Text className={classnames(styles.infoValue, isFull && styles.full)}>
              {game.players.length}/{game.playerCount}人{isFull && ' ✓'}
            </Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>开本时间</Text>
            <Text className={styles.infoValue}>{dayjs(game.startTime).format('MM-DD HH:mm')}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>发起人</Text>
            <Text className={styles.infoValue}>{game.creatorName}</Text>
          </View>
          <View className={styles.infoItem}>
            <Text className={styles.infoLabel}>反串</Text>
            <Text className={styles.infoValue}>{game.allowCrossGender ? '是' : '否'}</Text>
          </View>
        </View>

        <View className={styles.shareSection}>
          <View style={{ flex: 1 }}>
            <View style={{ display: 'flex', alignItems: 'center', marginBottom: '8rpx' }}>
              <Text className={styles.infoLabel}>邀请码</Text>
              <View
                className={classnames(
                  styles.syncBadge,
                  syncState.online === true && styles.syncOnline,
                  syncState.online === false && styles.syncOffline
                )}
                onClick={() => setShowSyncConfig(!showSyncConfig)}
              >
                <View className={styles.syncDot} />
                <Text className={styles.syncBadgeText}>
                  {syncState.online === true ? '可跨设备' : syncState.online === false ? '仅本机' : '检测中'}
                </Text>
              </View>
            </View>
            <Text className={styles.shareCode} selectable>{game.shareCode}</Text>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', gap: '12rpx' }}>
            <Button className={styles.shareBtn} onClick={handleShare}>📤 分享邀请</Button>
            <Button className={styles.refreshSyncBtn} onClick={handleSyncRefresh}>🔄 同步</Button>
          </View>
        </View>

        {showSyncConfig && (
          <View className={styles.syncConfig}>
            <View className={styles.syncConfigRow}>
              <Text className={styles.syncConfigLabel}>服务地址</Text>
              <Text 
                className={styles.syncConfigValue}
                onClick={async () => {
                  const res = await Taro.showModal({
                    title: '修改同步服务地址',
                    editable: true,
                    placeholderText: 'http://IP:3456/api',
                    content: syncState.baseUrl
                  });
                  if (res.confirm && res.content?.trim()) {
                    await handleSaveSyncUrl(res.content.trim());
                  }
                }}
              >
                {syncState.baseUrl} ✏️
              </Text>
            </View>
            <View className={styles.syncConfigRow}>
              <Text className={styles.syncConfigLabel}>在线状态</Text>
              <Text className={classnames(
                styles.syncConfigValue,
                syncState.online === true && styles.textGreen,
                syncState.online === false && styles.textOrange
              )}>
                {syncState.online === true ? '🟢 在线' : syncState.online === false ? '🟠 离线' : '⚪ 未检测'}
              </Text>
            </View>
            <View className={styles.syncConfigRow}>
              <Text className={styles.syncConfigLabel}>最后检测</Text>
              <Text className={styles.syncConfigValue}>
                {syncState.lastCheckedAt ? dayjs(syncState.lastCheckedAt).format('HH:mm:ss') : '--'}
              </Text>
            </View>
            <Button 
              className={styles.syncCheckBtn} 
              onClick={async () => { await checkSync(); }}
            >
              立即检测
            </Button>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>📊 提交进度</Text>
        </View>
        <View className={styles.progressCard}>
          <View className={styles.progressInfo}>
            <Text className={styles.progressText}>已提交 {submittedCount}/{game.playerCount}</Text>
            <Text className={classnames(
              styles.progressStatus,
              allSubmitted ? styles.done : (hasVacantSlot ? styles.recruiting : (isFull ? styles.waiting : styles.recruiting))
            )}>
              {allSubmitted ? '✓ 全员已提交' : (hasVacantSlot ? '⚠️ 有空位' : (isFull ? '⏳ 等待提交' : '👥 招募中'))}
            </Text>
          </View>
          <View className={styles.progressBar}>
            <View className={classnames(styles.progressFill, allSubmitted ? styles.doneFill : styles.normalFill)} 
              style={{ width: `${progressPercent}%` }} />
          </View>
          {!isFull && !hasVacantSlot && (
            <Text className={styles.progressTip}>💡 还差 {game.playerCount - game.players.length} 人满员</Text>
          )}
          {hasVacantSlot && (
            <Text className={styles.progressTip}>⚠️ 有空位待认领，邀请码 {game.shareCode}</Text>
          )}
          {isFull && !allSubmitted && !hasVacantSlot && (
            <Text className={styles.progressTip}>⏳ 还差 {game.players.length - submittedCount} 人提交</Text>
          )}
          {allSubmitted && (
            <Text className={styles.progressTip}>🎉 全员完成，点击查看分配结果</Text>
          )}
        </View>
      </View>

      {events.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📋 车内动态</Text>
          </View>
          <View className={styles.eventList}>
            {events.slice().reverse().slice(0, 20).map(event => {
              const cfg = EVENT_ICONS[event.type] || { icon: '📌', color: '#636E72' };
              return (
                <View key={event.id} className={styles.eventItem}>
                  <View className={styles.eventIcon}><Text>{cfg.icon}</Text></View>
                  <View className={styles.eventContent}>
                    <Text className={styles.eventText}>
                      <Text style={{ fontWeight: 600 }}>{event.playerName}</Text>
                      {event.detail ? ` ${event.detail}` : ''}
                    </Text>
                    <Text className={styles.eventTime}>{dayjs(event.timestamp).format('HH:mm')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>👥 玩家列表</Text>
          {isCreator && <Text className={styles.sectionTip}>点击非发起人可操作</Text>}
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
                <Image className={styles.playerAvatar} src={player.avatar} mode="aspectFill" />
              ) : (
                <View className={styles.vacantAvatar}><Text className={styles.vacantIcon}>?</Text></View>
              )}
              <View className={styles.playerInfo}>
                <View className={styles.playerNameRow}>
                  <Text className={classnames(styles.playerName, player.isReplaced && !player.hasSubmitted && styles.vacantName)}>
                    {player.name}
                  </Text>
                  {player.id === game.creatorId && (
                    <View className={styles.creatorBadge}><Text className={styles.creatorText}>发起人</Text></View>
                  )}
                  {player.isReplaced && !player.hasSubmitted && (
                    <View className={styles.vacantBadge}><Text className={styles.vacantBadgeText}>空位</Text></View>
                  )}
                </View>
                {player.originalName && player.isReplaced && (
                  <Text className={styles.originalName}>原：{player.originalName}</Text>
                )}
                <View className={styles.playerTags}>
                  {player.tags.map(tag => <PlayerTag key={tag} tag={tag} size="sm" />)}
                </View>
              </View>
              <View className={styles.playerStatus}>
                {!player.isReplaced && (
                  <>
                    <View className={classnames(styles.statusDot, player.hasSubmitted && styles.submitted)} />
                    <Text className={styles.statusText}>{player.hasSubmitted ? '已提交' : '待提交'}</Text>
                  </>
                )}
              </View>
              {isCreator && replacePlayerId === player.id && player.id !== game.creatorId && !player.isReplaced && (
                <View className={styles.replaceActions}>
                  <Button className={styles.vacateBtn} onClick={e => { e.stopPropagation(); handleVacatePlayer(player.id); }}>腾出空位</Button>
                  <Button className={styles.removeBtnSmall} onClick={e => { e.stopPropagation(); handleRemovePlayer(player.id); }}>移除</Button>
                </View>
              )}
            </View>
          ))}
        </View>
        {isCreator && game.players.length < game.playerCount && (
          <Button className={styles.addPlayerBtn} onClick={handleAddPlayer}>+ 添加玩家</Button>
        )}
      </View>

      {currentPlayer && !currentPlayer.hasSubmitted && (
        <View className={styles.section}>
          <View className={styles.card}>
            <View className={styles.tagsSection}>
              <Text className={styles.tagsTitle}>🏷️ 选择你的玩本状态</Text>
              <Text className={styles.tagsDesc}>选择符合你的标签，帮助系统更好地分配角色</Text>
              <View className={styles.tagsList}>
                {playerTags.map(tag => (
                  <PlayerTag key={tag.key} tag={tag.key} selected={selectedTags.includes(tag.key)} onClick={() => toggleTag(tag.key)} />
                ))}
              </View>
            </View>
            <KeywordSort keywords={game.roleKeywords} value={keywordRanking} onChange={setKeywordRanking} />
          </View>
        </View>
      )}

      {currentPlayer?.hasSubmitted && !allSubmitted && (
        <View className={styles.section}>
          <View className={styles.card}>
            <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16rpx' }}>
              <Text style={{ fontSize: '32rpx', color: '#00B894', fontWeight: 600 }}>✓ 你已提交偏好</Text>
              <Text style={{ fontSize: '26rpx', color: '#636E72', textAlign: 'center' }}>
                {hasVacantSlot ? '等待新玩家认领空位并提交...' : `等待其他 ${game.players.length - submittedCount} 位玩家提交...`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {allSubmitted && (
        <Button className={classnames(styles.submitBtn, styles.viewResult)} onClick={handleViewResult}>🎉 查看分配结果</Button>
      )}
      {!allSubmitted && currentPlayer && !currentPlayer.hasSubmitted && (
        <Button className={classnames(styles.submitBtn, !canSubmit && styles.disabled)} onClick={handleSubmit}>提交我的偏好</Button>
      )}
    </ScrollView>
  );
};

export default GameDetailPage;
