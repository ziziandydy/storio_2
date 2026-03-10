## Context

Storio 2 的產品介紹頁將採用單一 HTML 檔案實作，並透過 Tailwind CDN 進行視覺開發。為了支援雙語切換，我們將在 JS 中管理語系字典。

## Goals / Non-Goals

**Goals:**
- 展示 4 大核心亮點功能。
- 提供繁體中文與英文的雙語切換體驗。
- 講述從 Data PM 到 Build PM 的轉型故事。
- 完整展示團隊成員資訊。
- 資源路徑使用相對路徑。

**Non-Goals:**
- 實作伺服器端語系偵測（採用純前端切換並持久化於 localStorage）。

## Decisions

**Decision 1: 純前端語系切換 (Client-side i18n)**
- *Rationale*: 因為是單一 HTML 檔案，我們將建立一個 `translations` 物件，並透過資料屬性（如 `data-i18n`）來標記需要翻譯的 DOM 元素。當使用者切換語系時，JS 會遍歷並更新文字內容。這比建立多個 HTML 檔案更容易維護。

**Decision 2: 聚焦四大核心功能**
- *Rationale*: 根據使用者反饋，將焦點收斂在最能代表 Storio 價值的四項功能：多次觀看記錄 (Timeline)、分享模板 (Templates)、底部操作 (Interface) 與數據統計 (Stats)。這能讓頁面更簡潔，行銷力道更集中。

**Decision 3: 個人網站與社交連結整合於 Footer**
- *Rationale*: 建立個人品牌信譽，並提供直接的聯絡管道。

## Risks / Trade-offs

- **[Risk] SEO 對於動態內容的抓取**: 單一頁面透過 JS 切換語系可能對 SEO 較不友善（搜尋引擎通常抓取初始狀態）。
  - *Mitigation*: 預設顯示主要語系（繁體中文），並確保 Metadata 與 Header 在初始 HTML 中具備基本關鍵字。