'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Search, Loader2, ArrowLeft, Bookmark, Film, BookOpen, Ticket } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import StoryCard from '@/components/StoryCard';
import AddToFolioModal from '@/components/AddToFolioModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ToastProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { getApiUrl } from '@/lib/api';

// 定義與後端一致的型別
interface StoryResult {
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  external_id: string;
  poster_path?: string;
  source: string;
  subtype?: string;
  year?: number;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL params
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = (searchParams.get('filter') as 'movie' | 'book' | 'tv') || 'movie';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<'movie' | 'book' | 'tv'>(initialFilter);
  const { token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  
  // Add To Folio Modal State
  const [selectedStory, setSelectedStory] = useState<StoryResult | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter results based on category
  const filteredResults = results.filter(item => {
    if (filter === 'movie' || filter === 'tv') {
      return item.media_type === 'movie' || item.media_type === 'tv';
    }
    return item.media_type === filter;
  });

  // Sync URL when filter changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('filter', filter);
    // Preserve existing query if present in state, but don't overwrite if not submitting
    if (debouncedQuery) params.set('q', debouncedQuery);
    
    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [filter, router]); // Remove query dependency

  // Handle Search Submit
  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    e?.preventDefault();
    
    setDebouncedQuery(query);
    
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set('q', query);
    else params.delete('q');
    params.set('filter', filter);
    
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  // Fetch logic
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        if (debouncedQuery === '') setResults([]); // Clear results only if query is cleared
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(getApiUrl(`/api/v1/search/?q=${encodeURIComponent(debouncedQuery)}`), {
          headers: {
            'Accept-Language': language
          }
        });
        if (!res.ok) {
            console.error("Search API returned non-OK status");
            setResults([]);
            return;
        }
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const openAddModal = (item: StoryResult) => {
    setSelectedStory(item);
    setIsAddModalOpen(true);
  };

  const handleAddToFolio = async (rating: number, notes: string, date?: string) => {
    if (!selectedStory || !token) return;

    try {
      const res = await fetch(getApiUrl('/api/v1/collection/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...selectedStory,
          rating,
          notes,
          created_at: date ? new Date(date).toISOString() : undefined
        })
      });

      if (res.status === 409) {
        throw new Error("You have already collected this story.");
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to add item');
      }

      // Success handled by Modal
    } catch (error: any) {
      throw error; // Propagate to Modal
    }
  };

  return (
    <div className="min-h-screen bg-folio-black flex flex-col relative">
      {/* Auth Loading Overlay */}
      {authLoading && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48">
              <Image 
                src="/image/loading.gif" 
                alt="Loading..." 
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="text-accent-gold font-bold tracking-[0.3em] uppercase text-xs animate-pulse">Consulting the Folio...</p>
          </div>
        </div>
      )}

      {/* Top Header - Minimal Back Button */}
      <header className="fixed top-0 left-0 right-0 z-30 p-6 flex justify-between items-center bg-gradient-to-b from-folio-black/90 to-transparent pointer-events-none">
        <Link href="/" className="pointer-events-auto text-text-desc hover:text-white transition-colors bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/5 hover:bg-white/10">
          <ArrowLeft size={20} />
        </Link>
        <Link href="/collection" className="pointer-events-auto text-[10px] font-bold tracking-[0.2em] uppercase text-text-desc hover:text-accent-gold transition-colors bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/5 hover:bg-white/10">
          {t.home.myFolio}
        </Link>
      </header>

      {/* Results Area */}
      <main className="flex-grow max-w-container-max mx-auto w-full p-6 pt-24 pb-48">
        {!debouncedQuery && (
          <div className="flex flex-col items-center justify-center h-[60vh] select-none pointer-events-none">
            {/* Minimal Horizon Layout */}
            <div className="flex items-center gap-6 text-white/20 mb-6">
                <Film size={32} strokeWidth={1} />
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <BookOpen size={32} strokeWidth={1} />
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <Ticket size={32} strokeWidth={1} />
            </div>
            
            <h2 className="text-3xl font-serif text-white/40 tracking-wide font-bold">
              Find the stories here
            </h2>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
            {filteredResults.map((item) => (
              <StoryCard 
                key={`${item.source}-${item.external_id}`}
                external_id={item.external_id}
                title={item.title}
                type={item.media_type}
                subtype={item.subtype}
                year={item.year}
                source={item.source}
                posterUrl={item.poster_path}
                onAdd={() => openAddModal(item)}
              />
            ))}
          </div>
        )}
        
        {debouncedQuery && !loading && filteredResults.length === 0 && (
          <div className="text-center text-text-desc mt-20 flex flex-col items-center">
            <div className="w-12 h-px bg-folio-outline mb-6"></div>
            <p className="tracking-widest uppercase text-xs">{t.search.noResults}</p>
          </div>
        )}
      </main>

      {/* Sticky Bottom Search Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-8 pt-6 bg-gradient-to-t from-folio-black via-folio-black/95 to-transparent">
        <div className="max-w-md mx-auto flex flex-col gap-4">
          {/* Segmented Control */}
          <div className="w-full bg-folio-card/80 backdrop-blur-xl p-1 rounded-full border border-white/10 flex relative overflow-hidden shadow-2xl">
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent-gold rounded-full transition-all duration-300 ease-out ${
                filter === 'book' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
              }`}
            />
            <button
              onClick={() => setFilter('movie')}
              className={`flex-1 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors relative z-10 ${
                filter === 'movie' ? 'text-folio-black' : 'text-text-desc hover:text-white'
              }`}
            >
              {t.search.tabs.movies} / {t.search.tabs.tv}
            </button>
            <button
              onClick={() => setFilter('book')}
              className={`flex-1 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors relative z-10 ${
                filter === 'book' ? 'text-folio-black' : 'text-text-desc hover:text-white'
              }`}
            >
              {t.search.tabs.books}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative group w-full">
            <div className="absolute inset-0 bg-accent-gold/5 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <button 
              onClick={(e) => handleSubmit(e)}
              className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors z-10 ${loading ? 'text-accent-gold animate-pulse' : 'text-text-desc hover:text-white group-focus-within:text-accent-gold'}`}
            >
              <Search size={20} />
            </button>
            <input 
              type="text" 
              placeholder={t.search.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSubmit}
              className="w-full bg-folio-card/80 backdrop-blur-md hover:bg-folio-card focus:bg-black border border-white/10 focus:border-accent-gold/50 rounded-full py-4 pl-16 pr-14 text-base text-white placeholder:text-text-desc/50 focus:outline-none focus:ring-4 focus:ring-accent-gold/10 transition-all shadow-xl relative z-0"
              autoFocus
            />
            {loading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10">
                <Loader2 className="text-accent-gold animate-spin" size={20} />
              </div>
            )}
            {query && !loading && (
                <button 
                    onClick={() => setQuery('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-text-desc hover:text-white bg-white/5 rounded-full p-1 hover:bg-white/20 transition-all"
                >
                    <ArrowLeft size={14} className="rotate-45" /> {/* Use X icon ideally, reusing Arrow for now or import X */}
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Add To Folio Modal */}
      {selectedStory && (
        <AddToFolioModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSave={handleAddToFolio} 
          onViewDetails={(id) => {
            if (id) {
              router.push(`/collection/${id}`);
            } else {
              router.push(`/details/${selectedStory.media_type}/${selectedStory.external_id}`);
            }
          }}
          title={selectedStory.title} 
          external_id={selectedStory.external_id}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-folio-black" />}>
      <SearchContent />
    </Suspense>
  );
}