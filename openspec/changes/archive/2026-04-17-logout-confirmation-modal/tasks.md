## 1. i18n 字串

- [x] 1.1 修改 `client/src/i18n/locales.ts`：在 `common` 區塊新增 `logout_confirm_title`（確定要登出嗎？ / Sign out?）與 `logout_confirm_cta`（登出 / Sign Out）

## 2. Profile 頁面修改

- [x] 2.1 在 `client/src/app/profile/page.tsx` 新增 `showLogoutModal` state（`useState(false)`）
- [x] 2.2 將登出按鈕 `onClick` 從 `handleSignOut` 改為 `() => setShowLogoutModal(true)`
- [x] 2.3 在 return JSX 末端加入 `<AnimatePresence>` 包裹的 logout 確認 modal：
  - backdrop：`motion.div` + `bg-black/95 backdrop-blur-xl`，點擊關閉 modal
  - 卡片：`motion.div` + `bg-folio-black border border-white/10 rounded-[32px] max-w-sm p-8`
  - 動畫：`initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}`
  - 內容：`LogOut` icon（gold）+ `t.common.logout_confirm_title` 標題
  - 按鈕列：取消（`border border-white/10 text-white/60`）+ 確認（`bg-red-950/30 border border-red-500/30 text-red-400 font-bold`）
  - 確認按鈕 onClick：`setShowLogoutModal(false); handleSignOut()`

## 3. 驗收測試

- [x] 3.1 點擊登出 → modal 以動畫進場，不立即登出
- [x] 3.2 點擊取消 → modal 關閉，維持登入狀態
- [x] 3.3 點擊背景遮罩 → 同取消
- [x] 3.4 點擊「登出」→ 執行登出，導向首頁
- [x] 3.5 切換 App 語言後重新開 modal → 文字正確切換（zh-TW / en-US）
