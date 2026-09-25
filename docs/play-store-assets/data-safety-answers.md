# Data Safety 表單填寫對照表

Play Console → App content → Data safety。依下列順序逐欄勾選。

## Step 1：資料收集與安全性總覽
- 「Does your app collect or share any of the required user data types?」→ **是**
- 「Is all of the user data collected by your app encrypted in transit?」→ **是**（Railway 後端 + Supabase 全程 HTTPS/TLS）
- 「Do you provide a way for users to request that their data is deleted?」→ **是**（App 內建帳號刪除功能，位於 Profile 頁）

## Step 2：資料類型逐項勾選

### Personal info（個人資訊）
- **Email address**
  - 是否收集：是
  - 是否為必要（非選填）：是
  - 用途：Account management（帳號建立與驗證，Google 登入）
  - 是否分享給第三方：否
- **Name**
  - 是否收集：是（來自 Google 帳號）
  - 用途：Account management
  - 是否分享給第三方：否

### App activity / User-generated content（使用者生成內容——心得、評分、收藏記錄）
- 是否收集：是
- 用途：App functionality（App 核心功能：個人典藏記錄）
- **是否分享給第三方：是**
  - 分享對象：Google（Gemini API）與 OpenAI（AI 潤飾／建議功能會將使用者輸入的心得文字送出處理）
  - 分享用途：App functionality（非廣告、非行銷）
  - ⚠️ 這一項容易被漏填——AI 潤飾/建議功能（`RateAndReflectForm.tsx` 的「AI 潤飾」按鈕）會呼叫後端 `/api/v1/ai/refine`、`/api/v1/ai/suggestions`，後端再轉呼叫 Gemini/OpenAI，使用者的心得文字內容會離開 Storio 自己的伺服器

### 不收集的類型（據實回答「不收集」，不要照抄其他 App 的範本勾選）
- Location（位置資訊）：不收集
- Financial info（財務資訊）：不收集
- Health and fitness：不收集
- Photos and videos：不收集（頭像上傳走 Capacitor 原生相簿/相機 picker，檔案不落地儲存於 Storio 伺服器之外的用途）
- Device or other IDs：不收集（App 內無 Firebase/Analytics/Crashlytics SDK）

## Step 3：安全性作法（Security practices）
- 資料是否加密傳輸：是
- 是否可要求刪除資料：是，說明文字建議填：「使用者可於 App 內 Profile 頁面直接刪除帳號與所有關聯資料，後端會立即清除。」
