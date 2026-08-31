# Churn-Rescue Notifications — 修復排程 bug + 多層召回設計文件

**日期**：2026-08-31
**背景**：延續 `2026-06-03-local-notifications-design.md`（v1.14.0 Local Notification）。使用者回報「幾天沒開 app」的提醒從未實際收到，經 `/investigate`（systematic-debugging）查明為架構性排程 bug，藉此機會一併把單一「Log a story」通知升級為多層 churn-rescue 召回階梯。

---

## 問題根因（bug）

原本 `reschedule()`（`client/src/lib/notifications.ts`）只在 App Open 時執行，且用「現在」的狀態即時判斷是否已達觸發門檻（`daysSinceLastLog >= 3`），排程時間永遠是「今天或明天」（`nextScheduleDate()`）。

推演：使用者今天記錄 → `daysSinceLastLog = 0` → 不排程 → 使用者不再開 app → 沒有任何後續呼叫會排程 → 永遠不會收到通知。這個機制只對「已經離開超過門檻天數、然後自己重新打開 app」的使用者有效，恰好是不需要被召回的那群人。

**修法**：排程改為**主動預排未來日期**，而非「達標才排程」。

---

## 使用者故事

身為 Storio 使用者：
- 我希望即使完全不再打開 app，也能在關鍵的離開天數收到召回提醒
- 我希望離開越久，提醒的語氣與內容越不一樣（不是同一句話重播）
- 我不希望被無限騷擾——過了某個天數就代表我已流失，系統該放棄

---

## 技術方案

**Local Notification，維持零後端**（沿用既有 `@capacitor/local-notifications`，不新增 Push/APNs 基礎設施）。

### 核心機制：一次預排全部未來日期

```
每次 app 開啟（AppOpenReset）：
  cancel 所有 churn-rescue 通知
  now = 當下時刻
  for each tier in CHURN_TIERS (3/7/14/30/60/90/180 天):
    at = (now + tier.days 天) 的 getOptimalHour() 時段（套用 blackout）
    schedule 該則通知（title/body 從該 tier 的文案池隨機挑一則，套入 username/collectionCount/lastTitle）
```

- 一次排 7 則到 iOS 本地通知佇列（iOS 單一 app pending 上限 64 則，遠低於上限）。
- 使用者只要重新打開 app（無論第幾天回來），整批 cancel 並以新的「現在」重新排 7 則——正確處理「若真的沒回來會依序收到 3/7/14/30/60/90/180 天」序列；中途回來則倒數歸零重新開始。
- 這個「預先排未來日期」的寫法直接解掉原本的排程 bug：不再需要「條件已達標」才觸發，天數到了 iOS 系統本身就會自動跳出通知，跟 app 是否被重新打開無關。

### 與現有通知類型的整合

- **取代** `Log a story`（原本以「距上次新增典藏 ≥3 天」為觸發基準）。新機制改以「距上次開啟 app」為基準。
- **保留** `Folio reflection`（未評分/心得逾期）獨立運作，觸發邏輯、cooldown、智慧忽略偵測都不動。
- **不套用**智慧忽略偵測到 churn-rescue 階梯——180 天本身就是內建停損點，若疊加「連續 3 次未回應就停」會導致階梯在 day14 左右就被提前中止，永遠等不到強度更高的 60/90/180 天文案。
- `MAX_PER_DAY`（每日上限 2 則）維持不變，只在 churn-rescue 某一 tier 剛好與 Folio reflection 撞同一天時發生截斷，機率低、不需要特別處理。
- 通知 ID：`STORIO_NOTIF_ID_LOG_STORY = 1001` 廢除，改為 7 個固定 ID `2001`–`2007`（依序對應 day3/7/14/30/60/90/180）。`Folio reflection` 維持 `1002`。

### 死碼清理

以下僅被 `Log a story` 使用，隨其一併移除：
- `MESSAGE_VARIANTS`（`notification-config.ts`）與 `randomVariant()`
- `mediaEmoji()`、`buildLogStoryContent()`
- `AddToFolioModal.tsx:94` 的 `resetIgnoredCount('log_story')` 呼叫（churn-rescue 不用忽略偵測，無需重置）

---

## Config 資料結構（`notification-config.ts`）

```ts
export const CHURN_TIERS = [
  { days: 3,   key: 'day3'   },
  { days: 7,   key: 'day7'   },
  { days: 14,  key: 'day14'  },
  { days: 30,  key: 'day30'  },
  { days: 60,  key: 'day60'  },
  { days: 90,  key: 'day90'  },
  { days: 180, key: 'day180' },
] as const;

export const CHURN_MESSAGE_VARIANTS: Record<'zh-TW' | 'en-US', Record<ChurnTierKey, string[]>> = {
  'zh-TW': { day3: [...], day7: [...], day14: [...], day30: [...], day60: [...], day90: [...], day180: [...] },
  'en-US': { day3: [...], ... },
};
```

每層 2 則，7 層 × 2 語言 = 28 則。內容（已與使用者定稿）：

| 層級 | zh-TW #1 | zh-TW #2 | en-US #1 | en-US #2 |
|------|----------|----------|----------|----------|
| Day3 | 這兩天有看了什麼新的書籍、電影或影集嗎？📚🎬🍿 | 追了新劇還是看了新片？別忘了回來記一筆 📖 | Watched anything new these past two days? 📚🎬🍿 | New show or movie lately? Come tell me about it 📖 |
| Day7 | {username}，已經一週沒有更新Storio了，該來紀錄一下了吧 | 一週過去了，你的書單片單是不是偷偷變長卻沒告訴我？ | {username}, it's been a week since your last update — time to log something? | A week's gone by... did your watchlist quietly get longer without me? |
| Day14 | 還記得我嗎？已經兩週沒來Storio逛逛囉🙇‍♂️🙇‍♀️🙇 | {username}，兩週不見，你的Storio有點想你了 | Remember me? It's been two weeks since you stopped by 🙇‍♂️🙇‍♀️ | {username}, two weeks of silence. Storio's been missing you |
| Day30 | 你已典藏了{collectionCount}個故事，但這個月是0個🫣 | {username}，一整個月零紀錄，是我做錯了什麼嗎？ | You've collected {collectionCount} stories — but zero this month 🫣 | {username}, a whole month with nothing logged... did I do something wrong? |
| Day60 | 已經過兩個月了，就算是權力遊戲也該追完8季了吧 | 兩個月沒消息，該不會是在忙著追新劇沒空理我吧 | Two months now. Even Game of Thrones has 8 seasons — you'd have finished it by now | Two months of silence. Busy binging something you haven't told me about? |
| Day90 | 我們都沉澱了三個月，我想你應該有遇到很不錯的故事吧，該跟我說說了吧 | 三個月了，我還留著你上次收藏的《{lastTitle}》，你呢？ | Three months of quiet. I bet you've found a story worth telling me about | Three months in — I still remember your last pick, {lastTitle}. Do you? |
| Day180 | 都過半年了還不來找我，所以愛真的會消失對嗎🥹🥹 | 半年沒你的消息，我開始練習忘記你了（開玩笑的，快回來）🥹 | Half a year and you still haven't come back. Does love really fade? 🥹🥹 | Six months of silence. I'm starting to forget what you look like (kidding — come back) 🥹 |

### 個人化變數與 fallback

新增通用 `interpolate(template, vars)`：
- `{collectionCount}`、`{lastTitle}` 直接代入；若該 tier 選中的變體需要 `{lastTitle}` 但 `state.lastTitle` 為 `null`（使用者從未有 notes 或無資料），該變體從候選池剔除，改選另一則不需要該變數的變體。
- `{username}` 若為空字串：移除模板開頭的 `"{username}，"` / `"{username}, "` 前綴（含標點），其餘句子原樣呈現，避免出現開頭逗號的斷句。

---

## Profile 設定頁改動

`client/src/app/profile/notifications/page.tsx` 的「Log a story」開關改名為「回訪提醒」（en-US: "Come back reminders"），描述文字同步更新為說明「好一陣子沒開 Storio 時提醒你回來看看」。

- Store：`notifLogStory` → `notifComeBack`（`settingsStore.ts`、`AppOpenReset.tsx`、`NotificationPrimerCard.tsx`、`profile/notifications/page.tsx`、`collection/item/page.tsx` 同步改名，純命名一致性重構，不改變行為）
- `locales.ts`：新增/改寫 `np.logStory` → `np.comeBack`、`np.logStoryDesc` → `np.comeBackDesc`（zh-TW + en-US）

---

## 測試計畫（TDD）

單元測試（`client/src/lib/__tests__/notifications.test.ts` 或既有測試檔案位置）：

1. **排程日期正確性**：給定 `now`，驗證 7 個 tier 各自排出 `now + N天` 當天的 `getOptimalHour()` 時段（非「今天/明天」）。
2. **Blackout 套用**：optimal hour 落在 00:00–08:00 時，7 個 tier 都正確推延到 08:00。
3. **Cancel-then-reschedule**：重複呼叫 reschedule 時，前一批 7 則會被完整取消，不會疊加成 14 則。
4. **文案選取與 interpolate**：
   - `{username}` 為空時，含前綴的模板正確移除前綴且不留孤立標點。
   - `{lastTitle}` 為 `null` 時，需要該變數的變體被排除，改選另一則。
   - `{collectionCount}` 正確代入數字。
5. **語言切換**：`zh-TW`/`en-US` 各自從對應語言池挑選，不會混用。
6. **Folio reflection 不受影響**：既有測試（ignoredCount、cooldown、14 天視窗）維持全綠，證明未被 churn-rescue 改動波及。
7. **回歸**：`AddToFolioModal.tsx` 移除 `resetIgnoredCount('log_story')` 後，Folio reflection 相關重置邏輯不受影響。

因無現有前端測試 CI（Playwright 落後未進 CI），本次驗證以**單元測試 + 手動 iOS 模擬器 CDP 驗收**為主，比照 v1.14.0 的驗收方法（`window.Capacitor.Plugins.LocalNotifications.getPending()` 直接檢查 7 則 pending 通知的 `schedule.at` 是否對應正確未來日期）。

---

## 影響檔案清單

- `client/src/lib/notification-config.ts` — 新增 `CHURN_TIERS`、`CHURN_MESSAGE_VARIANTS`；移除 `MESSAGE_VARIANTS`
- `client/src/lib/notifications.ts` — 重寫 `reschedule()` 排程邏輯、新增 `interpolate()`、移除 `buildLogStoryContent`/`randomVariant`/`mediaEmoji`
- `client/src/components/AppOpenReset.tsx` — `notifLogStory` → `notifComeBack` 命名同步
- `client/src/components/AddToFolioModal.tsx` — 移除 `resetIgnoredCount('log_story')`
- `client/src/components/NotificationPrimerCard.tsx` — 命名同步
- `client/src/app/profile/notifications/page.tsx` — 開關改名 + 命名同步
- `client/src/app/collection/item/page.tsx` — 命名同步
- `client/src/store/settingsStore.ts` — `notifLogStory` → `notifComeBack`
- `client/src/lib/locales.ts` — 文案 key 改名

---

## 非目標

- 不導入真正的 Push Notification / APNs（維持零後端）
- 不開放使用者自訂天數或文案（沿用「參數 hardcoded，未來版本再開放 UI」的既有慣例）
- Folio reflection 邏輯本次不變動
