import React from 'react';
import { Trophy } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionLabel, onAction }) => (
  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center flex flex-col items-center">
    <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-4">
      <Trophy className="w-8 h-8 text-brand" />
    </div>
    <h3 className="font-black uppercase tracking-tighter text-slate-900 text-lg mb-2">{title}</h3>
    <p className="text-xs text-slate-500 font-medium mb-6 max-w-[200px]">{description}</p>
    {actionLabel && onAction && (
      <button 
        onClick={onAction}
        className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all active:scale-95"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
