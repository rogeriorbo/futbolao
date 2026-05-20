import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, DollarSign, Users, Award } from 'lucide-react';
import { Pool } from '../types';
import { PrizeDistributionModal } from './PrizeDistributionModal';
import { CreatePoolModal } from './CreatePoolModal';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface PoolDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Pool | null;
  isOwner: boolean;
  ranking?: { userId: string; name: string; photoURL?: string; points: number }[];
  onDelete: () => void;
}

export const PoolDetailModal: React.FC<PoolDetailModalProps> = ({ isOpen, onClose, pool, isOwner, ranking, onDelete }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newFee, setNewFee] = useState(pool?.entryFee || 0);
  const [newPix, setNewPix] = useState(pool?.pixKey || '');
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [isEditingPix, setIsEditingPix] = useState(false);
  const [showPrizeEdit, setShowPrizeEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [localPaidParticipants, setLocalPaidParticipants] = useState(pool?.paidParticipants || []);
  const [hasChanges, setHasChanges] = useState(false);

  React.useEffect(() => {
    setLocalPaidParticipants(pool?.paidParticipants || []);
    setHasChanges(false);
  }, [pool]);
  
  if (!isOpen || !pool) return null;

  const handleEditSubmit = async (data: any) => {
    const poolRef = doc(db, 'pools', pool.id);
    await updateDoc(poolRef, {
      ...data,
      limit: data.limitType === 'limited' ? data.limit : null
    });
    toast.success('Bolão atualizado!');
    setIsEditModalOpen(false);
  };

  const handleUpdateFee = async () => {
    if (newFee < 0) {
      toast.error('O valor da entrada deve ser um número positivo.');
      return;
    }
    if (newFee > 0 && !pool.pixKey) {
      toast.error('A chave PIX do organizador é obrigatória para bolões com valor de entrada.');
      return;
    }
    const poolRef = doc(db, 'pools', pool.id);
    await updateDoc(poolRef, { entryFee: newFee });
    setIsEditingFee(false);
    toast.success('Valor de inscrição atualizado!');
  };

  const handleUpdatePix = async () => {
    const poolRef = doc(db, 'pools', pool.id);
    await updateDoc(poolRef, { pixKey: newPix });
    setIsEditingPix(false);
    toast.success('Chave PIX atualizada!');
  };

  const copyPix = () => {
    navigator.clipboard.writeText(pool.pixKey || '');
    toast.success('Chave PIX copiada!');
  };

  const togglePaid = (userId: string) => {
    if (!isOwner) return;
    
    setLocalPaidParticipants(prev => {
        const isPaid = prev.includes(userId);
        const next = isPaid ? prev.filter(id => id !== userId) : [...prev, userId];
        return next;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    const poolRef = doc(db, 'pools', pool.id);
    await updateDoc(poolRef, { paidParticipants: localPaidParticipants });
    setHasChanges(false);
    toast.success('Pagamentos salvos!');
  };

  const leavePool = async () => {
    if (!pool || !auth.currentUser) return;
    const poolRef = doc(db, 'pools', pool.id);
    const newParticipants = pool.participants.filter(pid => pid !== auth.currentUser?.uid);
    await updateDoc(poolRef, { participants: newParticipants });
    toast.success('Você saiu do bolão.');
    onClose();
  };

  const removeParticipant = async (userId: string) => {
    if (!isOwner) return;
    const poolRef = doc(db, 'pools', pool.id);
    const newParticipants = pool.participants.filter(pid => pid !== userId);
    await updateDoc(poolRef, { participants: newParticipants });
  };
  return (
    <>
      <PrizeDistributionModal 
        isOpen={showPrizeEdit}
        onClose={() => setShowPrizeEdit(false)}
        pool={pool}
      />
      <CreatePoolModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        poolToEdit={pool}
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-lg p-6 rounded-[2rem] shadow-2xl relative z-10"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <Trophy className="w-5 h-5 text-brand" /> {pool.name}
            </h3>
            <div className="flex items-center gap-2">
              {isOwner ? (
                <>
                  <button onClick={() => setIsEditModalOpen(true)} className="text-[10px] font-black uppercase text-white bg-brand px-3 py-1.5 rounded-lg hover:bg-brand/90">EDITAR</button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-[10px] font-black uppercase text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600">EXCLUIR</button>
                </>
              ) : (
                <button onClick={leavePool} className="text-[10px] font-black uppercase text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100">CANCELAR/SAIR</button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 relative">
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Inscrição</p>
                  {isOwner && isEditingFee ? (
                    <div className="flex gap-1">
                       <input type="number" value={newFee} onChange={e => setNewFee(Number(e.target.value))} className="w-16 text-sm font-black text-slate-900 border rounded p-1" />
                       <button onClick={handleUpdateFee} className="text-brand font-black text-[9px]">OK</button>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-slate-900 cursor-pointer" onClick={() => isOwner && setIsEditingFee(true)}>R$ {pool.entryFee.toFixed(2).replace('.', ',')}</p>
                  )}
                </div>

                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Total Arrec.</p>
                   <p className="text-sm font-black text-slate-900">R$ {((localPaidParticipants?.length || 0) * pool.entryFee).toFixed(2).replace('.', ',')}</p>
                 </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Chave PIX</p>
                  {pool.pixKey && <button onClick={copyPix} className="text-[9px] font-black uppercase text-brand">Copiar</button>}
                </div>
                {isOwner && isEditingPix ? (
                  <div className="flex gap-1">
                    <input type="text" value={newPix} onChange={e => setNewPix(e.target.value)} className="w-full text-sm font-black text-slate-900 border rounded p-1" />
                    <button onClick={handleUpdatePix} className="text-brand font-black text-[9px]">OK</button>
                  </div>
                ) : (
                  <p className="text-sm font-black text-slate-900 cursor-pointer" onClick={() => isOwner && setIsEditingPix(true)}>{pool.pixKey || 'Não definida'}</p>
                )}
              </div>

            <div>
               <h4 className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2">Premiação ({pool.prizeType === 'fixed' ? 'Fixo' : 'Porcentagem'})</h4>
               <div className="space-y-1">
                 {(pool.prizeDistribution || []).map((dist, i) => {
                   const totalCollected = (localPaidParticipants?.length || 0) * pool.entryFee;
                   const prizeValue = pool.prizeType === 'fixed' ? dist.value : (dist.value / 100) * totalCollected;
                   return (
                     <div key={i} className="flex justify-between items-center bg-white border border-slate-100 p-2 rounded-lg shadow-sm">
                        <span className="text-[10px] font-bold text-slate-700">{dist.position}º Lugar</span>
                        <span className="text-xs font-black text-brand">
                          R$ {prizeValue.toFixed(2).replace('.', ',')}
                          {pool.prizeType === 'percentage' && <span className="text-[9px] text-slate-400 font-normal ml-1">({dist.value}%)</span>}
                        </span>
                     </div>
                   );
                 })}
               </div>
            </div>

             <div>
                <h4 className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2 flex justify-between">
                  <span>Participantes ({pool.participants.length})</span>
                  <span>Pagos ({localPaidParticipants?.length || 0})</span>
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {ranking?.map((user) => (
                    <div key={user.userId} className="flex justify-between items-center bg-white border border-slate-100 p-1.5 rounded-lg shadow-sm gap-1">
                      <span className="text-[10px] font-bold text-slate-700 truncate">{user.name}</span>
                      <div className="flex items-center gap-2">
                        {isOwner && (
                          <input 
                            type="checkbox" 
                            checked={localPaidParticipants?.includes(user.userId)}
                            onChange={() => togglePaid(user.userId)}
                            className="accent-brand"
                          />
                        )}
                        {(isOwner || user.userId === auth.currentUser?.uid) && (
                          <span className="hidden"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
            
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                    <h3 className="text-lg font-bold mb-4">Tem certeza?</h3>
                    <p className="text-slate-600 mb-6">Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-2">
                       <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold">Cancelar</button>
                       <button onClick={() => { setShowDeleteConfirm(false); onClose(); onDelete(); }} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold">Excluir</button>
                    </div>
                  </div>
                </div>
            )}
            {/* Removed Edit Prize Button */}
          </div>
        </motion.div>
      </div>
    </>
  );
};
