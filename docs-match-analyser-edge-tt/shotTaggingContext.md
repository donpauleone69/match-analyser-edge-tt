# Shot Tagging Engine Context — Agent Orchestration Document

> **Version:** 1.0  
> **Created:** 2025-12-11  
> **Status:** Living Document  
> **Purpose:** Guide AI agents in implementing features, fixes, and improvements for the Shot Tagging Engine

---

## Document Purpose

This document provides comprehensive context and workflow instructions for AI agents working on the **Shot Tagging Engine** feature of the Edge TT Match Analyser. It enables agents to:

1. Understand the system architecture and user flows
2. Implement features and bug fixes systematically
3. Maintain consistency with project conventions
4. Document progress for the next agent to continue

**CRITICAL RULES:**

1. **Investigate first, implement second:** When given a problem, investigate codebase and provide 4-5 bullet points showing understanding + ask clarifying questions. Wait for user confirmation before implementing.
2. **Agent testing responsibility:** Agents must verify code correctness (TypeScript compiles, no linting errors) and can use browser automation tools to test UI interactions. For complex features requiring visual inspection or DevTools, provide detailed testing scripts for user.
3. **Test programmatically when possible:** TypeScript errors, linting, database operations can be verified without browser. Use browser tools for UI testing.
4. **Report with verification:** Include what you tested (TypeScript ✓, Linting ✓, Browser automation ✓) and what needs user verification (if any).
5. **Update progress log:** Agents must NOT modify document content above "Agent Progress Log" section. Only append new entries to the log at the bottom.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Code Organization](#architecture--code-organization)
3. [Data Flow & State Management](#data-flow--state-management)
4. [User Flows & Phases](#user-flows--phases)
5. [Database Interactions](#database-interactions)
6. [Agent Workflow — How to Implement Changes](#agent-workflow--how-to-implement-changes)
7. [Testing Strategy](#testing-strategy)
8. [Common Patterns & Conventions](#common-patterns--conventions)
9. [Known Issues & Gotchas](#known-issues--gotchas)
10. [Agent Progress Log](#agent-progress-log)

---

## System Overview

### What is the Shot Tagging Engine?

The Shot Tagging Engine is a sequential, question-based interface for tagging table tennis match videos. It enables users to:

- **Mark timestamps** of shot contacts and rally boundaries (Phase 1)
- **Answer questions** about each shot's characteristics (Phase 2)
- **Run inference** to derive additional shot attributes (Phase 3)

### Key Characteristics

- **Three-phase workflow:** Setup → Timestamp Tagging → Detail Tagging → Inference
- **Local-first:** Data saved to IndexedDB via Dexie.js, no server required
- **Multi-video support:** Matches can have multiple video segments
- **Pause/resume capability:** Sessions persist across page refreshes
- **Video-driven UI:** Constrained playback loops, speed controls, frame stepping

### Technology Stack

- **React 19** — UI components
- **TypeScript 5.9** — Type safety
- **Zustand** — UI state management (video playback, tagging session)
- **Dexie.js** — IndexedDB wrapper (primary data storage)
- **HTML5 Video API** — Video playback control
- **Tailwind CSS** — Styling
- **React Router 7** — Navigation

### File Locations

```
app/src/features/shot-tagging-engine/
├── composers/          # Route-level orchestrators
│   ├── TaggingUIComposer.tsx        # Main orchestrator (phase routing)
│   ├── Phase1TimestampComposer.tsx  # Phase 1 logic
│   ├── Phase2DetailComposer.tsx     # Phase 2 logic
│   ├── Phase3InferenceComposer.tsx  # Phase 3 logic
│   ├── dataMapping.ts               # UI ↔ DB mapping functions
│   ├── finalizeMatch.ts             # Match finalization logic
│   └── runInference.ts              # Inference execution
├── sections/           # UI regions (video, status bar, rally list, input)
│   ├── VideoPlayerSection.tsx
│   ├── StatusBarSection.tsx
│   ├── RallyListSection.tsx
│   └── UserInputSection.tsx
├── blocks/             # Presentational components
│   ├── Phase1ControlsBlock.tsx      # Phase 1 buttons (serve/shot, end conditions)
│   ├── SetupControlsBlock.tsx       # Setup UI (starting score, server)
│   ├── SequentialQuestionBlock.tsx  # Phase 2 question UI
│   ├── RallyCard.tsx                # Rally display
│   ├── ShotListItem.tsx             # Shot display
│   └── [20+ other blocks]
├── layouts/            # Layout templates
│   └── PhaseLayoutTemplate.tsx      # 4-section layout (video, status, list, input)
└── index.ts            # Public API
```

---

## Architecture & Code Organization

### Layer Structure

The Shot Tagging Engine follows the project's feature-first architecture:

```
┌─────────────────────────────────────────┐
│  Pages (Route Components)               │  ← Thin, just imports composers
│  app/src/pages/ShotTaggingEngine.tsx    │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Composers (Orchestration Layer)        │  ← Route-level logic, state management
│  - TaggingUIComposer (phase routing)    │  ← Access stores, call hooks, handle events
│  - Phase1TimestampComposer              │  ← Coordinate DB saves
│  - Phase2DetailComposer                 │
│  - Phase3InferenceComposer              │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Sections (UI Regions)                  │  ← Receive view models via props
│  - VideoPlayerSection                   │  ← NO store access
│  - StatusBarSection                     │  ← NO business logic
│  - RallyListSection                     │
│  - UserInputSection                     │
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Blocks (Presentational Components)     │  ← Props in → JSX out
│  - Phase1ControlsBlock                  │  ← Pure presentation
│  - RallyCard, ShotListItem              │  ← NO store access
│  - SequentialQuestionBlock              │  ← NO side effects
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Rules (Pure Domain Logic)              │  ← NO React, NO IO
│  - calculateServer()                    │  ← Pure functions
│  - deriveRally_winner_id()              │  ← Deterministic
│  - validateSetScore()                   │  ← Testable
└─────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────┐
│  Data Layer (Persistence)               │  ← Dexie.js + Zustand
│  - rallyDb, shotDb, setDb               │  ← CRUD operations
│  - Database entities                    │  ← IndexedDB tables
└─────────────────────────────────────────┘
```

### Naming Conventions

**Composers:**
- `<Thing>Composer.tsx` → `TaggingUIComposer.tsx`
- Entry point for feature orchestration

**Sections:**
- `<Thing>Section.tsx` → `VideoPlayerSection.tsx`
- Large UI regions within a page

**Blocks:**
- `<Thing>Block.tsx` → `Phase1ControlsBlock.tsx`
- Smaller, reusable UI components

**Rules:**
- `calculate<Thing>()` → `calculateServer()`
- `derive<Thing>()` → `deriveRally_winner_id()`
- `validate<Thing>()` → `validateSetScore()`
- `infer<Thing>()` → `inferShotType()`

**Store Actions:**
- Create: `add<Thing>`, `create<Thing>`
- Update: `update<Thing>`, `set<Thing>`
- Delete: `delete<Thing>`, `remove<Thing>`
- Toggle: `toggle<Thing>`

---

## Data Flow & State Management

### State Layers

The Shot Tagging Engine uses three state layers:

#### 1. Database State (Source of Truth)
- **Technology:** IndexedDB via Dexie.js
- **Entities:** `matches`, `sets`, `rallies`, `shots`, `shotInferences`
- **Persistence:** Permanent (survives page refresh, session end)
- **Access:** Via `db` modules (`rallyDb`, `shotDb`, `setDb`)

**Example:**
```typescript
// Save rally to database
const savedRally = await rallyDb.create({
  set_id: setId,
  rally_index: rallyIndex,
  server_id: serverId,
  // ... other fields
})

// Query rallies
const rallies = await rallyDb.getBySetId(setId)
```

#### 2. UI State (Zustand Stores)
- **Technology:** Zustand with persist middleware
- **Stores:**
  - `useVideoPlaybackStore` — Video controls (currentTime, isPlaying, playbackSpeed)
  - `useTaggingSessionStore` — Session data (matchId, setNumber, phase)
- **Persistence:** localStorage (survives page refresh)
- **Access:** Via React hooks

**Example:**
```typescript
// Access video state
const currentTime = useVideoPlaybackStore(state => state.currentTime)
const setVideoUrl = useVideoPlaybackStore(state => state.setVideoUrl)

// Update video state
setVideoUrl(blobUrl)
setSpeedMode('tag') // Sets playback to 0.5x
```

#### 3. Component State (React useState)
- **Technology:** React hooks
- **Scope:** Component-local (lost on unmount)
- **Use cases:** UI interactions, temporary data, derived state
- **Access:** Via `useState`, `useRef`

**Example:**
```typescript
const [currentShots, setCurrentShots] = useState<Phase1Shot[]>([])
const [rallyState, setRallyState] = useState<RallyState>('before-serve')
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION (button click, video seek)                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ COMPOSER (event handler)                                    │
│ - Updates local state (React useState)                      │
│ - Calls rules/* functions (pure logic)                      │
│ - Saves to database (async)                                 │
│ - Updates Zustand stores (UI state)                         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (IndexedDB)                                        │
│ - Rally, Shot, Set records saved                            │
│ - Primary source of truth                                   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ UI RE-RENDER                                                │
│ - React re-renders with updated state                       │
│ - Video player seeks to new position                        │
│ - Rally list updates with new rally                         │
└─────────────────────────────────────────────────────────────┘
```

### State Synchronization Rules

1. **Database is source of truth** — Always query DB for data on mount/resume
2. **Save as you go** — Don't wait for "save" button, persist immediately
3. **Optimistic UI** — Update React state immediately, save async in background
4. **Resume from DB** — On page load, reconstruct state from database records
5. **Video storage** — Videos stored in IndexedDB separately, referenced by `sessionId`

---

## User Flows & Phases

### Phase 0: Session Initialization

**Entry Point:** `/matches/:matchId/tag?set=1`

**Steps:**
1. `TaggingUIComposer` checks URL params for `matchId` and `set` number
2. Queries database for existing rallies/shots for this set
3. Loads video from IndexedDB (key: `{matchId}-{setNumber}`)
4. Determines current phase from set record (`tagging_phase` field)
5. Routes to appropriate phase composer

**Resume Logic:**
- If `tagging_phase === 'not_started'` → Show Phase 1 setup
- If `tagging_phase === 'phase1_in_progress'` → Resume Phase 1
- If `tagging_phase === 'phase1_complete'` → Jump to Phase 2
- If `tagging_phase === 'phase2_in_progress'` → Resume Phase 2
- If `tagging_phase === 'phase2_complete'` → Show Phase 3 prompt

**Redo Logic:**
- URL param `?redo=true` → Delete all tagging data, restart Phase 1
- URL param `?redo=phase2` → Keep Phase 1 data, restart Phase 2

---

### Phase 1: Timestamp Capture (Match Framework)

**Component:** `Phase1TimestampComposer.tsx`

**Purpose:** Mark shot contact times and rally boundaries

**UI Layout:**
- **Left Sidebar:** Rally list (newest first) with shot details
- **Video Player:** Video with tagging controls (frame step, shot back/forward, delete)
- **Status Bar:** Rally count, shot count, scores, speed indicator, "Save Set" button
- **User Input:** Phase 1 button grid (5 buttons: Long | Net | Forced Error | Winner | Serve/Shot)

**Setup Flow (before tagging):**
1. User selects starting score (0-20 for each player)
2. User selects next server (Player 1 or Player 2)
3. User clicks "Start"
4. System creates stub rallies for points before video starts
5. System saves setup data to `sets` table
6. Enters tagging mode

**Tagging Flow:**
1. User presses "Serve" when serve occurs
   - Video slows to "tag speed" (0.5x)
   - Shot recorded at current timestamp
   - Rally state: `before-serve` → `after-serve`
2. User presses "Shot" for each subsequent contact
   - Shot recorded at current timestamp
   - Added to current rally
3. User presses end condition button (Long | Net | Forced Error | Winner)
   - Rally completed with end condition
   - Winner calculated based on last shot player + end condition
   - Score updated automatically
   - Rally + shots saved to database immediately
   - Video speeds up to "FF speed" (2x)
   - Reset for next rally

**Navigation & Undo:**
- **Shot Back:** Jump to previous shot timestamp, pause
- **Shot Forward:** Jump to next shot timestamp (or back to live)
- **Delete:** Remove last tag, revert score if rally-end deleted

**Set Completion:**
- User clicks "Save Set" when set complete
- System marks set as `phase1_complete`
- Transitions to Phase 2

**Data Saved:**
- `rallies` table: rally_index, server_id, receiver_id, winner_id, scores, timestamps
- `shots` table: shot_index, player_id, timestamp_start, timestamp_end, shot_result
- `sets` table: tagging progress, setup data

---

### Phase 2: Shot Detail Tagging

**Component:** `Phase2DetailComposer.tsx`

**Purpose:** Answer questions about each shot's characteristics

**UI Layout:**
- **Left Sidebar:** Rally list with current shot highlighted
- **Video Player:** Constrained playback loop (±250ms around shot contact)
- **Status Bar:** Rally/Shot progress, current question label, player indicator
- **User Input:** Dynamic button grids for current question

**Question Sequences:**

**Serves (Shot #1):**
1. Direction (6 options: left-left, left-mid, left-right, right-left, right-mid, right-right)
2. Length (3 options: short, half-long, deep)
3. Spin (3 options: underspin, no-spin, topspin)

**Receives (Shot #2):**
1. Stroke + Quality (toggle: average/high, buttons: backhand/forehand)
2. Direction (dynamic 3×3 grid based on serve landing)
3. Intent (3 options: defensive, neutral, aggressive)

**Regular Shots (Shot #3+):**
1. Stroke + Quality (toggle: average/high, buttons: backhand/forehand)
2. Direction (dynamic 3×3 grid based on previous shot landing)
3. Intent (3 options: defensive, neutral, aggressive)

**Error Shots (last shot in error rallies):**
1. Stroke + Quality
2. Direction (target of error)
3. Intent
4. Error Placement (net or long) — only for forced errors
5. Error Type (forced or unforced)

**Auto-Advance:**
- After answering last question for shot, automatically advances to next shot
- Video seeks to next shot's loop range
- Process repeats until all shots complete

**Data Saved:**
- `shots` table: shot_origin, shot_target, shot_length, serve_spin_family, shot_wing, intent, shot_quality, rally_end_role
- Database updates happen immediately after each shot's last question
- `sets` table: phase2_last_shot_index updated for resume capability

**Completion:**
- After last shot answered, transitions to Phase 3

---

### Phase 3: Inference (Optional)

**Component:** `Phase3InferenceComposer.tsx`

**Purpose:** Run probabilistic inference algorithms on tagged shots

**UI:**
- Modal prompt: "Run Analysis" or "Skip for Now"
- Progress indicator during execution
- Completion message on success

**Inference Fields:**
- `shot_type` (e.g., "fh_loop_vs_under", "bh_flick")
- `shot_contact_timing` (early, peak, late)
- `player_position` (left, middle, right)
- `player_distance` (close, mid, far)
- `shot_spin` (heavy_topspin, topspin, no_spin, backspin, heavy_backspin)
- `shot_speed` (slow, medium, fast)
- `shot_arc` (low, medium, high)
- `is_third_ball_attack` (boolean)
- `is_receive_attack` (boolean)

**Data Saved:**
- `shots` table: inferred fields populated
- `shot_inferences` table: inference records for trackability

**Completion:**
- Shows success screen with options:
  - Back to Matches
  - View Data (analytics)
  - Tag Next Set

---

## Database Interactions

### Entity Relationships

```
Sets (1) ──→ (N) Rallies (1) ──→ (N) Shots (1) ──→ (N) ShotInferences
   │                  │                  │
   │                  │                  │
   └──────────────────┴──────────────────┴──────→ MatchVideos
```

### Key Database Operations

#### Phase 1: Save Rally + Shots

```typescript
// 1. Get existing rallies for rally_index calculation
const existingRallies = await rallyDb.getBySetId(setId)
const maxRallyIndex = existingRallies.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
const rallyIndex = maxRallyIndex + 1

// 2. Calculate scores before/after
const scoreBefore = previousRally 
  ? { player1: previousRally.player1_score_after, player2: previousRally.player2_score_after }
  : setupStartingScore

const scoreAfter = {
  player1: winnerId === 'player1' ? scoreBefore.player1 + 1 : scoreBefore.player1,
  player2: winnerId === 'player2' ? scoreBefore.player2 + 1 : scoreBefore.player2,
}

// 3. Save rally
const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
dbRally.player1_score_before = scoreBefore.player1
dbRally.player2_score_before = scoreBefore.player2
dbRally.player1_score_after = scoreAfter.player1
dbRally.player2_score_after = scoreAfter.player2
dbRally.timestamp_start = rally.shots[0].timestamp
dbRally.timestamp_end = rally.endTimestamp
const savedRally = await rallyDb.create(dbRally)

// 4. Save shots
for (let i = 0; i < rally.shots.length; i++) {
  const shot = rally.shots[i]
  const nextShot = rally.shots[i + 1]
  const isLastShot = i === rally.shots.length - 1
  
  const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
  const playerId = shotPlayer === 'player1' ? player1Id : player2Id
  
  const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId, isLastShot, rally.endCondition)
  dbShot.timestamp_end = nextShot ? nextShot.timestamp : rally.endTimestamp
  
  await shotDb.create(dbShot)
}

// 5. Update set progress
await setDb.update(setId, {
  tagging_phase: 'phase1_in_progress',
  phase1_last_rally: rallyIndex,
  has_video: true,
})
```

#### Phase 2: Update Shot Details

```typescript
// Get shot from database
const dbShot = await shotDb.getById(shotId)

// Build update object
const updates: Partial<DBShot> = {}

// Map UI values to DB format
if (direction) {
  const { origin, target } = mapDirectionToOriginTarget(direction)
  updates.shot_origin = origin
  updates.shot_target = target
}

if (length) {
  updates.shot_length = mapShotLengthUIToDB(length)
}

if (spin) {
  updates.serve_spin_family = mapServeSpinUIToDB(spin)
}

if (stroke) {
  updates.shot_wing = mapStrokeUIToDB(stroke)
}

if (intent) {
  updates.intent = intent
}

if (shotQuality) {
  updates.shot_quality = shotQuality
}

// Save to database
await shotDb.update(shotId, updates)

// Update set progress
await setDb.update(setId, {
  tagging_phase: 'phase2_in_progress',
  phase2_last_shot_index: currentShotIndex + 1,
})
```

### Database Schema (Key Fields)

**Sets:**
```typescript
{
  id: string                          // {match_id}-s{num}
  match_id: string
  set_number: number
  tagging_phase: 'not_started' | 'phase1_in_progress' | 'phase1_complete' | 'phase2_in_progress' | 'phase2_complete'
  phase1_last_rally: number | null
  phase1_total_rallies: number | null
  phase2_last_shot_index: number | null
  phase2_total_shots: number | null
  setup_starting_score_p1: number | null
  setup_starting_score_p2: number | null
  setup_next_server_id: string | null
}
```

**Rallies:**
```typescript
{
  id: string                          // {set_id}-r{num}
  set_id: string
  rally_index: number
  video_id: string | null
  server_id: string
  receiver_id: string
  winner_id: string | null
  player1_score_before: number
  player2_score_before: number
  player1_score_after: number
  player2_score_after: number
  timestamp_start: number | null
  timestamp_end: number | null
  point_end_type: 'serviceFault' | 'receiveError' | 'forcedError' | 'unforcedError' | 'winnerShot' | null
  is_stub_rally: boolean
}
```

**Shots:**
```typescript
{
  id: string                          // {rally_id}-sh{num}
  rally_id: string
  player_id: string
  shot_index: number
  timestamp_start: number
  timestamp_end: number | null
  // Phase 1 fields
  shot_result: 'in_net' | 'missed_long' | 'missed_wide' | 'in_play' | 'fault'
  shot_label: 'serve' | 'receive' | 'third_ball' | 'rally_shot'
  is_rally_end: boolean
  rally_end_role: 'winner' | 'forced_error' | 'unforced_error' | 'none'
  // Phase 2 fields
  shot_origin: 'left' | 'mid' | 'right' | null
  shot_target: 'left' | 'mid' | 'right' | null
  shot_length: 'short' | 'half_long' | 'long' | null
  serve_spin_family: 'under' | 'top' | 'no_spin' | 'side' | null
  shot_wing: 'FH' | 'BH' | null
  intent: 'defensive' | 'neutral' | 'aggressive' | null
  shot_quality: 'high' | 'average' | null
  // Phase 3 fields (inferred)
  shot_type: string | null
  player_position: 'left' | 'middle' | 'right' | null
  player_distance: 'close' | 'mid' | 'far' | null
  shot_spin: string | null
  shot_speed: 'slow' | 'medium' | 'fast' | null
  shot_arc: 'low' | 'medium' | 'high' | null
}
```

---

## Agent Workflow — How to Implement Changes

**CRITICAL:** You must implement AND test end-to-end. The user will clarify requirements but will NOT test during implementation. You are responsible for complete verification using browser tools.

### The 4-Step Workflow

---

### Step 0: Investigation & Confirmation (Before Implementation)

**REQUIRED FIRST STEP:**

When user provides a simple problem description:

1. **Read this context document** — Understand architecture
2. **Investigate the codebase** — Find relevant files and code
3. **Provide brief summary** — 4-5 bullet points showing:
   - ✅ Understanding of the problem
   - ✅ Root cause identified
   - ✅ Proposed solution approach
   - ✅ Files that need changes
   - ✅ Testing approach
4. **Ask clarification questions** — If anything unclear
5. **Wait for user confirmation** — Don't implement until user approves

**Example Output:**
```
Understanding:
• Problem: Shot log highlighting not working in Phase 1
• Root cause: activeTagIndex state not updating on shot navigation
• Solution: Fix state updates in handleShotBack/Forward functions
• Files: Phase1TimestampComposer.tsx (3 functions to modify)
• Testing: Navigate shots, verify highlighting with browser inspection

Questions:
• Should highlighting persist after rally complete?
• Any specific color/style requirements?
```

**Only proceed to Step 1 after user confirms.**

---

### Step 1: Understand & Plan (Quick)

**Actions:**
1. Based on approved approach from Step 0
2. Identify implementation order (types → DB → rules → composers → UI)
3. Mental checklist: Dependencies, edge cases, testing scenarios

**Output:** Clear implementation plan

---

### Step 2: Implement (Read → Edit → Test Loop)

**Actions:**
1. **Read existing code first** — Always use `read_file` before editing
2. **Make changes incrementally** — One file at a time, test as you go
3. **Follow patterns** — Match existing code style and conventions
4. **Test immediately** — After each significant change, verify in browser

**Implementation Order:**
```
Types/Interfaces → Database Layer → Rules → Composers → Sections → Blocks
```

**Guidelines:**
- ✅ Read full files before modifying them
- ✅ Keep changes minimal and focused
- ✅ Use existing helper functions (calculateServer, deriveRally_winner_id, etc.)
- ✅ Update TypeScript types consistently
- ❌ Don't duplicate logic - reuse from rules/*
- ❌ Don't add business logic to blocks (keep presentational)
- ❌ Don't skip database saves for features that need persistence

**Test As You Go:**
```
Change types → Check TypeScript errors
Update composer → Test in browser (does button appear?)
Add database save → Check IndexedDB (is data saved?)
```

---

### Step 3: Verify End-to-End (Required)

**Agent Testing Levels:**

**Level 1: Always Required (Agent Can Do)**
- ✅ TypeScript compiles without errors
- ✅ No linting errors
- ✅ Code follows project patterns
- ✅ Rules/* functions tested with Vitest (if applicable)
- ✅ Database operations coded correctly

**⚠️ Terminal Usage Warning:**
- Terminal commands can hang - use sparingly
- Only for: TypeScript check, linting, Vitest run-once
- Avoid: Dev server, watch modes, interactive prompts

**Level 2: Browser Automation (Agent Can Do)**
- ✅ Start dev server (`npm run dev`)
- ✅ Navigate to feature in browser
- ✅ Click buttons and verify interactions
- ✅ Take screenshots of UI state
- ⚠️ Note: Cannot inspect IndexedDB or Console directly

**Level 3: User Testing (When Needed)**
- 🤝 Complex visual verification
- 🤝 IndexedDB data inspection via DevTools
- 🤝 Console error checking
- 🤝 Resume functionality testing

**Testing Strategy:**

**1. Code Quality Checks:**
```bash
# Only if making significant changes - terminal may hang
cd app
npm run build     # TypeScript compilation
npm run lint      # ESLint check
```

**2. Test Rules/* Functions (If Changed):**
```bash
# Only for pure function changes
cd app
npm run test:run  # Run tests once, exit immediately
```

**3. Database Inspection (Browser Console):**
Use `window.dbInspect` API to verify database operations programmatically.

**4. Browser Automation (For UI Testing):**
Use browser tools to navigate and test feature interactions.

**5. Provide Testing Script (For User If Needed):**

**Minimal Test Checklist:**
- [ ] Feature works in happy path (primary use case)
- [ ] No console errors
- [ ] Database saves correctly (check IndexedDB)
- [ ] Page refresh doesn't break it (resume works)
- [ ] Edge cases handled (empty state, rapid clicks, etc.)

**Phase-Specific Testing:**

**If you changed Phase 1:**
- [ ] Button appears and is clickable
- [ ] Rally saves to database (check `rallies` and `shots` tables)
- [ ] Score updates correctly
- [ ] Rally appears in shot log
- [ ] Delete/undo works
- [ ] Resume from page refresh works

**If you changed Phase 2:**
- [ ] Question appears correctly
- [ ] Button click saves to database (check `shots` table)
- [ ] Auto-advances to next question/shot
- [ ] Resume from page refresh works

**If you changed database schema:**
- [ ] All CRUD operations work
- [ ] Resume from existing data works (backward compatible)
- [ ] No migration errors in console

**Verify Database Records:**

Use the Database Inspection API in browser console:

```javascript
// Quick inspection (recommended)
const data = await window.dbInspect.inspectSet('your-set-id')
console.log(data.summary)    // Shows counts and progress
console.table(data.rallies)  // All rallies in table format
console.table(data.shots)    // All shots in table format

// Check specific field in last rally
console.log(data.rallies[data.rallies.length - 1].your_new_field)

// Verify Phase 2 completion
const check = await window.dbInspect.verifyShotDetails('your-set-id')
console.log(check)  // Shows complete/incomplete shots

// Check data consistency
const consistency = await window.dbInspect.checkConsistency('your-set-id')
console.log(consistency)  // Lists any issues
```

**Common Issues to Check:**
- TypeScript errors → Fix all type mismatches
- Database errors → Verify field names match schema exactly
- State not updating → Check useState/Zustand setters called
- Video issues → Check timestamp calculations
- Resume broken → Verify data loads from DB on mount

**If Something Doesn't Work:**
1. Check console for errors
2. Check IndexedDB for saved data
3. Add console.logs to trace execution
4. Fix the issue
5. Re-test
6. Remove debug console.logs

---

### Step 4: Document & Clean Up

**Actions:**

**1. Clean Up Code:**
- Remove debug console.logs
- Remove commented-out code
- Remove temporary files
- Ensure consistent formatting

**2. Update Progress Log:**
Scroll to bottom of this document and add entry:

```markdown
### YYYY-MM-DD: [Feature/Fix Title]

**Changes Made:**
- File: `path/to/file.tsx` — What changed
- File: `path/to/other.ts` — What changed

**Testing Performed:**
- ✅ Feature works in browser (describe what you tested)
- ✅ Database saves correctly (verified in IndexedDB)
- ✅ Resume works (page refresh test passed)
- ✅ No console errors

**Issues Remaining:**
- None (or list any known limitations)

**Notes for Next Agent:**
- Important context or gotchas discovered
```

**3. Report to User:**
Summarize what you implemented and tested. Be specific about verification steps.

---

## Quick Reference: Testing Commands

**⚠️ IMPORTANT: Avoid Terminal Commands When Possible**
- Terminal/console commands can hang and require user intervention
- Only use terminal for: `npm run build` (TypeScript check), `npm run lint` (linting)
- DO NOT use terminal for: Running dev server, running tests in watch mode
- Instead: Use browser automation tools to test the running app

**Start Dev Server (If Needed):**
```bash
cd app
npm run dev
```
**Note:** Only run if you need to test in browser. Otherwise skip terminal commands.

**Vitest Testing (Rules Layer):**

Test pure functions without browser:

```bash
# Check TypeScript + Run tests once (recommended)
cd app
npm run test:run

# DO NOT use watch mode (hangs terminal)
# npm test  ❌
```

**Create Tests:**
```typescript
// app/src/rules/calculate/yourFunction.test.ts
import { describe, it, expect } from 'vitest'
import { yourFunction } from './yourFunction'

describe('yourFunction', () => {
  it('should handle normal case', () => {
    const result = yourFunction({ input: 'test' })
    expect(result).toBe('expected')
  })
})
```

**Database Inspection API (Browser Console):**

The app automatically loads a database inspection API in development mode. Open browser console and use:

```javascript
// Inspect a specific set (most common)
const data = await window.dbInspect.inspectSet('match-123-s1')
console.log(data.summary)          // Quick overview
console.table(data.rallies)        // All rallies
console.table(data.shots)          // All shots

// Inspect a specific rally
const rally = await window.dbInspect.inspectRally('match-123-s1-r5')
console.table(rally.shots)

// Check if shot details are complete (Phase 2)
const check = await window.dbInspect.verifyShotDetails('match-123-s1')
console.log(check)  // Shows completion status

// Check data consistency (scores, timestamps)
const consistency = await window.dbInspect.checkConsistency('match-123-s1')
console.log(consistency)  // Lists any issues

// Inspect entire match
const matchData = await window.dbInspect.inspectMatch('match-123')
console.log(matchData.summary)

// Get database summary (all entities)
const summary = await window.dbInspect.inspectAllData()
console.log(summary)

// Export set data as JSON file
await window.dbInspect.exportSetData('match-123-s1')
```

**Available Functions:**
- `inspectSet(setId)` - Get all data for a set
- `inspectMatch(matchId)` - Get all data for a match
- `inspectRally(rallyId)` - Get rally and its shots
- `verifyShotDetails(setId)` - Check Phase 2 completion
- `checkConsistency(setId)` - Validate data integrity
- `inspectAllData()` - Get counts for all entities
- `exportSetData(setId)` - Download JSON export

**Direct Database Queries (If Needed):**
```javascript
// Import database modules
const { rallyDb, shotDb, setDb } = await import('./data')

// Get rallies
const rallies = await rallyDb.getBySetId('set-id')
console.table(rallies)

// Get shots
const shots = await shotDb.getBySetId('set-id')
console.table(shots)
```

---

## Testing Strategy

**AGENTS MUST TEST EVERYTHING** — User will NOT test during implementation.

### Quick Testing Approach

**1. Start Dev Server:**
```bash
cd app
npm run dev
```

**2. Open Browser → DevTools:**
- Console tab open (watch for errors)
- Application tab → IndexedDB (verify data)

**3. Test Your Change:**
- Try the feature (happy path)
- Try edge cases (empty state, rapid clicks, delete)
- Refresh page (resume must work)
- Check IndexedDB (data must be saved)
- Check console (no errors allowed)

### Phase-Specific Test Checklists

**Phase 1 Changes:**
```
✅ Button appears/works
✅ Rally saved to DB (check IndexedDB)
✅ Shot log updates
✅ Score correct
✅ Delete/undo works
✅ Page refresh → resume works
```

**Phase 2 Changes:**
```
✅ Question appears
✅ Answer saves to DB (check IndexedDB)
✅ Auto-advances
✅ Page refresh → resume works
```

**Database Changes:**
```
✅ Create works
✅ Read works
✅ Update works
✅ Delete works
✅ Existing data still loads (backward compatible)
```

### Database Verification (Browser Console)

```javascript
// Get rallies for a set
const rallies = await rallyDb.getBySetId('set-id')
console.table(rallies)

// Get shots for a set
const shots = await shotDb.getBySetId('set-id')
console.table(shots)

// Check specific field
console.log(shots[0].your_new_field)
```

### If Something Breaks

1. **Console errors?** → Read error message, fix issue
2. **Data not saving?** → Check IndexedDB, verify DB calls
3. **Resume broken?** → Check data loads on mount
4. **TypeScript errors?** → Fix type mismatches
5. **State not updating?** → Check useState/Zustand setters

**DO NOT report to user until everything works.**

---

## Common Patterns & Conventions

### Import Rules

**DO:**
- ✅ Import from `@/ui-mine` for shared UI components
- ✅ Import from `@/rules` for domain logic
- ✅ Import from `@/data` for database operations
- ✅ Import from `@/helpers` for utilities

**DON'T:**
- ❌ Import from `@/components/ui` in features (use `@/ui-mine` instead)
- ❌ Import `lucide-react` directly (use `@/ui-mine/Icon` instead)
- ❌ Import composers from blocks (only sections should import composers)

### File Structure Patterns

**Composer Pattern:**
```typescript
// 1. Imports
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '@/data'
import { calculateServer } from '@/rules'

// 2. Types/Interfaces
export interface Phase1ComposerProps {
  // ...
}

// 3. Component
export function Phase1Composer({ ... }: Phase1ComposerProps) {
  // 3a. State
  const [state, setState] = useState(...)
  
  // 3b. Refs
  const ref = useRef(...)
  
  // 3c. Effects
  useEffect(() => { ... }, [deps])
  
  // 3d. Event handlers
  const handleClick = () => { ... }
  
  // 3e. Render
  return (
    <PhaseLayoutTemplate ... />
  )
}
```

**Block Pattern:**
```typescript
// 1. Imports
import { cn } from '@/helpers/utils'
import { Button } from '@/ui-mine'

// 2. Types/Interfaces
export interface MyBlockProps {
  // Props only, no store access
  value: string
  onChange: (value: string) => void
}

// 3. Component (presentational only)
export function MyBlock({ value, onChange }: MyBlockProps) {
  return (
    <div className="...">
      <Button onClick={() => onChange('new-value')}>
        {value}
      </Button>
    </div>
  )
}
```

### Rules Layer Patterns

**Pure Functions Only:**
```typescript
// ✅ GOOD: Pure function, no side effects
export function calculateServer(params: ServerParams): ServerResult {
  const totalPoints = params.player1Score + params.player2Score
  const serviceChange = Math.floor(totalPoints / 2)
  // ... deterministic logic
  return { serverId, receiverId }
}

// ❌ BAD: Side effects (database call)
export function calculateServer(params: ServerParams): ServerResult {
  const rally = await rallyDb.getById(params.rallyId) // ❌ async I/O
  // ...
}

// ❌ BAD: React dependency
export function calculateServer(params: ServerParams): ServerResult {
  const [state, setState] = useState(...) // ❌ React hook
  // ...
}
```

### Database Save Patterns

**Save Immediately (Optimistic UI):**
```typescript
// Update local state first (optimistic)
setRallies(prev => [...prev, newRally])

// Save to DB async (don't block UI)
saveRallyToDB(newRally).catch(console.error)
```

**Resume from DB (Source of Truth):**
```typescript
useEffect(() => {
  const loadData = async () => {
    const rallies = await rallyDb.getBySetId(setId)
    setRallies(rallies)
  }
  loadData()
}, [setId])
```

---

## Known Issues & Gotchas

### Performance Issues
- **Video player lag:** Known issue, especially on older hardware
- **Seek accuracy:** May not be frame-perfect
- **Speed switching delay:** Noticeable lag when changing playback speed

### Data Consistency
- **Score mismatches:** If user deletes rally, score may be inconsistent
- **Stub rallies:** Created from setup, don't have video timestamps
- **Resume state:** Phase 1 resume doesn't fully restore navigation state

### UI/UX Issues
- **No back navigation in Phase 2:** Can't go back to previous shot
- **Quality toggle:** Must be set before stroke selection (counterintuitive)
- **Dynamic direction grid:** May show wrong options if previous shot direction not set

### Edge Cases
- **Empty rallies:** If user presses "Serve" then immediately presses end condition, rally has 1 shot
- **Set end detection:** Shows warning but doesn't prevent continued tagging
- **Resume with missing video:** If video not in IndexedDB, user must re-select

### Browser Compatibility
- **IndexedDB:** Works in Chrome, Firefox, Safari (not IE11)
- **Video formats:** MP4 (H.264) recommended for best compatibility
- **Blob URLs:** Limited by available RAM (large videos may cause issues)

---

## Agent Progress Log

**INSTRUCTIONS FOR AGENTS:**
- Do NOT modify any content above this section
- Add new entries at the BOTTOM of this log (newest entries last)
- Use the template format for consistency
- Be specific about changes and testing

---

### 2025-12-11: Initial Document Creation

**Changes Made:**
- Created `shotTaggingContext.md` orchestration document
- Documented system architecture, user flows, database interactions
- Defined agent workflow for implementing features/fixes
- Established progress logging template

**Testing Performed:**
- N/A (documentation only)

**Issues Remaining:**
- None (initial version)

**Notes for Next Agent:**
- This is the first version of the orchestration document
- Follow the agent workflow steps for all future changes
- Always update this log with your progress
- Consult the "Known Issues & Gotchas" section when debugging

---

### 2025-12-11: Streamlined Workflow & Testing Requirements

**Changes Made:**
- **Reduced workflow from 7 steps to 4 steps** — Removed planning overhead
- **Emphasized agent-led testing** — Agents must test everything, user will NOT test during implementation
- **Added "test as you go" approach** — Verify in browser after each change
- **Updated critical rules section** — Clear expectations at top of document
- **Simplified testing strategy** — Quick checklists instead of comprehensive plans
- **Added browser DevTools emphasis** — Console + IndexedDB inspection required

**Workflow Changes:**
- Step 1: Understand & Plan (quick mental model)
- Step 2: Implement (read → edit → test loop)
- Step 3: Verify End-to-End (complete browser testing, no user involvement)
- Step 4: Document & Clean Up (progress log update)

**Testing Requirements:**
- ✅ Agents run dev server and test in browser
- ✅ Use DevTools Console to check for errors
- ✅ Use IndexedDB inspection to verify data saves
- ✅ Test resume functionality (page refresh)
- ✅ Test edge cases (rapid clicks, empty state, delete)
- ✅ Only report to user when fully working

**Rationale:**
- Keep agent context window fresh (less planning, more doing)
- Reduce bloat while maintaining accuracy
- Make testing non-negotiable and built into workflow
- User clarifies requirements but doesn't test during implementation

**Testing Performed:**
- N/A (documentation update)

**Issues Remaining:**
- None

**Notes for Next Agent:**
- New workflow is much faster but still rigorous
- You MUST test everything in browser before reporting
- Use browser DevTools heavily (Console + IndexedDB tabs)
- Report only when feature is complete and verified

---

### 2025-12-11: Database Inspection API for Programmatic Testing

**Changes Made:**
- **Created** `app/src/helpers/devInspectDB.ts` — Comprehensive database inspection API
- **Updated** `app/src/main.tsx` — Auto-loads inspection API in development mode
- **Updated** documentation — Added usage examples throughout

**API Functions Added:**
1. `inspectSet(setId)` — Get all data for a set with summary
2. `inspectMatch(matchId)` — Get all data for a match
3. `inspectRally(rallyId)` — Get rally with its shots
4. `verifyShotDetails(setId)` — Check Phase 2 completion status
5. `checkConsistency(setId)` — Validate data integrity (scores, timestamps, indices)
6. `inspectAllData()` — Get entity counts across entire database
7. `exportSetData(setId)` — Export set data as JSON file

**Features:**
- ✅ Automatically available at `window.dbInspect` in dev mode
- ✅ No imports needed in browser console
- ✅ Pretty-printed summaries with counts and progress
- ✅ Data consistency validation (catches score/timestamp issues)
- ✅ Phase 2 completion checker (shows missing fields)
- ✅ Export functionality for debugging

**Usage Example:**
```javascript
// Browser console
const data = await window.dbInspect.inspectSet('match-123-s1')
console.log(data.summary)          // Quick overview
console.table(data.rallies)        // All rallies
console.table(data.shots)          // All shots

const check = await window.dbInspect.checkConsistency('match-123-s1')
console.log(check)  // Shows any data issues
```

**Benefits for Agents:**
- Can verify database saves programmatically
- No need to manually inspect IndexedDB through DevTools
- Automatic consistency checking catches common bugs
- Export function useful for debugging complex issues
- Reduces reliance on user for database verification

**Testing Performed:**
- ✅ TypeScript compiles without errors
- ✅ No linting errors
- ✅ API loads automatically in dev mode
- ✅ All functions properly typed with return interfaces

**Issues Remaining:**
- None

**Notes for Next Agent:**
- Use this API to verify all database operations
- `checkConsistency()` is especially useful for catching score/timestamp bugs
- `verifyShotDetails()` verifies Phase 2 completion
- API is only available in development mode (not in production build)

---

### 2025-12-11: Vitest Testing Setup & Terminal Usage Guidelines

**Changes Made:**
- **Added** Vitest configuration (`app/vitest.config.ts`)
- **Added** test scripts to `package.json` (test, test:ui, test:run)
- **Created** sample test file (`app/src/rules/calculate/calculateServer.test.ts`)
- **Added** Vitest workflow documentation
- **Added** terminal usage warnings throughout document

**Vitest Setup:**
- Configured for React environment with jsdom
- Path aliases work (`@/` imports)
- Sample test demonstrates testing pattern for rules layer
- 60+ test cases for `calculateServer` function

**Test Scripts:**
```json
"test": "vitest"           // Watch mode (avoid - hangs terminal)
"test:ui": "vitest --ui"   // UI mode (avoid - hangs terminal)
"test:run": "vitest run"   // Run once, exit (recommended)
```

**Terminal Usage Guidelines:**
- ⚠️ Terminal commands can hang and require user intervention
- ✅ Use for: TypeScript compilation, linting, test:run
- ❌ Avoid: Dev server, watch modes, interactive prompts
- Documented in multiple sections of the guide

**Testing Strategy Updated:**
1. Code quality: `npm run build`, `npm run lint`
2. Rules testing: `npm run test:run` (for pure functions)
3. Database verification: `window.dbInspect` API
4. UI testing: Browser automation tools

**Sample Test Pattern:**
```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from './yourFunction'

describe('yourFunction', () => {
  it('should handle case', () => {
    expect(yourFunction(input)).toBe(expected)
  })
})
```

**Benefits:**
- Agents can test rules/* functions without browser
- Fast feedback for pure function changes
- No UI needed for domain logic testing
- Terminal usage minimized to prevent hangs

**Testing Performed:**
- ✅ Vitest configuration created
- ✅ Sample tests written
- ✅ No TypeScript/linting errors
- ⚠️ Dependencies need install: `npm install --save-dev jsdom @vitest/ui`

**Issues Remaining:**
- User needs to run: `cd app && npm install --save-dev jsdom @vitest/ui`

**Notes for Next Agent:**
- Use `npm run test:run` (not `npm test`) to avoid terminal hangs
- Only test rules/* functions with Vitest (pure functions only)
- Use Database Inspection API for DB verification
- Avoid terminal commands when possible

---

### 2025-12-11: Investigation-First Workflow & Prompt Template

**Changes Made:**
- **Added** Step 0 to workflow: Investigation & Confirmation (before implementation)
- **Created** prompt template: `_ai_claude/PROMPT_TEMPLATE.md`
- **Updated** critical rules to emphasize "investigate first, implement second"
- **Defined** brief summary format (4-5 bullets)

**New Workflow:**
```
Step 0: Investigation & Confirmation (NEW)
  → Agent investigates codebase
  → Provides 4-5 bullet points:
    • Understanding of problem
    • Root cause identified
    • Proposed solution
    • Files to change
    • Testing approach
  → Asks clarifying questions
  → Waits for user confirmation

Step 1-4: Implementation (after approval)
```

**Prompt Template Format:**
```
Task: [Brief Title]

Problem: [1-3 sentences]

Context Documents:
- docs-match-analyser-edge-tt/shotTaggingContext.md

Please investigate and provide 4-5 bullet points showing your 
understanding, root cause, solution, files, and testing approach. 
Ask clarifying questions before implementing.
```

**Benefits:**
- User provides simple problem description
- Agent investigates and proposes solution
- User confirms understanding before implementation
- Avoids wasted effort on wrong approach
- Clear communication of plan upfront

**Examples Included:**
1. Bug fix (shot log highlighting)
2. Feature request (add "Let" button)
3. Improvement (delete feedback)

**Testing Performed:**
- N/A (documentation update)

**Issues Remaining:**
- None

**Notes for Next Agent:**
- Always start with Step 0 investigation
- Provide brief 4-5 bullet summary
- Wait for user confirmation before implementing
- See PROMPT_TEMPLATE.md for examples

---

<!-- NEW ENTRIES GO BELOW THIS LINE -->

