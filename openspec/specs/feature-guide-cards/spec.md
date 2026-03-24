# feature-guide-cards Specification

## Purpose
定義 Onboarding Guide Modal 中 4 張核心功能說明卡片的內容、順序與互動行為。

## Requirements

### Requirement: 4 張核心功能卡片內容
系統 SHALL 依序展示以下 4 張功能說明卡片，每張包含 icon、標題、說明文字。

卡片順序與內容：

| # | Icon | 標題（ZH） | 標題（EN） | 說明（ZH） | 說明（EN） |
|---|------|-----------|-----------|-----------|-----------|
| 1 | BookOpen | Storio | Storio | 將你觀看並喜歡的作品加入你的個人故事典藏室 | Collect stories from movies, series & books in your personal folio |
| 2 | Search | 探索與收藏 | Explore & Collect | 搜尋電影、影集或書籍，一鍵加入典藏 | Search any movie, series or book and add it to your folio in one tap |
| 3 | Star | 評分與心得 | Score & Reflect | 為作品評分、寫下心得，讓 AI 幫你潤飾文字 | Rate, write a reflection, and let AI polish your thoughts |
| 4 | CalendarDays | 回顧與分享 | Recap & Share | 用日曆或典藏視角回顧你的故事足跡，將每份記憶或整月精華化為一張精美卡片 | Revisit your story journey in calendar or grid view — then turn any memory, or an entire month, into a beautiful card worth sharing |

#### Scenario: 卡片依序顯示
- **WHEN** 用戶開啟 Onboarding Guide Modal
- **THEN** 系統顯示第 1 張卡片，並可向左滑動或點擊「下一步」前進

#### Scenario: 最後一張卡片顯示 CTA
- **WHEN** 用戶到達第 4 張卡片
- **THEN** 「下一步」按鈕變更為「開始使用 / Get Started」

---

### Requirement: 卡片輪播進度指示
系統 SHALL 在卡片下方顯示圓點進度指示器（dot indicator），標示當前位置。

#### Scenario: 進度點反映當前卡片
- **WHEN** 用戶滑動至第 N 張卡片
- **THEN** 第 N 個圓點以 Storio Gold（#c5a059）高亮，其餘為半透明白色

---

### Requirement: 支援雙語顯示
系統 SHALL 根據 App 目前語系（`locales.ts` 中的語言設定）顯示對應語言的卡片內容。

#### Scenario: 中文語系顯示繁體中文內容
- **WHEN** App 語系為 `zh`
- **THEN** 所有卡片標題與說明顯示繁體中文

#### Scenario: 英文語系顯示英文內容
- **WHEN** App 語系為 `en`
- **THEN** 所有卡片標題與說明顯示英文
