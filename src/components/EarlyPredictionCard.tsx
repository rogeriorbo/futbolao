import React, { useState } from 'react';
import { TEAMS } from '../data/teams';
import { Trophy, ChevronDown, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface EarlyPredictionCardProps {
  prediction: { champion: string, vice: string } | null;
  onSave: (champion: string, vice: string) => void;
  hasStarted: boolean;
  championPoints: number;
  vicePoints: number;
}

export function EarlyPredictionCard({ prediction, onSave, hasStarted, championPoints, vicePoints }: EarlyPredictionCardProps) {
  const [champion, setChampion] = useState(prediction?.champion || '');
  const [vice, setVice] = useState(prediction?.vice || '');
  const [isExpanded, setIsExpanded] = useState(!prediction && !hasStarted);
  const [showTooltip, setShowTooltip] = useState(false);

  React.useEffect(() => {
    if (prediction) {
      setChampion(prediction.champion);
      setVice(prediction.vice);
    }
  }, [prediction]);

  const teamList = Object.entries(TEAMS).map(([id, data]) => ({ id, ...data })).sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = () => {
    if (champion && vice && champion !== vice) {
      onSave(champion, vice);
    }
  };

  const handleCancel = () => {
    if (prediction) {
      setChampion(prediction.champion);
      setVice(prediction.vice);
    } else {
      setChampion('');
      setVice('');
    }
    setIsExpanded(false);
  };

  const championTeam = champion ? TEAMS[champion as keyof typeof TEAMS] : null;
  const viceTeam = vice ? TEAMS[vice as keyof typeof TEAMS] : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm mb-6 relative">
      <div 
        className="px-4 py-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-1">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Palpite Antecipado</p>
              <button 
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(!showTooltip);
                }}
                className="text-slate-300 hover:text-brand transition-colors p-1 relative"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                
                {showTooltip && (
                  <div className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-1 duration-200 pointer-events-none">
                    <p className="text-[9px] font-black uppercase tracking-widest text-brand mb-1">Regra de Pontuação</p>
                    <p className="text-[10px] font-medium leading-relaxed bg-slate-800/50 p-2 rounded-lg text-left">
                      Escolha o Campeão e o Vice antes do torneio começar. 
                      <span className="block mt-1 font-black text-brand">
                        Acerto Campeão: {championPoints} pts<br/>
                        Acerto Vice: {vicePoints} pts
                      </span>
                    </p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                  </div>
                )}
              </button>
            </div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tighter">Campeão & Vice</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prediction && !isExpanded && !hasStarted && (
            <button 
              onClick={() => setIsExpanded(true)}
              className="text-[8px] font-black text-brand uppercase tracking-widest border border-brand/20 px-2 py-1 rounded-lg hover:bg-brand/5 transition-colors"
            >
              Editar
            </button>
          )}
          {hasStarted && <Lock className="w-3.5 h-3.5 text-slate-400" />}
          {!prediction && !hasStarted && (
             <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded ? "rotate-180" : "")} onClick={() => setIsExpanded(!isExpanded)} />
          )}
        </div>
      </div>

      {isExpanded && !hasStarted && (
        <div className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Campeão</label>
              <select 
                value={champion}
                onChange={(e) => setChampion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
              >
                <option value="">Selecione...</option>
                {teamList.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === vice}>{team.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Vice</label>
              <select 
                value={vice}
                onChange={(e) => setVice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
              >
                <option value="">Selecione...</option>
                {teamList.map(team => (
                  <option key={team.id} value={team.id} disabled={team.id === champion}>{team.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCancel}
              className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                handleSave();
                setIsExpanded(false);
              }}
              disabled={!champion || !vice || (champion === prediction?.champion && vice === prediction?.vice)}
              className="flex-[2] bg-slate-900 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              Confirmar Palpite
            </button>
          </div>
        </div>
      )}

      {(!isExpanded || hasStarted) && prediction && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center justify-between">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">1º</span>
            <div className="flex items-center gap-1.5 flex-1 justify-center px-2">
              <img 
                src={`https://flagcdn.com/w40/${TEAMS[prediction.champion as keyof typeof TEAMS]?.code}.png`} 
                className="w-4 h-auto rounded-[1px] border border-slate-100"
                alt=""
              />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">
                {TEAMS[prediction.champion as keyof typeof TEAMS]?.name}
              </p>
            </div>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-2 border border-slate-100 flex items-center justify-between">
            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">2º</span>
            <div className="flex items-center gap-1.5 flex-1 justify-center px-2">
              <img 
                src={`https://flagcdn.com/w40/${TEAMS[prediction.vice as keyof typeof TEAMS]?.code}.png`} 
                className="w-4 h-auto rounded-[1px] border border-slate-100"
                alt=""
              />
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">
                {TEAMS[prediction.vice as keyof typeof TEAMS]?.name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
