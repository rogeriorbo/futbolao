import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Camera, Loader2, Save, Crop as CropIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { db, auth, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onUpdate: (newProfile: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, profile, onUpdate }) => {
  const [name, setName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [theme, setTheme] = useState<'light' | 'black'>(profile?.theme || 'light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notificationsEnabled || false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  React.useEffect(() => {
    if (isOpen && profile) {
      setName(profile.displayName || auth.currentUser?.displayName || '');
      setPhotoURL(profile.photoURL || auth.currentUser?.photoURL || '');
      setTheme(profile.theme || 'light');
      setNotificationsEnabled(profile.notificationsEnabled || false);
      setImageToCrop(null); // reset crop ui
    }
  }, [isOpen, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageToCrop(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
    
    // Clear input value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels || !profile) return;
    
    setUploadingImage(true);
    setImageToCrop(null); // Hide cropper modal
    
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedFile) throw new Error('Não foi possível cortar a imagem');

      if (croppedFile.size > 800 * 1024) {
        toast.error('A imagem deve ter no máximo 800KB. Tente cortar uma área menor.');
        return;
      }

      const storageRef = ref(storage, `users/${profile.uid}/profile_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(storageRef, croppedFile);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      setPhotoURL(downloadURL);
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Error uploading cropped image:', error);
      toast.error('Erro ao enviar imagem. Verifique o console.');
    } finally {
      setUploadingImage(false);
    }
  };

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
        theme: theme,
        notificationsEnabled: notificationsEnabled
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

        {imageToCrop ? (
          <div className="space-y-6">
            <div className="relative w-full h-[300px] sm:h-[400px] bg-slate-900 rounded-2xl overflow-hidden">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">
                Zoom
              </label>
              <input 
                type="range" 
                value={zoom} 
                min={1} 
                max={3} 
                step={0.1} 
                aria-labelledby="Zoom" 
                onChange={(e) => setZoom(Number(e.target.value))} 
                className="w-full accent-brand"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => setImageToCrop(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleCropSave}
                disabled={uploadingImage}
                className="flex-1 bg-brand text-slate-900 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-brand/90 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <CropIcon className="w-4 h-4" />}
                Cortar e Salvar
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={photoURL || `https://ui-avatars.com/api/?name=${name || '?'}`} 
                className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-xl object-cover transition-opacity group-hover:opacity-50"
                referrerPolicy="no-referrer"
                alt="Profile"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingImage ? (
                  <Loader2 className="w-6 h-6 text-slate-800 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-slate-800 mb-1" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 bg-white/80 px-2 py-0.5 rounded-full">Alterar</span>
                  </>
                )}
              </div>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploadingImage}
            />
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL da Foto (Opcional)</span>
              <input 
                type="url"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://..."
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1.5 focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all outline-none font-bold text-sm"
              />
            </label>

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
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'black')}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-1.5 focus:border-brand focus:ring-4 focus:ring-brand/5 transition-all outline-none font-bold text-sm"
              >
                <option value="light">Padrão</option>
                <option value="black">Black</option>
              </select>
            </label>

            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl cursor-pointer">
              <input 
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => {
                  if (typeof Notification === 'undefined') {
                    toast.error('Notificações não são suportadas neste navegador.');
                    return;
                  }
                  try {
                    if (e.target.checked && Notification.permission !== 'granted') {
                      Notification.requestPermission().then(perm => {
                        if (perm === 'granted') {
                          setNotificationsEnabled(true);
                        } else {
                          setNotificationsEnabled(false);
                          toast.error('Permissão para notificações negada nas configurações do seu navegador.');
                        }
                      }).catch(() => {
                        setNotificationsEnabled(false);
                        toast.error('Erro ao solicitar permissão de notificações.');
                      });
                    } else {
                      setNotificationsEnabled(e.target.checked);
                    }
                  } catch (err) {
                    console.error(err);
                    setNotificationsEnabled(false);
                    toast.error('Não foi possível ativar as notificações (Restrição de permissão do navegador).');
                  }
                }}
                className="w-5 h-5 rounded border-slate-300 text-brand focus:ring-brand/20 transition-all"
              />
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900">Notificações no Navegador</span>
                <span className="text-[10px] font-bold text-slate-500">Seja avisado quando seus jogos começarem ou terminarem</span>
              </div>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading || uploadingImage}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
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
        )}
      </motion.div>
    </div>
  );
};
