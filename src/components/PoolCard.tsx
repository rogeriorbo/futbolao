import React from 'react';
import { Users, Copy, Check, Settings, Trophy, Share2 } from 'lucide-react';
import { Pool, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface PoolCardProps {
  pool: Pool;
  isSelected: boolean;
  onClick: () => void;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onManage?: () => void;
}

export const PoolCard: React.FC<PoolCardProps> = ({ pool, isSelected, onClick, isOwner, onEdit, onDelete, onManage }) => {
  const [copied, setCopied] = React.useState(false);
  const [participantProfiles, setParticipantProfiles] = React.useState<UserProfile[]>([]);

  const pendingCount = pool.pendingParticipants?.length || 0;

  React.useEffect(() => {
    let active = true;
    const fetchParticipants = async () => {
      try {
        const profiles = await Promise.all(
          pool.participants.map(async (uid) => {
            const uDoc = await getDoc(doc(db, 'users', uid));
            if (uDoc.exists()) {
              return { uid, ...uDoc.data() } as UserProfile;
            }
            return null;
          })
        );
        if (active) {
          setParticipantProfiles(profiles.filter((p): p is UserProfile => p !== null));
        }
      } catch (error) {
        console.error("Error fetching participants for card:", error);
      }
    };

    if (pool.participants && pool.participants.length > 0) {
      fetchParticipants();
    }
    return () => {
      active = false;
    };
  }, [pool.participants]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pool.code);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-3.5 rounded-[1.8rem] cursor-pointer transition-all border relative overflow-hidden mb-2.5 text-left",
        isSelected 
          ? 'bg-white border-yellow-400 shadow-md ring-1 ring-yellow-400' 
          : 'bg-white/80 backdrop-blur-md border-slate-100 hover:border-slate-200'
      )}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-start gap-2.5 overflow-hidden min-w-0 flex-1">
          <div className="w-9 h-9 bg-slate-900 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm border border-slate-800 mt-0.5">
             <Trophy className="w-4.5 h-4.5 text-yellow-400" />
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <h4 className="text-xs font-black text-slate-900 leading-tight truncate uppercase tracking-tight">{pool.name}</h4>
            <div className="mt-1 flex flex-col gap-1">
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] flex items-center gap-1">
                <Users className="w-2 h-2 text-slate-400" /> {pool.participants.length}{pool.limit ? ` / ${pool.limit}` : ''} JOGADORES
              </div>
              {participantProfiles.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-0.5 max-h-[40px] overflow-y-auto no-scrollbar">
                  {participantProfiles.map((p) => (
                    <div key={p.uid} className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-1 py-0.5 rounded-full shrink-0 shadow-sm">
                      <img 
                        src={p.photoURL || `https://ui-avatars.com/api/?name=${p.displayName || '?'}`} 
                        alt={p.displayName} 
                        className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[7.5px] font-bold text-slate-600 truncate max-w-[50px] leading-none">
                        {p.displayName ? p.displayName.split(' ')[0] : 'Usuário'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); onManage?.(); }}
                className="p-1.5 rounded-xl bg-orange-50 text-orange-600 relative border border-orange-100 disabled:opacity-50"
                title="Gerenciar Participantes"
              >
                <Users className="w-3.5 h-3.5" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>
            </>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 group/copy" onClick={handleCopy}>
            <code className="text-[10px] font-black text-slate-500 tracking-tighter">{pool.code}</code>
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-slate-300 group-hover/copy:text-slate-500" />}
          </div>
          <button 
              onClick={(e) => {
                  e.stopPropagation();
                  const text = `Participe do meu bolão '${pool.name}' no App de Bolões! Acesse: http://futbolao.deioinfo.com.br e use o código de acesso: ${pool.code}.`;
                  if (navigator.share) {
                      navigator.share({ title: 'Bolão', text });
                  } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                  }
              }}
              className="p-1.5 rounded-xl bg-slate-50 text-slate-400 hover:text-brand transition-colors"
          >
             <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
