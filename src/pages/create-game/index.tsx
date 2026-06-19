import React, { useState, useEffect } from 'react';
import { View, Text, Input, Button, Picker, Switch, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { useGame } from '@/store/GameContext';
import { generateId, generateShareCode, getUserId, getUserName } from '@/utils/storage';
import { defaultRoleKeywords } from '@/data/roleKeywords';
import type { Game, RoleKeyword, PlayerTagType } from '@/types/game';
import styles from './index.module.scss';

const CreateGamePage: React.FC = () => {
  const { addGame } = useGame();
  
  const [scriptName, setScriptName] = useState('');
  const [playerCount, setPlayerCount] = useState(6);
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [startTime, setStartTime] = useState('19:00');
  const [allowCrossGender, setAllowCrossGender] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');

  useEffect(() => {
    const defaultSelected = defaultRoleKeywords.slice(0, playerCount).map(k => k.id);
    setSelectedKeywords(defaultSelected);
  }, [playerCount]);

  const handleDateChange = (e: any) => {
    setStartDate(e.detail.value);
  };

  const handleTimeChange = (e: any) => {
    setStartTime(e.detail.value);
  };

  const handleCountChange = (delta: number) => {
    const newCount = playerCount + delta;
    if (newCount >= 3 && newCount <= 12) {
      setPlayerCount(newCount);
    }
  };

  const toggleKeyword = (keywordId: string) => {
    if (selectedKeywords.includes(keywordId)) {
      setSelectedKeywords(prev => prev.filter(id => id !== keywordId));
    } else {
      if (selectedKeywords.length < playerCount) {
        setSelectedKeywords(prev => [...prev, keywordId]);
      } else {
        Taro.showToast({ title: `最多选择${playerCount}个`, icon: 'none' });
      }
    }
  };

  const handleAddCustomKeyword = async () => {
    const res = await Taro.showModal({
      title: '添加自定义关键词',
      editable: true,
      placeholderText: '请输入关键词（如：侦探位）',
      content: customKeyword
    });

    if (res.confirm && res.content && res.content.trim()) {
      const keyword = res.content.trim();
      const descRes = await Taro.showModal({
        title: '添加描述',
        editable: true,
        placeholderText: '请输入关键词描述（如：带领大家推理的角色）',
        content: ''
      });

      if (descRes.confirm) {
        const newKeyword: RoleKeyword = {
          id: 'custom_' + generateId(),
          keyword,
          description: descRes.content || '自定义关键词',
          attributes: []
        };
        
        if (selectedKeywords.length < playerCount) {
          defaultRoleKeywords.push(newKeyword);
          setSelectedKeywords(prev => [...prev, newKeyword.id]);
          Taro.showToast({ title: '添加成功', icon: 'success' });
        } else {
          Taro.showToast({ title: '已达最大数量', icon: 'none' });
        }
      }
    }
  };

  const handleSubmit = () => {
    if (!scriptName.trim()) {
      Taro.showToast({ title: '请输入剧本名', icon: 'none' });
      return;
    }

    if (selectedKeywords.length !== playerCount) {
      Taro.showToast({ 
        title: `请选择${playerCount}个关键词`, 
        icon: 'none' 
      });
      return;
    }

    const startDateTime = dayjs(`${startDate} ${startTime}`).valueOf();
    const userId = getUserId();
    const userName = getUserName();

    const roleKeywords = selectedKeywords
      .map(id => defaultRoleKeywords.find(k => k.id === id))
      .filter((k): k is RoleKeyword => !!k);

    const newGame: Game = {
      id: generateId(),
      scriptName: scriptName.trim(),
      playerCount,
      startTime: startDateTime,
      allowCrossGender,
      creatorId: userId,
      creatorName: userName,
      status: 'recruiting',
      players: [
        {
          id: userId,
          name: userName,
          avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 100)}/200/200`,
          tags: [] as PlayerTagType[],
          keywordRanking: [],
          hasSubmitted: false,
          joinedAt: Date.now()
        }
      ],
      roleKeywords,
      createdAt: Date.now(),
      shareCode: generateShareCode()
    };

    addGame(newGame);
    
    console.log('[CreateGame] Game created:', newGame.id);
    
    Taro.showToast({ title: '创建成功', icon: 'success' });
    
    setTimeout(() => {
      Taro.redirectTo({ url: `/pages/game-detail/index?id=${newGame.id}` });
    }, 500);
  };

  const canSubmit = scriptName.trim() && selectedKeywords.length === playerCount;

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.formSection}>
        <Text className={styles.sectionTitle}>📝 基本信息</Text>

        <View className={styles.formItem}>
          <Text className={styles.label}>
            剧本名<Text className={styles.required}>*</Text>
          </Text>
          <Input
            className={styles.input}
            placeholder="请输入剧本名，如：《落日惊魂》"
            placeholderClass={styles.input}
            value={scriptName}
            onInput={e => setScriptName(e.detail.value)}
            maxLength={50}
          />
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>
            玩家人数<Text className={styles.required}>*</Text>
          </Text>
          <View className={styles.countSelector}>
            <Button
              className={classnames(styles.countBtn, playerCount <= 3 && styles.disabled)}
              onClick={() => handleCountChange(-1)}
            >
              -
            </Button>
            <Text className={styles.countValue}>{playerCount}</Text>
            <Button
              className={classnames(styles.countBtn, playerCount >= 12 && styles.disabled)}
              onClick={() => handleCountChange(1)}
            >
              +
            </Button>
            <Text className={styles.countHint}>人（3-12人）</Text>
          </View>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>
            开本日期<Text className={styles.required}>*</Text>
          </Text>
          <Picker
            mode="date"
            value={startDate}
            onChange={handleDateChange}
            start={dayjs().format('YYYY-MM-DD')}
          >
            <View className={styles.pickerRow}>
              <Text className={styles.pickerValue}>{startDate}</Text>
              <Text className={styles.pickerArrow}>▼</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.formItem}>
          <Text className={styles.label}>
            开本时间<Text className={styles.required}>*</Text>
          </Text>
          <Picker
            mode="time"
            value={startTime}
            onChange={handleTimeChange}
          >
            <View className={styles.pickerRow}>
              <Text className={styles.pickerValue}>{startTime}</Text>
              <Text className={styles.pickerArrow}>▼</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.formItem}>
          <View className={styles.switchRow}>
            <View className={styles.switchLabel}>
              <Text className={styles.label}>是否接受反串</Text>
              <Text className={styles.switchDesc}>允许玩家选择异性角色</Text>
            </View>
            <Switch
              checked={allowCrossGender}
              onChange={e => setAllowCrossGender(e.detail.value)}
              color="#6C5CE7"
            />
          </View>
        </View>
      </View>

      <View className={classnames(styles.formSection, styles.keywordSection)}>
        <Text className={styles.sectionTitle}>
          🎭 角色关键词
          <Text style={{ fontSize: '24rpx', color: '#B2BEC3', fontWeight: 'normal', marginLeft: '16rpx' }}>
            已选 {selectedKeywords.length}/{playerCount}
          </Text>
        </Text>

        <Text className={styles.hintText}>
          选择{playerCount}个角色关键词，玩家将对这些关键词进行排序。关键词不剧透角色设定，只描述角色类型。
        </Text>

        <View className={styles.keywordList}>
          {defaultRoleKeywords.map(keyword => (
            <View
              key={keyword.id}
              className={classnames(
                styles.keywordItem,
                selectedKeywords.includes(keyword.id) && styles.selected
              )}
              onClick={() => toggleKeyword(keyword.id)}
            >
              <View className={styles.keywordCheckbox}>
                {selectedKeywords.includes(keyword.id) && (
                  <Text className={styles.keywordCheckIcon}>✓</Text>
                )}
              </View>
              <Text className={styles.keywordText}>{keyword.keyword}</Text>
            </View>
          ))}
        </View>

        <Button className={styles.addKeywordBtn} onClick={handleAddCustomKeyword}>
          + 添加自定义关键词
        </Button>
      </View>

      <Button
        className={classnames(styles.submitBtn, !canSubmit && styles.disabled)}
        onClick={handleSubmit}
      >
        创建并邀请好友
      </Button>
    </ScrollView>
  );
};

export default CreateGamePage;
