# Storio - Sprint 1 Planning: The Foundation

**Goal:** Build the core "Pyramid" infrastructure, enable anonymous users to search (Mock API) and add items to their collection.

## 1. User Stories (Scrum Master Breakdown)

| ID | Role | Story | Acceptance Criteria | Priority |
|----|------|-------|---------------------|----------|
| **US-01** | Guest | As a guest user, I want to search for movies/books so that I can find items to collect. | - Search bar input works<br>- Mock results displayed (Title, Type, Cover)<br>- Clear distinction between Movie/Book | **High** |
| **US-02** | Guest | As a guest user, I want to add an item to my pyramid so that I can start my collection. | - "Add" button on item<br>- Item appears in "My Pyramid" view<br>- Limit: Max 10 items (Local State check) | **High** |
| **US-03** | User | As a user, I want to see my collection as a list so that I can manage my bricks. | - List view implemented<br>- Basic "Delete" functionality | Medium |
| **US-04** | Dev | As a developer, I want a robust API structure so that future features are easy to add. | - FastAPI Service Layer implemented<br>- Pydantic Models defined | **High** |

---

## 2. User Flow (Mermaid Diagram)

```mermaid
graph TD
    A[Start App] --> B{Has Session?}
    B -- No --> C[Guest Mode (Max 10)]
    B -- Yes --> D[User Mode]
    
    C --> E[Homepage / Hero]
    E --> F[Click 'Search']
    
    F --> G[Search Page]
    G --> H{Input Query}
    H --> I[Display Results (Mock API)]
    
    I --> J[Select Item]
    J --> K{Check Limit < 10?}
    
    K -- Yes --> L[Add to Local Pyramid]
    L --> M[Show Success Toast]
    M --> E
    
    K -- No --> N[Show 'Register' Prompt]
```

---

## 3. Wireframes (Text-Based Mockups)

### A. Homepage (The Desert Hero)
```text
+--------------------------------------------------+
|  Storio v3.0                        [Search (O)] |
+--------------------------------------------------+
|                                                  |
|           ( Background: Dark Sand Dunes )        |
|                                                  |
|                  PYRAMID                         |
|                                                  |
|       "Build your library in the sands..."       |
|                                                  |
|            [ Explore Collection ]                |
|                                                  |
+--------------------------------------------------+
|  Recent Bricks:                                  |
|  [Book] [Movie] [Movie] ...                      |
+--------------------------------------------------+
```

### B. Search Interface (The Excavation)
```text
+--------------------------------------------------+
|  < Back                                          |
+--------------------------------------------------+
|  [ Search Movies & Books...                (X) ] |
+--------------------------------------------------+
|  Filters: [All] [Movies] [Books]                 |
+--------------------------------------------------+
|                                                  |
|  Results for "Dune":                             |
|                                                  |
|  +----------------+    +----------------+        |
|  |     POSTER     |    |     COVER      |        |
|  |                |    |                |        |
|  |  Dune: Part 2  |    |  Dune (Book)   |        |
|  |  (Movie, 2024) |    |  Frank H.      |        |
|  |  [+ Add Brick] |    |  [+ Add Brick] |        |
|  +----------------+    +----------------+        |
|                                                  |
+--------------------------------------------------+
```

---

## 4. Todo List (Technical Tasks)

### 🟢 Backend (FastAPI)
- [ ] **Setup**: Verify `fastapi-advanced` structure (Completed).
- [ ] **API**: Implement `POST /api/v1/search` using Mock Data Service.
- [ ] **Schema**: Define `BrickCreate` and `BrickResponse` models.
- [ ] **Service**: Create `CollectionService` to handle in-memory storage (temporary for guest).

### 🔵 Frontend (Next.js)
- [ ] **Component**: Build `BrickCard` (Black/Gold style).
- [ ] **Component**: Build `SearchBar` with API integration.
- [ ] **Page**: Implement `/search` page layout.
- [ ] **State**: Use React Context / Zustand to manage `GuestCollection` (Local Storage).
