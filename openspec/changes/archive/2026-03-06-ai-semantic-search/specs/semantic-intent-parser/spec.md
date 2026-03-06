## ADDED Requirements

### Requirement: Auto-detect AI intent from search string
The system SHALL use regular expressions or simple parsing logic to determine if a search string contains semantic intent, question words, or a comma-separated keyword bag.

#### Scenario: User inputs a question
- **WHEN** the search string contains phrases like "關於...的" or "有沒有"
- **THEN** the parser identifies the intent as an AI search

#### Scenario: User inputs multiple keywords separated by punctuation
- **WHEN** the search string contains two or more commas or spaces separating distinct words (e.g., "諾蘭、記憶、變魔術")
- **THEN** the parser identifies the intent as a keyword bag for AI search

#### Scenario: User inputs a standard exact title
- **WHEN** the search string does not contain question words or multiple separating punctuations
- **THEN** the parser identifies the intent as a standard exact match
