import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import PlanCard from '@/components/PlanCard';
import { getGameResult, saveGameResult, getUserId } from '@/utils/storage';
import { generateAssignmentPlans } from '@/utils/algorithm';
import { getResultFromCloud } from '@/services/cloudService';
import type { Game, AssignmentResult, PlanType, Assignment } from '@/types/game';
import styles from './index.module.scss';

const GameResultPage: React.FC = () => {
  const router = useRouter();
  const { games, getGame, updateGame, saveResult, refreshGameFromCloudSync } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isCreator, setIsCreator] = useState(false);
  const [changedPlayerIds, setChangedPlayerIds] = useState<string[]>([]);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadData();
  }, [gameId, games]);

  useDidShow(() => {
    loadData();
    if (game?.shareCode) {
      refreshGameFromCloudSync(game.id, game.shareCode);
    }
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

      let storedResult = getGameResult(gameId);
      if (!storedResult) {
        storedResult = getResultFromCloud(foundGame.shareCode);
      }

      if (storedResult && storedResult.plans.length > 0) {
        setResult(storedResult);
        setCurrentPlanIndex(storedResult.currentPlanIndex);
        
        const prevIds = storedResult.previousPlayerIds || [];
        const currentIds = foundGame.players.map(p => p.id);
        const changed = currentIds.filter(id => !prevIds.includes(id));
        setChangedPlayerIds(changed);
      } else {
        calculateResult(foundGame);
      }
    }
  };

  const calculateResult = (gameData: Game, previousIds?: string[]) => {
    const plans = generateAssignmentPlans(gameData);
    
    const markedPlans = plans.map(plan => {
      const markedAssignments: Assignment[] = plan.assignments.map(a => ({
        ...a,
        isUpdated: changedPlayerIds.length > 0 ? changedPlayerIds.includes(a.playerId) : false
      }));
      return { ...plan, assignments: markedAssignments };
    });

    const prevPlayerIds = previousIds || gameData.players.map(p => p.id);
    const newResult: AssignmentResult = {
      gameId: gameData.id,
      plans: markedPlans,
      currentPlanIndex: 0,
      calculatedAt: Date.now(),
      previousPlayerIds: prevPlayerIds
    };
    saveResult(newResult);
    saveGameResult(newResult);
    setResult(newResult);
    setCurrentPlanIndex(0);
    console.log('[GameResult] Result calculated:', gameData.id);
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

    const replacedPlayers = game.players.filter(p => p.isReplaced).map(p => p.id);
    
    const res = await Taro.showModal({
      title: '重新计算',
      content: replacedPlayers.length > 0 
        ? `检测到有玩家替换，将保留未变动玩家的偏好，重新生成分配方案。`
        : '将根据最新的玩家数据重新生成分配方案。',
      confirmText: '重新计算'
    });

    if (res.confirm) {
      Taro.showLoading({ title: '计算中...' });
      
      setTimeout(() => {
        const prevIds = result?.previousPlayerIds || game.players.map(p => p.id);
        calculateResult(game, prevIds);
        Taro.hideLoading();
        Taro.showToast({ title: '计算完成', icon: 'success' });
      }, 500);
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
      Taro.showToast({ 
        title: '结果已复制', 
        icon: 'success' 
      });
    } catch (e) {
      console.error('[GameResult] Copy error:', e);
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

  if (!allSubmitted) {
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
              isFull ? styles.waiting : styles.recruiting
            )}>
              {isFull ? '⏳ 等待剩余玩家提交' : '👥 招募中'}
            </Text>
          </View>
          <View className={styles.progressBar}>
            <View 
              className={styles.progressFill} 
              style={{ width: `${progressPercent}%` }} 
            />
          </View>
          {!isFull && (
            <Text className={styles.notReadyTip}>
              💡 还差 {game.playerCount - game.players.length} 人满员，分配结果将在全员提交后生成
            </Text>
          )}
          {isFull && !allSubmitted && (
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
  const updatedCount = currentPlan.assignments.filter(a => a.isUpdated).length;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>🎉 角色分配结果</Text>
        <Text className={styles.subtitle}>{game.scriptName}</Text>
        {changedPlayerIds.length > 0 && updatedCount > 0 && (
          <View className={styles.updatedNotice}>
            <Text className={styles.updatedText}>
              🔄 本次有 {updatedCount} 个分配因换人变动，标记为高亮
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
          highlightPlayerIds={changedPlayerIds}
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
