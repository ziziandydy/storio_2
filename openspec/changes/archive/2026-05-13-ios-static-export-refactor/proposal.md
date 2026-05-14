## Why

為了讓 Storio 2 能夠作為真正的 iOS 原生應用程式（透過 Capacitor 提供離線啟動能力與最佳效能），我們必須解決兩個層面的問題：第一是確保前端代碼能被 Next.js 完全編譯為靜態檔案 (`output: 'export'`) 並重構動態路由；第二是完成所有的原生環境配置（包含 SplashScreen、App Icon、安全區域SafeArea 迴避）、原生 API 橋接（原生分享）、整合 iOS 專屬的 Apple Sign-in，最後產出可以上傳至 TestFlight 的 Xcode 工程。這是一次端對端 (End-to-End) 的全面行動化升級。

## What Changes

- 將 `/details/[type]/[id]` 頁面遷移至 `/details` 並改用 `?type=[type]&id=[id]` 讀取狀態。
- 將 `/collection/[id]` 頁面遷移至 `/collection/item` 並改用 `?id=[id]` 讀取狀態。
- 更新全站所有跳轉邏輯 (`router.push`) 以符合新的 Query Parameter 架構。
- **BREAKING**: 客戶端載入詳情頁面時，由原本伺服器端渲染 (Server-Component `params`) 變更為客戶端渲染 (Client-Component `useSearchParams`)。
- 初始化 Capacitor iOS 專案，設定全局 CSS SafeArea (`env(safe-area-inset-top)` 等) 以避開瀏海。
- 將基於 Web 的 Web Share API 呼叫替換為 `@capacitor/share` 外掛。
- 在 Authentication 流程中引入 `@capacitor-community/apple-sign-in` 支援 iOS 原生 Apple 登入。

## Capabilities

### New Capabilities

- `static-routing`: 將依賴動態 ID 的頁面轉化為靜態可匯出的架構。
- `capacitor-setup`: 初始化 iOS 原生配置專案與 SplashScreen/App Icon，並處理全局螢幕 Safety Area 佈局。
- `native-integrations`: 封裝或替換依賴 Web 專屬行為的 API 為 Capacitor Native Plugins (如 Share API)。
- `apple-auth`: 實作 Native Apple Sign-in 原生登入機制與 Supabase 整合。

### Modified Capabilities

- `navigation`: 所有館藏與搜尋結果點擊跳轉行為改為使用 Query Parameters。
- `share-preview`: 分享生成圖在呼叫 URL 或是處理圖片擷取時，如依賴特定路徑模式需要一併更新。

## Impact

- **Frontend**: `src/app/details` 與 `src/app/collection` 資料夾結構將異動。
- **Components**: 大量 UI 元件中的 `useRouter` 呼叫路徑異動。
- **Build System**: 確保 `next build` 可順利完成且不會有 `generateStaticParams` 的編譯例外。
- **SEO / Open Graph**: 由於從 SSR 轉為 CSR，如果是純 Web 部署可能會稍微影響 SEO 的爬蟲抓取 meta tags 效率，但在 Capacitor App 環境下則無影響。
