# Storio vs 競品：功能比較與缺口分析

**Generated**: 2026-11-12
**比較對象**：Refract、Iseenit、Letterboxd、Goodreads（四份深度 profile）。Sofa、Achriom、Hardcover、StoryGraph 只在必要處提及。
**Storio 基準**：v1.22.0（`client/CHANGELOG.md`）、`docs/PRD.md` v5.2、`docs/BACKLOG.md`、程式碼目錄與 `git grep`。

## 怎麼讀這份文件（證據等級）

| 符號 | 意思 |
|---|---|
| ✓ | 官方頁面、App Store 頁或 Storio 程式碼／文件**明確寫有** |
| ✗ | 官方明確寫沒有，或（Storio）程式碼搜尋找不到 |
| ? | **沒查到**，不代表沒有 |
| ◐ | 有，但範圍較小或形式不同（見備註） |

三個限制：
1. 競品「沒有」只代表**我在官網與 App Store 頁沒看到**，不是實機驗證。
2. 「社群想要」的證據來自 **12 篇 Reddit 討論串、約 660 則留言**（agent-reach／OpenCLI 讀取，含讚數）。讚數只代表「被多少人認同」，不是需求人數；樣本集中在 Letterboxd、Goodreads、TV Time 的重度用戶，**不代表 Storio 的目標用戶**（繁中、典藏導向）。
3. 完全沒有 SEO／流量數據，也沒做實機試用。

---

## 一、Storio 現有功能盤點

| 類別 | 功能 |
|---|---|
| 媒體 | 電影、影集、書（TMDB＋Google Books）；**分季收藏**（v1.17，影集可只收某幾季） |
| 搜尋與探索 | Auto／AI Search／Keyword 三模式；人物、導演、Studio、類型、作者可點擊 chips 探索；首頁熱門電影／影集／書 |
| 記錄 | 評分（SCORE）、心得（限 100 字）、**AI 心得建議與潤飾**、自訂收藏日期、**重複觀看＝多張獨立卡片**、重複收藏提示 |
| 檢視 | Calendar、Gallery、List 三種檢視；月回顧 |
| 分享 | 單作品分享圖 6 款模板（Default／Pure／Ticket／Retro TV／Shelf 3D 書櫃／Desk 桌面）；月回顧 4 款（Calendar／Collage／Waterfall／Shelf）；**年度 Recap**（限時動態式瀏覽，約 15 場景＋規則式稱號）；原生 App 走系統分享面板 |
| 習慣與提醒 | 本機通知：Log a story、Folio reflection、行為學習時段、智慧忽略、churn-rescue 階梯（3/7/14/30/60/90/180 天） |
| 帳號 | Google／Apple／Email OTP；訪客模式（上限 10 筆）＋登入後自動搬移；清除資料／刪除帳號 |
| 稱號 | 首頁稱號（Passerby／Apprentice／Keeper／Master／Grand Master）、Recap 稱號 |
| 平台 | iOS（已上架）、PWA 網頁；Android 技術完成但**尚未上架**；語言僅 en-US、zh-TW |
| 刻意不做 | 社群發佈（`BACKLOG.md`：「確認沒有社群發佈的規劃」） |
| 路線圖未做 | 匯出 CSV／JSON、影像辨識（票根截圖）、展演類別、個人檔案統計圖、分享比例 4:5／1:1 |

---

## 二、功能總表

| 功能 | Storio | Refract | Iseenit | Letterboxd | Goodreads |
|---|---|---|---|---|---|
| **媒體範圍** | | | | | |
| 電影 | ✓ | ✓ | ✓ | ✓ | — |
| 影集 | ✓ | ✓ | ✓ | ✗ | — |
| 書 | ✓ | ◐ 即將推出 | ✓ | ✗ | ✓ |
| 動畫專屬資料（AniList／MAL） | ✗ | ✓ | ✗ | ✗ | — |
| **記錄與整理** | | | | | |
| 評分、心得 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 想看／在看／已看等狀態、待看清單 | **✗** | ✓ | ✓ | ✓（watchlist） | ✓（書架） |
| 單集追蹤 | ✗ | ✓ | ✗ | ✗ | — |
| 分季收藏 | ✓ | ◐ 單集層級（更細） | ◐ 顯示季與集數 | ✗ | — |
| 重看／重讀紀錄 | ✓ 多張卡片 | ✓ | ? | ? | ? |
| 自訂清單 | **✗** | ✓（含最多 20 人協作） | ✗（自認沒有） | ✓ | ✓ |
| 日曆檢視 | ✓ | ◐ 行事曆同步 | ? | ? | ? |
| 匯入其他服務檔案 | **✗** | ✓ 14 個來源 | ◐ 只能貼文字清單 | ? | ✓ |
| 匯出自己的資料 | **✗** | ✓ | ? | ? | ✓ |
| 訪客模式（免登入） | ✓（10 筆） | ✗ 需帳號 | ✓ | ? | ? |
| **探索與 AI** | | | | | |
| AI 自然語言搜尋 | ✓ | ✓ | ✗ | ✗ | ✗ |
| 人物／類型／作者探索 | ✓ | ? | ✓ 演員導演 | ✓ | ? |
| AI 個人化推薦 | **✗** | ✓ | ✓（附理由） | ✗ | ✗ |
| AI 心得建議／潤飾 | ✓ | ✗ | ✗ | ✗ | ✗ |
| 拍海報搜尋、貼上清單由 AI 辨識 | ✗ | ✗ | ✓ | ✗ | ✗ |
| 串流平台查詢 | **✗** | ✓ | ✗ | ✓（Pro） | — |
| **回顧與分享** | | | | | |
| 年度回顧 | ✓ 約 15 場景＋稱號 | ✓ Wrap | ✓ Year in Review | ✓ 個人摘要（需 ≥10 部） | ✓ Year in Books（email 需 ≥3 本） |
| 年度回顧可分享到 Instagram | ✓ 系統分享面板 | ✓ Stories | ✓ Story 卡（單作品） | ? | ◐ 存圖或社群串接 |
| 月回顧分享圖 | ✓ 4 款 | ◐ 月度摘要 | ? | ? | ? |
| 單作品分享圖 | ✓ 6 款，含擬真書櫃／書桌／票根 | ? | ✓ Story 卡 | ? | ✗ |
| 影視與書合併成同一份回顧 | ✓ | ✗ 書未上線 | ✓ | ✗ | ✗ |
| **社交與互動** | | | | | |
| 追蹤好友、動態、留言 | ✗（刻意） | ✓ | ✗ | ✓ | ✓ |
| 家庭／伴侶共享書庫 | ✗ | ◐ 協作清單 | ✓ | ✗ | ✗ |
| 成就、挑戰、年度目標 | ◐ 稱號 | ✓ 282 成就＋目標 | ✗ | ✗ | ✓ Reading Challenge |
| 本機通知／提醒 | ✓ 行為學習 | ? | ? | ✓ watchlist 上線通知（Pro） | ? |
| **平台與價格** | | | | | |
| iOS／Android／網頁 | iOS＋PWA；Android 未上架 | iOS＋Android | 只有 iOS | iOS＋Android＋Web＋Apple TV | iOS＋Android＋Web |
| 語言數 | 2 | 9 | 16 | ? | ? |
| 價格 | 免費（訪客 10 筆） | 免費，Pro 僅裝飾 | 免費 100 筆；Premium | 免費；Pro $19／年 | 免費 |

---

## 三、四大分類

### A. 我們和他們都有（持平）

| 功能 | 備註 |
|---|---|
| 電影＋影集＋書三種媒體 | 只有 Iseenit 完整同時有；Refract 書未上線 |
| 評分與心得 | 全部都有；Storio 心得限 100 字，是風格選擇 |
| 年度回顧 | Storio、Refract、Iseenit、Letterboxd、Goodreads 都有。**不再是差異化，差異只剩深度與形式** |
| 分享到 Instagram | Storio、Refract、Iseenit 都有；做法不同 |
| AI 自然語言搜尋 | Storio、Refract 都有 |
| 人物探索 | Storio、Iseenit、Letterboxd 都有 |
| 訪客模式 | Storio、Iseenit 有 |
| 帳號刪除與資料掌控 | Storio、Refract 都強調 |

### B. 他們有、我們沒有

依**對 Storio 的影響**排序（推論，非用戶數據）：

| # | 功能 | 誰有 | 為何重要 |
|---|---|---|---|
| 1 | **想看／待看清單與狀態**（Want／Watching／Seen） | Refract、Iseenit、Letterboxd、Goodreads | 追蹤類 App 的基本盤。Storio 程式碼中 `git grep` 找不到 watchlist，目前**只記錄「已完成」** |
| 2 | **匯入其他服務的檔案** | Refract（14 個來源）、Goodreads、Achriom | 轉換成本最大的一項；TV Time 關閉後的遷移潮證明用戶會為匯入而選 App |
| 3 | **匯出自己的資料** | Refract、Goodreads、Hardcover | 「資料是我的」已成賣點（Refract 評論提到）；Storio 路線圖有但未做 |
| 4 | **自訂清單** | Refract、Letterboxd、Goodreads | Storio 以時間軸與月曆為主，沒有主題式整理 |
| 5 | **AI 個人化推薦** | Refract、Iseenit | Storio 的 AI 只用在搜尋與心得 |
| 6 | **串流平台查詢** | Refract、Letterboxd Pro | 看完才記錄的人少用到，但「看什麼」階段的入口 |
| 7 | **單集追蹤** | Refract | 追劇族的核心；Storio 分季收藏是簡化版 |
| 8 | **社群：追蹤、動態、留言、協作清單** | Refract、Letterboxd、Goodreads | **Storio 刻意不做**，這是策略選擇不是缺漏 |
| 9 | **家庭／伴侶共享** | Iseenit | 獨家，且是 Iseenit 的主打 |
| 10 | **成就與年度目標** | Refract（282 成就）、Goodreads | 遊戲化帶來黏著；Storio 只有稱號 |
| 11 | **拍海報搜尋、AI 辨識貼上清單** | Iseenit | 降低加入門檻；Storio 的 Vision AI 在路線圖，沒做 |
| 12 | **動畫專屬資料** | Refract | AniList／MAL 比對；Storio 僅 TMDB |
| 13 | **多語系與 Android 上架** | Refract（9 語＋Android）、Iseenit（16 語） | Storio 2 語、Android 未上架 |
| 14 | **半星評分／更細的評分刻度** | Letterboxd、Hardcover（半星）、Refract（10 分制） | Storio 整星；Reddit r/goodreads 最高讚 160 就是要半星 |
| 15 | **未讀完（DNF／Dropped）狀態** | Refract、Goodreads | Storio 沒有狀態欄位 |

### C. 我們有、他們沒有（以我查到的官方資料為準）

| 功能 | 比較對象的狀況 | 強度 |
|---|---|---|
| **分享圖擬真模板**：Shelf 3D 書櫃、Desk 書桌、Ticket 票根、Retro TV | Iseenit 只有單一 Story 卡；Refract、Letterboxd 沒看到同類 | **強**：視覺差異最明顯 |
| **年度 Recap 的形式與深度**：限時動態式瀏覽、約 15 場景、規則式稱號、年代分佈、月份節奏 | 他們都有回顧，但官方資料只描述摘要統計；**深度未實測比較** | 中（需實測） |
| **AI 心得建議與潤飾**（口語短句，100 字） | 四家都沒看到 | 中 |
| **重複觀看＝獨立多張卡片，可各自分享** | Refract 有重看日記；分享形式未見 | 弱 |
| **Calendar 檢視與月回顧** | 沒看到 | 弱 |
| **書已上線且免費無上限、三種媒體共用回顧** | Refract 書未上線；Iseenit 有 100 筆上限；Letterboxd、Goodreads 單一媒體 | 中：但只是時間窗口 |
| **行為學習通知**（最佳時段、智慧忽略、churn-rescue） | 他們的通知機制只在 Letterboxd Pro 的 watchlist 通知看到 | 弱到中 |
| **影集與電影分頁分開、可各自檢視** | Letterboxd 沒有影集；社群對「Letterboxd 加影集」意見分歧（見 D 區補充 3），但「要能分開、可過濾」是共識 | 中 |

### D. 社群想要、且我們與這四家都沒有

> 證據：用 agent-reach（OpenCLI）實際讀了 12 篇 Reddit 討論串、約 660 則留言，括號內為該留言的讚數。讚數代表「這則留言被多少人認同」，不是需求人數，但可以看相對強度。

| 需求 | 證據（討論串＋讚數） | Storio | 四家現況 |
|---|---|---|---|
| **收藏最愛演員、導演**（個人檔案顯示） | r/Letterboxd「Any features you wish letterboxd had?」（446 分串）最高讚 **232**：「I want the ability to favorite directors and actors」；另一串整篇就是在要「favourite actors section」 | ✗（有人物探索，沒有「最愛」） | Letterboxd ✗（用戶在要）；其他 ? |
| **導演、演員的「即將上映作品」** | r/Letterboxd Dream features 串最高讚 **72**：「A clear way to see upcoming movies from each actor and director」 | ✗ | Letterboxd 頁面太基本（用戶抱怨） |
| **你附近的影廳放映通知**（watchlist 的片正在上映） | r/Letterboxd 119 | ✗ | ✗ |
| **選擇不同版本（導演版、加長版）** | r/Letterboxd 62 | ✗ | ✗ |
| **記錄前先補登「我可能看過的」**（智慧建議，一鍵勾選） | r/movies「BEST platform…」43：想要「an intelligent app that will suggest movies and tv that I might have watched」 | ✗（Storio 有首次收藏引導，但不是這種補登） | Iseenit ◐（v1.3.7 起，開場一鍵勾選熱門作品） |
| **依「同時含有哪幾部」搜尋清單、清單內搜尋** | r/Letterboxd 42、194 | 無清單功能 | Letterboxd ✗（用戶在要） |
| **每個國家／地區的閱讀統計** | r/goodreads 25：「track how many books you've read per country」 | ✗ | Refract 有觀影世界地圖（評論提到），書籍無 |

> 這一類**都是細節型功能，單點需求量不大**（最高 232 讚，集中在 Letterboxd 重度用戶）。沒有一項像「待看清單」或「匯入」那樣在多個討論串反覆出現。

### 補充 1：社群想要、且**別人已經有**（對 Storio 是 B 類缺口的佐證）

| 需求 | 證據 | 誰有 | Storio |
|---|---|---|---|
| **想看／待看清單、可分類**（Up next／Haven't started／Watch later） | r/movies 兩串各 114、113 分，主題就是「I wanna form a watchlist and it should be permanent」；megathread 9 | Refract、Iseenit、Letterboxd、Goodreads | ✗ |
| **匯入準確**（TV Time 遷移） | r/television 2,464 分串：「Trakt has been the first app to properly work bug free」；r/TVTime：Binger 匯入「missing a lot of watched episodes」 | Refract（主打）、Trakt | ✗ |
| **資料可匯出、免費、隱私** | megathread 最高讚 131 的推薦文把「your data is yours! Export it anytime. No ads, free forever」放第一條 | Refract、Goodreads、Hardcover | ✗ |
| **星標、排序、自訂分類長清單** | r/TVTime 發問串；答案是 Refract：「you can make lists and sort them however you want… filter on refract stars」 | Refract（用戶證實） | ✗ |
| **知道停在第幾季第幾集、進度條** | r/TVTime 16：「color-coded progress percentage bars」；OP 想念「seeing exactly where I am」 | Refract | ✗（分季收藏是簡化版） |
| **每集討論、梗圖、角色票選** | TV Time 串最高讚 194、58、24；megathread 11 | Refract 集頁有留言與最愛角色 | ✗（刻意不做社群） |
| **半星評分** | r/goodreads 最高讚 **160**、r/goodreads 另串 16 | Letterboxd（半星）、Hardcover（半星）、Refract（10 分制） | ✗（整星，`RateAndReflectForm.tsx` 找不到半星） |
| **未讀完（DNF）選項** | r/goodreads 29、15 | Refract（Dropped）、Goodreads（DNF 書架，Help 文件） | ✗ |
| **更好的推薦** | r/goodreads 75、43；r/BookDiscussions | Refract、Iseenit | ✗ |
| **更好的搜尋、容錯** | Goodreads 搜尋被罵（14、7）；Letterboxd 拼字錯誤搜不到（13） | — | ✓（Auto 模式 AI fallback，**未實測比較**） |
| **資料來源涵蓋度** | megathread 35：「anything using TMDB over TheTVDB will be missing large amounts of TV programming」 | Refract 用 TMDB＋AniList＋MAL | Storio 純 TMDB（同樣受影響，推論） |

### 補充 2：社群想要、而 **Storio 已經有** 的（可以放進行銷訊息）

| 需求 | 證據 | Storio |
|---|---|---|
| **私人書、私人書架（不讓別人看到）** | r/goodreads 最高讚第二名 **93**、另一則 46 | ✓ 全部收藏預設私人，沒有公開發佈 |
| **書的月曆：每天讀了哪些書** | r/goodreads **62**：「a book calendar」 | ✓ Calendar 檢視 |
| **私人筆記、不想公開的心得** | r/Letterboxd 59：「private reviews or a 'notes' like system」 | ✓ 心得只有自己看得到 |
| **影集與電影分開，可以過濾** | r/Letterboxd 676、574、223、142、126 的主流意見是「想要純電影」或「至少要能過濾」；r/movies 33 抱怨演唱會、脫口秀混進「films」統計 | ✓ 分頁依 Movies／Series／Books 分開 |
| **記錄跨媒體的人** | r/Letterboxd 52：「track tv shows and films on the same app… Letterboxd UI and features for TV」 | ✓ 但**沒有 Letterboxd 等級的社群與清單** |

### 補充 3：反向訊號（會影響 Storio 怎麼說話）

- **Letterboxd 加影集並不是共識。** r/Letterboxd 961 分串：676 認為「他們說好幾年了」，574 希望 Letterboxd「只做電影」，142 與 126 說可以做，但要能過濾。**我前一版寫「社群想要 Letterboxd 加影集」是片面的，已更正。** 這對 Storio 是好消息：Storio 影集與電影分頁，符合「可分開」的期待。
- **有人明說不想要 AI。** megathread（448 分）25 讚：「Is there one that doesn't look like it's made in 5 minutes with AI and doesn't use AI?」，Storio 的 AI 為選用，行銷上不宜把 AI 當主打。
- **有人根本不想用任何 App。** r/movies 兩串都有高讚的「Google Docs／Excel／紙筆」留言（35、30、26）；追蹤類 App 的競爭對手之一是試算表。

---

## 四、深度剖析：Storio 的位置

1. **「三合一」已不是護城河，但「三合一＋視覺典藏」還沒有人做到。** Iseenit 是功能最接近的，但分享形式單一；Refract 規模大但缺書。Storio 的真差異在**分享圖擬真模板＋Recap 深度＋典藏室風格**，這些都偏體驗而非功能數量。

2. **最大的功能缺口是「想看清單」，而且它比匯入更基本。** 四家競品全部有狀態或待看清單；Storio 只能記錄「已完成」。這影響首次使用與回訪（用戶沒有理由在「還沒看」的時候打開 App）。`BACKLOG.md` 的「新用戶不收藏」數據（註冊約 2,588 其中收藏僅約 20，分母已知灌水）與這個缺口是否相關，**需要產品決策與數據驗證，我不下結論**。

3. **匯入與匯出是可預期的下一波壓力。** TV Time 已關閉，主要的匯出窗口（7/15）已過；但 Letterboxd、Goodreads、Trakt 的匯入仍是 Refract、Achriom 的賣點。Storio 目前兩個方向（匯入、匯出）都沒有。

4. **社群是刻意選擇，不必補。**（Reddit 上也有大量用戶明說不想要社交、想要私人與可過濾，與 Storio 的定位同向。） Letterboxd、Goodreads、Refract 都在社群上遠勝 Storio，且 Storio 已確認不做。比較時可以把「私人典藏」當定位，而不是缺口。

5. **AI 是雙面刃。** Refract、Iseenit 把 AI 推薦當賣點；但 TV Time 遷移串出現明顯的反 AI 情緒。Storio 的 AI 用在搜尋與心得潤飾（選用），建議**對外訊息以典藏體驗為主，AI 為輔**。（推論）

6. **時間窗口：** Refract 書籍上線後，Storio「書已上線」的優勢消失；12 月是年度回顧話題高峰，Storio、Iseenit、Refract、Goodreads 同時出現。

## 五、如果只能挑三件事（推論，供 `/office-hours` 或 brainstorming 討論）

| 優先 | 項目 | 理由 |
|---|---|---|
| 1 | **想看清單（Want to Watch／Read）** | 四家都有、社群有明確需求、影響首次使用動機；需先確認與「只記錄已完成」的產品哲學是否衝突 |
| 2 | **匯入（先做 Letterboxd CSV、Goodreads CSV）** | 最直接的獲客路徑；格式公開、範圍可控 |
| 3 | **匯出（CSV／JSON）** | PRD 路線圖已有；成本低，對信任感有價值 |

**不建議急著跟的**：社群、成就系統、串流查詢、AI 推薦（投入大、與 Storio 核心差異小，或與「私人典藏」定位衝突）。

---

## Raw Data Sources

- 競品：`competitor-profiles/{refract,iseenit,letterboxd,goodreads}.md` 與對應 `raw/*/2026-11-12/scrapes/notes.md`
- Storio：`docs/PRD.md`（2026-07-14）、`docs/BACKLOG.md`（2026-10-28）、`client/CHANGELOG.md`（v1.22.0）、`client/src/` 目錄結構、`git grep`（watchlist、匯入匯出、清單、社群關鍵字）
- 社群：agent-reach（OpenCLI 後端）讀取 12 篇 Reddit 討論串全文與留言（2026-11-12）：r/goodreads（xvupl2、1cm9kr6、1j9kun7）、r/Letterboxd（1g8dg58、1668l8e、1ulpefx）、r/television（1ukx3c8）、r/TVTime（1wev75o、1x9ixfj、1up28og）、r/movies（xpfrji、107zyin）
- Reddit 原始資料：`.claude` scratchpad（`reddit/*.yaml`），未放入 repo
