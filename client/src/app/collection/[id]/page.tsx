'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Star, Loader2, Film, Book as BookIcon, Calendar, Trash2, Edit3, MessageSquarePlus, Info, Quote, ChevronRight, Tv } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { getApiUrl } from '@/lib/api';
import { ItemDetail } from '@/types';
import StoryDetailsView from '@/components/StoryDetailsView';
import RateAndReflectForm from '@/components/RateAndReflectForm';
import ShareModal from '@/components/ShareModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { Share2 } from 'lucide-react';

interface CollectionItem {
  id: string;
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  external_id: string;
  poster_path?: string;
  source: string;
  rating: number;
  notes?: string;
  created_at: string;
  viewing_number: number;
  year?: number;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { t, formatDate } = useTranslation();
  const { language } = useSettingsStore();
  
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  
  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [detailsItem, setDetailsItem] = useState<ItemDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      if (authLoading) return;
      if (!token) return;

      try {
        const res = await fetch(getApiUrl(`/api/v1/collection/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setItem(data);
        } else {
          router.push('/collection');
        }
      } catch (error) {
        console.error("Failed to fetch item:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, token, authLoading, router]);

  const handleUpdate = async (newRating: number, newNotes: string) => {
    if (!token || !item) return;
    
    try {
      const res = await fetch(getApiUrl(`/api/v1/collection/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: newNotes,
          rating: newRating
        })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setItem(updated);
        setIsEditing(false);
        showToast(t.common.confirm);
      }
    } catch (error) {
      console.error("Failed to save memory:", error);
      showToast(t.common.error, "error");
    }
  };

  const handleArchive = () => {
    setIsDeleteModalOpen(true);
    setDeleteInput('');
  };

  const confirmDelete = async () => {
    if (!token || !item) return;
    if (deleteInput.toUpperCase() !== 'REMOVE') return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/collection/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        showToast(t.common.delete);
        router.push('/collection');
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      showToast(t.common.error, "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleViewDetails = async () => {
    if (!item) return;
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    try {
      const res = await fetch(getApiUrl(`/api/v1/details/${item.media_type}/${item.external_id}`));
      if (res.ok) {
        const data = await res.json();
        setDetailsItem(data);
      }
    } catch (error) {
      console.error("Error fetching external details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
                <Image 
                    src="/image/loading.gif" 
                    alt="Loading..." 
                    fill
                    className="object-contain"
                    unoptimized
                    priority
                />
            </div>
            <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-folio-black text-text-primary relative font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-folio-black/90 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/collection" className="flex items-center gap-2 text-text-desc hover:text-accent-gold transition-colors text-xs font-bold tracking-widest uppercase">
            <ArrowLeft size={18} />
            {t.common.back}
          </Link>
          
          <div className="flex items-center gap-3">
             <div className="text-[10px] font-black tracking-widest uppercase text-accent-gold/60 border border-accent-gold/20 px-3 py-1 rounded-full">
                {getOrdinal(item.viewing_number).toUpperCase()} {t.collection.card.view}
             </div>
             <button 
                onClick={() => setIsShareModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold text-folio-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(233,108,38,0.4)] hover:scale-105 active:scale-95"
             >
                <Share2 size={12} />
                {t.details.share}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            <div className="relative group">
                <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#121212] transition-transform duration-500 group-hover:scale-[1.02]">
                {item.poster_path ? (
                    <img src={item.poster_path} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-desc bg-white/5">
                        {item.media_type === 'movie' ? <Film size={48} strokeWidth={1}/> : item.media_type === 'tv' ? <Tv size={48} strokeWidth={1}/> : <BookIcon size={48} strokeWidth={1}/>}
                    </div>
                )}
                </div>
            </div>
            
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center gap-4 text-text-secondary">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-accent-gold">
                    {item.media_type === 'movie' ? <Film size={20} /> : item.media_type === 'tv' ? <Tv size={20} /> : <BookIcon size={20} />}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-desc">Category</span>
                    <span className="text-sm font-bold text-white capitalize">
                      {item.media_type === 'movie' ? t.common.movies : item.media_type === 'tv' ? t.common.tv : t.common.books}
                    </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-text-secondary">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-accent-gold">
                    <Calendar size={20} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-text-desc">Archived On</span>
                    <span className="text-sm font-bold text-white">
                        {formatDate(item.created_at)}
                    </span>
                </div>
              </div>
            </div>

            <button 
                onClick={handleViewDetails}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-white/10 hover:border-accent-gold/50 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest text-text-desc hover:text-white group"
            >
                <Info size={16} className="text-accent-gold/50 group-hover:text-accent-gold transition-colors" />
                {t.modals.viewDetails}
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            <header>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-white leading-tight mb-4">
                {item.title}
              </h1>
              <div className="flex items-center gap-4">
                <div className="h-1 w-16 bg-accent-gold rounded-full"></div>
                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-accent-gold opacity-60">A Memory Preserved</span>
              </div>
            </header>

            {/* Past Memories Section */}
            {(item as any).related_instances && (item as any).related_instances.length > 1 && (
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-desc opacity-60">Memory Timeline</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                        {((item as any).related_instances as any[]).map((inst) => {
                            const isCurrent = inst.id === item.id;
                            return (
                                <Link 
                                    key={inst.id}
                                    href={`/collection/${inst.id}`}
                                    className={`flex-none w-40 p-4 rounded-xl border transition-all group ${ 
                                        isCurrent 
                                            ? 'bg-accent-gold/10 border-accent-gold cursor-default' 
                                            : 'bg-[#121212] border-white/5 hover:border-white/20 hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ 
                                            isCurrent ? 'bg-accent-gold text-black' : 'bg-white/10 text-text-desc'
                                        }`}>
                                            {getOrdinal(inst.viewing_number)} View
                                        </span>
                                        {inst.rating > 0 && (
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-accent-gold">
                                                <Star size={10} className="fill-accent-gold" /> {inst.rating}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-text-desc font-mono">
                                        {formatDate(inst.created_at)}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {isEditing ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <RateAndReflectForm 
                        initialRating={item.rating}
                        initialNotes={item.notes || ''}
                        title={item.title}
                        onSave={handleUpdate}
                        onCancel={() => setIsEditing(false)}
                    />
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative group cursor-pointer"
                    onClick={() => setIsEditing(true)}
                >
                    {/* Archival Card Style */}
                    <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col">
                        
                        {/* Stamp Rating (Top Right) */}
                        <div className="absolute top-8 right-8 z-10">
                            <div className="relative">
                                <motion.div 
                                    initial={{ scale: 1.5, opacity: 0, rotate: -20 }}
                                    animate={{ scale: 1, opacity: 1, rotate: -15 }}
                                    className="border-4 border-accent-gold/40 rounded-xl px-4 py-2 flex flex-col items-center justify-center transform -rotate-12 backdrop-blur-sm"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold/60 mb-1">Score</span>
                                    <span className="text-4xl font-serif font-black text-accent-gold">
                                        {item.rating || '—'}
                                    </span>
                                </motion.div>
                            </div>
                        </div>

                        {/* Card Content - Lined Paper Effect */}
                        <div className={`p-10 pt-16 flex-grow flex flex-col ${item.notes ? 'gap-6' : 'gap-4 justify-center'} relative`}>
                            
                            <div className="flex items-center gap-3 opacity-40 mb-2">
                                <MessageSquarePlus size={16} className="text-accent-gold" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Personal Archive</span>
                            </div>

                            {item.notes ? (
                                <div className="space-y-0 flex-grow">
                                    {item.notes.split('\n').map((line, idx) => (
                                        <p key={idx} className="text-lg text-gray-200 leading-[1.8] font-roboto border-b border-white/5 py-2 min-h-[3rem]">
                                            {line}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-grow flex flex-col items-center justify-center space-y-8 opacity-20 group-hover:opacity-60 transition-all duration-500">
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="p-6 rounded-full bg-white/5 border border-white/10 shadow-inner">
                                            <Edit3 size={40} strokeWidth={1} className="text-accent-gold" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs uppercase tracking-[0.4em] font-black text-white mb-2">{language === 'zh-TW' ? "紀錄你的感悟" : "Inscribe your thoughts"}</p>
                                            <p className="text-[10px] text-text-desc max-w-[200px] leading-relaxed">
                                                {language === 'zh-TW' ? "點擊以添加你的私人感悟與評分" : "Tap to add your personal reflections and score."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full space-y-4 opacity-50">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="border-b border-white/5 h-8 w-full" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Card Footer */}
                        <div className="p-8 pt-0 flex justify-between items-center opacity-30">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                                <span className="text-[10px] font-medium uppercase tracking-widest font-mono">FOLIO_REF_{item.id.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-bold uppercase tracking-widest">{t.common.inscribe}</span>
                                <Edit3 size={14} className="group-hover:text-accent-gold transition-colors" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
          </div>
        </div>

        {/* Danger Zone: Delete at the bottom */}
        {!isEditing && (
            <div className="mt-32 pt-12 border-t border-white/5 flex flex-col items-center gap-6 pb-20 opacity-40 hover:opacity-100 transition-opacity">
                <div className="text-center">
                    <h4 className="text-white font-bold text-sm mb-1">{language === 'zh-TW' ? "歸檔此記憶？" : "Archive this Memory?"}</h4>
                    <p className="text-text-desc text-[10px] uppercase tracking-widest opacity-60">This will permanently remove it from your personal Storio.</p>
                </div>
                <button 
                    onClick={handleArchive}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-8 py-3 rounded-full border border-red-500/20 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/50 transition-all text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-30"
                >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {t.details.remove}
                </button>
            </div>
        )}
      </main>
      
      <div className="h-12 md:hidden"></div>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsDetailsOpen(false)}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />
                
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 bg-folio-black overflow-y-auto"
                >
                    {loadingDetails ? (
                        <div className="h-full flex items-center justify-center bg-black">
                            <div className="flex flex-col items-center gap-6">
                                <div className="relative w-32 h-32">
                                    <Image 
                                        src="/image/loading.gif" 
                                        alt="Loading..." 
                                        fill
                                        className="object-contain"
                                        unoptimized
                                        priority
                                    />
                                </div>
                                <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">{t.common.loading}</p>
                            </div>
                        </div>
                    ) : detailsItem ? (
                        <StoryDetailsView 
                            item={detailsItem} 
                            showAddButton={false} 
                            onBack={() => setIsDetailsOpen(false)} 
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-red-500 gap-4 bg-black">
                            <p>{t.common.error}</p>
                            <button onClick={() => setIsDetailsOpen(false)} className="text-white hover:text-accent-gold underline">{t.common.back}</button>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />
                
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-sm bg-folio-card border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col gap-6"
                >
                    <div className="flex flex-col gap-2 text-center">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-2 text-red-500">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-white font-serif">{t.details.remove}?</h3>
                        <p className="text-sm text-text-desc leading-relaxed">
                            This action cannot be undone. To confirm, please type <span className="font-bold text-white">REMOVE</span> below.
                        </p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <input 
                            type="text" 
                            placeholder="Type REMOVE"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors tracking-widest font-bold uppercase"
                            autoFocus
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="py-3 rounded-xl border border-white/10 hover:bg-white/5 text-text-desc hover:text-white font-bold text-xs uppercase tracking-widest transition-all"
                            >
                                {t.common.cancel}
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={deleteInput.toUpperCase() !== 'REMOVE' || isDeleting}
                                className="py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : null}
                                {t.common.confirm}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      {item && (
        <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={t.details.share}
            fileName={`storio-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            item={{
                title: item.title,
                year: item.year || new Date(item.created_at).getFullYear(),
                posterPath: item.poster_path || '',
                rating: item.rating / 2, // 10分制轉為5星制
                reflection: item.notes,
                type: item.media_type,
                page_count: (item as any).page_count // 可能存在於 metadata 中
            }}
        />
      )}
    </div>
  );
}