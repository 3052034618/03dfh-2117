import type { Game, GameEvent } from '@/types/game';
import { getKeywordsByCount } from './roleKeywords';

const now = Date.now();

const makeEvents = (events: Array<{ type: GameEvent['type']; name: string; detail: string; ago: number }>): GameEvent[] => {
  return events.map((e, i) => ({
    id: `event_mock_${i}`,
    type: e.type,
    playerName: e.name,
    detail: e.detail,
    timestamp: now - e.ago
  }));
};

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
        hasSubmitted: false,
        joinedAt: now
      },
      {
        id: 'player2',
        name: '小红',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['emotion'],
        keywordRanking: [],
        hasSubmitted: false,
        joinedAt: now
      },
      {
        id: 'player3',
        name: '小刚',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie'],
        keywordRanking: [],
        hasSubmitted: false,
        joinedAt: now
      }
    ],
    roleKeywords: getKeywordsByCount(6),
    createdAt: now - 3600000,
    shareCode: 'ABC123',
    events: makeEvents([
      { type: 'created', name: '小明', detail: '创建了「《落日惊魂》」', ago: 3600000 },
      { type: 'joined', name: '小红', detail: '加入了车次', ago: 3000000 },
      { type: 'joined', name: '小刚', detail: '加入了车次', ago: 2400000 }
    ])
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
        hasSubmitted: true,
        joinedAt: now - 7200000
      },
      {
        id: 'player5',
        name: '小华',
        avatar: 'https://picsum.photos/id/1027/200/200',
        tags: ['hardcore'],
        keywordRanking: ['kw4', 'kw5', 'kw7', 'kw8', 'kw1'],
        hasSubmitted: true,
        joinedAt: now - 7000000
      },
      {
        id: 'player6',
        name: '小芳',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['newbie', 'noKiller'],
        keywordRanking: ['kw12', 'kw10', 'kw2', 'kw6', 'kw3'],
        hasSubmitted: true,
        joinedAt: now - 6800000
      },
      {
        id: 'player7',
        name: '小强',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['support'],
        keywordRanking: [],
        hasSubmitted: false,
        joinedAt: now - 6600000
      }
    ],
    roleKeywords: getKeywordsByCount(5),
    createdAt: now - 7200000,
    shareCode: 'DEF456',
    events: makeEvents([
      { type: 'created', name: '小丽', detail: '创建了「《尘封的往事》」', ago: 7200000 },
      { type: 'joined', name: '小华', detail: '加入了车次', ago: 7000000 },
      { type: 'submitted', name: '小丽', detail: '提交了偏好', ago: 6000000 },
      { type: 'submitted', name: '小华', detail: '提交了偏好', ago: 5500000 },
      { type: 'joined', name: '小芳', detail: '加入了车次', ago: 5000000 },
      { type: 'submitted', name: '小芳', detail: '提交了偏好', ago: 4000000 },
      { type: 'joined', name: '小强', detail: '加入了车次', ago: 3500000 }
    ])
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
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player8',
        name: '小美',
        avatar: 'https://picsum.photos/id/338/200/200',
        tags: ['emotion'],
        keywordRanking: ['kw3', 'kw6', 'kw1', 'kw12', 'kw10', 'kw2', 'kw9'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player9',
        name: '小军',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie'],
        keywordRanking: ['kw12', 'kw10', 'kw2', 'kw6', 'kw3', 'kw1', 'kw8'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player10',
        name: '小燕',
        avatar: 'https://picsum.photos/id/91/200/200',
        tags: ['hardcore', 'noKiller'],
        keywordRanking: ['kw8', 'kw4', 'kw1', 'kw6', 'kw12', 'kw10', 'kw2'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player11',
        name: '小伟',
        avatar: 'https://picsum.photos/id/1027/200/200',
        tags: ['emotion', 'support'],
        keywordRanking: ['kw2', 'kw9', 'kw10', 'kw12', 'kw3', 'kw6', 'kw1'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player12',
        name: '小玲',
        avatar: 'https://picsum.photos/id/64/200/200',
        tags: ['hardcore'],
        keywordRanking: ['kw5', 'kw11', 'kw9', 'kw4', 'kw7', 'kw1', 'kw6'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      },
      {
        id: 'player13',
        name: '小杰',
        avatar: 'https://picsum.photos/id/177/200/200',
        tags: ['newbie', 'noKiller'],
        keywordRanking: ['kw10', 'kw12', 'kw2', 'kw6', 'kw3', 'kw8', 'kw1'],
        hasSubmitted: true,
        joinedAt: now - 172800000
      }
    ],
    roleKeywords: getKeywordsByCount(7),
    createdAt: now - 259200000,
    shareCode: 'GHI789',
    events: makeEvents([
      { type: 'created', name: '小明', detail: '创建了「《午夜钟声》」', ago: 259200000 },
      { type: 'joined', name: '小美', detail: '加入了车次', ago: 258000000 },
      { type: 'joined', name: '小军', detail: '加入了车次', ago: 257000000 },
      { type: 'submitted', name: '小明', detail: '提交了偏好', ago: 200000000 },
      { type: 'submitted', name: '小美', detail: '提交了偏好', ago: 195000000 },
      { type: 'submitted', name: '小军', detail: '提交了偏好', ago: 190000000 },
      { type: 'resultGenerated', name: '系统', detail: '全员已提交，分配结果已生成', ago: 180000000 }
    ])
  }
];

export const initMockData = (): void => {
  console.log('[Mock] Initializing mock data...');
};
