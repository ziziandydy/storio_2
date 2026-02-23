# Storio 專案待辦清單與未來優化 (Backlog & Future Improvements)

2026-02-21 UAT 測試後紀錄。

## ✅ 最近完成 (Completed)
1.  **訪客登入 Logo**: 修復 `OnboardingModal.tsx` 中損壞的 Logo 路徑。
2.  **描述文字截斷**: 在 `StoryDetailsView.tsx` 實作「查看更多」/「顯示部分」功能。
3.  **隱藏未評分顯示**: 在 `StoryCard.tsx` 中，將尚未評分的項目完全隱藏評分指標。
4.  **重複收藏警告**: 更新 `AddToFolioModal` 與 `DetailsPage`，若已收藏則提示「再次觀看/閱讀」的意圖，而非簡單的警告。
5.  **空白心得設計**: 重新設計 `/collection/[id]` 中的個人心得卡片，使其在沒有內容時依然優雅。
6.  **導覽一致性**: 將首頁的手動 FAB 替換為統一的 `NavigationFAB`，並更新顏色以符合 Storio 美學。
7.  **術語優化**:
    - 將 "Builder" 替換為 "Apprentice"。
    - 英文版統一將 "TV Series" 改為 "Series"。
    - 更新「新增/詳情」按鈕。
8.  **身分驗證與引導 (Auth & Onboarding)**:
    - 實作 Email OTP 登入流程。
    - 優化 Onboarding Modal 佈局 (動態寬度)。
    - 設定 Google/Apple OAuth。
9.  **館藏與詳情 (Collection & Details)**:
    - 修復 "Series" 顯示為 "Book" 的 Bug。
    - 實作安全的刪除對話框 (需輸入 "REMOVE")。
    - 支援自訂收藏日期。
    - 優化行事曆視圖 (聚焦當月，為未來留白)。
    - 優化 StoryDetailsView 佈局 (高斯模糊背景、海報下方顯示 Metadata)。
10. **搜尋 (Search)**:
    - 實作手動觸發搜尋 (Enter/點擊)。
    - 修復手機版鍵盤收合問題。
    - 優化輸入框佈局 (右側送出按鈕、針對中日韓語系優化輸入狀態)。
11. **AI 功能**:
    - 加入 OpenAI 作為建議功能的備援。
    - 修復建議渲染邏輯 (傳遞劇情大綱)。
12. **書籍詳情 (Book Details)**:
    - 在檔案區加入 ISBN (可複製)、出版商、頁數資訊。
    - 加入「閱讀指南」(Google Play 連結)。
    - 在媒體區加入「試閱」與封面縮圖。

## 🚀 SPRINT 5: 深度客製化分享 (目前進行中)
- [ ] **分享控制中心**: 實作 `ShareModal` 提供即時預覽、比例切換 (9:16, 4:5, 1:1) 與內容開關。
- [ ] **主視覺模板**:
    - [ ] **預設模糊 (Default Blur)**: 高品質的高斯模糊背景搭配懸浮卡片。
    - [ ] **純海報 (Pure Image)**: 極簡的全海報輸出。
    - [ ] **電影票根 (Cinema Ticket)**: 帶有打孔虛線的復古票根設計。
    - [ ] **3D立體書 (3D Paperback)**: 依據頁數動態調整書背厚度的 3D 渲染書本。
- [ ] **原生分享 (Native Sharing)**: 整合 Web Share API，在手機上實現無縫的系統級分享。

## 📅 SPRINT 6: 月度回顧與社交 (Recap & Social)
- [ ] **月度回顧**: 實作行事曆視圖的總結分享 (Instagram 貼文格式)。
- [ ] **社群動態 (選配概念)**: 瀏覽其他策展人分享的記憶。

## 🎨 UI/UX 優化 (UI/UX Polish)
- [ ] **導覽選單調整 (Navigation FAB)**: 在 `/collection` 頁面右下角的點擊「＋」鍵時，其彈出選項應為「首頁 (Home)」與「搜尋 (Search)」，避免顯示當前所在頁面 (館藏)。
- [ ] **多次觀看記錄 (Multi-View Navigation)**: 如果一個項目被觀看多次 (re-watched) 的處理邏輯。