import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  or,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Info, 
  Plus, 
  LogIn, 
  LogOut, 
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Bell,
  Mail,
  Zap,
  Settings,
  MessageCircle,
  Search,
  Filter,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Toaster, toast } from 'sonner';
import { UserProfile, Pool, Match, Bet } from './types';
import { WORLD_CUP_2026_MATCHES } from './data/matches';
import { calculatePoints } from './lib/scoring';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';
import { PoolCard } from './components/PoolCard';
import { MatchCard } from './components/MatchCard';
import { CreatePoolModal } from './components/CreatePoolModal';
import { JoinPoolModal } from './components/JoinPoolModal';
import { ManageParticipantsModal } from './components/ManageParticipantsModal';
import { ViewBetsModal } from './components/ViewBetsModal';
import { EditProfileModal } from './components/EditProfileModal';
import { PoolDetailModal } from './components/PoolDetailModal';
import { EmptyState } from './components/EmptyState';
import { EarlyPredictionCard } from './components/EarlyPredictionCard';
import { PoolChat } from './components/PoolChat';
import { TournamentBracket } from './components/TournamentBracket';
import { TEAMS } from './data/teams';
import { usePushNotifications } from './hooks/usePushNotifications';
import confetti from 'canvas-confetti';

// --- Constants & Mock Data ---
const RULES = [
  { points: 25, label: "Placar exato", desc: "Acertou o resultado final (placar) do jogo." },
  { points: 18, label: "Vencedor + gols do vencedor", desc: "Acertou o vencedor e o número exato de gols marcados pelo time que venceu." },
  { points: 15, label: "Vencedor + diferença de gols", desc: "Acertou o resultado (vitória ou empate) e a diferença exata de gols entre as equipes." },
  { points: 12, label: "Vencedor + gols do perdedor", desc: "Acertou o vencedor e o número exato de gols marcados pelo time que perdeu." },
  { points: 10, label: "Apenas vencedor correto", desc: "Acertou apenas o vencedor da partida ou se terminou em empate, sem acertar o placar." },
  { points: 0, label: "Nenhum acerto", desc: "A aposta não corresponde ao resultado da partida." },
  { points: 100, label: "Bônus: Campeão correto", desc: "Acertou quem se sagrou o campeão da Copa." },
  { points: 50, label: "Bônus: Vice correto", desc: "Acertou quem se sagrou o vice-campeão da Copa." },
];

// --- Components ---

const Navbar = ({ user, profile, onLogin, onLogout, onEditProfile, onSync, isSyncing, onCheckLeagues, onCheckTeams, onCheckRounds, isCheckingLeagues }: { 
  user: FirebaseUser | null, 
  profile: UserProfile | null,
  onLogin: () => void, 
  onLogout: () => void,
  onEditProfile: () => void,
  onSync: () => void,
  isSyncing: boolean,
  onCheckLeagues: () => void,
  onCheckTeams: () => void,
  onCheckRounds: () => void,
  isCheckingLeagues: boolean
}) => (
  <nav className="bg-slate-950/95 backdrop-blur-md border-b border-slate-900/60 p-3 sm:p-4 sticky top-0 z-50">
    <div className="max-w-4xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-md border border-slate-800">
          <Trophy className="text-yellow-400 w-5 h-5 animate-pulse" />
        </div>
        <h1 className="text-sm sm:text-base font-black tracking-[0.2em] uppercase text-white">Bolão 26</h1>
      </div>
      {user ? (
        <div className="flex items-center gap-2 sm:gap-3">
          {(user.email === 'deiorbo@gmail.com' || profile?.role === 'admin' || profile?.isAdmin) && (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={onCheckLeagues}
                disabled={isCheckingLeagues}
                title="Checar Cobertura da Liga"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                  isCheckingLeagues 
                    ? "bg-slate-900 text-slate-500 border-slate-800" 
                    : "bg-blue-950/60 text-blue-400 border-blue-900/40 hover:bg-blue-900 hover:text-blue-300"
                )}
              >
                {isCheckingLeagues ? <Loader2 className="w-3 h-3 animate-spin" /> : <Info className="w-3 h-3" />}
                <span className="hidden sm:inline">Info API</span>
              </button>
              <button 
                onClick={onSync}
                disabled={isSyncing}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                  isSyncing 
                    ? "bg-slate-900 text-slate-500 border-slate-800" 
                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20"
                )}
              >
                {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                <span className="hidden sm:inline text-brand">Gols</span>
              </button>
            </div>
          )}
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Usuário</p>
            <p className="text-xs font-bold text-white leading-tight">{profile?.displayName || user.displayName}</p>
          </div>
          <img src={profile?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || user.displayName || '?'}`} alt="Profile" className="w-8 h-8 rounded-full border border-slate-800 shadow-sm" referrerPolicy="no-referrer" />
          <button onClick={onEditProfile} className="p-1.5 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white" title="Editar Perfil">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={onLogout} className="p-1.5 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white" title="Sair">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button 
          onClick={onLogin}
          className="bg-brand text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand/90 transition-all active:scale-95 shadow-sm"
        >
          Entrar
        </button>
      )}
    </div>
  </nav>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'pools' | 'finished' | 'matches' | 'ranking' | 'rules' | 'chat'>('pools');
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const activePools = userPools.filter(p => !p.status || p.status === 'active');
  const finishedPools = userPools.filter(p => p.status === 'finished');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [matches, setMatches] = useState<Match[]>(WORLD_CUP_2026_MATCHES);
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [officialStandings, setOfficialStandings] = useState<Record<string, any>>({});
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showPoolSelector, setShowPoolSelector] = useState(false);
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [showJoinPool, setShowJoinPool] = useState(false);
  const [showManageParticipants, setShowManageParticipants] = useState(false);
  const [managingPool, setManagingPool] = useState<Pool | null>(null);
  const [showViewBets, setShowViewBets] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activePoolDetail, setActivePoolDetail] = useState<Pool | null>(null);
  const [activeMatchForBets, setActiveMatchForBets] = useState<Match | null>(null);
  const [allPoolBets, setAllPoolBets] = useState<Bet[]>([]);
  const [allEarlyPredictions, setAllEarlyPredictions] = useState<Record<string, { champion: string, vice: string }>>({});
  const [ranking, setRanking] = useState<{ userId: string, name: string, photoURL?: string, points: number }[]>([]);
  const [globalResults, setGlobalResults] = useState<Record<string, any>>({});
  const [userEarlyPrediction, setUserEarlyPrediction] = useState<{ champion: string, vice: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCheckingLeagues, setIsCheckingLeagues] = useState(false);
  const [coverageInfo, setCoverageInfo] = useState<any>(null);
  const [teamsInfo, setTeamsInfo] = useState<any>(null);
  const [roundsInfo, setRoundsInfo] = useState<any>(null);
  const [activeDiagnostic, setActiveDiagnostic] = useState<'coverage' | 'teams' | 'rounds'>('coverage');
  const [diagnosticSeason, setDiagnosticSeason] = useState<number>(2026);
  
  const [activeMatchesTab, setActiveMatchesTab] = useState<'fixtures' | 'table'>('fixtures');
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [showPendingBetsOnly, setShowPendingBetsOnly] = useState(false);

  usePushNotifications(bets, matches, userPools, profile, profile?.notificationsEnabled || false);

  // Calculate group standings
  const getStandings = (group: string) => {
    // If we have official standings for this group from API, use them
    if (officialStandings[group]) {
      return (officialStandings[group].teams || []).sort((a: any, b: any) => a.rank - b.rank);
    }

    const groupTeams: Record<string, { name: string, code: string, p: number, w: number, d: number, l: number, gf: number, ga: number, gd: number, pts: number }> = {};
    
    // Filter matches for this group
    const groupMatches = mergedMatches.filter(m => m.stage === group);
    
    groupMatches.forEach(m => {
      if (!groupTeams[m.teamA]) {
        const teamData = (TEAMS as any)[m.teamA];
        groupTeams[m.teamA] = { 
          name: teamData?.name || m.teamAShort || m.teamA, 
          code: m.teamACode || teamData?.code || 'un', 
          p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 
        };
      }
      if (!groupTeams[m.teamB]) {
        const teamData = (TEAMS as any)[m.teamB];
        groupTeams[m.teamB] = { 
          name: teamData?.name || m.teamBShort || m.teamB, 
          code: m.teamBCode || teamData?.code || 'un', 
          p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 
        };
      }
      
      const res = globalResults[m.id];
      if (res && res.status === 'finished') {
        const sA = res.scoreA;
        const sB = res.scoreB;
        
        groupTeams[m.teamA].p += 1;
        groupTeams[m.teamB].p += 1;
        groupTeams[m.teamA].gf += sA;
        groupTeams[m.teamA].ga += sB;
        groupTeams[m.teamB].gf += sB;
        groupTeams[m.teamB].ga += sA;
        groupTeams[m.teamA].gd = groupTeams[m.teamA].gf - groupTeams[m.teamA].ga;
        groupTeams[m.teamB].gd = groupTeams[m.teamB].gf - groupTeams[m.teamB].ga;
        
        if (sA > sB) {
          groupTeams[m.teamA].w += 1;
          groupTeams[m.teamA].pts += 3;
          groupTeams[m.teamB].l += 1;
        } else if (sA < sB) {
          groupTeams[m.teamB].w += 1;
          groupTeams[m.teamB].pts += 3;
          groupTeams[m.teamA].l += 1;
        } else {
          groupTeams[m.teamA].d += 1;
          groupTeams[m.teamB].d += 1;
          groupTeams[m.teamA].pts += 1;
          groupTeams[m.teamB].pts += 1;
        }
      }
    });

    return Object.values(groupTeams).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
  };

  const mergedMatches = React.useMemo(() => WORLD_CUP_2026_MATCHES.map(match => {
    const result = globalResults[match.id];
    if (result) {
      return { ...match, scoreA: result.scoreA, scoreB: result.scoreB, status: result.status };
    }
    return match;
  }), [globalResults]);

  const groups = useMemo(() => {
    const g = new Set<string>();
    mergedMatches.forEach(m => {
      if (m.stage?.startsWith('Grupo ')) {
        g.add(m.stage);
      }
    });
    return Array.from(g).sort();
  }, [mergedMatches]);

  const [selectedGroup, setSelectedGroup] = useState<string>('Grupo A');
  const [selectedGroupTab, setSelectedGroupTab] = useState<'Grupos' | 'Mata-Mata'>('Grupos');
  const [selectedRound, setSelectedRound] = useState<string>('Rodada 1');
  const [viewMode, setViewMode] = useState<'group' | 'round' | 'date'>('group');

  const filteredMergedMatches = React.useMemo(() => {
    return mergedMatches.filter(match => {
      if (matchSearchQuery.trim() && (viewMode === 'round' || viewMode === 'date')) {
        const queryStr = matchSearchQuery.toLowerCase();
        const teamAName = ((TEAMS as any)[match.teamA]?.name || match.teamA).toLowerCase();
        const teamBName = ((TEAMS as any)[match.teamB]?.name || match.teamB).toLowerCase();
        const teamAShort = (match.teamAShort || '').toLowerCase();
        const teamBShort = (match.teamBShort || '').toLowerCase();
        const matchesSearch = teamAName.includes(queryStr) || teamBName.includes(queryStr) || teamAShort.includes(queryStr) || teamBShort.includes(queryStr);
        if (!matchesSearch) return false;
      }
      
      if (showPendingBetsOnly) {
        const hasBet = bets.some(b => b.matchId === match.id && b.predictionA !== undefined && b.predictionB !== undefined);
        if (hasBet) return false;
      }
      
      return true;
    });
  }, [mergedMatches, matchSearchQuery, showPendingBetsOnly, bets, viewMode]);

  const matchesByGroup = React.useMemo(() => {
    return filteredMergedMatches.reduce((acc, match) => {
      const stage = match.stage;
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(match);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filteredMergedMatches]);

  const matchesByDate = React.useMemo(() => {
    return filteredMergedMatches.reduce((acc, match) => {
      const date = match.date.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filteredMergedMatches]);

  const matchesByRound = React.useMemo(() => {
    return filteredMergedMatches.reduce((acc, match) => {
      let roundLabel = match.round ? `Rodada ${match.round}` : (match.stage === 'Final' ? 'Final' : 'Mata-Mata');
      if (!acc[roundLabel]) acc[roundLabel] = [];
      acc[roundLabel].push(match);
      return acc;
    }, {} as Record<string, Match[]>);
  }, [filteredMergedMatches]);

  const leaderStats = React.useMemo(() => {
    if (ranking.length === 0 || allPoolBets.length === 0) return null;
    const leader = ranking[0];
    const leaderBets = allPoolBets.filter(b => b.userId === leader.userId);
    const finishedGlobalResults = Object.entries(globalResults).filter(([_, res]: [string, any]) => res.status === 'finished');
    if (finishedGlobalResults.length === 0) return null;
    
    let exactHits = 0;
    let totalFinishedParsed = 0;
    
    finishedGlobalResults.forEach(([matchId, res]: [string, any]) => {
      const b = leaderBets.find(bet => bet.matchId === matchId);
      if (b) {
        totalFinishedParsed++;
        if (b.predictionA === res.scoreA && b.predictionB === res.scoreB) {
          exactHits++;
        }
      }
    });
    
    return {
      leaderName: leader.name,
      exactHits,
      totalGuesses: totalFinishedParsed,
      rate: totalFinishedParsed > 0 ? Math.round((exactHits / totalFinishedParsed) * 100) : 0
    };
  }, [ranking, allPoolBets, globalResults]);

  const prizeCalculations = React.useMemo(() => {
    if (!selectedPool) return null;
    const paidCount = selectedPool.paidParticipants?.length || 0;
    const totalCollected = paidCount * selectedPool.entryFee;
    
    let totalPrize = 0;
    if (selectedPool.prizeType === 'fixed') {
      totalPrize = (selectedPool.prizeDistribution || []).reduce((acc, d) => acc + d.value, 0);
    } else {
      const percentage = (selectedPool.prizeDistribution || []).reduce((acc, d) => acc + d.value, 0);
      totalPrize = (percentage / 100) * totalCollected;
    }

    return { totalCollected, totalPrize };
  }, [selectedPool]);


  useEffect(() => {
    // Listen for official standings
    const unsubStandings = onSnapshot(collection(db, 'standings'), (snapshot) => {
      const std: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        std[doc.id] = doc.data();
      });
      setOfficialStandings(std);
    });

    // Listen for official match results
    const unsubscribe = onSnapshot(collection(db, 'results'), (snapshot) => {
      const results: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        results[doc.id] = doc.data();
      });
      setGlobalResults(results);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'results');
    });
    return () => {
      unsubStandings();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Usuário',
              photoURL: u.photoURL || undefined,
              email: u.email || '',
              totalPoints: 0
            };
            await setDoc(doc(db, 'users', u.uid), newProfile);
            setProfile(newProfile);
          } else {
            setProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Fallback profile to bypass white screen
          setProfile({
            uid: u.uid,
            displayName: u.displayName || 'Usuário',
            photoURL: u.photoURL || undefined,
            email: u.email || '',
            totalPoints: 0
          });
        }
      } else {
        setProfile(null);
        setUserPools([]);
        setSelectedPool(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setUserPools([]);
      return;
    }
    const unsubPools = fetchUserPools(user.uid);
    return () => {
      unsubPools();
    };
  }, [user]);

  const fetchUserPools = (uid: string) => {
    const q = query(
      collection(db, 'pools'), 
      or(
        where('participants', 'array-contains', uid),
        where('pendingParticipants', 'array-contains', uid)
      )
    );
    return onSnapshot(q, (snapshot) => {
      const pools = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Pool))
        .filter((p: any) => !p.deleted);
      setUserPools(pools);
      
      // Update selectedPool with new data if it exists in the list
      if (selectedPool) {
        const updated = pools.find(p => p.id === selectedPool.id);
        if (updated) setSelectedPool(updated);
      } else if (pools.length > 0 && !selectedPool) {
        setSelectedPool(pools[0]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pools');
    });
  };

  useEffect(() => {
    if (selectedPool) {
      const qBets = query(collection(db, `pools/${selectedPool.id}/bets`));
      const unsubBets = onSnapshot(qBets, async (snapshot) => {
        const allBets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
        setAllPoolBets(allBets);
        
        if (user) {
          setBets(allBets.filter(b => b.userId === user.uid));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `pools/${selectedPool.id}/bets`);
      });

      const qPreds = query(collection(db, `pools/${selectedPool.id}/earlyPredictions`));
      const unsubPreds = onSnapshot(qPreds, (snapshot) => {
        const preds: Record<string, { champion: string, vice: string }> = {};
        snapshot.docs.forEach(doc => {
          preds[doc.id] = doc.data() as { champion: string, vice: string };
        });
        setAllEarlyPredictions(preds);
        
        if (user && preds[user.uid]) {
          setUserEarlyPrediction(preds[user.uid]);
        } else if (user) {
          setUserEarlyPrediction(null);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `pools/${selectedPool.id}/earlyPredictions`);
      });

      return () => {
        unsubBets();
        unsubPreds();
      };
    }
  }, [selectedPool, user]);

  useEffect(() => {
    if (selectedPool) {
      const calculateRanking = async () => {
        // Calculate points dynamically based on global results
        const userPoints: Record<string, number> = {};
        
        // 1. Points from match bets
        allPoolBets.forEach(bet => {
          const matchResult = globalResults[bet.matchId];
          const points = matchResult ? calculatePoints(bet, matchResult, selectedPool.scoringSystem) : 0;
          userPoints[bet.userId] = (userPoints[bet.userId] || 0) + points;
        });

        // 2. Points from early predictions
        const tournamentResult = globalResults['tournament'];
        if (tournamentResult && tournamentResult.status === 'finished') {
          Object.entries(allEarlyPredictions).forEach(([uid, pred]: [string, any]) => {
            if (pred.champion === tournamentResult.champion) {
              userPoints[uid] = (userPoints[uid] || 0) + selectedPool.scoringSystem.champion;
            }
            if (pred.vice === tournamentResult.vice) {
              userPoints[uid] = (userPoints[uid] || 0) + selectedPool.scoringSystem.vice;
            }
          });
        }

        // Fetch user profiles for participants who have paid (or owner)
        const participantsData = await Promise.all(
          selectedPool.participants.map(async (uid) => {
            const isOwner = uid === selectedPool.ownerId;
            const hasPaid = (selectedPool.paidParticipants || []).includes(uid);
            
            if (!isOwner && !hasPaid) return null;

            const userDoc = await getDoc(doc(db, 'users', uid));
            const data = userDoc.data() as UserProfile;
            return {
              userId: uid,
              name: data?.displayName || 'Usuário',
              photoURL: data?.photoURL,
              points: userPoints[uid] || 0
            };
          })
        );

        setRanking(participantsData.filter(Boolean).sort((a: any, b: any) => b.points - a.points));
      };

      calculateRanking();
    }
  }, [selectedPool, allPoolBets, allEarlyPredictions, globalResults]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      alert("Erro ao fazer login: " + (error.message || "Verifique o console para mais detalhes."));
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSyncScores = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando placares (Temporada ${diagnosticSeason})...`);
    
    try {
      const response = await fetch(`/api/sync-scores?season=${diagnosticSeason}`);
      const data = await response.json();
      if (data.success) {
        toast.success(data.message, { id: toastId });
      } else {
        toast.error(data.error || 'Erro ao sincronizar.', { id: toastId });
      }
    } catch (error) {
      toast.error('Erro de conexão.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncTeams = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando times (Temporada ${diagnosticSeason})...`);
    try {
      const response = await fetch(`/api/sync-teams?season=${diagnosticSeason}`);
      const data = await response.json();
      if (data.success) toast.success(data.message, { id: toastId });
      else toast.error(data.error || 'Erro ao sincronizar times.', { id: toastId });
    } catch (error) {
      toast.error('Erro de conexão.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncStandings = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando classificação (Temporada ${diagnosticSeason})...`);
    try {
      const response = await fetch(`/api/sync-standings?season=${diagnosticSeason}`);
      const data = await response.json();
      if (data.success) toast.success(data.message, { id: toastId });
      else toast.error(data.error || 'Erro ao sincronizar classificação.', { id: toastId });
    } catch (error) {
      toast.error('Erro de conexão.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckLeagues = async () => {
    if (isCheckingLeagues) return;
    setIsCheckingLeagues(true);
    const toastId = toast.loading(`Consultando cobertura da liga via API (${diagnosticSeason})...`);
    
    try {
      const response = await fetch(`/api/check-leagues?season=${diagnosticSeason}`);
      const data = await response.json();
      console.log("League Check Response:", data);
      
      if (data.results > 0 && data.response[0]) {
        const coverage = data.response[0].coverage;
        setCoverageInfo(coverage);
        toast.success('Cobertura API recebida!', { id: toastId });
      } else if (data.errors && Object.keys(data.errors).length > 0) {
        toast.error('Erro na API: ' + JSON.stringify(data.errors), { id: toastId });
      } else {
        toast.error(`Nenhum dado de cobertura encontrado para ${diagnosticSeason}.`, { id: toastId });
      }
    } catch (error) {
      console.error("Check Leagues error:", error);
      toast.error('Erro ao consultar API.', { id: toastId });
    } finally {
      setIsCheckingLeagues(false);
    }
  };

  const handleCheckTeams = async () => {
    if (isCheckingLeagues) return;
    setIsCheckingLeagues(true);
    const toastId = toast.loading(`Consultando times via API (${diagnosticSeason})...`);
    try {
      const response = await fetch(`/api/check-teams?season=${diagnosticSeason}`);
      const data = await response.json();
      if (data.results > 0) {
        setTeamsInfo(data.response);
        setActiveDiagnostic('teams');
        toast.success(`${data.results} times encontrados!`, { id: toastId });
      } else {
        toast.error('Nenhum time encontrado.', { id: toastId });
      }
    } catch (error) {
      toast.error('Erro ao consultar API.', { id: toastId });
    } finally {
      setIsCheckingLeagues(false);
    }
  };

  const handleCheckRounds = async () => {
    if (isCheckingLeagues) return;
    setIsCheckingLeagues(true);
    const toastId = toast.loading(`Consultando rodadas via API (${diagnosticSeason})...`);
    try {
      const response = await fetch(`/api/check-rounds?season=${diagnosticSeason}`);
      const data = await response.json();
      if (data.response && data.response.length > 0) {
        setRoundsInfo(data.response);
        setActiveDiagnostic('rounds');
        toast.success(`${data.response.length} rodadas encontradas!`, { id: toastId });
      } else {
        toast.error('Nenhuma rodada encontrada.', { id: toastId });
      }
    } catch (error) {
      toast.error('Erro ao consultar API.', { id: toastId });
    } finally {
      setIsCheckingLeagues(false);
    }
  };

  const handleCreatePool = async (data: any) => {
    if (!user) return;
    
    if (editingPool) {
      await updateDoc(doc(db, 'pools', editingPool.id), data);
      toast.success('Bolão atualizado com sucesso!');
      setEditingPool(null);
    } else {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newPool: Omit<Pool, 'id'> = {
        ...data,
        ownerId: user.uid,
        code,
        participants: [user.uid],
      };
      await addDoc(collection(db, 'pools'), newPool);
      toast.success('Bolão criado com sucesso!');
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'pools', poolId));
      toast.success('Bolão excluído com sucesso!');
      if (selectedPool?.id === poolId) setSelectedPool(null);
    } catch (error) {
      toast.error('Erro ao excluir bolão.');
    }
  };

  const handleJoinPool = async (code: string) => {
    if (!user || !code) return;
    try {
      const q = query(collection(db, 'pools'), where('code', '==', code.toUpperCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const poolDoc = snapshot.docs[0];
        const poolData = poolDoc.data() as Pool;
        
        if (poolData.participants.includes(user.uid) || poolData.pendingParticipants?.includes(user.uid)) {
          toast.error('Você já participa ou tem um pedido pendente neste bolão.');
          return;
        }

        if (poolData.entryFee > 0 && poolData.ownerId !== user.uid) {
          await updateDoc(doc(db, 'pools', poolDoc.id), {
            pendingParticipants: arrayUnion(user.uid)
          });
          toast.info('Solicitação enviada! Realize o PIX para o organizador confirmar sua entrada.');
          return { needsPayment: true, pool: { ...poolData, id: poolDoc.id } };
        } else {
          await updateDoc(doc(db, 'pools', poolDoc.id), {
            participants: arrayUnion(user.uid)
          });
          toast.success('Você entrou no bolão com sucesso!');
          return { needsPayment: false };
        }
      } else {
        toast.error('Código inválido ou bolão não encontrado.');
        throw new Error("Invalid code");
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao entrar no bolão. Verifique sua conexão ou tente mais tarde.');
      throw error;
    }
  };

  const placeBet = async (matchId: string, predA: number, predB: number) => {
    if (!user || !selectedPool) return;
    const existingBet = bets.find(b => b.matchId === matchId);
    const toastId = toast.loading('Calculando e salvando palpite...');
    try {
      if (existingBet) {
        await updateDoc(doc(db, `pools/${selectedPool.id}/bets`, existingBet.id), {
          predictionA: predA,
          predictionB: predB
        });
      } else {
        await addDoc(collection(db, `pools/${selectedPool.id}/bets`), {
          userId: user.uid,
          poolId: selectedPool.id,
          matchId,
          predictionA: predA,
          predictionB: predB,
          pointsEarned: 0
        });
      }
      toast.success('Palpite salvo no bolão com sucesso! ⚽🏆', { id: toastId });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar palpite antecipado.', { id: toastId });
    }
  };

  const shareBetToChat = async (match: any, predA: number, predB: number) => {
    if (!user || !selectedPool) return;
    try {
      const getCountryEmoji = (code?: string) => {
        if (!code) return '⚽';
        try {
          const codeUpper = code.toUpperCase();
          if (codeUpper === 'UN') return '⚽';
          return codeUpper
            .split('')
            .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
            .join('');
        } catch (e) {
          return '⚽';
        }
      };

      const flagA = getCountryEmoji(match.teamACode);
      const flagB = getCountryEmoji(match.teamBCode);
      const text = `Polêmico! Meu palpite para ${match.teamA} x ${match.teamB} é: ${predA} x ${predB}! Quem concorda? ${flagA}⚔️${flagB}`;
      
      await addDoc(collection(db, `pools/${selectedPool.id}/messages`), {
        text,
        userId: user.uid,
        userName: profile?.displayName || 'Usuário',
        userPhoto: profile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      toast.success('Palpite compartilhado no Chat da Resenha! 💬⚽');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao compartilhar palpite.');
    }
  };

  const saveEarlyPrediction = async (champion: string, vice: string) => {
    if (!user || !selectedPool) return;

    // Check if tournament has started (June 11, 2026)
    const lockDate = new Date('2026-06-11T20:00:00Z');
    if (new Date() >= lockDate) {
      toast.error('O palpite antecipado está travado pois o torneio já iniciou!');
      return;
    }

    try {
      await setDoc(doc(db, `pools/${selectedPool.id}/earlyPredictions`, user.uid), {
        userId: user.uid,
        poolId: selectedPool.id,
        champion,
        vice,
        updatedAt: serverTimestamp()
      });
      setUserEarlyPrediction({ champion, vice });
      toast.success('Predição de Campeão & Vice salva com sucesso! 🎉🌟');
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar palpite antecipado.');
    }
  };


  const updateOfficialMatch = async (matchId: string, scoreA: number, scoreB: number, status: 'live' | 'finished') => {
    const isAdmin = user?.email === 'deiorbo@gmail.com' || profile?.role === 'admin' || profile?.isAdmin;
    if (!isAdmin) return;
    
    try {
      await setDoc(doc(db, 'results', matchId), {
        scoreA,
        scoreB,
        status,
        updatedAt: serverTimestamp()
      });
      toast.success('Resultado global atualizado!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar resultado.');
    }
  };

  const storedTheme = localStorage.getItem('theme');

  if (loading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center transition-colors", storedTheme === 'black' ? 'theme-black bg-black' : 'bg-slate-50')}>
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
      </div>
    );
  }

  const currentTheme = profile?.theme || localStorage.getItem('theme') || 'light';
  
  if (currentTheme === 'black') {
    localStorage.setItem('theme', 'black');
  } else if (currentTheme === 'light') {
    localStorage.setItem('theme', 'light');
  }

  return (
    <div className={cn("min-h-screen font-sans transition-colors", currentTheme === 'black' ? 'theme-black bg-black text-slate-100' : 'bg-slate-50 text-slate-900')}>
      <Toaster position="top-center" richColors />

      <Navbar 
        user={user} 
        profile={profile}
        onLogin={handleLogin} 
        onLogout={handleLogout} 
        onEditProfile={() => setShowEditProfile(true)}
        onSync={handleSyncScores}
        isSyncing={isSyncing}
        onCheckLeagues={handleCheckLeagues}
        onCheckTeams={handleCheckTeams}
        onCheckRounds={handleCheckRounds}
        isCheckingLeagues={isCheckingLeagues}
      />

      {(user?.email === 'deiorbo@gmail.com' || profile?.role === 'admin' || profile?.isAdmin) && (coverageInfo || teamsInfo || roundsInfo) && (
        <div className="max-w-xl mx-auto px-4 mt-4 text-slate-800">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveDiagnostic('coverage')} 
                    className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded", activeDiagnostic === 'coverage' ? 'bg-blue-600 text-white' : 'text-blue-400')}
                  >
                    Cobertura
                  </button>
                  <button 
                    onClick={() => setActiveDiagnostic('teams')} 
                    className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded", activeDiagnostic === 'teams' ? 'bg-blue-600 text-white' : 'text-blue-400')}
                  >
                    Times
                  </button>
                  <button 
                    onClick={() => setActiveDiagnostic('rounds')} 
                    className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded", activeDiagnostic === 'rounds' ? 'bg-blue-600 text-white' : 'text-blue-400')}
                  >
                    Fases
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase text-blue-400">Temporada:</span>
                  <div className="flex bg-white rounded-lg p-0.5 border border-blue-100">
                    {[2022, 2026].map(s => (
                      <button
                        key={s}
                        onClick={() => setDiagnosticSeason(s)}
                        className={cn("px-2 py-0.5 rounded text-[9px] font-bold transition-all", diagnosticSeason === s ? "bg-blue-600 text-white shadow-sm" : "text-blue-400 hover:bg-blue-50")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <span className="text-[8px] text-blue-300 italic">* Use 2022 se tiver plano Free</span>
                </div>
              </div>
              <button 
                onClick={() => { setCoverageInfo(null); setTeamsInfo(null); setRoundsInfo(null); }}
                className="text-blue-400 hover:text-blue-600 font-bold"
              >
                FECHAR
              </button>
            </div>

            {activeDiagnostic === 'coverage' && coverageInfo && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(coverageInfo).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[8px] font-bold text-blue-400 uppercase">{key}</span>
                      <span className={cn("text-[10px] font-black", typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-blue-800')}>
                        {typeof value === 'object' ? 'Habilitado' : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
                {coverageInfo.fixtures && (
                   <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-2 gap-2">
                      <span className="col-span-2 text-[8px] font-bold text-blue-400 uppercase">Detalhes de Fixtures</span>
                      {Object.entries(coverageInfo.fixtures).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-[8px] font-medium text-blue-400">{key}</span>
                          <span className={cn("text-[9px] font-bold", value ? 'text-green-600' : 'text-red-600')}>
                            {String(value)}
                          </span>
                        </div>
                      ))}
                   </div>
                )}
              </>
            )}

            {activeDiagnostic === 'teams' && teamsInfo && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {teamsInfo.map((item: any) => (
                  <div key={item.team.id} className="flex items-center gap-3 bg-white/50 p-2 rounded-lg">
                    <img src={item.team.logo} alt="" className="w-6 h-6" referrerPolicy="no-referrer" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-800">{item.team.name} ({item.team.code})</p>
                      <p className="text-[8px] text-slate-500 uppercase">{item.venue?.city || 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeDiagnostic === 'rounds' && roundsInfo && (
              <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-1">
                {roundsInfo.map((round: string) => (
                  <div key={round} className="bg-white/50 p-2 rounded-lg text-[9px] font-bold text-slate-700">
                    {round}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="pb-32 pt-4">
        {user ? (
          <div className="max-w-xl mx-auto px-4 space-y-6">
            {/* Active Pool Info / Join */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0 relative">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Bolão Selecionado</p>
                <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setShowPoolSelector(!showPoolSelector)}>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tighter whitespace-nowrap">
                    {selectedPool?.name || (userPools.length > 0 ? 'Resgatando...' : 'Nenhum bolão')}
                  </h2>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform", showPoolSelector ? "rotate-180" : "")} />
                </div>
                {showPoolSelector && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl p-2 z-50">
                    {userPools.map(pool => (
                      <button
                        key={pool.id}
                        onClick={() => {
                          setSelectedPool(pool);
                          setShowPoolSelector(false);
                        }}
                        className={cn("w-full text-left p-3 rounded-xl font-bold text-xs uppercase hover:bg-slate-50", selectedPool?.id === pool.id ? "bg-brand/10 text-brand" : "text-slate-900")}
                      >
                        {pool.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowJoinPool(true)}
                className="bg-white border border-slate-200 text-slate-900 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all shrink-0"
              >
                + Entrar no Bolão
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'pools' && (
                <motion.div 
                  key="pools"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center relative overflow-hidden flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-brand" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-black uppercase tracking-tighter text-slate-900">Crie seu bolão</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Convide amigos e compita!</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowCreatePool(true)}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                    >
                      Criar
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Seus Bolões Ativos</h4>
                    {activePools.length > 0 ? (
                      activePools.map(pool => (
                        <PoolCard 
                          key={pool.id}
                          pool={pool}
                          isSelected={selectedPool?.id === pool.id}
                          onClick={() => setActivePoolDetail(pool)}
                          isOwner={pool.ownerId === user.uid}
                          onEdit={() => {
                            setEditingPool(pool);
                            setShowCreatePool(true);
                          }}
                          onDelete={() => handleDeletePool(pool.id)}
                          onManage={() => {
                            setManagingPool(pool);
                            setShowManageParticipants(true);
                          }}
                        />
                      ))
                    ) : (
                      <EmptyState 
                        title="Nenhum bolão"
                        description="Você ainda não participa de nenhum bolão. Crie um ou entre em um através de um código."
                        actionLabel="Criar novo bolão"
                        onAction={() => setShowCreatePool(true)}
                      />
                    )}
                  </div>
                </motion.div>
              )}
              {activeTab === 'finished' && (
                <motion.div 
                  key="finished"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Bolões Finalizados</h4>
                    {finishedPools.length > 0 ? (
                      finishedPools.map(pool => (
                        <PoolCard 
                          key={pool.id}
                          pool={pool}
                          onClick={() => setActivePoolDetail(pool)}
                        />
                      ))
                    ) : (
                      <EmptyState 
                        title="Nenhum bolão finalizado"
                        description="Você ainda não participou de bolões que foram encerrados."
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'matches' && selectedPool && (
                <motion.div 
                  key="matches"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <EarlyPredictionCard 
                    prediction={userEarlyPrediction}
                    onSave={saveEarlyPrediction}
                    hasStarted={new Date() >= new Date('2026-06-11T20:00:00Z')}
                    championPoints={selectedPool.scoringSystem.champion}
                    vicePoints={selectedPool.scoringSystem.vice}
                  />

                  {/* Busca Inteligente & Filtro Pendentes */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Search className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                        <input
                          type="text"
                          value={matchSearchQuery}
                          onChange={(e) => {
                            setMatchSearchQuery(e.target.value);
                            if (e.target.value.trim() !== '') setViewMode('date');
                          }}
                          placeholder="Buscar seleção... (Ex: Brasil, Argentina)"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-705 placeholder-slate-400 focus:outline-none focus:border-brand/40 focus:ring-4 focus:ring-brand/5 transition-all uppercase tracking-wider"
                        />
                        {matchSearchQuery && (
                          <button 
                            onClick={() => setMatchSearchQuery('')} 
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[9px] font-black text-slate-400 hover:text-slate-600"
                          >
                            LIMPAR
                          </button>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setShowPendingBetsOnly(!showPendingBetsOnly)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                          showPendingBetsOnly
                            ? "bg-brand/10 border-brand/40 text-brand shadow-sm shadow-brand/10"
                            : "bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-105"
                        )}
                      >
                        <Filter className="w-3 h-3" />
                        O que falta palpitar?
                        {showPendingBetsOnly && (
                          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Quick stats summarizing predictions state */}
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 p-2 rounded-xl">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
                        Total exibido: <strong className="text-slate-700">{filteredMergedMatches.length} partidas</strong>
                      </span>
                      <span>
                        Seus palpites: <strong className="text-slate-700">{bets.filter(b => b.predictionA !== undefined && b.predictionB !== undefined).length} / {WORLD_CUP_2026_MATCHES.length}</strong>
                      </span>
                    </div>

                    {leaderStats && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-brand/5 border border-brand/10 p-2.5 rounded-xl">
                        <span className="flex items-center gap-1.5">
                          <Trophy className="w-3 h-3 text-yellow-500 animate-bounce shrink-0" />
                          <span>Índice de Acertos do Líder (<span className="text-slate-900">{leaderStats.leaderName}</span>):</span>
                        </span>
                        <span className="text-right text-[8.5px] font-black text-brand tracking-wider bg-brand/10 px-1.5 py-0.5 rounded leading-none">
                          ⚡ {leaderStats.rate}% de acertos em cheio ({leaderStats.exactHits} placares exatos)
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation Tabs */}
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full mx-auto mb-6">
                    {(['group', 'round', 'date'] as const).map((mode) => (
                      <button 
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", 
                          viewMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                        )}
                      >
                        {mode === 'group' ? 'Por Grupo' : mode === 'round' ? 'Por Rodada' : 'Por Data'}
                      </button>
                    ))}
                  </div>

                  {/* Sub-tab for Grupos */}
                  {viewMode === 'group' && (
                    <div className="space-y-4 mb-6">
                      <div className="flex bg-white border border-slate-100 p-1 rounded-2xl w-full mx-auto">
                        <button 
                          onClick={() => {
                            setSelectedGroupTab('Grupos');
                            if (!selectedGroup.startsWith('Grupo')) setSelectedGroup('Grupo A');
                          }}
                          className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", selectedGroupTab === 'Grupos' ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-400")}
                        >
                          Fase de Grupos
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedGroupTab('Mata-Mata');
                            if (!['32-avos', 'Oitavas', 'Quartas', 'Semifinal', 'Terceiro Lugar', 'Final'].includes(selectedGroup)) {
                              setSelectedGroup('32-avos'); // Default mata-mata
                            }
                          }}
                          className={cn("flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", selectedGroupTab === 'Mata-Mata' ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-400")}
                        >
                          Mata-Mata
                        </button>
                      </div>

                      {selectedGroupTab === 'Grupos' && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
                          {groups.map((group) => (
                            <button
                              key={group}
                              onClick={() => setSelectedGroup(group)}
                              className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                selectedGroup === group 
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                                  : "bg-white border-slate-100 text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {group.replace('Grupo ', '')}
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedGroupTab === 'Mata-Mata' && (
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-1">
                          {['Organograma', '32-avos', 'Oitavas', 'Quartas', 'Semifinal', 'Terceiro Lugar', 'Final'].map((stage) => (
                             <button
                              key={stage}
                              onClick={() => setSelectedGroup(stage)}
                              className={cn(
                                "whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                selectedGroup === stage || (stage === 'Final' && selectedGroup === 'Final')
                                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                                  : "bg-white border-slate-100 text-slate-400 hover:text-slate-600"
                              )}
                            >
                              {stage}
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedGroupTab === 'Grupos' && selectedGroup.startsWith('Grupo') && (
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Classificação {selectedGroup}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-50">
                                  <th className="px-3 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">#</th>
                                  <th className="px-3 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                                  <th className="px-2 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">P</th>
                                  <th className="px-2 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">J</th>
                                  <th className="px-2 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">V</th>
                                  <th className="px-2 py-2 text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">SG</th>
                                  <th className="px-2 py-2 text-[7px] font-black text-slate-900 uppercase tracking-widest text-center bg-slate-50/50">Pts</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {getStandings(selectedGroup).map((team, idx) => (
                                  <tr key={team.code} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-3 py-2 text-[9px] font-black text-slate-300">{idx + 1}º</td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1.5 relative group/table-tooltip">
                                        <div className="w-4 h-3 rounded-[2px] overflow-hidden border border-slate-100 flex-shrink-0">
                                          <img 
                                            src={`https://flagcdn.com/w40/${team.code.toLowerCase()}.png`} 
                                            className="w-full h-full object-cover" 
                                            alt={team.name}
                                          />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[80px] cursor-default underline decoration-slate-200 decoration-dotted underline-offset-2">
                                          {team.name}
                                        </span>
                                        <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover/table-tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
                                          {team.name}
                                          <div className="absolute top-full left-2 border-4 border-transparent border-t-slate-900" />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2 text-[10px] font-medium text-slate-600 text-center tabular-nums">{team.p}</td>
                                    <td className="px-2 py-2 text-[10px] font-medium text-slate-600 text-center tabular-nums">{team.w}</td>
                                    <td className="px-2 py-2 text-[10px] font-medium text-slate-600 text-center tabular-nums">{team.d}</td>
                                    <td className="px-2 py-2 text-[10px] font-medium text-slate-600 text-center tabular-nums text-green-600">{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                                    <td className="px-2 py-2 text-[10px] font-black text-slate-900 text-center tabular-nums bg-slate-50/50">{team.pts}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-slate-50/50 px-3 py-1.5 flex gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">P: Partidas</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">V: Vitórias</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">SG: Saldo Gols</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab for Rodadas */}
                  {viewMode === 'round' && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none px-1">
                      {Object.keys(matchesByRound)
                        .sort((a, b) => {
                          const numA = parseInt(a.match(/\d+/)?.toString() || '0');
                          const numB = parseInt(b.match(/\d+/)?.toString() || '0');
                          if (numA && numB) return numA - numB;
                          return a.localeCompare(b);
                        })
                        .map((round) => (
                          <button
                            key={round}
                            onClick={() => setSelectedRound(round)}
                            className={cn(
                              "whitespace-nowrap px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                              selectedRound === round 
                                ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                                : "bg-white border-slate-100 text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {round}
                          </button>
                        ))}
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    {selectedGroupTab === 'Mata-Mata' && selectedGroup === 'Organograma' ? (
                      <TournamentBracket matches={mergedMatches} userBets={bets} onPlaceBet={placeBet} onShareBet={shareBetToChat} />
                    ) : (
                      Object.entries<Match[]>(
                        viewMode === 'group' ? matchesByGroup : 
                        viewMode === 'date' ? (matchesByDate as Record<string, Match[]>) : 
                        (matchesByRound as Record<string, Match[]>)
                      )
                        .filter(([key]) => {
                          if (viewMode === 'group') {
                            if (selectedGroupTab === 'Mata-Mata') {
                              if (selectedGroup === '32-avos') return key.includes('32-avos');
                              if (selectedGroup === 'Oitavas') return key.includes('Oitavas');
                              if (selectedGroup === 'Quartas') return key.includes('Quartas');
                              if (selectedGroup === 'Semifinal') return key.includes('Semifinal');
                              if (selectedGroup === 'Terceiro Lugar') return key.includes('Lugar');
                              if (selectedGroup === 'Final') return key.includes('Final');
                              return !key.startsWith('Grupo');
                            }
                            return key === selectedGroup;
                          }
                          if (viewMode === 'round') {
                            return key === selectedRound;
                          }
                          return true;
                        })
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, groupMatches]) => (
                          <div key={key} className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{key}</h3>
                            {groupMatches.map(match => (
                              <div key={match.id} className="relative group">
                                <MatchCard 
                                  match={match}
                                  bet={bets.find(b => b.matchId === match.id)}
                                  onPlaceBet={placeBet}
                                  poolBets={allPoolBets.filter(b => b.matchId === match.id)}
                                  onViewAllBets={() => {
                                    setActiveMatchForBets(match);
                                    setShowViewBets(true);
                                  }}
                                  onShareBet={shareBetToChat}
                                />
                                {(user?.email === 'deiorbo@gmail.com' || profile?.role === 'admin' || profile?.isAdmin) && (
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                                    <button 
                                      onClick={() => {
                                      const sA = prompt(`Gols ${match.teamA}:`, match.scoreA?.toString() || "0");
                                      const sB = prompt(`Gols ${match.teamB}:`, match.scoreB?.toString() || "0");
                                      if (sA !== null && sB !== null) {
                                        updateOfficialMatch(match.id, parseInt(sA), parseInt(sB), 'live');
                                      }
                                    }}
                                    className="bg-red-500 text-white text-[9px] px-2 py-1 rounded font-bold hover:bg-red-600 uppercase"
                                  >
                                    Live
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const sA = prompt(`Gols ${match.teamA}:`, match.scoreA?.toString() || "0");
                                      const sB = prompt(`Gols ${match.teamB}:`, match.scoreB?.toString() || "0");
                                      if (sA !== null && sB !== null) {
                                        updateOfficialMatch(match.id, parseInt(sA), parseInt(sB), 'finished');
                                      }
                                    }}
                                    className="bg-slate-900 text-white text-[9px] px-2 py-1 rounded font-bold hover:bg-slate-800 uppercase"
                                  >
                                    Fim
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'ranking' && selectedPool && (
                <motion.div 
                  key="ranking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {prizeCalculations && prizeCalculations.totalCollected > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-brand/10 transition-colors" />
                        <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1 relative">Total Arrecadado</p>
                        <p className="text-sm font-black text-white relative">R$ {prizeCalculations.totalCollected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-brand border border-brand/20 p-4 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-white/10 transition-colors" />
                        <p className="text-[7px] font-black text-white/50 uppercase tracking-widest mb-1 relative">Premiação Estimada</p>
                        <p className="text-sm font-black text-white relative">R$ {prizeCalculations.totalPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden mb-8">
                    <div className="bg-slate-950 px-4 py-3 text-white flex justify-between items-center relative overflow-hidden border-b border-slate-900">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <div className="relative flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider">Ranking</h3>
                          <p className="text-slate-500 text-[7px] uppercase tracking-[0.1em] font-black">Classificação Real</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end relative">
                        <span className="text-[6.5px] font-bold text-brand uppercase tracking-widest leading-none mb-0.5">Inscritos</span>
                        <span className="text-sm font-black leading-none">{ranking.length}</span>
                      </div>
                    </div>
                    <div className="px-4 py-1.5 bg-brand/5 border-b border-brand/10">
                      <p className="text-[7.5px] text-brand/80 font-bold uppercase tracking-widest">💰 Pagamento confirmado = Ranking</p>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                      {ranking.map((player, index) => {
                        const dist = (selectedPool.prizeDistribution || []).find(d => d.position === index + 1);
                        const potentialPrize = dist 
                          ? (selectedPool.prizeType === 'fixed' 
                              ? dist.value 
                              : (dist.value / 100) * (prizeCalculations?.totalCollected || 0))
                          : 0;

                        const isPodium = index < 3;
                        const podiumColors = [
                          'text-yellow-500 bg-yellow-50 border-yellow-200', // Gold
                          'text-slate-500 bg-slate-50 border-slate-200',    // Silver
                          'text-amber-700 bg-amber-50 border-amber-200'     // Bronze
                        ];

                        return (
                          <div key={player.userId} className={cn(
                            "flex items-center justify-between px-4 py-2 transition-colors",
                            player.userId === user?.uid ? "bg-brand/5" : "hover:bg-slate-50/60"
                          )}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn(
                                "w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-lg border leading-none shrink-0",
                                isPodium 
                                  ? podiumColors[index]
                                  : "text-slate-400 bg-slate-50/50 border-slate-100"
                              )}>
                                {index + 1}
                              </span>
                              <img 
                                src={player.photoURL || `https://ui-avatars.com/api/?name=${player.name}&background=random`} 
                                className="w-7 h-7 rounded-full border border-slate-100 shadow-sm shrink-0 object-cover" 
                                alt="" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-[11px] text-slate-900 uppercase tracking-tight truncate max-w-[130px] leading-tight font-sans">
                                  {player.name}
                                </p>
                                {player.userId === user?.uid && (
                                  <span className="inline-block text-[6.5px] font-black text-brand uppercase tracking-wider bg-brand/10 px-1 rounded">Você</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-2.5 shrink-0">
                              {potentialPrize > 0 && (
                                <span className="text-[7.5px] font-black text-brand bg-brand/10 px-1.5 py-0.5 rounded leading-none shrink-0">
                                  R$ {potentialPrize.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              <div className="flex flex-col items-end min-w-[30px]">
                                <span className="text-xs font-black text-slate-900 tracking-tight leading-none">{player.points}</span>
                                <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-none">Pts</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'rules' && (
                <motion.div 
                  key="rules"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-5 text-slate-900">Como Pontuar</h3>
                    <div className="space-y-2">
                      {RULES.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand/30 transition-colors group">
                          <div className={cn(
                            "w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-slate-900 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform text-xs",
                            rule.points >= 50 ? "text-brand" : "text-slate-900"
                          )}>
                            {rule.points}
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-900">{rule.label}</p>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{rule.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-5 text-slate-900 uppercase">Critérios de Desempate</h3>
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Em caso de empate na pontuação geral, os critérios de desempate serão aplicados na seguinte ordem:
                      </p>
                      <div className="space-y-1.5 pt-2">
                        {[
                          "1º - Maior número de acertos de placar exato (25 pts)",
                          "2º - Maior número de acertos de Vencedor + Gols do Vencedor (18 pts)",
                          "3º - Maior número de acertos de Vencedor + Diferença de Gols (15 pts)",
                          "4º - Maior número de acertos de Vencedor + Gols do Perdedor (12 pts)",
                          "5º - Maior número de acertos depenas Vencedor (10 pts)",
                          "6º - Ordem de inscrição no bolão (mais antigo)"
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-brand mt-1.5 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <h3 className="text-lg font-black uppercase tracking-tighter mb-5 text-slate-900 uppercase">Observações</h3>
                    <div className="space-y-3">
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        • Palpites "blindados": Os palpites só serão revelados após o início da respectiva partida.
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        • Palpites para Campeão e Vice devem ser feitos antes do início do primeiro jogo da Copa.
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        • O app é de uso exclusivo para o Bolão da Copa 2026. Respeite as regras de convívio e boa sorte!
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'chat' && selectedPool && user && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <PoolChat pool={selectedPool} currentUser={profile!} ranking={ranking} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="relative mb-12">
              <div className="absolute -inset-4 bg-brand/20 blur-[60px] rounded-full animate-pulse" />
              <div className="relative w-24 h-24 bg-brand rounded-3xl flex items-center justify-center shadow-2xl rotate-12">
                <Trophy className="w-12 h-12 text-white -rotate-12" />
              </div>
            </div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-4 leading-none">
              O BOLÃO<br/><span className="text-brand">DEFINITIVO</span>
            </h1>
            <p className="text-slate-500 mb-12 max-w-[260px] font-medium leading-relaxed">Acompanhe os jogos da Copa 2026, dê seus palpites e dispute em tempo real.</p>
            <button 
              onClick={handleLogin}
              className="w-full max-w-xs bg-slate-900 text-white flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-2xl"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale invert" alt="" />
              Entrar com Google
            </button>
            <p className="mt-10 text-[10px] text-slate-300 uppercase font-black tracking-[0.4em]">v2.0 Beta • 2026</p>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 px-2 py-3 pb-6 bg-white/95 backdrop-blur-xl border-t border-slate-100 flex justify-around items-center z-[60] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setActiveTab('pools')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'pools' ? "text-brand scale-105" : "text-slate-400")}
          >
            <Users className={cn("w-5 h-5", activeTab === 'pools' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Início</span>
          </button>

          <button 
            onClick={() => setActiveTab('finished')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'finished' ? "text-brand scale-105" : "text-slate-400")}
          >
            <Trophy className={cn("w-5 h-5", activeTab === 'finished' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Finalizados</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('matches')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'matches' ? "text-brand scale-105" : "text-slate-400")}
          >
            <Calendar className={cn("w-5 h-5", activeTab === 'matches' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Jogos</span>
          </button>

          <button 
            onClick={() => setActiveTab('ranking')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'ranking' ? "text-brand scale-105" : "text-slate-400")}
          >
            <Trophy className={cn("w-5 h-5", activeTab === 'ranking' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Rank</span>
          </button>

          <button 
            onClick={() => setActiveTab('chat')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'chat' ? "text-brand scale-105" : "text-slate-400")}
          >
            <MessageCircle className={cn("w-5 h-5", activeTab === 'chat' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Chat</span>
          </button>

          <button 
            onClick={() => setActiveTab('rules')}
            className={cn("flex flex-col items-center gap-0.5 transition-all", activeTab === 'rules' ? "text-brand scale-105" : "text-slate-400")}
          >
            <Info className={cn("w-5 h-5", activeTab === 'rules' ? "fill-brand/10" : "")} />
            <span className="text-[7px] font-black uppercase tracking-widest">Regras</span>
          </button>
        </div>
      )}

      <PoolDetailModal 
        isOpen={!!activePoolDetail}
        onClose={() => setActivePoolDetail(null)}
        pool={activePoolDetail}
        isOwner={activePoolDetail?.ownerId === user?.uid}
        ranking={ranking}
        onDelete={() => activePoolDetail && handleDeletePool(activePoolDetail.id)}
      />
      <EditProfileModal 
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        profile={profile}
        onUpdate={(newProfile) => setProfile(newProfile)}
      />

      <CreatePoolModal 
        isOpen={showCreatePool}
        onClose={() => {
          setShowCreatePool(false);
          setEditingPool(null);
        }}
        onSubmit={handleCreatePool}
        poolToEdit={editingPool}
      />

      <JoinPoolModal 
        isOpen={showJoinPool}
        onClose={() => setShowJoinPool(false)}
        onJoin={handleJoinPool}
      />

      {managingPool && (
        <ManageParticipantsModal 
          isOpen={showManageParticipants}
          onClose={() => {
            setShowManageParticipants(false);
            setManagingPool(null);
          }}
          pool={managingPool}
        />
      )}

      {activeMatchForBets && selectedPool && (
        <ViewBetsModal 
          isOpen={showViewBets}
          onClose={() => {
            setShowViewBets(false);
            setActiveMatchForBets(null);
          }}
          match={activeMatchForBets}
          poolId={selectedPool.id}
        />
      )}
    </div>
  );
}
