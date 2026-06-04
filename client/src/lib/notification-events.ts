'use client';

/**
 * 輕量 module-level event bus，用於解耦「新增 Storio 成功」與「顯示通知 Banner」。
 * AddToFolioModal 在儲存成功時 emit，AppOpenReset 監聽並決定是否顯示舊用戶升級 Banner。
 */

const STORY_ADDED_EVENT = 'storio:story-added';

/** 新增 Storio 成功時呼叫。 */
export function emitStoryAdded(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STORY_ADDED_EVENT));
}

/** 訂閱新增 Storio 事件，回傳取消訂閱函式。 */
export function onStoryAdded(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(STORY_ADDED_EVENT, handler);
  return () => window.removeEventListener(STORY_ADDED_EVENT, handler);
}
