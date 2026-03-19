# Storio 2 - User Acceptance Test (UAT) Checklist

**Tester Role**: Guest User (Anonymous)
**Environment**: Local Development
**Date**: 2026-02-15

## 1. 搜尋功能 (Search)
- [x] **進入搜尋頁面**
    - [x] 點擊首頁 Search Icon。
    - [x] 預期：跳轉至 `/search`，且游標自動聚焦於輸入框。
- [x] **輸入關鍵字**
    - [x] 輸入 "Dune"。
    - [x] 預期：延遲約 0.5 秒後自動顯示搜尋結果 (Debounce)。
    - [x] 預期：至少顯示 1 筆來自 TMDB 的電影結果 (Dune: Part Two)。
    - [x] 預期：至少顯示 1 筆來自 Google Books 的書籍結果 (Dune by Frank Herbert)。
- [x] **空結果處理**
    - [x] 輸入亂碼 "asdfghjkl"。
    - [x] 預期：顯示 "No entries found in the archives."。

## 2. 館藏功能 (My Storio)
- [x] **新增館藏 (Add to Folio)**
    - [x] 點擊搜尋結果卡片上的 "Add" 按鈕。
    - [x] 預期：彈出評分與心得填寫視窗。
    - [x] **驗證**：檢查 Supabase 資料庫 `collections` table，應新增一筆記錄。
- [x] **二刷/重複新增邏輯**
    - [x] 再次點擊同一張卡片的 "Add" 按鈕。
    - [x] 預期：彈出提示「您之前已收藏過，是因為二刷想再次記錄嗎？」。
    - [x] 預期：提供「記錄新感悟」與「查看過去紀錄」選項。
- [x] **未評分引導**
    - [x] 新增一個不帶評分的作品。
    - [x] 預期：My Storio 頁面的海報上顯示 "Share your thought" 閃爍按鈕。

## 3. 詳情與編輯 (Memory Details)
- [x] **進入詳情頁**
    - [x] 從 My Storio 點擊作品卡片。
    - [x] 預期：進入 `/collection/[id]`，顯示當時的評分、心得與加入日期。
- [x] **編輯心得**
    - [x] 修改評分或文字並點擊 "Update Memory"。
    - [x] 預期：資料成功更新並彈出 Toast 提示。
- [x] **歸檔 (Archive)**
    - [x] 在詳情頁點擊垃圾桶圖示。
    - [x] 預期：確認後移除該筆紀錄並返回列表。

## 4. 限制測試 (Guest Limits)
- [x] **10 筆限制**
    - [x] 嘗試新增第 11 筆資料。
    - [x] 預期：彈出錯誤提示 "Guest limit reached"。已優化為 Modal 內的導向提示。

## 5. 數據持久性
- [x] **重新整理頁面**
    - [x] 重新整理瀏覽器。
    - [x] 預期：用戶身份維持不變，My Storio 內容正確加載。

## 6. 新功能測試 (v2.1)
- [x] **首頁數據儀表板 (Curated Stats)**
    - [x] 首頁顯示數據輪播 (Carousel)。
    - [x] 輪播內容包含：7天、30天、今年數據以及趨勢圖。
    - [x] 點擊 "View My Storio" 可正確跳轉至館藏頁。
- [x] **Profile 設定**
    - [x] 進入 `/profile` 頁面，點擊 "Statistics"。
    - [x] 切換 Widget 開關 (例如關閉 "Last 7 Days")。
    - [x] 返回首頁，確認該 Slide 已被隱藏。
- [x] **搜尋體驗 (Search UX)**
    - [x] 搜尋框與篩選器位於螢幕底部。
    - [x] 鍵盤彈出時，輸入框不應被遮擋 (Mobile Web 行為)。
    - [x] 空狀態顯示 "Find the stories here" 與圖示。
- [x] **記憶時間軸 (Memory Timeline)**
    - [x] 對同一作品進行二刷收藏。
    - [x] 進入詳情頁，確認顯示 "Memory Timeline" 區塊。
    - [x] 點擊舊紀錄可跳轉至該次心得。

## 7. 隱私與安全性 (Privacy & Safety)
- [ ] **進入隱私設定**
    - [ ] 以已登入用戶身份進入 `/profile`。
    - [ ] 預期：看到 "Privacy & Safety" (隱私與安全性) 入口。
- [ ] **清除所有資料 (Clear Data)**
    - [ ] 點擊 "Clear All Data"。
    - [ ] 預期：彈出確認 Modal，要求輸入 "CLEAR DATA"。
    - [ ] 輸入錯誤字串，確認按鈕維持 Disabled。
    - [ ] 輸入正確字串並確認。
    - [ ] 預期：館藏清空，帳號維持登入狀態。
- [ ] **刪除帳號 (Delete Account)**
    - [ ] 點擊 "Delete Account"。
    - [ ] 預期：彈出確認 Modal，要求輸入 "DELETE ACCOUNT"。
    - [ ] 輸入正確字串並確認。
    - [ ] 預期：帳號登出，導回首頁，資料庫中該用戶資料與帳號均已移除。
- [ ] **訪客權限驗證**
    - [ ] 以訪客身份 (Guest) 進入 `/profile`。
    - [ ] 預期：隱私與安全性入口應被隱藏。