## Context

目前 Storio 2 的架構依賴 Next.js 的 App Router 進行頁面路由。在館藏 (`/collection/[id]`) 與作品詳情 (`/details/[type]/[id]`) 頁面上，現有架構為了 SEO 與架構簡潔，採用了動態路由 (Dynamic Routes)。
然而，由於使用者的館藏數量與外部 API (TMDB, Google Books) 的 ID 是無法窮舉的，我們在使用 Next.js 進行 `output: 'export'` (Static HTML Export) 時，會遭遇到 `generateStaticParams()` 缺失的編譯錯誤。為了解決 Capacitor iOS App 封裝需求，我們必須以技術手段繞過這個限制。

## Goals / Non-Goals

**Goals:**
- 將依賴 Server-Side 動態 ID 計算的路由結構，全面遷移至 Client-Side 依賴 Search Parameters (Query String) 計算的靜態路徑。
- 達成 `pnpm run build` 可以 100% 成功產出無動態路由錯誤的 `out/` 靜態部署資料夾。
- 完善 iOS App 原生使用體驗，包含 SafeArea 閃避、SplashScreen 以及 App Icon 設定。
- 替換 Web Share API 為原生 Capacitor Share API。
- 透過 Capacitor Plugin 實作 Native Apple Sign-in，完成全平台的身份驗證拼圖。

**Non-Goals:**
- 改變現有的頁面視覺設計與互動邏輯。
- 實作新的 API endpoints (除 Auth 橋接需求外)。

## Decisions

### 1. 扁平化資料夾結構 (Flattened Routes)
**決策**:
將存放於 `app/details/[type]/[id]/page.tsx` 的程式碼直接往上提至 `app/details/page.tsx`。
將 `app/collection/[id]/page.tsx` 往上提至 `app/collection/item/page.tsx`。

**原因**:
Next.js Export 會將沒有中括號 `[]` 的資料夾安全地視為靜態頁面並轉譯成如 `details.html` 和 `collection/item.html`。我們在 Client 元件中載入這些頁面時，就可以透過掛載 Query params (`?type=movie&id=123`) 將變數傳遞進去。
*Alternative*: 嘗試硬塞假的 `generateStaticParams`。這不可行，因為點擊未產生的預設 ID 時 Next.js 靜態模式會直接報錯 404，無法 Fallback 到 CSR 載入。

### 2. 資料獲取方式從 `props.params` 改為 `useSearchParams` hook
**決策**:
由於 `page.tsx` 現在是靜態的，無法在伺服器端拿到對應的動態 `params` 屬性。所有的 Page Component 頂層將被包裝為 `'use client'`, 並使用 `const searchParams = useSearchParams()` 取代 `({ params })` 屬性萃取 ID。

**原因**:
為解決 Static Export 的唯一解法。並且我們原本就在 Client 端使用 `useEffect` 呼叫 FastAPI 拿資料，所以只需變更從 URL 提取變數的方法即可。

### 3. 加入 `Suspense` 包裝
**決策**:
由於在 App Router 的 Static Export 中使用 `useSearchParams`，如果沒有將有用到這個 hook 的 Component 包裝在 `<Suspense>` 內，Next.js 編譯時會將整個頁面退回 Client-Side rendering 並跳出 deopt 警告，甚至中斷 export。

**原因**:
遵循 React 18 / Next 14 最佳實踐，確保 Static Export 生命週期安全。

### 4. Apple Auth 橋接方式
**決策**:
使用 `@capacitor-community/apple-sign-in` 取代原本 Supabase JS Client 內建的全網頁跳轉 (OAuth Web Flow)。

**原因**:
Apple 審核指南嚴格要求，若 App 內含有第三方社群登入，必須提供原生的 Apple Login (Sign in with Apple)。透過 Capacitor Plugin，我們可以取得 Identity Token，再手動傳遞給 Supabase Auth 建立 Session，實現無縫的 Native 驗證體驗。

## Risks / Trade-offs

- [Risk] **連結相容性消失 (Link Rot)** → 由於從 `/details/movie/123` 變為 `/details?type=movie&id=123`，在過往分享出去的對外連結（若有）可能會變成 404 (Not Found)。
  * Mitigation: 在 Vercel 的 Web 版設定 301 Redirect 規則自動保留相容性。
- [Risk] **Apple Sign-in 設定繁雜** → 開發者需具備完整的 Apple Developer 證書與 Services ID 配置。
  * Mitigation: 確保實作文件有清晰列出 Identifier 的掛載步驟，減低憑證配置帶來的卡關。
