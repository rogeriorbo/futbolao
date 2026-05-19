import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Loader2, Save } from 'lucide-react';
import { UserProfile } from '../types';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onUpdate: (newProfile: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile, onUpdate }) => {
  const [name, setName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !auth.currentUser) return;

    setLoading(true);
    try {
      // Update Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoURL
      });

      // Update Firestore
      const userRef = doc(db, 'users', profile.uid);
      const updatedData = {
        displayName: name,
        photoURL: photoURL,
      };
      await updateDoc(userRef, updatedData);

      onUpdate({ ...profile, ...updatedData });
      toast.success('Perfil atualizado com sucesso!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
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
        className="bg-white w-full max-w-sm p-6 sm:p-8 rounded-[2rem] shadow-2xl relative z-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <User className="w-5 h-5 text-brand" /> Editar Perfil
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group">
              <img 
                src={photoURL || `https://ui-avatars.com/api/?name=${name || '?'}`} 
                className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-xl object-cover"
                referrerPolicy="no-referrer"
                alt="Profile"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sua Foto de Perfil</p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome de Exibição</span>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como quer ser chamado?"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1.5 focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all outline-none font-bold text-sm"
                required
              />
            </label>
            
            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tema</span>
              <select 
                value={profile?.theme || 'light'}
                onChange={(e) => onUpdate({ ...profile!, theme: e.target.value as 'light' | 'black' })}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1.5 focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all outline-none font-bold text-sm"
              >
                <option value="light">Padrão</option>
                <option value="black">Black</option>
              </select>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>

          <button 
            type="button"
            onClick={() => {
              auth.signOut();
              onClose();
            }}
            className="w-full bg-red-50 text-red-500 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Sair da Conta
          </button>
        </form>
      </motion.div>
    </div>
  );
};
