## Context

新用戶進首頁時沒有明確的下一步（空趨勢圖、通往空館藏的按鈕、無文字的「+」）。熱門海報與搜尋結果點下去會直接開 `AddToFolioModal`，所以只要引導新用戶「點海報」或「去搜尋」，收藏流程本身是通的。需要補的是：首頁的引導、第一部的慶祝、訪客的登入引導、評價時機。

現況要點（已在本機跑過、讀過程式碼）：
- `app/page.tsx` 在 `useEffect` 中依序決定登入視窗與學習卡；`HomeStats` 用 `/api/v1/collection/stats`（`this_year`、`last_30_days` 等），**沒有總收藏數**。
- 收藏流程：`SectionSlider`／`search/page.tsx`／`details/page.tsx` 的 `handleAddToFolio` 呼叫 `POST /api/v1/collection`，回傳新增的項目；403 代表訪客達 10 部上限，409 代表重複。成功後 `AddToFolioModal` 進入 `success` 模式。
- `AddToFolioModal` 背景遮罩本來就可點擊關閉。
- 訪客是 Supabase 匿名帳號（`user.is_anonymous`）；登入後由 `migrate_guest_data` 搬移收藏。
- Profile 已有「為我們評分」與「留下評論」按鈕（`app-store-rating` 規格），直接開 App Store 寫評論頁。
- 專案尚無 `@capacitor/haptics`、`@capacitor-community/in-app-review`；專案為 Capacitor 7.6.10，兩個外掛最新的 8.x 要求 `@capacitor/core >= 8`，必須釘 7.x。
- 搜尋頁（`app/search/page.tsx`）**沒有**自動對焦：`focus()` 只出現在清除按鈕的處理（約第 134–136 行），全檔無 `autoFocus`。
- 訪客用 OAuth 登入會產生新帳號，再以 `migrate_guest_data(old, new)` 搬收藏（`hooks/useAuth.ts` 約第 101–104 行），故新帳號的 `created_at` 是登入日。

## Goals / Non-Goals

**Goals:**
- 館藏為 0 時給明確下一步；第一部收藏有難忘的慶祝；訪客知道上限並被引導登入；在合適時機累積評論。
- 前端為主，後端只做一個向後相容的小擴充。

**Non-Goals:**
- 不改登入視窗、搜尋頁本身、熱門海報點擊流程、第二部起的成功畫面、Profile 評分按鈕。
- 不做自製評價邀請畫面（審核規範 5.6.1 風險）。
- 不做 Android／網頁的評價呼叫（本次只 iOS 原生）。
- 不新增互動事件類型（留待後續評估）。

## Decisions

### D1：新增 `total_count` 到 `/api/v1/collection/stats`（向後相容）
「館藏為 0」「第一部」「累計 ≥ 2」都需要總收藏數，現有 stats 沒有。選項：(a) 拉整份收藏清單取長度；(b) stats 回傳新增欄位 `total_count`。選 (b)：只多一個 `COUNT`，舊版 App 讀不到新欄位也不受影響（additive），符合專案既有的「additive 欄位」做法。Service／Repository 照三層架構新增計數方法，Controller 不碰資料庫。
- 替代方案：用 `daily_counts_30d` 或 `this_year` 推算。不採用：不等於總數，用戶超過一年沒收藏會誤判為 0。

### D2：前端以一個小 hook 提供收藏數
新增 `useCollectionCount`（讀 `/stats` 的 `total_count`，含 `loading` 狀態）。首頁用它決定顯示引導區或原本的統計；載入中**不顯示引導區也不顯示統計**，只留標題與熱門列表，避免閃爍。`AddToFolioModal` 在儲存成功後重新查一次 `total_count`，`=== 1` 即第一部、`>= 2` 供評價判斷。不使用「收藏前先查」：兩次請求之間可能競態，成功後查詢才準確。
- 查詢失敗：視為未知，不顯示慶祝與評價，維持現有成功畫面（寧可少一次慶祝，也不誤報）。

### D3：慶祝與訪客卡放在 `AddToFolioModal` 的 `success` 模式內
不新增獨立頁面或全域 overlay。把 `success` 內容拆成三個小元件：`FirstCollectCelebration`（第一部）、`GuestSaveCard`（訪客）、現有簡單版（其餘）。選擇規則：
1. 第一部（`total_count === 1`）：先播慶祝。若為訪客，慶祝動畫結束後（約 3.5 秒）卡片切換為 `GuestSaveCard`。
2. 訪客且非第一部：直接 `GuestSaveCard`。
3. 其餘：現有簡單成功畫面。

背景遮罩點擊關閉的現有行為不變，因此訪客卡自然符合「點卡片外收起、回到原本頁面」。

### D4：慶祝動畫以 CSS 實作，不引入動畫函式庫
金光閃爍、彩帶炸開、彩帶灑落、勾勾彈出都用 CSS keyframes 與少量 DOM 節點（約 100 個）。專案已有 framer-motion，但這種大量粒子用純 CSS 較省效能且好控制。節點的位置與色彩用固定演算（非隨機），行為可重現、便於截圖測試。遵守 `prefers-reduced-motion`：改為靜態光暈加勾勾。動畫約 3 秒結束後節點卸載。

### D5：觸覺用 `@capacitor/haptics`，僅原生平台
慶祝開始時呼叫兩次 `notification(SUCCESS)`（間隔約 120ms）。以 `isNativePlatform()` 判斷，網頁不呼叫；呼叫失敗吞掉，不影響畫面。

### D6：系統評價視窗用 `@capacitor-community/in-app-review`，並自己節流
- 呼叫條件（已登入；以下任一，且這次剛成功儲存）：帳號滿 30 天（`user.created_at`，因訪客登入會建新帳號，實為「登入滿 30 天」）；POST 回應的 `total_count >= 2`。
- 時機：成功視窗關閉後約 1.5 秒呼叫；若當次顯示慶祝，不在同次呼叫（避免打斷慶祝）。**排程放在模組層級**（`lib/reviewPrompt.ts` 的函式內用 `setTimeout`，不用 `useEffect`），並在儲存成功當下就判定資格：用戶點「前往 My Storio」會 `router.push('/collection')` 讓 modal 卸載，React 的計時器會被取消。
- 節流：`localStorage` 記錄上次呼叫時間，90 天內不重複。Apple 另有每年 3 次的系統上限，且不回報是否真的顯示或是否已評價，故不嘗試偵測。
- 只在 iOS 原生執行（以 `isIOSPlatform()` 判斷；Android 外掛雖可用，本次不啟用）。外掛以動態 `import` 載入，避免網頁 bundle 帶入；不可用或呼叫失敗：靜默略過。
- 替代方案：自製「去評論」卡片並導向寫評論頁。不採用：審核規範 5.6.1 對自製評價提示有退審風險；Tu 已決定走系統視窗。

### D7：引導區與學習卡的接合
學習卡最後按鈕改文案後行為不變（關閉＋寫入 `storio_onboarding_seen`）。回到首頁時由 D2 的 `total_count` 決定是否顯示引導區，不另寫旗標：用戶只要館藏為 0，就一直看到引導區，直到第一部收藏。

### D8：搜尋按鈕進搜尋頁自動對焦（新增）
搜尋頁現況沒有自動對焦。引導區按鈕導向 `/search?focus=1`；搜尋頁在掛載後若見到 `focus=1`，對焦「當前搜尋模式」的輸入框（輸入框依 `searchModeIndex` 輪替，`inputRef` 只指向當前那個）。不帶此參數的既有入口（右下角「+」）行為不變。選參數而非「一律自動對焦」，是為了不改變既有入口的行為。

## Risks / Trade-offs

- [帳號年齡從登入日起算：訪客登入是新帳號＋搬移收藏（`useAuth.ts` 約 101–104 行已確認）] → 情境 1 實為「登入滿 30 天」；剛登入的老訪客由情境 2（累計 2 部）接住。
- [評價情境 2 偏早：第 2 部收藏就可能觸發，新用戶可能第一天就被問] → Tu 知情採用；以 90 天節流與 Apple 年度上限保底。
- [慶祝過度或干擾：訪客卡出現次數多（最多 10 次）] → 只有第一部播慶祝，其餘訪客卡不帶動畫，且點外面即收起。
- [`/stats` 的 `total_count` 延遲造成首頁抖動] → loading 時不顯示引導區或統計；失敗時回退為現狀。
- [success 標題寫死英文：`AddToFolioModal.tsx:131` 為「Successfully add to storio」] → 已納入本案（Tu 決定）：所有成功畫面的標題都改走 i18n（中「收藏成功」／英「Saved」），第二部起的簡單版也一併跟隨語言。
- [stats 每次呼叫掃該用戶全部列，`collection_repo.py:145-147`] → 資料量小，維持現狀；本案已避免在每次收藏後多打一次。
- [彩帶節點多，低階裝置掉幀] → 節點約 100 個、僅用 transform／opacity；動畫結束即卸載；reduced-motion 關閉。
- [新增兩個原生外掛，需 `cap sync` 並隨 iOS 發版] → 外掛不可用時所有呼叫靜默略過；網頁版不受影響。

## Migration Plan

1. 後端：`total_count` 為新增欄位（stats 與 POST 回應），直接部署（Railway），舊版 App 不受影響；後端 CI（pytest）綠才繼續。
2. 前端：網頁（Vercel）可先行驗證；iOS 需新外掛，隨下次 `npm run release` → `ios:sync` → `build:ios` → Archive 送審。
3. 回滾：前端全部功能都由館藏數與登入狀態控制，回滾只需還原前端提交；後端新增欄位無需回滾。

## Open Questions

- 重複收藏（re-watch）是否計入「累計收藏 2 部」：預設以 `total_count`（收藏筆數）為準，重複收藏會增加筆數。Tu 若希望只算不同作品，需改為去重計數。
- 是否為引導區按鈕、慶祝、訪客卡登入、評價呼叫新增互動事件：本次不做，可於後續另案評估。
