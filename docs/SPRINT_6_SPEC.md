# Storio 2 - Sprint 6: The Monthly Chronicle (月度分享)

**Sprint 目標**: 專注於 **「輸出 (Output)」** 與 **「分享 (Sharing)」**。
我們不開發複雜的內部回顧儀表板 (Dashboard)，而是直接打造一個能將當月收藏「實體化」為精美圖像的功能，讓策展人能將這份儀式感發佈至社群媒體 (Instagram Story)。

---

## 1. 核心功能：月度分享 (Monthly Sharing)

### 1.1 核心概念
*   **非回顧，是銘刻**: 這不是一個分析報表，而是一張證明「我這個月經歷了這些故事」的數位憑證。
*   **IG Story First**: 所有的設計與輸出尺寸皆鎖定 **9:16 (1080x1920)** 垂直滿版比例，但保留 4:5 與 1:1 的擴充彈性。

### 1.2 User Flow (使用者流程)

```mermaid
graph TD
    A[進入 My Storio 館藏頁] --> B{切換視圖}
    B -- 列表/畫廊 --> A
    B -- 行事曆 (Calendar) --> C[瀏覽特定月份 (e.g. Feb 2026)]
    
    C --> D[點擊月份標題旁的 <br> 'Share' 圖示]
    
    D --> E[開啟分享預覽 Modal <br> (Reuse ShareModal Layout)]
    
    E --> F{預覽與客製化}
    F -- Visual Style --> G[Calendar / Collage / Waterfall / Shelf]
    F -- Format --> H[Story 9:16 / Portrait 4:5 / Square 1:1]
    
    G & H --> I[生成最終圖片]
    
    I --> J{決定動作}
    J -- Mobile --> K[呼叫原生分享 (Web Share API) <br> -> Instagram Story]
    J -- Desktop --> L[下載 PNG 檔案]
```

---

## 2. 入口與設定 (Entry & Settings)

### 2.1 入口點 (Entry Point) - 行事曆視圖
在月份分組的標題列右側，新增一個低調但精緻的分享按鈕。

```text
+---------------------------------------------+
|  [<]  My Storio  [Grid] [Cal] [Gallery]     |
|---------------------------------------------|
|                                             |
|  February 2026             [ Share Icon ]   | <--- Trigger
|  -----------------------------------------  |
|                                             |
|  +-------+  +-------+  +-------+            |
|  | Poster|  | Poster|  | Poster|            |
|  |       |  |       |  |       |            |
|  +-------+  +-------+  +-------+            |
|   Dune 2     Shogun     3 Body              |
|                                             |
+---------------------------------------------+
```

### 2.2 分享預覽視窗 (Preview Modal)
架構沿用 `ShareModal` (Drawer Layout)。
**差異點**: 移除 Title/Score/Reflection 開關，改由模板自動處理「簡易統計」顯示。

```text
+---------------------------------------------+
|  [X] Close                                  |
|                                             |
|         +-------------------------+         |
|         |                         |         |
|         |  FEB 2026               |         | <--- MMM 縮寫
|         |                         |         |
|         |  (Template Preview)     |         |
|         |                         |         |
|         |  5 Movies · 2 Books     |         | <--- 簡易統計 (零不顯示)
|         |  STORIO                 |         |
|         +-------------------------+         |
|                                             |
+---------------------------------------------+
|  [ Drawer Handle ]                          |
|                                             |
|  VISUAL STYLE                               |
|  [ Calendar ] [ Collage ] [ Waterfall ]     |
|  [ Shelf    ]                               |
|                                             |
|  FORMAT                                     |
|  [ Story 9:16 ] [ Portrait 4:5 ] [ Sq 1:1 ] |
|                                             |
|  [ Share to IG ]  [ Download ]              |
+---------------------------------------------+
```

---

## 3. 視覺模板規格 (Visual Templates)

所有模板預設尺寸為 **1080 x 1920 (9:16)**。
**月份顯示規範**: 統一使用 3 字母英文縮寫 (MMM) + 年份 (YYYY)，例如 **"FEB 2026"**，字體採用粗體無襯線或藝術襯線體。

### T1: Calendar (行事曆風格)
*   **概念**: "A Month in Review" —— 強調時間感與每日的積累。
*   **詳細規格**:
    *   **Header**: 頂部置中顯示 **"FEB 2026"**。
    *   **Grid**: 7欄式月曆網格 (S M T W T F S)。
        *   **日期格**: 空白日顯示日期數字；有收藏日填入海報縮圖 (Cover)。
        *   **堆疊 (Stack Logic)**: 
            *   若單日有 2~4 筆：顯示 2x2 Grid。
            *   若單日 > 4 筆：第 4 格顯示 `+[n]` (例如 `+2`)，不顯示第 4 張海報。
    *   **Footer**: 底部顯示 "Storio" Logo 與 簡易統計字串。
    *   **Background**: 純黑或深灰格線 (Folio Outline)。

```text
+-------------------------+
|                         |
|        FEB 2026         |
|                         |
|  S  M  T  W  T  F  S    |
| [ ][ ][ ][ ][ ][ ][ ]   |
| [ ][P][ ][ ][2x2][P][ ] | <-- 2x2: 4 items in one day
| [ ][ ][P][ ][ ][ ][ ]   |
| [P][ ][ ][ ][ ][P][ ]   | <-- +[n]: More than 4 items
| [ ][ ][ ][ ][ ][ ][ ]   |
|                         |
|                         |
|    5 Movies · 2 Books   |
|         STORIO          |
+-------------------------+
```

### T2: Collage (海報牆拼貼)
*   **概念**: "Impact" —— 滿版視覺衝擊，像是一面豐富的電影牆。
*   **詳細規格**:
    *   **No Overlay**: 資訊卡片（月份、統計、Logo）**不疊加**於海報之上，避免遮擋。
    *   **Layout**: 採用 **Header/Footer 分離** 或 **保留區塊** 的方式。
        *   上方保留區域顯示 Header (**"FEB 2026"**)。
        *   下方保留區域顯示 Footer (Stats & Logo)。
        *   中間區域為純海報拼貼。
    *   **Grid**: 依數量自動計算最佳密度 (NxN)，項目間保留適當間距 (Gap, e.g., 8px~16px)。
    *   **Spacing**: 適當留白，展現優雅感。

```text
+-------------------------+
|                         |
|        FEB 2026         | <--- Header (No overlap)
|                         |
|  +---+ +---+ +---+      |
|  |   | |   | |   |      |
|  +---+ +---+ +---+      | <--- Posters with Gap
|  +---+ +---+ +---+      |
|  |   | |   | |   |      |
|  +---+ +---+ +---+      |
|                         |
|   5 Movies · 2 Books    | <--- Footer (No overlap)
|         STORIO          |
+-------------------------+
```

### T3: Waterfall (海報瀑布流)
*   **概念**: "Central Focus" —— 聚焦當月核心收藏，兩側營造豐富氛圍。
*   **詳細規格**:
    *   **No Tilt**: 平面呈現，保持海報不變形。
    *   **Layout**: **3欄式 (3 Columns)**，但進行**縮放裁切 (Zoom/Crop)**。
        *   **中間欄 (Middle)**: 完整顯示，視覺焦點 (佔寬度 50-60%)。
        *   **左右欄 (Sides)**: 寬度超出畫布邊界，僅顯示內側 1/2 或 2/3，營造向外延伸的「溢出感」。
    *   **Enrichment (填充策略)**:
        *   **N = 9 (3x3 Grid)**: 這是填滿 9:16 畫面且包含裁切效果的**最佳建議值**。
        *   **理由**: 
            *   3x3 的結構能確保中間欄有 3 張完整的重點海報。
            *   左右兩欄各 3 張 (共 6 張) 部分顯示，足以營造豐富的背景氛圍。
            *   若收藏數少 (e.g. 3張)，循環 3 次即可填滿，且中間欄仍是這 3 張重點，不會感到違和。
    *   **Gap**: 微距 (4px) 或 無縫。
    *   **Info**: Logo 與簡易統計置於角落 (Corner)，月份 **"FEB 2026"** 以浮水印風格置於背景或邊緣。

```text
+-------------------------+
|[P]| [  POSTER  ] |[P]|  <--- Row 1
|[o]| [  Middle  ] |[o]|       Sides are cropped/overflow
|[s]| [  Column  ] |[s]|
|   | [  Fully   ] |   |
|[t]| [  Visible ] |[t]|
|---|--------------|---|
|[e]| [  POSTER  ] |[e]|  <--- Row 2
|[r]| [          ] |[r]|
|   | [          ] |   |
|---|--------------|---|
|[ ]| [  POSTER  ] |[ ]|  <--- Row 3
|[ ]| [          ] |[ ]|
|[ ]| [          ] |[ ]|
|   | [5 Mov·2Bk ] |LOG|
+-------------------------+
```

### T4: Shelf (書櫃/收藏架)
*   **概念**: "Physical Archive" —— 擬物化的收藏展示。
*   **詳細規格**:
    *   **Dynamic Shelves**: 依收藏數量決定層數，若數量少僅顯示一層，置中呈現。
    *   **Items (Spines)**:
        *   **Books**: 垂直書脊，提取封面主色。
        *   **Movies/Series**: DVD/膠卷盒側標。
    *   **Header**: 上方顯示 **"FEB 2026"**。
    *   **Tag**: 在層板邊緣掛上一個**實體吊牌 (Tag)**。
        *   吊牌內容：顯示當月詳細統計（區分 Books, Movies, Series）。
        *   e.g., "5 Movies, 2 Books" (若該類別 > 0 才顯示)。

```text
+-------------------------+
|        FEB 2026         |
|                         |
|  [Bk][Bk][MV][MV][Bk]   | <--- Spines / Cases
| ======================= | <--- Shelf
|      | Tag |            |
|      +-----+            |
|      | 5 Mov |          | <--- Detailed Stats on Tag
|      | 2 Bks |          |
|      +-----+            |
|                         |
|          STORIO         |
+-------------------------+
```

---

## 4. 技術實作重點

### 4.1 Backend (API)
*   `GET /api/v1/stats/monthly`:
    *   Input: `month (YYYY-MM)`, `user_id`.
    *   Output: `items` (包含 Poster URL, Dominant Color 預算結果), `summary` (`{ "movie": 5, "book": 2, "tv": 0 }`).

### 4.2 Frontend (Export)
*   **Date Formatting**: 使用 `date-fns` 將 `2026-02` 格式化為 `FEB 2026` (uppercase)。
*   **Stats Logic**: 
    ```typescript
    const statsText = [
      movieCount > 0 && `${movieCount} Movies`,
      bookCount > 0 && `${bookCount} Books`,
      tvCount > 0 && `${tvCount} Series`
    ].filter(Boolean).join(' · ');
    ```
*   **Color Extraction**: 針對 **Shelf** 模板，需引入 `colorthief` 或 `fast-average-color` 在前端動態提取封面主色以生成書脊。
*   **Waterfall Logic**: 
    *   `minItems = 9`
    *   如果 `items.length < 9`，則 `displayItems` = 重複 `items` 直到長度 >= 9。
    *   CSS Layout: `grid-cols-[1fr_2fr_1fr]` 或類似比例。

---

## 5. 待辦事項 (Checklist)
1.  [ ] **API**: 實作 `/stats/monthly` endpoint。
2.  [ ] **UI**: 在 `CalendarView` 加入分享入口。
3.  [ ] **Component**: 實作 `MonthlyRecapModal` (ShareModal 變體)。
4.  [ ] **Templates**: 開發 Calendar (2x2 Grid, MMM), Collage (Separated, MMM), Waterfall (Central, N=9, MMM), Shelf (Tag, MMM) 四種視覺組件。
