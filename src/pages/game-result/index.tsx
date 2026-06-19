import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, ScrollView } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import PlanCard from '@/components/PlanCard';
import { getGameResult, saveGameResult, getUserId } from '@/utils/storage';
import { generateAssignmentPlans } from '@/utils/algorithm';
import type { Game, AssignmentResult, PlanType } from '@/types/game';
import styles from './index.module.scss';

const GameResultPage: React.FC = () => {
  const router = useRouter();
  const { games, getGame, updateGame, saveResult } = useGame();
  
  const [game, setGame] = useState<Game | null>(null);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isCreator, setIsCreator] = useState(false);

  const gameId = router.params.id as string;

  useEffect(() => {
    loadData();
  }, [gameId, games]);

  useDidShow(() => {
    loadData();
  });

  const loadData = () => {
    const foundGame = games.find(g => g.id === gameId) || getGame(gameId);
    if (foundGame) {
      setGame(foundGame);
      setIsCreator(foundGame.creatorId === getUserId());
      
      const storedResult = getGameResult(gameId);
      if (storedResult && storedResult.plans.length > 0) {
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
      calculatedAt: Date.now()
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
    
    const res = await Taro.showModal({
      title: '重新计算',
      content: '玩家信息有变动，是否重新计算分配方案？',
      confirmText: '重新计算'
    });

    if (res.confirm) {
      Taro.showLoading({ title: '计算中...' });
      
      setTimeout(() => {
        calculateResult(game);
        Taro.hideLoading();
        Taro.showToast({ title: '计算完成', icon: 'success' });
      }, 500);
    }
  };

  const handleBackToEdit = () => {
    if (!game) return;
    
    const updatedGame: Game = {
      ...game,
      status: 'submitting',
      players: game.players.map(p => ({
        ...p,
        submitted: p.id === getUserId() ? p.submitted : p.submitted
      }))
    };
    updateGame(updatedGame);
    
    Taro.redirectTo({ url: `/pages/game-detail/index?id=${game.id}` });
  };

  const handleConfirm = async () => {
    if (!game || !result) return;
    
    const currentPlan = result.plans[currentPlanIndex];
    
    let resultText = `🎭 ${game.scriptName}\n\n`;
    resultText += `📋 方案：${currentPlan.name}\n`;
    resultText += `📝 说明：${currentPlan.description}\n\n`;
    resultText += `--- 角色分配 ---\n\n`;
    
    currentPlan.assignments.forEach(assignment => {
      const keyword = game.roleKeywords.find(k => k.id === assignment.roleKeywordId);
      const player = game.players.find(p => p.id === assignment.playerId);
      if (keyword && player) {
        resultText += `🎭 ${keyword.keyword} → ${player.name}\n`;
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

  if (!game || !result) {
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

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>🎉 角色分配结果</Text>
        <Text className={styles.subtitle}>{game.scriptName}</Text>
      </View>

      <View className={styles.planTabs}>
        {result.plans.map((plan, index) => (
          <View
            key={plan.type}
            className={styles.planTab}
            style={{
              backgroundColor: currentPlanIndex === index ? plan.color : 'transparent',
              color: currentPlanIndex === index ? '#fff' : plan.color
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
