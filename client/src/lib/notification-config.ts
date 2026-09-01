/**
 * notification-config.ts
 *
 * 所有本機通知相關的 hardcoded 參數，集中於此作為唯一真實來源。
 * 禁止在其他模組中重複宣告相同常數。
 *
 * 未來開放使用者自訂時，各參數對應的 settingsStore key 已於 JSDoc 標注。
 */

export const NOTIFICATION_CONFIG = {

  // ─── Come back（churn-rescue 階梯）觸發條件 ─────────────────────────────

  /**
   * 行為學習資料不足時的 fallback 排程小時（24h）。
   * 未來 UI key：settingsStore.notifComeBackHour
   */
  COME_BACK_FALLBACK_HOUR: 21,

  /** Come back fallback 排程分鐘。 */
  COME_BACK_FALLBACK_MINUTE: 0,

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

  // ─── 智慧忽略偵測（僅 Folio reflection 使用）────────────────────────────

  /**
   * Folio reflection 連續收到通知但使用者未行動的次數上限。
   * 達到後自動停止該觸發路徑，直到使用者主動行動（評分）重置。
   * churn-rescue 階梯不套用此機制（180 天本身即為停損點）。
   */
  IGNORE_THRESHOLD: 3,

  // ─── 每日上限與 Blackout ────────────────────────────────────────────────

  /**
   * 每日最多排程的通知數。churn-rescue 階梯分散在不同未來日期，
   * 與 Folio reflection 同日撞期機率低，本版本不做跨日期強制截斷。
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

// ─── Churn-Rescue 階梯（Come back 通知類型） ────────────────────────────────

export type ChurnTierKey = 'day3' | 'day7' | 'day14' | 'day30' | 'day60' | 'day90' | 'day180';

/**
 * churn-rescue 召回階梯：距上次開啟 app 達到對應天數時各自排程一則通知。
 * 180 天發完即停止，不循環（使用者視為已流失）。
 */
export const CHURN_TIERS: ReadonlyArray<{ days: number; key: ChurnTierKey }> = [
  { days: 3, key: 'day3' },
  { days: 7, key: 'day7' },
  { days: 14, key: 'day14' },
  { days: 30, key: 'day30' },
  { days: 60, key: 'day60' },
  { days: 90, key: 'day90' },
  { days: 180, key: 'day180' },
];

/**
 * 每層 2 則輪播文案，天數越大語氣越重。內容為定案文案，逐字使用，不可任意改寫。
 * {username}/{collectionCount}/{lastTitle} 由 interpolate() 於排程時代入。
 */
export const CHURN_MESSAGE_VARIANTS: Record<'zh-TW' | 'en-US', Record<ChurnTierKey, string[]>> = {
  'zh-TW': {
    day3: [
      '這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿',
      '追了新劇還是看了新片？別忘了回來記一筆 📖',
    ],
    day7: [
      '{username}，已經一週沒有更新Storio了，該來紀錄一下了吧',
      '一週過去了，你的書單片單是不是偷偷變長卻沒告訴我？',
    ],
    day14: [
      '還記得我嗎？已經兩週沒來Storio逛逛囉🙇‍♂️🙇‍♀️🙇',
      '{username}，兩週不見，你的Storio有點想你了',
    ],
    day30: [
      '你已典藏了{collectionCount}個故事，但這個月是0個🫣',
      '{username}，一整個月零紀錄，是我做錯了什麼嗎？',
    ],
    day60: [
      '已經過兩個月了，就算是權力遊戲也該追完8季了吧',
      '兩個月沒消息，該不會是在忙著追新劇沒空理我吧',
    ],
    day90: [
      '我們都沉澱了三個月，我想你應該有遇到很不錯的故事吧，該跟我說說了吧',
      '三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？',
    ],
    day180: [
      '都過半年了還不來找我，所以愛真的會消失對嗎🥹🥹',
      '半年沒你的消息，我開始練習忘記你了（開玩笑的，快回來）🥹',
    ],
  },
  'en-US': {
    day3: [
      'Watched anything new these past two days? 📚🎬🍿',
      'New show or movie lately? Come tell me about it 📖',
    ],
    day7: [
      "{username}, it's been a week since your last update — time to log something?",
      "A week's gone by... did your watchlist quietly get longer without me?",
    ],
    day14: [
      'Remember me? It\'s been two weeks since you stopped by 🙇‍♂️🙇‍♀️',
      "{username}, two weeks of silence. Storio's been missing you",
    ],
    day30: [
      "You've collected {collectionCount} stories — but zero this month 🫣",
      "{username}, a whole month with nothing logged... did I do something wrong?",
    ],
    day60: [
      "Two months now. Even Game of Thrones has 8 seasons — you'd have finished it by now",
      'Two months of silence. Busy binging something you haven\'t told me about?',
    ],
    day90: [
      "Three months of quiet. I bet you've found a story worth telling me about",
      'Three months in — I still remember your last pick, {lastTitle}. Do you?',
    ],
    day180: [
      'Half a year and you still haven\'t come back. Does love really fade? 🥹🥹',
      "Six months of silence. I'm starting to forget what you look like (kidding — come back) 🥹",
    ],
  },
};
