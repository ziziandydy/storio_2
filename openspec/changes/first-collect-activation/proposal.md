## Why

2026-10 數據顯示，註冊（含匿名）約 2,588 人，收藏過的僅約 20 人，近 30 天只有 1 人新增收藏。新用戶進首頁時，畫面是空的 7 日趨勢圖，最亮的按鈕通往空的館藏，沒有任何一處說「收藏你的第一部作品」；收藏成功畫面也平淡，訪客更不知道自己最多只能存 10 部、換手機會消失。現在匿名帳號灌水已修正，正是補上啟用流程的時機。

完整設計與 mockup 見 `docs/superpowers/specs/2026-11-08-first-collect-activation-design.md`。

## What Changes

- 館藏為 0 時，首頁以「引導區」取代空趨勢圖與「檢視 MY STORIO」按鈕：一句目標、一顆搜尋按鈕、一行指向熱門海報的提示。搜尋入口是按鈕而非輸入框，點擊進搜尋頁並自動對焦。館藏 ≥ 1 恢復現狀。
- 學習卡最後一張的按鈕由「開始使用」改為「開始收藏第一部」，點擊後回首頁並看到引導區。
- 第一部收藏成功時，成功視窗改為慶祝版：標題「收藏成功」、海報帶金色光暈與勾勾、金光閃爍、彩帶炸開並從上方灑落約 3 秒、iOS 成功觸覺（連兩下）。第二部起維持現有簡單成功畫面。
- 訪客（未登入）每次收藏成功後，卡片換成登入引導：說明最多 10 部、換手機或重裝會消失，提供 Apple／Google 登入，「稍後再說」前往 My Storio；點卡片外即收起。
- 成功視窗標題改為跟隨語言（原本寫死英文「Successfully add to storio」），第二部起的簡單版也一併本地化。
- 已登入用戶符合「帳號滿 30 天」或「累計收藏 2 部以上」任一情境，且這次剛成功收藏時，成功視窗關閉後約 1.5 秒呼叫 iOS 系統評價視窗；同一用戶 90 天內不重複呼叫。

## Capabilities

### New Capabilities
- `first-collect-guide`: 收藏總數欄位 `total_count`、館藏為 0 時首頁的引導區行為與取代關係、搜尋按鈕進搜尋頁自動對焦。
- `first-collect-celebration`: 第一部收藏成功的慶祝畫面與觸覺；訪客收藏成功的登入引導卡與收起行為。
- `review-prompt`: 已登入用戶在兩種獨立情境下呼叫系統評價視窗的條件、時機與節流。

### Modified Capabilities
- `onboarding-guide`: 最後一張學習卡的按鈕改為「開始收藏第一部」，完成後的行為（關閉、寫入 localStorage）不變，並確保回首頁後引導區可見。

## Impact

- 前端（`client/src`）：
  - `app/page.tsx`（引導區、隱藏 `HomeStats` 與檢視按鈕）
  - `components/OnboardingGuideModal.tsx`
  - `components/AddToFolioModal.tsx`（success 模式的慶祝與訪客卡）
  - 新增引導區與慶祝元件
  - `app/search/page.tsx`（新增 `?focus=1` 時自動對焦；現況沒有自動對焦）
  - `i18n/locales.ts`（zh-TW／en 新字串）
- 依賴：新增 `@capacitor-community/in-app-review@^7.1.0` 與 `@capacitor/haptics@^7.0.5`（專案是 Capacitor 7，兩者最新的 8.x 要求 core >= 8，不可裝）。需 `cap sync`，隨下次 iOS 發版送審。
- 後端：`GET /api/v1/collection/stats` 與 `POST /api/v1/collection` 的回應各新增 `total_count` 欄位（皆向後相容；stats 沿用已取回的列數、POST 沿用既有 `count_user_stories`，三層架構，Controller 不碰資料庫）；無資料庫 schema 變更。帳號年齡取自前端 `user.created_at`（訪客登入會產生新帳號，故為登入日起算）。
- 不動：登入視窗、搜尋頁本身、熱門海報點擊流程、第二部起的成功畫面、Profile 的「為我們評分」。
- 風險：評價情境 2 偏早（可能新用戶第一天就被問），已由 Tu 知情採用；Apple 一年最多顯示 3 次且無法偵測是否已評價。
