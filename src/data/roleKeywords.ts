import type { RoleKeyword, PlayerTag } from '@/types/game';

export const defaultRoleKeywords: RoleKeyword[] = [
  {
    id: 'kw1',
    keyword: '高社交',
    description: '需要与多位玩家互动',
    attributes: ['highSocial', 'central']
  },
  {
    id: 'kw2',
    keyword: '独行者',
    description: '相对独立，社交较少',
    attributes: ['lowSocial', 'edge']
  },
  {
    id: 'kw3',
    keyword: '情感线重',
    description: '有丰富的情感故事',
    attributes: ['emotional']
  },
  {
    id: 'kw4',
    keyword: '推理担当',
    description: '需要较强的逻辑推理能力',
    attributes: ['rational', 'complex']
  },
  {
    id: 'kw5',
    keyword: '剧情起伏',
    description: '有出人意料的剧情转折',
    attributes: ['hasReverse', 'killer']
  },
  {
    id: 'kw6',
    keyword: 'CP位',
    description: '有明显的情感CP线',
    attributes: ['highSocial', 'emotional']
  },
  {
    id: 'kw7',
    keyword: '压力担当',
    description: '需要隐藏重要信息，心理压力较大',
    attributes: ['killer', 'hasReverse', 'central']
  },
  {
    id: 'kw8',
    keyword: '逻辑担当',
    description: '需要理清线索、带领思路的角色',
    attributes: ['rational', 'central', 'noReverse']
  },
  {
    id: 'kw9',
    keyword: '神秘人',
    description: '身份神秘，有隐藏故事',
    attributes: ['hasReverse', 'edge']
  },
  {
    id: 'kw10',
    keyword: '搞笑担当',
    description: '调节气氛的欢乐角色',
    attributes: ['highSocial', 'edge']
  },
  {
    id: 'kw11',
    keyword: '背负秘密',
    description: '有重要秘密需要隐藏',
    attributes: ['hasReverse', 'complex']
  },
  {
    id: 'kw12',
    keyword: '阳光开朗',
    description: '性格简单直接',
    attributes: ['highSocial', 'simple', 'noReverse']
  }
];

export const playerTags: PlayerTag[] = [
  {
    key: 'newbie',
    label: '新手',
    color: '#FFEAA7',
    description: '第一次或较少玩剧本杀'
  },
  {
    key: 'hardcore',
    label: '硬核玩家',
    color: '#74B9FF',
    description: '喜欢推理和挑战难度'
  },
  {
    key: 'emotion',
    label: '情感本爱好者',
    color: '#FDCB6E',
    description: '容易被情感线打动'
  },
  {
    key: 'noKiller',
    label: '怕压力大',
    color: '#FF7675',
    description: '不希望拿到需要隐藏信息的角色'
  },
  {
    key: 'support',
    label: '想尝试边缘位',
    color: '#55EFC4',
    description: '想试试压力小的角色'
  }
];

export const getKeywordsByCount = (count: number): RoleKeyword[] => {
  return defaultRoleKeywords.slice(0, Math.min(count, defaultRoleKeywords.length));
};

export const getRandomKeywords = (count: number): RoleKeyword[] => {
  const shuffled = [...defaultRoleKeywords].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};
