# Spec: Share Debug Logging

## 範圍
`client/src/components/ShareModal.tsx`

## Debug 開關
```tsx
const SHARE_DEBUG = process.env.NODE_ENV === 'development' ||
                    process.env.NEXT_PUBLIC_SHARE_DEBUG === 'true';
```
所有 `[ShareDebug]` log 統一透過此常數控制。

## 埋點規格

### 環節 1：proxiedItem 生成後
```
[ShareDebug][1] Original posterPath: <原始 URL 前 60 字>
[ShareDebug][1] Proxied URL: <proxy URL 前 80 字>
[ShareDebug][1] URL valid: true/false (檢查是否含 _t= 與 salt=)
```

### 環節 2：waitForAllImages 每張圖
現有 log 補充以下欄位：
```
[ShareDebug][2] Image <i>: {
  src: <前 50 字>,
  complete: true/false,
  naturalWidth: <數字>,   ← 新增，0 代表載入失敗
  crossOrigin: <值或 null>, ← 新增
  decodeResult: 'ok' | 'failed'
}
```

### 環節 3：暖機 Capture 後
```
[ShareDebug][3] Warm-up result: length=<n>, valid=<true/false>
```
判斷標準：`length < 1000` → `valid: false`，印出 WARN

### 環節 4：正式 Capture 後
```
[ShareDebug][4] Final capture: length=<n>
[ShareDebug][4] Header check: <dataUrl 前 30 字>
[ShareDebug][4] Status: 'ok' | 'blank' | 'invalid-format'
```

### 環節 5：Filesystem.writeFile 後
```
[ShareDebug][5] File written: <savedFile.uri>
[ShareDebug][5] URI valid (starts with file://): true/false
```

### 環節 6：Share.share 結果
```
[ShareDebug][6] Share invoked with url: <uri>
[ShareDebug][6] Share result: 'success' | 'error: <message>'
```

## 空白圖偵測與錯誤回傳
`handleCapture` 在正式 Capture 後加入：
- `dataUrl.length < 5000` → log WARN，回傳 `null`
- `!dataUrl.startsWith('data:image/png;base64,')` → log ERROR，回傳 `null`

`handleShare` / `handleDownload` 收到 `null` 時，向使用者顯示明確錯誤提示（toast 或 alert）。
