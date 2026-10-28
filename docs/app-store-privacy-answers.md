# iOS App Privacy（隱私權營養標籤）填寫對照表

App Store Connect → 你的 App → App 隱私（App Privacy）→ 編輯「資料類型」。
對照來源：[`play-store-assets/data-safety-answers.md`](play-store-assets/data-safety-answers.md)（Google Play 已填，兩邊必須一致）。

> 為什麼要補：「心得建議／AI 潤飾」會把使用者心得與作品資訊經後端送到 Gemini／OpenAI 處理；iOS 目前只聲明 Email／Name，與實際行為不符，可能在審核時被要求更正。
> 這份是依程式行為整理的答案，**填之前請對照後台目前已勾選的內容**，只補缺的、不要取消已正確的。

## 要勾選的資料類型

| Apple 類別 → 資料類型 | 收集 | 與使用者身分連結 | 用於追蹤 | 用途 |
|---|---|---|---|---|
| Contact Info → Email Address | 是 | 是 | 否 | App Functionality（帳號與登入） |
| Contact Info → Name | 是（Apple／Google 登入帶入） | 是 | 否 | App Functionality |
| **User Content → Other User Content** | **是（本次要補）** | 是 | 否 | App Functionality |
| Identifiers → User ID | 是（Supabase 帳號 ID，含匿名帳號） | 是 | 否 | App Functionality |

「Other User Content」涵蓋：心得文字、評分、收藏清單。這些存在 Supabase，其中心得文字在使用「AI 潤飾」時會送到 Gemini／OpenAI。

## 不收集（據實回答）
Location、Financial Info、Health & Fitness、Browsing History、Contacts、Diagnostics、Usage Data（App 內無 Analytics／Crashlytics SDK）。

## 需要你確認的兩項
- **Search History**：AI 語意搜尋會把使用者輸入的搜尋描述送到 Gemini，一般搜尋則轉給 TMDB／Google Books；Storio 後端不留存，但 Gemini 端的保留由其政策決定。建議保守勾選為 App Functionality、不與身分連結、不用於追蹤。
- **Photos or Videos**：頭像若有上傳到 Storio 的儲存空間才需勾；Play 的版本寫「不收集」，iOS 要一致。

## 追蹤（Tracking）
全部回答「不用於追蹤」，不需要 App Tracking Transparency 提示。

## 隱私權政策（已更新）
網址：`https://storio.andismtu.com/privacy`（原始碼 `client/src/app/privacy/page.tsx`）。

- 2026-10-28 新增第 3 節「AI-Assisted Features and Third-Party Processing」，寫明送給 Google Gemini／OpenAI 的內容：心得潤飾送心得文字、心得建議送作品標題／簡介／類型／評分、AI 搜尋送搜尋描述；不送 Email、姓名、帳號 ID。
- 依 Tu 的決定，**保留**原第 3 節（現為第 4 節）的追蹤、個人化廣告與模型訓練字句。注意：這幾句是「保留權利」的寫法，目前 App 並未實際追蹤、投放廣告或訓練模型，隱私標籤依「現況」填「不用於追蹤」；若日後真的加入分析 SDK 或廣告，標籤與 ATT 提示都要同步更新。審核員若質疑政策與標籤，可回覆「政策為保留條款，現行版本未實作」。

## 完成後
- 後台按「發佈」，隱私標籤變更不需重新 build 或送審新版本，但審核員在下一個版本會依此核對。
- 填完請把 BACKLOG「下次 iOS 發版內容」的 ③ 標為完成。
