export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  totalPoints?: number;
  theme?: 'light' | 'dark' | 'black';
}

export interface Pool {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  code: string;
  status: 'active' | 'finished';
  participants: string[];
  plan: 'free' | 'pro';
  limit?: number;
  visibility: 'public' | 'private';
  entryFee: number;
  pixKey?: string;
  prizeModel: 'classic' | 'aggressive' | 'community';
  prizeType?: 'percentage' | 'fixed';
  prizeDistribution: { position: number; value: number }[];
  scoringSystem: {
    exact: number;
    winnerGoals: number;
    winnerDiff: number;
    winnerLoserGoals: number;
    winnerOnly: number;
    champion: number;
    vice: number;
  };
  advancedSettings: {
    shieldedBets: boolean;
    multiplier: boolean;
    championBonus: number;
    viceBonus: number;
  };
  pendingParticipants?: string[];
  paidParticipants?: string[];
}

export interface Match {
  id: string;
  teamA: string;
  teamB: string;
  teamACode?: string;
  teamBCode?: string;
  teamAShort?: string;
  teamBShort?: string;
  date: string;
  scoreA?: number;
  scoreB?: number;
  status: 'scheduled' | 'finished';
  stage?: string;
  round?: number;
  stadium?: string;
  location?: string;
}

export interface Bet {
  id: string;
  userId: string;
  poolId: string;
  matchId: string;
  predictionA: number;
  predictionB: number;
  pointsEarned?: number;
}
