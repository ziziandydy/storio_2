# Google Play 上架送審 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Storio Android 版通過 Google Play 審核並在 Production 軌道正式上架。

**Architecture:** 分兩類任務——(A) 執行者可直接產出的素材與文案（App 圖示、Feature graphic、截圖、Store Listing 文案、Data Safety 填表對照表），(B) 只有帳號持有人本人能操作的 Play Console 步驟（建立 App、上傳 AAB、建立封閉測試軌道、邀請測試者、申請 Production access、正式上架）。A 類任務產出 B 類任務所需的素材/內容，執行順序上 A 必須先於對應的 B。

**Tech Stack:** ImageMagick（素材合成）、Android SDK `adb`/模擬器（截圖）、Google Play Console（人工操作，無 API 存取）。

**Spec:** `docs/superpowers/specs/2026-09-25-google-play-submission-design.md`

## Global Constraints

- 隱私政策 URL 固定使用既有頁面：`https://storio.andismtu.com/privacy`（不新建頁面）
- 封閉測試門檻：12 位測試者，連續選加 14 天（2024-12 官方下修後的現行數字，非 20 人）
- 測試者招募方式：私下邀請熟識的人，透過「不公開連結」，不做公開社群徵集
- App 類別：Entertainment；上架地區：全球；定價：Free；無廣告；無內購
- 所有素材輸出至 `docs/play-store-assets/`（新目錄，納入版控）
- Data Safety 表單必須揭露 AI 潤飾/建議功能會將使用者心得文字送至 Gemini／OpenAI 第三方處理——這是本計畫特別要修正的既有漏洞，不可省略

---

### Task 1：App 圖示 512×512 匯出

**Files:**
- Create: `docs/play-store-assets/icon-512.png`
- Source: `client/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`（1024×1024，iOS 上架時的原始高解析素材）

**Interfaces:**
- Consumes: 無（第一個任務）
- Produces: `docs/play-store-assets/icon-512.png`（512×512 PNG，32-bit，無 alpha 透明——Play Console 要求 App 圖示不可有透明背景），供 Task 6（Play Console Store Listing 上傳）使用

- [ ] **Step 1: 從 1024px 原始素材縮放產出 512×512**

```bash
mkdir -p /Users/iTubai/Sites/storio_2/docs/play-store-assets
magick /Users/iTubai/Sites/storio_2/client/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png \
  -resize 512x512 \
  -background "#0d0d0d" -alpha remove -alpha off \
  /Users/iTubai/Sites/storio_2/docs/play-store-assets/icon-512.png
```

- [ ] **Step 2: 驗證尺寸與無透明通道**

Run: `magick identify /Users/iTubai/Sites/storio_2/docs/play-store-assets/icon-512.png`
Expected: 輸出包含 `512x512`，且不含 `PNG-32` 帶 alpha 的警示（應為不透明的扁平圖）

- [ ] **Step 3: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add docs/play-store-assets/icon-512.png
git commit -m "docs(play-store): 產出 512x512 App 圖示素材

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SdB5bZqh7VuWQuUtRUuCv5"
```

---

### Task 2：Feature Graphic 1024×500 產出

**Files:**
- Create: `docs/play-store-assets/feature-graphic.png`

**Interfaces:**
- Consumes: `client/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`（同 Task 1 的圖示來源，作為構圖中的標誌元素）
- Produces: `docs/play-store-assets/feature-graphic.png`（1024×500 PNG），供 Task 6 使用

Google Play 規定 Feature graphic 不可包含裝置外框、不可有太多留白邊界的文字被裁切風險，畫面四周 5% 留安全邊界。

- [ ] **Step 1: 合成背景 + 置中標誌 + Tagline**

```bash
magick -size 1024x500 xc:"#0d0d0d" \
  \( /Users/iTubai/Sites/storio_2/client/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png -resize 320x320 \) \
  -gravity center -geometry -320+0 -composite \
  -gravity center -pointsize 54 -font "Georgia-Bold" -fill "#c5a059" \
  -annotate +200+40 "STORIO" \
  -gravity center -pointsize 22 -fill "#e8e0d0" -font "Georgia" \
  -annotate +200+100 "Collect stories in your folio" \
  /Users/iTubai/Sites/storio_2/docs/play-store-assets/feature-graphic.png
```

若系統無 `Georgia` 字型導致 annotate 失敗，改用可用字型重試：

```bash
magick -list font | grep -i "georgia\|serif" | head -5
```

- [ ] **Step 2: 驗證尺寸**

Run: `magick identify /Users/iTubai/Sites/storio_2/docs/play-store-assets/feature-graphic.png`
Expected: 輸出包含 `1024x500`

- [ ] **Step 3: 人工目視確認構圖**（無法自動化的品質檢查）

Run: 用 Read 工具開啟 `docs/play-store-assets/feature-graphic.png`，確認文字未被裁切、標誌置中、配色符合 Folio Black `#0d0d0d` + Storio Gold `#c5a059`

- [ ] **Step 4: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add docs/play-store-assets/feature-graphic.png
git commit -m "docs(play-store): 產出 1024x500 feature graphic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SdB5bZqh7VuWQuUtRUuCv5"
```

---

### Task 3：手機截圖產出（5 張）

**Files:**
- Create: `docs/play-store-assets/screenshots/01-home-trending.png`
- Create: `docs/play-store-assets/screenshots/02-my-storio.png`
- Create: `docs/play-store-assets/screenshots/03-item-detail.png`
- Create: `docs/play-store-assets/screenshots/04-share-image.png`
- Create: `docs/play-store-assets/screenshots/05-profile.png`

**Interfaces:**
- Consumes: 模擬器 `emulator-5554` 需已啟動並安裝最新的 API 36 debug build（`client/android/app/build/outputs/apk/debug/app-debug.apk`，Task「target/compileSdk 升級」已完成並驗證，見 commit `9eeba79`）
- Produces: 5 張 1080×2400（或模擬器實際解析度）PNG，供 Task 6 使用。Play Console 要求至少 2 張、最多 8 張，16:9 或 9:16 皆可，本專案模擬器解析度為 9:16，符合規定

- [ ] **Step 1: 確認模擬器狀態與已登入帳號**

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
adb devices
adb shell am start -n com.storio.app/.MainActivity
```

Expected: `emulator-5554	device`，App 啟動後顯示已登入的首頁（非 Welcome 畫面）

- [ ] **Step 2: 截取首頁／Trending Movies 畫面**

```bash
mkdir -p /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots
adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots/01-home-trending.png
```

Expected: 拉回的 PNG 顯示首頁 Storio Wordmark + Trending Movies 卡片列表

- [ ] **Step 3: 導覽至 My Storio 頁面並截圖**

用 Read 工具確認 Step 2 截圖裡「VIEW MY STORIO」按鈕的實際像素座標後再點擊（不同次 build 的排版可能有細微差異，勿憑記憶估座標）：

```bash
adb shell input tap <x> <y>
sleep 2
adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots/02-my-storio.png
```

Expected: 顯示 Bento Grid 排列的收藏卡片

- [ ] **Step 4: 點入任一收藏項目的詳情頁並截圖**

同樣先用 Read 工具確認 Step 3 截圖裡卡片的實際座標再點擊：

```bash
adb shell input tap <x> <y>
sleep 2
adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots/03-item-detail.png
```

Expected: 顯示詳情頁 Backdrop + Category/Archived on 資訊 + 清楚可見的 SHARE 按鈕

- [ ] **Step 5: 點擊 SHARE 產生分享圖片畫面並截圖**

先用 Read 工具確認 Step 4 截圖裡 SHARE 按鈕座標：

```bash
adb shell input tap <x> <y>
sleep 3
adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots/04-share-image.png
```

Expected: 顯示 ShareModal 已產生預覽圖（非 loading 中的「請稍候」狀態——若截到 loading 畫面，等 2 秒後重新截圖）

- [ ] **Step 6: 導覽至 Profile 頁並截圖**

```bash
adb shell input tap <x> <y>
sleep 2
adb shell screencap -p /sdcard/shot.png && adb pull /sdcard/shot.png /Users/iTubai/Sites/storio_2/docs/play-store-assets/screenshots/05-profile.png
```

Expected: 顯示 Profile 頁使用者資訊與統計數字

- [ ] **Step 7: 逐張用 Read 工具檢視 5 張截圖，確認無 mid-animation 過渡幀、無空白/錯誤畫面**

若任何一張是過場動畫中的畫面（半透明疊層、按鈕位移），重新執行對應 Step 補拍

- [ ] **Step 8: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add docs/play-store-assets/screenshots/
git commit -m "docs(play-store): 產出 5 張 Store Listing 手機截圖

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SdB5bZqh7VuWQuUtRUuCv5"
```

---

### Task 4：Store Listing 文案撰寫

**Files:**
- Create: `docs/play-store-assets/store-listing-copy.md`

**Interfaces:**
- Consumes: 無
- Produces: 一份使用者可直接複製貼上到 Play Console 的文案文件，供 Task 6 使用

- [ ] **Step 1: 撰寫文件內容**

Write to `docs/play-store-assets/store-listing-copy.md`:

```markdown
# Google Play Store Listing 文案

## App 名稱
Storio

## 簡短說明（Short description，80 字元以內）
沉浸式典藏你的電影、影集與書籍回憶，生成專屬分享圖片，記錄你的觀影閱讀足跡。

（字數：38 字元，含標點）

## 完整說明（Full description，4000 字元以內）

Storio 是你的沉浸式個人典藏室——收藏電影、影集與書籍，寫下屬於自己的心得與評分，並生成精美的分享圖片。

【核心功能】
• 典藏你看過的電影、影集與讀過的書籍，附上日期、評分與心得
• AI 輔助潤飾心得文字，讓你的紀錄更完整動人
• 多種風格的分享圖片模板（經典票根、復古電視、海報牆等），一鍵生成專屬於你的觀影/閱讀紀念圖
• 探索本週熱門電影與影集排行榜
• 依演員、導演、片商或類型快速找到更多喜歡的作品
• Google 帳號登入，資料跨裝置同步；也支援訪客模式先體驗再決定

【誰適合用 Storio】
喜歡記錄觀影/閱讀足跡、想把心得整理成好看的紀念圖與朋友分享的你。

完全免費，無廣告。

## App 類別
Entertainment

## 聯絡資訊
- 網站：https://storio.andismtu.com
- 隱私政策 URL：https://storio.andismtu.com/privacy

## 定價與發布
- 定價：Free
- 上架地區：全球
- 含廣告：否
- 應用程式內購買：否
```

- [ ] **Step 2: 驗證簡短說明字數 ≤ 80、完整說明字數 ≤ 4000**

Run:
```bash
python3 -c "
text = open('/Users/iTubai/Sites/storio_2/docs/play-store-assets/store-listing-copy.md', encoding='utf-8').read()
short = text.split('## 簡短說明')[1].split('##')[0]
short_line = [l for l in short.splitlines() if l.strip() and not l.startswith('（')][0]
full = text.split('## 完整說明')[1].split('## App 類別')[0]
print('short len:', len(short_line.strip()))
print('full len:', len(full.strip()))
"
```

Expected: `short len` ≤ 80、`full len` ≤ 4000

- [ ] **Step 3: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add docs/play-store-assets/store-listing-copy.md
git commit -m "docs(play-store): 撰寫 Store Listing 文案

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SdB5bZqh7VuWQuUtRUuCv5"
```

---

### Task 5：Data Safety 表單填寫對照表

**Files:**
- Create: `docs/play-store-assets/data-safety-answers.md`

**Interfaces:**
- Consumes: spec 文件中「Data Safety 表單」章節的資料表格（`docs/superpowers/specs/2026-09-25-google-play-submission-design.md`）
- Produces: 逐欄位可照抄的填表指南，供 Task 7 使用

- [ ] **Step 1: 撰寫文件內容**

Write to `docs/play-store-assets/data-safety-answers.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add docs/play-store-assets/data-safety-answers.md
git commit -m "docs(play-store): 撰寫 Data Safety 表單填寫對照表

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SdB5bZqh7VuWQuUtRUuCv5"
```

---

### Task 6：【使用者操作】建立 Play Console App + 填寫 Store Listing

> 此任務需要 Google Play Developer 帳號登入權限，執行者無法代為操作，只能提供 Task 1-4 的產出物與指引。

**Interfaces:**
- Consumes: `docs/play-store-assets/icon-512.png`（Task 1）、`docs/play-store-assets/feature-graphic.png`（Task 2）、`docs/play-store-assets/screenshots/*.png`（Task 3）、`docs/play-store-assets/store-listing-copy.md`（Task 4）
- Produces: Play Console 上一個已建立、Store Listing 已填妥的 App 記錄（草稿狀態，尚未送審）

- [ ] **Step 1**: 登入 [Play Console](https://play.google.com/console) → Create app → 填入 App 名稱 `Storio`、預設語言（繁體中文）、App 或遊戲：App、免費或付費：Free
- [ ] **Step 2**: 進入 App content 前，先到 Store presence → Main store listing，貼上 `store-listing-copy.md` 的簡短說明與完整說明
- [ ] **Step 3**: 上傳 `icon-512.png` 至 App icon 欄位、`feature-graphic.png` 至 Feature graphic 欄位
- [ ] **Step 4**: 依序上傳 `screenshots/` 目錄下 5 張截圖至 Phone screenshots
- [ ] **Step 5**: 填入 Category（Entertainment）、Contact details（網站/信箱）
- [ ] **Step 6**: 儲存草稿，確認 Play Console 顯示「Main store listing」為完成狀態（綠勾），暫不送出

---

### Task 7：【使用者操作】內容分級問卷 + Data Safety 表單 + 定價地區

> 需要帳號登入權限，執行者只能提供對照表。

**Interfaces:**
- Consumes: `docs/play-store-assets/data-safety-answers.md`（Task 5）、spec 文件中「內容分級問卷」章節
- Produces: Play Console 上已完成的 Content rating、Data safety、Pricing & distribution 三個章節（草稿完成狀態）

- [ ] **Step 1**: Play Console → App content → Content ratings → 填寫 IARC 問卷：暴力/性內容/賭博元素/使用者生成內容公開分享/互動元素等問題皆答「否」，取得分級結果
- [ ] **Step 2**: App content → Data safety → 依 `data-safety-answers.md` 逐欄填寫，**特別確認「App activity / User-generated content」項目的第三方分享有勾選 Gemini/OpenAI 用途**，這是本次計畫特別新增、iOS 版當初漏報的項目
- [ ] **Step 3**: Monetization setup → Pricing & distribution → 定價 Free、地區選「全球」、含廣告「否」
- [ ] **Step 4**: 確認 Play Console Dashboard 上「App content」「Pricing & distribution」章節皆顯示完成狀態

---

### Task 8：【使用者操作】建立封閉測試軌道 + 上傳 AAB

> 需要帳號登入權限。

**Interfaces:**
- Consumes: `client/android/app/build/outputs/bundle/release/app-release.aab`（已於「target/compileSdk 升級至 API 36」任務驗證可正常簽署產出，若後續 Task 1-7 期間程式碼有變動，執行前重新跑一次 `cd client/android && ./gradlew bundleRelease` 取得最新版本）
- Produces: 一個 Closed testing 軌道，含已上傳的 build 與測試者 opt-in 連結，供 Task 9 使用

- [ ] **Step 1**: Play Console → Testing → Closed testing → Create new track，命名為 `alpha`
- [ ] **Step 2**: 上傳 `app-release.aab`，填寫 Release notes（例如：「首次封閉測試版本，功能與 iOS 版對等」）
- [ ] **Step 3**: Testers 頁籤 → 選擇「Off — Send an unpublished, closed alpha version of the app to a list of email addresses you choose」中的**不公開連結（opt-in URL）**方式，非公開 Google Group 清單
- [ ] **Step 4**: 儲存後複製產生的 opt-in URL，記下建立時間（作為 14 天倒數起點的參考，但實際天數以「測試者選加」時間為準，非軌道建立時間）

---

### Task 9：【使用者操作】邀請 12 位測試者，等待 14 天

> 需要帳號持有人本人私下聯繫熟識的人，執行者無法代為邀請。

**Interfaces:**
- Consumes: Task 8 產出的 opt-in URL
- Produces: 12+ 位測試者持續選加滿 14 天的紀錄，滿足 Task 10 的申請門檻

- [ ] **Step 1**: 私訊/私下傳送 opt-in URL 給至少 12 位朋友／家人（略多於 12 人可預留緩衝，避免中途有人退出導致人數不足）
- [ ] **Step 2**: 請每位測試者完成：點擊連結 → 加入測試 → 從 Play Store 安裝 → 開啟 App 至少一次
- [ ] **Step 3**: Play Console → Testing → Closed testing → 該軌道的 Testers 頁籤，定期確認「Testers who have opted in」的人數與天數累計狀態
- [ ] **Step 4**: 期間留意測試者是否透過任何管道（訊息/口頭）回報 crash 或功能異常，尤其比對本次 Android 落地時模擬器已修過的已知坑（狀態列遮擋、Google 登入、CORS、Splash Screen）是否在其他機型/系統版本重現——若發現新 bug，另開 systematic-debugging 排查，不在本計畫任務範圍內處理
- [ ] **Step 5**: 確認 Play Console 顯示已滿足「12 位測試者、連續 14 天」條件（Dashboard 會出現「Apply for production」按鈕）

---

### Task 10：【使用者操作】申請 Production Access

> 需要帳號登入權限。

**Interfaces:**
- Consumes: Task 9 完成後 Play Console 出現的「Apply for production」入口
- Produces: 已送出的 Production access 申請，等待 Google 審核（官方文件說明通常 7 天內回覆）

- [ ] **Step 1**: Play Console Dashboard → 點擊「Apply for production」
- [ ] **Step 2**: 填寫封閉測試回顧表單：說明測試者是否使用到所有主要功能（典藏、AI 潤飾、分享圖片、Google 登入）、測試行為是否符合預期正式使用者行為
- [ ] **Step 3**: 確認 App 資訊章節（Store listing、Content rating、Data safety、Pricing）皆顯示完成狀態才能送出
- [ ] **Step 4**: 送出申請，等待 Google 審核回覆（通過或要求補件/補測試）

---

### Task 11：【使用者操作】正式上架 + 上線驗證

> 需要帳號登入權限；上線驗證可由執行者協助。

**Interfaces:**
- Consumes: Task 10 核准後開放的 Production 軌道權限
- Produces: 正式上架的 Storio Android App

- [ ] **Step 1**: Play Console → Production → Create new release，選用已通過測試的 `app-release.aab`
- [ ] **Step 2**: 選擇「分階段推出」（Staged rollout），初始比例建議 20%，觀察 24-48 小時無異常回報再手動拉高至 100%
- [ ] **Step 3**: 送出後等待 Google 上架審核（與 Production access 審核是不同階段，仍需再等待）
- [ ] **Step 4**: 上架通過後，執行者用既有的 `/gstack browse` 模式驗證 Play Store 商店頁面（App 名稱/截圖/描述正確顯示）與下載安裝後的首次開啟流程

---

## Self-Review 對照

1. **Spec 涵蓋檢查**：spec 的 6 個 Phase 對應 Task 1-11：Phase 1（素材）→ Task 1-3，Phase 2（Store Listing）→ Task 4、6，Phase 3（分級/Data Safety/定價）→ Task 5、7，Phase 4（封閉測試）→ Task 8-9，Phase 5（申請 Production）→ Task 10，Phase 6（正式上架）→ Task 11。spec 列出的 5 項關鍵決策與 4 項風險皆已對應納入各任務的 Global Constraints 或 Step 說明中，無遺漏。
2. **佔位符掃描**：已確認所有 Step 皆有具體指令、具體文案內容或具體 Play Console 操作路徑，無 TBD/TODO。
3. **型別/介面一致性**：Task 1-5 產出的檔案路徑（`docs/play-store-assets/*.png`、`*.md`）與 Task 6-8 的 Consumes 欄位引用路徑一致。Task 8 的 AAB 路徑與「target/compileSdk 升級至 API 36」任務中已驗證產出的路徑一致。
