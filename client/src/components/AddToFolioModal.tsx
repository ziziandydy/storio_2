'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle2, Bookmark, ExternalLink,
  Plus, History, MessageSquare, Star, ArrowRight,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import RateAndReflectForm from './RateAndReflectForm';
import GuestLimitModal from './GuestLimitModal';
import { useTranslation } from '@/hooks/useTranslation';
import { getApiUrl } from '@/lib/api';

import { useToast } from '@/components/ToastProvider';
import { recordEngagement } from '@/lib/notifications';
import { isNativePlatform } from '@/lib/appleAuth';
import { emitStoryAdded } from '@/lib/notification-events';
import { useUserStore } from '@/store/userStore';
import FirstCollectCelebration from './FirstCollectCelebration';
import GuestSaveCard from './GuestSaveCard';
import { armReviewPrompt, flushReviewPrompt } from '@/lib/reviewPrompt';

/** 第一部且為訪客：慶祝播完後切換為訪客卡的延遲（毫秒） */
const GUEST_CARD_SWITCH_MS = 3500;

type SuccessVariant = 'celebrate' | 'guest' | 'simple';

/**
 * 依 POST 回應的 total_count 與是否為訪客，一次決定成功畫面（不另請求 /stats）。
 * - total_count === 1 → 慶祝（訪客則慶祝後再換訪客卡）
 * - 訪客且非第一部（含 total_count 缺漏）→ 訪客卡；訪客卡不依賴數量
 * - 其餘（含已登入但 total_count 缺漏／非數字）→ 簡單版，避免誤判成第一部
 */
function pickSuccessVariant(totalCount: unknown, isAnonymous: boolean): SuccessVariant {
  if (typeof totalCount === 'number' && totalCount === 1) return 'celebrate';
  if (isAnonymous) return 'guest';
  return 'simple';
}

interface AddToFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rating: number, notes: string, date?: string, forceAdd?: boolean, seasons?: number[]) => Promise<any>;
  onViewDetails: (id?: string) => void;
  title: string;
  external_id: string;
  overview?: string; // Add overview prop
  media_type?: 'movie' | 'book' | 'tv';
  seasons?: { season_number: number; name: string }[];
  /** 慶祝與訪客卡顯示的海報 */
  posterUrl?: string;
}

export default function AddToFolioModal({
  isOpen, onClose, onSave, onViewDetails, title, external_id, overview, media_type, seasons, posterUrl,
}: AddToFolioModalProps) {
  const [mode, setShowMode] = useState<'add' | 'prompt' | 'season_pick' | 'view_existing' | 'success'>('add');
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | undefined>(undefined);
  // 慶祝灑落彩帶的 portal 目標（callback ref 存成 state，掛上後才 render 彩帶）
  const [fallLayerEl, setFallLayerEl] = useState<HTMLDivElement | null>(null);
  const [forceAdd, setForceAdd] = useState(false);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [existingSeasons, setExistingSeasons] = useState<number[]>([]);
  const [isDuplicateFlow, setIsDuplicateFlow] = useState(false);
  // 後端回報「這幾季已收藏過」時，暫存剛填的內容，讓用戶一鍵確認後原樣再送一次
  const [pendingDuplicate, setPendingDuplicate] = useState<{ rating: number; notes: string; date?: string } | null>(null);
  const [successVariant, setSuccessVariant] = useState<SuccessVariant>('simple');
  // 第一部且為訪客：慶祝後要切換為訪客卡
  const [guestAfterCelebrate, setGuestAfterCelebrate] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const router = useRouter();

  const hasSeasonPicker = media_type === 'tv' && !!seasons && seasons.length > 0;

  // Reset mode when modal opens。TV 作品一律先進季數勾選（不限重複收藏才出現），
  // 讓「這是第一次收藏這部劇」也能指定看了哪幾季，而不是只有重複收藏時才問。
  // 呼叫端只切換 isOpen、不卸載本元件，所以在「render 期間」偵測開啟（與原 effect 相同的 [isOpen, hasSeasonPicker]
  // 變化）就立刻重置：若放在 effect 裡，重開的第一個畫格會沿用上次的 success／celebrate 狀態，
  // 重新掛載慶祝而重播觸覺與彩帶。關閉時不重置，讓退場動畫仍顯示原本的成功畫面。
  // 初值用 null，確保「掛載時就是開啟」也會跑一次重置（與原 effect 行為一致）。
  const resetKey = `${isOpen}|${hasSeasonPicker}`;
  const [prevResetKey, setPrevResetKey] = useState<string | null>(null);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (isOpen) {
      setShowMode(hasSeasonPicker ? 'season_pick' : 'add');
      setNewlyCreatedId(undefined);
      setForceAdd(false);
      setSelectedSeasons([]);
      setExistingSeasons([]);
      setIsDuplicateFlow(false);
      setPendingDuplicate(null);
      setSuccessVariant('simple');
      setGuestAfterCelebrate(false);
    }
  }

  // 慶祝 → 訪客卡的切換計時器；關閉（isOpen=false）或卸載時清掉，不殘留 setState
  useEffect(() => {
    if (!isOpen || mode !== 'success' || successVariant !== 'celebrate' || !guestAfterCelebrate) return;
    const id = setTimeout(() => setSuccessVariant('guest'), GUEST_CARD_SWITCH_MS);
    return () => clearTimeout(id);
  }, [isOpen, mode, successVariant, guestAfterCelebrate]);

  // 關閉視窗時一併觸發系統評價排程（僅在儲存成功時 arm 過才會真的排程，否則為 no-op）
  const handleClose = () => {
    onClose();
    flushReviewPrompt();
  };

  const goToCollection = () => {
    handleClose();
    router.push('/collection');
  };

  const handleSave = async (rating: number, notes: string, date?: string, force: boolean = forceAdd) => {
    setIsSubmitting(true);
    try {
      const result = await onSave(rating, notes, date, force, hasSeasonPicker ? selectedSeasons : undefined);

      if (result && result.status === 'duplicate' && !force) {
        if (hasSeasonPicker) {
          // 季數與既有收藏重疊：留在表單（已填的評分、心得不丟），在表單上方請用戶確認要不要再記一筆
          setExistingSeasons(result.existingSeasons || []);
          setIsDuplicateFlow(true);
          setPendingDuplicate({ rating, notes, date });
        } else {
          setShowMode('prompt');
        }
        return;
      }

      if (result && result.status === 'capacity_reached') {
        setShowGuestLimit(true);
        return;
      }

      if (result && result.id) {
        setNewlyCreatedId(result.id);
      }
      // 讀 store 現值，避免 async 流程裡拿到 stale 的 user
      const user = useUserStore.getState().user;
      const isAnonymous = user?.is_anonymous === true;
      const variant = pickSuccessVariant(result?.total_count, isAnonymous);
      // 儲存成功當下判定評價視窗資格；實際呼叫延到成功視窗關閉後（flushReviewPrompt）
      armReviewPrompt({
        isAnonymous,
        accountCreatedAt: user?.created_at ?? null,
        totalCount: typeof result?.total_count === 'number' ? result.total_count : null,
        celebrated: variant === 'celebrate',
      });
      setSuccessVariant(variant);
      setGuestAfterCelebrate(variant === 'celebrate' && isAnonymous);
      setShowMode('success');

      // 每次儲存成功都廣播：首頁館藏數靜默更新（網頁與原生皆需）；
      // 既有唯一訂閱者（AppOpenReset 升級 Banner）自身只在原生註冊，網頁上不受影響
      emitStoryAdded();
      // 通知：記錄行為信號（iOS only）
      if (isNativePlatform()) {
        recordEngagement(2);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t.common.error, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 整個 overlay 透過 portal 掛到 body：呼叫端常把本元件放在建立堆疊脈絡的容器內
  // （例如首頁 <main className="relative z-10">），否則 z-[150] 會被壓在 z-10 之下，
  // 讓 z-50 的 NavigationFAB 蓋過遮罩與按鈕（ISSUE-001）。
  // SSR 時沒有 document，直接不渲染（首次 render 視窗必為關閉，伺服器端本來就沒有內容）。
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="add-to-folio" className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            data-testid="modal-backdrop"
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />

          {/* 慶祝灑落彩帶層：排在遮罩之後、卡片之前，彩帶從卡片後方經過；不攔截點擊 */}
          <div ref={setFallLayerEl} aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            // 慶祝時不裁切，讓炸開的彩帶能飛出卡片
            className={`relative w-full max-w-lg bg-folio-card border border-white/10 rounded-[32px] shadow-2xl flex flex-col ${
              mode === 'success' && successVariant === 'celebrate' ? '' : 'overflow-hidden'
            }`}
          >
            {/* Success State：第一部慶祝 */}
            {mode === 'success' && successVariant === 'celebrate' && (
              <FirstCollectCelebration
                title={title}
                posterUrl={posterUrl}
                onContinue={handleClose}
                onGoToCollection={goToCollection}
                fallLayerTarget={fallLayerEl}
              />
            )}

            {/* Success State：訪客登入引導 */}
            {mode === 'success' && successVariant === 'guest' && (
              <GuestSaveCard title={title} posterUrl={posterUrl} onLater={goToCollection} onLoggedIn={handleClose} />
            )}

            {/* Success State：簡單版（第二部起的已登入用戶） */}
            {mode === 'success' && successVariant === 'simple' && (
              <div data-testid="success-simple" className="p-10 flex flex-col items-center text-center gap-8">
                <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">{t.modals.successTitle}</h2>
                  <p className="text-text-desc text-sm">
                    <span className="text-accent-gold font-bold">&quot;{title}&quot;</span> {t.modals.successMessage}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <button
                    onClick={handleClose}
                    className="py-4 bg-white/5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
                  >
                    {t.modals.continueBrowsing}
                  </button>
                  <button
                    onClick={goToCollection}
                    className="py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    {t.modals.goToMyStorio} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Prompt State: Duplicate Warning */}
            {mode === 'prompt' && (
              <div className="p-10 flex flex-col items-center text-center gap-8">
                <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold">
                  <History size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4 font-serif">Already in your Folio</h2>
                  <p className="text-text-desc text-sm leading-relaxed">
                    You&apos;ve already curated <span className="text-white font-bold">&quot;{title}&quot;</span>.
                    Are you logging a <span className="text-accent-gold font-bold">re-watch / re-read</span>?
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  <button
                    onClick={() => {
                      setForceAdd(true);
                      setShowMode('add');
                    }}
                    className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} /> Log as Re-watch
                  </button>
                  <button
                    onClick={() => {
                      onViewDetails();
                      onClose();
                    }}
                    className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold text-xs uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} /> View Existing Record
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full py-3 text-text-desc hover:text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
                  >
                    {t.common.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Season Pick State: 分季收藏（TV 一律先問，重複收藏時額外顯示已涵蓋季數警示） */}
            {mode === 'season_pick' && (
              <div className="p-10 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center text-accent-gold">
                  <History size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 font-serif">
                    {isDuplicateFlow ? 'Already in your Folio' : title}
                  </h2>
                  <p className="text-text-desc text-sm leading-relaxed">
                    {isDuplicateFlow ? (
                      <>這筆要記錄 <span className="text-white font-bold">&quot;{title}&quot;</span> 的哪幾季？</>
                    ) : (
                      '這次收藏，你看了哪幾季？'
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 w-full max-h-48 overflow-y-auto">
                  {seasons?.map((s) => {
                    const isSelected = selectedSeasons.includes(s.season_number);
                    const isOverlap = existingSeasons.includes(s.season_number);
                    return (
                      <button
                        key={s.season_number}
                        onClick={() => {
                          if (isOverlap && !isSelected) {
                            const confirmed = window.confirm(`S${s.season_number} 已經在另一筆記錄中，確定要重複記錄嗎？`);
                            if (!confirmed) return;
                          }
                          setSelectedSeasons((prev) =>
                            isSelected ? prev.filter((n) => n !== s.season_number) : [...prev, s.season_number]
                          );
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-accent-gold text-folio-black border-accent-gold'
                            : isOverlap
                            ? 'bg-white/5 text-text-desc border-dashed border-white/20'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                        }`}
                      >
                        S{s.season_number}
                      </button>
                    );
                  })}
                </div>
                <button
                  disabled={selectedSeasons.length === 0}
                  onClick={() => {
                    if (isDuplicateFlow) setForceAdd(true);
                    setShowMode('add');
                  }}
                  className="w-full py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
                <button onClick={onClose} className="text-text-desc text-xs underline">
                  Cancel
                </button>
              </div>
            )}

            {/* Other modes: Add to Folio */}
            {mode === 'add' && (
              <>
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="bg-accent-gold/20 p-2 rounded-xl">
                      <Bookmark size={18} className="text-accent-gold" />
                    </div>
                    <h2 className="text-lg font-bold text-white font-serif">{t.modals.addToFolio}</h2>
                  </div>
                  <button onClick={onClose} className="p-2 text-text-desc hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh]">
                  <div className="mb-8">
                    <h3 className="text-2xl font-black text-white leading-tight">{title}</h3>
                    {forceAdd && (
                      <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-accent-gold flex items-center gap-2">
                        <History size={12} /> New Viewing Log
                      </div>
                    )}
                  </div>

                  {pendingDuplicate && (() => {
                    const overlap = selectedSeasons.filter((n) => existingSeasons.includes(n)).sort((a, b) => a - b);
                    const message = overlap.length > 0
                      ? t.modals.duplicateSeasons.replace('{seasons}', overlap.map((n) => `S${n}`).join('、'))
                      : t.modals.duplicateWhole;
                    return (
                      <div
                        data-testid="duplicate-notice"
                        className="mb-6 rounded-2xl border border-accent-gold/30 bg-accent-gold/10 p-4 flex flex-col gap-3"
                      >
                        <p className="text-sm text-white leading-snug">{message}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            data-testid="duplicate-confirm"
                            disabled={isSubmitting}
                            onClick={() => {
                              const pending = pendingDuplicate;
                              setForceAdd(true);
                              setPendingDuplicate(null);
                              handleSave(pending.rating, pending.notes, pending.date, true);
                            }}
                            className="flex-1 py-3 bg-accent-gold text-folio-black rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                          >
                            {t.modals.duplicateConfirm}
                          </button>
                          <button
                            type="button"
                            data-testid="duplicate-change-seasons"
                            onClick={() => {
                              setPendingDuplicate(null);
                              setShowMode('season_pick');
                            }}
                            className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold text-xs uppercase tracking-widest border border-white/10"
                          >
                            {t.modals.duplicateChangeSeasons}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <RateAndReflectForm
                    onSave={handleSave}
                    isSaving={isSubmitting}
                    title={title}
                    overview={overview} // Pass overview
                    mediaType={media_type}
                  />
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Guest Limit Modal overlay */}
      {/* AnimatePresence 子節點需有 key，否則兩個無 key 子節點會觸發重複 key 警告 */}
      <GuestLimitModal
        key="guest-limit"
        isOpen={showGuestLimit}
        onClose={() => setShowGuestLimit(false)}
        onLogin={(provider) => {
          // 改用 SPA 導航（Capacitor 靜態 export 下 window.location.href 內部路由會失效回退首頁）
          onClose();
          router.push(`/auth?provider=${provider}`);
        }}
      />
    </AnimatePresence>,
    document.body,
  );
}