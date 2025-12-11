# Edge TT Match Analyser — Architecture

> **Project:** Edge TT Match Analyser  
> **Version:** 3.0 (Current Implementation)  
> **Last Updated:** 2025-12-11  
> **Status:** ✅ Single Source of Truth

---

## Overview

This document describes the **actual implemented architecture** of the Edge TT Match Analyser application — a table tennis match video tagging and analysis tool. It is reverse-engineered from the codebase to ensure 100% accuracy.

**Note:** This is a separate project from "Edge TT" (the club session management app). They share domain concepts but are independent codebases.

### Project Identity

- **Purpose:** Table tennis match video tagging and analysis
- **Architecture:** Local-first with future Supabase migration
- **Workflow:** Three-phase tagging (timestamps → details → inference)
- **Data:** Slug-based IDs, IndexedDB storage, multi-video support

---

## 1. Goals & Principles

### 1.1 Goals

- **Local-first development:** All data persists in browser (IndexedDB via Dexie.js)
- **Supabase-ready:** Structured for easy migration to cloud backend
- **Clear separation of concerns:** Feature/rules/data/UI layers
- **Easy to navigate:** Feature-first organization
- **Testable:** Pure logic separated from UI code
- **Minimal complexity:** MVP-first approach

### 1.2 Core Principles

- **Feature-first:** Organize by domain feature (analytics, shot-tagging-engine), not by technology
- **Single responsibility per layer:**
  - UI composition → `features/`
  - Domain logic → `rules/`
  - Data persistence → `data/`
  - UI state → `stores/`
  - Shared UI → `ui-mine/`
- **Local is source of truth (for now):** IndexedDB is primary storage, Zustand caches UI state
- **Supabase migration planned:** Architecture designed for straightforward cloud migration
- **Small pieces, well named:** Filenames and exports clearly describe their purpose

---

## 2. Tech Stack

### 2.1 Current Stack (MVP)

| Layer | Technology | Version | Usage |
|-------|------------|---------|-------|
| **Framework** | React | 19.2.0 | UI components |
| **Language** | TypeScript | 5.9.3 | End-to-end type safety |
| **Build Tool** | Vite | 7.2.4 | Fast dev server & bundling |
| **Routing** | React Router DOM | 7.9.6 | Client-side routing (v6 API) |
| **State** | Zustand | 5.0.9 | UI state management |
| **Database** | Dexie.js | 4.2.1 | IndexedDB wrapper (primary storage) |
| **Styling** | Tailwind CSS | 4.1.17 | Utility-first CSS |
| **UI Components** | Radix UI | Various | Accessible primitives (shadcn pattern) |
| **Icons** | Lucide React | 0.555.0 | Icon library |
| **Video** | HTML5 Video API | Native | Video playback |
| **Video Export** | FFmpeg.wasm | 0.12.10 | Client-side video processing |

### 2.2 What's Installed But Not Used (Future-Proofing)

| Technology | Status | Reason |
|------------|--------|--------|
| TanStack Query | Installed, not used | Ready for Supabase migration (server state management) |

### 2.3 What We're NOT Using

| Technology | Why Not |
|------------|---------|
| Next.js | No SSR needed; Vite SPA is simpler for local-first |
| Supabase | Not in MVP; local-first for now (migration planned) |
| Authentication | Single-user local app for MVP |
| Hls.js / Video.js | Not needed; HTML5 video API is sufficient |

---

## 3. Folder Structure

```
app/src/
  pages/                    # Route components (thin, import Composers)
    Analytics.tsx
    Clubs.tsx
    Dashboard.tsx
    DataViewer.tsx
    DataViewerAudit.tsx
    MatchCreate.tsx
    Matches.tsx
    Players.tsx
    Settings.tsx
    ShotTaggingEngine.tsx
    Tournaments.tsx
    index.ts

  features/                 # Feature-specific UI & orchestration
    analytics/
      composers/            # Route-level composition
      sections/             # Page sections (larger UI regions)
      blocks/               # Smaller UI units (cards, rows)
      derive/               # View model derivation hooks
      models.ts             # View model types
    shot-tagging-engine/
      composers/
      sections/
      blocks/
      layouts/              # Layout templates
    match-management/
    player-management/
    club-management/
    tournament-management/
    data-audit/             # Debug/verification UI
    populate-dummy-data/    # Development utility

  rules/                    # Pure domain logic (NO React, NO IO)
    derive/                 # Deterministic derivations (100% fact, persisted)
      shot/                 # Shot-level derivations
      rally/                # Rally-level derivations
      set/                  # Set-level derivations
      match/                # Match-level derivations
    calculate/              # Arithmetic calculations (100% fact, not persisted)
    infer/                  # Probabilistic inferences (AI/ML, persisted with confidence)
      shot-level/           # Shot-level inferences (saved to DB)
      rally-patterns/       # Rally-level patterns (computed on-demand)
    validate/               # Data integrity checks
    analytics/              # Aggregated statistics calculations
    types.ts                # Domain enums and types
    index.ts

  data/                     # Data layer (Dexie.js + Zustand caching)
    db.ts                   # Dexie database instance
    index.ts                # Central exports
    entities/               # One folder per entity
      clubs/
        club.types.ts       # TypeScript types
        club.db.ts          # Dexie CRUD operations
        club.store.ts       # Zustand cache (optional)
        index.ts            # Public API
      players/              # Same pattern
      tournaments/
      matches/
      matchVideos/
      sets/
      rallies/
      shots/
      shotInferences/
    services/               # Cross-entity services
      validation.ts
    MIGRATION_GUIDE.md      # Supabase migration guide
    TODO_REMAINING_MIGRATIONS.md

  stores/                   # Global UI state (Zustand)
    taggingSessionStore.ts  # Tagging UI state (current video time, phase, etc.)

  ui-mine/                  # Shared UI kit (folder-per-component)
    Badge/
    BasicInsightCardTemplate/
    Button/
    Card/
    Dialog/
    FilterBar/
    Icon/                   # Wrapper for lucide-react
    Input/
    Label/
    LandingZoneGrid/        # Table tennis specific
    PositionGrid/           # Table tennis specific
    SpeedControls/          # Video controls
    SpinGrid/               # Table tennis specific
    Table/
    TableTennisButtons/     # 30+ specialized buttons
    VideoPlayer/
    index.ts                # Barrel exports

  components/
    ui/                     # shadcn primitives (NEVER import directly from features)
      alert-dialog.tsx
      Badge.tsx
      Button.tsx
      Card.tsx
      dialog.tsx
      Input.tsx
      label.tsx
      table.tsx
      index.ts
    layout/                 # App shell components
      AppShell.tsx
      Header.tsx
      Sidebar.tsx
      index.ts

  helpers/                  # Pure utility functions
    createEntityDefaults.ts
    debugDatabase.ts
    generateId.ts
    generateSlugId.ts       # Human-readable ID generation
    testFixtures.ts
    utils.ts                # General utilities (cn, etc.)
    videoFileHelpers.ts
    videoStorage.ts

  types/
    index.ts                # Global type definitions

  styles/
    index.css               # Global CSS, Tailwind directives
```

---

## 4. Layers & Responsibilities

### 4.1 `pages/` — Routing Layer

**Purpose:** Define routes and delegate to feature composers.

**Rules:**
- Uses React Router v7 (backward-compatible v6 API)
- Each route file:
  - Reads route params
  - Imports a **Composer** from `features/<feature>/composers`
  - Renders it
- **NO business logic** in pages
- **NO direct store access** in pages

**Example:**

```tsx
// src/pages/ShotTaggingEngine.tsx
import { TaggingUIComposer } from '@/features/shot-tagging-engine'

export function ShotTaggingEngine() {
  return <TaggingUIComposer />
}
```

---

### 4.2 `features/` — Feature UI & Orchestration

**Purpose:** Feature-specific UI components organized in layers.

Each domain feature has its own folder with sub-folders:

```
src/features/<feature>/
  composers/   # Route-level composition components
  sections/    # Page sections (larger UI regions)
  blocks/      # Smaller UI units (cards, rows, items)
  layouts/     # Layout templates (optional)
  derive/      # View model derivation hooks (optional)
  models.ts    # View model types for this feature (optional)
```

#### 4.2.1 `composers/` — Route-Level Composition

**Naming:** `<Thing>Composer.tsx`

**Examples:**
- `TaggingUIComposer.tsx`
- `AnalyticsComposer.tsx`
- `MatchListComposer.tsx`

**Responsibilities:**
- Access Zustand store (taggingSessionStore)
- Access Dexie database (via `data/entities/*`)
- Call derive hooks to prepare view models
- Compose Sections and pass them data
- Hold top-level local UI state (filters, active tabs, modals)
- Handle global keyboard shortcuts

**Rules:**
- MAY access stores
- MAY access database
- MAY call derive hooks
- MUST compose Sections (not Blocks directly)
- NO direct shadcn imports (use ui-mine/)

#### 4.2.2 `sections/` — Page Sections

**Naming:** `<Thing>Section.tsx`

**Examples:**
- `VideoPlayerSection.tsx`
- `StatusBarSection.tsx`
- `AnalyticsOverviewSection.tsx`

**Responsibilities:**
- Define layout for a zone of the page
- Receive view models via props (NO store access)
- Compose Blocks
- Handle section-level interactions

**Rules:**
- NO store access (props only)
- NO database access
- MAY compose Blocks
- MAY use ui-mine/ components

#### 4.2.3 `blocks/` — UI Building Blocks

**Naming:** `<Thing>Block.tsx`

**Examples:**
- `RallyCard.tsx`
- `Phase1ControlsBlock.tsx`
- `ServePerformanceCard.tsx`

**Responsibilities:**
- Render a specific UI element
- Receive all data via props
- Handle local interactions (clicks, hovers)
- Pure presentational components

**Rules:**
- NO store access (props only)
- NO database access
- NO business logic (call parent callbacks)
- MAY use ui-mine/ components

#### 4.2.4 `derive/` — View Model Derivation (Optional)

**Naming:** `useDerive<Thing>.ts`

**Examples:**
- `useDeriveServePerformance.ts`
- `useDeriveErrorProfile.ts`

**Purpose:** Transform raw data into view models for UI consumption.

**Pattern:**
```tsx
// features/analytics/derive/useDeriveServePerformance.ts
import { db } from '@/data'
import { calculateServePerformance } from '@/rules/analytics'

export function useDeriveServePerformance(matchId: string, playerId: string) {
  // 1. Fetch raw data from Dexie
  const [shots, rallies, sets] = useLiveQuery(async () => {
    const shots = await db.shots.where('match_id').equals(matchId).toArray()
    const rallies = await db.rallies.where('match_id').equals(matchId).toArray()
    const sets = await db.sets.where('match_id').equals(matchId).toArray()
    return [shots, rallies, sets]
  }, [matchId])

  // 2. Call pure rules function
  const stats = useMemo(() => {
    if (!shots || !rallies || !sets) return null
    return calculateServePerformance(shots, rallies, sets, playerId)
  }, [shots, rallies, sets, playerId])

  return stats
}
```

**Rules:**
- MAY access database (read-only)
- MUST call pure functions from `rules/`
- MUST memoize results
- Returns view model ready for UI

---

### 4.3 `rules/` — Pure Domain Logic

**Purpose:** Business logic isolated from React and IO.

**Golden Rules:**
- ✅ Pure functions only (same inputs → same outputs)
- ❌ NO React imports
- ❌ NO side effects
- ❌ NO database access
- ❌ NO store access
- ✅ Testable without React

#### 4.3.1 `derive/` — Deterministic Derivations

**Purpose:** Calculate values that are **100% factual** and **persisted to database**.

**Certainty:** 100% (no guessing, no probability)  
**Persisted:** ✅ YES (saved to DB tables)

**Naming:** `derive<Entity>_<field_name>()`

**Examples:**
```typescript
// rules/derive/rally/deriveRally_winner_id.ts
export function deriveRally_winner_id(shots: DBShot[]): string | null {
  const lastShot = shots[shots.length - 1]
  if (!lastShot.is_rally_end) return null
  
  // Deterministic logic based on shot result
  if (lastShot.shot_result === 'in_play') return null
  if (lastShot.rally_end_role === 'winner') return lastShot.player_id
  // ... more logic
}
```

**Organization:**
```
rules/derive/
  shot/
    deriveShot_locations.ts       # shot_origin, shot_destination
    deriveShot_rally_end_role.ts  # rally_end_role field
    mappers_UI_to_DB.ts            # UI value ↔ DB value transformations
  rally/
    deriveRally_winner_id.ts       # winner_id field
    deriveRally_point_end_type.ts  # point_end_type field
    deriveRally_is_scoring.ts      # is_scoring field
    deriveRally_scores.ts          # score progression
  set/
    deriveSet_winner_id.ts         # winner_id field
    deriveSet_final_scores.ts      # final scores
    deriveSetEndConditions.ts      # when set should end
  match/
    deriveMatch_winner_id.ts       # winner_id field
    deriveMatch_sets_won.ts        # sets won count
```

**Key Pattern:** Function names match DB field names for easy grep/search.

#### 4.3.2 `calculate/` — Arithmetic Calculations

**Purpose:** Calculate values that are **100% factual** but **NOT persisted**.

**Certainty:** 100% (deterministic)  
**Persisted:** ❌ NO (computed on-demand)

**Examples:**
```typescript
// rules/calculate/calculateServer.ts
export function calculateServer(
  rallyIndex: number,
  setScore: { p1: number, p2: number },
  firstServerId: string,
  player1Id: string,
  player2Id: string
): string {
  // Service alternation rules (2 each until 10-10, then alternate)
  // Returns serverId
}
```

**Use Cases:**
- Server alternation (not saved, recalculated as needed)
- Score progression (not saved, derived from rallies)
- Shot player inference (not saved, based on server/shot_index)

#### 4.3.3 `infer/` — Probabilistic Inferences

**Purpose:** Make educated guesses using heuristics or ML.

**Certainty:** Probabilistic (may have confidence scores)  
**Persisted:** ✅ Shot-level inferences saved to `shotInferences` table

**Examples:**
```typescript
// rules/infer/shot-level/inferShotType.ts
export function inferShotType(shot: DBShot, context: ShotContext): {
  shotType: string
  confidence: 'low' | 'medium' | 'high'
} {
  // Heuristic-based inference
  if (shot.shot_index === 1) return { shotType: 'serve', confidence: 'high' }
  if (shot.shot_index === 2) return { shotType: 'receive', confidence: 'high' }
  // ... more complex logic
}
```

**Organization:**
```
rules/infer/
  shot-level/           # Saved to shotInferences table
    inferShotType.ts
    inferSpin.ts
    inferPressure.ts
    inferDistanceFromTable.ts
    inferPlayerPosition.ts
  rally-patterns/       # Computed on-demand (not saved)
    inferInitiative.ts
    inferMovement.ts
    inferTacticalPatterns.ts
```

**Tracking:** Shot-level inferences are tracked in `shotInferences` table with confidence scores.

#### 4.3.4 `validate/` — Data Integrity

**Purpose:** Check data consistency and validity.

**Examples:**
```typescript
// rules/validate/validateSetScore.ts
export function validateSetScore(
  player1Score: number,
  player2Score: number
): { valid: boolean; reason?: string } {
  // Check if scores are valid for a set
  if (player1Score < 0 || player2Score < 0) {
    return { valid: false, reason: 'Scores cannot be negative' }
  }
  // ... more validation
}
```

#### 4.3.5 `analytics/` — Aggregated Statistics

**Purpose:** Calculate performance metrics and insights.

**Examples:**
```typescript
// rules/analytics/calculateServePerformance.ts
export function calculateServePerformance(
  shots: DBShot[],
  rallies: DBRally[],
  sets: DBSet[],
  playerId: string
): ServePerformanceStats {
  // Filter to player's serves
  const serves = shots.filter(s => s.shot_label === 'serve' && s.player_id === playerId)
  
  // Calculate metrics
  const successRate = /* calculation */
  const aceRate = /* calculation */
  // ... more stats
  
  return { successRate, aceRate, /* more */ }
}
```

**Use Cases:**
- Serve performance
- Receive performance
- Third ball effectiveness
- Error profile
- Rally statistics

---

### 4.4 `data/` — Data Layer

**Purpose:** Database operations and entity management.

#### 4.4.1 Dexie.js Database

**File:** `data/db.ts`

**Schema:**
- 9 entities (see DataSchema.md)
- Slug-based IDs (human-readable)
- IndexedDB storage (local-first)

**Example:**
```typescript
// data/db.ts
import Dexie from 'dexie'

export const db = new Dexie('EdgeTTMatchAnalyser')

db.version(1).stores({
  players: 'id, club_id, first_name, last_name',
  clubs: 'id, name',
  tournaments: 'id, start_date',
  matches: 'id, tournament_id, player1_id, player2_id, match_date',
  matchVideos: 'id, match_id',
  sets: 'id, match_id',
  rallies: 'id, set_id, video_id',
  shots: 'id, rally_id, video_id, player_id',
  shotInferences: 'id, shot_id'
})
```

#### 4.4.2 Entity Pattern

Each entity folder contains:

```
data/entities/<entity>/
  *.types.ts    # TypeScript type definitions
  *.db.ts       # Dexie CRUD operations
  *.store.ts    # Zustand cache (optional, for frequently accessed data)
  index.ts      # Public API (exports types + functions)
```

**Example: Players**

```typescript
// data/entities/players/player.types.ts
export interface DBPlayer {
  id: string  // Slug: {first}-{last}-{id4}
  first_name: string
  last_name: string
  handedness: 'right' | 'left'
  playstyle: 'attacker' | 'all_rounder' | 'defender' | 'disruptive' | null
  club_id: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

// data/entities/players/player.db.ts
import { db } from '@/data/db'

export async function createPlayer(player: NewPlayer): Promise<DBPlayer> {
  const id = generateSlugId(player.first_name, player.last_name)
  const newPlayer: DBPlayer = {
    ...player,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  await db.players.add(newPlayer)
  return newPlayer
}

export async function updatePlayer(id: string, updates: Partial<DBPlayer>) {
  await db.players.update(id, { ...updates, updated_at: new Date().toISOString() })
}

// ... more CRUD functions

// data/entities/players/player.store.ts (optional)
import { create } from 'zustand'

interface PlayerCacheState {
  players: DBPlayer[]
  loadPlayers: () => Promise<void>
  // ... more cache actions
}

export const usePlayerCache = create<PlayerCacheState>((set) => ({
  players: [],
  loadPlayers: async () => {
    const players = await db.players.toArray()
    set({ players })
  }
}))
```

**When to use `.store.ts`:**
- Entity is frequently accessed (players, matches)
- Need reactive updates across components
- Want to cache query results

**When NOT to use `.store.ts`:**
- Entity is rarely accessed
- Data changes frequently
- One-off queries

---

### 4.5 `stores/` — Global UI State

**Purpose:** Manage ephemeral UI state that doesn't belong in the database.

**Current Stores:**
- `taggingSessionStore.ts` — Tagging UI state (current video time, phase, selected shot, playback speed, etc.)

**Example:**
```typescript
// stores/taggingSessionStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TaggingSessionState {
  // Video state
  currentTime: number
  playbackSpeed: number
  isPlaying: boolean
  
  // Tagging state
  currentPhase: 'phase1' | 'phase2' | 'phase3'
  currentSetId: string | null
  currentRallyIndex: number | null
  
  // Actions
  setCurrentTime: (time: number) => void
  setPlaybackSpeed: (speed: number) => void
  setCurrentPhase: (phase: string) => void
  // ... more actions
}

export const useTaggingSessionStore = create<TaggingSessionState>()(
  persist(
    (set) => ({
      // Initial state
      currentTime: 0,
      playbackSpeed: 1,
      isPlaying: false,
      currentPhase: 'phase1',
      currentSetId: null,
      currentRallyIndex: null,
      
      // Actions
      setCurrentTime: (time) => set({ currentTime: time }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
      setCurrentPhase: (phase) => set({ currentPhase: phase as any }),
      // ... more actions
    }),
    { name: 'tagging-session-store' }
  )
)
```

**Rules:**
- Use Zustand for UI state only
- Use persist middleware for session recovery
- Don't store database-persisted data here
- Keep actions simple and synchronous

---

### 4.6 `ui-mine/` — Shared UI Kit

**Purpose:** Reusable UI components for the app (domain-specific + generic).

**Structure:** Folder-per-component pattern

```
ui-mine/
  <Component>/
    <Component>.tsx    # Component implementation
    index.ts           # Exports
```

**Component Types:**

1. **Generic UI Components:**
   - Button, Card, Badge, Input, Label, Table, Dialog
   - Wrap shadcn primitives with app-specific defaults

2. **Domain-Specific Components:**
   - TableTennisButtons/ (30+ specialized buttons)
   - SpinGrid, PositionGrid, LandingZoneGrid (table tennis specific)
   - VideoPlayer (with custom controls)
   - BasicInsightCardTemplate (analytics cards)

3. **Utility Components:**
   - Icon (wraps lucide-react)
   - FilterBar (for analytics)
   - SpeedControls (video playback)

**Key Rule:** Features import from `@/ui-mine`, **NEVER** from `@/components/ui`.

**Why?**
- Consistency across app
- Easy to customize globally
- Prevents direct shadcn dependency
- Can add app-specific behavior

**Example:**
```tsx
// ui-mine/Button/Button.tsx
import { Button as ShadcnButton } from '@/components/ui/button'

export function Button({ variant = 'default', size = 'default', ...props }) {
  return <ShadcnButton variant={variant} size={size} {...props} />
}

// Usage in features:
import { Button } from '@/ui-mine'  // ✅ Correct
// NOT: import { Button } from '@/components/ui/button'  // ❌ Wrong
```

---

### 4.7 `components/` — Internal Components

#### 4.7.1 `components/ui/` — shadcn Primitives

**Purpose:** Raw shadcn components (Radix UI wrappers).

**Rule:** NEVER import directly from features. Always go through `ui-mine/`.

**Components:**
- alert-dialog.tsx
- Badge.tsx
- Button.tsx
- Card.tsx
- dialog.tsx
- Input.tsx
- label.tsx
- table.tsx

#### 4.7.2 `components/layout/` — App Shell

**Purpose:** Top-level layout components.

**Components:**
- `AppShell.tsx` — Main app container with sidebar
- `Header.tsx` — Top navigation bar
- `Sidebar.tsx` — Left navigation menu

**These are app-wide, not feature-specific.**

---

### 4.8 `helpers/` — Pure Utility Functions

**Purpose:** General-purpose utilities with no domain logic.

**Examples:**
- `cn.ts` — Class name merger (Tailwind)
- `generateId.ts` — UUID generation
- `generateSlugId.ts` — Human-readable slug generation
- `videoFileHelpers.ts` — Video file parsing
- `videoStorage.ts` — Blob URL management
- `utils.ts` — General utilities

**Rules:**
- Pure functions only
- No React imports
- No database access
- No domain logic (that goes in `rules/`)

---

## 5. Key Architectural Patterns

### 5.1 Three-Phase Tagging Workflow

**Phase 1: Match Framework (Timestamp Tagging)**
- User marks shot contact times by clicking buttons
- System creates shots with timestamps
- Derives server, receiver, rally structure
- Output: Timestamped shots in database

**Phase 2: Rally Detail (Question Answering)**
- User reviews each shot one-by-one
- Answers questions: intent, quality, shot type, direction, etc.
- System updates shot attributes
- Output: Detailed shot data in database

**Phase 3: Inference & Analytics**
- System runs inference engine on tagged shots
- Populates `shotInferences` table
- Calculates analytics (serve %, error rates, etc.)
- Output: Inferences and insights

**State Tracking:**
- Sets track: `tagging_phase`, `phase1_last_rally`, `phase2_last_shot_index`
- Supports pause/resume workflow

### 5.2 Top-Down + Bottom-Up Data Flow

**Top-Down (Pre-Entry):**
1. User creates match with expected result (11-9, 11-7, 11-5)
2. System creates **stub rallies** based on score progression
3. Rallies marked as `is_stub_rally: true`

**Bottom-Up (Tagging Verification):**
1. User tags video → creates real rallies with timestamps
2. Tagged data **overwrites** stub rallies
3. **Tagged data = source of truth**

**Reconciliation:**
- If pre-entered scores conflict with tagged scores, tagged wins
- User can manually correct errors via UI

### 5.3 Multi-Video Support

**Problem:** Camera battery dies mid-set, or multiple video files per match.

**Solution:**
- Match can have multiple `MatchVideo` entries
- Each video has `coverage_type`: 'full_match' | 'single_set' | 'multi_set'
- Sets track which videos cover them: `video_segments: string[]`
- Sets have `video_contexts` array (starting score, server per video)
- Shots reference which video they're in: `video_id: string`

**Example:**
```typescript
// Match has 3 sets, 2 video files
Match {
  id: "john-vs-jane-20251211-a1b2",
  video_count: 2,
  total_coverage: 'full'
}

MatchVideo {
  id: "john-vs-jane-20251211-a1b2-v1",
  coverage_type: 'single_set',
  set_number: 1
}

MatchVideo {
  id: "john-vs-jane-20251211-a1b2-v2",
  coverage_type: 'multi_set',  // Covers sets 2 and 3
  set_number: null
}

Set {
  id: "john-vs-jane-20251211-a1b2-s2",
  video_segments: ["john-vs-jane-20251211-a1b2-v2"],
  video_contexts: [{
    video_id: "john-vs-jane-20251211-a1b2-v2",
    video_start_player1_score: 0,
    video_start_player2_score: 0,
    first_server_in_video: "john-smith-a1b2"
  }]
}
```

### 5.4 Slug-Based IDs (Human-Readable)

**Why?** Easy debugging, readable URLs, grep-friendly.

**Pattern:**
- `{first}-{last}-{id4}` — Players (john-smith-a1b2)
- `{name}-{city}-{id4}` — Clubs (edge-tt-london-x7y3)
- `{name}-{yyyy}-{mm}-{id4}` — Tournaments (summer-open-2025-06-a1b2)
- `{p1}-vs-{p2}-{yyyymmdd}-{id4}` — Matches (john-vs-jane-20251211-a1b2)
- `{match_id}-v{num}` — Videos (john-vs-jane-20251211-a1b2-v1)
- `{match_id}-s{num}` — Sets (john-vs-jane-20251211-a1b2-s1)
- `{set_id}-r{num}` — Rallies (john-vs-jane-20251211-a1b2-s1-r5)
- `{rally_id}-sh{num}` — Shots (john-vs-jane-20251211-a1b2-s1-r5-sh3)

**Helper:** `generateSlugId()` in `helpers/generateSlugId.ts`

**Supabase Migration:** Keep slugs as indexed fields, add UUIDs as primary keys.

### 5.5 Analytics Card Architecture

**Pattern:** Card-based insights with consistent structure.

**Components:**
1. **Rules Layer** (`rules/analytics/calculate*.ts`)
   - Pure calculation function
   - Takes raw data (shots, rallies, sets)
   - Returns stats object

2. **Derive Hook** (`features/analytics/derive/useDerive*.ts`)
   - Fetches data from Dexie
   - Calls rules function
   - Returns memoized stats

3. **Card Component** (`features/analytics/blocks/*Card.tsx`)
   - Uses derive hook
   - Renders using BasicInsightCardTemplate
   - Shows primary metric + secondary metrics + insights

**Template:**
```tsx
<BasicInsightCardTemplate
  title="Serve Performance"
  subtitle="Your serving effectiveness"
  primaryMetric={{ label: "Success Rate", value: "85%", status: "good" }}
  secondaryMetrics={[
    { label: "of service points are won by you", value: 68 },
    { label: "of serves result in aces", value: 12 },
    // ... more
  ]}
  insights={[
    "Strong serving is your biggest weapon",
    "Consider varying serve placement more"
  ]}
/>
```

**Current Cards:**
- ServePerformanceCard
- ReceivePerformanceCard
- ThirdBallCard
- RallyStatsCard
- ErrorProfileCard

### 5.6 Rules Organization: derive vs calculate vs infer

**Summary Table:**

| Type | Certainty | Persisted? | Example | Function Naming |
|------|-----------|-----------|---------|----------------|
| **derive** | 100% fact | ✅ YES (DB fields) | `deriveRally_winner_id()` | Named after DB fields |
| **calculate** | 100% fact | ❌ NO (on-demand) | `calculateServer()` | General calculation names |
| **infer** | Probabilistic | ✅ YES (with confidence) | `inferShotType()` | Returns {value, confidence} |
| **validate** | Check | ❌ NO (returns valid/reason) | `validateSetScore()` | Returns {valid, reason} |
| **analytics** | Aggregation | ❌ NO (computed for UI) | `calculateServePerformance()` | Returns stats object |

**When to use which:**

```typescript
// derive: Populating a DB field from other DB fields
function deriveRally_winner_id(shots: DBShot[]): string | null {
  // 100% deterministic based on shots data
}

// calculate: Computing a value on-demand
function calculateServer(rallyIndex: number, firstServerId: string): string {
  // 100% deterministic but not saved
}

// infer: Making educated guess
function inferShotType(shot: DBShot): {type: string, confidence: string} {
  // Heuristic or ML-based, saved with confidence
}

// validate: Checking data integrity
function validateSetScore(p1: number, p2: number): {valid: boolean, reason?: string} {
  // Returns validation result
}

// analytics: Aggregating stats for UI
function calculateServePerformance(shots: DBShot[]): ServeStats {
  // Computes multiple metrics for display
}
```

---

## 6. Naming Conventions

### 6.1 Components

| Type | Naming | Example |
|------|--------|---------|
| Composer | `<Thing>Composer.tsx` | `TaggingUIComposer.tsx` |
| Section | `<Thing>Section.tsx` | `StatusBarSection.tsx` |
| Block | `<Thing>Block.tsx` | `RallyCard.tsx` |
| Layout | `<Thing>Template.tsx` or `<Thing>Layout.tsx` | `PhaseLayoutTemplate.tsx` |

### 6.2 Hooks

| Type | Naming | Example |
|------|--------|---------|
| Derive Hook | `useDerive<Thing>()` | `useDeriveServePerformance()` |
| Store Hook | `use<Thing>Store()` | `useTaggingSessionStore()` |
| Cache Hook | `use<Thing>Cache()` | `usePlayerCache()` |

### 6.3 Rules (Pure Functions)

| Type | Naming | Example |
|------|--------|---------|
| Derive | `derive<Entity>_<field>()` | `deriveRally_winner_id()` |
| Calculate | `calculate<Thing>()` | `calculateServer()` |
| Infer | `infer<Thing>()` | `inferShotType()` |
| Validate | `validate<Thing>()` | `validateSetScore()` |
| Analytics | `calculate<Thing>()` | `calculateServePerformance()` |

### 6.4 Store Actions

| Action Type | Naming | Example |
|-------------|--------|---------|
| Create | `add<Thing>`, `create<Thing>` | `addRally()`, `createPlayer()` |
| Update | `update<Thing>`, `set<Thing>` | `updateShot()`, `setCurrentTime()` |
| Delete | `delete<Thing>`, `remove<Thing>` | `deleteMatch()`, `removeRally()` |
| Toggle | `toggle<Thing>` | `toggleIsPlaying()` |

### 6.5 File Naming

- **Components:** PascalCase (`TaggingUIComposer.tsx`)
- **Hooks:** camelCase (`useDeriveServePerformance.ts`)
- **Rules:** camelCase (`deriveRally_winner_id.ts`)
- **Types:** camelCase (`player.types.ts`)
- **Exports:** `index.ts` (barrel exports)

---

## 7. Import Rules & Best Practices

### 7.1 Import Rules

1. **Features MUST import from `@/ui-mine`, NEVER from `@/components/ui`**
   ```tsx
   // ✅ Correct
   import { Button, Card } from '@/ui-mine'
   
   // ❌ Wrong
   import { Button } from '@/components/ui/button'
   ```

2. **Features NEVER import `lucide-react` directly — use `@/ui-mine/Icon`**
   ```tsx
   // ✅ Correct
   import { Icon } from '@/ui-mine'
   <Icon name="play" />
   
   // ❌ Wrong
   import { Play } from 'lucide-react'
   <Play />
   ```

3. **Use path aliases consistently**
   ```tsx
   import { db } from '@/data'
   import { calculateServer } from '@/rules'
   import { useTaggingSessionStore } from '@/stores'
   import { Button } from '@/ui-mine'
   ```

### 7.2 Code Rules

**`rules/` Layer:**
- ✅ Pure functions only
- ❌ NO React imports
- ❌ NO side effects
- ❌ NO database access
- ❌ NO store access
- ✅ Deterministic (same inputs → same outputs)

**`features/` Layer:**
- ✅ Composers MAY access stores
- ✅ Composers MAY access database
- ✅ Sections receive props ONLY (no store/DB)
- ✅ Blocks receive props ONLY (no store/DB)
- ✅ Call pure functions from `rules/`

**`data/` Layer:**
- ✅ Database CRUD operations
- ✅ Entity-specific logic
- ❌ NO UI logic
- ❌ NO React imports

**`stores/` Layer:**
- ✅ UI state only (not persisted data)
- ✅ Actions are synchronous
- ✅ Use persist middleware for session recovery
- ❌ Actions should not throw (handle errors gracefully)

**`ui-mine/` Layer:**
- ✅ Visual components only
- ❌ NO domain logic
- ❌ NO database access
- ✅ MAY wrap shadcn primitives
- ✅ MAY use lucide-react internally

---

## 8. Future: Supabase Migration

### 8.1 Migration Strategy

**Current:** Dexie.js (IndexedDB) + Zustand → Local-first  
**Future:** Supabase (PostgreSQL) + TanStack Query → Cloud-first with offline support

### 8.2 ID Strategy

**Current:** Slug-based string IDs  
**Future:** UUIDs as primary keys, slugs as indexed fields

**Migration:**
```sql
-- Keep slugs for human-readability
ALTER TABLE players ADD COLUMN slug TEXT UNIQUE;
CREATE INDEX idx_players_slug ON players(slug);

-- Use UUIDs for performance
ALTER TABLE players ALTER COLUMN id TYPE UUID USING gen_random_uuid();
```

### 8.3 Tech Stack Changes

**Add:**
- TanStack Query (already installed) → Server state management
- Supabase client → Database access
- Supabase Auth → User authentication

**Update:**
- Dexie → Cache layer (not primary storage)
- Zustand → UI state only

### 8.4 Data Layer Changes

**Current Pattern:**
```typescript
// data/entities/players/player.db.ts
export async function createPlayer(player: NewPlayer) {
  const id = generateSlugId(player.first_name, player.last_name)
  await db.players.add({ ...player, id })
}
```

**Future Pattern:**
```typescript
// data/entities/players/player.db.ts
export function useCreatePlayer() {
  return useMutation({
    mutationFn: async (player: NewPlayer) => {
      const { data, error } = await supabase
        .from('players')
        .insert(player)
        .select()
        .single()
      
      if (error) throw error
      
      // Cache in Dexie for offline
      await db.players.put(data)
      
      return data
    }
  })
}
```

### 8.5 Offline-First Strategy

1. **Write:** Optimistically update Dexie cache, queue Supabase mutation
2. **Read:** Read from Dexie cache, sync from Supabase in background
3. **Sync:** Background process syncs Dexie ↔ Supabase when online
4. **Conflicts:** Last-write-wins for non-critical fields, match-level locking for critical data

### 8.6 Migration Guide

See `app/src/data/MIGRATION_GUIDE.md` for detailed migration steps.

---

## 9. Testing Strategy (MVP)

**Current Approach:**
- No formal test suite for MVP
- Manual testing in browser
- Keep `rules/` functions pure → easy to test later

**Future Testing:**
- Unit tests for `rules/` (pure functions are testable)
- Integration tests for `data/` (database operations)
- E2E tests for critical flows (Playwright/Cypress)

**Testing Readiness:**
- ✅ Pure functions in `rules/` are testable without setup
- ✅ Entity CRUD isolated in `data/` layer
- ✅ UI components receive props → easy to test
- ✅ Minimal coupling between layers

---

## 10. Performance Considerations

### 10.1 Database Queries

**Optimization:**
- Index frequently queried fields (player_id, match_id, set_id, rally_id)
- Use compound indexes for common queries
- Batch operations when possible

**Example:**
```typescript
// ❌ Slow: N queries
for (const shot of shots) {
  await db.shots.update(shot.id, { is_tagged: true })
}

// ✅ Fast: 1 batch operation
await db.shots.bulkUpdate(shots.map(s => ({ key: s.id, changes: { is_tagged: true } })))
```

### 10.2 React Performance

**Optimization:**
- Memoize expensive calculations (`useMemo`)
- Memoize callbacks (`useCallback`)
- Use Dexie's `useLiveQuery` for reactive queries
- Virtualize long lists (react-window)

**Example:**
```typescript
// ✅ Memoized calculation
const stats = useMemo(() => {
  if (!shots) return null
  return calculateServePerformance(shots, rallies, sets, playerId)
}, [shots, rallies, sets, playerId])

// ✅ Reactive query
const players = useLiveQuery(() => db.players.toArray(), [])
```

### 10.3 Video Performance

**Optimization:**
- Use blob URLs for local video files
- Preload video segments
- Use requestAnimationFrame for smooth playback
- Debounce video time updates

---

## 11. Related Documentation

| Document | Purpose |
|----------|---------|
| `DataSchema.md` | Entity definitions & relationships (single source of truth) |
| `Glossary.md` | Domain terminology & definitions |
| `.cursorrules` | Development rules & conventions |
| `specs/MVP_flowchange_spec.md` | Current feature specifications |
| `specs/specAddendumMVP.md` | Change history & decision log |
| `specs/DesignSystem.md` | UI component guidelines |
| `Global_Analysis_Card_Prompts/analytics_card_implementation_guide.md` | Analytics feature architecture |

---

## 12. Changelog

### v3.0 - 2025-12-11
- **BREAKING:** Complete architecture rewrite from actual code
- Reverse-engineered from codebase (100% accuracy)
- Documented three-phase tagging workflow
- Documented rules organization (derive/calculate/infer/validate/analytics)
- Documented multi-video support architecture
- Documented analytics card pattern
- Documented slug-based ID strategy
- Added Supabase migration guidance
- Verified tech stack against package.json and actual usage
- Removed outdated/conflicting information

### v0.9.0 - 2025-12-01
- Previous version (see git history)

---

*This document is the single source of truth for the Edge TT Match Analyser architecture.*  
*Last updated: 2025-12-11*
