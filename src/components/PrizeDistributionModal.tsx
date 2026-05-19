import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { Pool } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface PrizeDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Pool;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const PrizeDistributionModal: React.FC<PrizeDistributionModalProps> = ({ isOpen, onClose, pool }) => {
  const [dist, setDist] = useState(pool.prizeDistribution || []);

  const handleUpdateValue = (index: number, val: number) => {
    const newDist = [...(dist || [])];
    newDist[index].value = val;
    setDist(newDist);
  };

  const handleAdd = () => {
    if (dist.length >= 5) return;
    setDist([...dist, { position: dist.length + 1, value: 0 }]);
  };

  const handleRemove = (index: number) => {
    if (dist.length <= 1) return;
    const newDist = dist.filter((_, i) => i !== index).map((d, i) => ({ ...d, position: i + 1 }));
    setDist(newDist);
  };

  const [prizeType, setPrizeType] = useState<'percentage' | 'fixed'>(pool.prizeType || 'percentage');

  const totalValue = dist.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const handleSave = async () => {
    if (prizeType === 'percentage' && totalValue !== 100) {
      toast.error('A distribuição em porcentagem deve somar 100%');
      return;
    }
    try {
      const poolRef = doc(db, 'pools', pool.id);
      await updateDoc(poolRef, { prizeType, prizeDistribution: dist || [] });
      toast.success('Distribuição atualizada!');
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pools/${pool.id}`);
      toast.error('Erro ao salvar.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="bg-white w-full max-w-sm p-6 rounded-[2rem] relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase tracking-tighter">Editar Premiação</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setPrizeType('percentage')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${prizeType === 'percentage' ? 'bg-white shadow-sm text-brand' : 'text-slate-500'}`}
          >
            Porcentagem %
          </button>
          <button
            onClick={() => setPrizeType('fixed')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${prizeType === 'fixed' ? 'bg-white shadow-sm text-brand' : 'text-slate-500'}`}
          >
            Valor Fixo R$
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <AnimatePresence>
            {(dist || []).map((d, i) => (
              <motion.div 
                key={d.position}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-bold text-slate-500 w-8">{d.position}º</span>
                <div className="relative flex-1">
                  {prizeType === 'fixed' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>}
                  <input 
                    type="number"
                    value={d.value ?? (d as any).percentage ?? 0}
                    onChange={(e) => handleUpdateValue(i, Number(e.target.value))}
                    className={`w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border border-slate-100 focus:border-brand outline-none transition-all ${prizeType === 'fixed' ? 'pl-8' : ''}`}
                  />
                </div>
                {prizeType === 'percentage' && <span className="text-xs font-black text-slate-400 w-4">%</span>}
                {dist.length > 1 && (
                  <button onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4" /></button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        <div className="flex justify-between items-center mb-6 px-1">
          <button disabled={dist.length >= 5} onClick={handleAdd} className="text-xs font-bold text-brand flex items-center gap-1 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
          <span className={`text-xs font-black ${prizeType === 'fixed' ? 'text-slate-600' : (totalValue === 100 ? 'text-green-500' : 'text-red-500')}`}>
            Total: {prizeType === 'percentage' ? `${totalValue}%` : `R$ ${totalValue}`}
          </span>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 flex justify-center items-center gap-2"
        >
          <Save className="w-4 h-4" /> Salvar
        </button>
      </motion.div>
    </div>
  );
};
