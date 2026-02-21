'use client';

import React from 'react';
import { 
  ArrowLeft, Star, Calendar, BookOpen, Film, Plus, 
  Clock, Globe, Building2, Quote, PlayCircle, ImageIcon, ExternalLink, Users, X
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// --- Interfaces ---
export interface Review {
  author: string;
  content: string;
  rating?: number;
}

export interface MediaAsset {
  type: 'image' | 'video' | 'link';
  url: string;
  thumbnail?: string;
  title?: string;
  content?: string;
}

export interface ItemDetail {
  title: string;
  media_type: 'movie' | 'book';
  subtype?: string;
  year?: number;
  external_id: string;
  poster_path?: string;
  backdrop_path?: string;
  source: string;
  rating: number;
  notes?: string;
  overview?: string;
  genres: string[];
  cast: string[];
  directors: string[];
  authors: string[];
  public_rating?: number;
  runtime?: string;
  original_language?: string;
  spoken_languages?: string[];
  origin_country?: string;
  publisher?: string;
  production_companies?: string[];
  related_media?: MediaAsset[];
  reviews?: Review[];
}

interface StoryDetailsViewProps {
  item: ItemDetail;
  showAddButton?: boolean;
  onAddClick?: () => void;
  onBack?: () => void;
}

// --- Components ---

const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: any }) => (
  <h3 className="text-white font-sans font-bold text-lg md:text-xl mb-5 flex items-center gap-3 tracking-wide opacity-90">
    {Icon && <Icon size={18} className="text-accent-gold" />}
    <span className="border-b-2 border-accent-gold pb-1">{title}</span>
  </h3>
);

const InfoItem = ({ label, value, icon: Icon }: { label: string, value: string | React.ReactNode, icon?: any }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-widest text-text-desc font-bold opacity-60 flex items-center gap-1">
      {Icon && <Icon size={10} />} {label}
    </span>
    <div className="text-sm text-white/90 font-medium truncate font-sans">
      {value}
    </div>
  </div>
);

// --- Helpers ---

const genreMap: Record<string, string> = {
  // Movie Genres (Common English fallbacks)
  'Action': '動作',
  'Adventure': '冒險',
  'Animation': '動畫',
  'Comedy': '喜劇',
  'Crime': '犯罪',
  'Documentary': '紀錄片',
  'Drama': '劇情',
  'Family': '家庭',
  'Fantasy': '奇幻',
  'History': '歷史',
  'Horror': '恐怖',
  'Music': '音樂',
  'Mystery': '懸疑',
  'Romance': '愛情',
  'Science Fiction': '科幻',
  'TV Movie': '電視電影',
  'Thriller': '驚悚',
  'War': '戰爭',
  'Western': '西部',
  
  // Book Genres (Google Books common categories)
  'Fiction': '小說',
  'General': '一般',
  'Biography & Autobiography': '傳記',
  'Business & Economics': '商業經濟',
  'Computers': '電腦科學',
  'Cooking': '烹飪',
  'Education': '教育',
  'Health & Fitness': '健康健身',
  'History ': '歷史',
  'Juvenile Fiction': '青少年小說',
  'Juvenile Nonfiction': '青少年非小說',
  'Literary Collections': '文學選集',
  'Literary Criticism': '文學評論',
  'Mathematics': '數學',
  'Medical': '醫學',
  'Nature': '自然',
  'Philosophy': '哲學',
  'Poetry': '詩歌',
  'Political Science': '政治科學',
  'Psychology': '心理學',
  'Reference': '參考書',
  'Religion': '宗教',
  'Science': '科學',
  'Self-Help': '自助',
  'Social Science': '社會科學',
  'Sports & Recreation': '體育休閒',
  'Technology & Engineering': '科技工程',
  'Travel': '旅遊',
  'True Crime': '真實犯罪',
  'Young Adult Fiction': '青年小說'
};

const translateGenre = (genre: string) => {
  return genreMap[genre] || genre;
};

export default function StoryDetailsView({ item, showAddButton = true, onAddClick, onBack }: StoryDetailsViewProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // --- Data Preparation ---
  const languageDisplay = item.spoken_languages && item.spoken_languages.length > 0 
    ? item.spoken_languages.join(", ") 
    : item.original_language?.toUpperCase() || "未知";

  const productionDisplay = item.media_type === 'book' 
    ? item.publisher 
    : (item.production_companies && item.production_companies.length > 0 ? item.production_companies[0] : null); 

  // Combine Media
  const combinedMedia: MediaAsset[] = [];
  if (item.poster_path) {
    combinedMedia.push({ type: 'image', url: item.poster_path, thumbnail: item.poster_path, title: '海報' });
  }
  if (item.related_media) {
    combinedMedia.push(...item.related_media);
  }

  // Creator Display
  const creators = item.media_type === 'book' ? item.authors : item.directors;
  const creatorLabel = item.media_type === 'book' ? '作者' : '導演';

  // Translate Type
  let typeLabel = '未知';
  if (item.media_type === 'movie') typeLabel = '電影';
  else if (item.subtype === 'tv') typeLabel = '影集';
  else if (item.media_type === 'book') typeLabel = '書籍';

  // Ensure tags for books if genres are empty
  const displayGenres = item.genres.length > 0 ? item.genres : (item.media_type === 'book' ? ['書籍'] : []);

  return (
    <div className="min-h-screen bg-folio-black text-text-primary pb-40 font-sans antialiased selection:bg-accent-gold/30">
        
        {/* --- 1. Immersive Hero Section --- */}
        <div className="relative h-[70vh] w-full">
            {/* Clear Image with Gradient Overlay */}
            {item.backdrop_path ? (
                <>
                    <Image 
                        src={item.backdrop_path} 
                        alt={item.title} 
                        fill 
                        className="object-cover"
                        priority
                    />
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full h-[80%] bg-gradient-to-t from-folio-black via-folio-black/90 to-transparent pointer-events-none" />
                </>
            ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-folio-black" />
            )}
            
            <div className="absolute top-6 left-6 z-20">
                <button 
                  onClick={handleBack} 
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-black/20 p-3 rounded-full backdrop-blur-md group hover:bg-black/40 outline-none"
                >
                    {onBack ? <X size={24} className="group-hover:scale-110 transition-transform" /> : <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />}
                </button>
            </div>

            {/* Hero Content - Anchored at Bottom */}
            <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 pb-12 z-20">
                <div className="max-w-5xl mx-auto">
                    {/* Title */}
                    <h1 className="text-4xl md:text-7xl font-bold font-serif text-white leading-tight drop-shadow-2xl mb-4 tracking-tight">
                        {item.title}
                    </h1>

                    {/* Unified Meta Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-300 font-medium tracking-wide">
                        {item.year && <span>{item.year}</span>}
                        <span className="w-1 h-1 bg-accent-gold rounded-full opacity-60" />
                        
                        <span className="text-white">{typeLabel}</span>
                        <span className="w-1 h-1 bg-accent-gold rounded-full opacity-60" />
                        
                        {item.runtime && <span>{item.runtime}</span>}
                        {item.public_rating && (
                            <>
                                <span className="w-1 h-1 bg-accent-gold rounded-full opacity-60" />
                                <div className="flex items-center gap-1 text-accent-gold">
                                    <Star size={14} className="fill-accent-gold" />
                                    <span>{item.public_rating.toFixed(1)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Genres Row */}
                    <div className="flex flex-wrap gap-2 mt-5">
                        {displayGenres.map(g => (
                            <span key={g} className="text-[11px] font-bold tracking-widest text-gray-400 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm bg-black/20">
                                {translateGenre(g)}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* --- 2. Main Content --- */}
        <div className="max-w-5xl mx-auto px-6 md:px-12 mt-8 relative z-10 space-y-16">
            
            {/* Overview Section */}
            <section>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2">
                        <SectionHeader title="簡介" />
                        <p className="text-sm md:text-base text-gray-300 leading-7 font-sans tracking-wide whitespace-pre-wrap">
                            {item.overview || "尚無詳細簡介。"}
                        </p>
                    </div>
                    
                    {/* Quick Info Sidebar */}
                    <div className="bg-[#121212] rounded-xl p-6 border border-white/5 h-fit shadow-lg">
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-6">
                            {creators && creators.length > 0 && (
                                <InfoItem label={creatorLabel} value={creators.join(", ")} icon={Users} />
                            )}
                            {productionDisplay && (
                                <InfoItem label={item.media_type === 'book' ? '出版社' : '製作公司'} value={productionDisplay} icon={Building2} />
                            )}
                            {(languageDisplay) && (
                                <InfoItem label="語言" value={languageDisplay} icon={Globe} />
                            )}
                            {item.origin_country && (
                                <InfoItem label="發行地" value={item.origin_country} />
                            )}
                        </div>
                    </div>
                </div>
            </section>

             {/* Cast & Crew */}
             {item.media_type === 'movie' && item.cast && item.cast.length > 0 && (
                <section>
                    <SectionHeader title="卡司陣容" icon={Users} />
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                         {item.cast.slice(0, 15).map((c, i) => (
                            <span key={i} className="text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-default border-b border-transparent hover:border-accent-gold/50 pb-0.5 font-sans">
                                {c}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Media Gallery */}
            {combinedMedia.length > 0 && (
                <section>
                    <SectionHeader title="視聽素材" icon={ImageIcon} />
                    <div className="relative -mx-6 md:mx-0">
                        <div className="flex gap-4 overflow-x-auto px-6 md:px-0 pb-8 scrollbar-hide snap-x">
                            {combinedMedia.map((media, idx) => {
                                // Determine width class based on media type
                                let widthClass = 'w-72 md:w-96'; // Default (Video/Landscape)
                                if (media.type === 'image' && media.title === '海報') {
                                    widthClass = 'w-32 md:w-48';
                                } else if (media.type === 'link') {
                                    widthClass = 'w-40 md:w-56';
                                }

                                return (
                                    <div key={idx} className={`flex-none snap-center first:pl-0 ${widthClass}`}>
                                        {media.type === 'video' && (
                                            <a href={media.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video rounded-xl overflow-hidden group bg-[#121212] shadow-xl border border-white/5 hover:border-accent-gold/30 transition-all">
                                                <Image src={media.thumbnail || '/image/heroBackground.webp'} alt={media.title || 'Video'} fill className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-accent-gold group-hover:text-black transition-all">
                                                        <PlayCircle size={24} className="text-white group-hover:text-black fill-white/10" />
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-3 left-3 right-3 truncate text-xs font-bold text-white drop-shadow-md">
                                                    {media.title || '預告片'}
                                                </div>
                                            </a>
                                        )}
                                        {media.type === 'image' && (
                                            <div className={`relative rounded-xl overflow-hidden bg-[#121212] shadow-xl border border-white/5 group ${media.title === '海報' ? 'aspect-[2/3]' : 'aspect-video'}`}>
                                                <Image src={media.url} alt={media.title || 'Image'} fill className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider font-bold">{media.title}</span>
                                                </div>
                                            </div>
                                        )}
                                        {media.type === 'link' && (
                                            <a href={media.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center aspect-[3/4] rounded-xl border border-white/10 bg-[#121212] hover:bg-white/5 transition-colors p-4 gap-3 group text-center h-full relative overflow-hidden">
                                                <div className="absolute inset-0 bg-accent-gold/5 group-hover:bg-accent-gold/10 transition-colors" />
                                                <BookOpen size={28} className="text-accent-gold/80 group-hover:text-accent-gold group-hover:scale-110 transition-all relative z-10" />
                                                <span className="text-sm font-bold text-white relative z-10">{media.title || '試閱內容'}</span>
                                                <span className="text-[10px] text-text-desc flex items-center gap-1 relative z-10 border border-white/10 px-2 py-1 rounded-full bg-black/20">開啟 <ExternalLink size={8} /></span>
                                            </a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Reviews */}
            {item.reviews && item.reviews.length > 0 && (
                <section className="pb-12">
                    <SectionHeader title="精選評論" icon={Quote} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {item.reviews.slice(0, 4).map((review, idx) => (
                            <div key={idx} className="bg-[#121212] p-6 rounded-xl border border-white/5 hover:border-accent-gold/30 transition-colors group">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-bold text-white text-sm font-sans tracking-wide">{review.author}</span>
                                    {review.rating && (
                                        <span className="flex items-center gap-1 text-xs text-accent-gold bg-accent-gold/10 px-2 py-1 rounded-md font-bold">
                                            <Star size={10} className="fill-accent-gold" /> {review.rating}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 group-hover:text-gray-300 transition-colors font-sans">
                                    "{review.content}"
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        {/* --- 3. Fixed Bottom Action (Conditional) --- */}
        {showAddButton && (
            <div className="fixed bottom-0 left-0 w-full z-40 h-32 pointer-events-none flex flex-col justify-end">
                <div className="absolute inset-0 bg-gradient-to-t from-folio-black via-folio-black/95 to-transparent" />
                <div className="relative w-full p-6 pb-8 flex justify-center pointer-events-auto">
                    <button 
                        onClick={onAddClick}
                        className="bg-accent-gold text-folio-black px-12 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_25px_rgba(233,108,38,0.4)] flex items-center gap-3 text-sm md:text-base group"
                    >
                        <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                        加入收藏
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
