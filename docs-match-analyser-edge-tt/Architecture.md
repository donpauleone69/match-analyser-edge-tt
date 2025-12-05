# Edge TT Match Analyser — Architecture

> **Project:** Edge TT Match Analyser  
> **Version:** 0.9.0  
> **Last Updated:** 2025-12-01  
> **Status:** Source of Truth

This document describes the architecture for the **Edge TT Match Analyser** application — a table tennis match video tagging and analysis tool.

**Note:** This is a separate project from "Edge TT" (the club session management app). They share domain concepts but are independent codebases.

---

## 1. Goals & Principles

### 1.1 Goals

- Clear separation of concerns
- Easy to navigate by feature
- Easy to reason about data flow
- Testable, with pure logic separated from UI code
- Local-first with future cloud sync capability
- Minimal special cases and "cleverness"

### 1.2 Principles

- **Feature-first**: Organize by domain feature (tagging, match, stats), not by technology (components, hooks)
- **Single responsibility per layer**:
  - UI composition → `features/`
  - Domain rules → `rules/`
  - State management → `stores/`
  - Shared UI → `ui-mine/`
- **Local is source of truth (for now)**: All persistent data lives in browser localStorage via Zustand; client-side state is the primary store
- **Small pieces, well named**: Filenames & exports should clearly say what they do
- **Supabase-ready**: Structure code so migration to cloud backend is straightforward

---

## 2. Tech Stack

| Layer              | Technology                                       |
| ------------------ | ------------------------------------------------ |
| **Framework**      | Vite + React 18 (SPA, client-only)               |
| **Language**       | TypeScript end-to-end                            |
| **Routing**        | React Router v6                                  |
| **State**          | Zustand with `persist` middleware (localStorage) |
| **UI**             | Tailwind CSS, custom `ui-mine/` components       |
| **Icons**          | lucide-react (used only inside `ui-mine/`)       |
| **Video**          | HTML5 Video API, FFmpeg.wasm for export          |
| **Future Backend** | Supabase (Postgres + Auth) — not yet implemented |

### 2.1 What We're NOT Using (Yet)

| Technology     | Why Not                                                  |
| -------------- | -------------------------------------------------------- |
| Next.js        | No SSR needed; Vite SPA is simpler for local-first       |
| TanStack Query | No remote data fetching yet; Zustand handles local state |
| Supabase       | Future addition; local-first for MVP                     |
| Authentication | Single-user local app for MVP                            |

---

## 3. Folder Structure

```
app/src/
  pages/              # Route components (thin, import Composers)
  features/           # Feature-specific UI & orchestration
    tagging/
      composers/      # Route-level composition
      sections/       # Page sections (larger UI regions)
      blocks/         # Smaller UI units (rows, cards, items)
      derive/         # View model derivation hooks
      models.ts       # View model types
    match/
      composers/
      sections/
      blocks/
      models.ts
    stats/
      composers/
      sections/
      blocks/
      models.ts
  rules/              # Pure domain logic (no React, no IO)
    calculateServer.ts
    deriveEndOfPoint.ts
    validateShot.ts
    types.ts          # Domain enums and types
  data/               # Data layer (Dexie + Zustand + future Supabase)
    db.ts             # Dexie database instance
    index.ts          # Central exports
    entities/         # One folder per entity
      clubs/
        club.types.ts # Types only
        club.db.ts    # Dexie operations (pure DB CRUD)
        club.store.ts # Zustand cache + orchestration
        index.ts      # Public API
      players/        # Same pattern
      matches/
      tournaments/
      sets/
      rallies/
      shots/
  ui-mine/            # Shared UI kit
    Button/
    Card/
    Badge/
    Icon/
    Dialog/
    Input/
    Label/
    Table/
    Grid/
    VideoPlayer/
    MatchPanel/
    index.ts          # Barrel exports
  components/
    ui/               # shadcn primitives (never imported directly by features)
    layout/           # AppShell, Sidebar
  helpers/            # Pure utilities
    formatTime.ts
    cn.ts
  styles/             # Global CSS, theme tokens
    index.css
```

---

## 4. Layers & Responsibilities

### 4.1 `pages/` — Routing

- Uses React Router v6
- Each route file:
  - Reads route params
  - Imports a **Composer** from `features/<feature>/composers`
  - Renders it

**Example:**

```tsx
// src/pages/TaggingScreen.tsx
import { TaggingScreenComposer } from '@/features/tagging/composers/TaggingScreenComposer'

export function TaggingScreen() {
  const { mode } = useParams<{ mode: 'framework' | 'detail' }>()
  return <TaggingScreenComposer mode={mode ?? 'framework'} />
}
```

`pages/` is for **routing only**, not business logic.

---

### 4.2 `features/` — Feature UI & Orchestration

Each domain feature has its own folder:

```
src/features/<feature>/
  composers/   # Route-level composition components
  sections/    # Page sections (larger UI regions)
  blocks/      # Smaller UI units (rows, cards, items)
  derive/      # View model derivation hooks
  models.ts    # View model types for this feature
```

#### 4.2.1 `composers/` — Route-Level Composition

- File naming: `<Thing>Composer.tsx`
- Examples:
  - `TaggingScreenComposer.tsx`
  - `MatchSetupComposer.tsx`
  - `MatchStatsComposer.tsx`
- Responsibilities:
  - Access Zustand store
  - Call derive hooks to prepare view models
  - Compose Sections and pass them data
  - Hold top-level local UI state (filters, active tabs, etc.)

#### 4.2.2 `sections/` — Page Sections

- File naming: `<Thing>Section.tsx`
- Examples:
  - `MatchPanelSection.tsx`
  - `VideoSection.tsx`
  - `SpeedControlsSection.tsx`
- Responsibilities:
  - Define layout for a zone of the page
  - Receive view models via props
  - Compose Blocks

#### 4.2.3 `blocks/` — UI Building Blocks

- File naming: `<Thing>Block.tsx`
- Examples:
  - `RallyPodBlock.tsx`
  - `ShotRowBlock.tsx`
  - `SpinGridBlock.tsx`
- Responsibilities:
  - Presentational: props in → JSX out
  - No store access
  - No domain logic

**Blocks import from `ui-mine/`, not from `components/ui/` or `lucide-react` directly.**

#### 4.2.4 `derive/` — View Model Derivation

- File naming: `derive<Thing>.ts`
- Hook naming: `useDerive<Thing>()`
- Examples:
  - `deriveRallyDetail.ts` → `useDeriveRallyDetail()`
  - `deriveEndOfPointDisplay.ts` → `useDeriveEndOfPointDisplay()`
- Responsibilities:
  - Combine store data + rules into UI-ready view models
  - Call `calculate*` functions from `rules/`
  - Make UI-level decisions (highlighting, display modes)

#### 4.2.5 `models.ts` — View Models

- TypeScript types representing what the UI needs
- Examples:
  - `RallyDetailViewModel`
  - `ShotQuestionViewModel`
  - `MatchPanelViewModel`
- **Not** database row types (those are in `rules/types.ts` or `types/`)

---

### 4.3 `rules/` — Pure Domain Logic

```
src/rules/
  serveOrder/
    calculateServer.ts
    calculateFirstServerFromState.ts
  endOfPoint/
    deriveEndOfPoint.ts
    deriveWinner.ts
    deriveLandingType.ts
  shotValidation/
    validateShot.ts
    validateServe.ts
  wingDerivation/
    deriveServeWing.ts
    deriveInferredSpin.ts
  types.ts              # Domain enums and types
```

**Naming conventions:**

| Pattern | Purpose | Example |
|---------|---------|---------|
| `calculate*` | Compute a value | `calculateServer(p1Score, p2Score, firstServer)` |
| `derive*` | Infer from other data | `deriveEndOfPoint(lastShot)` |
| `validate*` | Check validity | `validateShot(shotData)` |

**Rules:**

- **No React** — pure TypeScript functions
- **No IO** — no fetch, no localStorage, no side effects
- **Deterministic** — same inputs always produce same outputs
- **Heavily tested** — unit tests for all logic

**Example:**

```typescript
// src/rules/serveOrder/calculateServer.ts
export function calculateServer(
  p1Score: number,
  p2Score: number,
  firstServer: 'player1' | 'player2'
): 'player1' | 'player2' {
  const totalPoints = p1Score + p2Score
  
  // Deuce: alternate every serve
  if (p1Score >= 10 && p2Score >= 10) {
    return totalPoints % 2 === 0 ? firstServer : otherPlayer(firstServer)
  }
  
  // Normal: 2 serves each
  const serveBlock = Math.floor(totalPoints / 2)
  return serveBlock % 2 === 0 ? firstServer : otherPlayer(firstServer)
}
```

---

### 4.4 `data/` — Data Layer (Dexie + Zustand)

```
src/data/
  db.ts               # Dexie database instance
  index.ts            # Central exports
  entities/
    clubs/
      club.types.ts   # DBClub, NewClub types
      club.db.ts      # Pure Dexie CRUD
      club.store.ts   # Zustand cache + orchestration
      index.ts        # Public API
```

**Three-Layer Architecture:**

1. **Types Layer** (`entity.types.ts`)
   - Data shapes: `DBEntity`, `NewEntity`
   - Enums and constants
   - No dependencies

2. **DB Layer** (`entity.db.ts`)
   - Pure Dexie operations
   - Functions: `getAll()`, `getById()`, `create()`, `update()`, `remove()`
   - NO React, NO Zustand
   - Deterministic CRUD only

3. **Store Layer** (`entity.store.ts`)
   - Zustand store with in-memory cache
   - Actions: `load()`, `create()`, `update()`, `delete()`
   - Orchestrates: DB writes + cache updates + future Supabase sync
   - Components use THIS layer, never DB directly

**Which entities have stores?**
- ✅ **Clubs, Tournaments, Players, Matches** — User-facing CRUD, have stores
- ❌ **Sets, Rallies, Shots** — Managed through tagging context, DB-only

**Usage in components:**

```typescript
// Entities with stores (use the store)
import { usePlayerStore } from '@/data'

function MyComponent() {
  const { players, load, create, update } = usePlayerStore()
  
  useEffect(() => {
    load() // Loads from Dexie to cache
  }, [load])
  
  const handleCreate = async (data) => {
    await create(data) // Writes to Dexie + updates cache
    // No reload needed - cache auto-updates
  }
}

// Entities without stores (use DB directly)
import { setDb, rallyDb } from '@/data'

const sets = await setDb.getByMatchId(matchId)
const rally = await rallyDb.create(rallyData)
```

**Future Supabase sync:**

When Supabase is added:
1. Create `entity.sync.ts` files in each entity folder
2. Store actions call sync functions after DB writes:
   ```typescript
   create: async (data) => {
     const entity = await entityDb.create(data) // Dexie
     set(state => ({ entities: [...state.entities, entity] })) // Cache
     entitySync.syncToCloud(entity).catch(console.warn) // Supabase (non-blocking)
   }
   ```
3. Sync queue handles offline operations

---

### 4.5 `ui-mine/` — Shared UI Kit

```
src/ui-mine/
  Button/
    Button.tsx
    buttonStyles.ts
    buttonTypes.ts
    index.ts
  Card/
    Card.tsx
    cardStyles.ts
    cardTypes.ts
    index.ts
  Badge/
    ...
  Icon/
    Icon.tsx            # Re-exports lucide icons
    index.ts
  Modal/
    ...
  Grid/
    Grid.tsx            # 3x3 grid for spin/landing/position
    ...
  VideoPlayer/
    VideoPlayer.tsx
    parts/
      Controls.tsx
      ProgressBar.tsx
    ...
  MatchPanel/
    MatchPanel.tsx
    parts/
      RallyTree.tsx
      MatchDetails.tsx
    ...
  index.ts              # Barrel export
```

**Rules:**

- `ui-mine/` contains **only visual components** (no domain logic, no IO)
- Features import from `@/ui-mine`, **never** from `@/components/ui` or `lucide-react`
- Icons are re-exported from `ui-mine/Icon/` (use `<Icon name="Plus" />`)
- Complex components can have `parts/` subfolder
- Wraps shadcn primitives with project theming

**Available components:**
- Base: `Button`, `Card`, `Badge`
- Form: `Input`, `Label`, `Dialog`, `Table`
- Icons: `Icon` (wraps lucide-react)
- Grids: `SpinGrid`, `LandingZoneGrid`, `PositionGrid`
- Video: `SpeedControls`
- Table Tennis: All button components from `TableTennisButtons/`

**Usage:**

```tsx
// In a feature block
import { Button, Card, Badge, Icon, Input, Dialog, Table } from '@/ui-mine'

// Icons via Icon component (not direct lucide import)
<Icon name="Plus" />
<Icon name="Search" />
<Icon name="Pencil" />
```

---

### 4.6 `components/` — Low-Level Components

```
src/components/
  ui/           # shadcn primitives (NEVER import directly in features)
  layout/       # AppShell, Sidebar, Header
```

- `components/ui/` contains shadcn-generated primitives
- These are wrapped by `ui-mine/` components
- `components/layout/` contains app shell components

---

### 4.7 `helpers/` — Generic Utilities

```
src/helpers/
  formatTime.ts       # formatTime(seconds) → "01:23.45"
  cn.ts               # Tailwind class merger
  generateId.ts       # Random ID generation
```

- Pure utility functions
- No domain semantics
- No React, no IO

---

## 5. Data & State Flow

```
User Action
    ↓
Composer (calls store action)
    ↓
Store Action (updates Zustand state)
    ↓
Store State Change (triggers re-render)
    ↓
Derive Hook (combines state + rules → view model)
    ↓
Section/Block (renders view model)
```

**Example flow — End Rally:**

1. User presses `→` key
2. `TaggingScreenComposer` calls `endRallyWithoutWinner()`
3. Store action creates new Rally, clears currentRallyShots
4. Components re-render with new state
5. `useDeriveRallyDetail()` computes view model for display

---

## 6. Naming Conventions

### Components (UI)

| Type | Pattern | Example |
|------|---------|---------|
| Composer | `<Thing>Composer.tsx` | `TaggingScreenComposer.tsx` |
| Section | `<Thing>Section.tsx` | `MatchPanelSection.tsx` |
| Block | `<Thing>Block.tsx` | `RallyPodBlock.tsx` |

### Hooks

| Type | File Pattern | Export Pattern |
|------|--------------|----------------|
| Derive | `derive<Thing>.ts` | `useDerive<Thing>()` |

### Domain Logic (rules/)

| Type | Pattern | Example |
|------|---------|---------|
| Calculate | `calculate<Thing>` | `calculateServer()` |
| Derive | `derive<Thing>` | `deriveEndOfPoint()` |
| Validate | `validate<Thing>` | `validateShot()` |

### Store Actions

| Type | Pattern | Example |
|------|---------|---------|
| Create | `add<Thing>`, `create<Thing>` | `addShot()` |
| Update | `update<Thing>`, `set<Thing>` | `updateShotTime()` |
| Delete | `delete<Thing>`, `remove<Thing>` | `deleteRally()` |
| Toggle | `toggle<Thing>` | `toggleRallyHighlight()` |

---

## 7. Future: Supabase Migration

When we add Supabase, the architecture extends:

```
src/
  dataStorage/        # NEW: Remote data access
    matchesDataStorage.ts
    ralliesDataStorage.ts
    shotsDataStorage.ts
```

**Changes:**

1. `dataStorage/` functions talk to Supabase
2. Store actions call `dataStorage/` after local update
3. App startup syncs from Supabase to local store
4. `rules/` and `features/` remain unchanged

**The key insight:** By keeping `rules/` pure and `features/` focused on UI, the migration only affects `stores/` and adds `dataStorage/`.

---

## 8. File Locations Summary

| Concern | Location |
|---------|----------|
| Route definitions | `pages/` |
| Feature UI composition | `features/<feature>/composers/` |
| Page sections | `features/<feature>/sections/` |
| Small UI units | `features/<feature>/blocks/` |
| View model derivation | `features/<feature>/derive/` |
| View model types | `features/<feature>/models.ts` |
| Pure domain logic | `rules/` |
| Domain types/enums | `rules/types.ts` |
| State management | `stores/` |
| Shared UI components | `ui-mine/` |
| shadcn primitives | `components/ui/` |
| Layout components | `components/layout/` |
| Utilities | `helpers/` |
| Global styles | `styles/` |

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| `DataSchema.md` | Database schema and field definitions |
| `Glossary.md` | Term definitions for the project |
| `specs/MVP_flowchange_spec.md` | Current feature specification |
| `specs/specAddendumMVP.md` | Changelog and decisions |
| `specs/MVP_flowchange_tasks.md` | Implementation task breakdown |

---

*This document is the source of truth for Edge TT Match Analyser architecture.*

