# Storio 2 全平台發佈藍圖 (Roadmap)

本文定義了 Storio 從開發環境走向正式環境 (Production)，並最終登陸 iOS App Store 的三個核心階段。

---

## 📅 階段一：生產環境部署 (Production Deployment)
**目標**：將開發成果線上化，提供穩定的服務。
**狀態**：✅ 已完成基礎部署

### 1. 生產環境架構
- **Frontend**: [Vercel](https://storio-2.vercel.app) (Next.js)
- **Backend**: [Railway](https://storio-backend-production.up.railway.app) (FastAPI) - *範例網址，請確認實際 URL*
- **Database**: Supabase Production Project

### 2. 技術調整
- [x] **跨網域部署**：前端與後端分離部署。
- [x] **環境變數管理**：Railway 已配置 API Keys，Vercel 已配置 `NEXT_PUBLIC_API_URL`。
- [x] **CORS 配置**：Railway 後端已允許來自 Vercel 網域的請求。

### 3. 待修復與優化 (Current Focus)
- [ ] 修正 Guest Login Logo 顯示異常。
- [ ] 實作詳情頁描述文字截斷 (View More/Less)。
- [ ] 優化重複收藏的提示邏輯 (詢問 Re-watch/Re-read)。
- [ ] 移除收藏列表中舊資料的 "0" 分顯示。

---

## 📱 階段二：PWA 輕量級行動化 (Progressive Web App)
**目標**：無需透過 App Store，讓使用者能將 Storio 以 App 形式安裝在手機主畫面。

### 1. 技術調整
- **Web Manifest**：建立 `manifest.json`，定義圖示、啟動畫面背景色、顯示模式 (standalone)。
- **Service Worker**：使用 `next-pwa` 實作資源快取，確保離線時也能看到基本的 UI 框架。
- **iOS 優化**：添加 `apple-touch-icon` 與 `meta-tags` 以隱藏 Safari 網址列。

### 2. 優點
- 免費、免審核、即時更新。
- 支援「全螢幕」沉浸體驗，符合 Storio 設計初衷。

---

## 🍎 階段三：iOS 原生 App 實作 (Native iOS & App Store)
**目標**：在 App Store 上架，並利用 iOS 原生功能。

### 1. 技術路徑：Capacitor
- **原理**：使用 Capacitor 封裝 Next.js 靜態建置檔，並生成 Xcode 專案。
- **開發者帳號**：需註冊 **Apple Developer Program (US$99/yr)** 以啟用 TestFlight 與上架功能。

### 2. 實作步驟
- **Capacitor Init**：在 `client` 目錄初始化 Capacitor。
- **Xcode 配置**：設定 Bundle ID, Versioning, 與相應的權限宣告。
- **TestFlight**：上傳第一個版本進行 Beta 測試。
- **App Store Submission**：準備螢幕截圖、隱私權規範文件，並送交審核。

---

## 🛠️ 下一階段行動清單 (Action Items)

1. **[Now]** 建立 `vercel.json` 與 `api/index.py` 以支援全端部署。
2. **[Now]** 修正 `client/package.json` 中的 build script 確保相容性。
3. **[Next]** 實作 PWA 相關配置 (manifest, icons)。
4. **[Future]** 指導使用者申請 Apple 開發者帳號。
