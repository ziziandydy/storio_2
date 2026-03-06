## ADDED Requirements

### Requirement: Integrate basic search as a fallback mechanism
The system SHALL route standard keyword strings that fail semantic intent parsing into the original native Title Search API flow.

#### Scenario: Performing a standard search
- **WHEN** standard title text is submitted in 'Auto' mode or 'Keyword Search' mode is locked
- **THEN** the system queries TMDB/Google Books directly via the exact match title APIs without using the LLM
