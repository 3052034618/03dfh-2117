import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface FAQ {
  q: string;
  a: string;
}

const faqs: FAQ[] = [
  {
    q: '如何创建一车？',
    a: '点击首页的"发起一车"按钮，填写剧本名、人数、开本时间和是否接受反串，然后点击创建即可。'
  },
  {
    q: '如何邀请好友加入？',
    a: '创建成功后会生成6位邀请码，将邀请码发给好友，好友在首页输入邀请码即可加入。也可以在车详情页点击分享。'
  },
  {
    q: '玩家状态标签有什么用？',
    a: '状态标签帮助系统更好地匹配角色。比如"怕当凶手"会尽量避开凶手位，"新手"会优先分配简单角色。'
  },
  {
    q: '角色关键词排序是什么？',
    a: '将关键词按你的偏好排序，排在前面的关键词代表你更想玩这类角色。系统会根据排序和标签智能分配。'
  },
  {
    q: '三种分配方案有什么区别？',
    a: '满足个人偏好转念满足每位玩家的选择；平衡全车体验追求整体均衡；照顾新手优先让新手拿到简单角色。'
  },
  {
    q: '有人临时退出怎么办？',
    a: '作为发起人可以在车详情页管理玩家，移除退出的玩家，添加新玩家后系统会自动重新计算分配方案。'
  },
  {
    q: '数据保存在哪里？',
    a: '所有数据保存在你的手机本地，不会上传到服务器。卸载小程序会丢失数据，请谨慎操作。'
  }
];

const steps = [
  {
    title: '发起一车',
    desc: '发起人填写剧本名、人数、开本时间，生成邀请码分享到群里'
  },
  {
    title: '选择状态',
    desc: '每位玩家选择自己的玩本状态，如新手、硬核玩家、怕当凶手等'
  },
  {
    title: '关键词排序',
    desc: '对公开的角色关键词按偏好排序，不剧透人物设定'
  },
  {
    title: '智能分配',
    desc: '所有人提交后，系统生成三种分配方案供选择'
  },
  {
    title: '查看结果',
    desc: '发起人可以看到每个角色推荐给某人的具体原因'
  }
];

const HelpPage: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <Text className={styles.title}>📖 使用帮助</Text>
        <Text className={styles.subtitle}>轻松搞定熟人局角色分配</Text>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>使用步骤</Text>
        <View className={styles.steps}>
          {steps.map((step, index) => (
            <View key={index} className={styles.stepItem}>
              <View className={styles.stepNumber}>
                <Text className={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View className={styles.stepContent}>
                <Text className={styles.stepTitle}>{step.title}</Text>
                <Text className={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>常见问题</Text>
        <View className={styles.faqList}>
          {faqs.map((faq, index) => (
            <View key={index} className={styles.faqItem}>
              <View className={styles.faqQuestion} onClick={() => toggleFAQ(index)}>
                <Text className={styles.faqQ}>{faq.q}</Text>
                <Text
                  className={classnames(
                    styles.faqIcon,
                    expandedIndex === index && styles.expanded
                  )}
                >
                  ▼
                </Text>
              </View>
              {expandedIndex === index && (
                <View className={styles.faqAnswer}>
                  <Text className={styles.faqAnswerText}>{faq.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.tips}>
          <Text className={styles.tipsTitle}>
            <Text className={styles.tipsIcon}>💡</Text>
            温馨提示
          </Text>
          <Text className={styles.tipsText}>
            1. 本小程序仅用于熟人局角色分配，所有数据保存在本地{'\n'}
            2. 建议所有人提交后再查看结果，避免剧透{'\n'}
            3. 分配方案仅供参考，最终以DM安排为准{'\n'}
            4. 祝大家玩得开心！🎭
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default HelpPage;
