import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface ReasonTagProps {
  reason: string;
  color?: string;
}

const ReasonTag: React.FC<ReasonTagProps> = ({ reason, color = '#6C5CE7' }) => {
  return (
    <View
      className={styles.tag}
      style={{
        backgroundColor: `${color}15`,
        borderColor: `${color}40`
      }}
    >
      <Text className={styles.icon} style={{ color }}>✓</Text>
      <Text className={styles.text}>{reason}</Text>
    </View>
  );
};

export default ReasonTag;
