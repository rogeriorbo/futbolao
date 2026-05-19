import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, X, Copy, Check, Info } from 'lucide-react';
import { Pool } from '../types';

interface JoinPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<any>;
}

export const JoinPoolModal: React.FC<JoinPoolModalProps> = ({ isOpen, onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedPool, setJoinedPool] = useState<Pool | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!code) return;
    setLoading(true);
    try {
      const result = await onJoin(code);
      if (result?.needsPayment) {
        setJoinedPool(result.pool);
      } else {
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (joinedPool?.pixKey) {
      navigator.clipboard.writeText(joinedPool.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        className="bg-white w-full max-w-md p-6 sm:p-8 rounded-[2rem] shadow-2xl relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter">
            {joinedPool ? 'Pagar Entrada' : 'Entrar no Bolão'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!joinedPool ? (
          <div className="space-y-6">
            <p className="text-slate-500 text-sm font-medium">Insira o código de 6 dígitos fornecido pelo organizador para participar.</p>
            
            <div>
              <label className="block">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Código do Bolão</span>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="EX: A1B2C3"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-4 sm:p-6 bg-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 transition-all font-black text-2xl sm:text-3xl text-center tracking-[0.4em] sm:tracking-[0.5em] mt-2 uppercase"
                />
              </label>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={loading || code.length < 6}
              className="w-full py-4 rounded-2xl font-black text-slate-900 bg-yellow-400 hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
            >
              {loading ? 'Verificando...' : 'Confirmar Código'} <LogIn className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex gap-3 text-left">
              <Info className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-[11px] sm:text-xs text-yellow-800 leading-relaxed">
                Este bolão requer pagamento de entrada. Sua participação será confirmada pelo organizador após o recebimento do PIX.
              </p>
            </div>

            <div className="text-center space-y-1">
              <p className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-widest">Valor a Pagar</p>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">R$ {joinedPool.entryFee.toFixed(2)}</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Chave PIX do Organizador</p>
              <div className="flex bg-slate-100 p-3 sm:p-4 rounded-2xl items-center justify-between group">
                <code className="text-xs sm:text-sm font-black text-slate-700 truncate mr-2">{joinedPool.pixKey || 'Chave não informada'}</code>
                <button 
                  onClick={handleCopyPix}
                  className="p-2 sm:p-3 bg-white rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 transition-all shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 rounded-2xl font-black text-white bg-slate-900 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              Já realizei o PIX <Check className="w-5 h-5" />
            </button>
            <p className="text-[10px] text-center text-slate-400 font-medium">Aguarde a confirmação do organizador.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
