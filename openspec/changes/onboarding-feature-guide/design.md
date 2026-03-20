## Context

Storio 目前缺乏任何首次使用引導。用戶開啟 App 後面對空白典藏室，須自行摸索所有功能（搜尋、評分、分享）。這是造成早期流失的主要因素。

新功能為純前端實作，使用 `localStorage` 儲存「已完成引導」狀態，以 Modal 覆蓋層呈現可橫滑的功能說明卡片。無需後端配合。

## Goals / Non-Goals

**Goals:**
- 初次使用時自動彈出引導 Modal，展示 4 張核心功能卡片
- 用戶可隨時從 Profile 頁面重新觸發引導
- 卡片支援繁中 / 英語系切換
- 視覺風格與 Storio 設計系統一致（純黑背景、金色點綴、流暢動畫）

**Non-Goals:**
- 互動式 tutorial（實際操作引導、高亮遮罩）
- 後端紀錄引導完成狀態
- A/B 測試不同引導版本
- 影片或 GIF 示意（此階段僅用靜態插圖 + icon）

## Decisions

### 狀態管理：localStorage 而非 Supabase

**決策**：使用 `localStorage.getItem('storio_onboarding_seen')` 判斷是否顯示引導。

**理由**：引導狀態屬於裝置層級的偏好，與用戶帳號無關。匿名用戶也需要引導，但沒有持久化的 user record 可用。localStorage 實作最輕量，無需任何 API 呼叫。

**取捨**：換裝置後會重新顯示引導 — 可接受，甚至有益（新裝置＝新起點）。

---

### 觸發時機：App 啟動時檢查，而非登入後

**決策**：在最上層 `layout.tsx` 或首頁 `page.tsx` 的 `useEffect` 中檢查 localStorage，若無紀錄則顯示引導 Modal。

**理由**：Storio 使用匿名登入，登入事件並不明確。以「首次開啟首頁」作為觸發點最直觀，且不依賴 Auth 狀態。

---

### 卡片 UI：Embla Carousel 橫滑

**決策**：複用專案現有的 `embla-carousel-react`，不引入新依賴。

**理由**：專案已安裝此套件（用於首頁橫向滑動），可直接複用，確保滑動手感一致。

---

### 元件結構

```
OnboardingGuideModal
└── FeatureGuideCard (× 4)
    ├── icon (lucide-react)
    ├── title
    ├── description
    └── illustration (靜態 emoji 或簡單 SVG)
```

`OnboardingGuideModal` 控制顯示 / 隱藏與 localStorage 寫入。
卡片內容以 config array 定義，支援 i18n（從 `locales.ts` 讀取）。

## Risks / Trade-offs

- **[風險] iOS Safari localStorage 被 ITP 清除** → 接受，引導重新顯示不影響核心功能
- **[風險] 插圖缺失導致卡片視覺單薄** → 初期以大型 lucide icon + 金色背景圓圈代替插圖，後續可替換
- **[取捨] 不做互動式引導** → 降低實作複雜度，文字 + 視覺說明對 Storio 這類直觀 App 已足夠

## Open Questions

- 卡片插圖風格：純 icon、截圖縮圖、還是自訂插畫？（目前規劃 icon，待 UI review 後確認）
- 是否需要「略過」按鈕？（目前規劃右上角 ✕ 與最後一張卡的「開始使用」CTA）
