# Spec: 3D Template Unsplash 本地化

## 範圍
`client/src/components/share/MemoryCardTemplate.tsx`（`3d` 模板）

## 問題
`3d` 模板使用外部 Unsplash URL 作為 CSS `background-image`：
1. 繞過 `image-utils.ts` 的 proxy 機制
2. `waitForAllImages` 偵測不到（只掃 `<img>` 標籤）
3. Safari 可能 Tainted Canvas

## 修改規格

### Asset
- 將 Unsplash 圖片下載至 `client/public/image/share/library_bg.jpg`
- 已確認此路徑符合 `getImageProps` 的 `isLocalStatic` 判斷（`/image/` 前綴），不會掛上多餘的 `crossOrigin`

### CSS background → `<img>` 標籤
```tsx
// 移除
<div
  className="absolute inset-0 opacity-40 mix-blend-multiply"
  style={{
    backgroundImage: `url('https://images.unsplash.com/...')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
/>

// 改為
<img
  {...getImageProps('/image/share/library_bg.jpg')}
  alt=""
  className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-multiply"
/>
```

## 驗證標準
- `waitForAllImages` 能正確偵測到此圖片
- 截圖中書櫃背景正常顯示（不空白）
- Network tab 不再出現對 `images.unsplash.com` 的直接請求
