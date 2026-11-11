## ADDED Requirements

### Requirement: 作品資料欄位

系統 SHALL 在 `collections` 表儲存可供 Recap 統計的作品資料：`runtime_minutes`（電影單部片長，或影集單集片長）、`episode_total`（影集該筆收藏涵蓋的總集數）、`genres`（類別文字陣列）、`page_count`（書的頁數）。所有欄位 SHALL 可為 null，且新增欄位 MUST NOT 影響既有 API 回應與舊版 App。

#### Scenario: Migration 冪等
- **WHEN** 重複執行 `009_recap_metadata.sql`
- **THEN** 不得出錯，且既有資料不變

#### Scenario: 舊版 App 相容
- **WHEN** 舊版 App 呼叫既有收藏 API
- **THEN** 回應內容與升級前相同，不因新欄位而失敗

### Requirement: 新收藏寫入作品資料

系統 SHALL 在加入收藏時，把已取得的片長、集數、類別、頁數一併寫入；取不到時 SHALL 留 null，且 MUST NOT 因此阻擋或延遲收藏成功。

#### Scenario: 收藏電影
- **WHEN** 用戶收藏一部電影且詳情可取得片長與類別
- **THEN** 該筆收藏的 `runtime_minutes` 與 `genres` 被寫入

#### Scenario: 取不到資料
- **WHEN** 加入收藏時外部 API 回傳失敗
- **THEN** 收藏仍成功，相關欄位為 null

### Requirement: 舊收藏補抓與快取

系統 SHALL 在計算某年 Recap 時，找出該年缺作品資料的收藏，以有限並行向 TMDB／Google Books 取詳情並寫回欄位。補抓 SHALL 有時間預算，超過時 SHALL 先以已有資料計算，並回報尚未補完的數量；失敗的作品 SHALL 視為無資料，下次請求再試。

#### Scenario: 補抓成功並寫回
- **WHEN** 用戶第一次開啟某年 Recap，且有 3 部舊收藏缺片長
- **THEN** 系統向外部取得片長並寫回；再次開啟時不再重複向外部取得

#### Scenario: 超過時間預算
- **WHEN** 補抓超過時間預算
- **THEN** 回應 SHALL 以已有資料計算並帶 `metadata_pending` 大於 0，不回傳錯誤

#### Scenario: 補抓失敗
- **WHEN** 某部作品的外部 API 失敗
- **THEN** 該作品被視為無資料，不影響其他作品的統計

### Requirement: 時間估算規則

系統 SHALL 以下列規則估算花在作品上的時間，且只加總有資料的作品：電影 = 片長；影集 = 該筆收藏涵蓋的集數 × 單集片長（舊收藏沒有季數時以全劇估算）；書 = 頁數 ÷ 每小時 40 頁。文案 SHALL 使用「至少」或「約」，書與影集的時間 SHALL 標示為估算。

#### Scenario: 缺資料的作品不計入
- **WHEN** 一部電影沒有片長資料
- **THEN** 它不計入總時間，且總時間文案為「至少」而非精確值

#### Scenario: 書的時間
- **WHEN** 用戶該年讀了頁數合計 1,200 頁的書
- **THEN** 書的時間為 30 小時，並標示估算

### Requirement: 類別、故事年齡與稱號

系統 SHALL 統計類別（每部作品的所有類別都計入，取前三名）；故事年齡 = 當年 − 作品平均發行年份，最愛年代 = 出現最多的十年；稱號 SHALL 以規則式從預先寫好的中英文稱號表選出，同樣輸入 MUST 得到同樣輸出，且 MUST NOT 呼叫 AI。所有稱號 SHALL 為正面。

#### Scenario: 決定性
- **WHEN** 同一份資料被計算兩次
- **THEN** 兩次的類別排名、故事年齡與稱號相同

#### Scenario: 故事年齡
- **WHEN** 2026 年用戶收藏的作品平均發行年份為 2009
- **THEN** 故事年齡為 17，最愛年代為出現最多的十年
