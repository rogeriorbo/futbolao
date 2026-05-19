import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Plus, LogOut, ChevronRight, ChevronLeft, Check, Info, X, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Pool } from '../types';
import { toast } from 'sonner';

interface CreatePoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  poolToEdit?: Pool | null;
}

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({ isOpen, onClose, onSubmit, poolToEdit }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const initialForm = {
    plan: 'free' as 'free' | 'pro',
    name: '',
    description: '',
    limitType: 'open' as 'open' | 'limited',
    limit: 100,
    visibility: 'private' as 'public' | 'private',
    entryFee: 30,
    pixKey: '',
    prizeModel: 'classic' as 'classic' | 'aggressive' | 'community',
    prizeType: 'percentage' as 'percentage' | 'fixed',
    prizeDistribution: [
      { position: 1, value: 50 },
      { position: 2, value: 30 },
      { position: 3, value: 20 },
    ],
    scoringSystem: {
      exact: 25,
      winnerGoals: 18,
      winnerDiff: 15,
      winnerLoserGoals: 12,
      winnerOnly: 10,
      champion: 100,
      vice: 50
    },
    advancedSettings: {
      shieldedBets: true,
      multiplier: false,
      championBonus: 100,
      viceBonus: 50
    }
  };

  const [form, setForm] = useState(initialForm);

  React.useEffect(() => {
    if (isOpen && !poolToEdit) {
      if (form.prizeModel === 'classic') {
        setForm(f => ({ ...f, prizeDistribution: [
          { position: 1, value: 50 },
          { position: 2, value: 30 },
          { position: 3, value: 20 },
        ]}));
      } else if (form.prizeModel === 'aggressive') {
        setForm(f => ({ ...f, prizeDistribution: [
          { position: 1, value: 70 },
          { position: 2, value: 20 },
          { position: 3, value: 10 },
        ]}));
      } else if (form.prizeModel === 'community') {
        setForm(f => ({ ...f, prizeDistribution: [
          { position: 1, value: 40 },
          { position: 2, value: 20 },
          { position: 3, value: 15 },
          { position: 4, value: 15 },
          { position: 5, value: 10 },
        ]}));
      }
    }
  }, [form.prizeModel, isOpen, poolToEdit]);

  React.useEffect(() => {
    if (poolToEdit) {
      setForm({
        plan: poolToEdit.plan,
        name: poolToEdit.name,
        description: poolToEdit.description || '',
        limitType: poolToEdit.limit ? 'limited' : 'open',
        limit: poolToEdit.limit || 100,
        visibility: poolToEdit.visibility,
        entryFee: poolToEdit.entryFee,
        pixKey: poolToEdit.pixKey || '',
        prizeModel: poolToEdit.prizeModel,
        prizeType: poolToEdit.prizeType || 'percentage',
        prizeDistribution: poolToEdit.prizeDistribution || [{ position: 1, value: 100 }],
        scoringSystem: poolToEdit.scoringSystem,
        advancedSettings: poolToEdit.advancedSettings
      });
      setStep(1);
    } else {
      setForm(initialForm);
    }
  }, [poolToEdit, isOpen]);

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const addPrizeRow = () => {
    const nextPos = form.prizeDistribution.length + 1;
    setForm({
      ...form,
      prizeDistribution: [...form.prizeDistribution, { position: nextPos, value: 0 }]
    });
  };

  const removePrizeRow = () => {
    if (form.prizeDistribution.length <= 1) return;
    setForm({
      ...form,
      prizeDistribution: form.prizeDistribution.slice(0, -1)
    });
  };

  const updatePrizeValue = (index: number, val: number) => {
    const newDist = [...form.prizeDistribution];
    newDist[index].value = val;
    setForm({ ...form, prizeDistribution: newDist });
  };

  const totalValue = form.prizeDistribution.reduce((acc, curr) => acc + curr.value, 0);

  const handleSubmit = async () => {
    if (form.entryFee < 0) {
      toast.error('O valor da entrada deve ser um número positivo.');
      return;
    }
    if (form.entryFee > 0 && !form.pixKey) {
      toast.error('A chave PIX do organizador é obrigatória para bolões com valor de entrada.');
      return;
    }
    if (!form.name || (form.prizeType === 'percentage' && totalValue !== 100)) {
      if (form.prizeType === 'percentage' && totalValue !== 100) toast.error('A distribuição total (porcentagem) deve ser exatamente 100%');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
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
        className="bg-[#121212] text-white w-full max-w-xl p-5 sm:p-8 rounded-[2.5rem] shadow-2xl relative z-10 my-2"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5 sm:mb-8">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-100">
              {poolToEdit ? 'Editar Bolão' : 'Novo Bolão'}
            </h3>
            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn(
                  "h-1.5 rounded-full transition-all",
                  step === i ? "w-10 bg-brand" : step > i ? "w-4 bg-brand/40" : "w-4 bg-slate-800"
                )} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-800/50 text-slate-400 rounded-full hover:bg-slate-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 sm:space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {!poolToEdit && (
                  <section>
                    <h4 className="font-black text-slate-500 mb-3 uppercase text-[10px] tracking-widest">
                      Plano
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setForm({...form, plan: 'free'})}
                        className={cn("p-5 rounded-2xl border-2 text-left transition-all", form.plan === 'free' ? 'border-brand bg-brand/10' : 'border-slate-800 bg-slate-900/50')}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className={cn("font-black text-sm", form.plan === 'free' ? "text-brand" : "text-slate-300")}>COPA FREE</p>
                          {form.plan === 'free' && <Check className="w-4 h-4 text-brand" />}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">Gerenciamento manual. Sem taxas.</p>
                      </button>

                      <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-brand to-yellow-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
                         <button 
                          disabled
                          className="relative w-full p-5 rounded-2xl border-2 border-slate-800 bg-slate-900/80 text-left opacity-60 cursor-not-allowed overflow-hidden"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <p className="font-black text-sm text-yellow-500">COPA PRO</p>
                            <span className="bg-yellow-500 text-slate-900 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Em breve</span>
                          </div>
                          <div className="space-y-2">
                            {[
                              'Mensagens automáticas de zoeira',
                              'Lembretes de jogos no WhatsApp',
                              'Todos os campeonatos disponíveis'
                            ].map((feat, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Check className="w-3 h-3 text-green-500" />
                                <span className="text-[10px] text-slate-400 font-bold">{feat}</span>
                              </div>
                            ))}
                          </div>
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <section className="space-y-4">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Bolão</span>
                      <input 
                        type="text" 
                        placeholder="Ex: Amigos da Firma"
                        value={form.name}
                        onChange={(e) => setForm({...form, name: e.target.value})}
                        className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all font-bold mt-1.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição (Opcional)</span>
                      <textarea 
                        placeholder="Regras extras, premiação, etc..."
                        value={form.description}
                        onChange={(e) => setForm({...form, description: e.target.value})}
                        className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-brand transition-all font-medium mt-1.5 h-16 resize-none text-[10px]"
                      />
                    </label>
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <section>
                    <h4 className="font-black text-slate-500 mb-2.5 uppercase text-[10px] tracking-widest">Visibilidade</h4>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
                      <button 
                        onClick={() => setForm({...form, visibility: 'private'})}
                        className={cn("py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", form.visibility === 'private' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300')}
                      >
                        Privado
                      </button>
                      <button 
                        onClick={() => setForm({...form, visibility: 'public'})}
                        className={cn("py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", form.visibility === 'public' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300')}
                      >
                        Público
                      </button>
                    </div>
                  </section>
                  
                  <section>
                    <h4 className="font-black text-slate-500 mb-2.5 uppercase text-[10px] tracking-widest">Limite</h4>
                    <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
                      <input 
                        type="number" 
                        value={form.limit}
                        onChange={(e) => setForm({...form, limit: parseInt(e.target.value) || 0})}
                        className="w-full p-2 bg-transparent text-[10px] font-black text-white text-center outline-none"
                      />
                    </div>
                  </section>
                </div>

                <section className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Entrada (R$)</span>
                      <input 
                        type="number" 
                        value={form.entryFee}
                        onChange={(e) => setForm({...form, entryFee: parseFloat(e.target.value) || 0})}
                        className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-brand transition-all font-black text-xl mt-1.5"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chave PIX</span>
                      <input 
                        type="text" 
                        placeholder="Seu CPF/E-mail"
                        value={form.pixKey}
                        onChange={(e) => setForm({...form, pixKey: e.target.value})}
                        className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl outline-none focus:border-brand transition-all font-bold text-sm mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex gap-3 text-slate-500">
                      <Info className="w-5 h-5 shrink-0" />
                      <p className="text-[10px] font-medium leading-relaxed">
                        Gerencie as inscrições confirmando os pagamentos na aba de participantes.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-800 flex gap-3 text-brand/80">
                      <Lock className="w-4 h-4 shrink-0" />
                      <p className="text-[9px] font-black uppercase tracking-widest leading-loose">
                        Palpites Blindados: Ninguém vê os palpites antes do jogo começar!
                      </p>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <section>
                  <h4 className="font-black text-slate-500 mb-5 uppercase text-[10px] tracking-widest">
                    Tipo de Premiação
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <button 
                      onClick={() => setForm({...form, prizeType: 'percentage'})}
                      className={cn(
                        "py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all", 
                        form.prizeType === 'percentage' 
                          ? 'border-brand bg-brand/10 text-white' 
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                      )}
                    >
                      Porcentagem (%)
                    </button>
                    <button 
                      onClick={() => setForm({...form, prizeType: 'fixed'})}
                      className={cn(
                        "py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all", 
                        form.prizeType === 'fixed' 
                          ? 'border-brand bg-brand/10 text-white' 
                          : 'border-slate-800 bg-slate-900 text-slate-500'
                      )}
                    >
                      Valor Fixo (R$)
                    </button>
                  </div>
                  
                  <h4 className="font-black text-slate-500 mb-5 uppercase text-[10px] tracking-widest">
                    Modelo de Distribuição Rápida
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    {[
                      { id: 'classic', label: 'Clássico' },
                      { id: 'aggressive', label: 'Pro' },
                      { id: 'community', label: 'Geral' }
                    ].map((model) => (
                      <button 
                        key={model.id}
                        onClick={() => setForm({...form, prizeModel: model.id as any})}
                        className={cn(
                          "py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all", 
                          form.prizeModel === model.id 
                            ? 'border-brand bg-brand/10 text-white' 
                            : 'border-slate-800 bg-slate-900 text-slate-500'
                        )}
                      >
                        {model.label}
                      </button>
                    ))}
                  </div>

                  <h4 className="font-black text-slate-500 mb-5 uppercase text-[10px] tracking-widest">
                    Distribuição Personalizada (Até 5 Ganhadores)
                  </h4>

                  <div className="space-y-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
                      <div className="grid grid-cols-3 px-6 py-4 bg-slate-800/30 text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Posição</span>
                        <span className="text-center">{form.prizeType === 'fixed' ? 'Valor' : 'Percentual'}</span>
                        <span className="text-right">Ação</span>
                      </div>
                      <div className="divide-y divide-slate-800">
                        {form.prizeDistribution.map((row, idx) => (
                          <div key={idx} className="grid grid-cols-3 px-6 py-4 items-center">
                            <span className="font-black text-xs">{row.position}º</span>
                            <div className="flex justify-center relative">
                              {form.prizeType === 'fixed' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">R$</span>}
                              <input 
                                type="number" 
                                value={row.value ?? (row as any).percentage ?? 0}
                                onChange={(e) => updatePrizeValue(idx, parseFloat(e.target.value) || 0)}
                                className={cn("w-24 p-2 bg-slate-800 border border-slate-700 rounded-xl text-center font-black text-white outline-none focus:border-brand", form.prizeType === 'fixed' ? 'pl-6 pr-2' : '')}
                              />
                            </div>
                            <div className="flex justify-end">
                               {form.prizeDistribution.length > 1 && (
                                 <button onClick={() => {
                                      const newDist = form.prizeDistribution.filter((_, i) => i !== idx).map((v, i) => ({ ...v, position: i + 1 }));
                                      setForm({ ...form, prizeDistribution: newDist });
                                 }} className="text-red-500 p-1"><X className="w-4 h-4" /></button>
                               )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="px-6 py-4 bg-slate-800/10 flex justify-between items-center">
                        <button disabled={form.prizeDistribution.length >= 5} onClick={addPrizeRow} className="text-[10px] font-black uppercase tracking-widest text-brand disabled:opacity-50">+ Adicionar (Max 5)</button>
                        <span className={cn(
                          "text-xs font-black",
                          form.prizeType === 'fixed' ? "text-yellow-500" : (totalValue === 100 ? "text-green-500" : "text-red-500")
                        )}>
                          {form.prizeType === 'percentage' ? `${totalValue}% / 100%` : `R$ ${totalValue}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <Trophy className="w-16 h-16 text-brand mx-auto mb-4" />
                  <h4 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">Tudo Pronto!</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[240px] mx-auto">Revise os detalhes e lance seu bolão oficial da Copa 2026.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Nome', value: form.name },
                    { label: 'Entrada', value: `R$ ${form.entryFee}` },
                    { label: 'Prêmio 1º', value: form.prizeType === 'fixed' ? `R$ ${form.prizeDistribution[0].value || (form.prizeDistribution[0] as any).percentage}` : `${form.prizeDistribution[0].value || (form.prizeDistribution[0] as any).percentage}%` },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-sm font-black text-white uppercase tracking-tighter">{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex gap-3">
          {step > 1 ? (
            <button 
              onClick={prevStep}
              className="px-6 py-5 rounded-2xl font-black text-slate-500 bg-slate-900 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-all"
            >
              Voltar
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="px-6 py-5 rounded-2xl font-black text-slate-500 bg-slate-900 hover:text-white text-[10px] uppercase tracking-[0.2em] transition-all"
            >
              Sair
            </button>
          )}
          <button 
            onClick={step === 3 ? handleSubmit : nextStep}
            disabled={loading || (step === 2 && form.prizeType === 'percentage' && totalValue !== 100) || (step === 1 && !form.name)}
            className="flex-1 py-5 rounded-2xl font-black text-white bg-brand hover:bg-brand/90 transition-all active:scale-[0.98] disabled:opacity-50 text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-brand/20"
          >
            {loading ? '...' : step === 3 ? (poolToEdit ? 'Salvar' : 'Lançar Bolão') : 'Próximo'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
