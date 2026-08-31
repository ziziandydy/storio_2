# Churn-Rescue Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復本機通知排程 bug（scheduling 只會排「今晚」導致真正流失的使用者永遠收不到提醒），並把單一「Log a story」通知升級為 3/7/14/30/60/90/180 天的 churn-rescue 召回階梯，每層文案各不相同。

**Architecture:** 每次 App Open 時，以「現在」為基準一次預排 7 則未來日期的本地通知（`now + N天` 各層 optimal hour），取代原本「條件已達標才排今晚」的反應式排程。`Folio reflection` 通知類型維持原邏輯不動。

**Tech Stack:** Next.js 14 (client, TypeScript) + `@capacitor/local-notifications` v7 + Zustand（settingsStore，persist middleware）+ 新增 Vitest 作為 client 端第一個單元測試框架。

**Spec:** `docs/superpowers/specs/2026-08-31-churn-rescue-notifications-design.md`

## Global Constraints

- 零後端：不新增 Push Notification / APNs / device token 基礎設施。
- `Folio reflection` 觸發邏輯、cooldown、忽略偵測**完全不動**。
- Churn-rescue 階梯**不套用**智慧忽略偵測（`incrementIgnoredCount`/`resetIgnoredCount`）。
- 天數階梯固定為 `3 / 7 / 14 / 30 / 60 / 90 / 180`，180 天發完即停止（不循環）。
- 文案內容以 spec 定案表為唯一真實來源，逐字照抄，不得改寫語氣或增刪 emoji。
- `{username}` 為空時移除模板開頭的 `{username}，`/`{username}, ` 前綴；`{lastTitle}` 缺值時該變體整則排除，不留破圖字串。
- 所有對話、程式碼註解使用繁體中文（zh-TW）；英文文案內容本身用英文（`CHURN_MESSAGE_VARIANTS['en-US']`）。
- 遵循三層/既有檔案結構慣例，不做無關重構。

---

### Task 1: Vitest 測試基礎建設 + `interpolate()` 文字代入函式

**Files:**
- Create: `client/vitest.config.ts`
- Create: `client/src/lib/__tests__/notifications.test.ts`
- Modify: `client/package.json`
- Modify: `client/src/lib/notifications.ts:1-10`（新增 `interpolate` 匯出函式，暫不改動其餘邏輯）

**Interfaces:**
- Produces: `export interface InterpolateVars { username: string; collectionCount: number; lastTitle: string | null }` 與 `export function interpolate(template: string, vars: InterpolateVars): string | null`，供 Task 5 的 `buildComeBackContent()` 使用。

- [ ] **Step 1: 安裝 vitest**

```bash
cd client
npm install -D vitest@^2.1.9
```

- [ ] **Step 2: 新增 `client/package.json` 的 `test` script**

在 `scripts` 區塊新增一行（緊接在 `"lint": "next lint",` 之後）：

```json
    "test": "vitest run",
```

- [ ] **Step 3: 建立 `client/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 4: 寫失敗測試 — `client/src/lib/__tests__/notifications.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { interpolate } from '@/lib/notifications';

describe('interpolate', () => {
  it('替換 {username}（有值時）', () => {
    const result = interpolate('{username}，已經一週沒有更新Storio了', {
      username: '小明',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('小明，已經一週沒有更新Storio了');
  });

  it('{username} 為空字串時，移除開頭的「{username}，」前綴', () => {
    const result = interpolate('{username}，已經一週沒有更新Storio了', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('已經一週沒有更新Storio了');
  });

  it('{username} 為空字串時，移除開頭的「{username}, 」英文前綴（含空白）', () => {
    const result = interpolate("{username}, it's been a week since your last update", {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe("it's been a week since your last update");
  });

  it('替換 {collectionCount}', () => {
    const result = interpolate('你已典藏了{collectionCount}個故事', {
      username: '',
      collectionCount: 42,
      lastTitle: null,
    });
    expect(result).toBe('你已典藏了42個故事');
  });

  it('{lastTitle} 有值時正確代入', () => {
    const result = interpolate('三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？', {
      username: '',
      collectionCount: 0,
      lastTitle: '進擊的巨人',
    });
    expect(result).toBe('三個月了，我還留著你上次收藏的《進擊的巨人》，你呢？');
  });

  it('模板需要 {lastTitle} 但值為 null 時，回傳 null（該變體應被排除）', () => {
    const result = interpolate('三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBeNull();
  });

  it('不含任何 placeholder 的模板原樣回傳', () => {
    const result = interpolate('這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿', {
      username: '',
      collectionCount: 0,
      lastTitle: null,
    });
    expect(result).toBe('這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿');
  });
});
```

- [ ] **Step 5: 執行測試確認失敗**

```bash
cd client && npm test
```

預期：`interpolate` 尚未存在，測試檔案編譯/執行失敗（`does not provide an export named 'interpolate'`）。

- [ ] **Step 6: 在 `client/src/lib/notifications.ts` 新增 `interpolate` 函式**

在既有 `checkAndRequestPermission` 函式與 `// ─── Notification Content ─` 區塊之間，新增：

```ts
// ─── Interpolate ──────────────────────────────────────────────────────────

export interface InterpolateVars {
  username: string;
  collectionCount: number;
  lastTitle: string | null;
}

/**
 * 將文案模板中的 {username}/{collectionCount}/{lastTitle} 代入實際值。
 * {username} 為空時移除開頭的「{username}，」/「{username}, 」前綴（含標點與空白）。
 * 模板需要 {lastTitle} 但值不存在時回傳 null，呼叫端應排除該變體。
 */
export function interpolate(template: string, vars: InterpolateVars): string | null {
  if (template.includes('{lastTitle}') && !vars.lastTitle) return null;

  let result = template;
  if (!vars.username) {
    result = result.replace(/^\{username\}[，,]\s*/, '');
  } else {
    result = result.replace(/\{username\}/g, vars.username);
  }
  result = result.replace(/\{collectionCount\}/g, String(vars.collectionCount));
  if (vars.lastTitle) {
    result = result.replace(/\{lastTitle\}/g, vars.lastTitle);
  }
  return result;
}
```

- [ ] **Step 7: 執行測試確認通過**

```bash
cd client && npm test
```

預期：7 個測試全部 PASS。

- [ ] **Step 8: Commit**

```bash
git add client/package.json client/package-lock.json client/vitest.config.ts client/src/lib/__tests__/notifications.test.ts client/src/lib/notifications.ts
git commit -m "test(notifications): 新增 vitest 基礎建設 + interpolate() 文字代入函式"
```

---

### Task 2: `notification-config.ts` — Churn tier 階梯與文案內容

**Files:**
- Modify: `client/src/lib/notification-config.ts`（全檔重寫，內容如下）

**Interfaces:**
- Consumes: 無（純資料設定檔）
- Produces: `export type ChurnTierKey`、`export const CHURN_TIERS`、`export const CHURN_MESSAGE_VARIANTS`，供 Task 3/5 使用。`NOTIFICATION_CONFIG` 新增 `COME_BACK_FALLBACK_HOUR`/`COME_BACK_FALLBACK_MINUTE`，移除 `LOG_STORY_INTERVAL_DAYS`/`LOG_STORY_FALLBACK_HOUR`/`LOG_STORY_FALLBACK_MINUTE`，移除舊的 `MESSAGE_VARIANTS`。

- [ ] **Step 1: 寫失敗測試 — 驗證每層文案數量完整**

在 `client/src/lib/__tests__/notifications.test.ts` 檔案開頭 import 區塊新增：

```ts
import { CHURN_TIERS, CHURN_MESSAGE_VARIANTS } from '@/lib/notification-config';
```

在檔案末尾新增：

```ts
describe('CHURN_TIERS / CHURN_MESSAGE_VARIANTS', () => {
  it('共有 7 層，天數遞增且符合規格', () => {
    expect(CHURN_TIERS.map(t => t.days)).toEqual([3, 7, 14, 30, 60, 90, 180]);
  });

  it('每層在 zh-TW 與 en-US 都恰好有 2 則變體', () => {
    for (const tier of CHURN_TIERS) {
      expect(CHURN_MESSAGE_VARIANTS['zh-TW'][tier.key]).toHaveLength(2);
      expect(CHURN_MESSAGE_VARIANTS['en-US'][tier.key]).toHaveLength(2);
    }
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd client && npm test
```

預期：`notification-config` 尚未匯出 `CHURN_TIERS`/`CHURN_MESSAGE_VARIANTS`，測試失敗。

- [ ] **Step 3: 重寫 `client/src/lib/notification-config.ts` 全檔**

```ts
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
```

> `day14` 的 zh-TW 第一則保留原始 emoji 序列 `🙇‍♂️🙇‍♀️🙇`（ZWJ 組合字），直接複製貼上即可，不要手動重打 emoji 避免變成不同 code point。

- [ ] **Step 4: 執行測試確認通過**

```bash
cd client && npm test
```

預期：全部測試 PASS（Task 1 的 7 個 + Task 2 的 2 個）。

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/notification-config.ts client/src/lib/__tests__/notifications.test.ts
git commit -m "feat(notifications): 新增 churn-rescue 7 層階梯設定與文案內容"
```

---

### Task 3: `futureScheduleDate()` 未來日期排程函式

**Files:**
- Modify: `client/src/lib/notifications.ts`（`nextScheduleDate`/`applyBlackout` 附近新增 `futureScheduleDate`；`getOptimalHour` 的型別參數改名）
- Modify: `client/src/lib/__tests__/notifications.test.ts`

**Interfaces:**
- Consumes: 無外部依賴，純日期運算。
- Produces: `function futureScheduleDate(daysFromNow: number, hour: number, minute: number): Date`（檔案內部函式，不 export，供 Task 5 的 `reschedule()` 使用）；`getOptimalHour(type: 'come_back' | 'folio_reflection')` 型別簽名變更（原為 `'log_story' | 'folio_reflection'`）。

- [ ] **Step 1: 寫失敗測試**

在 `notifications.test.ts` 新增（此函式不 export，改用 `reschedule()` 的排程結果間接驗證——先寫一個直接測試 `getOptimalHour` 型別接受 `'come_back'` 的最小案例，日期運算的完整驗證併入 Task 5 的 `reschedule()` 整合測試；`applyBlackout` 一併改為 export 以便直接單元測試深夜推延規則）：

```ts
import { getOptimalHour, applyBlackout } from '@/lib/notifications';

describe('getOptimalHour', () => {
  it('type 為 come_back 時，資料不足回傳 fallback hour', () => {
    expect(getOptimalHour('come_back')).toBe(21);
  });

  it('type 為 folio_reflection 時，資料不足回傳 fallback hour', () => {
    expect(getOptimalHour('folio_reflection')).toBe(20);
  });
});

describe('applyBlackout', () => {
  it('落在 00:00–07:59 的小時，推延到 BLACKOUT_END_HOUR (8)', () => {
    expect(applyBlackout(0)).toBe(8);
    expect(applyBlackout(3)).toBe(8);
    expect(applyBlackout(7)).toBe(8);
  });

  it('落在 08:00–23:59 的小時，原樣回傳', () => {
    expect(applyBlackout(8)).toBe(8);
    expect(applyBlackout(21)).toBe(21);
    expect(applyBlackout(23)).toBe(23);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd client && npm test
```

預期：`getOptimalHour('come_back')` 目前型別仍是 `'log_story'`，TypeScript 編譯失敗（vitest 透過 esbuild 轉譯，型別錯誤在此階段可能不會擋住執行，但執行期邏輯會走到 `type === 'log_story'` 判斷為 false，導致回傳 `FOLIO_REFLECTION_FALLBACK_HOUR`(20) 而非 21，測試斷言失敗）。

- [ ] **Step 3: 修改 `client/src/lib/notifications.ts`**

找到現有的 `getOptimalHour` 函式簽名與內部判斷（原本第 65-68 行附近）：

```ts
export function getOptimalHour(type: 'log_story' | 'folio_reflection'): number {
  const fallback = type === 'log_story'
    ? NOTIFICATION_CONFIG.LOG_STORY_FALLBACK_HOUR
    : NOTIFICATION_CONFIG.FOLIO_REFLECTION_FALLBACK_HOUR;
```

改為：

```ts
export function getOptimalHour(type: 'come_back' | 'folio_reflection'): number {
  const fallback = type === 'come_back'
    ? NOTIFICATION_CONFIG.COME_BACK_FALLBACK_HOUR
    : NOTIFICATION_CONFIG.FOLIO_REFLECTION_FALLBACK_HOUR;
```

在 `nextScheduleDate()` 函式之後、`applyBlackout()` 之前，新增：

```ts
/**
 * 計算「距現在 daysFromNow 天後」的目標日期，套用指定時分。
 * 與 nextScheduleDate 不同：不判斷「今天是否已過」，永遠是未來日期
 * （churn-rescue 階梯的 daysFromNow 恆 ≥ 3，不會發生同日情況）。
 */
function futureScheduleDate(daysFromNow: number, hour: number, minute: number): Date {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  target.setHours(hour, minute, 0, 0);
  return target;
}
```

找到現有的 `applyBlackout` 函式（原本 `function applyBlackout` 開頭），在函式簽名前加上 `export`：

```ts
export function applyBlackout(hour: number): number {
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd client && npm test
```

預期：全部測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/notifications.ts client/src/lib/__tests__/notifications.test.ts
git commit -m "feat(notifications): 新增 futureScheduleDate()，getOptimalHour type 改為 come_back，applyBlackout 改為 export 供測試"
```

---

### Task 4: `NotificationState` / `fetchNotificationState` 改寫

**Files:**
- Modify: `client/src/lib/notifications.ts`（`NotificationState` interface、`fetchNotificationState` 函式）
- Modify: `client/src/lib/__tests__/notifications.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface NotificationState {
    username: string;
    lastTitle: string | null;
    collectionCount: number;
    hasUnratedItemsWithin14Days: boolean;
    daysSinceLastReflection: number;
    language: 'zh-TW' | 'en-US';
    notifEnabled: boolean;
    notifComeBack: boolean;
    notifFolioReflection: boolean;
  }
  ```
  `fetchNotificationState(token, username, language, notifEnabled, notifComeBack, notifFolioReflection): Promise<NotificationState>`（第 5 個參數由 `notifLogStory` 改名為 `notifComeBack`，供 Task 6 更新呼叫端）。移除 `lastMediaType`、`daysSinceLastLog` 欄位（僅原 Log a story 文案使用，現已無消費者）。

- [ ] **Step 1: 寫失敗測試**

在 `notifications.test.ts` 新增：

```ts
import { fetchNotificationState } from '@/lib/notifications';
import { vi, beforeEach, afterEach } from 'vitest';

describe('fetchNotificationState', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('API 回傳空陣列時回傳 defaultState（不含 lastMediaType/daysSinceLastLog 欄位）', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [] }),
    }) as any;

    const state = await fetchNotificationState('token', 'Tina', 'zh-TW', true, true, true);

    expect(state).toEqual({
      username: 'Tina',
      lastTitle: null,
      collectionCount: 0,
      hasUnratedItemsWithin14Days: false,
      daysSinceLastReflection: 0,
      language: 'zh-TW',
      notifEnabled: true,
      notifComeBack: true,
      notifFolioReflection: true,
    });
  });

  it('有收藏資料時正確計算 collectionCount 與 lastTitle', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        groups: [{
          instances: [
            { title: '進擊的巨人', media_type: 'tv', created_at: new Date().toISOString(), rating: 5, notes: '' },
            { title: '花束般的戀愛', media_type: 'movie', created_at: new Date(Date.now() - 86400000).toISOString(), rating: 0, notes: '' },
          ],
        }],
      }),
    }) as any;

    const state = await fetchNotificationState('token', 'Tina', 'zh-TW', true, true, true);

    expect(state.collectionCount).toBe(2);
    expect(state.lastTitle).toBe('進擊的巨人');
    expect(state.hasUnratedItemsWithin14Days).toBe(true);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd client && npm test
```

預期：目前 `fetchNotificationState` 仍回傳含 `lastMediaType`/`daysSinceLastLog` 的物件，`toEqual` 精確比對失敗。

- [ ] **Step 3: 修改 `client/src/lib/notifications.ts`**

將 `NotificationState` interface（原第 10-22 行）改為：

```ts
export interface NotificationState {
  username: string;
  lastTitle: string | null;
  collectionCount: number;
  hasUnratedItemsWithin14Days: boolean;
  daysSinceLastReflection: number;
  language: 'zh-TW' | 'en-US';
  notifEnabled: boolean;
  notifComeBack: boolean;
  notifFolioReflection: boolean;
}
```

將 `fetchNotificationState` 函式（原第 338-412 行）整段改為：

```ts
/**
 * 從 API 讀取排程所需的用戶狀態。
 * 供 layout.tsx App Open Reset 呼叫。
 */
export async function fetchNotificationState(
  token: string,
  username: string,
  language: 'zh-TW' | 'en-US',
  notifEnabled: boolean,
  notifComeBack: boolean,
  notifFolioReflection: boolean,
): Promise<NotificationState> {
  const today = Date.now();
  const defaultState: NotificationState = {
    username,
    lastTitle: null,
    collectionCount: 0,
    hasUnratedItemsWithin14Days: false,
    daysSinceLastReflection: 0,
    language,
    notifEnabled,
    notifComeBack,
    notifFolioReflection,
  };

  try {
    const res = await fetch(getApiUrl('/api/v1/collection'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return defaultState;
    const data = await res.json();

    // 支援 { groups: [...] } 或直接 array
    const items: Array<{
      title: string;
      media_type: 'movie' | 'book' | 'tv';
      created_at: string;
      rating: number;
      notes?: string;
    }> = Array.isArray(data) ? data : (data.groups ?? []).flatMap((g: { instances?: unknown[] }) => g.instances ?? []);

    if (items.length === 0) return defaultState;

    // 按 created_at 排序，最新在前
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];

    // 未評分 14 天內
    const window14 = today - NOTIFICATION_CONFIG.UNRATED_RECENT_WINDOW_DAYS * 86400000;
    const hasUnrated = items.some(
      (i) => i.rating === 0 && new Date(i.created_at).getTime() > window14
    );

    // 距上次有 notes 的記錄
    const lastWithNotes = sorted.find((i) => i.notes && i.notes.trim().length > 0);
    const daysSinceLastReflection = lastWithNotes
      ? Math.floor((today - new Date(lastWithNotes.created_at).getTime()) / 86400000)
      : 999;

    return {
      ...defaultState,
      lastTitle: latest.title,
      collectionCount: items.length,
      hasUnratedItemsWithin14Days: hasUnrated,
      daysSinceLastReflection,
    };
  } catch {
    return defaultState;
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd client && npm test
```

預期：全部測試 PASS。

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/notifications.ts client/src/lib/__tests__/notifications.test.ts
git commit -m "refactor(notifications): NotificationState 移除 daysSinceLastLog/lastMediaType，notifLogStory 改名 notifComeBack"
```

---

### Task 5: `reschedule()` 排程引擎改寫 + 移除死碼

**Files:**
- Modify: `client/src/lib/notifications.ts`（`reschedule()` 核心邏輯、`buildComeBackContent()` 新增、移除 `buildLogStoryContent`/`randomVariant`/`mediaEmoji`/`STORIO_NOTIF_ID_LOG_STORY`）
- Modify: `client/src/lib/__tests__/notifications.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `interpolate()`；Task 2 的 `CHURN_TIERS`/`CHURN_MESSAGE_VARIANTS`；Task 3 的 `futureScheduleDate()`/`getOptimalHour('come_back')`；Task 4 的 `NotificationState`（`notifComeBack` 欄位）。
- Produces: `export async function reschedule(state: NotificationState): Promise<void>` 行為變更（原本只排「今晚」，現在 `notifComeBack` 為 true 時一次排 7 則 `now+N天`；`notifFolioReflection` 邏輯不受 churn-rescue 排程數量影響，各自獨立判斷是否排程）。

- [ ] **Step 1: 寫失敗測試**

在 `notifications.test.ts` 新增（mock `@capacitor/local-notifications` 與 `@/lib/appleAuth`）：

```ts
import { reschedule } from '@/lib/notifications';

vi.mock('@/lib/appleAuth', () => ({
  isNativePlatform: () => true,
}));

const scheduleMock = vi.fn();
const cancelMock = vi.fn();
const getPendingMock = vi.fn().mockResolvedValue({ notifications: [] });
const checkPermissionsMock = vi.fn().mockResolvedValue({ display: 'granted' });

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args: unknown[]) => checkPermissionsMock(...args),
    requestPermissions: vi.fn(),
    getPending: (...args: unknown[]) => getPendingMock(...args),
    cancel: (...args: unknown[]) => cancelMock(...args),
    schedule: (...args: unknown[]) => scheduleMock(...args),
  },
}));

describe('reschedule — churn-rescue 階梯', () => {
  beforeEach(() => {
    scheduleMock.mockClear();
    cancelMock.mockClear();
    getPendingMock.mockClear().mockResolvedValue({ notifications: [] });
    checkPermissionsMock.mockClear().mockResolvedValue({ display: 'granted' });
  });

  const baseState = {
    username: 'Tina',
    lastTitle: null,
    collectionCount: 5,
    hasUnratedItemsWithin14Days: false,
    daysSinceLastReflection: 0,
    language: 'zh-TW' as const,
    notifEnabled: true,
    notifComeBack: true,
    notifFolioReflection: false,
  };

  it('notifComeBack 為 true 時，一次排 7 則未來日期通知（id 2001-2007），文案已代入 username 且無殘留 placeholder', async () => {
    await reschedule(baseState);

    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const scheduled = scheduleMock.mock.calls[0][0].notifications;
    expect(scheduled).toHaveLength(7);
    expect(scheduled.map((n: any) => n.id)).toEqual([2001, 2002, 2003, 2004, 2005, 2006, 2007]);
    scheduled.forEach((n: any) => {
      expect(n.title).toBe('Storio');
      expect(n.body).not.toMatch(/\{username\}|\{collectionCount\}|\{lastTitle\}/);
    });
    // day7 的兩則變體都可能包含 {username}，確認至少不是原始 placeholder，且若命中含 username 的變體則已替換成 'Tina'
    const day7Notif = scheduled[1];
    expect(day7Notif.body.includes('{username}')).toBe(false);
  });

  it('language 為 en-US 時，文案取自 CHURN_MESSAGE_VARIANTS["en-US"]（day3 內容為英文）', async () => {
    await reschedule({ ...baseState, language: 'en-US' });

    const scheduled = scheduleMock.mock.calls[0][0].notifications;
    const day3Notif = scheduled[0];
    const englishDay3Variants = [
      'Watched anything new these past two days? 📚🎬🍿',
      'New show or movie lately? Come tell me about it 📖',
    ];
    expect(englishDay3Variants).toContain(day3Notif.body);
  });

  it('連續呼叫 reschedule 兩次，第二次會先 cancel 前一批再排新的 7 則（不會累加成 14 則）', async () => {
    await reschedule(baseState);
    const firstBatch = scheduleMock.mock.calls[0][0].notifications;

    getPendingMock.mockResolvedValue({
      notifications: firstBatch.map((n: any) => ({ id: n.id, extra: n.extra })),
    });

    await reschedule(baseState);

    expect(cancelMock).toHaveBeenLastCalledWith({
      notifications: firstBatch.map((n: any) => ({ id: n.id })),
    });
    const secondBatch = scheduleMock.mock.calls[1][0].notifications;
    expect(secondBatch).toHaveLength(7);
  });

  it('7 則通知的排程日期分別對應 now+3/7/14/30/60/90/180 天', async () => {
    const now = new Date('2026-08-31T10:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    await reschedule(baseState);

    const scheduled = scheduleMock.mock.calls[0][0].notifications;
    const expectedDays = [3, 7, 14, 30, 60, 90, 180];
    scheduled.forEach((n: any, i: number) => {
      const at: Date = n.schedule.at;
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + expectedDays[i]);
      expect(at.toDateString()).toBe(expectedDate.toDateString());
    });

    vi.useRealTimers();
  });

  it('notifComeBack 為 false 時不排 churn-rescue 通知', async () => {
    await reschedule({ ...baseState, notifComeBack: false });

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('權限未 granted 時完全不排程', async () => {
    checkPermissionsMock.mockResolvedValue({ display: 'denied' });

    await reschedule(baseState);

    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('notifEnabled 為 false 時 cancelAll 並直接返回，不呼叫 schedule', async () => {
    getPendingMock.mockResolvedValue({
      notifications: [{ id: 2001, extra: { storio: true } }],
    });

    await reschedule({ ...baseState, notifEnabled: false });

    expect(cancelMock).toHaveBeenCalledWith({ notifications: [{ id: 2001 }] });
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it('notifFolioReflection 獨立排程，不受 churn-rescue 7 則佔滿 toSchedule 影響', async () => {
    const state = {
      ...baseState,
      notifComeBack: true,
      notifFolioReflection: true,
      hasUnratedItemsWithin14Days: true,
    };

    await reschedule(state);

    const scheduled = scheduleMock.mock.calls[0][0].notifications;
    expect(scheduled).toHaveLength(8); // 7 churn + 1 folio
    expect(scheduled.some((n: any) => n.id === 1002)).toBe(true);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd client && npm test
```

預期：`reschedule()` 目前仍是舊的反應式邏輯，排程結果不含 7 則 churn 通知，多項斷言失敗。

- [ ] **Step 3: 改寫 `client/src/lib/notifications.ts` 的內容區塊與 `reschedule()`**

刪除以下函式（原檔案第 153-195 行區塊）：`mediaEmoji()`、`randomVariant()`、`buildLogStoryContent()`。

刪除 `import` 中對 `MESSAGE_VARIANTS` 的引用，並改為引入 churn 相關型別/常數：

```ts
import { NOTIFICATION_CONFIG, CHURN_TIERS, CHURN_MESSAGE_VARIANTS, ChurnTierKey } from './notification-config';
```

在原 `buildLogStoryContent` 位置（已刪除）新增 `buildComeBackContent`：

```ts
// ─── Come Back Content ───────────────────────────────────────────────────────

function buildComeBackContent(tierKey: ChurnTierKey, state: NotificationState): { title: string; body: string } | null {
  const pool = CHURN_MESSAGE_VARIANTS[state.language]?.[tierKey] ?? CHURN_MESSAGE_VARIANTS['en-US'][tierKey];
  const candidates = pool
    .map((template) => interpolate(template, {
      username: state.username,
      collectionCount: state.collectionCount,
      lastTitle: state.lastTitle,
    }))
    .filter((body): body is string => body !== null);

  if (candidates.length === 0) return null;
  const body = candidates[Math.floor(Math.random() * candidates.length)];
  return { title: 'Storio', body };
}
```

`buildFolioReflectionContent()` 維持不動。

刪除 `STORIO_NOTIF_ID_LOG_STORY` 常數定義（原第 236 行），改為：

```ts
const CHURN_NOTIF_ID_BASE = 2001; // CHURN_TIERS[0..6] → 2001–2007
const STORIO_NOTIF_ID_FOLIO = 1002;
```

將整個 `reschedule()` 函式（原第 243-330 行）改為：

```ts
/**
 * 主排程函式。每次 App Open Reset 時呼叫。
 * Come back：notifComeBack 為 true 時，一次預排 CHURN_TIERS 全部 7 則未來日期通知
 *   （now + tier.days 天，各自的 optimal hour）。取代舊有「條件達標才排今晚」的反應式邏輯。
 * Folio reflection：邏輯不變，獨立判斷是否排程，不受 come back 佔用 toSchedule 陣列長度影響。
 */
export async function reschedule(state: NotificationState): Promise<void> {
  if (!isNativePlatform()) return;
  if (!state.notifEnabled) {
    await cancelAll();
    return;
  }

  const { UNRATED_COOLDOWN_DAYS, FOLIO_REFLECTION_INTERVAL_DAYS, IGNORE_THRESHOLD } = NOTIFICATION_CONFIG;

  // 檢查權限
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;

  await cancelAll();

  const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  const now = Date.now();

  // ── Come back（churn-rescue 階梯）──────────────────────────────────────
  if (state.notifComeBack) {
    CHURN_TIERS.forEach((tier, index) => {
      const rawHour = getOptimalHour('come_back');
      const hour = applyBlackout(rawHour);
      const at = futureScheduleDate(tier.days, hour, NOTIFICATION_CONFIG.COME_BACK_FALLBACK_MINUTE);
      const content = buildComeBackContent(tier.key, state);
      if (!content) return;

      toSchedule.push({
        id: CHURN_NOTIF_ID_BASE + index,
        title: content.title,
        body: content.body,
        schedule: { at },
        extra: { storio: true, trigger: 'come_back', tier: tier.key },
        sound: undefined,
        actionTypeId: '',
        attachments: undefined,
        channelId: undefined,
      });
    });
  }

  // ── Folio reflection（獨立排程，不受 come back 佔用 toSchedule 影響）────
  if (state.notifFolioReflection) {
    const folioState = getTriggerState('folio_reflection');
    const shouldSkip = folioState.ignoredCount >= IGNORE_THRESHOLD;

    // 主觸發：14 天內未評分
    const cooldownOk = !folioState.lastSentAt ||
      (now - folioState.lastSentAt) > UNRATED_COOLDOWN_DAYS * 86400000;
    const primaryTrigger = state.hasUnratedItemsWithin14Days && cooldownOk;

    // 次觸發：心得逾期
    const secondaryTrigger = state.daysSinceLastReflection >= FOLIO_REFLECTION_INTERVAL_DAYS;

    if (!shouldSkip && (primaryTrigger || secondaryTrigger)) {
      const rawHour = getOptimalHour('folio_reflection');
      const hour = applyBlackout(rawHour);
      const at = nextScheduleDate(hour, NOTIFICATION_CONFIG.FOLIO_REFLECTION_FALLBACK_MINUTE);
      const { title, body } = buildFolioReflectionContent(state);
      toSchedule.push({
        id: STORIO_NOTIF_ID_FOLIO,
        title,
        body,
        schedule: { at },
        extra: { storio: true, trigger: 'folio_reflection' },
        sound: undefined,
        actionTypeId: '',
        attachments: undefined,
        channelId: undefined,
      });
      saveTriggerState('folio_reflection', { ...folioState, lastSentAt: now });
    }
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
    try {
      localStorage.setItem(LAST_SCHEDULED_KEY, String(now));
    } catch {
      // 靜默略過
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd client && npm test
```

預期：全部測試 PASS。

- [ ] **Step 5: 檢查 TypeScript 編譯無誤**

```bash
cd client && npx tsc --noEmit
```

預期：無錯誤（確認死碼移除後沒有殘留的型別引用）。

- [ ] **Step 6: Commit**

```bash
git add client/src/lib/notifications.ts client/src/lib/__tests__/notifications.test.ts
git commit -m "fix(notifications): reschedule() 改為主動預排 7 層未來日期，修復排程 bug；移除 Log a story 死碼"
```

---

### Task 6: 命名同步（`notifLogStory` → `notifComeBack`）+ Profile 設定頁改名 + 移除死碼呼叫

**Files:**
- Modify: `client/src/store/settingsStore.ts`
- Modify: `client/src/components/AppOpenReset.tsx`
- Modify: `client/src/components/NotificationPrimerCard.tsx`
- Modify: `client/src/app/profile/notifications/page.tsx`
- Modify: `client/src/components/AddToFolioModal.tsx`
- Modify: `client/src/i18n/locales.ts`

**Interfaces:**
- Consumes: Task 4 的 `fetchNotificationState()` 新簽名（第 5 參數 `notifComeBack`）、Task 5 的 `reschedule()`。
- Produces: 無新介面，純命名一致性重構 + UI 文案更新，不改變執行邏輯。

- [ ] **Step 1: `client/src/store/settingsStore.ts` — 欄位改名**

第 13 行 `notifLogStory: boolean;` 改為 `notifComeBack: boolean;`
第 28 行 `setNotifLogStory: (enabled: boolean) => void;` 改為 `setNotifComeBack: (enabled: boolean) => void;`
第 44 行 `notifLogStory: true,` 改為 `notifComeBack: true,`
第 57 行 `setNotifLogStory: (enabled) => set({ notifLogStory: enabled }),` 改為 `setNotifComeBack: (enabled) => set({ notifComeBack: enabled }),`

- [ ] **Step 2: `client/src/components/AppOpenReset.tsx` — 欄位改名**

第 20 行：
```ts
notifEnabled, notifLogStory, notifFolioReflection,
```
改為：
```ts
notifEnabled, notifComeBack, notifFolioReflection,
```

第 47-49 行：
```ts
const state = await notificationManager.fetchNotificationState(
  token, username, resolvedLang, notifEnabled, notifLogStory, notifFolioReflection
);
```
改為：
```ts
const state = await notificationManager.fetchNotificationState(
  token, username, resolvedLang, notifEnabled, notifComeBack, notifFolioReflection
);
```

第 79-80 行 dependency array：
```ts
}, [authLoading, token, notifEnabled, notifLogStory, notifFolioReflection, language,
```
改為：
```ts
}, [authLoading, token, notifComeBack, notifFolioReflection, language,
```

第 118-120 行（appStateChange handler 內）：
```ts
const state = await notificationManager.fetchNotificationState(
  token, '', resolvedLang, true, notifLogStory, notifFolioReflection
);
```
改為：
```ts
const state = await notificationManager.fetchNotificationState(
  token, '', resolvedLang, true, notifComeBack, notifFolioReflection
);
```

第 130 行 dependency array：
```ts
}, [notifEnabled, token, language, notifLogStory, notifFolioReflection,
```
改為：
```ts
}, [notifEnabled, token, language, notifComeBack, notifFolioReflection,
```

- [ ] **Step 3: `client/src/components/NotificationPrimerCard.tsx` — 欄位改名**

第 27 行：
```ts
notifLogStory,
```
改為：
```ts
notifComeBack,
```

第 42-44 行：
```ts
const state = await fetchNotificationState(
  token, '', resolvedLang, true, notifLogStory, notifFolioReflection
);
```
改為：
```ts
const state = await fetchNotificationState(
  token, '', resolvedLang, true, notifComeBack, notifFolioReflection
);
```

- [ ] **Step 4: `client/src/app/profile/notifications/page.tsx` — 欄位改名 + UI 文案**

第 23 行：
```ts
notifLogStory, setNotifLogStory,
```
改為：
```ts
notifComeBack, setNotifComeBack,
```

第 57-59 行：
```ts
const state = await fetchNotificationState(
  token, '', resolvedLang, true, notifLogStory, notifFolioReflection
);
```
改為：
```ts
const state = await fetchNotificationState(
  token, '', resolvedLang, true, notifComeBack, notifFolioReflection
);
```

第 157-179 行（Log a story 開關區塊），三處 `notifLogStory`/`setNotifLogStory` 改為 `notifComeBack`/`setNotifComeBack`，並把註解 `{/* Log a story */}` 改為 `{/* Come back */}`：

```tsx
            {/* Come back */}
            <div className="p-5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <BookMarked size={20} className="text-text-desc" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{np.logStory}</p>
                  <p className="text-text-desc text-xs mt-0.5">{np.logStoryDesc}</p>
                </div>
              </div>
              <button
                onClick={() => setNotifComeBack(!notifComeBack)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${notifComeBack ? 'bg-accent-gold' : 'bg-white/15'}`}
              >
                <motion.span
                  layout
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
                  animate={{ left: notifComeBack ? '1.375rem' : '0.25rem' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              </button>
            </div>
```

- [ ] **Step 5: `client/src/i18n/locales.ts` — 文案改名**

第 213-214 行（en-US）：
```ts
        logStory: 'Log a story',
        logStoryDesc: 'Daily nudge to record something',
```
改為：
```ts
        logStory: 'Come back reminders',
        logStoryDesc: 'Personalized nudges if you\'ve been away for a while',
```

第 497-498 行（zh-TW）：
```ts
        logStory: '記錄新典藏',
        logStoryDesc: '提醒你記錄最近看的作品',
```
改為：
```ts
        logStory: '回訪提醒',
        logStoryDesc: '好一陣子沒開 Storio 時，提醒你回來看看',
```

> `np.logStory`/`np.logStoryDesc` 這兩個 key 名稱本身不改（避免大範圍改動 i18n key 對照），只改文案內容——這是刻意的最小變動，key 名稱與其代表的通知類型已經不再一一對應，但符合現有 `np.xxx` 命名慣例即可，未來如需徹底更名可另開任務。

- [ ] **Step 6: `client/src/components/AddToFolioModal.tsx` — 移除死碼呼叫**

第 18 行：
```ts
import { recordEngagement, resetIgnoredCount } from '@/lib/notifications';
```
改為：
```ts
import { recordEngagement } from '@/lib/notifications';
```

第 91-96 行：
```ts
      // 通知：記錄行為信號（iOS only）
      if (isNativePlatform()) {
        recordEngagement(2);
        resetIgnoredCount('log_story');
        emitStoryAdded();
      }
```
改為：
```ts
      // 通知：記錄行為信號（iOS only）
      if (isNativePlatform()) {
        recordEngagement(2);
        emitStoryAdded();
      }
```

- [ ] **Step 7: 確認沒有殘留的 `notifLogStory`/`log_story` 引用**

```bash
grep -rn "notifLogStory\|resetIgnoredCount('log_story')" client/src --include="*.ts" --include="*.tsx"
```

預期：無任何輸出。

- [ ] **Step 8: TypeScript 編譯與既有單元測試皆通過**

```bash
cd client && npx tsc --noEmit && npm test
```

預期：無編譯錯誤，測試全部 PASS。

- [ ] **Step 9: Commit**

```bash
git add client/src/store/settingsStore.ts client/src/components/AppOpenReset.tsx client/src/components/NotificationPrimerCard.tsx client/src/app/profile/notifications/page.tsx client/src/components/AddToFolioModal.tsx client/src/i18n/locales.ts
git commit -m "refactor(notifications): notifLogStory 改名 notifComeBack，Profile 開關文案改為「回訪提醒」，移除死碼呼叫"
```

---

### Task 7: iOS 模擬器手動驗收（Come back 排程正確性）

**Files:** 無程式碼變更，純驗收步驟。

**Interfaces:** 無。

- [ ] **Step 1: 啟動 iOS 模擬器並執行 dev build**

比照 `docs/StorioWiki.md` / `docs/DEV_SETUP.md` 既有流程啟動模擬器，確保通知權限已 granted、`notifEnabled`/`notifComeBack` 皆為 true，並在 app 內至少新增一筆典藏（觸發 `AddToFolioModal` → `recordEngagement`）。

- [ ] **Step 2: 用 CDP 找到 WebView socket**

```bash
lsof -U | grep webinspectord_sim
```

- [ ] **Step 3: 啟動 ios_webkit_debug_proxy**

```bash
ios_webkit_debug_proxy -s "unix:<Step 2 取得的 socket 路徑>" -c null:9221,:9222-9230
```

- [ ] **Step 4: 觸發一次 app open（重新載入 WebView 或重啟 app），透過 CDP 呼叫 `getPending()` 驗證**

參考 `project_v1_14_notifications.md` 記錄的 `Target.sendMessageToTarget` 呼叫方式，在 WebView context 內執行：

```js
window.__pendingCheck = null;
window.Capacitor.Plugins.LocalNotifications.getPending().then(r => { window.__pendingCheck = r; });
```

sleep 1-2 秒後讀取 `window.__pendingCheck`，驗證：
- `notifications` 陣列長度為 8（7 則 come-back + 1 則 folio reflection，若 `notifFolioReflection` 條件未達標則為 7 則）
- id 為 `2001`–`2007`，`extra.tier` 依序為 `day3`/`day7`/`day14`/`day30`/`day60`/`day90`/`day180`
- 每則 `schedule.at` 的日期與「今天 + 對應天數」相符（可用 `new Date(n.schedule.at)` 換算比對）
- `body` 內容為 spec 定案文案之一，且若 `username` 有值，`{username}` 已被正確代入（非原始 `{username}` 字面字串殘留）

- [ ] **Step 5: 驗證重新開啟 app 會 cancel 並重排**

再次觸發 app open，重複 Step 4 的 `getPending()` 呼叫，確認：
- 舊的 7 則 come-back 通知已被取消（id 不重複累加，仍是 7 則而非 14 則）
- `schedule.at` 的日期以**這次**觸發時間重新計算（往後推移），而非沿用上一次的日期

- [ ] **Step 6: 記錄結果**

若全部符合預期，記錄到記憶（memory）供未來版本參考，比照既有 v1.14.0 驗收記錄格式。若發現落差，回到對應 Task 用 `superpowers:systematic-debugging` 排查（不得跳過此步驟直接宣告完成）。
