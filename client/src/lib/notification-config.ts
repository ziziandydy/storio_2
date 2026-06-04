/**
 * notification-config.ts
 *
 * 所有本機通知相關的 hardcoded 參數，集中於此作為唯一真實來源。
 * 禁止在其他模組中重複宣告相同常數。
 *
 * 未來開放使用者自訂時，各參數對應的 settingsStore key 已於 JSDoc 標注。
 */

export const NOTIFICATION_CONFIG = {

  // ─── Log a story 觸發條件 ───────────────────────────────────────────────

  /**
   * 距上次新增典藏超過此天數才排程 Log a story 通知。
   * 調整影響：天數越小越積極，天數越大越寬鬆。
   * 未來 UI key：settingsStore.notifLogStoryIntervalDays
   */
  LOG_STORY_INTERVAL_DAYS: 3,

  /**
   * 行為學習資料不足時的 fallback 排程小時（24h）。
   * 未來 UI key：settingsStore.notifLogStoryHour
   */
  LOG_STORY_FALLBACK_HOUR: 21,

  /** Log a story fallback 排程分鐘。 */
  LOG_STORY_FALLBACK_MINUTE: 0,

  // ─── Folio reflection 觸發條件 ──────────────────────────────────────────

  /**
   * 距上次撰寫心得（notes 更新）超過此天數才排程 Folio reflection 次觸發。
   * 未來 UI key：settingsStore.notifFolioReflectionIntervalDays
   */
  FOLIO_REFLECTION_INTERVAL_DAYS: 7,

  /**
   * 行為學習資料不足時的 fallback 排程小時（24h）。
   * 未來 UI key：settingsStore.notifFolioReflectionHour
   */
  FOLIO_REFLECTION_FALLBACK_HOUR: 20,

  /** Folio reflection fallback 排程分鐘。 */
  FOLIO_REFLECTION_FALLBACK_MINUTE: 0,

  // ─── 未評分觸發條件（Folio reflection 主觸發）──────────────────────────

  /**
   * 僅針對此天數內加入的收藏觸發「未評分」提醒。
   * 超過此窗口的未評分項目視為使用者已放棄評分，不再提醒。
   * 調整影響：天數越大，對「舊收藏未評分」越寬容。
   */
  UNRATED_RECENT_WINDOW_DAYS: 14,

  /**
   * 未評分觸發後的冷卻天數。同一觸發路徑在此期間不重複排程。
   * 設計目的：避免每次 App Open Reset 都推相同的「未評分」提醒。
   */
  UNRATED_COOLDOWN_DAYS: 7,

  // ─── 智慧忽略偵測 ───────────────────────────────────────────────────────

  /**
   * 某觸發路徑連續收到通知但使用者未行動的次數上限。
   * 達到後自動停止該觸發路徑，直到使用者主動行動（評分/記錄）重置。
   * 調整影響：數字越小越快放棄，越大越堅持提醒。
   */
  IGNORE_THRESHOLD: 3,

  // ─── 每日上限與 Blackout ────────────────────────────────────────────────

  /**
   * 每日最多排程的通知數。超過時依優先順序（Log a story > Folio reflection）截斷。
   */
  MAX_PER_DAY: 2,

  /**
   * 深夜不排程的時間範圍起始小時（含）。
   * Blackout 範圍：BLACKOUT_START_HOUR – BLACKOUT_END_HOUR。
   */
  BLACKOUT_START_HOUR: 0,

  /**
   * 深夜 Blackout 結束小時（不含）。落在此範圍的排程時間推延至 BLACKOUT_END_HOUR:00。
   */
  BLACKOUT_END_HOUR: 8,

  // ─── 行為學習時段（Behavioral Timing） ─────────────────────────────────

  /**
   * engagement history 達到此筆數後，才切換為學習時段排程（否則使用 fallback）。
   * 調整影響：越小則越快個人化但準確度低；越大則需要更長觀察期。
   */
  MIN_DATA_POINTS_FOR_LEARNING: 7,

  /**
   * engagement history 最大保留筆數（滑動窗口）。
   * 超過時移除最舊一筆，確保反映最近行為習慣。
   */
  ENGAGEMENT_HISTORY_MAX: 21,

  /**
   * 使用者成功記錄 Storio 時的 engagement 權重（相對於 app 開啟的 weight=1）。
   * 設為 2 是因為記錄行為代表「有空且願意行動」，是更強的通知接受信號。
   */
  STORY_CREATE_WEIGHT: 2,

  /**
   * 統計峰值 hour 時優先選取的晚間範圍起始小時（含）。
   */
  PEAK_EVENING_START: 18,

  /**
   * 晚間峰值範圍結束小時（含）。
   */
  PEAK_EVENING_END: 23,

  /**
   * 早晨峰值範圍起始小時（含），作為晚間無峰值時的備選。
   */
  PEAK_MORNING_START: 8,

  /**
   * 早晨峰值範圍結束小時（含）。
   */
  PEAK_MORNING_END: 13,

  // ─── Permission Primer ──────────────────────────────────────────────────

  /**
   * Permission Primer 被 dismiss 後的冷卻天數。
   * 冷卻期間不自動再顯示，即使使用者記錄了新 Storio。
   */
  PRIMER_DISMISS_COOLDOWN_DAYS: 30,

  /**
   * Permission Primer 最多允許被 dismiss 的次數。
   * 達到後永不再自動顯示（使用者可主動進 Profile > Notifications 開啟）。
   */
  PRIMER_MAX_DISMISS_COUNT: 2,

} as const;

// ─── 通知訊息變體（Message Variants） ──────────────────────────────────────

/**
 * Fallback 輪播訊息。當個人化條件不足時隨機選一條。
 * 中英文各 6 條，依 settingsStore.language 選擇。
 */
export const MESSAGE_VARIANTS = {
  'zh-TW': [
    '今天是記錄新故事的好時機 📚',
    '你的 Folio 在等待新的故事',
    '花 30 秒，讓記憶留下來',
    '最近有看到什麼值得典藏的嗎？',
    '記錄才能讓故事真正屬於你 ✨',
    '今晚，為你的 Folio 添一筆',
  ],
  'en-US': [
    'Time to capture a new story 📚',
    'Your Folio is waiting for its next chapter',
    '30 seconds to preserve a memory',
    'Seen anything worth archiving lately?',
    'Stories are only yours when you collect them ✨',
    'Tonight, add a story to your Folio',
  ],
} as const;
