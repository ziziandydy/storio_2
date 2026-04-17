# iOS App Store 上架 Checklist

> ✅ **v1.0 正式上架成功（2026-04-17）**
> 所有 Phase 均已完成。此文件保留作為歷史記錄。

---

## 🐛 Phase 0：UI Bug 修復（上架前必修）✅ 完成（2026-04-07 真機驗證通過）

- [x] **動態島透明穿透**：多個頁面的動態島區域背景透明，捲動內容從後方露出
  - [x] `StoryDetailsView.tsx` — 返回鍵與動態島重疊，無 safe-area 遮罩
  - [x] `collection/item/page.tsx` — header `sticky top-0` 未加 safe-area 遮罩
  - [x] `profile/page.tsx` 主畫面 — 確認主 header 是否有 safe-area 遮罩
  - [x] `details/page.tsx` — 確認 back 按鈕位置
- [x] 全頁面 QA 掃描（gstack headless browser 截圖存證）

---

## 🍎 Phase 1：Xcode & Apple Developer 設定 ✅ 完成（2026-04-10）

- [x] **App Icons**：所有尺寸填滿（1024×1024 for App Store + 各裝置）
  - 工具：使用 [AppIcon.co](https://appicon.co) 或 Xcode Asset Catalog
- [x] **Bundle ID**：確認 `com.storio.app` 與 Apple Developer Console 一致
- [x] **版號設定**：`client/package.json` version `1.0.0` + Xcode Build `2`（因送審被拒，Build 從 1 遞增至 2）
- [x] **Sign in with Apple Capability**：Xcode → App target → Signing & Capabilities → 確認已加入
- [x] **Deployment Target**：確認 iOS 14.0+
- [x] **Info.plist Privacy Descriptions**（2026-04-10 修復，因審核被拒補齊）：
  - [x] `NSCameraUsageDescription` — 頭像拍照
  - [x] `NSFaceIDUsageDescription` — Apple Sign-In 生物驗證
  - [x] `NSPhotoLibraryUsageDescription` — 頭像相片選取（原本已有）

---

## 📝 Phase 2：App Store Connect 填寫

- [x] 建立 App 記錄（若尚未建立）
- [x] **基本資訊**
  - [x] App 名稱：`Storio`
  - [x] 副標題（30 字）：`Collect stories in your folio`
  - [x] 描述（4000 字以內）
  - [x] 關鍵字（100 字元）：電影、書籍、日記、典藏、記錄...
  - [x] 支援 URL：`https://storio.andismtu.com`
  - [x] 隱私權政策 URL：`https://storio.andismtu.com/privacy`
- [x] **截圖**（必填：iPhone 6.5 吋 / 建議：6.7 吋，各 1~10 張）
  - [x] 首頁 / Onboarding
  - [x] 搜尋頁
  - [x] 詳情頁
  - [x] 分享圖片
  - [x] Profile 頁
- [x] **App 分級**：填寫內容分級問卷（預期：4+）
- [x] **定價**：Free
- [x] **上架地區**：全球（或台灣優先）

---

## 🔒 Phase 3：App Privacy 聲明

- [x] App Store Connect → App Privacy → 填寫資料收集聲明
  - 收集項目：Email address、Name（來自 Apple/Google Sign-In）
  - 用途：Authentication
  - 是否與第三方分享：否

---

## 🧪 Phase 4：TestFlight 測試 ← 目前進行

- [x] Build & Archive（Xcode → Product → Archive）
- [x] 上傳至 App Store Connect（Distribute → App Store Connect → Upload）
- [x] TestFlight 內部測試（自己的帳號）驗證以下功能後再送審：
  - [x] **相機權限**：Profile 頭像 → 拍照，確認系統跳出相機權限提示（不 crash）
  - [x] **Face ID 權限**：Apple Sign-In 流程，確認 Face ID 提示文字正確顯示
  - [x] Apple Sign-In 完整登入流程
  - [x] Google Sign-In 流程
  - [x] 訪客模式 → 登入遷移
  - [x] 分享圖片生成（至少一個模板）
  - [x] 動態島區域無穿透

---

## 🚀 Phase 5：提交審核

- [x] 審核備註（Review Notes）填寫：
  - 說明 Guest 模式（允許不登入使用）
  - Apple Sign-In 已整合（Face ID / Apple ID）
  - 後端 API 位於 Railway
- [x] 提交審核（Submit for Review）
- [x] 等待審核結果（通常 1~3 個工作天）

---

## 📌 注意事項

| 項目 | 說明 |
|------|------|
| Apple Review 禁忌 | 不能有測試帳號、假資料、壞掉的功能 |
| Apple Sign-In 必要性 | App 有第三方登入（Google）→ 必須同時支援 Apple Sign-In ✅ 已完成 |
| 隱私權頁面 | `/privacy` 頁面已有，URL 填入 App Store Connect |
| JWT 自動更新 | GitHub Actions 已設定，每 5 個月自動更新 Apple Secret Key |
| **第一次送審被拒原因** | Build 1 缺少 `NSCameraUsageDescription` → TCC crash。Build 2 已補齊 Camera + FaceID description |
