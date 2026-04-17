## 1. 前端：Region 偵測與 Store

- [ ] 1.1 新增 `client/src/utils/detectRegion.ts`：解析 `navigator.language` → ISO region code，fallback `"TW"`
- [ ] 1.2 修改 `client/src/store/settingsStore.ts`：`region` 初始值改為 `detectRegion()`

## 2. 前端：i18n 字串

- [ ] 2.1 修改 `client/src/i18n/locales.ts`：在 settings 區塊新增 `settings_region`（地區 / Region）與 `settings_region_title`（地區設定 / Region）

## 3. 前端：Region 設定 UI

- [ ] 3.1 在 `client/src/app/profile/page.tsx` 新增 `REGION_OPTIONS` 常數（20 個精選地區，含 flag / zhName / enName / code）
- [ ] 3.2 新增 Region sub-view 狀態（`showRegionSettings`）及進入/返回邏輯
- [ ] 3.3 實作 Region sub-view JSX：列表行顯示 flag + 地區名（依 language 設定）+ ✓（選中），樣式與 Language sub-view 一致
- [ ] 3.4 在 Settings 主列表加入 Region 列表項目，顯示當前地區名稱

## 4. 前端：API 呼叫加入 X-Region header

- [ ] 4.1 修改 `client/src/app/search/page.tsx`：所有 fetch 呼叫（trending movies/series/books、search、AI search）加入 `X-Region: {region}` header

## 5. 後端：get_region dependency

- [ ] 5.1 修改 `server/app/api/deps.py`：新增 `get_region()` function，讀 `X-Region` header，驗證為 2 字母大寫，預設 `"TW"`

## 6. 後端：endpoint 傳遞 region

- [ ] 6.1 修改 `server/app/api/v1/endpoints/search.py`：trending movies/series/books 路由加 `region=Depends(get_region)` 並傳入 service
- [ ] 6.2 修改 `server/app/api/v1/endpoints/search.py`：search 與 AI search 路由加 `region=Depends(get_region)` 並傳入 service

## 7. 後端：search_service 動態 region

- [ ] 7.1 修改 `_fetch_tmdb_trending`：`region` 參數取代寫死 `"TW"`
- [ ] 7.2 修改 `search_by_intent`：`region` 參數取代寫死 `"TW"`
- [ ] 7.3 修改 `search_multi`：加入 `region` 參數並傳至 TMDB 呼叫

## 8. 後端：AI 推薦在地化

- [ ] 8.1 修改 `server/app/services/ai_recommendation_service.py`：`_try_gemini` 加入 `region` 參數，新增 `REGION_MARKET_MAP`，更新 prompt 使用 market 描述
- [ ] 8.2 修改 `ai_recommendation_service.py`：cache key 改為 `f"{today}_{language}_{region}"`
- [ ] 8.3 修改 `server/app/services/trending_service.py`：cache key 加入 region（`f"{type_key}_{language}_{region}"`）
- [ ] 8.4 修改 `server/app/services/semantic_search_service.py`：`parse_intent` system prompt 加入 language + region 上下文

## 9. 驗收測試

- [ ] 9.1 首次安裝（裝置語言 en-CA）→ Profile → Settings → Region 顯示「加拿大 / Canada」
- [ ] 9.2 手動切換地區 → 再次進入 Region 設定，✓ 顯示在新選地區
- [ ] 9.3 Network 觀察 trending 請求 → header 含 `X-Region: CA`（或設定值）
- [ ] 9.4 切換為 region=HK → trending 書單與 region=TW 結果不同
