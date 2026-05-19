import React from 'react';
import { Match, Bet } from '../types';
import { MatchCard } from './MatchCard';

interface TournamentBracketProps {
  matches: Match[];
  userBets: Bet[];
  onPlaceBet: (matchId: string, predA: number, predB: number) => void;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ matches, userBets, onPlaceBet }) => {
  // It's going to be a large horizontal scrolling container with 16-8-4-2-1 structure.
  
  const [zoom, setZoom] = React.useState(1);
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setZoom(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const [lastPinchDist, setLastPinchDist] = React.useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );
      setLastPinchDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist) {
      const dist = Math.sqrt(
        Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2) +
        Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2)
      );
      const diff = dist - lastPinchDist;
      if (Math.abs(diff) > 5) {
        if (diff > 0) zoomIn();
        else zoomOut();
        setLastPinchDist(dist);
      }
    }
  };

  const handleTouchEnd = () => {
    setLastPinchDist(null);
  };

  const getMatchesByStage = (stage: string) => {
    return matches.filter(m => m.stage === stage).sort((a, b) => {
      // Helper to extract match id number correctly to sort them chronologically or by bracket logical order
      const extractIdParams = (id: string) => parseInt(id.replace('m', ''), 10);
      return extractIdParams(a.id) - extractIdParams(b.id);
    });
  };

  const matches32 = getMatchesByStage('32-avos'); // 16 matches
  const matches16 = getMatchesByStage('Oitavas'); // 8 matches
  const matches8 = getMatchesByStage('Quartas'); // 4 matches
  const matches4 = getMatchesByStage('Semifinal'); // 2 matches
  const matches2 = getMatchesByStage('Final'); // 1 match
  
  return (
    <div className="relative w-full h-full overflow-hidden" onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="absolute top-2 right-2 z-50 flex gap-2 bg-slate-50/80 p-2 rounded-lg border border-slate-200 backdrop-blur-sm">
        <button className="px-3 py-1 text-lg font-bold bg-white text-brand rounded shadow" onClick={zoomOut}>-</button>
        <button className="px-3 py-1 text-lg font-bold bg-white text-brand rounded shadow" onClick={zoomIn}>+</button>
        <button className="px-3 py-1 text-xs text-slate-500 font-medium bg-white rounded shadow" onClick={resetZoom}>Reset</button>
      </div>
      <div className="overflow-x-auto pb-6 relative w-full h-full custom-scrollbar pt-2 px-2">
        <div 
          className="flex w-max min-w-full gap-8 relative pb-10 mt-4 overflow-visible transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        >
        {/* We can build a simple bracket visual */}
        
        {/* R32 */}
        <div className="flex flex-col gap-4 w-72">
          <div className="bg-slate-50 py-2 rounded-xl mb-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 text-center">32-Avos</h4>
          </div>
          {matches32.map(match => (
            <div key={match.id} className="relative z-10 shrink-0">
               <MatchCard match={match} bet={userBets.find(b => b.matchId === match.id)} onPlaceBet={onPlaceBet} />
            </div>
          ))}
        </div>

        {/* R16 */}
        <div className="flex flex-col gap-12 w-72 justify-center">
          <div className="bg-slate-50 py-2 rounded-xl mb-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 text-center">Oitavas</h4>
          </div>
          {matches16.map(match => (
            <div key={match.id} className="relative z-10 shrink-0">
               <MatchCard match={match} bet={userBets.find(b => b.matchId === match.id)} onPlaceBet={onPlaceBet} />
            </div>
          ))}
        </div>

        {/* QF */}
         <div className="flex flex-col gap-24 w-72 justify-center">
          <div className="bg-slate-50 py-2 rounded-xl mb-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 text-center">Quartas</h4>
          </div>
          {matches8.map(match => (
            <div key={match.id} className="relative z-10 shrink-0">
               <MatchCard match={match} bet={userBets.find(b => b.matchId === match.id)} onPlaceBet={onPlaceBet} />
            </div>
          ))}
        </div>

        {/* SF */}
        <div className="flex flex-col gap-48 w-72 justify-center">
          <div className="bg-slate-50 py-2 rounded-xl mb-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 text-center">Semifinais</h4>
          </div>
          {matches4.map(match => (
            <div key={match.id} className="relative z-10 shrink-0">
               <MatchCard match={match} bet={userBets.find(b => b.matchId === match.id)} onPlaceBet={onPlaceBet} />
            </div>
          ))}
        </div>

        {/* Final */}
        <div className="flex flex-col gap-8 w-72 justify-center">
          <div className="bg-brand/5 py-2 rounded-xl mb-2 border border-brand/10">
            <h4 className="text-[10px] font-black uppercase text-brand text-center">A Grande Final</h4>
          </div>
          {matches2.map(match => (
            <div key={match.id} className="relative z-10 shrink-0 shadow-lg shadow-brand/10 rounded-2xl ring-2 ring-brand/10">
               <MatchCard match={match} bet={userBets.find(b => b.matchId === match.id)} onPlaceBet={onPlaceBet} />
            </div>
          ))}
        </div>
        
      </div>
    </div>
    </div>
  );
};
