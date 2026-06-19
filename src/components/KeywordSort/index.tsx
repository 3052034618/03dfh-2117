import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { RoleKeyword } from '@/types/game';
import styles from './index.module.scss';

interface KeywordSortProps {
  keywords: RoleKeyword[];
  value: string[];
  onChange: (ranking: string[]) => void;
  disabled?: boolean;
}

const KeywordSort: React.FC<KeywordSortProps> = ({ keywords, value, onChange, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleKeywordClick = (keywordId: string) => {
    if (disabled) return;
    
    if (selectedId === keywordId) {
      setSelectedId(null);
      return;
    }

    if (value.includes(keywordId)) {
      const newRanking = value.filter(id => id !== keywordId);
      onChange(newRanking);
      setSelectedId(null);
    } else {
      if (selectedId) {
        const selectedIndex = value.indexOf(selectedId);
        const newRanking = [...value];
        newRanking.splice(selectedIndex + 1, 0, keywordId);
        onChange(newRanking);
        setSelectedId(null);
      } else {
        const newRanking = [...value, keywordId];
        onChange(newRanking);
      }
    }
  };

  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || index === 0) return;
    const newRanking = [...value];
    [newRanking[index - 1], newRanking[index]] = [newRanking[index], newRanking[index - 1]];
    onChange(newRanking);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || index === value.length - 1) return;
    const newRanking = [...value];
    [newRanking[index], newRanking[index + 1]] = [newRanking[index + 1], newRanking[index]];
    onChange(newRanking);
  };

  const handleRemove = (keywordId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    const newRanking = value.filter(id => id !== keywordId);
    onChange(newRanking);
  };

  const getKeywordById = (id: string) => keywords.find(k => k.id === id);
  const unselectedKeywords = keywords.filter(k => !value.includes(k.id));

  return (
    <View className={styles.container}>
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我的排序（点击调整优先级）</Text>
          <Text className={styles.sectionHint}>共 {value.length}/{keywords.length} 个</Text>
        </View>
        
        {value.length === 0 ? (
          <View className={styles.emptyHint}>
            <Text className={styles.emptyText}>点击下方关键词添加到排序中</Text>
          </View>
        ) : (
          <View className={styles.rankedList}>
            {value.map((keywordId, index) => {
              const keyword = getKeywordById(keywordId);
              if (!keyword) return null;
              
              return (
                <View
                  key={keywordId}
                  className={classnames(
                    styles.rankedItem,
                    selectedId === keywordId && styles.selected
                  )}
                  onClick={() => handleKeywordClick(keywordId)}
                >
                  <View className={styles.rankBadge}>
                    <Text className={styles.rankText}>{index + 1}</Text>
                  </View>
                  
                  <View className={styles.keywordInfo}>
                    <Text className={styles.keywordText}>{keyword.keyword}</Text>
                    <Text className={styles.keywordDesc}>{keyword.description}</Text>
                  </View>

                  {!disabled && (
                    <View className={styles.actions}>
                      <View
                        className={classnames(styles.actionBtn, index === 0 && styles.disabled)}
                        onClick={(e) => handleMoveUp(index, e)}
                      >
                        <Text className={styles.actionIcon}>↑</Text>
                      </View>
                      <View
                        className={classnames(styles.actionBtn, index === value.length - 1 && styles.disabled)}
                        onClick={(e) => handleMoveDown(index, e)}
                      >
                        <Text className={styles.actionIcon}>↓</Text>
                      </View>
                      <View
                        className={classnames(styles.actionBtn, styles.removeBtn)}
                        onClick={(e) => handleRemove(keywordId, e)}
                      >
                        <Text className={styles.actionIcon}>×</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {!disabled && unselectedKeywords.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>可选关键词</Text>
            <Text className={styles.sectionHint}>点击添加到排序</Text>
          </View>
          
          <View className={styles.unselectedList}>
            {unselectedKeywords.map(keyword => (
              <View
                key={keyword.id}
                className={classnames(
                  styles.unselectedItem,
                  selectedId === keyword.id && styles.selected
                )}
                onClick={() => handleKeywordClick(keyword.id)}
              >
                <Text className={styles.keywordText}>{keyword.keyword}</Text>
                <Text className={styles.keywordDesc}>{keyword.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {selectedId && (
        <View className={styles.insertHint}>
          <Text className={styles.insertHintText}>
            点击已排序列表中的位置插入，或再次点击取消
          </Text>
        </View>
      )}
    </View>
  );
};

export default KeywordSort;
