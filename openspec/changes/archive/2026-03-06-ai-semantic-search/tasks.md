## 1. Backend: AI Search Pipeline Integration

- [x] 1.1 Create schemas for AI search query and TMDB Discover API parameters mapping in `server/app/schemas/search.py`.
- [x] 1.2 Implement the core LLM prompt and parsing logic in `server/app/services/ai_recommendation_service.py` (or a dedicated `semantic_search_service.py`) to convert natural language queries into structured parameters.
- [x] 1.3 Create the `/api/v1/search/ai` endpoint in `server/app/api/v1/endpoints/search.py` that receives the query, calls the LLM service, and proxies the parameters to external APIs (TMDB/Google Books).
- [x] 1.4 Test the new backend endpoint and LLM conversion logic for robustness and potential hallucinations.

## 2. Frontend: UI Experience & Input Components

- [x] 2.1 Refactor the `<input>` element in `client/src/app/search/page.tsx` into a Swipe/Peek Carousel supporting three modes: Auto, AI Search, and Keyword Match.
- [x] 2.2 Implement distinct placeholders and styling (borders, icons, and miniature labels) for each mode according to the `search-ui-experience` spec.
- [x] 2.3 Add swipe detection logic and clickable peeking edges to allow smooth transitions between the search modes.
- [x] 2.4 Update the submit button to dynamically change to a glowing `✨` icon when AI mode is active.

## 3. Frontend: Logic & State Management

- [x] 3.1 Implement the `Semantic Intent Parser` logic in the frontend to automatically detect if a user's input in 'Auto' mode requires AI processing (e.g., regex for question words or multiple commas).
- [x] 3.2 Wire the frontend search submit logic to route requests to either the standard search API or the new `/api/v1/search/ai` endpoint based on the selected/detected mode.
- [x] 3.3 Add the custom loading state ("Consulting the archival spirits...") overlay when waiting for AI search results.
- [x] 3.4 Ensure the fallback mechanism routes non-semantic queries in 'Auto' mode to the original Keyword Search flow.
