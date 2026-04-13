# Design Spec: Landing Page Support & FAQ Section

**Date:** 2026-04-13
**Status:** Approved
**Context:** Apple App Store 審查拒絕原因之一為 Support URL 沒有明確的支援資訊。需在官網 `index.html` 加入 Support & FAQ 區塊。

---

## 目標

在 `https://ziziandydy.github.io/storio_2/`（即 `index.html`）加入一個清晰的 Support & FAQ 區塊，讓 Apple 審查員與真實使用者都能快速找到求助管道。

---

## 位置

插入於 `<!-- Footer -->` 之前，`</section>` 之後（緊接在最後一個內容 section 下方）。

---

## 設計規格

### 區塊結構

```
Section#support
  ├── 小標題 "Support & FAQ"（uppercase, letter-spacing）
  ├── 一行說明文字（隨語言切換）
  ├── FAQ Accordion（5 組，每次只展開一個）
  └── Contact CTA（email 按鈕 + 回覆時效說明）
```

### FAQ 項目（共 5 組）

| # | ZH-TW 問題 | EN 問題 |
|---|-----------|---------|
| 1 | 如何開始典藏電影或書籍？ | How do I start adding movies or books? |
| 2 | 我的資料會不會遺失？ | Will my data be lost if I switch devices? |
| 3 | App 遇到問題怎麼辦？ | What should I do if the app isn't working? |
| 4 | AI 寫心得如何使用？ | How do I use AI to write a reflection? |
| 5 | AI 搜尋如何使用？ | How do I use AI Search? |

### Accordion 行為

- 預設全部收合
- 點擊問題列 → 展開對應回答（max-height transition）
- 再次點擊或點擊其他項目 → 收合（同時間只開一個）
- 開合指示：`＋` / `－`（顏色 `#555`）

### i18n 整合

- 所有文字元素加 `data-i18n="key"` attribute
- 在現有 `translations['zh-TW']` 和 `translations['en']` 物件中新增以下 keys：

```javascript
// 共用 keys（兩種語言都需要）
support_tag        // "Support & FAQ"（固定，兩語言相同）
support_intro      // 區塊說明文字
support_cta        // "Still need help?"（固定，兩語言相同）
support_reply      // 回覆時效說明
faq_q1, faq_a1     // 問答 1
faq_q2, faq_a2     // 問答 2
faq_q3, faq_a3     // 問答 3
faq_q4, faq_a4     // 問答 4
faq_q5, faq_a5     // 問答 5
```

- FAQ 問答的 `data-i18n` 要同時覆蓋問題（button 內 span）與回答（body p）

### 視覺規格

| 元素 | 樣式 |
|------|------|
| Section 背景 | `bg-[#0a0a0a]`，`border-t border-white/5` |
| 標題 tag | `text-[9px]`, `tracking-[0.4em]`, `uppercase`, `text-white/30` |
| FAQ 分隔線 | `border-t border-[#1e1e1e]` |
| 問題文字 | `text-xs`, `font-bold`, `text-accent-gold`, `tracking-wide` |
| 回答文字 | `text-xs`, `text-white/40`, `leading-relaxed` |
| Email CTA | `border border-accent-gold/30`, `text-accent-gold`, `font-bold`, `tracking-widest` |
| 間距 | Section `py-20`，items `py-5` |

---

## 實作範圍

### 需修改的檔案

1. **`index.html`**
   - 新增 `<section id="support">` HTML 結構
   - 在 `translations` 物件補齊所有新 i18n keys
   - 新增 accordion JS 函式 `toggleFaq(btn)`

### 不在範圍內

- 不建立獨立的 `/support` 頁面
- 不修改現有 footer 結構
- 不更動現有翻譯 keys

---

## 驗收標準

1. `support_tag`、FAQ 問答、CTA 文字在切換語言後正確變換
2. 點擊 FAQ 問題 → 平滑展開，再點 → 收合；同時只開一個
3. Email `andismtu@gmail.com` 可點擊（`href="mailto:..."`）
4. 在手機寬度（375px）下版型正常，FAQ 文字不溢出
5. `http://localhost:57494` mockup 與實際頁面視覺一致
