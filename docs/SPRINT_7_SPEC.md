# Storio 2 - Sprint 7: The Native Foundation (iOS 架構重構)

**狀態**: 🏃 規劃中 (Planning)
**Sprint 目標**: 為了實現將 Web 應用程式透過 Capacitor 封裝成真正的離線 iOS 原生 App，我們需要針對 Next.js App Router 的限制進行底層路由架構的重構。

---

## 1. 核心動機與挑戰 (Why)

*   **目標**: 透過 Capacitor 提供接近原生的 iOS 體驗（無網路下也能啟動 App、載入快、符合 Store 審核對 Native Experience 的要求）。
*   **技術限制**: Next.js 14 的 Static HTML Export (`output: 'export'`) 不支援未填寫 `generateStaticParams()` 的動態路由 (`[id]`)。
*   **Storio 的現況**: 我們的電影和書籍等內容 ID 皆來自外部 API (TMDB, Google Books) 與使用者的個人收藏，數量無限大，完全**不可能**在編譯時預先知道所有的 ID 並產出靜態 HTML。

### 解決方案
放棄使用「動態路徑資料夾」(`app/details/[type]/[id]/page.tsx`)，改為使用「靜態路由 + 網址查詢參數 (Query Parameters)」(`app/details/page.tsx?type=movie&id=123`)。
如此一來，Next.js 便能將 `/details/page.tsx` 順利編譯成單一靜態的 `/details.html`，並在客戶端 (Client-side) 抓取 URL 的 parameters 來決定要 Pring 什麼資料。

---

## 2. 路由重構對照表 (Routing Migration Table)

| 原本路由 (Next.js Dynamic Route) | 新版路由 (Search Parameters) | 影響範圍 (Impact) |
| :--- | :--- | :--- |
| `/details/[type]/[id]` | `/details?type=[type]&id=[id]` | 探索/搜尋結果點擊進入的詳情頁。 |
| `/collection/[id]` | `/collection/item?id=[id]` | My Storio 點擊卡片進入的個人心得詳情頁。 (註: 為避免與 `/collection/page.tsx` 衝突，建議改用 `/collection/item` 或類似靜態節點) |

---

## 3. 開發項目 (Tasks)

### 3.1 檔案結構重構 (File Structure Updates)
- [ ] 將 `src/app/details/[type]/[id]/page.tsx` 搬移至 `src/app/details/page.tsx`。
- [ ] 將 `src/app/collection/[id]/page.tsx` 搬移至 `src/app/collection/item/page.tsx`。
- [ ] 將這些 Page Component 內的參數獲取方式從 `params` (Server/Async) 改為使用 `useSearchParams` hook (Client-side Client Component)。

### 3.2 導航與跳轉邏輯修改 (Navigation Updates)
必須全局搜尋使用 `router.push('/details/...')` 和 `router.push('/collection/...')` 的所有元件進行修改：
1.  **首頁 (Home)**: `HeroStats`, `SectionSlider`.
2.  **館藏頁 (My Storio)**: `CalendarView`, `GalleryView`, `ListView`.
3.  **其他**: `StoryCard`, 內部跳轉邏輯。

### 3.3 Next.js Build 驗證 (Build & Export Validation)
- [x] 執行 `pnpm run build`，確保不再出現 `generateStaticParams` 錯誤。
- [x] 確保編譯成功產出 `out` 資料夾，且包含 `details.html` 與 `collection/item.html`。

### 3.4 API Cache & Next/Image 處理
- 由於使用了 `output: 'export'`，預設的 Image Optimization 失效 (已在 `next.config.js` 寫入 `unoptimized: true`)，需確保圖片在此模式下能由瀏覽器正常渲染與取得。
- 確認所有 API 呼叫 (`fetch`) 不依賴已移除的 Next.js API Rewrites。

### 3.5 Capacitor 基礎與原生配置 (Native Configuration)
- [x] 安裝 CocoaPods (`brew install cocoapods`) 並產生 iOS 專案 (`npx cap add ios`)。
- [x] 設置 SafeArea 以避免 iOS 瀏海或動態島遮擋 UI (設定 CSS `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`)。
- [x] 配置符合 "Storio Gold" 美學的 Capacitor SplashScreen 與 App Icon。

### 3.6 原生 API 橋接 (Native Integrations)
- 檢視 Web 專用 API (如 Sprint 5 的 Web Share API)。
- 轉接呼叫 `@capacitor/share` 確保在 iOS 內正常喚起系統原生的分享選單。

### 3.7 Apple Sign-in 整合 (Authentication)
- 安裝 Capacitor Apple Sign-in Plugin (`@capacitor-community/apple-sign-in`)。
- 於 Apple Developer 註冊 App ID 與 Services ID，並將金鑰掛載至 Supabase Auth 中。
- 調整現有的登入 UI 支援 Native Apple Login。

### 3.8 發布與測試 (Build & Distribution)
- [x] 執行 Capacitor Sync，並在 macOS 使用 Xcode 開啟 `ios/App/App.xcworkspace`。
- [x] 於 iOS 模擬器 (Simulator) 上測試所有 User Journeys (包含解決 IP 與 CORS 問題)。
- [ ] 確認無誤後，打包上傳進行 TestFlight 內部測試發布。

---

## 4. 驗證與測試 (Acceptance Criteria)
1. **靜態匯出成功**: `pnpm run build` 可以無錯誤完成 Static Export。
2. **路由功能正常**: 點擊任何卡片 (Home, Search, Collection)，URL 正確帶入 Query Parameters 並且畫面成功渲染，無閃退或抓不到 ID 的錯誤。
3. **PWA / Browser 可用性**: 在一般的 web 瀏覽器中啟動 `out` 資料夾的產物 (`npx serve out`) 時，App 行為如同之前一樣流暢。
