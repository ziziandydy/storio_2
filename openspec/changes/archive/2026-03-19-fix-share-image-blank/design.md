# Design: Fix Share Image Blank Issue

## 架構決策

### D1：Debug 優先策略
在修復任何程式碼之前，先埋入結構化 Debug log。目的是讓後續的真機 UAT 有明確的 log 可查，而非靠直覺猜測問題所在。

### D2：前端截圖保持主力，後端產圖作為未來保底
本次 Change 不引入後端產圖方案。若 UAT 後問題仍持續，再另開 Change 討論後端 Pillow 保底機制。

### D3：Debug 開關設計
所有新增 log 透過 `SHARE_DEBUG` 常數控制，避免污染 Production：
```tsx
const SHARE_DEBUG = process.env.NODE_ENV === 'development' ||
                    process.env.NEXT_PUBLIC_SHARE_DEBUG === 'true';
```

### D4：空白圖偵測標準
```
dataUrl.length < 5000           → 視為空白圖 (WARN)
!dataUrl.startsWith('data:image/png;base64,')  → 視為格式錯誤 (ERROR)
```

### D5：Unsplash 背景圖本地化
將 `3d` 模板的外部 Unsplash URL 換成本地靜態檔案 `library_bg.jpg`，並改用 `<img>` 標籤，納入 `waitForAllImages` 監控範圍。

### D6：後端 CORS 設定
移除 `proxy.py` 手動設定的 `"Access-Control-Allow-Origin": "*"`，將 CORS 控制權完全交還 `CORSMiddleware`，消除 `* + credentials` 的規範衝突。

## 元件影響範圍

```
ShareModal.tsx
  ├── handleCapture()          → 加入 debug log、空白圖偵測
  ├── waitForAllImages()       → 強化 log（naturalWidth、crossOrigin）
  ├── handleShare()            → 加入 Filesystem & Share log
  └── proxiedItem (useMemo)    → 加入 URL 格式 log

MemoryCardTemplate.tsx
  └── 3d template              → Unsplash CSS background → 本地 <img>

server/app/api/v1/endpoints/proxy.py
  └── proxy_image()            → 移除手動 CORS header、加入 origin log
```

## 已知限制（不修復）

- `3d` 模板的 CSS 3D 渲染（`preserve-3d`）：`html-to-image` 不支援，截圖視覺失真，為既知限制。
- `backdrop-blur` 效果：`html-to-image` 不支援 `backdrop-filter`，截圖中毛玻璃效果消失，為既知視覺差異。
