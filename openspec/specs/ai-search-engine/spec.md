## ADDED Requirements

### Requirement: Convert natural language to structured API query leveraging LLM
The system SHALL use an LLM (OpenAI or Gemini) to parse the user's semantic query into specific API parameters (like genres, keywords, or directors) for TMDB or Google Books.

#### Scenario: Processing a valid semantic query
- **WHEN** the backend receives an AI search request for a movie
- **THEN** the LLM generates a set of TMDB Discover API parameters that translate the user's intent

### Requirement: Map external API results to StoryResult format
The system SHALL take the resultant data from TMDB and Google Books and map it into the unified `StoryResult` array format expected by the frontend.

#### Scenario: Displaying AI search results
- **WHEN** the backend query to TMDB succeeds
- **THEN** the system returns an array of `StoryResult` objects matching the Storio schema
