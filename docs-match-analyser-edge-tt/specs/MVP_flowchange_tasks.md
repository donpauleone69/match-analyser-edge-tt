# Edge TT Match Analyser — Implementation Tasks

> **Version:** 0.8.0  
> **Date:** 2025-12-01  
> **Status:** Ready for Implementation

This document breaks down the MVP Flowchange specification into concrete implementation tasks.

---

## Task Overview

| Category | Tasks | Priority |
|----------|-------|----------|
| **Data Layer** | 6 tasks | P0 (Foundation) |
| **Services** | 2 tasks | P0 (Foundation) |
| **UI Components** | 9 tasks | P1 (Core) |
| **Pages** | 3 tasks | P1 (Core) |
| **Integration** | 4 tasks | P2 (Polish) |

---

## P0 — Foundation Tasks

### TASK-001: Update TypeScript Types

**File:** `app/src/types/index.ts`

**Changes:**

```typescript
// Shot Quality (expanded with error types)
type ShotQuality = 'good' | 'average' | 'weak' | 'inNet' | 'missedLong' | 'missedWide'

// Serve Spin (3x3 grid - replaces spinPrimary + spinStrength)
type ServeSpin = 
  | 'topLeft' | 'topspin' | 'topRight'
  | 'sideLeft' | 'noSpin' | 'sideRight'
  | 'backLeft' | 'backspin' | 'backRight'

// Serve Type (updated - added lollipop, removed shovel)
type ServeType = 'pendulum' | 'reversePendulum' | 'tomahawk' | 'backhand' | 'hook' | 'lollipop' | 'other'

// Essential mode shot types (simplified - 9 types)
type EssentialShotType = 'push' | 'chop' | 'block' | 'lob' | 'drive' | 'flick' | 'loop' | 'smash' | 'other'

// Tagging mode
type TaggingMode = 'essential' | 'full'

// Video coverage
type VideoCoverage = 'full' | 'truncatedStart' | 'truncatedEnd' | 'truncatedBoth'

// Match type additions
interface Match {
  // ... existing fields ...
  matchDate: string
  videoStartSetScore: string
  videoStartPointsScore: string
  firstServeTimestamp?: number
  videoCoverage: VideoCoverage
  matchResult?: 'player1' | 'player2' | 'incomplete'
  finalSetScore?: string
  finalPointsScore?: string
  taggingMode: TaggingMode
}

// Rally type additions
interface Rally {
  // ... existing fields ...
  isHighlight: boolean
}

// Game type additions
interface Game {
  // ... existing fields ...
  endOfSetTimestamp?: number
}

// Shot type updates
interface Shot {
  // ... existing fields ...
  shotQuality: ShotQuality  // Now includes error types
  serveSpin?: ServeSpin     // New 3x3 grid (replaces spinPrimary + spinStrength)
  serveType?: ServeType     // Updated list
}

// Helper type
const isErrorQuality = (q: ShotQuality): boolean => 
  ['inNet', 'missedLong', 'missedWide'].includes(q)

// Serve wing derivation
const SERVE_WING_MAP: Record<ServeType, 'FH' | 'BH'> = {
  pendulum: 'FH',
  reversePendulum: 'BH',
  tomahawk: 'FH',
  backhand: 'BH',
  hook: 'FH',
  lollipop: 'FH',
  other: 'FH',
}

// Input types
interface MatchDetailsInput {
  player1Name: string
  player2Name: string
  matchDate: string
  videoStartSetScore: string
  videoStartPointsScore: string
  matchFormat: string
  tournament?: string
  firstServeTimestamp: number
  firstServerId: 'player1' | 'player2'
}

interface MatchCompletionInput {
  matchResult: 'player1' | 'player2' | 'incomplete'
  finalSetScore: string
  finalPointsScore: string
  videoCoverage: VideoCoverage
}

interface EssentialShotData {
  wing?: 'FH' | 'BH'        // Not needed for serves (derived)
  serveType?: ServeType     // Only for serves
  serveSpin?: ServeSpin     // Only for serves
  shotType?: EssentialShotType  // Only for rally shots
  landingZone?: string      // Skip if error quality
  shotQuality: ShotQuality
}

interface EndOfPointData {
  forcedOrUnforced?: 'forcedError' | 'unforcedError'  // Only if error shot 3+
}
```

**Estimate:** 2 hours

---

### TASK-002: Update Tagging Store — State Fields

**File:** `app/src/stores/taggingStore.ts`

**Add to state:**
```typescript
// Match setup additions
videoStartSetScore: string
videoStartPointsScore: string
firstServeTimestamp: number | null
videoCoverage: 'full' | 'truncatedStart' | 'truncatedEnd' | 'truncatedBoth'

// Match completion
matchResult: 'player1' | 'player2' | 'incomplete' | null
finalSetScore: string | null
finalPointsScore: string | null

// Tagging mode
taggingMode: 'essential' | 'full'

// Part 2 workflow
activeRallyIndex: number
activeShotIndex: number
previewBufferSeconds: number
loopSpeed: number
```

**Add to initialState:**
```typescript
videoStartSetScore: '0-0',
videoStartPointsScore: '0-0',
firstServeTimestamp: null,
videoCoverage: 'full',
matchResult: null,
finalSetScore: null,
finalPointsScore: null,
taggingMode: 'full',
activeRallyIndex: 0,
activeShotIndex: 0,
previewBufferSeconds: 0.2,
loopSpeed: 0.5,
```

**Update partialize for persistence.**

**Estimate:** 1 hour

---

### TASK-003: Update Tagging Store — Actions

**File:** `app/src/stores/taggingStore.ts`

**New actions:**
```typescript
// Match setup
setMatchDetails: (details: MatchDetailsInput) => void
setFirstServeTimestamp: (time: number) => void

// Part 1 completion
markEndOfSet: () => void  // Only if currentRallyContacts.length === 0
completeMatchFramework: (result: MatchCompletionInput) => void

// Part 2 workflow
advanceToNextShot: () => void
advanceToNextRally: () => void
goToPreviousShot: () => void
setActiveRally: (index: number) => void
setPreviewBuffer: (seconds: number) => void
setLoopSpeed: (speed: number) => void

// Shot tagging
tagShotEssential: (contactId: string, data: EssentialShotData) => void
tagShotFull: (contactId: string, data: FullShotData) => void
tagEndOfPoint: (rallyId: string, data: EndOfPointData) => void
setTaggingMode: (mode: 'essential' | 'full') => void

// Misclick handling
pruneContactsAfterError: (rallyId: string, errorContactIndex: number) => void
```

**Estimate:** 3 hours

---

### TASK-004: Create Serve Order Engine

**File:** `app/src/services/serveOrderEngine.ts` (NEW)

```typescript
export const serveOrderEngine = {
  calculateServer(
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
  },
  
  inferSetFirstServer(
    currentServer: 'player1' | 'player2',
    p1Score: number,
    p2Score: number
  ): 'player1' | 'player2' {
    // Work backwards from current state
    const totalPoints = p1Score + p2Score
    const serveBlock = Math.floor(totalPoints / 2)
    
    if (serveBlock % 2 === 0) {
      return currentServer
    }
    return otherPlayer(currentServer)
  },
  
  getNextSetFirstServer(
    lastSetFirstServer: 'player1' | 'player2'
  ): 'player1' | 'player2' {
    return otherPlayer(lastSetFirstServer)
  }
}

function otherPlayer(player: 'player1' | 'player2'): 'player1' | 'player2' {
  return player === 'player1' ? 'player2' : 'player1'
}
```

**Estimate:** 1.5 hours

---

### TASK-005: Create End-of-Point Derivation Engine

**File:** `app/src/services/endOfPointEngine.ts` (NEW)

```typescript
interface EndOfPointDraft {
  winnerId: 'player1' | 'player2'
  pointEndType: string | null
  landingType: string
  needsInput: boolean
  question?: 'forcedOrUnforced'
}

export function deriveEndOfPoint(
  lastShot: { playerId: 'player1' | 'player2'; shotIndex: number; quality: ShotQuality }
): EndOfPointDraft {
  const isError = isErrorQuality(lastShot.quality)
  const otherPlayer = lastShot.playerId === 'player1' ? 'player2' : 'player1'
  
  const landingType = {
    good: 'inPlay', average: 'inPlay', weak: 'inPlay',
    inNet: 'net', missedLong: 'offLong', missedWide: 'wide',
  }[lastShot.quality]
  
  if (isError) {
    if (lastShot.shotIndex === 1) {
      return { winnerId: otherPlayer, pointEndType: 'serviceFault', landingType, needsInput: false }
    }
    if (lastShot.shotIndex === 2) {
      return { winnerId: otherPlayer, pointEndType: 'receiveError', landingType, needsInput: false }
    }
    return { 
      winnerId: otherPlayer, 
      pointEndType: null, 
      landingType, 
      needsInput: true, 
      question: 'forcedOrUnforced' 
    }
  }
  
  return { 
    winnerId: lastShot.playerId, 
    pointEndType: 'winnerShot', 
    landingType: 'inPlay', 
    needsInput: false 
  }
}

export function deriveServeWing(serveType: ServeType): 'FH' | 'BH' {
  return SERVE_WING_MAP[serveType]
}
```

**Estimate:** 1.5 hours

---

### TASK-006: Add Session Migration

**File:** `app/src/stores/taggingStore.ts`

Add migration logic for existing persisted sessions to handle new fields with defaults.

**Estimate:** 30 minutes

---

## P1 — Core UI Tasks

### TASK-007: Create Match Panel Component

**File:** `app/src/components/tagging/MatchPanel.tsx` (NEW)

**Features:**
- Collapsible tree structure
- Match Details section (top, collapsed by default)
- Rally/Point boxes (expandable, show "Rally X of Y")
- Match Result section (bottom, shown after completion)
- Active rally highlighting

**Props:**
```typescript
interface MatchPanelProps {
  mode: 'framework' | 'detail'
  activeRallyIndex?: number
  onRallyClick?: (index: number) => void
  onAddRally?: () => void
  onDeleteRally?: (id: string) => void
}
```

**Estimate:** 4 hours

---

### TASK-008: Create Match Details Modal

**File:** `app/src/components/tagging/MatchDetailsModal.tsx` (NEW)

**Features:**
- Player name inputs
- Match date picker
- Set score selector (0-0 to 3-3)
- Points score selector (0-0 to 11-11)
- Match format dropdown
- Tournament/context input (optional)
- First serve timestamp locator (integrates with video player)
- First server selector

**Estimate:** 3 hours

---

### TASK-009: Create Match Completion Modal

**File:** `app/src/components/tagging/MatchCompletionModal.tsx` (NEW)

**Features:**
- Match result selector (Player 1 / Player 2 / Incomplete)
- Final set score input
- Final points score input
- Video coverage selector

**Estimate:** 2 hours

---

### TASK-010: Create Shot Question Modal — Essential Mode

**File:** `app/src/components/tagging/ShotQuestionModal.tsx` (NEW)

**Serve flow (4 inputs):**
1. Serve Type (7 options, keyboard 1-7)
2. Spin Grid (9-cell, numpad 1-9)
3. Landing Zone (9-cell, numpad 1-9) — skip if error quality
4. Quality (6 options, G/A/W/N/L/D)

**Rally shot flow (4 inputs):**
1. Wing (2 options, F/B)
2. Shot Type (9 options, keyboard 1-9)
3. Landing Zone (9-cell, numpad 1-9) — skip if error quality
4. Quality (6 options, G/A/W/N/L/D)

**Features:**
- Keyboard navigation
- Auto-advance on selection
- Back button to previous question
- Skip landing zone if error quality selected

**Estimate:** 4 hours

---

### TASK-011: Create Shot Question Modal — Full Mode

**File:** `app/src/components/tagging/ShotQuestionModalFull.tsx` (NEW)

**Additional questions vs Essential:**
- Position Sector (9-cell grid)
- Full shot type list (14 options)
- Conditional issue cause questions

**Estimate:** 3 hours

---

### TASK-012: Create End of Point Modal

**File:** `app/src/components/tagging/EndOfPointModal.tsx` (NEW)

**Features:**
- Shows derived winner (from shot quality)
- Shows derived point end type (if auto-derived)
- Forced/Unforced selector (only if error shot 3+)
- Luck type selector (Full mode only)
- Confirm button

**Estimate:** 2 hours

---

### TASK-013: Create Spin Grid Component

**File:** `app/src/components/tagging/SpinGrid.tsx` (NEW)

**Features:**
- 3×3 grid display (topspin at top, backspin at bottom)
- Keyboard support (numpad 1-9)
- Visual feedback on selection
- Labels for each cell

**Estimate:** 1.5 hours

---

### TASK-014: Update Speed Controls Component

**File:** `app/src/components/tagging/SpeedControls.tsx` (update or NEW)

**Features:**
- Tagging speed presets: 0.125×, 0.25×, 0.5×, 0.75×, 1×
- Fast forward speed presets: 0.5×, 1×, 2×, 3×, 4×, 5×
- Loop speed presets: 0.25×, 0.5×, 0.75×, 1×
- Preview buffer slider: 0.1–0.5s
- Current speed display
- Mode indicator (Tagging / Fast Forward / Loop)

**Estimate:** 2 hours

---

### TASK-015: Update VideoPlayer for Preview Buffer

**File:** `app/src/components/tagging/VideoPlayer.tsx`

**Changes:**
- Add `previewBuffer` prop to `ConstrainedPlayback`
- Loop plays to `endTime + previewBuffer` then restarts at `startTime`
- Add `loopSpeed` prop separate from main playback speed

**Estimate:** 2 hours

---

## P1 — Page Tasks

### TASK-016: Create Unified Tagging Screen

**File:** `app/src/pages/TaggingScreen.tsx` (NEW)

**Features:**
- Shared layout for Part 1 and Part 2
- Mode prop: `'framework' | 'detail'`
- Left: Match Panel
- Centre: Video Player
- Right: Speed Controls / Settings
- Keyboard shortcut handling based on mode

**Estimate:** 4 hours

---

### TASK-017: Update Match Setup Page

**File:** `app/src/pages/MatchSetup.tsx`

**Changes:**
- Integrate Match Details Modal
- First serve timestamp locator
- Navigate to TaggingScreen (framework mode) on complete

**Estimate:** 2 hours

---

### TASK-018: Implement Rally Detail Flow

**File:** `app/src/pages/TaggingScreen.tsx` (detail mode)

**Features:**
- Sequential rally workflow
- Shot preview loops with buffer
- Shot question modals (Essential or Full based on taggingMode)
- End of point modal with derivation
- Auto-advance to next rally
- Misclick detection and auto-pruning with undo toast

**Estimate:** 4 hours

---

## P2 — Integration Tasks

### TASK-019: End of Set Marker Integration

**Changes:**
- Add 'E' keyboard shortcut in Part 1
- Store `endOfSetTimestamp` on current game
- Visual marker in Match Panel
- Validation: only after rally complete

**Estimate:** 2 hours

---

### TASK-020: Tagging Speed Default Change

**Changes:**
- Update default tagging speed to 0.25×
- Update speed presets to include 0.125×
- Update fast forward presets to include 3× and 5×

**Estimate:** 30 minutes

---

### TASK-021: Misclick Auto-Pruning

**Changes:**
- Detect when shot has error quality but more contacts follow
- Auto-delete subsequent contacts
- Show undo toast notification
- Implement undo functionality

**Estimate:** 2 hours

---

### TASK-022: Progress Indicator

**Changes:**
- Add "Rally X of Y" to rally headers in Match Panel
- Show in both Part 1 (during tagging) and Part 2 (during detail)

**Estimate:** 30 minutes

---

## Implementation Order

### Phase 1: Foundation (Days 1-2)
1. TASK-001: Types
2. TASK-002: Store state
3. TASK-003: Store actions
4. TASK-004: Serve order engine
5. TASK-005: End-of-point derivation engine
6. TASK-006: Migration

### Phase 2: Core UI Components (Days 3-5)
7. TASK-007: Match Panel
8. TASK-013: Spin Grid
9. TASK-014: Speed Controls
10. TASK-015: VideoPlayer update

### Phase 3: Modals (Days 6-8)
11. TASK-008: Match Details Modal
12. TASK-009: Match Completion Modal
13. TASK-010: Shot Question Modal (Essential)
14. TASK-011: Shot Question Modal (Full)
15. TASK-012: End of Point Modal

### Phase 4: Pages (Days 9-10)
16. TASK-016: Unified Tagging Screen
17. TASK-017: Match Setup update
18. TASK-018: Rally Detail flow

### Phase 5: Integration (Days 11-12)
19. TASK-019: End of Set marker
20. TASK-020: Speed defaults
21. TASK-021: Misclick auto-pruning
22. TASK-022: Progress indicator

---

## Testing Checklist

### Part 1 — Match Framework
- [ ] Match Details Modal opens on first entry
- [ ] Match date is captured
- [ ] First serve timestamp can be located
- [ ] Contacts marked with Space
- [ ] Rally ends with → (enters FF mode)
- [ ] FF speed increases with subsequent →
- [ ] ← decreases speed / exits FF
- [ ] Space in FF marks serve (new rally)
- [ ] E marks end of set (only after rally complete)
- [ ] Match Completion Modal on finish
- [ ] All data persists on refresh

### Part 2 — Rally Detail (Essential Mode)
- [ ] Only active rally expanded
- [ ] Shot preview loops correctly with buffer
- [ ] ←→ adjusts timestamps
- [ ] Serve: Type → Spin → Landing Zone → Quality
- [ ] Rally shot: Wing → Type → Landing Zone → Quality
- [ ] Landing zone skipped if error quality
- [ ] End of point: Forced/Unforced only asked for errors (shot 3+)
- [ ] Winner auto-derived from quality
- [ ] Rally folds after completion
- [ ] Next rally auto-opens
- [ ] Progress indicator updates

### Part 2 — Rally Detail (Full Mode)
- [ ] Position sector asked
- [ ] Full shot type list (14)
- [ ] Conditional issue causes appear
- [ ] Luck type asked at end

### Derivation Logic
- [ ] Error quality → landingType derived correctly
- [ ] Error quality → winnerId = other player
- [ ] Serve error → serviceFault (no question)
- [ ] Return error → receiveError (no question)
- [ ] Rally error → forced/unforced question
- [ ] In-play quality → winnerShot (no question)
- [ ] Serve type → wing derived correctly

### Misclick Handling
- [ ] Error shot followed by more contacts triggers auto-prune
- [ ] Undo toast appears
- [ ] Undo restores contacts

### Edge Cases
- [ ] Truncated video start (non-zero score)
- [ ] Truncated video end (incomplete match)
- [ ] Mode toggle mid-session
- [ ] Delete rally during Part 2
- [ ] Manual server override

---

## Estimated Total

| Category | Hours |
|----------|-------|
| Foundation | 9.5 |
| Core UI | 13.5 |
| Modals | 14 |
| Pages | 10 |
| Integration | 5 |
| **Total** | **52 hours** |

---

*Last updated: 2025-12-01*
