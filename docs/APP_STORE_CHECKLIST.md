# iOS App Store 上架 Checklist

> 近期最主要目標。依序完成，完成後打 `[x]`。

---

## 🐛 Phase 0：UI Bug 修復（上架前必修）

- [ ] **動態島透明穿透**：多個頁面的動態島區域背景透明，捲動內容從後方露出
  - [ ] `StoryDetailsView.tsx` — 返回鍵與動態島重疊，無 safe-area 遮罩
  - [ ] `collection/item/page.tsx` — header `sticky top-0` 未加 safe-area 遮罩
  - [ ] `profile/page.tsx` 主畫面 — 確認主 header 是否有 safe-area 遮罩
  - [ ] `details/page.tsx` — 確認 back 按鈕位置
- [ ] 全頁面 QA 掃描（gstack headless browser 截圖存證）

---

## 🍎 Phase 1：Xcode & Apple Developer 設定

- [ ] **App Icons**：所有尺寸填滿（1024×1024 for App Store + 各裝置）
  - 工具：使用 [AppIcon.co](https://appicon.co) 或 Xcode Asset Catalog
- [ ] **Bundle ID**：確認 `com.storio.app` 與 Apple Developer Console 一致
- [ ] **版號設定**：`client/package.json` version + Xcode Build Number 遞增（目前為 0.1.5）
- [ ] **Sign in with Apple Capability**：Xcode → App target → Signing & Capabilities → 確認已加入
- [ ] **Deployment Target**：確認 iOS 14.0+

---

## 📝 Phase 2：App Store Connect 填寫

- [ ] 建立 App 記錄（若尚未建立）
- [ ] **基本資訊**
  - [ ] App 名稱：`Storio`
  - [ ] 副標題（30 字）：`Collect stories in your folio`
  - [ ] 描述（4000 字以內）
  - [ ] 關鍵字（100 字元）：電影、書籍、日記、典藏、記錄...
  - [ ] 支援 URL：`https://storio.andismtu.com`
  - [ ] 隱私權政策 URL：`https://storio.andismtu.com/privacy`
- [ ] **截圖**（必填：iPhone 6.5 吋 / 建議：6.7 吋，各 1~10 張）
  - [ ] 首頁 / Onboarding
  - [ ] 搜尋頁
  - [ ] 詳情頁
  - [ ] 分享圖片
  - [ ] Profile 頁
- [ ] **App 分級**：填寫內容分級問卷（預期：4+）
- [ ] **定價**：Free
- [ ] **上架地區**：全球（或台灣優先）

---

## 🔒 Phase 3：App Privacy 聲明

- [ ] App Store Connect → App Privacy → 填寫資料收集聲明
  - 收集項目：Email address、Name（來自 Apple/Google Sign-In）
  - 用途：Authentication
  - 是否與第三方分享：否

---

## 🧪 Phase 4：TestFlight 測試

- [ ] Build & Archive（Xcode → Product → Archive）
- [ ] 上傳至 App Store Connect（Distribute → App Store Connect → Upload）
- [ ] TestFlight 內部測試（自己的帳號）
  - [ ] Apple Sign-In 流程
  - [ ] Google Sign-In 流程
  - [ ] 訪客模式 → 登入遷移
  - [ ] 分享圖片生成
  - [ ] 動態島區域無穿透

---

## 🚀 Phase 5：提交審核

- [ ] 審核備註（Review Notes）填寫：
  - 說明 Guest 模式（允許不登入使用）
  - Apple Sign-In 已整合（Face ID / Apple ID）
  - 後端 API 位於 Railway
- [ ] 提交審核（Submit for Review）
- [ ] 等待審核結果（通常 1~3 個工作天）

---

## 📌 注意事項

| 項目 | 說明 |
|------|------|
| Apple Review 禁忌 | 不能有測試帳號、假資料、壞掉的功能 |
| Apple Sign-In 必要性 | App 有第三方登入（Google）→ 必須同時支援 Apple Sign-In ✅ 已完成 |
| 隱私權頁面 | `/privacy` 頁面已有，URL 填入 App Store Connect |
| JWT 自動更新 | GitHub Actions 已設定，每 5 個月自動更新 Apple Secret Key |
