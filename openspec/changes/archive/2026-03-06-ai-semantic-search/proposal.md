## Why

常規的關鍵字搜尋難以滿足策展人只記得「模糊印象」（例如「關於時間旅行的科幻片」、「諾蘭執導的燒腦神作」）的情境。透過導入 AI 語意搜尋，系統能成為真正的「儲思盆 (Pensieve)」，協助使用者順暢地喚回與發掘典藏作品。這不僅解決了找不到想不起名字的作品的痛點，更完美契合了 Storio 追求的寧靜、高雅與充滿靈驗感的產品體驗。

## What Changes

- 前端 `/search` 頁面搜尋框導入自然語言理解能力，支援繁體中文與英文混合的長句或多關鍵字輸入（Keyword Bag）。
- 前端實作「長按隱藏選單 (Minimalist Override)」，預設為全自動 (Auto) 判定意圖，長按送出按鈕才可手動鎖定模式 (Force AI / Exact Match)，保持 UI 極度簡潔。
- 前端搜尋狀態視覺反饋升級：當判定為 AI 搜尋時，送出按鈕平滑轉化為發光的 `✨` 圖示，並配有專屬的載入文案（如 "Consulting the archival spirits..."）。
- 後端新增 AI 處理節點，利用 OpenAI 或 Gemini 解析搜尋意圖，並將自然語言轉譯為高精度的外部 API (TMDB / Google Books) 查詢參數。

## Capabilities

### New Capabilities
- `semantic-intent-parser`: 前端與後端配合的意圖解析能力，能將使用者輸入自動歸類為「精確搜尋」、「疑問意圖」或「多關鍵字聯想」。
- `ai-search-engine`: 後端整合 LLM 的搜尋引擎，負責解析自然語言並向 TMDB/Google Books 進行結構化查詢，最後映射回 Storio 的 `StoryResult` 格式。
- `search-ui-experience`: 前端高品質的 UI 互動，包含長按浮出微型選單 (Popover)、發光狀態切換，以及優雅的錯誤降級與空狀態處理。

### Modified Capabilities
- `basic-search`: 原有的 Title Search 將從單一入口變為依附在意圖解析器下的 fallback 或 exact-match 分支。

## Impact

- **Frontend**: 需重構 `client/src/app/search/page.tsx` 中的輸入與送出邏輯，新增長按手勢偵測與 Popover 元件，以及新的視覺狀態。
- **Backend**: 預計需新增 `/api/v1/search/ai` endpoint，並引入 LLM SDK (OpenAI/GoogleGenAI)。需考量 API 呼叫成本（Debounce 與 Caching）。
- **External Dependencies**: 對 TMDB 與 Google Books API 的呼叫方式將變得更進階（例如使用 Discover API 帶入 genre, keywords, crew 等參數，而非純 Title 搜尋）。
