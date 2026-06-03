## ADDED Requirements

### Requirement: 啟動序列顯示順序
系統 SHALL 依照以下順序呈現各層級介面，確保過場流暢不衝突：

1. **Native Splash**（Capacitor 系統層）→ `NativeSplash.hide()` 觸發
2. **Web 飛入動畫**（前端）→ 動畫完成後進行 Auth 狀態檢查
3. **Auth 檢查**：未登入 → `OnboardingModal`（登入頁）；已登入 → 直接進首頁
4. **首頁渲染完成後**（`useEffect`）→ 檢查 `localStorage`，決定是否顯示學習卡
5. **學習卡**（`OnboardingGuideModal`）→ 完成或略過後進入正常首頁

#### Scenario: 全新用戶完整啟動流程
- **WHEN** 全新用戶啟動 App
- **THEN** 依序顯示：Native Splash → Web 動畫 → 登入頁 → 首頁（300–500ms）→ 學習卡

#### Scenario: 已登入且已看過引導的用戶
- **WHEN** 已登入用戶啟動 App 且 `storio_onboarding_seen = true`
- **THEN** 依序顯示：Native Splash → Web 動畫 → 首頁，不顯示任何 Modal

---

### Requirement: 學習卡過場時機
系統 SHALL 在首頁渲染完成後延遲 300–500ms 才顯示學習卡 Modal，讓用戶先短暫看見首頁內容，再以 fade-in 過場帶入引導。

#### Scenario: 學習卡延遲出現
- **WHEN** 首頁 `useEffect` 判斷需顯示學習卡
- **THEN** 等待 300–500ms 後以 fade-in 動畫顯示 `OnboardingGuideModal`

#### Scenario: 學習卡關閉過場
- **WHEN** 用戶完成或略過引導
- **THEN** Modal 以 fade-out 動畫關閉，回到正常首頁

---

### Requirement: 首次使用自動顯示引導
系統 SHALL 在用戶首次開啟首頁時，自動顯示 Onboarding Guide Modal。
「首次使用」定義為 `localStorage` 中不存在 `storio_onboarding_seen` 鍵值。

#### Scenario: 首次開啟 App 顯示引導
- **WHEN** 用戶開啟首頁且 `localStorage` 不含 `storio_onboarding_seen`
- **THEN** 系統顯示 `OnboardingGuideModal`，覆蓋於所有頁面內容之上

#### Scenario: 已看過引導不再自動顯示
- **WHEN** 用戶開啟首頁且 `localStorage` 含有 `storio_onboarding_seen = true`
- **THEN** 系統不顯示引導 Modal，直接進入正常首頁

---

### Requirement: 引導完成後寫入持久化狀態
系統 SHALL 在用戶關閉或完成引導後，將 `storio_onboarding_seen = true` 寫入 `localStorage`。

#### Scenario: 點擊「開始使用」完成引導
- **WHEN** 用戶在最後一張卡片點擊「開始使用 / Get Started」按鈕
- **THEN** 系統關閉 Modal 並寫入 `localStorage`

#### Scenario: 點擊右上角「略過」略過引導
- **WHEN** 用戶點擊 Modal 右上角「略過」文字按鈕
- **THEN** 系統關閉 Modal 並寫入 `localStorage`（視同已看過）
