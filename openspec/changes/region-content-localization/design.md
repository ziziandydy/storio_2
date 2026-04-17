## Context

`settingsStore` 已有 `language`（zh-TW/en-US/system）與 `region`（硬寫 `'TW'`）欄位。Language 已透過 `Accept-Language` header 傳至後端並正確應用。Region 未曾傳遞，後端 `search_service.py` 中 `region` 全數寫死為 `"TW"`。AI 書單推薦以 `language === 'zh-TW'` 作為「台灣市場」的代理，無法支援香港、新加坡等同樣使用繁中的用戶。

## Goals / Non-Goals

**Goals:**
- 前端自動偵測裝置 region，提供手動覆蓋 UI
- 所有 trending / search / AI 推薦依用戶 region 動態化
- i18n：Region UI 全部支援 zh-TW / en-US

**Non-Goals:**
- 不新增「台灣院線」等地區專屬 section（先動態化現有 trending）
- 不支援 50+ 國完整列表（精選 20 個）
- Google Books 無 region 參數，僅透過 `langRestrict` 控制語言

## Decisions

**決策 1：region 從 `X-Region` header 傳遞，與 `Accept-Language` 對稱**

後端加 `get_region()` dependency，讀 `X-Region` header，預設 `"TW"`。與現有 `get_language()` 讀 `Accept-Language` 的模式完全一致，不需要改變 API 路徑或加 query param。

**決策 2：detectRegion() 解析 `navigator.language` 的最後一段**

`navigator.language` 為 IETF BCP 47 格式（`language-REGION`），取最後一段大寫即為 ISO 3166-1 code。Capacitor iOS 的 `navigator.language` 反映裝置語言設定，可信賴。

**決策 3：Region 選擇器不加搜尋列，精選 20 個地區**

20 個地區視覺掃描足夠快，搜尋列增加複雜度但無實質效益。UI 樣式與現有 Language sub-view 完全一致。

**決策 4：AI 書單 cache key 加入 region**

原 key `{date}_{language}` 改為 `{date}_{language}_{region}`。舊快取不受影響（key 不同，自動 miss 後重新生成）。

## Risks / Trade-offs

- **[風險] TMDB `region` 影響 trending 排序**：TMDB trending API 的 `region` 主要控制 watch provider 可用性，不一定大幅改變排序。→ 緩解：這是合理的第一步，未來可評估加入 `now_playing` endpoint
- **[Trade-off] 20 個精選地區不含所有市場**：少數用戶地區不在清單。→ 緩解：不在清單的地區，裝置偵測仍可設定正確 region code；選擇器清單可日後擴充
- **[風險] SSR 環境 `navigator` 不可用**：`detectRegion()` 包在 try/catch，SSR fallback `"TW"`，hydration 後 zustand persist 覆寫為正確值
