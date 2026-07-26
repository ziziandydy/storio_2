# Storio 2 開發環境啟動指南 & 疑難排解

## 1. 快速啟動指令 (Recommended)

為了確保在各種 Shell 環境（包括 Agent 沙箱）中都能穩定運行，請使用以下**子 Shell (Subshell)** 組合指令來啟動服務。這能有效防止進程因父 Shell 結束而被清理。

### 🚀 穩定啟動指令 (Reliable Start Command)

**注意：後端必須啟動在 `0.0.0.0` 上，才能讓 iOS Simulator / 實體手機跨裝置存取。啟動前請確認 Section 2 的 env 檔案已設定正確 IP。**
直接複製並執行以下整段指令：

```bash
# 清理舊進程並啟動
{ lsof -ti:3010; lsof -ti:8010; } | xargs kill -9 2>/dev/null || true && \
(cd server && nohup python3 -u -m uvicorn app.main:app --host 0.0.0.0 --reload --port 8010 > ../backend.log 2>&1 < /dev/null &) && \
(cd client && nohup npm run dev -- -p 3010 > ../frontend.log 2>&1 < /dev/null &) && \
echo "✅ 服務已在背景啟動 (Backend: 0.0.0.0:8010, Frontend: 3010) 並已自動更新 IP 設定"
```

此指令的關鍵在於：
1. 使用 `( ... )` 創建子 Shell，隔離執行環境。
2. 使用 `nohup ... < /dev/null` 切斷標準輸入，防止 `SIGTTIN` 訊號導致的暫停。
3. 同時啟動後端 (8010) 與前端 (3010)。

---

## 2. iOS Simulator / 實機開發設定

### 環境變數（每次換 Wi-Fi IP 時更新）

**`client/.env.local`**（控制 Capacitor WebView 指向）：
```
NEXT_PUBLIC_API_URL=http://<你的區網IP>:8010
CAPACITOR_DEV_URL=http://<你的區網IP>:3010
```

**`server/.env`**（控制 Backend CORS 白名單）：
```
DEV_CORS_ORIGIN=http://<你的區網IP>:3010
```

> 取得目前區網 IP：`ipconfig getifaddr en0`

更新後重啟服務（`cap sync` 會自動從 `.env.local` 讀取 `CAPACITOR_DEV_URL`）：
```bash
cd client && npx cap sync ios
```

### Release Build（送審 / 正式打包）

在 `client/.env.local` 中**移除或註解** `CAPACITOR_DEV_URL` 那行：
```
# CAPACITOR_DEV_URL=http://192.168.50.137:3010
```
然後執行 `cap sync`，Capacitor 會改用 `out/` 靜態檔，不再依賴本機 dev server。

---

## 3. 驗證服務狀態

啟動後，可使用以下指令確認服務是否存活：

```bash
lsof -i :8010 && lsof -i :3010
```

若看到 `LISTEN` 狀態，即代表啟動成功。

---

## 4. 常見問題與解決方案 (Troubleshooting)

### Q1: 埠號被佔用 (Port already in use)
**現象**: 啟動時報錯 `Address already in use`。
**解決**: 
```bash
# 檢查並殺死佔用 8010 (Backend) 或 3010 (Frontend) 的進程
lsof -i :8010
lsof -i :3010
kill -9 <PID>
```

### Q2: 瀏覽器出現 ChunkLoadError / 404 (Not Found)
**現象**: 頁面可以開啟但點擊按鈕無反應，控制台顯示 `_next/static/chunks/...js 404`。
**原因**: 先前執行過 `npm run build` 並以 `npm start` 啟動，隨後修改代碼導致瀏覽器嘗試請求舊的編譯檔案。
**解決**: 
1. 終止 `npm start` 進程。
2. 刪除 `client/.next` 資料夾。
3. 使用 `npm run dev` 啟動開發伺服器。

### Q3: 日誌檔案無法讀取 (Binary file error)
**現象**: 使用 `cat` 或 `read_file` 讀取 `.log` 時顯示為 binary。
**原因**: 終止進程時可能產生了空字符 (`^@`) 填滿檔案。
**解決**: 刪除舊日誌重新啟動，或使用 `cat -v` 檢視。

### Q4: 執行期錯誤 `ReferenceError: ... is not defined`
**現象**: 頁面崩潰，提示 `useAuth` 或 `Star` 未定義。
**原因**: 在多個組件間重構代碼（如 `StoryCard` 與 `AddToFolioModal`）時漏掉 import。
**檢查清單**:
- `client/src/components/StoryCard.tsx`: 需導入 `Star, Calendar, Edit3, MessageSquarePlus`。
- `client/src/components/AddToFolioModal.tsx`: 需導入 `useAuth, Image`。

### Q5: 跨域問題 (CORS) 或 503 錯誤連鎖反應
**現象**: 測試跨裝置或 iOS 原生專案時遇到 CORS Error，或者是 `Failed to fetch`。
**原因**: 當後端發生嚴重的 500/503 內部伺服器錯誤時（例如 DB Constraint Error 或連線中斷），FastAPI 的錯誤處理**不會帶有 CORS Header**，瀏覽器因此誤判為「CORS 錯誤」。前端看到 CORS 錯誤，但真正的問題出在後端。
**解決**: 檢查 `backend.log` 找出真正的 500/503 來源；或隨意存檔一次後端程式碼觸發 Hot Reload 清除卡死狀態。若換了 Wi-Fi 導致 IP 變動，依照 **Section 2** 更新兩個 env 檔的 IP，然後重啟服務。

### Q6: `DEV_CORS_ORIGIN` 已設在 `server/.env`，仍出現 `Disallowed CORS origin`
**現象**: `server/.env` 的 `DEV_CORS_ORIGIN` 已正確設為區網 IP，OPTIONS preflight 仍回 `400 Disallowed CORS origin`。
**原因**: `server/app/main.py` 用 `os.getenv("DEV_CORS_ORIGIN", "")` 讀取，這只讀「shell process 實際的環境變數」，不會像 `pydantic-settings`（`config.py` 定義的欄位）那樣自動載入 `.env` 檔案內容。若啟動 uvicorn 時沒有把 `.env` 的值 export 到 process env，這個變數在 runtime 永遠是空字串。
**解決**: 啟動後端前手動 export：
```bash
export DEV_CORS_ORIGIN="http://<你的區網IP>:3010"
```
或在啟動指令前加：
```bash
(export DEV_CORS_ORIGIN="http://<你的區網IP>:3010" && cd server && nohup python3 -u -m uvicorn app.main:app --host 0.0.0.0 --reload --port 8010 > ../backend.log 2>&1 < /dev/null &)
```

### Q7: iOS 模擬器 WKWebView 內 `fetch()` 對 http 連線回傳 `TypeError: Load failed`
**現象**: Capacitor iOS App 在模擬器上執行，`window.location` 的頁面本身能載入（`capacitor.config.ts` 的 `server.cleartext: true` 讓主頁面可用 http），但 JS 內對其他 host:port（如本機後端 `http://<IP>:8010`）發出的 `fetch()`/`XMLHttpRequest` 一律失敗，`catch` 到 `TypeError: Load failed`。
**原因**: iOS 預設 App Transport Security (ATS) 要求所有網路連線走 HTTPS；`cleartext: true` 只影響 Capacitor WebView 載入**主頁面**的行為，不會放寬 Info.plist 層級的 ATS 限制，任意 http fetch 仍被系統擋下。
**解決（僅限本機模擬器測試，正式 build 前必須還原）**: 暫時在 `client/ios/App/App/Info.plist` 加入：
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```
重新 build 並安裝到模擬器後即可正常 fetch。**測試完成後務必 `git checkout -- client/ios/App/App/Info.plist` 還原**，避免這個放寬 ATS 的設定被誤帶進正式送審的 build（Apple Review 可能因此拒絕，且無此需求時也不應保留寬鬆的安全性設定）。

### Q8: iOS 模擬器手動驗證方法（無 idb，靠 CDP 自動化）
**情境**: 需要在模擬器上驗證某個功能真的能跑（而非只靠 headless browser QA），但 `idb-companion` 已從 brew 移除，沒有原生點擊工具。
**做法**：
1. 依 Section 2 設定 `.env.local` 的 `CAPACITOR_DEV_URL` 指向本機 dev server，`npx cap sync ios`。
2. `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -destination "id=<UDID>" -derivedDataPath build build` 建置（比透過 Xcode GUI 快，且可從指令列驅動）。
3. `xcrun simctl install <UDID> build/Build/Products/Debug-iphonesimulator/App.app && xcrun simctl launch <UDID> com.storio.app`。
4. 找 WKWebView inspector socket：`lsof -U | grep webinspectord_sim`，啟動 proxy：`ios_webkit_debug_proxy -s "unix:<socket路徑>" -c null:9221,:9222-9230`。
5. `curl http://localhost:9222/json` 取得 `page/N`（每次 App 重啟編號可能變動，需重新查）；WebKit 用的是 **multi-target protocol**，實際目標 ID 需在連上該 ws 後監聽 `Target.targetCreated` 事件取得（常見為 `page-8`），指令要包在 `Target.sendMessageToTarget` 裡，不是 Chrome flat CDP。
6. 用 `Runtime.evaluate` 執行 JS 驗證頁面狀態、模擬點擊（`querySelector(...).click()`）、檢查 `location.href`。**注意**：`awaitPromise: true` 在這個 legacy protocol 下不可靠，非同步結果改用「存進 `window.__xxx` 變數 → `setTimeout` 後再讀」的模式。
7. **建置產物 `client/ios/App/build/` 不會被 git 追蹤，但會讓後續 `cap sync` 的 `pod install`（內部跑 `xcodebuild clean`）報錯**（`Could not delete build because it was not created by the build system`）——測試完 `rm -rf client/ios/App/build` 即可解除。

### Q9: iOS **實體裝置**手動驗證方法（跟 Q8 的差異）

**情境**：要在真的 iPhone（非模擬器）上驗證功能，流程大致同 Q8，但裝置探測、安裝、inspector 連線方式不同，且會遇到模擬器沒有的網路/CORS 眉角。

**做法**：
1. 同 Q8 步驟 1 設定 `.env.local`（`CAPACITOR_DEV_URL` + `NEXT_PUBLIC_PUPPETEER_SERVICE_URL` 都指向區網 IP，見上方 Puppeteer Service 章節的警告），啟動 backend 時也要 `export DEV_CORS_ORIGIN="http://<區網IP>:3010"`（見 Q6），puppeteer-service 啟動要帶 `ALLOWED_ORIGINS`。
2. 找裝置：`xcrun devicectl list devices`（比 `xcrun xctrace list devices` 準，後者對已配對但當下離線的裝置常誤報 offline）。也可用 `idevice_id -l`（來自 `libimobiledevice`，`brew install libimobiledevice`）確認裝置有被 `usbmuxd` 看到。
3. 查目標 destination id：`xcodebuild -workspace ios/App/App.xcworkspace -scheme App -showdestinations | grep "platform:iOS"`。
4. 建置：`xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphoneos -destination "id=<UDID>" -derivedDataPath build build`（需要專案已設定好 `DEVELOPMENT_TEAM` / signing，簽署身份與 provisioning profile 錯誤會在這步報錯）。
5. 安裝 + 啟動改用 `devicectl`（不是 `simctl`）：
   ```bash
   xcrun devicectl device install app --device <coredevice-UUID> build/Build/Products/Debug-iphoneos/App.app
   xcrun devicectl device process launch --device <coredevice-UUID> com.storio.app
   ```
   這裡的 `<coredevice-UUID>` 是 `devicectl list devices` 顯示的識別碼，跟 `xctrace`/`idevice_id` 的 UDID 格式不同，兩種 ID 都要留意別搞混。
6. **手機端要手動打開 Web Inspector**（設定 → Safari → 進階 → 網頁檢閱器），否則 `ios_webkit_debug_proxy` 連線會直接 SSL/broken pipe 失敗。打開後需要重新 `launch` 一次 App，WebView 才會註冊給 inspector。
7. 連 proxy：`ios_webkit_debug_proxy -c <UDID>:9222`（這裡用 Q8 xctrace 格式的 UDID，不是 devicectl 的）。之後同 Q8 步驟 5-6，用 `Target.sendMessageToTarget` legacy protocol 操作——`client/scripts/ios-cdp-debug.py` 已經包好這個協議，直接用：
   ```bash
   python3 client/scripts/ios-cdp-debug.py eval "location.href"
   python3 client/scripts/ios-cdp-debug.py watch 10   # 監看 10 秒 console
   ```
8. **暫時放寬 ATS**（同 Q7）通常也需要，因為 App 要連本機 backend（`:8010`）跟 puppeteer-service（`:4000`），測完務必 `git checkout -- client/ios/App/App/Info.plist` 還原。

**除錯血淚教訓**：
- `fetch()` 失敗顯示「無法找到指定主機名稱的伺服器」不一定代表真的斷網或 DNS 掛掉——先用 `<img>` 標籤載入同一個網址測試，若圖片載得出來，代表網路是通的，問題出在 `fetch()` 本身的 CORS 檢查（換 `{mode:'no-cors'}` 測試可以確認：no-cors 成功但一般 fetch 失敗 = CORS 問題；no-cors 也失敗 = 真的連不上，可能是那個網域本身有問題，用 `nslookup <hostname>` 在 Mac 上確認）。
- 曾經因為這樣誤判「手機沒網路」，後來用 `nslookup` 才發現是 `.env.local` 指的 Supabase 開發專案因為 Free Tier 閒置太久被自動暫停（DNS 直接查不到該子網域），跟網路或 CORS 都無關——真正的原因要看 `client/.env.local` 跟 `client/.env.production` 指的是不是同一個 Supabase 專案，兩邊 project ref 不一致時本機測試會連到一個可能隨時被暫停的獨立開發專案。
- `xcrun devicectl device install/launch` 偶爾會跟 CDP 的 WebSocket 連線衝突導致 `ConnectionRefusedError`，通常是暫時性的，重試一次 `websocket.create_connection` 即可，不用重開 proxy。

---

## 5. Puppeteer Service 本地開發

Puppeteer Service 是獨立的 Node.js 服務（`puppeteer-service/`），負責截圖生成。

### 啟動指令

```bash
cd puppeteer-service

# 重要：FRONTEND_URL 預設為 localhost:3000，但 Storio 前端跑在 3010
FRONTEND_URL=http://localhost:3010 npm start
```

> **⚠️ 常見錯誤**：忘記設 `FRONTEND_URL` 會導致 Puppeteer 嘗試連接 `localhost:3000`（不存在），
> `POST /render` 會回傳 504 timeout。

> **⚠️ 真機 / 模擬器測試（`CAPACITOR_DEV_URL` 指向區網 IP）時的常見錯誤**：`puppeteer-service` 的 CORS 白名單（`ALLOWED_ORIGINS`）預設只有 `localhost:3010`，不包含區網 IP。若 App 是用 `http://192.168.x.x:3010` 這種區網位址載入（真機測試必經），前端呼叫 `/render` 會被 CORS 擋掉並回傳 500（瀏覽器 console 會看到 `Origin http://192.168.x.x:3010 is not allowed by Access-Control-Allow-Origin`）。**解法**：啟動時多帶一個環境變數：
> ```bash
> FRONTEND_URL=http://localhost:3010 ALLOWED_ORIGINS=http://192.168.x.x:3010 npm start
> ```
> 把 `192.168.x.x` 換成當下的區網 IP（`ipconfig getifaddr en0`），跟 `client/.env.local` 的 `CAPACITOR_DEV_URL` 用同一個 IP。

### 連帶的 `.env.local` 設定

`client/.env.local` 需加入：
```
NEXT_PUBLIC_PUPPETEER_SERVICE_URL=http://localhost:4000
```

### 驗證步驟

```bash
# Step 1：確認服務健康
curl http://localhost:4000/health
# 預期：{"status":"ok","uptime":...}

# Step 2：測試截圖（需要前端也在跑）
curl -X POST http://localhost:4000/render \
  -H "Content-Type: application/json" \
  -d '{"template":"memory-card","item":{"title":"Inception","posterPath":"/image/defaultMoviePoster.svg","type":"movie","rating":9},"settings":{"selectedTemplate":"default","aspectRatio":"9:16"}}' \
  --output /tmp/test-render.png && open /tmp/test-render.png
```

### 端口總覽

| 服務 | Port |
|------|------|
| Frontend (Next.js) | 3010 |
| Backend (FastAPI) | 8010 |
| Puppeteer Service | 4000 |

---

## 6. 重要開發參數
- **Backend URL**: `http://<您的區域網路IP>:8010` (由自動化腳本寫入 `client/.env.local` 來決定)
- **Frontend URL**: `http://localhost:3010` 或 `http://<您的區域網路IP>:3010`
- **Puppeteer Service**: `http://localhost:4000`（本地開發）
- **Database**: Supabase PostgreSQL (Table: `collections`, `users` ... etc)
- **Auth**: Supabase Anonymous Auth

---

## 5. 測試與 CI (Testing & CI)

### 後端測試 (Backend pytest)

```bash
cd server
python3 -m pytest -q          # 全套 36 tests，約 12-16 秒
```

**現有測試以 mock（MagicMock/AsyncMock）為主，不連真實 Supabase**，因此本地與 CI 皆可用 dummy 憑證執行：

```bash
# 模擬 CI 環境（乾淨 env + dummy 憑證）
cd server
env -i PATH="$PATH" \
  SUPABASE_URL="https://dummy.supabase.co" \
  SUPABASE_ANON_KEY="dummy-anon-key" \
  SUPABASE_SERVICE_KEY="dummy-service-key" \
  TMDB_API_KEY="dummy-tmdb-key" \
  python3 -m pytest -q
```

> ⚠️ `app.main` 在 import 時會做 startup validation，缺 `SUPABASE_URL / SUPABASE_ANON_KEY / TMDB_API_KEY` 會直接 RuntimeError。CI 提供 dummy 值讓 app 啟動，測試全程 mock 不發真實請求。

### GitHub Actions CI

`.github/workflows/backend-tests.yml` 在以下時機自動跑後端測試：
- **push 到 main**（且 `server/**` 有變更）
- **任何 PR**（且 `server/**` 有變更）

**規則**：後端測試綠才能放心 merge / 發版。這是發版安全網的第一層。

### 前端 E2E (Playwright)

`client/tests/*.spec.ts` 存在但目前**未進 CI**（落後較多版本，需先補課）。手動跑：

```bash
cd client
npx playwright test    # 需先啟動 dev server（port 3010）+ 後端
```

### 與 iOS 發布流程的關係

完整鏈路：**改 code → 後端 CI 綠（自動）→ `npm run release` → `ios:sync` → `build:ios` → Xcode Archive → 送審**。CI 是 code 變更後、發版前的自動檢查點。
