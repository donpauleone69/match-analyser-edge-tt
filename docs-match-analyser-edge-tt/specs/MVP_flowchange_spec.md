# Edge TT Match Analyser — MVP Flowchange Specification

> **Version:** 0.8.0  
> **Date:** 2025-12-01  
> **Status:** Draft — Awaiting Implementation

This document converts user-testing notes into a formal specification update for the Edge TT Match Analyser. It supersedes previous Step 1 / Step 2 flow definitions.

---

## OUTPUT 1 — Specification Update

### 1.1 Updated Two-Part Workflow

The tagging workflow is restructured into two distinct phases that share a common layout:

| Phase | Name | Purpose |
|-------|------|---------|
| **Part 1** | Match Framework | Mark all shots and rally boundaries in a single pass through the video |
| **Part 2** | Rally Detail Tagging | Review timestamps + answer shot questions per-rally, sequentially |

Both phases use the **same screen layout**:
- **Left Panel:** Match Panel (collapsible tree of Match Details → Point Details boxes)
- **Centre:** Video Player (no timeline bar in Part 1; optional in Part 2)
- **Right Panel:** Speed Controls / Settings

---

### 1.2 Part 1 — Match Framework

#### 1.2.1 Pre-Tagging Setup (Modal)

Before tagging begins, user completes a **Match Details Modal**:

| Field | Default | Required |
|-------|---------|----------|
| Player 1 Name | — | Yes |
| Player 2 Name | — | Yes |
| Match Date | Today | Yes |
| Current Set Score | 0-0 | Yes |
| Current Points Score | 0-0 | Yes |
| Match Format | Best of 5, to 11 | Yes |
| Tournament / Context | Friendly | No |
| First Serve Timestamp | — | Yes (user locates in video) |
| First Server | — | Yes |

**Rationale:** Capturing the first serve timestamp removes "dead air" at the start of the video and establishes the baseline for server inference.

#### 1.2.2 Match Panel Structure

```
┌─────────────────────────────────┐
│ ▼ Match Details (collapsed)     │  ← Set score, players, format, date
├─────────────────────────────────┤
│ ▶ Rally 1                       │  ← Server, shots, end-of-point
│ ▶ Rally 2                       │
│ ▶ Rally 3                       │
│   ...                           │
├─────────────────────────────────┤
│ ▼ Match Result (end)            │  ← Final score, winner (entered at completion)
└─────────────────────────────────┘
```

#### 1.2.3 Keyboard Shortcuts (Part 1)

| Key | Action | Constraint |
|-----|--------|------------|
| **Space** | Mark contact (shot) / Mark serve (starts new rally if in FF mode) | — |
| **→** | End rally + enter Fast Forward mode | Only if current rally has ≥1 contact |
| **←** | Slow down (decrease FF speed or exit FF) | — |
| **E** | End of Set marker | Only after a rally is complete |
| **K** | Play / Pause | — |
| **Ctrl+Z** | Undo last contact | — |

#### 1.2.4 Playback Speed Presets

| Mode | Default | Options |
|------|---------|---------|
| **Tagging Speed** | 0.25× | 0.125×, 0.25×, 0.5×, 0.75×, 1× |
| **Fast Forward Speed** | 1× | 0.5×, 1×, 2×, 3×, 4×, 5× |

#### 1.2.5 Match Completion Modal

When user finishes tagging (presses "Complete Match Framework"):

| Field | Purpose |
|-------|---------|
| Match Result | Winner (P1 / P2 / Incomplete) |
| Final Set Score | e.g. 3-2 |
| Final Points Score (last set) | e.g. 11-9 |
| Video Coverage | Full / Truncated Start / Truncated End / Truncated Both |

---

### 1.3 Part 2 — Rally Detail Tagging

#### 1.3.1 Sequential Per-Rally Workflow

1. **Active Rally expands** in left panel; all others collapse
2. For each shot in the rally:
   - Video loops the shot segment (shot start → next shot start + 0.2s preview buffer)
   - User can adjust timestamp with ←→ frame-step
   - User answers **Shot Questions** in quick-entry modal
   - Confirm → move to next shot
3. For **End of Point**:
   - Video shows still frame (no loop)
   - User adjusts timestamp
   - User answers **End of Point Questions** (forced/unforced if error)
   - Confirm → rally folds, next rally opens

#### 1.3.2 Shot Preview Loop Behaviour

| Setting | Default | Options |
|---------|---------|---------|
| Loop Speed | 0.5× | 0.25×, 0.5×, 0.75×, 1× |
| Preview Buffer | +0.2s | Configurable (0.1–0.5s) |

The preview buffer extends playback past the next shot's timestamp so user can see the result of the current shot, but **does not change** the stored timestamp.

#### 1.3.3 Tagging Modes

User can choose between **Essential Mode** (fast) and **Full Mode** (detailed) per-match.

#### 1.3.4 Progress Indicator

Rally header shows: **"Rally X of Y"** so user knows remaining work.

#### 1.3.5 Misclick Auto-Pruning

If a shot is marked with error quality (`inNet`, `missedLong`, `missedWide`) and there are subsequent shots, they are automatically deleted with an undo toast notification.

---

### 1.4 Shot Quality Options (Both Modes)

Quality now includes error types, enabling extensive derivation:

| Quality | Meaning | Derived landingType |
|---------|---------|---------------------|
| `good` | Strong shot, pressured opponent | `inPlay` |
| `average` | Neutral shot | `inPlay` |
| `weak` | Poor shot, gave advantage | `inPlay` |
| `inNet` | Shot hit the net | `net` |
| `missedLong` | Shot went off the end | `offLong` |
| `missedWide` | Shot went off the side | `wide` |

---

### 1.5 Spin Grid (3×3) — For Serves

Ball contact point perspective:

```
┌─────────────────────────────────────────┐
│  Top-Left    │   Topspin    │ Top-Right  │
│     (7)      │     (8)      │    (9)     │
├──────────────┼──────────────┼────────────┤
│  Side-Left   │   No Spin    │ Side-Right │
│     (4)      │     (5)      │    (6)     │
├──────────────┼──────────────┼────────────┤
│  Back-Left   │  Backspin    │ Back-Right │
│     (1)      │     (2)      │    (3)     │
└─────────────────────────────────────────┘
```

---

### 1.6 Essential Mode — Question Flow

#### Serve (Shot 1)

| # | Question | Options | Keyboard |
|---|----------|---------|----------|
| 1 | Serve Type | Pendulum, Reverse Pendulum, Tomahawk, Backhand, Hook, Lollipop, Other | 1-7 |
| 2 | Spin | 9-cell spin grid | Numpad 1-9 |
| 3 | Landing Zone | 9-cell grid (opponent's table) | Numpad 1-9 |
| 4 | Quality | Good, Average, Weak, In Net, Missed Long, Missed Wide | G, A, W, N, L, D |

**Inputs: 4** (3 if error quality — skip landing zone)  
**Derived:** Wing (from serve type), landingType (from quality)

#### Rally Shot (Shot 2+)

| # | Question | Options | Keyboard |
|---|----------|---------|----------|
| 1 | Wing | Forehand, Backhand | F, B |
| 2 | Shot Type | Push, Chop, Block, Lob, Drive, Flick, Loop, Smash, Other | 1-9 |
| 3 | Landing Zone | 9-cell grid (opponent's table) | Numpad 1-9 |
| 4 | Quality | Good, Average, Weak, In Net, Missed Long, Missed Wide | G, A, W, N, L, D |

**Inputs: 4** (3 if error quality — skip landing zone)  
**Derived:** landingType (from quality), inferredSpin (from shot type)

#### End of Point

| Scenario | Question | Inputs |
|----------|----------|:------:|
| Last shot = error (Shot 3+) | Forced or Unforced? | 1 |
| Last shot = serve error | — (auto: serviceFault) | 0 |
| Last shot = receive error | — (auto: receiveError) | 0 |
| Last shot = in-play | — (auto: winnerShot) | 0 |

#### Essential Mode Totals

| Rally Length | Inputs |
|--------------|:------:|
| 3-shot rally | ~12 |
| 5-shot rally | ~20 |

---

### 1.7 Full Mode — Question Flow

#### Serve (Shot 1)

| # | Question | Options | Keyboard |
|---|----------|---------|----------|
| 1 | Serve Type | Pendulum, Reverse Pendulum, Tomahawk, Backhand, Hook, Lollipop, Other | 1-7 |
| 2 | Position Sector | 9-cell grid (player's position) | Numpad 1-9 |
| 3 | Spin | 9-cell spin grid | Numpad 1-9 |
| 4 | Landing Zone | 9-cell grid (opponent's table) | Numpad 1-9 |
| 5 | Quality | Good, Average, Weak, In Net, Missed Long, Missed Wide | G, A, W, N, L, D |

**Inputs: 5** (4 if error quality)

**Conditional (if quality = weak AND serveExtraFor enabled):**

| # | Question | Options |
|---|----------|---------|
| 6 | Serve Issue Cause | Technical Execution, Bad Decision, Too High, Too Long, Not Enough Spin, Easy to Read |

#### Rally Shot (Shot 2+)

| # | Question | Options | Keyboard |
|---|----------|---------|----------|
| 1 | Wing | Forehand, Backhand | F, B |
| 2 | Position Sector | 9-cell grid (player's position) | Numpad 1-9 |
| 3 | Shot Type | Full list (14 types) | 1-9, 0, etc. |
| 4 | Landing Zone | 9-cell grid (opponent's table) | Numpad 1-9 |
| 5 | Quality | Good, Average, Weak, In Net, Missed Long, Missed Wide | G, A, W, N, L, D |

**Inputs: 5** (4 if error quality)

**Conditional questions:**
- Shot 2 (Return): `receiveIssueCause` if weak/error + enabled
- Shot 3 (Third Ball): `thirdBallIssueCause` if weak + enabled

#### End of Point

| # | Question | Options | Condition |
|---|----------|---------|-----------|
| 1 | Forced or Unforced? | Forced Error, Unforced Error | Only if last shot = error (Shot 3+) |
| 2 | Luck Type | None, Lucky Net, Lucky Edge Table, Lucky Edge Bat | Always |
| 3 | Unforced Error Cause | Technical Execution, Bad Decision, Too Aggressive, Too Passive | Only if unforced + enabled |

**Inputs: 1-3**

#### Full Mode Totals

| Rally Length | Inputs |
|--------------|:------:|
| 3-shot rally | ~16-18 |
| 5-shot rally | ~26-30 |

---

### 1.8 Mode Comparison

| Aspect | Essential | Full |
|--------|:---------:|:----:|
| **Serve inputs** | 4 | 5-6 |
| **Rally shot inputs** | 4 | 4-5 |
| **End of point inputs** | 0-1 | 1-3 |
| **Position Sector** | ❌ | ✅ |
| **Landing Zone** | ✅ | ✅ |
| **Spin (serves)** | ✅ | ✅ |
| **Shot type list** | Simplified (9) | Full (14) |
| **Issue diagnostics** | ❌ | ✅ |
| **Luck tracking** | ❌ | ✅ |

---

### 1.9 Derived Fields (No Input Needed)

| Field | Derived From |
|-------|--------------|
| `landingType` | `shotQuality` (error types map to net/offLong/wide) |
| `winnerId` | Last shot quality + player (error = other player wins) |
| `pointEndType` | Last shot quality + index (partial — forced/unforced still asked) |
| `isFault` | `shotIndex === 1` + error quality |
| `isServe` | `shotIndex === 1` |
| `isReturnOfServe` | `shotIndex === 2` |
| `inferredSpin` | `shotType` (existing mapping) |
| Serve `wing` | `serveType` (see mapping below) |

#### Serve Type → Wing Mapping

| Serve Type | Wing |
|------------|:----:|
| Pendulum | FH |
| Reverse Pendulum | BH |
| Tomahawk | FH |
| Backhand | BH |
| Hook | FH |
| Lollipop | FH |
| Other | FH |

---

### 1.10 End-of-Point Derivation Logic

| Last Shot Quality | Last Shot Index | Derived Winner | Derived pointEndType | Question Needed |
|-------------------|-----------------|----------------|----------------------|-----------------|
| Error (inNet/missedLong/missedWide) | 1 (Serve) | Receiver | `serviceFault` | None |
| Error | 2 (Return) | Server | `receiveError` | None |
| Error | 3+ | Other player | — | Forced or Unforced? |
| In-play (good/average/weak) | Any | Player who hit it | `winnerShot` | None (or confirm) |

---

### 1.11 Shot Type Lists

#### Essential Mode (9 types)

```
Defensive:  push, chop, block, lob
Neutral:    drive, flick
Aggressive: loop, smash
Fallback:   other
```

#### Full Mode (14 types)

```
Defensive:  lob, chop, chopBlock, dropShot, shortTouch, push
Neutral:    block, drive, flick, slowSpinLoop
Aggressive: loop, fastLoop, smash
Fallback:   other
```

---

### 1.12 New Requirements

| ID | Requirement |
|----|-------------|
| REQ-1 | Match Details Modal must be completed before Part 1 tagging begins |
| REQ-2 | Match Date must be captured in Match Details Modal |
| REQ-3 | First serve timestamp must be manually located and stored |
| REQ-4 | End of Set marker only available after rally completion |
| REQ-5 | Match Completion Modal required to finish Part 1 |
| REQ-6 | Part 2 processes rallies sequentially (no random access during tagging) |
| REQ-7 | Shot preview loop adds configurable buffer without altering timestamps |
| REQ-8 | Essential vs Full tagging mode toggle available per-match |
| REQ-9 | Serve order inferred from first server + rules; editable with recalculation |
| REQ-10 | Shots marked with error quality auto-prune subsequent misclicks |
| REQ-11 | Rally `isHighlight` flag must be persisted for v2 compilation features |

---

## OUTPUT 2 — Technical Update

### 2.1 Schema Deltas

#### 2.1.1 Shots Table — Modified Fields

```sql
-- Replace shotQuality with expanded options
shotQuality TEXT CHECK (shotQuality IN (
    'good', 'average', 'weak', 
    'inNet', 'missedLong', 'missedWide'
)) NOT NULL,

-- Replace serveSpinPrimary + serveSpinStrength with single grid
-- REMOVE: serveSpinPrimary, serveSpinStrength
-- ADD:
serveSpin TEXT CHECK (serveSpin IN (
    'topLeft', 'topspin', 'topRight',
    'sideLeft', 'noSpin', 'sideRight',
    'backLeft', 'backspin', 'backRight'
)),

-- Update serveType (add lollipop, remove shovel)
serveType TEXT CHECK (serveType IN (
    'pendulum', 'reversePendulum', 'tomahawk', 
    'backhand', 'hook', 'lollipop', 'other'
)),
```

#### 2.1.2 Rallies Table — New Field

```sql
-- Confirm isHighlight exists (for v2 compilations)
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS isHighlight BOOLEAN DEFAULT FALSE;
```

#### 2.1.3 Matches Table — New Fields

```sql
-- Video start context (for partial/truncated videos)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS videoStartSetScore TEXT DEFAULT '0-0';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS videoStartPointsScore TEXT DEFAULT '0-0';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS firstServeTimestamp NUMERIC;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS videoCoverage TEXT 
    CHECK (videoCoverage IN ('full', 'truncatedStart', 'truncatedEnd', 'truncatedBoth')) 
    DEFAULT 'full';

-- Match completion details
ALTER TABLE matches ADD COLUMN IF NOT EXISTS matchResult TEXT 
    CHECK (matchResult IN ('player1', 'player2', 'incomplete'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finalSetScore TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS finalPointsScore TEXT;

-- Tagging mode preference
ALTER TABLE matches ADD COLUMN IF NOT EXISTS taggingMode TEXT 
    CHECK (taggingMode IN ('essential', 'full')) 
    DEFAULT 'full';
```

#### 2.1.4 Games Table — New Field

```sql
-- End of set marker from Part 1
ALTER TABLE games ADD COLUMN IF NOT EXISTS endOfSetTimestamp NUMERIC;
```

#### 2.1.5 TypeScript Types Update

```typescript
// Shot Quality (expanded)
type ShotQuality = 'good' | 'average' | 'weak' | 'inNet' | 'missedLong' | 'missedWide'

// Serve Spin (3x3 grid)
type ServeSpin = 
  | 'topLeft' | 'topspin' | 'topRight'
  | 'sideLeft' | 'noSpin' | 'sideRight'
  | 'backLeft' | 'backspin' | 'backRight'

// Serve Type (updated)
type ServeType = 'pendulum' | 'reversePendulum' | 'tomahawk' | 'backhand' | 'hook' | 'lollipop' | 'other'

// Essential mode shot types (simplified)
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

// Helper functions
const isErrorQuality = (q: ShotQuality): boolean => 
  ['inNet', 'missedLong', 'missedWide'].includes(q)

const SERVE_WING_MAP: Record<ServeType, 'FH' | 'BH'> = {
  pendulum: 'FH',
  reversePendulum: 'BH',
  tomahawk: 'FH',
  backhand: 'BH',
  hook: 'FH',
  lollipop: 'FH',
  other: 'FH',
}
```

---

### 2.2 Tagging Store Changes

#### 2.2.1 New State Fields

```typescript
interface TaggingState {
  // ... existing fields ...
  
  // Match setup additions
  videoStartSetScore: string
  videoStartPointsScore: string
  firstServeTimestamp: number | null
  videoCoverage: VideoCoverage
  
  // Match completion
  matchResult: 'player1' | 'player2' | 'incomplete' | null
  finalSetScore: string | null
  finalPointsScore: string | null
  
  // Tagging mode
  taggingMode: TaggingMode
  
  // Part 2 workflow
  activeRallyIndex: number
  activeShotIndex: number
  previewBufferSeconds: number
  loopSpeed: number
}
```

#### 2.2.2 New Actions

```typescript
// Match setup
setMatchDetails: (details: MatchDetailsInput) => void
setFirstServeTimestamp: (time: number) => void

// Part 1 completion
markEndOfSet: () => void
completeMatchFramework: (result: MatchCompletionInput) => void

// Part 2 workflow
advanceToNextShot: () => void
advanceToNextRally: () => void
goToPreviousShot: () => void
setActiveRally: (index: number) => void
setPreviewBuffer: (seconds: number) => void
setLoopSpeed: (speed: number) => void

// Shot tagging
tagShotEssential: (shotId: string, data: EssentialShotData) => void
tagShotFull: (shotId: string, data: FullShotData) => void
tagEndOfPoint: (rallyId: string, data: EndOfPointData) => void
setTaggingMode: (mode: TaggingMode) => void

// Misclick handling
pruneContactsAfterError: (rallyId: string, errorContactIndex: number) => void
```

---

### 2.3 Serve Order Rules Module

Create: `app/src/services/serveOrderEngine.ts`

```typescript
export interface ServeOrderEngine {
  calculateServer(
    p1Score: number,
    p2Score: number,
    firstServer: 'player1' | 'player2'
  ): 'player1' | 'player2'
  
  inferSetFirstServer(
    currentServer: 'player1' | 'player2',
    p1Score: number,
    p2Score: number
  ): 'player1' | 'player2'
  
  recalculateServersFromRally(
    rallies: Rally[],
    fromIndex: number,
    firstServer: 'player1' | 'player2'
  ): Rally[]
  
  getNextSetFirstServer(
    lastSetFirstServer: 'player1' | 'player2'
  ): 'player1' | 'player2'
}
```

---

### 2.4 End-of-Point Derivation Logic

```typescript
interface EndOfPointDraft {
  winnerId: 'player1' | 'player2'
  pointEndType: string | null
  landingType: string
  needsInput: boolean
  question?: 'forcedOrUnforced'
}

function deriveEndOfPoint(rally: Rally): EndOfPointDraft {
  const lastShot = rally.shots[rally.shots.length - 1]
  const isError = isErrorQuality(lastShot.quality)
  const lastShotPlayer = lastShot.playerId
  const otherPlayer = lastShotPlayer === 'player1' ? 'player2' : 'player1'
  
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
    return { winnerId: otherPlayer, pointEndType: null, landingType, needsInput: true, question: 'forcedOrUnforced' }
  }
  
  return { winnerId: lastShotPlayer, pointEndType: 'winnerShot', landingType: 'inPlay', needsInput: false }
}
```

---

### 2.5 Misclick Detection & Auto-Pruning

```typescript
function detectAndPruneMisclicks(rally: Rally): { pruned: boolean; removedCount: number } {
  for (let i = 0; i < rally.contacts.length - 1; i++) {
    const shot = rally.shots.find(s => s.contactId === rally.contacts[i].id)
    if (shot && isErrorQuality(shot.quality)) {
      const removedCount = rally.contacts.length - 1 - i
      rally.contacts = rally.contacts.slice(0, i + 1)
      rally.shots = rally.shots.slice(0, i + 1)
      return { pruned: true, removedCount }
    }
  }
  return { pruned: false, removedCount: 0 }
}
```

---

## OUTPUT 3 — Annotated Original Notes

```
lets examine the next part of the app prior to building and update the spec 
the flow and the interface to make it better.... having been using the apps 
workflow so far, my user testing suggests the following flow:

1. Do part1 (match framework) - mark the entire video basically creating the 
match framework. However, instead of its own screen layout I would use the 
same screen framework that is used in part 2, (removing the timeline below 
the video) but having the "Match Panel" on the left, and speed controls on 
the right. 
[UX] Good — unified layout reduces context switching

The spacebar and cursor inputs create the rally structure in the left 
"Match Panel" frame as it goes. In addition to the cursor forward to mark 
the rally end and speed up the playback, there should be an end of set 
Button+keyboard shortcut that places an end of set timeStamp in the left 
panel, the logic for this is that it can be pressed after a point is marked 
as complete, but not otherwise.
[Tech] Need endOfSetTimestamp field on Game entity
[UX] Constraint (only after rally complete) prevents accidental triggers

To improve on this "Match Framework stage", the user must do a couple of 
things FIRST to set the "Match Details" of the Match Framework video. This 
starts with answering the first set of modal questions: Current Score at 
beginning of video Set (default 0-0), Current Points Score (default 0-0). 
(i'm considering even moving Player details questions here as well! Player 1, 
Player 2.) Match Format, Tournament, etc...) 
[Tech] New fields: videoStartSetScore, videoStartPointsScore on Match
[UX] Consolidating player entry here is cleaner than separate setup screen
[Update] Match Date also captured here per user feedback

and then finally manually locating the first serve in the video using the 
videoplayer, adding its timestamp and identifying the first server here at 
this point.... this removes all the dead air in the video which will often 
be filming a long time before the match start.
[Tech] New field: firstServeTimestamp on Match
[UX] Critical improvement — addresses common pain point

These details should be entered at the top of the "Match Panel" before the 
first rally as "Match Details" Box (colapsed). And the first "Point Details" 
Box can be populated with the first entry "Server Name" with the Serve 
timestamp.
[UX] Collapsible tree structure — good information hierarchy

Note : This creates the initial framework required for the match enabling 
inference from this data and rules logic that could speed up data entry later.
[Tech] Serve order engine module needed

Also Note: These details, can infer future serve order based on table tennis 
rules. It can also infer by calculating backwards (number of points played) 
from the current server who started serving the set, and therefore who starts 
serving in the next set. Logic rules such as this should be defined in clear 
modules in the code.
[Tech] serveOrderEngine.ts with inferSetFirstServer() function
[Clarify] Using standard ITTF rules (2 serves each, alternate at deuce)

From here the user will then start marking the shots and point ends as 
described at the beginning of this section, until he is complete. (default 
speed for tagging should be x0.25, with slower options being 0.125 or faster 
option being 0.5 0.75 or 1x) 
[UX] 0.25x default is slower than current 0.75x — user prefers more control
[Tech] Update speed presets in store

The fastforward speed used between points should be default to 1x but also 
be able to speed up and slow down x0.5 x2 x3 x4 x5) whatever makes sense 
with the player
[Tech] Expand FF speed options to include 0.5x, 3x, 5x

There may or may not be a complete match video, with it truncated beginning 
or end (or even in the middle... edge case)
[Tech] videoCoverage enum: full, truncatedStart, truncatedEnd, truncatedBoth

As such, once all shots are marked in this phase, it would be good to put in 
the "match completion details" which finishes the entire Match framework 
(even if not all points in the match are recorded from video data) This 
would be a modal asking Match Result, Set Score, Point Score. This bookends 
the Left Panel with "Match Result"
[Tech] New fields: matchResult, finalSetScore, finalPointsScore
[UX] Bookend structure (Match Details at top, Match Result at bottom)

Once complete we move onto the next part (same window layout though).

2. The concept here is to combine the current review phase and the shot 
tagging phase together on a per rally basis. Basically, you only focus on 
the active rally in the left "Point Details" Box in the Match Framework 
side panel. The other Boxes should have their details hidden (like a folded 
tree structure)
[UX] Sequential focus reduces cognitive load
[Tech] activeRallyIndex state field

Workflow through a rally: Editing the timestamp position would work much 
the same way (except you would get an extra maybe 0.2s played at the end 
of the "shot preview loop video" so you can see the shot result clearly, 
this however would not change the timestamp of the next shot, as its just 
for the preview. 
[Tech] previewBufferSeconds field (default 0.2)
[Clarify] Buffer is display-only, not stored — confirmed

The "shot preview loop video" should also probably play at 0.5x speed 
default, but with an option on the interface to increase or decreases 
that speed).
[Tech] loopSpeed field (default 0.5)

Its structured with much more sequencing, you move/edit/delete the timestamp 
and then sequentially answer the specific shot questions for that shot in a 
quick entry modal format before moving onto the next shot. 
[UX] Modal-based quick entry — good for keyboard flow
[Tech] ShotQuestionModal component

You do this for serve and each subsequent shot until the final timestamp in 
a point which is the "end of point" timestamp. We would adjust this timestamp 
position like the others (although this one doesn't loop, its just a still 
frame as we are not examing a shot, but rather clarifying the end of a point) 
[UX] Still frame for end-of-point — correct, no loop needed

we confirm it, and then clarify the end of point conditions through a final 
quick set of modal questions, starting with who won the point and the natural 
follow ups based on the point logic in the spec, and details from the previous 
shot tags (Starting with who won the point). Then a final confirmation, as 
the entire point is now tagged end to end.
[Tech] EndOfPointModal component with conditional questions
[Update] Winner now derived from shot quality — only forced/unforced asked

Then the Point is stored, that "Point Details" Box folds, and the Next opens 
and the process continues until all is done.
[UX] Auto-advance to next rally — good flow

Note: It would be nice to show Rally x of y in the rally header, so user 
knows how much more to do in the process.
[UX] Progress indicator — essential for long matches

This should be end to end for a match in the most streamlined way I can 
think of.

Also: Lets examine the questions per shot.... I think I want to introduce a 
super simple one which only captures essential key details incase it becomes 
too slow to tag a match.
[Tech] taggingMode: 'essential' | 'full' on Match
[Update] Essential mode finalized: Type → Spin → Landing Zone → Quality for serves
[Update] Essential mode finalized: Wing → Type → Landing Zone → Quality for shots
[Update] Quality expanded to include error types (inNet, missedLong, missedWide)
[Update] This enables extensive derivation of landingType, winnerId, pointEndType
```

---

## OUTPUT 4 — Glossary

### UI Terms

| Term | Definition |
|------|------------|
| **Essential Mode** | Simplified tagging capturing Wing, Shot Type, Landing Zone, and Quality (with error types). ~4 inputs per shot. |
| **Full Mode** | Detailed tagging adding Position Sector, conditional diagnostics, and luck tracking. ~5 inputs per shot. |
| **Match Panel** | Left sidebar showing collapsible tree of Match Details, Rally/Point boxes, and Match Result. |
| **Point Details Box** | Expandable section within Match Panel showing a single rally's server, shots, and winner. |
| **Preview Buffer** | Extra time (default 0.2s) added to shot loop end to show result without changing stored timestamps. |
| **Shot Preview Loop** | Video playback that loops a single shot's segment during Part 2 review. |
| **Spin Grid** | 3×3 grid for serve spin selection based on ball contact point (topspin at top, backspin at bottom). |

### Analysis Terms

| Term | Definition |
|------|------------|
| **Error Quality** | Shot quality values indicating an error: `inNet`, `missedLong`, `missedWide`. |
| **Forced Error** | Error made by opponent due to pressure from previous shot. |
| **In-Play Quality** | Shot quality values indicating ball was returned: `good`, `average`, `weak`. |
| **Match Framework** | Structural skeleton of a match: rally boundaries, servers, and timestamps without detailed shot data. |
| **Misclick** | Accidental contact marked after an error shot; auto-pruned by system. |
| **Rally Detail** | Complete shot-by-shot annotation including wing, type, landing zone, and quality. |
| **Unforced Error** | Error made without significant pressure from opponent. |

### Database Fields

| Field | Table | Definition |
|-------|-------|------------|
| **endOfSetTimestamp** | games | Video timestamp (seconds) marking end of a set. |
| **finalPointsScore** | matches | Final points score of last set (e.g. "11-9"). |
| **finalSetScore** | matches | Final set score string (e.g. "3-2"). |
| **firstServeTimestamp** | matches | Video timestamp (seconds) of the first serve. |
| **isHighlight** | rallies | Boolean flag marking rally for highlight compilations. |
| **matchResult** | matches | Final match winner (`player1`, `player2`, or `incomplete`). |
| **serveSpin** | shots | 9-cell grid value for serve spin (replaces spinPrimary + spinStrength). |
| **shotQuality** | shots | Expanded to include error types: `good`, `average`, `weak`, `inNet`, `missedLong`, `missedWide`. |
| **taggingMode** | matches | Whether match uses Essential or Full tagging (`essential` or `full`). |
| **videoCoverage** | matches | Enum indicating video completeness: `full`, `truncatedStart`, `truncatedEnd`, `truncatedBoth`. |
| **videoStartPointsScore** | matches | Points score when video recording began (e.g. "5-3"). |
| **videoStartSetScore** | matches | Set score when video recording began (e.g. "1-1"). |

### Project Vocabulary

| Term | Definition |
|------|------------|
| **Contact** | A timestamped marker representing a ball strike (shot preparation moment). |
| **Part 1** | Match Framework phase — marking all contacts and rally boundaries. |
| **Part 2** | Rally Detail phase — reviewing timestamps and answering shot questions. |
| **Serve Order Engine** | Rules module calculating expected server based on score and first server. |

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2025-12-01 | 0.8.0 | MVP Flowchange: unified layout, Essential/Full modes, expanded quality, spin grid, derivation logic |

---

*Last updated: 2025-12-01*
