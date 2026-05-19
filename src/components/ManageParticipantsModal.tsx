import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X, Check, Trash2, ShieldCheck, Mail, Loader2, DollarSign } from 'lucide-react';
import { Pool, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { toast } from 'sonner';

interface ManageParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: Pool;
}

export const ManageParticipantsModal: React.FC<ManageParticipantsModalProps> = ({ isOpen, onClose, pool }) => {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const pData = await Promise.all(
        pool.participants.map(async (uid) => {
          const uDoc = await getDoc(doc(db, 'users', uid));
          return { uid, ...uDoc.data() } as UserProfile;
        })
      );
      const penData = await Promise.all(
        (pool.pendingParticipants || []).map(async (uid) => {
          const uDoc = await getDoc(doc(db, 'users', uid));
          return { uid, ...uDoc.data() } as UserProfile;
        })
      );
      setParticipants(pData);
      setPending(penData);
    } catch (error) {
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen, pool.id]);

  const approveUser = async (uid: string) => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, 'pools', pool.id), {
        pendingParticipants: arrayRemove(uid),
        participants: arrayUnion(uid)
      });
      toast.success('Participante aprovado!');
      setPending(prev => prev.filter(p => p.uid !== uid));
      const approved = pending.find(p => p.uid === uid);
      if (approved) setParticipants(prev => [...prev, approved]);
    } catch (error) {
      toast.error('Erro ao aprovar participante');
    } finally {
      setActionLoading(null);
    }
  };

  const removeUser = async (uid: string, isPending: boolean) => {
    if (uid === pool.ownerId) return;
    
    if (!window.confirm('Tem certeza que deseja remover este participante?')) {
      return;
    }

    setActionLoading(uid);
    try {
      if (isPending) {
        await updateDoc(doc(db, 'pools', pool.id), {
          pendingParticipants: arrayRemove(uid)
        });
        setPending(prev => prev.filter(p => p.uid !== uid));
      } else {
        await updateDoc(doc(db, 'pools', pool.id), {
          participants: arrayRemove(uid)
        });
        setParticipants(prev => prev.filter(p => p.uid !== uid));
      }
      toast.success('Participante removido');
    } catch (error) {
      toast.error('Erro ao remover participante');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePaid = async (uid: string, isPaid: boolean) => {
    setActionLoading(uid);
    try {
      await updateDoc(doc(db, 'pools', pool.id), {
        paidParticipants: isPaid ? arrayRemove(uid) : arrayUnion(uid)
      });
      toast.success(isPaid ? 'Pagamento cancelado' : 'Pagamento confirmado!');
      // Local update is handled by the parent listener usually, 
      // but for immediate feedback in this modal we might need to refresh or rely on parent
    } catch (error) {
      toast.error('Erro ao atualizar status de pagamento');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
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
        className="bg-white w-full max-w-lg p-6 sm:p-8 rounded-[2rem] shadow-2xl relative z-10"
      >
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" /> Participantes
            </h3>
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium uppercase tracking-widest">Controle seus convidados</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 sm:space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mb-2" />
              <p className="text-slate-400 text-sm">Carregando lista...</p>
            </div>
          ) : (
            <>
              {/* Pendentes */}
              {pending.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 px-2 py-1 rounded">Aguardando Pagamento ({pending.length})</h4>
                  </div>
                  <div className="grid gap-3">
                    {pending.map((user) => (
                      <div key={user.uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-full" alt="" />
                          <div>
                            <p className="font-bold text-sm text-slate-900">{user.displayName}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {user.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            disabled={!!actionLoading}
                            onClick={() => approveUser(user.uid)}
                            className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all shadow-sm"
                          >
                            {actionLoading === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                          </button>
                          <button 
                            disabled={!!actionLoading}
                            onClick={() => removeUser(user.uid, true)}
                            className="w-10 h-10 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-300 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Confirmados */}
              <section className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmados ({participants.length})</h4>
                <div className="grid gap-3">
                  {participants.map((user) => (
                      <div key={user.uid} className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-10 h-10 rounded-full" alt="" />
                            {user.uid === pool.ownerId && (
                              <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-0.5 rounded-full ring-2 ring-white">
                                <ShieldCheck className="w-2.5 h-2.5 text-slate-900" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-slate-900">{user.displayName}</p>
                              {(user.uid === pool.ownerId || (pool.paidParticipants || []).includes(user.uid)) ? (
                                <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-black uppercase">{user.uid === pool.ownerId ? 'Organizador' : 'Pago'}</span>
                              ) : (
                                <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black uppercase">Pendente</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500">{user.uid === pool.ownerId ? 'Organizador' : 'Participante'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.uid !== pool.ownerId && (
                            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                              <button 
                                onClick={() => togglePaid(user.uid, (pool.paidParticipants || []).includes(user.uid))}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
                                  (pool.paidParticipants || []).includes(user.uid)
                                    ? "bg-green-500 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                <DollarSign className="w-3 h-3" />
                                Pago
                              </button>
                              <button 
                                onClick={() => togglePaid(user.uid, (pool.paidParticipants || []).includes(user.uid))}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5",
                                  !(pool.paidParticipants || []).includes(user.uid)
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                Pendente
                              </button>
                            </div>
                          )}
                          {user.uid !== pool.ownerId && (
                            <button 
                              disabled={!!actionLoading}
                              onClick={() => removeUser(user.uid, false)}
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                            >
                              {actionLoading === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
