## ADDED Requirements

### Requirement: Interactive Submit Button
The system SHALL visually transition the submit button from a standard arrow to a sparkling Storio Gold icon based on the detected search intent.

#### Scenario: Input triggers AI mode
- **WHEN** the parser marks the input as AI search
- **THEN** the submit button crossfades into a glowing `✨` icon

### Requirement: Swipe/Peek Carousel Input UI
The system SHALL display the search input as a horizontal swipeable carousel to allow users to switch between 'Auto', 'AI Search', and 'Keyword Match' modes without additional UI buttons.

#### Scenario: User discovers search modes
- **WHEN** the user lands on the search page
- **THEN** they see the current active input field at 88% width, and the right edge (12%) of the next mode's input field peeking out semi-transparently.

#### Scenario: User switches search modes
- **WHEN** the user swipes left/right or clicks the peeking edge of the next input
- **THEN** the carousel slides, bringing the selected mode into focus with full opacity, and disabling the other inputs.

### Requirement: Distinct Placeholders per Mode
The system SHALL use contextual placeholders to clearly indicate the expected input for each search mode.
- **Auto Mode**: "Recall a story..." (暗示可隨意輸入片段或精確名稱)
- **AI Search Mode**: "Describe the vibe or plot..." (強烈暗示輸入模糊的劇情、氛圍或長句)
- **Keyword Match Mode**: "Name, Author, or Director..." (清楚說明必須輸入特定關鍵字如名稱或人名)

### Requirement: Mode Visual Indicators (Borders & Icons)
The system SHALL apply distinct visual styling and internal labels to each input field so the active mode is recognizable at a glance.
- **Auto Mode**: Subtly breathing Storio Gold border (`border-[#c5a059]`) with an "Auto" miniature top-left label.
- **AI Search Mode**: Animated multi-color gradient border (Gemini style) with an "✨ AI Search" miniature top-left label.
- **Keyword Match Mode**: Simple gray border (`border-zinc-700`) with an "Keyword Match" miniature top-left label.

### Requirement: AI Loading State
The system SHALL display a distinct "Consulting the archival spirits..." loading message during an AI search operation.

#### Scenario: Waiting for AI search results
- **WHEN** the AI search API is called and a response is awaited
- **THEN** the loading overlay displays the custom AI message instead of the default loading text

### Requirement: Chip-Initiated Search Presentation
搜尋頁 SHALL 支援由 details chips 帶入的查詢：讀取 `q` 與精準參數（`pid`/`cid`/`gid`/`author`），進頁即以該查詢載入結果——搜尋框顯示 `q` 字串、結果沿用既有 StoryCard grid 與分頁切換，**不引入獨立結果模式頁**。使用者在搜尋框修改文字重新送出時，精準參數 MUST 清除（回歸自由搜尋與既有 fallback 行為）。此頁面 MUST 維持 query-param 驅動路由（相容 iOS 靜態 export）。

#### Scenario: 由 chip 進入搜尋頁
- **WHEN** 使用者經 details chip 導向 `/search?q=Christopher%20Nolan&pid=525`
- **THEN** 搜尋框顯示「Christopher Nolan」，頁面直接載入其作品結果，版面與一般搜尋完全相同

#### Scenario: 修改查詢即脫離精準模式
- **WHEN** 使用者在 chip 帶入的搜尋頁修改輸入文字並重新送出
- **THEN** 精準參數清除，改走一般搜尋流程（含人名自動偵測與既有 fallback）

#### Scenario: 精準參數空結果不觸發 AI fallback
- **WHEN** 帶精準參數的查詢回傳 0 筆
- **THEN** 顯示既有 No Results 樣式，且不發出 `/api/v1/search/ai` 請求
