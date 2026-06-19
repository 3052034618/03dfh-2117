import type { Game } from '@/types/game';
import { getKeywordsByCount } from './roleKeywords';

const now = Date.now();

export const mockGames: Game[] = [
  {
    id: 'game1',
    scriptName: '《落日惊魂》',
    playerCount: 6,
    startTime: now + 86400000,
    allowCrossGender: true,
    creatorId: 'user1',
    creatorName: '小明',
    status: 'recruiting',
    players: [
      {
        id: 'player1',
        name: '小明',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['hardcore'],
        keywordRanking: [],
        submitted: false,
        joinedAt: now
      },
      {
        id: 'player2',
        name: '小红',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['emotion'],
        keywordRanking: [],
        submitted: false,
        joinedAt: now
      },
      {
        id: 'player3',
        name: '小刚',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie'],
        keywordRanking: [],
        submitted: false,
        joinedAt: now
      }
    ],
    roleKeywords: getKeywordsByCount(6),
    createdAt: now - 3600000,
    shareCode: 'ABC123'
  },
  {
    id: 'game2',
    scriptName: '《尘封的往事》',
    playerCount: 5,
    startTime: now + 172800000,
    allowCrossGender: false,
    creatorId: 'user2',
    creatorName: '小丽',
    status: 'submitting',
    players: [
      {
        id: 'player4',
        name: '小丽',
        avatar: 'https://picsum.photos/id/338/200/200',
        tags: ['emotion', 'noKiller'],
        keywordRanking: ['kw1', 'kw3', 'kw6', 'kw2', 'kw4'],
        submitted: true,
        joinedAt: now - 7200000
      },
      {
        id: 'player5',
        name: '小华',
        avatar: 'https://picsum.photos/id/1027/200/200',
        tags: ['hardcore'],
        keywordRanking: ['kw4', 'kw5', 'kw7', 'kw8', 'kw1'],
        submitted: true,
        joinedAt: now - 7000000
      },
      {
        id: 'player6',
        name: '小芳',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['newbie', 'noKiller'],
        keywordRanking: ['kw12', 'kw10', 'kw2', 'kw6', 'kw3'],
        submitted: true,
        joinedAt: now - 6800000
      },
      {
        id: 'player7',
        name: '小强',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['support'],
        keywordRanking: [],
        submitted: false,
        joinedAt: now - 6600000
      }
    ],
    roleKeywords: getKeywordsByCount(5),
    createdAt: now - 7200000,
    shareCode: 'DEF456'
  },
  {
    id: 'game3',
    scriptName: '《午夜钟声》',
    playerCount: 7,
    startTime: now - 86400000,
    allowCrossGender: true,
    creatorId: 'user1',
    creatorName: '小明',
    status: 'completed',
    players: [
      {
        id: 'player1',
        name: '小明',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['hardcore'],
        keywordRanking: ['kw4', 'kw7', 'kw5', 'kw8', 'kw1', 'kw9', 'kw11'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player8',
        name: '小美',
        avatar: 'https://picsum.photos/id/338/200/200',
        tags: ['emotion'],
        keywordRanking: ['kw3', 'kw6', 'kw1', 'kw12', 'kw10', 'kw2', 'kw9'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player9',
        name: '小军',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie'],
        keywordRanking: ['kw12', 'kw10', 'kw2', 'kw6', 'kw3', 'kw1', 'kw8'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player10',
        name: '小燕',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['hardcore', 'noKiller'],
        keywordRanking: ['kw8', 'kw4', 'kw1', 'kw6', 'kw12', 'kw10', 'kw2'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player11',
        name: '小伟',
        avatar: 'https://picsum.photos/id/1027/200/200',
        tags: ['emotion', 'support'],
        keywordRanking: ['kw2', 'kw9', 'kw10', 'kw12', 'kw3', 'kw6', 'kw1'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player12',
        name: '小玲',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['hardcore'],
        keywordRanking: ['kw5', 'kw11', 'kw9', 'kw4', 'kw7', 'kw1', 'kw6'],
        submitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player13',
        name: '小杰',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie', 'noKiller'],
        keywordRanking: ['kw10', 'kw12', 'kw2', 'kw6', 'kw3', 'kw8', 'kw1'],
        submitted: true,
        joinedAt: now - 172800000
      }
    ],
    roleKeywords: getKeywordsByCount(7),
    createdAt: now - 259200000,
    shareCode: 'GHI789'
  }
];

export const initMockData = (): void => {
  console.log('[Mock] Initializing mock data...');
};
