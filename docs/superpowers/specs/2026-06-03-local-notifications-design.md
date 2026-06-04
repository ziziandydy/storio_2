# Local Notifications — v1.14.0 設計文件

**日期**：2026-06-03
**版本**：v1.14.0
**OpenSpec**：`openspec/changes/local-notifications/`

---

## 使用者故事

身為 Storio 使用者：
- 我希望 app 在我幾天沒記錄時提醒我，讓典藏成為習慣
- 我希望通知出現在我習慣使用手機的時間，而不是 app 假設的某個固定時間
- 我希望系統能感知「我就是暫時不想寫心得」——如果我一直沒有回應，它應該自動停下來
- 我不希望一天被提醒超過兩次，也不希望深夜被打擾

---

## 技術方案

**Local Notification + App Open Reset**（非 Push Notification）

- 零後端需求，不需要 APNs 憑證或 server-side 排程
- 每次 app 開啟時重新排程個人化通知
- v1.15.x 補 Push Notification 覆蓋完全不開 app 的用戶（n8n 方案）

---

## 核心機制

### App Open Reset
```
每次 app 開啟：
  recordEngagement(1)
  → 讀取 last story / collection data
  → getOptimalHour()
  → 各 trigger 檢查 (間隔 / cooldown / ignoredCount)
  → LocalNotifications.schedule(≤2 則)
```

### 行為學習時段（Behavioral Timing）
- app 開啟 → weight 1；記錄 Storio → weight 2
- 保留最近 21 筆（滑動窗口）
- 資料 < 7 筆：fallback（Log a story 21:00、Folio reflection 20:00）
- 資料 ≥ 7 筆：計算加權峰值 hour，優先晚間（18–23），次選早晨（8–13）

### 智慧忽略偵測
- 每個 trigger 各自維護 `ignoredCount`、`lastSentAt`
- 連續 3 次未回應 → 停止該觸發路徑
- 使用者評分 → 重置 `folio_reflection.ignoredCount`
- 使用者記錄 → 重置 `log_story.ignoredCount`

### 未評分觸發過濾
- 僅針對 14 天內加入的收藏（舊的未評分 = 放棄）
- 7 天冷卻（最多每週一次）

---

## 通知類型

| 類型 | 觸發 | 排程時間 | 內容範例 |
|------|------|---------|---------|
| Log a story | 距上次記錄 ≥ 3 天 | `getOptimalHour()` / fallback 21:00 | `「Anderson，3 天沒有新典藏了 🎬」` |
| Folio reflection | 14 天內未評分（冷卻中除外）or 心得逾 7 天 | `getOptimalHour()` / fallback 20:00 | `「《小王子》給你什麼感悟？🌙」` |

每日上限 2 則，00:00–08:00 blackout。

---

## Permission 策略

**新用戶**：首筆 Storio 後，下次開 app → Permission Primer 底部卡片
- `[開啟提醒]` → iOS 對話框
- `[之後再說]` → 30 天冷卻；dismiss × 2 後永不再出現
- 未記錄任何 Storio 前不顯示

**舊用戶（升級後）**：新增 Storio 成功 → 非阻斷式底部 Banner
- `[開啟]` → Profile > Notifications
- `[✕]` → 30 天冷卻，最多出現兩次

**iOS 拒絕後**：Toast + `[前往設定]`，使用者返回後自動偵測並啟動

---

## 所有 Hardcoded 參數

| 參數 | 值 | 說明 |
|------|---|------|
| `LOG_STORY_INTERVAL_DAYS` | 3 | 未記錄幾天後觸發 |
| `LOG_STORY_FALLBACK_HOUR` | 21 | 資料不足時的排程時間 |
| `FOLIO_REFLECTION_INTERVAL_DAYS` | 7 | 未撰寫心得幾天後觸發 |
| `FOLIO_REFLECTION_FALLBACK_HOUR` | 20 | 資料不足時的排程時間 |
| `MAX_PER_DAY` | 2 | 每日最多推送數 |
| `BLACKOUT_START_HOUR` | 0 | Blackout 開始 |
| `BLACKOUT_END_HOUR` | 8 | Blackout 結束 |
| `UNRATED_RECENT_WINDOW_DAYS` | 14 | 未評分觸發的有效收藏時間窗口 |
| `UNRATED_COOLDOWN_DAYS` | 7 | 未評分觸發的冷卻天數 |
| `IGNORE_THRESHOLD` | 3 | 幾次未回應後停止觸發 |
| `MIN_DATA_POINTS_FOR_LEARNING` | 7 | 切換學習時段所需最少資料筆數 |
| `ENGAGEMENT_HISTORY_MAX` | 21 | engagement history 保留最大筆數 |
| `STORY_CREATE_WEIGHT` | 2 | 記錄 Storio 的 engagement 權重 |
| `PEAK_EVENING_START/END` | 18/23 | 優先選取的晚間峰值範圍 |
| `PEAK_MORNING_START/END` | 8/13 | 次選的早晨峰值範圍 |
| `PRIMER_DISMISS_COOLDOWN_DAYS` | 30 | Primer dismiss 後的冷卻天數 |
| `PRIMER_MAX_DISMISS_COUNT` | 2 | 最多允許 dismiss 次數 |

---

## 設計討論過程中排除的方案

| 方案 | 排除原因 |
|------|---------|
| Push Notification（APNs）| 需 APNs 憑證 + 後端基礎設施，工程量 10×；v1.15.x 補 n8n 方案 |
| Onboarding 詢問習慣時間 | 增加摩擦，用戶自我報告不如行為資料準確 |
| 預先排程 30 天通知 | 內容會過時；iOS 最多 64 則 pending |
| 通知 Action Button「略過」 | 需額外 iOS capability，複雜度不值 |

---

## 實作入口

- **OpenSpec tasks**：`openspec/changes/local-notifications/tasks.md`（13 組 46 tasks）
- **執行指令**：`/opsx:apply`
