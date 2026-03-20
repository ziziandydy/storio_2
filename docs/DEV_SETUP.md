# Storio 2 開發環境啟動指南 & 疑難排解

## 1. 快速啟動指令 (Recommended)

為了確保在各種 Shell 環境（包括 Agent 沙箱）中都能穩定運行，請使用以下**子 Shell (Subshell)** 組合指令來啟動服務。這能有效防止進程因父 Shell 結束而被清理。

### 🚀 穩定啟動指令 (Reliable Start Command)

**注意：由於引入了自動偵測區域網路 IP 的腳本 (`get-ip.js`) 以支援跨裝置 (iOS Simulator / 實體手機) 開發，後端必須啟動在 `0.0.0.0` 上。**
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
3. 同時啟動後端 (8010) 與前端 (3010)，並觸發前端專案中的自動寫入本地 IP 腳本。

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

---

## 5. 重要開發參數
- **Backend URL**: `http://<您的區域網路IP>:8010` (由自動化腳本寫入 `client/.env.local` 來決定)
- **Frontend URL**: `http://localhost:3010` 或 `http://<您的區域網路IP>:3010`
- **Database**: Supabase PostgreSQL (Table: `collections`, `users` ... etc)
- **Auth**: Supabase Anonymous Auth
