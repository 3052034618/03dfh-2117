import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import PlanCard from '@/components/PlanCard';
import { getGameResult, saveGameResult, getUserId } from '@/utils/storage';
import { generateAssignmentPlans, incrementalRecalculate } from '@/utils/algorithm';
import type { Game, AssignmentResult, Assignment } from '@/types/game';
import styles from './index.module.scss';

const GameResultPage: React.FC = () => {
  const router = useRouter();
  const { games, getGame, updateGame, saveResult, refreshGameFromCloudSync } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isCreator, setIsCreator] = useState(false);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadData();
  }, [gameId, games]);

  useDidShow(async () => {
    loadData();
    if (game?.shareCode) {
      const refreshed = await refreshGameFromCloudSync(game.id, game.shareCode);
      if (refreshed) {
        setGame(refreshed);
      }
    }
  });

  useShareAppMessage(() => {
    if (!game) return { title: '剧本杀角色分配', path: '/pages/home/index' };
    return {
      title: `🎭 ${game.scriptName} - 角色分配结果`,
      path: `/pages/home/index?invite=${game.shareCode}`,
      imageUrl: ''
    };
  });

  useShareTimeline(() => {
    if (!game) return { title: '剧本杀角色分配', query: '' };
    return {
      title: `🎭 ${game.scriptName} - 角色分配结果`,
      query: `invite=${game.shareCode}`,
      imageUrl: ''
    };
  });

  const isGameReady = (g: Game): boolean => {
    const isFull = g.players.length >= g.playerCount;
    const allSubmitted = g.players.every(p => p.hasSubmitted);
    return isFull && allSubmitted;
  };

  const loadData = () => {
    const foundGame = games.find(g => g.id === gameId) || getGame(gameId);
    if (foundGame) {
      setGame(foundGame);
      setIsCreator(foundGame.creatorId === getUserId());
      
      if (!isGameReady(foundGame)) {
        setResult(null);
        return;
      }

      const storedResult = getGameResult(gameId);
      if (storedResult && storedResult.plans.length > 0) {
        const prevIds = storedResult.previousPlayerIds || [];
        const currentIds = foundGame.players.map(p => p.id);
        const hasNewPlayers = currentIds.some(id => !prevIds.includes(id));

        if (hasNewPlayers && isGameReady(foundGame)) {
          const incResult = incrementalRecalculate(foundGame, storedResult);
          if (incResult) {
            saveResult(incResult);
            saveGameResult(incResult);
            setResult(incResult);
            setCurrentPlanIndex(incResult.currentPlanIndex);
            return;
          }
        }

        setResult(storedResult);
        setCurrentPlanIndex(storedResult.currentPlanIndex);
      } else {
        calculateResult(foundGame);
      }
    }
  };

  const calculateResult = (gameData: Game) => {
    const plans = generateAssignmentPlans(gameData);

    const newResult: AssignmentResult = {
      gameId: gameData.id,
      plans,
      currentPlanIndex: 0,
      calculatedAt: Date.now(),
      previousPlayerIds: gameData.players.map(p => p.id)
    };
    saveResult(newResult);
    saveGameResult(newResult);
    setResult(newResult);
    setCurrentPlanIndex(0);
  };

  const handlePlanChange = (index: number) => {
    if (!result) return;
    setCurrentPlanIndex(index);
    
    const updatedResult: AssignmentResult = {
      ...result,
      currentPlanIndex: index
    };
    saveResult(updatedResult);
    saveGameResult(updatedResult);
  };

  const handleRecalculate = async () => {
    if (!game) return;
    
    if (!isGameReady(game)) {
      Taro.showToast({ title: '请等满员且全员提交后再计算', icon: 'none' });
      return;
    }

    const existingResult = result;
    const hasPrevData = existingResult && existingResult.plans.length > 0;
    
    const res = await Taro.showModal({
      title: '重新计算',
      content: hasPrevData
        ? '将保留未变动玩家的原分配，仅围绕新玩家调整。'
        : '将根据最新的玩家数据生成分配方案。',
      confirmText: '重新计算'
    });

    if (res.confirm) {
      Taro.showLoading({ title: '计算中...' });
      
      setTimeout(() => {
        if (hasPrevData) {
          const incResult = incrementalRecalculate(game, existingResult);
          if (incResult) {
            saveResult(incResult);
            saveGameResult(incResult);
            setResult(incResult);
            setCurrentPlanIndex(incResult.currentPlanIndex);
            Taro.hideLoading();
            Taro.showToast({ title: '增量计算完成', icon: 'success' });
            return;
          }
        }
        
        calculateResult(game);
        Taro.hideLoading();
        Taro.showToast({ title: '计算完成', icon: 'success' });
      }, 300);
    }
  };

  const handleBackToEdit = () => {
    if (!game) return;
    Taro.redirectTo({ url: `/pages/game-detail/index?id=${game.id}` });
  };

  const handleConfirm = async () => {
    if (!game || !result) return;
    
    const currentPlan = result.plans[currentPlanIndex];
    
    let resultText = `🎭 ${game.scriptName}\n\n`;
    resultText += `📋 方案：${currentPlan.name}\n`;
    resultText += `📝 说明：${currentPlan.description}\n`;
    resultText += `⏰ 生成时间：${dayjs(result.calculatedAt).format('MM-DD HH:mm')}\n\n`;
    resultText += `--- 角色分配 ---\n\n`;
    
    currentPlan.assignments.forEach(assignment => {
      const keyword = game.roleKeywords.find(k => k.id === assignment.roleKeywordId);
      const player = game.players.find(p => p.id === assignment.playerId);
      if (keyword && player) {
        resultText += `🎭 ${keyword.keyword} → ${player.name}`;
        if (assignment.isUpdated) {
          resultText += ' 🔄';
        }
        resultText += '\n';
        if (assignment.reasons.length > 0) {
          resultText += `   理由：${assignment.reasons[0]}\n`;
        }
        resultText += '\n';
      }
    });

    try {
      await Taro.setClipboardData({ data: resultText });
      Taro.showToast({ title: '结果已复制', icon: 'success' });
    } catch {
      Taro.showModal({
        title: '分配结果',
        content: resultText,
        showCancel: false
      });
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
  const progressPercent = game.playerCount > 0 ? 
    Math.min(100, Math.round((submittedCount / game.playerCount) * 100)) : 0;
  const hasVacantSlot = game.players.some(p => p.isReplaced && !p.hasSubmitted);

  if (!allSubmitted || hasVacantSlot) {
    return (
      <ScrollView className={styles.page} scrollY>
        <View className={styles.header}>
          <Text className={styles.title}>⏳ 等待提交</Text>
          <Text className={styles.subtitle}>{game.scriptName}</Text>
        </View>

        <View className={styles.notReadyCard}>
          <View className={styles.notReadyInfo}>
            <Text className={styles.notReadyText}>
              已提交 {submittedCount}/{game.playerCount}
            </Text>
            <Text className={classnames(
              styles.notReadyStatus,
              hasVacantSlot ? styles.recruiting : (isFull ? styles.waiting : styles.recruiting)
            )}>
              {hasVacantSlot ? '⚠️ 有空位待认领' : (isFull ? '⏳ 等待剩余玩家提交' : '👥 招募中')}
            </Text>
          </View>
          <View className={styles.progressBar}>
            <View 
              className={styles.progressFill} 
              style={{ width: `${progressPercent}%` }} 
            />
          </View>
          {hasVacantSlot && (
            <Text className={styles.notReadyTip}>
              ⚠️ 有空位待认领，请把邀请码 {game.shareCode} 发给新玩家
            </Text>
          )}
          {!isFull && !hasVacantSlot && (
            <Text className={styles.notReadyTip}>
              💡 还差 {game.playerCount - game.players.length} 人满员，分配结果将在全员提交后生成
            </Text>
          )}
          {isFull && !allSubmitted && !hasVacantSlot && (
            <Text className={styles.notReadyTip}>
              ⏳ 还差 {game.players.length - submittedCount} 人提交，请耐心等待
            </Text>
          )}
        </View>

        <View className={styles.notReadyActions}>
          <Button className={styles.backBtn} onClick={handleBackToEdit}>
            返回详情页
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (!result || result.plans.length === 0) {
    return (
      <ScrollView className={styles.page} scrollY>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>🔄</Text>
          <Text className={styles.emptyText}>正在计算分配方案...</Text>
        </View>
      </ScrollView>
    );
  }

  const currentPlan = result.plans[currentPlanIndex];
  const updatedAssignments = currentPlan.assignments.filter(a => a.isUpdated);
  const updatedCount = updatedAssignments.length;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>🎉 角色分配结果</Text>
        <Text className={styles.subtitle}>{game.scriptName}</Text>
        {updatedCount > 0 && (
          <View className={styles.updatedNotice}>
            <Text className={styles.updatedText}>
              🔄 本次有 {updatedCount} 个分配因换人调整，标记为高亮，其余玩家保持原分配不变
            </Text>
          </View>
        )}
      </View>

      <View className={styles.planTabs}>
        {result.plans.map((plan, index) => (
          <View
            key={plan.type}
            className={classnames(styles.planTab, currentPlanIndex === index && styles.planTabActive)}
            style={{
              backgroundColor: currentPlanIndex === index ? plan.color : 'transparent',
              borderColor: plan.color
            }}
            onClick={() => handlePlanChange(index)}
          >
            <Text
              className={styles.planTabName}
              style={{ color: currentPlanIndex === index ? '#fff' : plan.color }}
            >
              {plan.name}
            </Text>
            <Text
              className={styles.planTabScore}
              style={{ color: currentPlanIndex === index ? 'rgba(255,255,255,0.8)' : plan.color }}
            >
              匹配度 {plan.score}
            </Text>
          </View>
        ))}
      </View>

      <View className={styles.planCardWrapper}>
        <PlanCard
          plan={currentPlan}
          game={game}
          active={true}
        />
      </View>

      <View className={styles.actionSection}>
        <Button
          className={classnames(styles.actionBtn, styles.secondaryBtn)}
          onClick={handleBackToEdit}
        >
          修改偏好
        </Button>
        {isCreator && (
          <Button
            className={classnames(styles.actionBtn, styles.recalculateBtn)}
            onClick={handleRecalculate}
          >
            重新计算
          </Button>
        )}
        <Button
          className={classnames(styles.actionBtn, styles.primaryBtn)}
          onClick={handleConfirm}
        >
          确认并复制
        </Button>
      </View>
    </ScrollView>
  );
};

export default GameResultPage;
