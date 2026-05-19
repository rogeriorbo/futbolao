import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Loader2, Trophy, Clock, Lock, MessageCircle } from 'lucide-react';
import { Match, Bet, UserProfile, Pool } from '../types';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { TEAMS } from '../data/teams';

interface ViewBetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  poolId: string;
}

interface BetWithUser extends Bet {
  user?: UserProfile;
}

export const ViewBetsModal: React.FC<ViewBetsModalProps> = ({ isOpen, onClose, match, poolId }) => {
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<BetWithUser[]>([]);
  const [pool, setPool] = useState<Pool | null>(null);

  const isMatchStarted = new Date() > new Date(match.date);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchBets = async () => {
      if (!isOpen) return;
      setLoading(true);
      try {
        // Fetch Pool Info
        const poolDoc = await getDoc(doc(db, 'pools', poolId));
        if (poolDoc.exists()) {
          setPool(poolDoc.data() as Pool);
        }

        const betsRef = collection(db, `pools/${poolId}/bets`);
        const q = query(betsRef, where('matchId', '==', match.id));
        const snapshot = await getDocs(q);
        
        const betsData = await Promise.all(snapshot.docs.map(async (d) => {
          const betData = d.data() as Bet;
          const userDoc = await getDoc(doc(db, 'users', betData.userId));
          return { ...betData, user: userDoc.exists() ? userDoc.data() as UserProfile : undefined };
        }));

        setBets(betsData.sort((a, b) => (b.pointsEarned || 0) - (a.pointsEarned || 0)));
      } catch (error) {
        console.error('Error fetching bets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBets();
  }, [isOpen, match.id, poolId]);

  const sendWhatsAppReminder = (userName: string) => {
    const teamAName = (TEAMS as any)[match.teamA]?.name || match.teamA;
    const teamBName = (TEAMS as any)[match.teamB]?.name || match.teamB;
    const text = `Ei ${userName}! Já deu seu palpite para ${teamAName} x ${teamBName}? Corre lá no FutBolão! ⚽🏆`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="flex -space-x-2">
                {match.teamACode && <img src={`https://flagcdn.com/w160/${match.teamACode}.png`} className="w-6 h-6 rounded-full border-2 border-slate-900" />}
                {match.teamBCode && <img src={`https://flagcdn.com/w160/${match.teamBCode}.png`} className="w-6 h-6 rounded-full border-2 border-slate-900" />}
             </div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center">
                  <div className="relative group/tipA flex flex-col items-center">
                    <span className="cursor-default underline decoration-transparent hover:decoration-slate-500 decoration-dotted underline-offset-2 transition-all leading-tight">
                      {match.teamAShort || match.teamA}
                    </span>
                    <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded opacity-0 group-hover/tipA:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-200">
                      {(TEAMS as any)[match.teamA]?.name || match.teamA}
                      <div className="absolute top-full left-2 border-4 border-transparent border-t-white" />
                    </div>
                  </div>
                  
                  <span className="mx-1.5 opacity-30 font-thin italic">x</span>
                  
                  <div className="relative group/tipB flex flex-col items-center">
                    <span className="cursor-default underline decoration-transparent hover:decoration-slate-500 decoration-dotted underline-offset-2 transition-all leading-tight">
                      {match.teamBShort || match.teamB}
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-white text-slate-900 text-[10px] font-bold rounded opacity-0 group-hover/tipB:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-slate-200">
                      {(TEAMS as any)[match.teamB]?.name || match.teamB}
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-white" />
                    </div>
                  </div>
                </h3>
               <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Comparativo de Palpites</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-4" />
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Consultando placares...</p>
            </div>
          ) : bets.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p className="font-bold text-sm">Ninguém palpitou ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bets.map((bet) => {
                const isShielded = pool?.advancedSettings?.shieldedBets && !isMatchStarted && bet.userId !== currentUser?.uid;
                
                return (
                  <div key={bet.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <img 
                        src={bet.user?.photoURL || `https://ui-avatars.com/api/?name=${bet.user?.displayName || '?'}`} 
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-900">{bet.user?.displayName || 'Usuário'}</p>
                          <button 
                            onClick={() => sendWhatsAppReminder(bet.user?.displayName || 'Amigo')}
                            className="p-1 text-slate-300 hover:text-green-500 transition-colors"
                            title="Enviar lembrete via WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                        {bet.pointsEarned !== undefined && (
                          <p className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase w-fit">+{bet.pointsEarned} pontos</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                       {isShielded ? (
                         <div className="flex items-center gap-2 bg-slate-200/50 px-4 py-2 rounded-xl border border-slate-100 border-dashed">
                           <Lock className="w-3 h-3 text-slate-400" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Blindado</span>
                         </div>
                       ) : (
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-lg font-black text-slate-900">{bet.predictionA}</span>
                          <span className="text-slate-200 font-bold text-xs">x</span>
                          <span className="text-lg font-black text-slate-900">{bet.predictionB}</span>
                        </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
