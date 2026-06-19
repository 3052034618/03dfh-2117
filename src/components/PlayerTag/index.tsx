import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import { getPlayerTagLabel, getPlayerTagColor } from '@/utils/algorithm';
import type { PlayerTagType } from '@/types/game';
import styles from './index.module.scss';

interface PlayerTagProps {
  tag: PlayerTagType;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const PlayerTag: React.FC<PlayerTagProps> = ({ tag, selected, onClick, size = 'md' }) => {
  const label = getPlayerTagLabel(tag);
  const color = getPlayerTagColor(tag);

  return (
    <View
      className={classnames(
        styles.tag,
        styles[size],
        selected && styles.selected,
        onClick && styles.clickable
      )}
      style={{
        backgroundColor: selected ? color : `${color}30`,
        borderColor: color
      }}
      onClick={onClick}
    >
      <Text
        className={styles.tagText}
        style={{ color: selected ? '#fff' : '#2D3436' }}
      >
        {label}
      </Text>
    </View>
  );
};

export default PlayerTag;
