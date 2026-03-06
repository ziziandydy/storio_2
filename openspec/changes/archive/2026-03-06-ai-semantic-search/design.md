## Context

Storio 目前的搜尋功能 (位於 `/search` 頁面) 是一個純前端驅動的體驗，依賴直接呼叫外部的 TMDB API 與 Google Books API 進行字串精確比對 (Title Search)。當使用者輸入的字串並非確切的書名或片名，而是描述性的長句（例如「諾蘭、時間旅行」或「關於黑洞的電影」）時，原生 API 通常無法回傳有效的結果。為了讓 Storio 更符合「儲思盆 (Pensieve)」的產品定位，我們需要引入 AI (LLM) 作為理解使用者模糊意圖的中介層，將自然語言轉化為高精度的結構化搜尋參數。

## Goals / Non-Goals

**Goals:**
- 提供一個隱形且無縫的 AI 搜尋體驗，預設自動判斷使用者的搜尋意圖是精確比對還是語意描述。
- 實作極簡的 UI/UX，將手動覆蓋模式 (Manual Override) 隱藏在搜尋送出按鈕的「長按 (Long-Press)」操作中，避免破壞現有畫面的簡潔。
- 在後端建立一個兼具效能與成本控制的 API 端點 (`/api/v1/search/ai`)，整合 LLM (OpenAI / Gemini) 進行意圖解析與結果對映。

**Non-Goals:**
- 不實作針對使用者個人館藏 (Local Folio items) 的向量資料庫 (Vector Database) 搜尋。此次 AI 搜尋的範圍僅限於探索外部世界的作品 (TMDB / Google Books)。
- 不實作完整的對話式 AI 機器人 (Chatbot UI)；這是一個「智慧搜尋列」，而非「聊天視窗」。

## Decisions

1. **前端意圖偵測 (Frontend Intent Parsing) vs. 後端全丟 LLM (Backend LLM Everything)**:
   - *Decision*: 採取「前端輕量特徵偵測 + 後端 LLM 深度解析」的混合架構。
   - *Rationale*: 如果每次擊鍵或送出都打給 LLM 去判斷，會造成極大的延遲與 API 成本。前端透過簡單的正則表達式 (Regex) 檢查（例：字串中是否包含「有沒有」、「關於...的」，或者是否被標點符號如「、」切分為多個關鍵字）來決定是否要走 AI 流程，可以在 0 延遲下完成初步路由（Routing）。這也使得 UI 能立即給出 `✨` 的視覺反饋。

2. **UI 手動開關設計 (Toggle UI Design)**:
   - *Decision*: 拔除獨立的實體開關，改用送出按鈕的「長按 (Long-Press) + Popover」作為覆蓋手段。
   - *Rationale*: Storio 非常重視高雅黑金的極簡體驗 (Apple-like design)。大多數使用者不需要知道背後是 AI 還是 Native API 在運作，常駐一個 AI 開關反而突兀。長按此種「重度使用者」才知道的 Micro-interaction 可以完美隱藏複雜度。

3. **後端 LLM 整合與 API 流 (Backend AI Pipeline)**:
   - *Decision*: 在 FastAPI 建立 `/api/v1/search/ai`，接收前端帶著意圖的 query，由 LLM 解析成 TMDB 的 Discover API 參數（如 `with_genres`, `with_keywords`, `with_crew`），然後由後端代打 TMDB API 並將結果映射回統一的 `StoryResult` 陣列給前端。
   - *Rationale*: 直接讓 LLM 吐出「推薦片單的字串」會導致我們無法取得正確的 ID、海報圖來渲染現有的 `StoryCard` 元件。LLM 必須扮演「參數轉譯器」的角色，確保回傳的資料格式與現有系統 100% 相容。

## Risks / Trade-offs

- **[Risk] LLM API 延遲 (Latency)** → *Mitigation*: 必須在前端顯示精心設計的 "Consulting the archival spirits..." 的 Loading 動畫，讓等待時間感覺像是儀式感的一部分。
- **[Risk] 呼叫成本與 Rate Limits** → *Mitigation*: 在後端或 Vercel 層級實作簡單的 Cache (例如使用字串 hash 作為 Redis key)，相同的自然語言查詢在 24 小時內直接回傳 Cache 結果，避免重複呼叫 LLM。
- **[Risk] LLM 解析的 TMDB 參數查無結果 (Hallucination)** → *Mitigation*: 若 LLM 給出的參數打到 TMDB 回傳空陣列，後端應具備降級機制，或者指示前端顯示優雅的空狀態文字 "The archives are silent on this matter."。
