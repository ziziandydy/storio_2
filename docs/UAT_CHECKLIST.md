# Storio 2 - User Acceptance Test (UAT) Checklist

**Tester Role**: Guest User (Anonymous)
**Environment**: Local Development
**Date**: 2026-02-15（首次撰寫；後續驗證進度見各節備註，最後更新 2026-07-16）

> ⚠️ **文件狀態**：本文件記錄早期手動 UAT 流程（Section 1-6 為 v2.1 前功能，均已通過並沿用至今）。v1.13.0 之後的版本改以 `/qa`（gstack headless browser）+ iOS 模擬器 CDP 驗證為主，詳見各版本 BACKLOG 里程碑條目與 `docs/DEV_SETUP.md`。過時或已由後續版本取代的項目以刪除線標記，不刪除原文。

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

> ✅ **已於 2026-04-10 完成 UAT 驗證**（`add-account-deletion` Tasks 4.1~4.3，見 BACKLOG「帳號刪除 UAT 測試」條目）。以下項目原為未勾選狀態，現依驗證結果補勾。

- [x] **進入隱私設定**
    - [x] 以已登入用戶身份進入 `/profile`。
    - [x] 預期：看到 "Privacy & Safety" (隱私與安全性) 入口。
- [x] **清除所有資料 (Clear Data)**
    - [x] 點擊 "Clear All Data"。
    - [x] 預期：彈出確認 Modal，要求輸入 "CLEAR DATA"。
    - [x] 輸入錯誤字串，確認按鈕維持 Disabled。
    - [x] 輸入正確字串並確認。
    - [x] 預期：館藏清空，帳號維持登入狀態。
- [x] **刪除帳號 (Delete Account)**
    - [x] 點擊 "Delete Account"。
    - [x] 預期：彈出確認 Modal，要求輸入 "DELETE ACCOUNT"。
    - [x] 輸入正確字串並確認。
    - [x] 預期：帳號登出，導回首頁，資料庫中該用戶資料與帳號均已移除。
- [x] **訪客權限驗證**
    - [x] 以訪客身份 (Guest) 進入 `/profile`。
    - [x] 預期：隱私與安全性入口應被隱藏。
## 8. 本機通知 (Local Notifications, v1.14.0)

> 測試環境：iOS 模擬器 / 真機（Web 不觸發通知）。已透過 ios-webkit-debug-proxy + CDP 自動化驗證。

- [x] **權限請求 (Permission)**
    - [x] Profile > Notifications 開啟主開關 → iOS 系統權限對話框出現。
    - [x] 對話框文字由系統提供（無需 Info.plist usage description）。
    - [ ] 拒絕後再開 → 顯示「前往設定」引導 Toast，主開關維持 OFF（web 已驗證；真機需實際 deny）。
- [x] **設定 UI**
    - [x] 主開關 OFF 時，下方 Log a story / Folio reflection 細項隱藏。
    - [x] 主開關 ON 時，細項以動畫滑出，兩開關預設皆 ON。
    - [x] Profile 主頁 Notifications row 顯示 ON/OFF badge；升級後顯示 NEW badge。
- [x] **通知排程 (Scheduling)**
    - [x] 記錄一筆 Storio（評分但未寫心得）→ 重開 app → `getPending()` 含 Folio reflection 通知。
    - [x] 通知內容個人化：「《{標題}》給你什麼感悟？🌙」。
    - [x] engagement < 7 筆 → 排程於 fallback 時間（20:00 / 21:00）。
    - [x] 每日最多 2 則，深夜 00:00–08:00 不排程。
- [x] **智慧忽略 (Smart Ignore)**
    - [x] folio_reflection ignoredCount 達 3 → `getPending()` 回空，不再排程。
    - [x] 評分任一作品 → ignoredCount 重置為 0，恢復排程。
    - [x] 關閉類型開關 → 該類型不排程。
- [x] **權限引導卡片**
    - [x] 新用戶記錄首筆 Storio 後 → 下次開 app 顯示 Permission Primer。
    - [x] Primer dismiss × 2 → 不再自動顯示。
    - [x] 舊用戶新增 Storio → 顯示升級 Banner。
- [x] **i18n**
    - [x] 語系切換 en-US → 通知文字英文化（標題作為資料保留原文）。

## 9. 人物/類型搜尋擴充 (add-person-search, v1.16.0)

> ✅ 已於 2026-07-13 完成 QA（headless browser）與 2026-07-14 iOS 模擬器 CDP 驗證，2026-07-16 通過 Apple 審核上架。詳細測試記錄見 BACKLOG「add-person-search」條目，不在此重複列點。

- [x] Details 頁 cast/director/genre/studio chips 可點擊，導向 Explore 搜尋頁顯示相關作品。
- [x] Explore 手動輸入人名（中英文）可自動偵測並回傳該人物完整作品清單。
- [x] 點擊 chip 進入搜尋結果後按返回鍵，正確回到原 details 頁（`router.push`，已於模擬器真實 WKWebView 環境驗證）。
