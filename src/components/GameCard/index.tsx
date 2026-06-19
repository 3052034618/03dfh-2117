import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import type { Game } from '@/types/game';
import styles from './index.module.scss';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

const statusConfig = {
  recruiting: { label: '招募中', color: '#00B894' },
  submitting: { label: '收集中', color: '#FDCB6E' },
  completed: { label: '已完成', color: '#B2BEC3' }
};

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const status = statusConfig[game.status];
  const submittedCount = game.players.filter(p => p.hasSubmitted).length;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/game-detail/index?id=${game.id}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.scriptName}>{game.scriptName}</Text>
        <View
          className={styles.statusTag}
          style={{ backgroundColor: `${status.color}20`, borderColor: status.color }}
        >
          <Text className={styles.statusText} style={{ color: status.color }}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className={styles.infoRow}>
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
      </View>

      <View className={styles.infoRow}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>发起人</Text>
          <Text className={styles.infoValue}>{game.creatorName}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>提交进度</Text>
          <Text className={styles.infoValue}>
            {submittedCount}/{game.players.length}
          </Text>
        </View>
      </View>

      <View className={styles.playerList}>
        {game.players.slice(0, 5).map(player => (
          <View key={player.id} className={styles.playerItem}>
            <Text
              className={classnames(styles.playerDot, player.hasSubmitted && styles.submitted)}
            />
            <Text className={styles.playerName}>{player.name}</Text>
          </View>
        ))}
        {game.players.length > 5 && (
          <Text className={styles.moreText}>+{game.players.length - 5}人</Text>
        )}
      </View>

      <View className={styles.footer}>
        <Text className={styles.shareCode}>邀请码: {game.shareCode}</Text>
        {game.allowCrossGender && (
          <View className={styles.crossTag}>
            <Text className={styles.crossText}>可反串</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default GameCard;
