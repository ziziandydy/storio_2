'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Search, Loader2, ArrowLeft, Bookmark, Film, BookOpen, Ticket, X, ArrowUp, Sparkles } from 'lucide-react';
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

  // We use uncontrolled input for the search field to avoid CJK composition issues
  // query state is still used for triggering the search via debouncedQuery
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<'movie' | 'book' | 'tv'>(initialFilter);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchModeIndex, setSearchModeIndex] = useState<number>(3); // Start at middle block: 0, 1, 2, [3, 4, 5], 6, 7, 8
  const searchMode = searchModeIndex % 3 as 0 | 1 | 2; // Actual mode for logic (0: Auto, 1: AI, 2: Keyword)
  const touchStartX = useRef<number>(0);

  // Semantic Intent Detection (Auto Mode)
  const isSemanticQuery = (q: string) => /怎麼|什麼|關於|想要|推薦|年代|哪部|哪一|有沒有|.*的.*/.test(q) || q.length > 12;
  const isAutoSemantic = searchMode === 0 && isSemanticQuery(query);
  const actualSearchMode = searchMode === 0 ? (isAutoSemantic ? 1 : 2) : searchMode;
  const isAiSearch = searchMode === 1 || isAutoSemantic;
  const { token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  // Add To Folio Modal State
  const [selectedStory, setSelectedStory] = useState<StoryResult | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Sync input value with URL param on mount/update if needed
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== initialQuery) {
      inputRef.current.value = initialQuery;
      setQuery(initialQuery); // Sync state for clear button visibility
    }
  }, [initialQuery]);

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
    if (debouncedQuery) params.set('q', debouncedQuery);

    router.replace(`/search?${params.toString()}`, { scroll: false });
  }, [filter, router]);

  // Handle Search Submit
  const handleSubmit = (e?: React.FormEvent | React.KeyboardEvent | React.MouseEvent) => {
    // Ignore keyboard events that aren't Enter
    if (e && 'key' in e && e.key !== 'Enter') return;

    // Ignore composition events (when user is selecting CJK characters via Enter)
    if (e && 'nativeEvent' in e && (e.nativeEvent as any).isComposing) return;

    e?.preventDefault();
    inputRef.current?.blur(); // Dismiss keyboard

    const currentVal = inputRef.current?.value || '';
    setQuery(currentVal);
    setDebouncedQuery(currentVal);

    const params = new URLSearchParams(searchParams.toString());
    if (currentVal) params.set('q', currentVal);
    else params.delete('q');
    params.set('filter', filter);

    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  // Handle Clear
  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    setQuery('');
    setDebouncedQuery('');
    // Optionally trigger search or just clear
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
        let res;
        if (isAiSearch) {
          // AI Search Endpoint
          res = await fetch(getApiUrl(`/api/v1/search/ai`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': language
            },
            body: JSON.stringify({
              query: debouncedQuery,
              media_type: filter === 'movie' || filter === 'tv' ? filter : 'book' // or 'all'
            })
          });
        } else {
          // Standard Search Endpoint
          res = await fetch(getApiUrl(`/api/v1/search/?q=${encodeURIComponent(debouncedQuery)}`), {
            headers: {
              'Accept-Language': language
            }
          });
        }

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
        return { status: 'duplicate' };
      }

      if (res.status === 403) {
        return { status: 'capacity_reached' };
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
      {/* Loading Overlay */}
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

      {loading && isAiSearch && !authLoading && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-32 h-32">
              <Image
                src="/image/loading.gif"
                alt="Loading AI..."
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="bg-gradient-to-r from-[#4285f4] to-[#9b72cb] text-transparent bg-clip-text font-bold tracking-[0.2em] uppercase text-xs animate-pulse">Consulting the archival spirits...</p>
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
      <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-8 pt-20 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d] via-65% to-transparent pointer-events-none">
        <div className="max-w-md mx-auto flex flex-col gap-4 pointer-events-auto">
          {/* Segmented Control */}
          <div className="w-full bg-folio-card/80 backdrop-blur-xl p-1 rounded-full border border-white/10 flex relative overflow-hidden shadow-2xl">
            <div
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-accent-gold rounded-full transition-all duration-300 ease-out ${filter === 'book' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                }`}
            />
            <button
              onClick={() => setFilter('movie')}
              className={`flex-1 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors relative z-10 ${filter === 'movie' ? 'text-folio-black' : 'text-text-desc hover:text-white'
                }`}
            >
              {t.search.tabs.movies} / {t.search.tabs.tv}
            </button>
            <button
              onClick={() => setFilter('book')}
              className={`flex-1 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors relative z-10 ${filter === 'book' ? 'text-folio-black' : 'text-text-desc hover:text-white'
                }`}
            >
              {t.search.tabs.books}
            </button>
          </div>

          {/* Search Input Carousel */}
          <div
            className="relative w-full overflow-hidden py-2"
            onTouchStart={(e) => touchStartX.current = e.changedTouches[0].screenX}
            onTouchEnd={(e) => {
              const touchEndX = e.changedTouches[0].screenX;
              if (touchEndX < touchStartX.current - 40) { // Swipe Left (Next)
                setSearchModeIndex(prev => {
                  const next = prev + 1;
                  if (next >= 8) {
                    setTimeout(() => setSearchModeIndex(4), 300); // 4 is AI in the middle set
                  }
                  return next;
                });
              }
              if (touchEndX > touchStartX.current + 40) { // Swipe Right (Prev)
                setSearchModeIndex(prev => {
                  const next = prev - 1;
                  if (next <= 0) {
                    setTimeout(() => setSearchModeIndex(4), 300); // Back to middle
                  }
                  return next;
                });
              }
            }}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(3% - ${searchModeIndex * 88}%))` }}
            >

              {/* Generate 3 sets of the 3 slides for infinite looping effect */}
              {[0, 1, 2].map((setIndex) => (
                <React.Fragment key={`set-${setIndex}`}>
                  {/* Slide 0: Auto (Index: setIndex * 3 + 0) */}
                  <div
                    className={`w-[88%] shrink-0 pr-2 transition-all duration-300 ${searchModeIndex === setIndex * 3 + 0 ? 'opacity-100' : 'opacity-90 cursor-pointer'}`}
                    onClick={() => searchModeIndex !== setIndex * 3 + 0 && setSearchModeIndex(setIndex * 3 + 0)}
                  >
                    <div className={`relative flex items-center bg-[#121212] rounded-full px-3 py-3 w-full transition-transform duration-300 border-auto-breathe ${searchModeIndex === setIndex * 3 + 0 ? 'scale-100 translate-y-0' : 'scale-[0.95] translate-y-[2px]'}`}>
                      <span className="absolute -top-[7px] left-6 bg-[#121212] px-2 text-[10px] text-accent-gold uppercase tracking-wider font-semibold z-10 leading-none">Auto</span>

                      <input
                        ref={searchModeIndex === setIndex * 3 + 0 ? inputRef : null}
                        type="text"
                        placeholder={searchModeIndex === setIndex * 3 + 0 ? "Recall a story..." : "Auto Mode"}
                        disabled={searchModeIndex !== setIndex * 3 + 0}
                        defaultValue={searchModeIndex === setIndex * 3 + 0 ? initialQuery : ''}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleSubmit}
                        className="bg-transparent border-none outline-none w-full text-zinc-200 placeholder-zinc-600 text-base pl-1"
                      />

                      {searchModeIndex === setIndex * 3 + 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                          {query && !loading && (
                            <button onClick={handleClear} className="text-text-desc hover:text-white bg-white/5 rounded-full p-2 hover:bg-white/10 transition-all"><X size={16} /></button>
                          )}
                          {loading && <div className="p-2"><Loader2 className="text-accent-gold animate-spin" size={20} /></div>}
                          <button
                            onClick={handleSubmit}
                            className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full transition-all ${loading ? 'bg-white/5 text-text-desc' : 'bg-accent-gold text-folio-black hover:bg-white hover:scale-105 active:scale-95 shadow-lg'}`}
                          >
                            <ArrowUp size={20} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      {searchModeIndex !== setIndex * 3 + 0 && (
                        <button disabled className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full cursor-pointer bg-white/5 text-accent-gold/50 absolute right-2">
                          <ArrowUp size={20} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slide 1: AI Search (Index: setIndex * 3 + 1) */}
                  <div
                    className={`w-[88%] shrink-0 pr-2 transition-all duration-300 ${searchModeIndex === setIndex * 3 + 1 ? 'opacity-100' : 'opacity-90 cursor-pointer'}`}
                    onClick={() => searchModeIndex !== setIndex * 3 + 1 && setSearchModeIndex(setIndex * 3 + 1)}
                  >
                    <div className={`relative w-full transition-transform duration-300 ai-gradient-border ${searchModeIndex === setIndex * 3 + 1 ? 'scale-100 translate-y-0' : 'scale-[0.95] translate-y-[2px]'}`}>
                      <div className="absolute -top-[7px] left-6 bg-[#121212] px-2 z-10 leading-none flex items-center rounded-full">
                        <span className="text-[10px] bg-gradient-to-r from-[#4285f4] to-[#9b72cb] text-transparent bg-clip-text uppercase tracking-wider font-semibold">✨ AI Search</span>
                      </div>
                      <div className={`relative flex items-center bg-[#121212] rounded-full px-3 py-[11px] w-full ${searchModeIndex !== setIndex * 3 + 1 ? 'bg-gradient-to-r from-[#4285f4]/5 to-[#9b72cb]/5' : ''}`}>

                        <input
                          ref={searchModeIndex === setIndex * 3 + 1 ? inputRef : null}
                          type="text"
                          placeholder={searchModeIndex === setIndex * 3 + 1 ? "Describe the vibe or plot..." : "AI Search Mode"}
                          disabled={searchModeIndex !== setIndex * 3 + 1}
                          defaultValue={searchModeIndex === setIndex * 3 + 1 ? initialQuery : ''}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyDown={handleSubmit}
                          className="bg-transparent border-none outline-none w-full text-zinc-200 placeholder-zinc-500 text-base pl-1"
                        />

                        {searchModeIndex === setIndex * 3 + 1 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                            {query && !loading && (
                              <button onClick={handleClear} className="text-text-desc hover:text-white bg-white/5 rounded-full p-2 hover:bg-white/10 transition-all"><X size={16} /></button>
                            )}
                            {loading && <div className="p-2"><Loader2 className="text-[#9b72cb] animate-spin" size={20} /></div>}
                            <button
                              onClick={handleSubmit}
                              className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full transition-all ${loading ? 'bg-white/5 text-text-desc' : 'bg-gradient-to-tr from-[#9b72cb] to-[#4285f4] text-white hover:brightness-110 hover:scale-105 active:scale-95 shadow-lg'}`}
                            >
                              <ArrowUp size={20} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                        {searchModeIndex !== setIndex * 3 + 1 && (
                          <button disabled className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full cursor-pointer bg-gradient-to-tr from-[#9b72cb]/20 to-[#4285f4]/20 text-[#9b72cb]/80 absolute right-2">
                            <ArrowUp size={20} strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Slide 2: Keyword Match (Index: setIndex * 3 + 2) */}
                  <div
                    className={`w-[88%] shrink-0 pr-2 transition-all duration-300 ${searchModeIndex === setIndex * 3 + 2 ? 'opacity-100' : 'opacity-90 cursor-pointer'}`}
                    onClick={() => searchModeIndex !== setIndex * 3 + 2 && setSearchModeIndex(setIndex * 3 + 2)}
                  >
                    <div className={`relative flex items-center bg-[#121212] rounded-full px-3 py-3 border border-zinc-500 w-full transition-transform duration-300 ${searchModeIndex === setIndex * 3 + 2 ? 'scale-100 translate-y-0' : 'scale-[0.95] translate-y-[2px]'}`}>
                      <span className={`absolute -top-[7px] left-6 bg-[#121212] px-2 text-[10px] uppercase tracking-wider font-semibold z-10 leading-none ${searchModeIndex === setIndex * 3 + 2 ? 'text-zinc-400' : 'text-zinc-600'}`}>Keyword Match</span>

                      <input
                        ref={searchModeIndex === setIndex * 3 + 2 ? inputRef : null}
                        type="text"
                        placeholder={searchModeIndex === setIndex * 3 + 2 ? "Name, Author, or Director..." : "Keyword Mode"}
                        disabled={searchModeIndex !== setIndex * 3 + 2}
                        defaultValue={searchModeIndex === setIndex * 3 + 2 ? initialQuery : ''}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleSubmit}
                        className="bg-transparent border-none outline-none w-full text-zinc-200 placeholder-zinc-600 text-base pl-1"
                      />

                      {searchModeIndex === setIndex * 3 + 2 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                          {query && !loading && (
                            <button onClick={handleClear} className="text-text-desc hover:text-white bg-white/5 rounded-full p-2 hover:bg-white/10 transition-all"><X size={16} /></button>
                          )}
                          {loading && <div className="p-2"><Loader2 className="text-zinc-400 animate-spin" size={20} /></div>}
                          <button
                            onClick={handleSubmit}
                            className={`flex items-center justify-center w-10 h-10 shrink-0 rounded-full transition-all ${loading ? 'bg-white/5 text-text-desc' : 'bg-accent-gold text-folio-black hover:bg-white hover:scale-105 active:scale-95 shadow-lg'}`}
                          >
                            <ArrowUp size={20} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                      {searchModeIndex !== setIndex * 3 + 2 && (
                        <button disabled className="flex items-center justify-center w-10 h-10 shrink-0 rounded-full cursor-pointer bg-white/5 text-zinc-600 absolute right-2">
                          <ArrowUp size={20} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              ))}

            </div>
          </div>
          <p className="text-[10px] text-zinc-600 text-center -mt-2 mb-2 pointer-events-none">滑動或點擊邊緣切換搜尋模式</p>
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