# Design Spec: Logout Confirmation Modal

**Date:** 2026-04-17
**Status:** Approved
**Context:** 目前點擊登出按鈕後直接執行 `signOut()`，無確認步驟。需加入確認 modal 防止誤觸，樣式與現有 modal 設計一致。

---

## 目標

在 Profile 頁面的登出按鈕點擊後，跳出確認 modal，用戶確認後才執行 `signOut()`。

---

## 架構

單一小改動：`client/src/app/profile/page.tsx`

- 新增 `showLogoutModal` state
- 登出按鈕 `onClick` 改為 `setShowLogoutModal(true)`
- Modal 確認後呼叫原有 `handleSignOut()`
- Modal 取消關閉

不建立獨立元件（僅 profile 頁使用，inline JSX 足夠）。

---

## 需修改的檔案

1. **修改 `client/src/app/profile/page.tsx`**
2. **修改 `client/src/i18n/locales.ts`** — 新增 `logout_confirm_title`, `logout_confirm_body`, `logout_confirm_cta`

---

## Modal 視覺設計

與現有 `GuestLimitModal` 相同技術棧（Framer Motion + AnimatePresence），但更輕量：

```
Backdrop: bg-black/95 backdrop-blur-xl
Card: bg-folio-black border border-white/10 rounded-[32px] max-w-sm p-8
Animation: scale 0.9→1, opacity 0→1, y 20→0

┌──────────────────────────────┐
│                              │
│   [LogOut icon, gold, 28px]  │
│                              │
│   確定要登出嗎？              │  ← text-xl font-bold text-white
│   Sign out?                  │
│                              │
│  [取消 Cancel]  [登出 Sign Out]│
└──────────────────────────────┘

取消按鈕：flex-1, border border-white/10, text-white/60, rounded-2xl, py-3
登出按鈕：flex-1, bg-red-950/30, border border-red-500/30, text-red-400, font-bold, rounded-2xl, py-3
```

---

## 詳細設計

### `client/src/i18n/locales.ts` 新增字串

在 `common` 或 `profile` 區塊加入：

```typescript
// zh-TW
logout_confirm_title: '確定要登出嗎？',
logout_confirm_cta: '登出',

// en-US
logout_confirm_title: 'Sign out?',
logout_confirm_cta: 'Sign Out',
```

### `profile/page.tsx` 修改

```tsx
// 1. 新增 state
const [showLogoutModal, setShowLogoutModal] = useState(false);

// 2. 登出按鈕 onClick 改為開 modal
<button
  onClick={() => setShowLogoutModal(true)}
  className="w-full flex items-center justify-center gap-2 p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-500 font-bold text-sm hover:bg-red-900/30 transition-all active:scale-95"
>
  <LogOut size={18} /> {t.common.logout}
</button>

// 3. Modal JSX（置於 return 最後，Login Modal 之前）
<AnimatePresence>
  {showLogoutModal && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowLogoutModal(false)}
        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-sm bg-folio-black border border-white/10 rounded-[32px] p-8 flex flex-col items-center gap-6"
      >
        <div className="w-14 h-14 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center text-accent-gold">
          <LogOut size={28} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">{t.common.logout_confirm_title}</h2>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="flex-1 py-3 border border-white/10 rounded-2xl text-white/60 text-sm font-medium"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={() => { setShowLogoutModal(false); handleSignOut(); }}
            className="flex-1 py-3 bg-red-950/30 border border-red-500/30 rounded-2xl text-red-400 text-sm font-bold"
          >
            {t.common.logout_confirm_cta}
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

---

## 驗收標準

1. 點擊 Profile 登出按鈕 → 跳出確認 modal（不直接登出）
2. 點擊「取消」→ 關閉 modal，維持登入狀態
3. 點擊背景遮罩 → 同取消
4. 點擊「登出」→ 執行 `signOut()`，導向首頁
5. 語言切換後 modal 文字正確切換（zh-TW / en-US）
6. 動畫 scale + fade 與現有 modal 一致

---

## 不在範圍內

- 不建立獨立 `LogoutConfirmModal.tsx` 元件（僅一個使用點，inline 即可）
- 不更動登出邏輯本身（`signOut()` + `router.push('/')` 維持不動）
