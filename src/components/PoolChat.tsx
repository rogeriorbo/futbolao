import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Send, User as UserIcon, MessageCircle, Pencil, Trash2, X, Check, Smile, Mic, CornerUpLeft } from 'lucide-react';
import Picker from 'emoji-picker-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile, Pool } from '../types';

interface PoolChatProps {
  pool: Pool;
  currentUser: UserProfile;
  ranking?: { userId: string, name: string, photoURL?: string, points: number }[];
}

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt: any;
  imageUrl?: string;
  replyTo?: {
    id: string;
    text: string;
    userName: string;
  };
}

interface PresenceData {
  online: boolean;
  lastSeen?: any;
  typing?: boolean;
  displayName?: string;
}

export const PoolChat: React.FC<PoolChatProps> = ({ pool, currentUser, ranking = [] }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [presence, setPresence] = useState<Record<string, PresenceData>>({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const QUICK_TAUNTS = [
    "Secador ligado! 💨",
    "Falei que ia dar zebra! 🦓",
    "Meu palpite foi cirúrgico! 🎯",
    "E o líder caiu... 📉",
    "Faz o PIX! 💸",
    "Que golaço! ⚽🔥",
    "Chora mais! 😭⚽",
    "Estou de olho! 👁️"
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const [showParticipants, setShowParticipants] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const poolId = pool.id;

  // Fetch participants info
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const pData = await Promise.all(
          pool.participants.map(async (uid) => {
            const uDoc = await getDoc(doc(db, 'users', uid));
            return { uid, ...uDoc.data() } as UserProfile;
          })
        );
        setParticipants(pData);
      } catch (e) {
        console.error('Error fetching participants', e);
      }
    };
    fetchUsers();
  }, [pool.participants]);

  // Presence and Messages
  useEffect(() => {
    if (!poolId) return;

    // Messages listener
    const qMessages = query(
      collection(db, `pools/${poolId}/messages`),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    });

    // Presence listener
    const unsubscribePresence = onSnapshot(collection(db, `pools/${poolId}/presence`), (snapshot) => {
      const p: Record<string, PresenceData> = {};
      snapshot.forEach((d) => {
        p[d.id] = d.data() as PresenceData;
      });
      setPresence(p);
    });

    // Set myself as online
    if (currentUser) {
      const pRef = doc(db, `pools/${poolId}/presence`, currentUser.uid);
      setDoc(pRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });
      
      return () => {
        unsubscribeMessages();
        unsubscribePresence();
        // Set offline when leaving chat
        setDoc(pRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
      };
    }

    return () => {
      unsubscribeMessages();
      unsubscribePresence();
    };
  }, [poolId, currentUser]);

  useEffect(() => {
    if (!currentUser || !poolId) return;
    const pRef = doc(db, `pools/${poolId}/presence`, currentUser.uid);

    if (newMessage.trim().length > 0) {
      setDoc(pRef, { typing: true, displayName: currentUser.displayName || 'Alguém' }, { merge: true });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setDoc(pRef, { typing: false }, { merge: true });
      }, 2500);
    } else {
      setDoc(pRef, { typing: false }, { merge: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [newMessage, currentUser, poolId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent, imageUrl?: string) => {
    if (e) e.preventDefault();
    
    if (editingMessageId) {
      if (!newMessage.trim()) return;
      try {
        await updateDoc(doc(db, `pools/${poolId}/messages`, editingMessageId), {
          text: newMessage.trim(),
        });
        setEditingMessageId(null);
        setNewMessage('');
      } catch (error) {
        console.error('Erro ao editar:', error);
      }
      return;
    }

    if (!newMessage.trim() && !imageUrl) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `pools/${poolId}/messages`), {
        text,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Usuário',
        userPhoto: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
        ...(imageUrl && { imageUrl }),
        ...(replyToMessage && {
          replyTo: {
            id: replyToMessage.id,
            text: replyToMessage.text,
            userName: replyToMessage.userName,
          }
        })
      });
      setReplyToMessage(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleDelete = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, `pools/${poolId}/messages`, msgId));
      setMessageToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const renderUserBadges = (msgUserId: string) => {
    const badges: React.ReactNode[] = [];

    // Dono do bolão
    if (msgUserId === pool.ownerId) {
      badges.push(
        <span key="owner" className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-rose-50 border border-rose-100 rounded text-[6.5px] font-black text-rose-600 uppercase tracking-wider shrink-0" title="Organizador do Bolão">
          🛡️ Admin
        </span>
      );
    }

    // Ranking badge
    const rankIndex = ranking.findIndex(r => r.userId === msgUserId);
    if (rankIndex === 0) {
      badges.push(
        <span key="rank-1" className="text-[10px] shrink-0" title="1º Colocado — Líder do Bolão">
          👑
        </span>
      );
    } else if (rankIndex === 1) {
      badges.push(
        <span key="rank-2" className="text-[10px] shrink-0" title="2º Colocado">
          🥈
        </span>
      );
    } else if (rankIndex === 2) {
      badges.push(
        <span key="rank-3" className="text-[10px] shrink-0" title="3º Colocado">
          🥉
        </span>
      );
    } else if (ranking.length > 3 && rankIndex === ranking.length - 1) {
      badges.push(
        <span key="rank-last" className="text-[10px] shrink-0 select-none animate-pulse" title="Último Colocado — Lanterna">
          🚨
        </span>
      );
    }

    if (badges.length === 0) return null;
    return <div className="flex items-center gap-1 shrink-0">{badges}</div>;
  };

  const typers = Object.entries(presence)
    .filter(([uid, data]) => uid !== currentUser.uid && (data as any).online && (data as any).typing)
    .map(([_, data]) => (data as any).displayName || 'Alguém');

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] pb-16 bg-slate-50">
      <div className="p-3 bg-white sticky top-0 z-10 border-b border-slate-200 flex flex-col gap-2">
        <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chat da Resenha</h2>
            <button
                onClick={() => setShowParticipants(!showParticipants)}
                className="text-[12px] font-bold text-brand hover:underline"
            >
                {showParticipants ? 'Ocultar' : 'Participantes'}
            </button>
        </div>
        
        {showParticipants && participants.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {participants.map(p => {
              const isOnline = presence[p.uid]?.online;
              return (
                <div key={p.uid} className="flex flex-col items-center gap-1 shrink-0 w-12" title={p.displayName || 'Usuário'}>
                  <div className="relative">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border-2", isOnline ? "border-green-500" : "border-transparent bg-slate-100")}>
                      {p.photoURL ? (
                        <img src={p.photoURL} alt={p.displayName || ''} className={cn("w-full h-full object-cover transition-all", !isOnline && "grayscale opacity-50")} referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white", isOnline ? "bg-green-500" : "bg-slate-300")} />
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 truncate w-full text-center">
                    {p.displayName ? p.displayName.split(' ')[0] : 'User'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-400">Nenhuma mensagem ainda.</p>
            <p className="text-[10px] font-medium text-slate-400 mt-1">Seja o primeiro a mandar aquela zoação!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.uid;
            return (
              <div id={`msg-${msg.id}`} key={msg.id} className={cn("flex gap-2 max-w-[85%] group transition-all duration-300 rounded-2xl p-1", isMe ? "ml-auto flex-row-reverse" : "")}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden mt-1">
                    {msg.userPhoto ? (
                      <img src={msg.userPhoto} alt={msg.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                )}
                <div className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {!isMe ? (
                      <span className="text-[9px] font-black text-slate-700">{msg.userName}</span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-500">Você</span>
                    )}
                    {renderUserBadges(msg.userId)}
                    {msg.createdAt && (
                      <span className="text-[7.5px] font-bold text-slate-400">
                        {format(msg.createdAt.toDate(), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  
                  <div className={cn("relative group/bubble flex items-center gap-2", isMe ? "flex-row-reverse" : "")}>
                    <div className={cn(
                      "opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1",
                      isMe ? "flex-row-reverse" : ""
                    )}>
                      <button 
                        onClick={() => {
                          setReplyToMessage(msg);
                          const input = document.querySelector('input[placeholder="Digite sua resenha..."]') as HTMLInputElement;
                          if (input) input.focus();
                        }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-brand hover:bg-slate-100 transition-colors"
                        title="Responder"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                      </button>
                      {isMe && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setNewMessage(msg.text);
                            }}
                            className="p-1.5 rounded-full text-slate-400 hover:text-brand hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setMessageToDelete(msg.id)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className={cn(
                      "px-3 py-2 rounded-2xl text-[12px] font-normal leading-relaxed max-w-full overflow-hidden shadow-sm",
                      isMe ? "bg-brand text-slate-900 rounded-tr-none" : "bg-white text-slate-900 rounded-tl-none",
                      msg.imageUrl ? "p-1" : ""
                    )}>
                      {msg.replyTo && (
                        <div 
                          className={cn(
                            "mb-1.5 text-[9px] rounded-lg p-1.5 border-l-2 text-left cursor-pointer transition-all hover:brightness-95 max-w-[220px]",
                            isMe ? "bg-slate-900/10 border-slate-900/40 text-slate-800" : "bg-slate-100 border-brand text-slate-600"
                          )}
                          onClick={() => {
                            const element = document.getElementById(`msg-${msg.replyTo?.id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              element.classList.add('bg-brand/20', 'ring-2', 'ring-brand', 'ring-offset-1');
                              setTimeout(() => element.classList.remove('bg-brand/20', 'ring-2', 'ring-brand', 'ring-offset-1'), 2000);
                            }
                          }}
                        >
                          <div className="font-extrabold text-[8px] mb-0.5 uppercase tracking-wider truncate">
                            {msg.replyTo.userName}
                          </div>
                          <div className="truncate text-[8.5px] line-clamp-1 italic">
                            "{msg.replyTo.text}"
                          </div>
                        </div>
                      )}

                      {msg.imageUrl && (
                        <div 
                          className="rounded-xl overflow-hidden mb-1 mx-auto max-w-[200px] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setFullscreenImage(msg.imageUrl || null)}
                        >
                          <img src={msg.imageUrl} alt="Zoação" className="w-full h-auto" loading="lazy" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      {msg.text && (
                        <div className={cn("break-words", msg.imageUrl ? "px-1 pb-0.5" : "")}>
                          {msg.text}
                          {editingMessageId === msg.id && " (Editando...)"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 bg-white border-t border-slate-100 fixed bottom-[72px] left-0 right-0 w-full max-w-lg mx-auto z-20 space-y-1">
        {/* Reply Indicator Preview */}
        {replyToMessage && (
          <div className="mx-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 text-[9px] font-bold text-slate-600 transition-all select-none animate-slide-up">
            <div className="flex items-center gap-1.5 truncate">
              <CornerUpLeft className="w-3 h-3 text-brand shrink-0" />
              <span className="truncate">
                Respondendo a <strong className="text-slate-950">{replyToMessage.userName}</strong>: <span className="font-medium text-slate-400 italic">"{replyToMessage.text || 'Mídia'}"</span>
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setReplyToMessage(null)}
              className="p-1 hover:bg-slate-200/50 rounded-full text-slate-400 hover:text-slate-600 shrink-0"
              title="Cancelar resposta"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Typers indicator */}
        {typers.length > 0 && (
          <div className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest animate-pulse ml-3 px-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-bounce" />
            <span>{typers.join(', ')} {typers.length === 1 ? 'está' : 'estão'} digitando...</span>
          </div>
        )}

        {/* Quick Taunts bar */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 px-2 border-b border-slate-100">
          {QUICK_TAUNTS.map((taunt) => (
            <button
              key={taunt}
              type="button"
              onClick={async () => {
                try {
                  await addDoc(collection(db, `pools/${poolId}/messages`), {
                    text: taunt,
                    userId: currentUser.uid,
                    userName: currentUser.displayName || 'Usuário',
                    userPhoto: currentUser.photoURL || null,
                    createdAt: serverTimestamp(),
                  });
                } catch (e) {
                  console.error(e);
                }
              }}
              className="shrink-0 px-2.5 py-1 bg-slate-50 hover:bg-brand/10 hover:border-brand/30 border border-slate-200/60 rounded-full text-[9px] font-black text-slate-500 hover:text-brand transition-all select-none shadow-sm uppercase tracking-wider"
            >
              {taunt}
            </button>
          ))}
        </div>

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full right-2 z-50 mb-3 shadow-2xl rounded-2xl overflow-hidden border border-slate-100">
             <div className="flex bg-white justify-between items-center px-3 py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Emojis</span>
                <button onClick={() => setShowEmojiPicker(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4"/></button>
             </div>
             <Picker onEmojiClick={onEmojiClick} autoFocusSearch={false} theme={"light" as any} height={350} width={300} />
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-full mx-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua resenha..."
              className="w-full bg-transparent px-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-slate-400 hover:text-brand"
            title="Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-1.5 bg-brand text-slate-900 rounded-full shrink-0 disabled:opacity-40 hover:bg-brand-hover transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {messageToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative border border-slate-100">
            <button 
              onClick={() => setMessageToDelete(null)}
              className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 text-center mb-2">
              Excluir Mensagem?
            </h2>
            <p className="text-sm font-medium text-slate-500 text-center mb-8">
              Tem certeza que deseja excluir esta mensagem? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="flex-1 py-4 bg-slate-50 text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(messageToDelete)}
                className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all text-sm shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <button 
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};
