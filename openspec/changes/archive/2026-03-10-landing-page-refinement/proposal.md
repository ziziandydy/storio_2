## Why

為了正式對外展示 Storio 2 的產品魅力，我們需要一個高度精緻、具備沉浸感且資訊完整的產品介紹頁 (Landing Page)。目前的 `index.html` 僅為初步草案，需要根據產品需求文件 (PRD) 中的核心隱喻「儲思盆 (Pensieve)」與「個人典藏室 (Folio)」進行全面升級。

此頁面旨在解決使用者在零散平台上紀錄影視與書籍的痛點，並建立從 **Data PM 轉型為 Build PM** 的個人品牌故事。同時，為了服務全球使用者，該頁面需支援 **繁體中文與英文** 的雙語切換。

## What Changes

- **視覺與結構全面升級**：
  - **Hero**: 強力的 Slogan + 明確的 CTA (Try on Web/Mobile)。
  - **Problem**: 點出影視/書籍紀錄分散在不同平台導致的碎裂感。
  - **Vision**: 闡述「儲思盆 (Pensieve)」的核心哲學。
  - **Features**: 展示 **4 大核心功能**（Memory Timeline, Visual Templates, Bottom-Focused Interface, Dynamic Stats Dashboard）。
  - **About**: 分享從 Data PM 轉型為 Build PM 的 Vibe Coding 故事。
- **雙語支持 (i18n)**：在頁面中實作切換按鈕，支援英文 (en) 與繁體中文 (zh-TW) 的即時切換。
- **Footer 重構**：
  - 標註 "Anderson Tu • All rights reserved"。
  - 整合個人網站、GitHub 與聯絡管道。
- **團隊介紹區塊 (Team Members)**：展示 5 位具備獨特稱號的團隊成員。
- **技術相容性優化**：確保資源路徑為相對路徑，以利 Submodule 與 GitHub Pages 使用。

## Capabilities

### New Capabilities
- `landing-page-ui`: 實作基於 Tailwind CSS 的正式產品介紹頁 UI。
- `landing-page-storytelling`: 整合產品哲學、痛點與個人轉型故事。
- `landing-page-i18n`: 實作純前端的雙語切換機制。
- `team-member-showcase`: 處理團隊成員資訊展示。

## Impact

- `index.html`: 全面重寫，加入語系切換邏輯與 4 大功能區塊。
- `image/`: 使用現有資源。
- 外部相依: 透過 GitHub Pages 展示。
