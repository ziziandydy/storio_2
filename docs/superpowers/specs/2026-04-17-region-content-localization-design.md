# Design Spec: Region Settings + Content Localization

**Date:** 2026-04-17
**Status:** Approved
**Context:** 後端 region 全部寫死 `"TW"`，前端 `settingsStore` 的 `region` 欄位從未傳至後端。用戶可能在加拿大、香港、新加坡等地，應依用戶所在地區提供在地化 trending 與搜尋結果。

---

## 目標

1. **Region 自動偵測**：App 首次啟動時從裝置 locale 推導地區，fallback `"TW"`
2. **Region 設定 UI**：Profile → Settings 新增 Region 選擇器
3. **前端傳遞 region**：所有 API 呼叫加入 `X-Region` header
4. **後端動態應用 region**：拆除所有寫死的 `"TW"`，改從 header 讀取
5. **AI 書單推薦在地化**：Gemini prompt 根據 region + language 組合決定市場

---

## 架構

```
前端 settingsStore.region
  ├── 初始化：detectRegion() 從 navigator.language 解析
  │     "zh-TW" → "TW", "en-CA" → "CA", "zh-HK" → "HK"
  │     無法解析 → fallback "TW"
  └── 每次 API 呼叫：header X-Region: {region}

後端 deps.py
  └── get_region(x_region: str = Header("TW")) → str
        → 傳入所有 trending / search / ai endpoint

search_service.py
  └── 所有寫死 "TW" 改為動態 region 參數

ai_recommendation_service.py
  └── cache key: {date}_{language}_{region}
  └── Gemini prompt: 根據 region code 決定市場描述
```

---

## 需修改的檔案

### 前端

1. **新增 `client/src/utils/detectRegion.ts`** — 裝置 locale → region code
2. **修改 `client/src/store/settingsStore.ts`** — region 初始化改用 detectRegion()
3. **修改 `client/src/app/profile/page.tsx`** — 新增 Region 設定 sub-view
4. **修改 `client/src/i18n/locales.ts`** — 新增 region 相關 UI 字串
5. **修改 `client/src/app/search/page.tsx`** — API 呼叫加 `X-Region` header
6. **修改所有 trending API 呼叫處** — 加 `X-Region` header（search page 的 trending fetch）

### 後端

7. **修改 `server/app/api/deps.py`** — 新增 `get_region()` dependency
8. **修改 `server/app/api/v1/endpoints/search.py`** — trending / search / ai 路由加 `region=Depends(get_region)`
9. **修改 `server/app/services/search_service.py`** — 拆除所有寫死 `"TW"` 改為動態參數
10. **修改 `server/app/services/ai_recommendation_service.py`** — cache key + Gemini prompt 加入 region
11. **修改 `server/app/services/semantic_search_service.py`** — `parse_intent` system prompt 加入 language + region 上下文
12. **修改 `server/app/services/trending_service.py`** — cache key 加入 region（`movie_zh-TW_CA` 等）

---

## 詳細設計

### `client/src/utils/detectRegion.ts`（新增）

```typescript
/**
 * 從裝置/瀏覽器 locale 推導 ISO 3166-1 region code。
 * Capacitor iOS 的 navigator.language 反映裝置語言設定（例如 "zh-TW", "en-CA"）。
 * 無法解析時 fallback "TW"。
 */
export function detectRegion(): string {
  try {
    const locale = navigator.language || '';       // e.g. "zh-TW", "en-CA", "ja-JP"
    const parts = locale.split('-');
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2}$/.test(region)) return region;
    }
  } catch {
    // SSR 或 navigator 不可用
  }
  return 'TW';
}
```

### `client/src/store/settingsStore.ts`（修改）

```typescript
import { detectRegion } from '@/utils/detectRegion';

// region 改為 lazy init：若 stored 值存在用 stored，否則從裝置偵測
// persist middleware 會在 hydration 後覆寫，所以初始值只在首次安裝時生效
region: detectRegion(),
```

### Region 選擇器 UI（Profile 新增 sub-view）

**精選地區清單（20 個，依語系分組）：**

```typescript
export const REGION_OPTIONS = [
  // 中文市場
  { code: 'TW', flag: '🇹🇼', zhName: '台灣', enName: 'Taiwan' },
  { code: 'HK', flag: '🇭🇰', zhName: '香港', enName: 'Hong Kong' },
  { code: 'MO', flag: '🇲🇴', zhName: '澳門', enName: 'Macau' },
  { code: 'SG', flag: '🇸🇬', zhName: '新加坡', enName: 'Singapore' },
  { code: 'MY', flag: '🇲🇾', zhName: '馬來西亞', enName: 'Malaysia' },
  // 東亞
  { code: 'JP', flag: '🇯🇵', zhName: '日本', enName: 'Japan' },
  { code: 'KR', flag: '🇰🇷', zhName: '韓國', enName: 'South Korea' },
  { code: 'TH', flag: '🇹🇭', zhName: '泰國', enName: 'Thailand' },
  { code: 'IN', flag: '🇮🇳', zhName: '印度', enName: 'India' },
  // 英語系
  { code: 'US', flag: '🇺🇸', zhName: '美國', enName: 'United States' },
  { code: 'GB', flag: '🇬🇧', zhName: '英國', enName: 'United Kingdom' },
  { code: 'CA', flag: '🇨🇦', zhName: '加拿大', enName: 'Canada' },
  { code: 'AU', flag: '🇦🇺', zhName: '澳洲', enName: 'Australia' },
  // 歐洲
  { code: 'FR', flag: '🇫🇷', zhName: '法國', enName: 'France' },
  { code: 'DE', flag: '🇩🇪', zhName: '德國', enName: 'Germany' },
  { code: 'ES', flag: '🇪🇸', zhName: '西班牙', enName: 'Spain' },
  { code: 'IT', flag: '🇮🇹', zhName: '義大利', enName: 'Italy' },
  // 其他
  { code: 'BR', flag: '🇧🇷', zhName: '巴西', enName: 'Brazil' },
  { code: 'MX', flag: '🇲🇽', zhName: '墨西哥', enName: 'Mexico' },
  { code: 'CN', flag: '🇨🇳', zhName: '中國大陸', enName: 'China' },
] as const;
```

**UI 結構（仿現有 Language sub-view）：**
- 列表行：`{flag} {zhName 或 enName（依 language 設定）} · {enName（小字 text-white/30）}` + 右側 `✓`（若選中）
- 沒有搜尋列（20 個選項，視覺掃描足夠快）
- 無「自動」選項（初始化時已自動偵測，用戶手動選擇後即覆蓋）

### 後端 `deps.py` 新增

```python
def get_region(x_region: str = Header("TW")) -> str:
    """
    Reads X-Region header for ISO 3166-1 region code.
    Validates to 2-letter uppercase code. Defaults to 'TW'.
    """
    if not x_region or not re.match(r'^[A-Z]{2}$', x_region.upper()):
        return "TW"
    return x_region.upper()
```

### 後端 `search.py` endpoint 修改

所有 trending 和 search 路由加入：
```python
region: str = Depends(get_region)
```

並傳遞到對應的 Service 呼叫。

### `search_service.py` 修改重點

```python
# Before（多處）：
params = {"language": language, "region": "TW"}

# After（統一）：
params = {"language": language, "region": region}
```

受影響方法：`_fetch_tmdb_trending`、`search_by_intent`、`search_multi`（新增 region 參數）。

### `ai_recommendation_service.py` Gemini prompt 修改

```python
# 根據 region + language 組合描述市場
REGION_MARKET_MAP = {
    "TW": "Taiwan",
    "HK": "Hong Kong",
    "SG": "Singapore (multilingual)",
    "MY": "Malaysia",
    "US": "United States",
    "CA": "Canada",
    "GB": "United Kingdom",
    "JP": "Japan",
    "KR": "South Korea",
    "AU": "Australia",
    # 其餘 fallback 用 ISO code
}

market = REGION_MARKET_MAP.get(region, region)
lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"

prompt = f"""
Recommend 30 books for a daily recommendation to the general public.
Language: {lang_name}.
Target market: {market}.
Prioritize books that are popular, available, or culturally relevant in {market}.
Categories: contemporary literature, classics, self-help, business, sci-fi, etc.
Output strictly as JSON Array: [{{"title": "...", "author": "..."}}]
"""
```

Cache key：`f"{today}_{language}_{region}"`（已含 region）

### `semantic_search_service.py` system prompt 加入 context

```python
lang_name = "Traditional Chinese" if language == "zh-TW" else "English"
region_hint = f"The user is browsing from region: {region}."

system_prompt = f"""
You are a semantic search intent parser for a media catalog...
User language: {lang_name}. {region_hint}
...
"""
```

---

## 驗收標準

1. 首次安裝 App（裝置語言 en-CA）→ `settingsStore.region` 自動為 `"CA"`
2. Profile → Settings → Region → 可選擇地區，選擇後 persist
3. Trending 電影/影集呼叫後端時，request header 含 `X-Region: CA`（或用戶設定值）
4. 後端 trending 使用動態 region，不再寫死 `"TW"`
5. AI 書單推薦：加拿大用戶（region=CA, language=en-US）拿到以英語市場為主的書單
6. AI 語意搜尋：system prompt 含用戶 language + region 上下文

---

## 不在範圍內

- 不新增「台灣院線」等專屬 section（先讓現有 trending 動態化，再評估）
- 不支援 50 個以上地區的搜尋（精選 20 個即可）
- Google Books 不支援 region 參數（僅透過 `langRestrict` 控制語言）
