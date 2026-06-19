export type PlayerTagType = 'newbie' | 'hardcore' | 'emotion' | 'noKiller' | 'support';

export interface PlayerTag {
  key: PlayerTagType;
  label: string;
  color: string;
  description: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  tags: PlayerTagType[];
  keywordRanking: string[];
  submitted: boolean;
  joinedAt: number;
}

export interface RoleKeyword {
  id: string;
  keyword: string;
  description: string;
  attributes: string[];
}

export interface Game {
  id: string;
  scriptName: string;
  playerCount: number;
  startTime: number;
  allowCrossGender: boolean;
  creatorId: string;
  creatorName: string;
  status: 'recruiting' | 'submitting' | 'completed';
  players: Player[];
  roleKeywords: RoleKeyword[];
  createdAt: number;
  shareCode: string;
}

export type PlanType = 'preference' | 'balance' | 'newbie';

export interface Assignment {
  roleKeywordId: string;
  playerId: string;
  reasons: string[];
}

export interface Plan {
  type: PlanType;
  name: string;
  description: string;
  color: string;
  assignments: Assignment[];
  score: number;
}

export interface AssignmentResult {
  gameId: string;
  plans: Plan[];
  currentPlanIndex: number;
  calculatedAt: number;
}
