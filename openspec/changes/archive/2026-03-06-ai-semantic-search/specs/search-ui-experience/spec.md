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
