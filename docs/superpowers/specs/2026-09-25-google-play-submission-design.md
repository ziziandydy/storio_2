# Google Play 上架送審 — 設計文件

**日期**：2026-09-25
**背景**：承接 `docs/superpowers/specs/2026-09-13-android-launch-design.md` 明確保留的「第三塊：Google Play 上架送審」。第二塊（Android 技術落地）已完成並經模擬器驗證，第三塊在此文件規劃。

---

## 前置狀態確認（已核實，非假設）

| 項目 | 狀態 |
|------|------|
| Google Play Developer 帳號 | ✅ 已通過審查，可建立 App（個人帳號，非組織帳號） |
| Target API Level | ✅ 已升級至 API 36（Android 16），2026-09-25 完成並驗證（commit `9eeba79`） |
| Play App Signing / upload keystore | ✅ 已備妥（`client/android/app/upload-keystore.jks`，Task 9 完成） |
| Release Bundle 建置流程 | ✅ `./gradlew bundleRelease` 已驗證可正常簽署產出 `.aab` |
| 隱私政策頁面 | ✅ 已有現成頁面 `https://storio.andismtu.com/privacy`（iOS 上架時建立），可直接沿用 |
| 實體 Android 測試機 | ⏳ 尚未取得（不阻塞本階段——見下方「與 Task 11 的關係」） |

---

## 範圍

**v1 目標**：讓 Storio 通過 Google Play 審核，正式在 Production 軌道上架。

**排除**：
- 後續版本更新流程（上架後的例行發版，比照 iOS 現有模式即可，非本文件範圍）
- Android CI/CD 自動化
- 組織帳號轉換（已評估，因需要 D-U-N-S 號碼且審核長達 30+5 天，帳戶又無登記商業實體，故排除；見下方決策記錄）

---

## 關鍵決策記錄（brainstorming 階段已確認）

1. **測試軌道人數門檻**：即時查證 Google 官方文件確認現行規則是 **12 位測試者、連續選加 14 天**（2024-12 從原本的 20 位下修），非訓練資料記憶中可能過時的數字。個人帳號（非組織帳號）建立於 2023-11-13 之後皆適用此規則。
2. **不走組織帳號路徑**：組織帳號雖可完全豁免測試門檻，但需要 D-U-N-S 號碼（最長 30 天入審）+ 金流驗證（再 5 天），且需要登記商業實體。使用者目前無登記商業實體，12 人／14 天的封閉測試路徑遠快於此。
3. **測試者招募方式**：使用者明確表示不採用公開社群徵集（PTT／Reddit／Discord 等），改用 Google Play「不公開連結」私下邀請熟識的朋友／家人，湊滿 12 人即可。
4. **Data Safety 表單發現的既有漏洞**：翻查 `server/app/services/ai_recommendation_service.py`、`gemini_service.py` 確認 App 的「AI 潤飾」與「AI 建議」功能會把使用者的心得文字（reflection）送到 Gemini／OpenAI 第三方服務處理。iOS 上架時的 App Privacy 聲明只寫了「Email/Name 用於 Authentication」，**沒有揭露這條資料流**。本次 Google Play 的 Data Safety 表單會補上，之後應回頭補正 iOS 的宣告（不在本文件範圍，留待另外處理）。
5. **與 Task 11（實機驗收）的關係**：原 Android 落地 spec 把實機驗收定位為「送審前最後關卡而非啟動門檻」。封閉測試軌道的 12 位測試者會在**自己的真實 Android 手機**上安裝使用，天然涵蓋多款真實裝置的驗證——可以在使用者尚未取得自己的實體機時就啟動 14 天倒數，兩件事並行，不互相阻塞。

---

## Phase 拆解

### Phase 1：素材準備（Store Listing Assets）

沿用 iOS 上架時已產出的內容，只補 Android 特有規格：

| 素材 | 規格 | 來源 |
|------|------|------|
| App 圖示 | 512×512 PNG，32-bit | 從既有 adaptive icon 的 foreground/background 圖層匯出一張扁平版（`client/android/app/src/main/res/mipmap-xxxhdpi/`已有素材可轉製） |
| **Feature graphic**（新素材） | 1024×500 PNG/JPEG | Android 特有規格，iOS 沒有對應物，需另外設計——建議沿用 App 的視覺語言（Folio Black `#0d0d0d` 背景 + Storio Gold `#c5a059` 標誌與 tagline "Collect stories in your folio"） |
| 手機截圖 | 最少 2 張、最多 8 張，16:9 或 9:16 | 用模擬器產生（本次 session 已建立 adb screenshot + ImageMagick 裁切的工作流程，直接沿用）：首頁／Trending、My Storio 收藏頁、詳情頁、分享圖片產出畫面、Profile 頁——對應 iOS Checklist 當年的 5 張分類 |
| 簡短說明（Short description） | 80 字元以內 | **新欄位**（iOS 沒有），需另外撰寫，例如："沉浸式典藏你的電影、影集與書籍記憶，生成專屬分享圖。" |
| 完整說明（Full description） | 4000 字元以內 | 沿用 iOS App Store 描述文案微調 |
| 關鍵字 | Play 無獨立關鍵字欄位（靠 title/description 影響 ASO） | 沿用 iOS 的關鍵字清單融入描述文案：電影、書籍、日記、典藏、記錄 |

### Phase 2：Play Console 基本資料 + Store Listing 填寫

- App 名稱：`Storio`
- 簡短/完整說明：Phase 1 產出
- App 類別：建議 **Entertainment**（次要可選 Lifestyle）——與 iOS 定位一致
- 聯絡資訊：Email（沿用現有支援信箱）、網站 `https://storio.andismtu.com`
- 隱私政策 URL：`https://storio.andismtu.com/privacy`（沿用現成頁面，內容涵蓋 Google 登入即可，不需為 Android 另開新頁）

### Phase 3：內容分級問卷（IARC）+ Data Safety 表單 + 定價地區

**內容分級問卷**（Google 用 IARC 問卷，非 Apple 的年齡分級 UI，但答案依據同樣的實際內容）：
- 暴力／性內容／賭博元素：皆無 → 預期落在 **PEGI 3 / Everyone** 對應分級
- 使用者生成內容是否公開分享：否（心得為私人記錄，分享圖片是「產生圖片檔案給使用者自己分享」，不是 App 內公開社交動態）
- 是否有互動元素（聊天、位置分享等）：否

**Data Safety 表單**（本階段的重點與風險最高處）：

| 資料類型 | 是否收集 | 用途 | 是否分享給第三方 |
|---------|---------|------|-----------------|
| Email address | 是 | 帳號建立、驗證（Google 登入） | 否 |
| Name | 是（來自 Google 帳號） | 帳號建立 | 否 |
| User-generated content（心得、評分、收藏記錄） | 是 | App 功能（個人典藏） | **是**——心得文字會送至 Gemini／OpenAI 做 AI 潤飾／建議功能，用途標註為「App 功能」，非廣告或第三方行銷用途 |
| 裝置/使用分析 | 否 | — | — 目前無 Firebase/Analytics/Crashlytics SDK，據實回答「不收集」 |

- 資料是否加密傳輸：是（HTTPS，Railway + Supabase 全程 TLS）
- 使用者是否可要求刪除資料：是——App 內建帳號刪除功能（`server/app/api/v1/endpoints/user.py` 的 `delete_user_account`／`clear_user_data`），可直接勾選「支援應用程式內刪除」

**定價與地區**：
- 定價：Free
- 上架地區：建議**全球**（與 iOS 一致的預設選擇，無特別需要限制地區的理由）
- 含廣告：否
- 應用程式內購買：否

### Phase 4：封閉測試軌道（Closed Testing）——12 人／14 天

1. Play Console → Testing → Closed testing → 建立新軌道（例如命名 `alpha`）
2. 上傳最新的 `app-release.aab`（`./gradlew bundleRelease` 產出，簽署流程已於本文件「前置狀態確認」驗證過；若 Phase 1-3 期間程式碼有更新，以正式送測前重新建置的版本為準）
3. 測試者名單設定：選擇「不公開連結」（非 Google Group／非公開清單），產生 opt-in URL
4. 私下傳送連結給 12 位朋友／家人，請他們點連結加入 → 從 Play Store 安裝 → 開啟一次 App（滿足「opted in」判定，之後即使不天天使用也不影響天數累計，只要**不解除安裝／退出測試**）
5. 從第一位測試者選加日開始算，需**連續 14 天**不中斷——若中途有測試者退出導致總數低於 12 人，時間可能需要重新累計（依 Google 現行規則，退出者不計入天數達成）
6. 這 14 天期間可視為 Task 11 真機驗收的延伸：留意測試者是否回報任何 crash、登入失敗、分享失敗等問題，比對本次 Android 落地時模擬器抓出的已知坑（狀態列遮擋、Google 登入 Client ID、CORS、Splash Screen API 31+）是否在其他機型/版本重現

### Phase 5：申請 Production Access

1. 14 天且 12 人條件滿足後，Play Console Dashboard 會出現「Apply for production」選項
2. 填寫三段式表單：封閉測試細節（測試者是否用到所有主要功能、使用行為是否符合預期正式使用者行為）、App 資訊、正式上架準備度
3. 送出後等待 Google 審核（官方文件說明通常 7 天內回覆）
4. 若被要求補測試或補件，回到 Phase 4 對應項目補強

### Phase 6：正式上架

1. Production access 核准後，Play Console 開放 Production 軌道與 Open testing 功能
2. 將已驗證的 `.aab` 推上 Production 軌道，選擇「立即全量發布」或「分階段推出」（建議分階段：先 20% 觀察無異常再拉到 100%，比照大型 App 常見保守做法）
3. 上架後：用既有的 `/gstack browse` 模式做上線驗證（比照 iOS 上架後的驗收習慣）

---

## 風險與未知

1. **封閉測試 14 天期間若有測試者中途退出**，可能重置天數累計，需要多預留緩衝時間，不建議壓線規劃時程
2. **Data Safety 表單填錯的後果**：Google 近年對這塊審查趨嚴，AI 第三方處理若漏報可能導致審核卡關或事後被下架警告——這是本次特別挑出來修正的既有漏洞，需確實填寫
3. **Feature graphic 是全新素材**，沒有 iOS 對應物可以直接沿用，設計时間需另外估算
4. **實體測試機仍未取得**：雖然封閉測試的其他測試者可部分補足真機驗證的價值，但使用者自己的真機驗收（原 Task 11）仍建議在送審前至少過一輪，尤其是 Google 登入、分享圖片這類先前在模擬器上就已經抓到過真實 bug 的功能

---

## Out of Scope（不在本次範圍）

- iOS App Privacy 聲明的回頭補正（AI 資料流揭露）——留待另開任務處理
- Android 上架後的例行發版流程文件化——留到真正上架後再視需要補充，比照 `CLAUDE.md` 的 iOS 發佈階段章節模式
- Feature graphic／截圖的實際美術製作——本文件只定義規格與內容方向，實際產出在 writing-plans 階段拆解為具體步驟
