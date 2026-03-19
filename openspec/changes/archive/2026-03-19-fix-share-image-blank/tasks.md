# Tasks: Fix Share Image Blank Issue

## 進度
0/6 完成

## 任務清單

- [x] **Task 1｜Backend** 修改 `server/app/api/v1/endpoints/proxy.py`：移除 `"Access-Control-Allow-Origin": "*"`，加入 `Request` 參數與 Origin debug log。參考 `specs/cors-fix.md`。

- [x] **Task 2｜Asset** 下載 Unsplash 圖片（`https://images.unsplash.com/photo-1481627834876-b7833e8f5570`）至本地 `client/public/image/share/library_bg.jpg`。

- [x] **Task 3｜Frontend** 修改 `client/src/components/share/MemoryCardTemplate.tsx`：將 `3d` 模板的 CSS `backgroundImage` 外部 URL 替換為本地 `<img>` 標籤。參考 `specs/unsplash-local.md`。

- [x] **Task 4｜Frontend** 修改 `client/src/components/ShareModal.tsx`：加入 `SHARE_DEBUG` 開關常數，並在 `proxiedItem useMemo` 後加入環節 1 的 log。參考 `specs/debug-logging.md`。

- [x] **Task 5｜Frontend** 修改 `client/src/components/ShareModal.tsx`：強化 `waitForAllImages`（加入 `naturalWidth`、`crossOrigin` 欄位），在 `handleCapture` 加入環節 3、4 的 log 與空白圖偵測邏輯，在 `handleShare` 加入環節 5、6 的 log 與 `null` 時的使用者錯誤提示。參考 `specs/debug-logging.md`。

- [x] **Task 6｜Verify** 在本機開發環境以 `NEXT_PUBLIC_SHARE_DEBUG=true` 啟動，確認各 log 環節皆正常輸出，空白圖偵測邏輯運作正確。記錄任何異常供真機 UAT 參考。
