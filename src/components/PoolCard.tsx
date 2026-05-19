import React from 'react';
import { Users, Copy, Check, Settings, Trophy, Share2 } from 'lucide-react';
import { Pool } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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

  const pendingCount = pool.pendingParticipants?.length || 0;

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
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 bg-slate-900 rounded-[1rem] flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
             <Trophy className="w-4.5 h-4.5 text-yellow-400" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-black text-slate-900 leading-tight truncate uppercase tracking-tight">{pool.name}</h4>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5 flex items-center gap-1">
              <Users className="w-2 h-2" /> {pool.participants.length} JOGADORES
            </p>
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
                  const text = `Participe do meu bolão '${pool.name}' no App de Bolões! Use o código: ${pool.code}`;
                  if (navigator.share) {
                      navigator.share({ title: 'Bolão', text, url: window.location.href });
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
