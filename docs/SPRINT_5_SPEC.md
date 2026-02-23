# Sprint 5 需求規格書

**版本**: 1.0 (Zh-TW)
**狀態**: 草稿
**日期**: 2026-02-23

---

## 1. 核心需求概覽

本 Sprint 將重點放在社交分享功能，產出精美的圖片，讓用戶分享至社群媒體。

---

## 2. 需求 C: 社交分享功能 (Social Sharing)

### 2.1 功能規格 (Functional Specs)
**目標**: 產出精美的圖片，讓用戶分享至各種社群媒體 (如 Instagram, LINE, WhatsApp 等)。

1.  **分享機制 (Sharing Mechanism)**:
    *   **無需個別串接 API**: 優先使用瀏覽器原生的 **Web Share API** (`navigator.share`)，這會自動喚起使用者的 iOS/Android 系統分享選單，讓用戶直接選擇本機已安裝的 App (LINE, IG, 訊息等) 進行分享。若環境不支援，則提供「下載圖片」與「複製圖片」作為替代方案。
2.  **Memory Card (單一作品分享)**:
    *   **格式選項 (可客製化)**:
        *   **比例**: 提供 9:16 (適合 IG Story/手機全螢幕)、4:5 或 1:1 (適合貼文 Feed) 等選項。
        *   **版面元素**: 包含海報、標題、Storio Logo、QR Code (透過 env 變數，如 `NEXT_PUBLIC_APP_URL` 連結至 Storio 首頁)。
        *   **客製化開關 (於 Poster 下方操作)**: 允許用戶自由勾選是否顯示「標題 (Title)」、「用戶評分 (Rating)」、「用戶心得 (Reflection)」。(預設不顯示年份)
    *   **主視覺與版型 (Templates)**:
        *   **預設風格**: 高斯模糊背景，卡片式設計，帶有質感陰影與導角。
        *   **純海報/劇照 (Pure Image)**: 僅輸出原始海報或劇照，不加任何背景框，適合最純粹的視覺分享。
        *   **顏色萃取 (Color Extraction)**: 解析海報/劇照主色調，作為背景漸層取代高斯模糊。
        *   **影視專屬 (Movies / Series)**:
            1.  **Screen Display (螢幕)**: 將劇照鑲嵌於復古電視或平板螢幕外框中。
            2.  **Cinema Ticket (票根)**: 復古電影票設計，邊緣帶有虛線與缺口，包含評分與條碼 (QR Code)。
            3.  **Film Reel (膠卷)**: 放置於電影底片框架中。
        *   **閱讀專屬 (Books)**:
            1.  **3D Paperback (實體書)**: 利用 CSS 3D 渲染立體書本，並**依據 `pages` 屬性動態計算書背厚度**。可選擇放置於純色背景或原圖高斯模糊背景上。
            2.  **E-Reader (電子書)**: 將封面轉為灰階電子墨水風格 (e-ink)，並鑲嵌於電子書閱讀器邊框中。
3.  **Monthly Recap (月度回顧)**:
    *   **格式**: 4:5 (1080x1350px) 或 1:1, PNG。
    *   **內容**: "February 2026 in Storio" 標題、Bento Grid 排列的海報集合、統計數據 (5 Movies, 2 Books)。

### 2.2 線框圖 (Wireframe) - Memory Card Preview
```text
+--------------------------------------------------+
|  [X] Close                     [ Download Icon ] |
|                                                  |
|  +--------------------------------------------+  |
|  |             (Blurred Background)           |  |
|  |                                            |  |
|  |  +--------------------------------------+  |  |
|  |  |           [ Poster Image ]           |  |  |
|  |  |           (or Backdrop)              |  |  |
|  |  +--------------------------------------+  |  |
|  |                                            |  |
|  |  Title: Inception                          |  |
|  |  My Rating: [ 印章風格 (Stamp Style) ]     |  |
|  |  "A masterpiece of dream logic..."         |  |
|  |                                            |  |
|  |  [ QR Code ]    [ Storio Logo ]            |  |
|  |                                            |  |
|  +--------------------------------------------+  |
|                                                  |
|  [ Template: Default | Pure | Ticket | 3D... ]   |
|  [ Aspect Ratio: 9:16 | 4:5 | 1:1 ]              |
|                                                  |
|  [v] Show Title                                  |
|  [v] Show Rating                                 |
|  [v] Show Reflection                             |
|                                                  |
|  [         Share (Native System Sheet)       ]   |
+--------------------------------------------------+
```
