# Auto 搜尋模式改為 Keyword-First — 設計文件

- **日期**：2026-07-11
- **狀態**：已核准（用戶確認）
- **範圍**：純前端，`client/src/app/search/page.tsx` 單一檔案
- **後端**：不動（`/api/v1/search/` 與 `/api/v1/search/ai` 維持現狀）

---

## 背景與問題

目前 Auto 模式用正則（`isSemanticQuery`：偵測「推薦」「類似」「氛圍」等字眼）預判查詢是否為語意搜尋，命中就直接走 AI endpoint。問題：

1. 正則預判不可靠——描述性查詢字眼列舉不完，精確標題也可能誤撞關鍵字。
2. v1.13.0 已存在「keyword 空結果 → 自動打 AI」的 fallback 機制，正則預判成為多餘且易錯的前置路由。
3. 現有 fallback 條件寫成「不是 AI 搜尋」，導致手動選 Keyword 模式時也會偷偷打 AI，三種模式行為界線模糊。
4. 現有 fallback 判空看的是 API 回傳的**未過濾**結果——在 Movies/TV 分頁搜書名時，API 回書、畫面為空，卻不觸發 AI。

## 目標行為（三模式獨立）

| 模式 | 行為 |
|------|------|
| **Auto** | 一律先打 keyword 搜尋（`GET /search/?q=`）；**以當前分頁 filter 過濾後**結果為 0 → 自動改打 AI（`POST /search/ai`） |
| **Keyword** | 純關鍵字；空結果顯示 No Results，**不打 AI** |
| **AI** | 不變，直接語意搜尋 |

- Loading UX 維持現狀：fallback 過程只顯示一般 spinner，不切紫色 AI overlay，結果列表不加標註。
- 紫色 AI loading overlay 僅在手動選 AI 模式時顯示（`isAiSearch` 收斂後自然成立）。

## 變更明細（`client/src/app/search/page.tsx`）

1. **移除正則語意預判**
   - 刪除 `isSemanticQuery`、`isAutoSemantic`、`actualSearchMode`。
   - `isAiSearch` 簡化為 `searchMode === 1`（僅手動 AI 模式）。
2. **fallback 條件收斂到 Auto**
   - fetch effect 中的空結果 fallback 條件由 `!isAiSearch` 改為 `searchMode === 0`。
3. **判空改用 filter 過濾後結果**
   - fallback 觸發判斷由 `primaryResults.length === 0` 改為「`primaryResults` 依當前 `filter` 過濾後（movie/tv 視為同組，book 獨立）長度為 0」。
   - AI fallback 的 `media_type` 參數維持現邏輯（依 filter 帶 movie/tv/book）。
   - filter 切換不重新觸發搜尋（維持現狀）；fallback 的 AI 結果直接取代 `results`。

## 已知取捨（用戶已確認接受）

- 描述性查詢（如「推薦溫馨的電影」）在 Auto 下會先多一次 keyword 請求，慢 1–2 秒才進 AI。
- 極少數情況 keyword 回「非空但不相關」的結果（標題撞字），此時不會進 AI；使用者可手動切 AI 模式解決。

## 驗證方式

前端 Playwright 落後未進 CI，改用 dev server + headless browser（gstack）驗三案例：

1. Auto 搜精確片名（如「星際效應」）→ keyword 直出，無 AI 請求。
2. Auto 搜描述句（如「推薦溫馨的日本電影」）→ keyword 空結果後自動出 AI 結果。
3. Keyword 模式搜不存在的字串 → 顯示 No Results，且 network 無 `/search/ai` 請求。

另補驗 filter 案例：Movies/TV 分頁搜純書名 → 過濾後為空 → 觸發 AI fallback。
