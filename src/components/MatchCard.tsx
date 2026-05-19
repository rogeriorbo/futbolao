import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Trophy, CheckCircle2, Users, ChevronDown, MapPin } from 'lucide-react';
import { Match, Bet } from '../types';
import { cn } from '../lib/utils';

import { TEAMS } from '../data/teams';

interface MatchCardProps {
  match: Match;
  bet?: Bet;
  poolBets?: Bet[];
  onPlaceBet: (matchId: string, predA: number, predB: number) => void;
  onViewAllBets?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, bet, poolBets = [], onPlaceBet, onViewAllBets }) => {
  const [predA, setPredA] = useState<string>(bet ? (bet.predictionA !== undefined ? bet.predictionA.toString() : '') : '');
  const [predB, setPredB] = useState<string>(bet ? (bet.predictionB !== undefined ? bet.predictionB.toString() : '') : '');
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const hasOfficialScore = match.scoreA !== undefined && match.scoreB !== undefined;

  // Calculate Stats
  const totalBets = poolBets.length;
  const stats = useMemo(() => {
    const counts = { a: 0, d: 0, b: 0 };
    if (totalBets === 0) return { ...counts, pA: 0, pD: 0, pB: 0 };
    
    poolBets.forEach(b => {
      if (b.predictionA > b.predictionB) counts.a++;
      else if (b.predictionA < b.predictionB) counts.b++;
      else counts.d++;
    });

    return {
      ...counts,
      pA: Math.round((counts.a / totalBets) * 100),
      pD: Math.round((counts.d / totalBets) * 100),
      pB: Math.round((counts.b / totalBets) * 100)
    };
  }, [poolBets, totalBets]);

  useEffect(() => {
    if (bet) {
      setPredA(bet.predictionA !== undefined ? bet.predictionA.toString() : '');
      setPredB(bet.predictionB !== undefined ? bet.predictionB.toString() : '');
    }
  }, [bet]);

  const handleBlur = () => {
    if (isFinished) return;
    let a = parseInt(predA);
    let b = parseInt(predB);
    if (!isNaN(a) && !isNaN(b)) {
      a = Math.max(0, a);
      b = Math.max(0, b);
      if (a !== bet?.predictionA || b !== bet?.predictionB) {
        onPlaceBet(match.id, a, b);
      }
      if (a.toString() !== predA) setPredA(a.toString());
      if (b.toString() !== predB) setPredB(b.toString());
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border border-slate-100 p-1 flex flex-col transition-all hover:shadow-md shadow-slate-200/20 group",
      isFinished ? "bg-slate-50/50" : ""
    )}>
      {/* Header: Date & Status & Stadium */}
      <div className="flex flex-col gap-0 mb-0">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-black text-black uppercase tracking-widest leading-none">
            {format(new Date(match.date), "dd/MM • HH:mm", { locale: ptBR })}
          </span>
          {isLive && (
            <span className="flex items-center gap-1 px-1 py-0 bg-red-50 text-red-600 rounded text-[7px] font-black uppercase tracking-widest animate-pulse">
              AO VIVO
            </span>
          )}
        </div>
        {(match.stadium || match.location) && (
          <div className="flex items-center gap-1">
            <MapPin className="w-1.5 h-1.5 text-slate-500" />
            <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter truncate leading-none">
              {match.stadium} {match.location && `• ${match.location}`}
            </span>
          </div>
        )}
      </div>

      {/* Match Container */}
      <div className="flex flex-row items-center justify-between gap-0 sm:gap-2 mt-1">
        {/* Team A */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-end gap-1.5 sm:gap-3 min-w-0">
          <div className="relative group/name flex flex-col items-center sm:items-end min-w-0 order-2 sm:order-1">
            <span className="font-black text-[8px] sm:text-[10px] text-black uppercase truncate cursor-default underline decoration-slate-200 decoration-dotted underline-offset-2 text-center sm:text-right sm:max-w-none max-w-[50px]">
              {match.teamAShort || match.teamA}
            </span>
            <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover/name:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
              {(TEAMS as any)[match.teamA]?.name || match.teamA}
              <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-2 sm:translate-x-0 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-50 rounded-full sm:rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm order-1 sm:order-2">
            {match.teamACode && match.teamACode !== 'un' ? (
              <img src={`https://flagcdn.com/w80/${match.teamACode}.png`} className="w-full h-full object-cover" alt="" />
            ) : (
              <Trophy className="w-5 h-5 text-slate-300" />
            )}
          </div>
        </div>

        {/* Score & Inputs */}
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 shrink-0 px-0 sm:px-0">
          <input 
            type="number"
            min="0"
            value={predA}
            onChange={(e) => setPredA(e.target.value.replace(/\D/g, ''))}
            onBlur={handleBlur}
            disabled={isFinished || isLive}
            className={cn(
              "w-6 h-6 sm:w-8 sm:h-8 text-center text-[10px] sm:text-sm font-black bg-slate-50 border border-slate-100 rounded-lg focus:border-brand outline-none transition-all focus:ring-4 focus:ring-brand/10",
              isFinished || isLive ? "bg-slate-100/50 text-slate-500 border-transparent shadow-inner" : "text-black shadow-sm"
            )}
          />
          <span className="text-black font-black text-[8px] sm:text-[10px]">X</span>
          <input 
            type="number"
            min="0"
            value={predB}
            onChange={(e) => setPredB(e.target.value.replace(/\D/g, ''))}
            onBlur={handleBlur}
            disabled={isFinished || isLive}
            className={cn(
              "w-6 h-6 sm:w-8 sm:h-8 text-center text-[10px] sm:text-sm font-black bg-slate-50 border border-slate-100 rounded-lg focus:border-brand outline-none transition-all focus:ring-4 focus:ring-brand/10",
              isFinished || isLive ? "bg-slate-100/50 text-slate-500 border-transparent shadow-inner" : "text-black shadow-sm"
            )}
          />
        </div>

        {/* Team B */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-start gap-1.5 sm:gap-3 min-w-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-50 rounded-full sm:rounded-lg flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm">
            {match.teamBCode && match.teamBCode !== 'un' ? (
              <img src={`https://flagcdn.com/w80/${match.teamBCode}.png`} className="w-full h-full object-cover" alt="" />
            ) : (
              <Trophy className="w-5 h-5 text-slate-300" />
            )}
          </div>
          <div className="relative group/name flex flex-col items-center sm:items-start min-w-0">
            <span className="font-black text-[8px] sm:text-[10px] text-black uppercase truncate cursor-default underline decoration-slate-200 decoration-dotted underline-offset-2 text-center sm:text-left sm:max-w-none max-w-[50px]">
              {match.teamBShort || match.teamB}
            </span>
            <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-bold rounded opacity-0 group-hover/name:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
              {(TEAMS as any)[match.teamB]?.name || match.teamB}
              <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-2 sm:translate-x-0 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Prediction Stats Bar */}
      {totalBets > 0 && (
        <div className="mt-1 pt-1 border-t border-slate-50">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Users className="w-2 h-2 text-slate-500" />
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{totalBets} Palpites</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-black text-slate-500 uppercase leading-none">A</span>
                <span className={cn("text-[8px] font-black tracking-tighter tabular-nums", stats.a >= Math.max(stats.d, stats.b) && stats.a > 0 ? "text-brand" : "text-black")}>
                  {stats.a}
                </span>
              </div>
              <div className="w-[1px] h-2 bg-slate-100" />
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-black text-slate-500 uppercase leading-none">X</span>
                <span className={cn("text-[8px] font-black tracking-tighter tabular-nums", stats.d >= Math.max(stats.a, stats.b) && stats.d > 0 ? "text-black" : "text-black")}>
                  {stats.d}
                </span>
              </div>
              <div className="w-[1px] h-2 bg-slate-100" />
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-black text-slate-500 uppercase leading-none">B</span>
                <span className={cn("text-[8px] font-black tracking-tighter tabular-nums", stats.b >= Math.max(stats.a, stats.d) && stats.b > 0 ? "text-brand" : "text-black")}>
                  {stats.b}
                </span>
              </div>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-100/50 rounded-full flex overflow-hidden border border-slate-50">
            <div 
              style={{ width: `${stats.pA}%` }} 
              className={cn("h-full transition-all duration-500", stats.a >= Math.max(stats.d, stats.b) && stats.a > 0 ? "bg-yellow-400" : "bg-slate-200")} 
            />
            <div 
              style={{ width: `${stats.pD}%` }} 
              className={cn("h-full transition-all duration-500", stats.d >= Math.max(stats.a, stats.b) && stats.d > 0 ? "bg-slate-400" : "bg-slate-100")} 
            />
            <div 
              style={{ width: `${stats.pB}%` }} 
              className={cn("h-full transition-all duration-500", stats.b >= Math.max(stats.a, stats.d) && stats.b > 0 ? "bg-yellow-400" : "bg-slate-200")} 
            />
          </div>
          <div className="flex justify-between mt-0.5 px-0.5">
            <div className="flex flex-col items-start">
              <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[30px] leading-tight">{match.teamAShort || match.teamA}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter leading-tight">E</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[30px] text-right leading-tight">{match.teamBShort || match.teamB}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Optional Official Score */}
      {(hasOfficialScore || isLive) && (
        <div className={cn(
          "mt-2 text-center py-0.5 rounded font-black text-[10px]",
          isLive ? "bg-red-50 text-red-600" : "bg-slate-900 text-white"
        )}>
           {match.scoreA} - {match.scoreB}
        </div>
      )}
    </div>
  );
};
