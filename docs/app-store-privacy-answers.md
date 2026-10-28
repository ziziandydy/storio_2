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

「Other User Content」涵蓋：心得文字、評分、收藏清單。這些存在 Supabase，且心得會送到 Gemini／OpenAI。

## 不收集（據實回答）
Location、Financial Info、Health & Fitness、Browsing History、Contacts、Diagnostics、Usage Data（App 內無 Analytics／Crashlytics SDK）。

## 需要你確認的兩項
- **Search History**：搜尋關鍵字會經後端轉給 TMDB／Google Books，若後端沒有留存可不勾；若你要保守，可勾為 App Functionality。
- **Photos or Videos**：頭像若有上傳到 Storio 的儲存空間才需勾；Play 的版本寫「不收集」，iOS 要一致。

## 追蹤（Tracking）
全部回答「不用於追蹤」，不需要 App Tracking Transparency 提示。

## 隱私權政策網址與內容（需 Tu 決定）
網址：`https://storio.andismtu.com/privacy`（原始碼 `client/src/app/privacy/page.tsx`）。目前內容與實際行為對不上：

- 第 3 節寫「可能整合第三方追蹤腳本或 cookies」與「用匿名資料訓練 AI 模型」，但 App 實際沒有任何 Analytics／追蹤 SDK，也沒有拿使用者資料訓練模型；隱私標籤要填「不用於追蹤」，兩邊互相矛盾。
- 完全沒提「心得文字會交由 Google Gemini、OpenAI 處理」，這正是隱私標籤要補的那條資料流。

建議把政策改成與標籤一致：寫明 AI 潤飾／建議會把心得文字與作品資訊傳給 Gemini／OpenAI 處理、不用於廣告或追蹤；刪掉未實際發生的追蹤與模型訓練字句。政策是對外的法律文字，**由 Tu 確認措辭後再改**，改了網頁會立刻生效（不需要 App 發版）。

## 完成後
- 後台按「發佈」，隱私標籤變更不需重新 build 或送審新版本，但審核員在下一個版本會依此核對。
- 填完請把 BACKLOG「下次 iOS 發版內容」的 ③ 標為完成。
