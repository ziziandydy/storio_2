## 1. 後端：`total_count`（stats 與 POST 回應）

- [ ] 1.1 先寫 pytest：`GET /collection/stats` 回應含 `total_count`（0 筆回 0、多筆回正確筆數、含重複收藏的各筆），既有欄位名稱與值不變（擴充 `server/tests/test_stats_api.py`）
- [ ] 1.2 先寫 pytest：`POST /collection` 回應含 `total_count`（第一部回 1、第二部回 2），原有項目欄位不變；訪客第 11 筆仍回 403（擴充 `test_collection_api.py`、`test_guest_limit.py`）
- [ ] 1.3 `collection_repo.get_collection_stats` 回傳加 `total_count = len(response.data)`（不新增 Repository 方法）
- [ ] 1.4 `collection_service.add_story` 在儲存成功後用既有 `repo.count_user_stories` 取數並放入回應；回應 schema 新增選填 `total_count`（三層架構，Controller 不碰資料庫）
- [ ] 1.5 跑 `server/tests/` 全套，後端 CI 綠

## 2. 依賴與文案

- [ ] 2.1 `client/` 安裝 `@capacitor/haptics@^7.0.5` 與 `@capacitor-community/in-app-review@^7.1.0`（**不可裝 8.x**：專案是 Capacitor 7.6.10，8.x 要求 core >= 8）；確認 `npm ls @capacitor/core` 無 peer 衝突，網頁與 Android build 不因外掛缺席而失敗（呼叫處用 `isNativePlatform()`／`isIOSPlatform()` 與 try/catch，外掛以動態 `import` 載入）
- [ ] 2.2 `i18n/locales.ts`（zh-TW／en）新增：引導區標題／按鈕／提示、學習卡最後按鈕、成功標題「收藏成功／Saved」、訪客卡標題／說明／兩顆登入按鈕／稍後再說；專有名詞依 `GEMINI.md`
- [ ] 2.3 Vitest：兩個語系的新 key 都存在且非空
- [ ] 2.4 成功標題在地化：`AddToFolioModal.tsx:131` 寫死的英文「Successfully add to storio」改用 i18n key（中「收藏成功」／英「Saved」），第一部與第二部起的成功畫面共用；測試：zh-TW 與 en 下標題各自正確、不再出現寫死英文

## 3. 首頁引導區與搜尋對焦

- [ ] 3.1 先寫測試：`useCollectionCount` 在 loading、成功（0／1／N）、失敗時的回傳
- [ ] 3.2 實作 `useCollectionCount`（讀 `/stats` 的 `total_count`，需 token）
- [ ] 3.3 先寫元件測試：`FirstCollectGuide` 顯示標題／搜尋按鈕／提示；點按鈕導向 `/search?focus=1`；按鈕不是 `input`
- [ ] 3.4 實作 `FirstCollectGuide`（金色邊框漸層卡片，依 mockup 與 `design.md`）
- [ ] 3.5 `app/page.tsx`：`total_count === 0` 顯示引導區並隱藏 `HomeStats` 與「檢視 MY STORIO」；載入中與失敗時兩者都不顯示；`>= 1` 恢復現狀。回歸測試：館藏 ≥ 1 時首頁與現況一致
- [ ] 3.6 **實作**搜尋頁 `?focus=1` 自動對焦（現況無自動對焦；`focus()` 只在清除處理，約第 134–136 行）：掛載後對焦當前搜尋模式的輸入框（`inputRef` 依 `searchModeIndex` 輪替，約第 480、524 行）；不帶參數的既有入口行為不變，需測試
- [ ] 3.7 `OnboardingGuideModal`：最後一張按鈕改用新文案，行為不變；更新既有元件測試

## 4. 慶祝與訪客登入卡

- [ ] 4.1 先寫測試（Vitest）：`AddToFolioModal` success 模式的選擇規則——`result.total_count === 1` 顯示慶祝；`>= 2` 顯示現有簡單版；訪客顯示登入卡；第一部且訪客在慶祝後切換為登入卡；回應沒有 `total_count` 退回簡單版且不先顯示再切換；`capacity_reached`（403）仍走 `GuestLimitModal`（回歸）
- [ ] 4.2 `AddToFolioModal` 以 `onSave` 回傳的 `total_count` 選擇成功畫面（不再另外請求 `/stats`），見 `design.md` D3
- [ ] 4.3 實作 `FirstCollectCelebration`：海報＋光暈＋勾勾、金光閃爍、彩帶炸開約 58 片、上方灑落約 44 片、約 3 秒後卸載節點；色票取自 Storio 金系；`prefers-reduced-motion` 改為靜態
- [ ] 4.4 觸覺：慶祝開始呼叫兩次成功觸覺（間隔約 120ms），僅原生平台，失敗吞掉；測試以 mock 驗證呼叫次數與網頁不呼叫
- [ ] 4.5 實作 `GuestSaveCard`：說明（含 10 部上限）、Apple／Google 登入（沿用現有登入流程與 `migrate_guest_data`）、「稍後再說，前往 My Storio」導向 `/collection`；遮罩點擊關閉維持現有行為
- [ ] 4.6 驗證訪客→登入後，剛收藏的作品出現在登入後館藏（dev 環境實測，[→E2E]）

## 5. 系統評價視窗

- [ ] 5.1 先寫測試：`lib/reviewPrompt.ts` 判斷函式——已登入＋帳號滿 30 天 → 呼叫；已登入＋`total_count >= 2` → 呼叫；兩者皆否 → 不呼叫；訪客 → 不呼叫；當次有慶祝 → 不呼叫；90 天內已呼叫 → 不呼叫；外掛拋錯 → 吞掉；modal 卸載後計時器仍會觸發
- [ ] 5.2 實作 `lib/reviewPrompt.ts`：判斷、`localStorage` 90 天節流、`setTimeout` 排程放在模組層級（不依附 React 元件生命週期）、僅 iOS 原生（`isIOSPlatform()`）、外掛動態 `import`、失敗靜默
- [ ] 5.3 在 `AddToFolioModal` 儲存成功當下判定資格並登記排程；實際呼叫在成功視窗關閉後約 1.5 秒
- [ ] 5.4 確認 Profile 的「為我們評分」「留下評論」行為未變（回歸）

## 6. 驗證與整合

- [ ] 6.1 前端全套 `cd client && npm test`、後端 pytest 全綠；push 前跑 `cd client && npx next lint`（Next build 會 lint 測試檔）
- [ ] 6.2 起本機 dev server，用手機寬度實際截圖：館藏為 0 的首頁（中／英，引導區標題與提示皆單行）、館藏 ≥ 1 的首頁、第一部慶祝（含動畫畫格）、訪客卡、減少動態；對照 mockup 與 `design.md` 的尺寸與間距（CSS 佈局不能只靠推導）
- [ ] 6.3 `/qa`：headless browser 掃新增畫面的 UI bug
- [ ] 6.4 iOS 模擬器／真機：觸覺、系統評價視窗、`cap sync` 後外掛可用（評價視窗在開發版常顯示，不代表正式版行為，需另說明）
- [ ] 6.5 `superpowers:verification-before-completion`、`/review`，通過後 `openspec-archive-change`
