import { useEffect, useRef } from 'react';
import { Match, Bet, Pool, UserProfile } from '../types';

export const usePushNotifications = (
  userBets: Bet[], 
  matches: Match[], 
  userPools: Pool[],
  profile: UserProfile | null,
  enabled: boolean
) => {
  const notifiedStarts = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('notified_starts') || '[]')));
  const notifiedFinishes = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('notified_finishes') || '[]')));
  const notifiedApprovedPools = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('notified_approved_pools') || '[]')));
  const notifiedFinishedPools = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('notified_finished_pools') || '[]')));

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined') return;

    try {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch (e) {
      console.warn("Notification API not available/blocked:", e);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || !profile) return;

    let permission = 'denied';
    try {
      permission = Notification.permission;
    } catch (e) {
      console.warn("Could not read Notification permission status:", e);
    }

    if (permission !== 'granted') return;

    // Check for Pool Updates
    userPools.forEach(pool => {
      // 1. Approval alert
      if (pool.participants.includes(profile.uid) && pool.ownerId !== profile.uid) {
        if (!notifiedApprovedPools.current.has(pool.id)) {
          try {
            new Notification('Você está dentro!', {
              body: `Você foi aceito como participante no bolão "${pool.name}". Prepare seus palpites!`,
              icon: '/vite.svg'
            });
          } catch (e) {
            console.error(e);
          }
          notifiedApprovedPools.current.add(pool.id);
          localStorage.setItem('notified_approved_pools', JSON.stringify(Array.from(notifiedApprovedPools.current)));
        }
      }

      // 2. Pool Finish alert
      if (pool.status === 'finished') {
        if (!notifiedFinishedPools.current.has(pool.id)) {
          try {
            new Notification(`Bolão Encerrado: ${pool.name}`, {
              body: `O bolão "${pool.name}" foi marcado como finalizado. Confira a classificação final!`,
              icon: '/vite.svg'
            });
          } catch (e) {
            console.error(e);
          }
          notifiedFinishedPools.current.add(pool.id);
          localStorage.setItem('notified_finished_pools', JSON.stringify(Array.from(notifiedFinishedPools.current)));
        }
      }
    });

    const interval = setInterval(() => {
      let isGranted = false;
      try {
        isGranted = Notification.permission === 'granted';
      } catch (e) {
        // Safe fallback
      }
      if (!isGranted) return;

      const now = new Date();
      const userBetMatchIds = new Set(userBets.map(bet => bet.matchId));
      
      matches.forEach(match => {
        if (!userBetMatchIds.has(match.id)) return;

        // Check if about to start (within 15 minutes)
        const matchDate = new Date(match.date);
        const diffMs = matchDate.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (match.status === 'scheduled' && diffMinutes > 0 && diffMinutes <= 15) {
          if (!notifiedStarts.current.has(match.id)) {
            try {
              new Notification('Sua aposta está prestes a começar!', {
                body: `O jogo ${match.teamA} x ${match.teamB} começa em breve.`,
                icon: '/vite.svg'
              });
            } catch (e) {
              console.error(e);
            }
            notifiedStarts.current.add(match.id);
            localStorage.setItem('notified_starts', JSON.stringify(Array.from(notifiedStarts.current)));
          }
        }

        // Check if just finished
        if (match.status === 'finished') {
          if (!notifiedFinishes.current.has(match.id)) {
            try {
              new Notification('Jogo finalizado!', {
                body: `O jogo ${match.teamA} x ${match.teamB} terminou em ${match.scoreA} x ${match.scoreB}. Veja como você se saiu!`,
                icon: '/vite.svg'
              });
            } catch (e) {
              console.error(e);
            }
            notifiedFinishes.current.add(match.id);
            localStorage.setItem('notified_finishes', JSON.stringify(Array.from(notifiedFinishes.current)));
          }
        }
      });
    }, 60000); // checked every minute

    return () => clearInterval(interval);
  }, [userBets, matches, userPools, profile, enabled]);
};
