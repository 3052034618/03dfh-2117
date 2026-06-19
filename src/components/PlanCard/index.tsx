import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { Plan, Game } from '@/types/game';
import ReasonTag from '@/components/ReasonTag';
import styles from './index.module.scss';

interface PlanCardProps {
  plan: Plan;
  game: Game;
  active?: boolean;
  onClick?: () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, game, active, onClick }) => {
  const getKeywordById = (id: string) => game.roleKeywords.find(k => k.id === id);
  const getPlayerById = (id: string) => game.players.find(p => p.id === id);

  return (
    <View
      className={classnames(styles.card, active && styles.active)}
      style={{ borderColor: active ? plan.color : 'transparent' }}
      onClick={onClick}
    >
      <View className={styles.header}>
        <View
          className={styles.planBadge}
          style={{ backgroundColor: plan.color }}
        >
          <Text className={styles.planName}>{plan.name}</Text>
        </View>
        <View className={styles.scoreBadge}>
          <Text className={styles.scoreText}>匹配度 {plan.score}</Text>
        </View>
      </View>

      <Text className={styles.description}>{plan.description}</Text>

      <View className={styles.assignments}>
        {plan.assignments.map(assignment => {
          const keyword = getKeywordById(assignment.roleKeywordId);
          const player = getPlayerById(assignment.playerId);
          if (!keyword || !player) return null;

          return (
            <View key={assignment.roleKeywordId} className={styles.assignmentItem}>
              <View className={styles.assignmentHeader}>
                <View
                  className={styles.keywordBadge}
                  style={{ borderLeftColor: plan.color }}
                >
                  <Text className={styles.keywordName}>{keyword.keyword}</Text>
                </View>
                <View className={styles.arrow}>
                  <Text className={styles.arrowText}>→</Text>
                </View>
                <View className={styles.playerInfo}>
                  <Text className={styles.playerName}>{player.name}</Text>
                </View>
              </View>

              {assignment.reasons.length > 0 && (
                <View className={styles.reasons}>
                  {assignment.reasons.slice(0, 3).map((reason, index) => (
                    <ReasonTag key={index} reason={reason} color={plan.color} />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default PlanCard;
