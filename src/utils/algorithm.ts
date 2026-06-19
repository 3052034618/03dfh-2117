import type { Game, Player, RoleKeyword, Plan, PlanType, Assignment } from '@/types/game';

const tagWeights: Record<string, number> = {
  highSocial: 3,
  lowSocial: -2,
  emotional: 3,
  rational: -2,
  killer: -5,
  hasReverse: 2,
  noReverse: 1,
  central: 2,
  edge: -1,
  complex: -3,
  simple: 3,
  male: 1,
  female: 1
};

const tagToAttributes: Record<string, string[]> = {
  newbie: ['simple', 'edge', 'noReverse'],
  hardcore: ['complex', 'central', 'hasReverse'],
  emotion: ['emotional', 'highSocial'],
  noKiller: [],
  support: ['edge', 'lowSocial']
};

const keywordAttributeMap: Record<string, string[]> = {
  '高社交': ['highSocial', 'central'],
  '独行者': ['lowSocial', 'edge'],
  '情感线重': ['emotional'],
  '推理担当': ['rational', 'complex'],
  '剧情起伏': ['hasReverse', 'killer'],
  'CP位': ['highSocial', 'emotional'],
  '压力担当': ['killer', 'hasReverse', 'central'],
  '逻辑担当': ['rational', 'central', 'noReverse'],
  '神秘人': ['hasReverse', 'edge'],
  '搞笑担当': ['highSocial', 'edge'],
  '背负秘密': ['hasReverse', 'complex'],
  '阳光开朗': ['highSocial', 'simple', 'noReverse']
};

export const calculateMatchScore = (
  player: Player,
  keyword: RoleKeyword,
  planType: PlanType,
  allPlayers: Player[],
  allowCrossGender: boolean
): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  const rankingIndex = player.keywordRanking.indexOf(keyword.id);
  if (rankingIndex >= 0) {
    const rankingBonus = (player.keywordRanking.length - rankingIndex) * 2;
    score += rankingBonus;
    if (rankingIndex === 0) {
      reasons.push('这是他最偏好的关键词');
    } else if (rankingIndex === 1) {
      reasons.push('这是他第二偏好的关键词');
    } else if (rankingIndex < 3) {
      reasons.push('这是他较偏好的关键词');
    }
  }

  player.tags.forEach(tag => {
    const playerAttrs = tagToAttributes[tag] || [];
    const keywordAttrs = keywordAttributeMap[keyword.keyword] || keyword.attributes;
    
    playerAttrs.forEach(attr => {
      if (keywordAttrs.includes(attr)) {
        const weight = tagWeights[attr] || 1;
        
        if (planType === 'preference') {
          score += weight * 2;
        } else if (planType === 'newbie' && tag === 'newbie') {
          score += weight * 3;
        } else {
          score += weight;
        }

        if (weight > 0) {
          if (tag === 'newbie' && attr === 'simple') {
            reasons.push('新手适合简单易懂的角色');
          } else if (tag === 'hardcore' && attr === 'complex') {
            reasons.push('硬核玩家偏好高难度推理');
          } else if (tag === 'emotion' && attr === 'emotional') {
            reasons.push('情感本爱好者适合情感线重的角色');
          } else if (tag === 'newbie' && attr === 'noReverse') {
            reasons.push('新手适合剧情平稳的角色');
          } else if (tag === 'hardcore' && attr === 'hasReverse') {
            reasons.push('硬核玩家偏好有剧情起伏的角色');
          } else if (attr === 'highSocial') {
            reasons.push('他偏好高社交属性的角色');
          } else if (attr === 'noReverse') {
            reasons.push('他偏好剧情平稳的角色');
          }
        }
      }
    });

    if (tag === 'noKiller') {
      const keywordAttrs = keywordAttributeMap[keyword.keyword] || keyword.attributes;
      if (!keywordAttrs.includes('killer')) {
        score += 3;
        reasons.push('这个角色压力较小，符合他的需求');
      } else {
        score -= 10;
      }
    }

    if (tag === 'support' && playerAttrs.includes('edge')) {
      const keywordAttrs = keywordAttributeMap[keyword.keyword] || keyword.attributes;
      if (keywordAttrs.includes('edge')) {
        score += 4;
        reasons.push('想尝试边缘位，这个角色符合需求');
      }
    }
  });

  if (planType === 'balance') {
    const assignedCount = allPlayers.filter(p => p.hasSubmitted).length;
    const avgScore = assignedCount > 0 ? score / assignedCount : 0;
    score = score - Math.abs(avgScore - score) * 0.5;
    
    const hasHighScore = allPlayers.some(p => p.id !== player.id && p.hasSubmitted);
    if (hasHighScore) {
      score += 1;
    }
  }

  if (planType === 'newbie') {
    const isNewbie = player.tags.includes('newbie');
    const keywordAttrs = keywordAttributeMap[keyword.keyword] || keyword.attributes;
    const isSimple = keywordAttrs.includes('simple') || keywordAttrs.includes('noReverse');
    
    if (isNewbie && isSimple) {
      score += 8;
      reasons.push('新手优先分配简单角色');
    }
    if (!isNewbie && !isSimple) {
      score += 3;
      reasons.push('复杂角色交给有经验的玩家');
    }
  }

  return { score, reasons: [...new Set(reasons)] };
};

export const generateAssignmentPlans = (game: Game): Plan[] => {
  const submittedPlayers = game.players.filter(p => p.hasSubmitted);
  const keywords = game.roleKeywords;

  const isFull = game.players.length >= game.playerCount;
  const allSubmitted = submittedPlayers.length >= game.players.length;

  if (!isFull || !allSubmitted || submittedPlayers.length === 0 || keywords.length === 0) {
    return [];
  }

  const planConfigs: { type: PlanType; name: string; description: string; color: string }[] = [
    {
      type: 'preference',
      name: '满足个人偏好',
      description: '优先满足每位玩家的个人偏好和标签选择',
      color: '#6C5CE7'
    },
    {
      type: 'balance',
      name: '平衡全车体验',
      description: '综合考虑所有玩家，让整体体验最均衡',
      color: '#00B894'
    },
    {
      type: 'newbie',
      name: '尽量照顾新手',
      description: '把简单角色分配给新手，复杂角色交给老玩家',
      color: '#FDCB6E'
    }
  ];

  return planConfigs.map(config => {
    const assignments = hungarianAssignment(submittedPlayers, keywords, config.type, game.allowCrossGender);
    const totalScore = assignments.reduce((sum, a) => sum + a.reasons.length, 0);
    
    return {
      type: config.type,
      name: config.name,
      description: config.description,
      color: config.color,
      assignments,
      score: totalScore
    };
  });
};

const hungarianAssignment = (
  players: Player[],
  keywords: RoleKeyword[],
  planType: PlanType,
  allowCrossGender: boolean
): Assignment[] => {
  const n = Math.min(players.length, keywords.length);
  const m = keywords.length;
  
  const costMatrix: number[][] = [];
  const reasonMatrix: string[][][] = [];

  for (let i = 0; i < n; i++) {
    costMatrix[i] = [];
    reasonMatrix[i] = [];
    for (let j = 0; j < m; j++) {
      const { score, reasons } = calculateMatchScore(players[i], keywords[j], planType, players, allowCrossGender);
      costMatrix[i][j] = -score;
      reasonMatrix[i][j] = reasons;
    }
  }

  const result = greedyAssignment(costMatrix, n, m);
  
  return result.map(({ row, col }) => ({
    roleKeywordId: keywords[col].id,
    playerId: players[row].id,
    reasons: reasonMatrix[row][col]
  }));
};

const greedyAssignment = (costMatrix: number[][], n: number, m: number): { row: number; col: number }[] => {
  const usedCols = new Set<number>();
  const result: { row: number; col: number }[] = [];

  const allPairs: { row: number; col: number; cost: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      allPairs.push({ row: i, col: j, cost: costMatrix[i][j] });
    }
  }

  allPairs.sort((a, b) => a.cost - b.cost);

  for (const pair of allPairs) {
    if (!usedCols.has(pair.col) && !result.some(r => r.row === pair.row)) {
      result.push({ row: pair.row, col: pair.col });
      usedCols.add(pair.col);
    }
    if (result.length >= n) break;
  }

  return result;
};

export const getPlayerTagLabel = (tag: string): string => {
  const labels: Record<string, string> = {
    newbie: '新手',
    hardcore: '硬核玩家',
    emotion: '情感本爱好者',
    noKiller: '怕压力大',
    support: '想尝试边缘位'
  };
  return labels[tag] || tag;
};

export const getPlayerTagColor = (tag: string): string => {
  const colors: Record<string, string> = {
    newbie: '#FFEAA7',
    hardcore: '#74B9FF',
    emotion: '#FDCB6E',
    noKiller: '#FF7675',
    support: '#55EFC4'
  };
  return colors[tag] || '#DFE6E9';
};
