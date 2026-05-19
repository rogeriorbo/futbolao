import { Bet, Pool } from '../types';

export const calculatePoints = (bet: Bet, result: { scoreA: number, scoreB: number, status: string }, scoringSystem: Pool['scoringSystem']): number => {
  if (result.status !== 'finished' && result.status !== 'live') return 0;
  
  const { scoreA: resA, scoreB: resB } = result;
  const { predictionA: betA, predictionB: betB } = bet;

  // 1. Acertou placar exato
  if (betA === resA && betB === resB) {
    return scoringSystem.exact;
  }

  const resWinner = resA > resB ? 'A' : resA < resB ? 'B' : 'Draw';
  const betWinner = betA > betB ? 'A' : betA < betB ? 'B' : 'Draw';

  // Se errou quem venceu/empate, nao ganha nada (ou ganha o minimo se houver)
  if (resWinner !== betWinner) {
    return 0;
  }

  // Se acertou o vencedor/empate, vamos ver os bonus
  
  // 2. Vencedor + diferenca de gols
  const resDiff = resA - resB;
  const betDiff = betA - betB;
  if (resDiff === betDiff) {
    return scoringSystem.winnerDiff;
  }

  // 3. Vencedor + gols do vencedor
  if (resWinner === 'A' && betA === resA) return scoringSystem.winnerGoals;
  if (resWinner === 'B' && betB === resB) return scoringSystem.winnerGoals;

  // 4. Vencedor + gols do perdedor
  if (resWinner === 'A' && betB === resB) return scoringSystem.winnerLoserGoals;
  if (resWinner === 'B' && betA === resA) return scoringSystem.winnerLoserGoals;

  // 5. Apenas o vencedor (ou empate mas nao exato - mas empate sempre cai no winnerDiff se a diff for igual)
  return scoringSystem.winnerOnly;
};
