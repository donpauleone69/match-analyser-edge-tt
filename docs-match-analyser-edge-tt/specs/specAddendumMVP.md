# MVP Spec Addendum

> This document tracks all changes, refinements, and additions to the original MVP specification made during development. Each entry includes the date, what changed, and the rationale.

---

## Change Log

### 2025-12-02: Comprehensive Terminology Standardization & Player Profiles

**Context:** Major refactoring to standardize terminology across the entire codebase, add Player Profile types for future database implementation, and fix critical data completeness bugs.

#### Terminology Changes

**Standardized naming throughout codebase:**
- ❌ `Contact` → ✅ `Shot` (more accurate - represents a ball contact/shot)
- ❌ `Game` → ✅ `Set` (correct table tennis terminology)
- ✅ `Rally` → ✅ `Rally` (no change - already correct ITTF term)

**Rationale:**
- "Contact" was technically accurate but ambiguous
- "Game" conflicts with TT terminology (a game is called a "set")
- "Rally" is the official ITTF term for an exchange of shots ending in a point
- Consistency with industry standards and future database integration

#### Shot Type Enhancements

**Added `'serve'` to shot type enums:**
- `EssentialShotType`: Now 10 types (added 'serve')
- `ShotType` (Full Mode): Now 15 types (added 'serve')
- `ESSENTIAL_SHOT_TYPES` array updated
- `SHOT_TYPE_SPIN_MAP` updated with `serve: 'unknown'`

**Auto-population logic:**
- When `shotIndex === 1`, `shotType` is automatically set to `'serve'`
- Ensures data completeness - no more blank shotType for serves
- Consistent data structure across all shots

**Added `'unknown'` to InferredSpin:**
- Used for serves when spin cannot be inferred from shotType alone
- Honest representation (unknown vs guessing noSpin)
- Actual `serveSpin` field still captures detailed serve spin

#### Player Profile Types (Database-Ready)

**Added new types for future Supabase migration:**
```typescript
interface PlayerProfile {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  club_id: string | null  // 'lagos' | 'padernense' | 'other'
  handedness: Handedness  // 'left' | 'right'
  playstyle: Playstyle    // 'attack' | 'allround' | 'defence'
  rubber_forehand: RubberType  // 'inverted' | 'shortPips' | 'longPips' | 'antiSpin'
  rubber_backhand: RubberType
  profile_picture_url: string | null
  bio: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}
```

**New enums:**
- `Handedness`: 'left' | 'right'
- `Playstyle`: 'attack' | 'allround' | 'defence'
- `RubberType`: 'inverted' | 'shortPips' | 'longPips' | 'antiSpin'

#### Database Schema Updates

**Created comprehensive ERD:**
- New document: `docs-match-analyser-edge-tt/specs/DatabaseERD.md`
- Complete entity relationship diagram (Mermaid format)
- 5 tables: Players, Matches, Sets, Rallies, Shots
- Foreign key relationships documented
- Indexes and cardinality defined

**Table name changes:**
- `contacts` → `shots` (consistent with code)
- `games` → `sets` (correct TT terminology)
- `rallies` → `rallies` (no change)

**Field name changes:**
- `gameId` → `setId`
- `gameNumber` → `setNumber`
- `currentGameIndex` → `currentSetIndex`

#### Store State Updates

**Added to TaggingState:**
- `players: PlayerProfile[]` - For future multi-match player management
- `sets: Set[]` (renamed from `games`)
- `shots: Shot[]` (renamed from `contacts`)
- `currentRallyShots: Shot[]` (renamed from `currentRallyContacts`)

**Action renames:**
- `addContact()` → `addShot()`
- `updateContact()` → `updateShot()`
- `deleteContact()` → `deleteShot()`
- `updateContactTime()` → `updateShotTime()`
- `updateContactShotData()` → `updateShotData()`
- `completeContactTagging()` → `completeShotTagging()`
- `nudgeContact()` → `nudgeShot()`
- `autoPruneContacts()` → `autoPruneShots()`
- `addContactToRally()` → `addShotToRally()`

**Set-related renames:**
- `checkGameEnd()` → `checkSetEnd()` (with legacy alias)
- `GameEndInput/Result` → `SetEndInput/Result` types

#### Timeline Marker Updates

**MarkerType updated:**
- `'contact'` → `'shot'`
- More descriptive and consistent

#### Files Changed

**Core Types (app/src/rules/types.ts):**
- Added PlayerProfile, Handedness, Playstyle, RubberType
- Renamed Contact → Shot
- Renamed Game → Set
- Added 'serve' to ShotType and EssentialShotType
- Added 'unknown' to InferredSpin
- Updated SHOT_TYPE_SPIN_MAP

**Store (app/src/stores/taggingStore.ts):**
- Complete state property renames
- All action renames
- Auto-populate shotType='serve' logic
- Added players: PlayerProfile[] state

**Features (34 component files):**
- All tagging feature components updated
- All data-viewer components updated
- All props, variables, and function calls updated

**Documentation:**
- DatabaseERD.md (created new)
- Architecture.md (terminology updated)
- DataSchema.md (terminology updated)
- Glossary.md (definitions updated)

#### Breaking Changes

⚠️ **localStorage Structure Change:**
- Old sessions with Contact/Game terminology incompatible
- Users must export data before upgrading
- Fresh start required with new terminology

**Persist mapping updated:**
```typescript
partialize: (state) => ({
  // ...
  sets: state.sets,        // Was: games
  shots: state.shots,      // Was: contacts  
  currentRallyShots: state.currentRallyShots,  // Was: currentRallyContacts
  players: state.players,  // NEW
})
```

#### Data Export Updates

**CSV Headers:**
- "shots" table (was "contacts")
- "Sets" table (was "Games")  
- "Rallies" table (unchanged)

**JSON Structure:**
- All arrays use new property names
- Type-safe with updated TypeScript definitions

#### Migration Notes

**Git Branch:** `refactor/terminology-standardization`

**Files Renamed:**
- `ContactButtonBlock.tsx` → `ShotButtonBlock.tsx`
- Data viewer sections updated in-place (untracked files)

**Automated Migration:**
- Node.js script processed 34 files
- Systematic find-replace patterns
- Preserved formatting and structure

#### Testing Required

- ✅ TypeScript compilation (2 minor warnings only)
- ⏳ Manual browser testing
- ⏳ Part 1 framework tagging
- ⏳ Part 2 shot detail tagging (verify shotType='serve' auto-populates)
- ⏳ Data Viewer display
- ⏳ CSV/JSON export

#### Rationale

This refactoring provides:
1. **Clarity:** "Shot" is clearer than "Contact"
2. **Standards Compliance:** "Set" follows official ITTF terminology
3. **Database Readiness:** Player profiles designed for Supabase
4. **Data Completeness:** shotType='serve' always populated
5. **Future-Proof:** Schema ready for multi-match player analysis
6. **Consistency:** Same terms in code, UI, database, and documentation

---

### 2025-12-02: Rally Checkpoint Flow Implementation

**Context:** Major architectural change to implement the new Rally Checkpoint Flow specification. This flow processes matches set-by-set with rally-by-rally checkpoints during the framework phase.

#### New State Machine

Added `FrameworkState` type to manage the new flow:
```typescript
type FrameworkState = 
  | 'setup'           // Match setup, mark first serve
  | 'tagging'         // Marking contacts for current rally
  | 'checkpoint'      // Rally ended, confirm or redo
  | 'ff_mode'         // Fast forward to find next serve
  | 'shot_detail'     // Part 2: answering questions per shot
  | 'rally_review'    // End of rally summary with video sync
  | 'set_complete'    // Set finished, move to next or complete match
  | 'match_complete'  // All sets done
```

#### New Store Actions

- `confirmRally()` - Saves rally at checkpoint, transitions to FF mode
- `redoCurrentRally()` - Clears current rally, seeks back to previous end
- `redoFromRally(index)` - Deletes rallies from index, allows multi-checkpoint redo
- `endSetFramework()` - Transitions from FF mode to shot detail phase
- `confirmRallyReview()` - Confirms rally review, advances to next rally

#### New UI Components

1. **CheckpointSection** (`app/src/features/tagging/sections/CheckpointSection.tsx`)
   - Shows rally summary after ending a rally
   - Displays contact count, server, duration, timeline preview
   - Confirm (Enter) / Redo (Backspace) actions

2. **RallyReviewSection** (`app/src/features/tagging/sections/RallyReviewSection.tsx`)
   - End-of-rally review with video sync
   - Shot list highlights in sync with looping video
   - End-of-point time nudge controls
   - Player stats summary

3. **MatchAnalysis** (`app/src/pages/MatchAnalysis.tsx`)
   - Displays match statistics and analysis
   - Head-to-head comparison (points won, winners, errors)
   - Serve statistics and point end type distribution
   - Shot quality distribution
   - Rally details table

#### Updated Keyboard Shortcuts

| State | Key | Action |
|-------|-----|--------|
| Tagging | `Space` | Mark contact |
| Tagging | `→` | End rally → Checkpoint |
| Checkpoint | `Enter` | Confirm → Save → FF mode |
| Checkpoint | `Backspace` | Redo current rally |
| FF Mode | `Space` | Mark serve → Start next rally |
| FF Mode | `E` | End set → Shot detail phase |
| FF Mode | `←` `→` | Adjust FF speed |
| Rally Review | `Enter` | Confirm → Next rally |

#### Rally Data Model Updates

- Added `frameworkConfirmed?: boolean` to Rally interface
- Added `detailComplete?: boolean` to Rally interface
- Timeline panel now shows ✓ for confirmed rallies with green border

#### Files Changed

- `app/src/stores/taggingStore.ts`: New state, actions, persist config
- `app/src/rules/types.ts`: Rally interface updated
- `app/src/features/tagging/composers/TaggingScreenComposer.tsx`: Integrated new flow
- `app/src/features/tagging/sections/MatchTimelinePanelSection.tsx`: Confirmed rally indicators
- `app/src/App.tsx`: Added /matches/analysis route

#### Spec Documents Created

- `docs-match-analyser-edge-tt/chat_notes/Spec_RallyCheckpointFlow.md`
- `docs-match-analyser-edge-tt/specs/Implementation_RallyCheckpointFlow.md`

---

### 2025-12-02: Winner Shot Point End Type Bug Fix

**Context:** Critical bug discovered where `pointEndType` was not being populated for rallies ending with winner shots (in-play qualities: good, average, weak).

#### Bug Description

During Part 2 tagging, when the last shot of a rally had an **in-play quality** (good/average/weak):
- The shot quality and landing zone were correctly saved
- The code entered the End of Rally step
- **BUG:** `deriveEndOfPoint()` was never called for winner shots
- **BUG:** `pointEndType` remained `undefined` → exported as `N/A` in data
- **BUG:** `winnerId` was not automatically derived from the last shot player

This only affected winner shots. Error shots (serviceFault, receiveError, forcedError, unforcedError) were working correctly.

#### Root Cause

In `handleLandingZoneSelect` (TaggingScreenComposer.tsx line 428-447):
- When completing the last shot with in-play quality
- Code entered End of Rally step with `null` values
- Missing call to `deriveEndOfPoint()` for winner shot derivation

#### Fix Applied

Updated `handleLandingZoneSelect` to:
1. Call `deriveEndOfPoint()` when last shot has in-play quality
2. Auto-derive `pointEndType = 'winnerShot'`
3. Auto-derive `winnerId` from the player who hit the last shot
4. Immediately persist both values to the rally (no user input needed)

This follows the same auto-derivation pattern used for serviceFault and receiveError.

#### Data Impact

**Before Fix:**
- Rallies ending with winner shots → `pointEndType = undefined` (N/A in exports)

**After Fix:**
- Rallies ending with winner shots → `pointEndType = 'winnerShot'` ✅

#### Files Changed

- `app/src/features/tagging/composers/TaggingScreenComposer.tsx`: Fixed `handleLandingZoneSelect`

#### Rationale

The `deriveEndOfPoint()` function in `rules/deriveEndOfPoint.ts` already contains the correct logic:
- In-play quality → `pointEndType = 'winnerShot'`, `winnerId = playerId`
- It was simply not being called for the winner shot case

This fix ensures data completeness and consistency with the domain logic defined in the rules layer.

---

### 2025-12-02: Server Calculation & End-of-Point Timestamp Fixes

**Context:** Two additional bugs found during testing:
1. Server was same for every point
2. End-of-point timestamp was duplicate of last shot timestamp

#### Bug Analysis

**Bug 1: Server Never Changes**

Root cause in `startNewRallyWithServe`:
```typescript
// BEFORE (buggy)
const totalPoints = player1Score + player2Score  // PROBLEM: Scores never update in Part 1!
const serveBlock = Math.floor(totalPoints / 2)
```

In Part 1, winner is not determined, so scores don't change. `totalPoints` is always the same, so server calculation always returns the same player.

**Fix:** Use rally count instead of score:
```typescript
// AFTER (fixed)
const rallyCount = rallies.length  // Use completed rally count
const serveBlock = Math.floor(rallyCount / 2)
const isFirstServerBlock = serveBlock % 2 === 0
const nextServerId = isFirstServerBlock ? firstServerId : otherPlayer
```

**Bug 2: Wrong End-of-Point Timestamp**

Root cause in `endRallyScore`:
```typescript
// BEFORE (buggy)
const lastContact = currentRallyContacts[currentRallyContacts.length - 1]
const endOfPointTime = lastContact ? lastContact.time : 0  // Wrong! Uses last contact time
```

**Fix:** Use current video time (when user presses →):
```typescript
// AFTER (fixed)
const endOfPointTime = currentTime  // Correct! Uses video time when rally ended
```

#### Files Changed
- `app/src/stores/taggingStore.ts`:
  - `startNewRallyWithServe`: Server now based on rally count
  - `endRallyScore`: End-of-point now uses `currentTime`
  - `selectWinner`: End-of-point now uses `currentTime`

---

### 2025-12-02: Critical Architecture Fixes - Double-Counting & End of Rally

**Context:** Testing revealed two fundamental architectural issues:
1. Serves were being counted twice (in two rallies)
2. Part 2 had no proper "End of Rally" step for winner determination

#### Root Cause Analysis

**Bug 1: Double-Counting Serves**

The `startNewRallyWithServe` function was creating a rally AND adding the serve to `currentRallyContacts`. Then `endRallyScore` created ANOTHER rally from `currentRallyContacts`.

```
Flow (BEFORE - Buggy):
1. startNewRallyWithServe() → Creates Rally N+1 with serve, ALSO adds serve to currentRallyContacts
2. addContact() → Adds contacts to currentRallyContacts
3. endRallyScore() → Creates Rally N+2 from currentRallyContacts (includes same serve!)
Result: Serve exists in BOTH Rally N+1 and Rally N+2
```

**Bug 2: Missing End of Rally Step**

Part 2 jumped directly from last shot to next rally without:
- Allowing end-of-point timestamp editing
- Asking who won for non-error endings
- Handling forced/unforced error questions properly

#### Fixes Applied

**1. Fixed `startNewRallyWithServe`**

```typescript
// BEFORE (buggy): Created rally immediately
startNewRallyWithServe: () => {
  const newRally = { ..., contacts: [serveContact] }
  set({
    rallies: [...rallies, newRally],  // Rally created here!
    currentRallyContacts: [serveContact],  // And here!
  })
}

// AFTER (correct): Only adds to buffer, rally created at end
startNewRallyWithServe: () => {
  // Safety check for double-trigger
  if (currentRallyContacts.length > 0) return
  
  // Calculate next server
  const nextServerId = calculateNextServer(...)
  
  // Add serve to buffer - NO RALLY CREATED
  set({
    currentRallyContacts: [serveContact],
    currentServerId: nextServerId,
  })
}
```

**2. Added `EndOfRallySection` Component**

New step after all shots are tagged that allows:
- End-of-point timestamp editing (← → keys)
- Winner selection (if not auto-derived)
- Forced/Unforced error question (when applicable)
- Rally confirmation before advancing

**3. Updated Part 2 Flow**

```
Flow (AFTER - Correct):
For each shot:
  1. Answer questions (type, spin/wing, quality, landing)
  2. If error quality → auto-derive winner, enter End of Rally step

After last shot (non-error):
  1. Enter End of Rally step
  2. User selects winner (opponent error or winner shot)
  3. If opponent error, ask forced/unforced
  4. Confirm → advance to next rally
```

#### New Component

```typescript
// app/src/features/tagging/sections/EndOfRallySection.tsx
interface EndOfRallySectionProps {
  // Rally info
  rallyIndex: number
  totalRallies: number
  
  // Players
  player1Name: string
  player2Name: string
  lastShotPlayerId: PlayerId
  lastShotQuality?: ShotQuality
  
  // End of point
  endOfPointTime: number
  
  // Derived winner (if automatically determined)
  derivedWinnerId?: PlayerId
  derivedPointEndType?: PointEndType
  
  // State flags
  needsWinnerSelection: boolean
  needsForcedUnforced: boolean
  
  // Callbacks
  onEndOfPointTimeChange: (time: number) => void
  onWinnerSelect: (winnerId: PlayerId) => void
  onForcedUnforcedSelect: (type: 'forcedError' | 'unforcedError') => void
  onConfirm: () => void
  onStepFrame: (direction: 'forward' | 'backward') => void
}
```

#### Keyboard Shortcuts (End of Rally Step)

| Key | Action |
|-----|--------|
| ← / → | Nudge end-of-point time by 1 frame |
| 1 | Select Player 1 as winner |
| 2 | Select Player 2 as winner |
| F | Select Forced Error |
| U | Select Unforced Error |
| Enter/Space | Confirm and advance |

---

### 2025-12-02: Part 1 Tagging Workflow Fixes (Post-Testing)

**Context:** User testing revealed several critical bugs and UX issues in the Part 1 tagging workflow.

#### Bug Fixes

1. **Double-Counting Serves Fixed**
   - **Before:** `initMatchFramework` created Rally #1 with serve contact, then `endRallyScore` created a NEW rally with all contacts (including the same serve). Result: duplicate rallies.
   - **After:** `initMatchFramework` only adds the serve to `currentRallyContacts` (no rally created). Rally is created only when user ends the rally via `endRallyScore`.
   - **Impact:** Serve is now counted once per rally, not twice.

2. **Set Limit Validation**
   - **Before:** User could end sets beyond the match format limit (e.g., 11 sets for a "Best of 3").
   - **After:** `markEndOfSet` now validates against `matchFormat` and prevents creating sets beyond the maximum.
   - **Formats:** bestOf3 (3 max), bestOf5 (5 max), bestOf7 (7 max), singleSet (1 max).

#### UX Improvements

3. **Timeline Panel Enhancements**
   - **Auto-expand current rally:** When rally changes, it auto-expands in the panel.
   - **In-progress rally display:** Shows `currentRallyContacts` with animated border, "In Progress" badge.
   - **Server shown in rally header:** Server name with color coding (cyan for P1, amber for P2).
   - **Nudge/Delete controls:** Hover over shots to show ◀ ▶ (nudge ±33ms) and ✕ (delete) buttons.

4. **Default Tagging Speed**
   - **Before:** 0.25x (too slow)
   - **After:** 0.5x (user preference)
   - **Store default:** `playbackSpeed` now initializes to 0.5 instead of 1.

#### Store Changes

```typescript
// New actions
nudgeContact: (contactId: string, direction: 'earlier' | 'later', frameMs?: number) => void
deleteInProgressContact: (contactId: string) => void

// Modified action - no rally created until endRallyScore
initMatchFramework: (data) => {
  // Creates first contact in currentRallyContacts only
  // NO rally created here - deferred to endRallyScore
}

// Modified action - validates against matchFormat
markEndOfSet: () => {
  // Calculates maxSets from matchFormat
  // Prevents creating sets beyond limit
}
```

#### Timeline Panel Props Added

```typescript
interface MatchTimelinePanelSectionProps {
  // NEW: In-progress rally data
  currentRallyContacts?: Contact[]
  currentServerId?: PlayerId
  
  // NEW: Contact manipulation
  onNudgeContact?: (contactId: string, direction: 'earlier' | 'later') => void
  onDeleteContact?: (contactId: string) => void
}
```

---

### 2025-12-01: Step 1 Review Page - Enhanced Rally Timeline

**Context:** During implementation of the Step 1 Review page, we identified opportunities to make the review workflow more intuitive and complete.

#### UI/UX Changes

1. **Rally Pod Layout (Chronological Order)**
   - **Before:** Server and Winner at top of rally card
   - **After:** Server → Shots → Winner (top to bottom)
   - **Rationale:** Reads chronologically like the actual rally: who served, what shots happened, who won

2. **Winner Timestamp Added**
   - **Before:** Winner was just a player name
   - **After:** Winner includes timestamp of when rally ended
   - **Rationale:** Allows user to jump to the winning moment; useful for reviewing the end of rallies

3. **Keyboard-First Navigation**
   | Key | Action |
   |-----|--------|
   | ↑ / ↓ | Navigate through timeline items |
   | ← / → | Edit value (toggle server/winner) OR frame-step (on contacts/winner time) |
   | Space | Play/pause video at current selection |
   | W | Toggle winner (when winner row selected) |
   | Delete | Remove selected shot |

4. **In-Place Editing**
   - Server can be toggled with ←→ when selected
   - Winner can be toggled with W key when selected
   - Winner time can be frame-stepped with ←→
   - Contact times can be frame-stepped with ←→

5. **Add/Delete Shots**
   - Delete button and keyboard shortcut for removing erroneous shots
   - Add shot button inserts new contact at current video time
   - Shots auto-sort by time and re-index after add/delete

#### Data Model Changes

```typescript
// Rally type - ADDED winnerTime field
interface Rally {
  id: string
  gameId: string
  rallyIndex: number
  isScoring: boolean
  winnerId?: string
  winnerTime?: number  // NEW: Timestamp when rally ended
  player1ScoreAfter: number
  player2ScoreAfter: number
  serverId: string
  receiverId: string
  hasVideoData: boolean
  contacts: Contact[]
}
```

#### Store Actions Added

```typescript
// New actions for review page
updateWinnerTime: (rallyId: string, time: number) => void
deleteContact: (rallyId: string, contactId: string) => void
addContactToRally: (rallyId: string, time: number) => void
```

#### Behavior Changes

- `selectWinner()` now automatically sets `winnerTime` to the last contact's time
- Contacts are re-indexed after add/delete operations
- Contacts are sorted by time when added (allowing insertion at any point)

---

### 2025-12-01: Video Player State Management Fix

**Context:** Video player was stuck in play/pause loop due to state sync issues.

#### Technical Fix

- Removed `useEffect` that synced `isPlaying` state to `video.play()/pause()`
- `togglePlay()` now directly controls video element
- Event handlers only update Zustand state when actual change occurs
- Prevents infinite render loops from state ↔ DOM sync

---

### 2025-12-01: Video URL Persistence Decision

**Context:** Object URLs from `URL.createObjectURL()` are not persistent across page reloads.

#### Decision

- `videoUrl` is **NOT** persisted in Zustand store
- User must re-select video file when entering Step 1 or Review pages
- Each page handles its own video file input
- **Future:** May add video path storage with file system access API

---

### 2025-12-01: Step 1 Contact Tagger - Keyboard Shortcuts

**Context:** Implementing efficient tagging workflow for rapid contact marking.

#### Shortcuts Implemented

| Key | Action |
|-----|--------|
| Space | Add contact at current time |
| S | End rally (scoring) - opens winner dialog |
| N | End rally (no score) - let/interruption |
| K | Play/pause video |
| Ctrl+Z | Undo last contact |

---

---

### 2025-12-01: Contact Timing Conventions

**Context:** Established conventions for when to mark contacts during Step 1 tagging.

#### Official Conventions

| Shot Type | Tag At | Rationale |
|-----------|--------|-----------|
| **Serve** | Ball toss | Captures full service motion for video review |
| **All other shots** | Shot preparation (backswing) | Natural viewing start, easier to spot |
| **Winner** | Rally end point | Defines when rally concludes |

#### Why Preparation, Not Contact?

1. **Primary use case is video review** — prep timing is ideal for watching
2. **Ball speed from timestamps is imprecise anyway** — would need camera calibration, 120fps+
3. **Faster tagging workflow** — prep is easier to spot than exact contact frame
4. **Perceptually natural** — the "shot" includes the wind-up

#### Rally Time Boundaries

```
Rally Start:  First contact (serve ball toss)
Rally End:    winnerTime (moment point is decided)
```

Each shot's viewing window:
```
Shot N: contact[N].time → contact[N+1].time - 1 frame
Last Shot: contact[last].time → rally.winnerTime
```

---

### 2025-12-01: Constrained Playback Mode

**Context:** In Step 2, video should only play within the bounds of the selected shot.

#### Behavior

- Video plays from current contact timestamp
- Auto-pauses at next contact timestamp (or winnerTime for last shot)
- Optional loop mode: restart at shot start when reaching end
- User can toggle between constrained and free playback

#### Implementation

```typescript
interface ConstrainedPlayback {
  enabled: boolean
  startTime: number      // This shot's prep timestamp
  endTime: number        // Next shot's prep timestamp (or winnerTime)
  loopOnEnd?: boolean
}
```

---

### 2025-12-01: Video Export Feature

**Context:** Users want to export highlight reels from tagged matches.

#### Capabilities

- Export individual rally clips
- Export concatenated match/set highlights
- Optional score overlay (bottom-left corner)
- Configurable padding before/after rallies

#### Technical Approach

Using **FFmpeg.wasm** for client-side video processing:
- All processing stays local (no server upload)
- Frame-accurate cuts
- Score overlay burned into video
- MP4 output format

#### Score Overlay Format

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│                                    │
│  Marcus    3                       │
│  Anna      2                       │
└────────────────────────────────────┘
```

Position: Bottom-left, with semi-transparent background

---

### 2025-12-01: Video Export Quality Settings

**Context:** Initial export had poor quality (wrong frame rate, low CRF).

#### Quality Presets Added

| Preset | CRF | FFmpeg Preset | Audio Bitrate |
|--------|-----|---------------|---------------|
| Fast | 26 | veryfast | 128k |
| Balanced | 23 | fast | 192k |
| High | 18 | medium | 256k |

#### Frame Rate Options

- 25 fps (PAL)
- 30 fps (NTSC)  
- 50 fps (PAL high)
- 60 fps (NTSC high)

**Note:** Quality/frame rate options only appear when "Include score overlay" is ON (re-encoding). Stream copy preserves original quality.

---

### 2025-12-01: FFmpeg.wasm Loading Fix

**Context:** FFmpeg was failing to load with "failed to import ffmpeg-core.js" error.

#### Root Cause

The UMD version of `@ffmpeg/core` was incompatible with Vite's ESM module loading.

#### Solution

- Downloaded **ESM version** from `@ffmpeg/core@0.12.6/dist/esm/`
- Files stored in `public/ffmpeg/`:
  - `ffmpeg-core.js` (114KB)
  - `ffmpeg-core.wasm` (32MB)
- CORS headers configured in `vite.config.ts`

---

### 2025-12-01: Score Overlay Limitation

**Context:** Text score overlay fails in FFmpeg.wasm.

#### Issue

FFmpeg.wasm is compiled **without** `libfreetype`, so `drawtext` filter doesn't work.

#### Current Behavior

- When score overlay is enabled, video is re-encoded with quality settings
- No actual text appears (just a semi-transparent box indicator)
- If filter fails, falls back to encoding without any overlay

#### Future Options

1. Server-side FFmpeg for full text support
2. Canvas-based text burn-in before encoding
3. Accept visual box indicator only

---

### 2025-12-01: Insert Rally Feature

**Context:** Users sometimes forget to mark "End Rally - Score" during Step 1 tagging.

#### Implementation

- "Insert Rally Here" button at bottom of left sidebar
- Creates new rally at current video timestamp
- Auto-inserts in chronological position based on time
- Recalculates scores for subsequent rallies

#### Store Action Added

```typescript
insertRallyAtTime: (time: number) => string  // Returns new rally ID
```

---

### 2025-12-01: Highlight Rally Feature

**Context:** Users want to mark favorite rallies for highlight exports.

#### Implementation

- Press **H** key to toggle highlight on selected rally
- Highlighted rallies show star icon and gold border
- Export panel has "Highlights only" toggle
- `isHighlight` field added to Rally type

---

### 2025-12-01: Review Page - Playback Behavior

**Context:** Clarifying how video plays in review mode.

#### Behavior by Selection Type

| Selection | On Navigate/Click | Playback |
|-----------|-------------------|----------|
| Server | Pause | No constrained playback |
| Contact/Shot | **Auto-play** | **Loops** between this shot and next shot |
| Winner | Pause | **Still frame only** — just defines rally end point |

#### Keyboard Updates

| Key | Action |
|-----|--------|
| ↑↓ / **Enter** | Navigate to next timestamp |
| ←→ | Frame step / toggle server |
| Space | Play (loops within shot) |
| W | Toggle winner player |
| H | Toggle highlight |
| Del | Delete shot |

---

### 2025-12-01: Layout Fix - Independent Scroll

**Context:** Left rally panel would push video down when many rallies present.

#### Fix

- Root container: `h-screen overflow-hidden` (not `min-h-screen`)
- Left panel: `flex flex-col min-h-0` with `overflow-y-auto` inner div
- Video stays fixed while rally list scrolls

---

### 2025-12-01: Auto-Scroll to Selected Item

**Context:** When navigating through many rallies, the selected item would go off-screen.

#### Implementation

- Added `timelineScrollRef` to track scrollable container
- Added `data-` attributes to server/contact/winner elements
- `useEffect` triggers `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on selection change
- `block: 'nearest'` keeps item in view without jumping to top

---

### 2025-12-01: Step 1 Tagger Workflow Redesign

**Context:** Too much mental load during tagging. Winner selection interrupts flow.

#### New Workflow

1. Video plays at tagging speed (0.5x / 0.75x / 1x)
2. **Space** = Mark contact
3. **→** = End rally + fast forward (starts at FF speed, second press goes faster)
4. **←** = Slow down
5. **Space** during fast forward = Return to tagging speed + mark serve (new rally)

#### Settings Sidebar Added

| Setting | Options |
|---------|---------|
| Tagging Speed | 0.5x, 0.75x, 1x |
| Fast Forward Speed | 1x, 2x, 4x |

#### Layout Changes

- Video constrained to `50vh max-height 400px` (was full height)
- Settings sidebar on right (264px)
- Status display in center (shows current mode)

#### Store Action Added

```typescript
endRallyWithoutWinner: () => void
// Creates scoring rally with winnerId = undefined
// Winner selected in Review step
```

---

### 2025-12-01: Step 1 Review - Winner Selection via Arrows

**Context:** Need to set winner for rallies that were ended without winner in new workflow.

#### Changes

| Key | On Winner Row |
|-----|---------------|
| ← | Set winner = Player 1 |
| → | Set winner = Player 2 |
| Shift+←→ | Frame step winner time |

#### Removed

- W key toggle (replaced by ←→ direct selection)

---

### 2025-12-01: Step 1 Review - Enhanced Workflow

**Context:** Reduced mental load during tagging by deferring winner selection. Review page now handles more of the data entry.

#### Shot Labeling

| Shot Index | Label |
|------------|-------|
| 1 | Serve |
| 2 | Receive |
| 3+ | Shot N |

#### Rally Timeline Structure (Top to Bottom)

1. **Server** - Toggle with ←→
2. **Serve** - Shot 1, cyan highlight
3. **Receive** - Shot 2, orange highlight
4. **Shot 3, 4, ...** - Additional shots
5. **End of Point** - Movable timestamp with ←→ frame step (purple)
6. **Winner** - Player choice with ←→

#### Data Model Change

```typescript
// Rally type
interface Rally {
  // ... other fields
  endOfPointTime?: number  // Renamed from winnerTime - movable timestamp
  winnerId?: 'player1' | 'player2'  // Player choice only
}
```

#### First Server Selection

- Prompt shown at top of Review page when rallies exist
- Buttons for Player 1 / Player 2
- `setFirstServerAndRecalculate()` action recalculates all rally servers

#### Server Name Overlay

- When viewing Serve (Shot 1), large server name appears overlaid on video
- Semi-transparent, doesn't block video but makes server obvious

#### Timeline Bug Fix

- Video container now uses `h-[45vh] max-h-[350px] overflow-hidden`
- Added `compact={true}` prop to VideoPlayer
- Timeline bar now appears correctly below video

---

### 2025-12-01: Delete Rally & Server Auto-Alternate

**Context:** Need ability to delete entire rallies. Server assignment should follow table tennis rules (2 serves each) with manual override capability.

#### Delete Rally

- Added `deleteRally(rallyId)` action to store
- Keyboard shortcut: `Shift+Delete` deletes entire rally
- Delete button (trash icon) in rally header
- Automatically recalculates scores and rally indices

#### Server Auto-Alternate with Manual Override

- `setFirstServerAndRecalculate(player)` - sets first server, recalculates all rally servers
- `recalculateServersFromRally(rallyId)` - after manual server change, recalculates subsequent rallies
- Each player serves twice (2 serves each), then switches
- Manual change applies from that rally forward

---

### 2025-12-01: Video Export Optimization

**Context:** Video export was jittery and slow. User wants pure stream copy without re-encoding.

#### Changes

1. **Default Mode: Fast Export (Stream Copy)**
   - No re-encoding - frames copied exactly as-is
   - Original quality preserved
   - Uses `-c copy` for both video and audio
   - Output seeking (`-ss` after `-i`) for frame accuracy

2. **Re-encode Mode (Optional)**
   - Only when "Re-encode video" toggle is ON
   - Quality and frame rate settings available
   - Slower but allows customization

3. **Export Only Uses**:
   - Serve timestamp (first contact of rally)
   - End of Point timestamp
   - No other markers processed

#### UI Changes

- "Include score overlay" renamed to "Re-encode video"
- Default is OFF (fast stream copy)
- Shows "Fast, original quality" vs "Slower, customizable quality"

---

## Pending Considerations

### Not Yet Implemented (Backlog)

1. ~~**Delete entire rally**~~ - ✅ Implemented in v0.7.0
2. **Reorder rallies** - In case rallies were tagged out of order
3. **Merge rallies** - Combine two rallies that were mistakenly split
4. **Split rally** - Divide a rally that was mistakenly combined
5. **Bulk time offset** - Shift all contacts in a rally by N frames

### Open Questions

1. ~~Should winner time default to last contact time, or a few frames after?~~ → Resolved: Uses current video time when rally ends
2. ~~Should there be a "rally end" marker separate from winner time for no-score rallies?~~ → Resolved: endOfPointTime is separate from winnerId
3. Should contacts store which player made the shot (for Step 2 pre-population)?

---

### 2025-12-01: MVP Flowchange — Unified Two-Part Workflow

**Context:** User testing revealed workflow improvements for the tagging process.

#### Major Changes

See `MVP_flowchange_spec.md` for full specification. Summary:

1. **Unified Layout** — Both Part 1 (Match Framework) and Part 2 (Rally Detail) use same screen structure
2. **Match Details Modal** — Pre-tagging setup captures video start context, match date, and first serve
3. **Match Panel** — Collapsible tree structure on left sidebar
4. **Essential Mode** — Simplified tagging for faster workflow (see below)
5. **Full Mode** — Detailed tagging with position sector, diagnostics, and luck tracking
6. **Sequential Rally Focus** — Part 2 expands only active rally, others collapse
7. **Preview Buffer** — Shot loops show +0.2s past next timestamp without changing stored values
8. **Progress Indicator** — "Rally X of Y" header
9. **Misclick Auto-Pruning** — Contacts after error shots automatically removed with undo option

#### Shot Quality Expansion

**Before:** `good`, `average`, `weak`

**After:** `good`, `average`, `weak`, `inNet`, `missedLong`, `missedWide`

This enables automatic derivation of:
- `landingType` (error qualities map to net/offLong/wide)
- `winnerId` (error = other player wins)
- `pointEndType` (partial — only forced/unforced needs asking for rally errors)

#### Serve Spin Grid (3×3)

Replaces `serveSpinPrimary` + `serveSpinStrength` with single 9-cell grid based on ball contact point:

```
┌─────────────────────────────────────────┐
│  topLeft     │   topspin    │ topRight   │
├──────────────┼──────────────┼────────────┤
│  sideLeft    │   noSpin     │ sideRight  │
├──────────────┼──────────────┼────────────┤
│  backLeft    │  backspin    │ backRight  │
└─────────────────────────────────────────┘
```

#### Serve Type Update

- **Added:** `lollipop`
- **Removed:** `shovel`
- **Wing derivation:** All serve types now derive wing automatically (Pendulum=FH, ReversePendulum=BH, etc.)

#### Essential Mode (Final)

| Shot | Questions | Inputs |
|------|-----------|:------:|
| Serve | Type → Spin → Landing Zone → Quality | 4 (3 if error) |
| Rally Shot | Wing → Type → Landing Zone → Quality | 4 (3 if error) |
| End of Point | Forced/Unforced? (if error, shot 3+) | 0-1 |

**Totals:** ~12 inputs for 3-shot rally, ~20 for 5-shot rally

#### Full Mode (Final)

| Shot | Questions | Inputs |
|------|-----------|:------:|
| Serve | Type → Position → Spin → Landing Zone → Quality (+issue?) | 5-6 |
| Rally Shot | Wing → Position → Type → Landing Zone → Quality (+issue?) | 4-5 |
| End of Point | Forced/Unforced? → Luck → (Error cause?) | 1-3 |

**Totals:** ~16-18 inputs for 3-shot rally, ~26-30 for 5-shot rally

#### New Data Fields

| Field | Table | Purpose |
|-------|-------|---------|
| `videoStartSetScore` | matches | Set score when video started (e.g. "1-1") |
| `videoStartPointsScore` | matches | Points score when video started (e.g. "5-3") |
| `firstServeTimestamp` | matches | Video timestamp of first serve |
| `videoCoverage` | matches | Full / truncatedStart / truncatedEnd / truncatedBoth |
| `matchResult` | matches | Final winner (player1 / player2 / incomplete) |
| `finalSetScore` | matches | Final set score string |
| `finalPointsScore` | matches | Final points of last set |
| `taggingMode` | matches | essential / full |
| `endOfSetTimestamp` | games | Video timestamp marking set end |
| `serveSpin` | shots | 3×3 grid value (replaces spinPrimary + spinStrength) |
| `isHighlight` | rallies | Boolean for v2 highlight compilations |

#### Schema Changes Summary

| Change | Field | Table |
|--------|-------|-------|
| **Add** | `serveSpin` (9-cell grid) | shots |
| **Deprecate** | `serveSpinPrimary` | shots |
| **Deprecate** | `serveSpinStrength` | shots |
| **Modify** | `shotQuality` (add error types) | shots |
| **Modify** | `serveType` (add lollipop, remove shovel) | shots |
| **Add** | `isHighlight` | rallies |
| **Add** | Match framework fields | matches |
| **Add** | `endOfSetTimestamp` | games |

#### New Store State

| Field | Purpose |
|-------|---------|
| `activeRallyIndex` | Which rally is being detailed in Part 2 |
| `activeShotIndex` | Which shot within active rally |
| `previewBufferSeconds` | Loop buffer (default 0.2s) |
| `loopSpeed` | Preview loop speed (default 0.5x) |

#### Keyboard Shortcuts Update (Part 1)

| Key | Action |
|-----|--------|
| Space | Mark contact / Start new rally |
| → | End rally + Fast Forward |
| ← | Slow down |
| **E** | End of Set marker (new) |
| K | Play/Pause |
| Ctrl+Z | Undo |

#### Playback Speed Changes

| Mode | Default | Options |
|------|---------|---------|
| Tagging | **0.25×** (was 0.75×) | 0.125×, 0.25×, 0.5×, 0.75×, 1× |
| Fast Forward | 1× | 0.5×, 1×, 2×, 3×, 4×, 5× |
| Preview Loop | 0.5× | 0.25×, 0.5×, 0.75×, 1× |

#### Derivation Logic

| Derived Field | Source |
|---------------|--------|
| `landingType` | `shotQuality` error types |
| `winnerId` | Last shot quality + player |
| `pointEndType` | Partial (serviceFault/receiveError auto, forced/unforced asked) |
| `isFault` | Serve + error quality |
| Serve `wing` | `serveType` mapping |
| `inferredSpin` | `shotType` mapping |

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2025-12-01 | 0.1.0 | Initial implementation with Step 1 tagger and review |
| 2025-12-01 | 0.2.0 | Added timing conventions, constrained playback, video export |
| 2025-12-01 | 0.3.0 | FFmpeg.wasm fix, quality presets, frame rate options |
| 2025-12-01 | 0.4.0 | Insert rally, highlight feature, looping behavior, layout fixes |
| 2025-12-01 | 0.5.0 | Step 1 Tagger redesign: fast-forward workflow, settings sidebar, deferred winner |
| 2025-12-01 | 0.6.0 | Step 1 Review: shot labels, end-of-point, first server selection, server overlay |
| 2025-12-01 | 0.7.0 | Delete rally, server auto-alternate with manual override, video export optimization |
| 2025-12-01 | 0.8.0 | MVP Flowchange: unified layout, match framework phase, rally detail phase, essential mode |
| 2025-12-01 | 0.8.1 | Figma design prompts updated for new two-part workflow |

---

### 2025-12-01: Figma Design Prompts Update (v0.8.1)

**Context:** Updated all Figma AI prompts to reflect the new two-part workflow specification.

#### Files Updated

| File | Change |
|------|--------|
| `Screens.md` | Complete inventory rewrite with new screen list, user flow, keyboard shortcuts |
| `02_match_setup.md` | Updated to show Match Details Modal trigger |
| `04_part1_match_framework.md` | **NEW** — Replaces Step 1 Contact Tagger |
| `05_part2_rally_detail.md` | **NEW** — Replaces Step 1 Review + Step 2 Shot Detail |
| `06_match_stats.md` | Updated with tagging mode badge, new quality types |
| `07_player_stats.md` | Updated with mode filter, error breakdown |
| `08_match_history.md` | Updated with Part 1/2 badges, highlight count |
| `11_settings.md` | Updated with tagging mode default, new speed presets |
| `12_match_details_modal.md` | **NEW** — Pre-tagging setup modal |
| `13_match_completion_modal.md` | **NEW** — Post-tagging completion modal |
| `14_shot_question_modal.md` | **NEW** — Essential/Full mode shot annotation |
| `15_end_of_point_modal.md` | **NEW** — Rally completion with derivation display |
| `16_spin_grid_component.md` | **NEW** — 3×3 serve spin selector |
| `17_speed_controls_panel.md` | **NEW** — Tagging/FF/Loop speed controls |
| `DS_04_video_tagging_components.md` | Complete rewrite with Match Panel, unified layout |

#### Files Removed

| File | Reason |
|------|--------|
| `04_step1_contact_tagger.md` | Replaced by Part 1: Match Framework |
| `05_step1_review.md` | Merged into Part 2: Rally Detail |
| `06_step2_shot_detail.md` | Merged into Part 2: Rally Detail |
| `13_winner_dialog.md` | Replaced by End of Point Modal |
| `14_serve_detail_panel.md` | Integrated into Shot Question Modal |

#### Screen Count Change

**Before:** 14 screens + 4 DS prompts
**After:** 17 screens/modals/components + 4 DS prompts

---

### 2025-12-01: v0.9.1 — Foundation Implementation

**Context:** Executed the implementation plan to build the foundational architecture for the new two-part tagging workflow.

#### New Files Created

##### Rules Layer (`app/src/rules/`)

| File | Purpose |
|------|---------|
| `types.ts` | Domain types (PlayerId, ShotQuality, ServeSpin, ServeType, etc.) |
| `calculateServer.ts` | Serve order engine (2-each rule, deuce handling) |
| `deriveEndOfPoint.ts` | End-of-point derivation (winner, landingType, pointEndType) |
| `index.ts` | Rules layer exports |

##### UI Components (`app/src/ui-mine/`)

| Component | Purpose |
|-----------|---------|
| `Button/` | Wrapper with shortcut display support |
| `Card/` | Re-export of shadcn Card |
| `Badge/` | Re-export of shadcn Badge |
| `Icon/` | Centralized icon registry (features NEVER import lucide directly) |
| `SpinGrid/` | 3×3 serve spin selector with numpad support |
| `LandingZoneGrid/` | 3×3 landing zone selector |
| `PositionGrid/` | 3×3 player position selector |
| `SpeedControls/` | Playback speed presets (Tag: 0.25-1×, FF: 1.5-4×) |

##### Tagging Feature (`app/src/features/tagging/`)

| Folder | Contents |
|--------|----------|
| `models.ts` | View model types (MatchPanelVM, RallyDetailVM, etc.) |
| `derive/` | View model derivation hooks (useDeriveMatchPanel, etc.) |
| `blocks/` | Presentational components (ScoreDisplayBlock, RallyPodBlock) |
| `sections/` | Page sections (MatchPanelSection, TaggingControlsSection) |
| `composers/` | Route-level orchestration (TaggingScreenComposer) |

##### Pages & Routes

| File | Purpose |
|------|---------|
| `pages/TaggingScreen.tsx` | New unified tagging page |
| Route: `/matches/new/tagging` | New tagging workflow entry |
| Route: `/matches/:id/tagging` | Existing match tagging |

#### Store Updates (`app/src/stores/taggingStore.ts`)

**New State Fields:**
- `matchDate`, `videoStartSetScore`, `videoStartPointsScore`
- `firstServeTimestamp`, `videoCoverage`, `taggingMode`
- `matchResult`, `finalSetScore`, `finalPointsScore`
- `currentGameIndex`, `games[]`
- `step2Complete`, `currentReviewRallyIndex`
- `showMatchDetailsModal`, `showMatchCompletionModal`, `showEndOfPointModal`
- `pendingEndOfPoint`, `lastPrunedContacts`

**New Actions:**
- `setMatchDetails()`, `setMatchCompletion()`
- `markEndOfSet()`
- `setCurrentReviewRally()`, `nextReviewRally()`, `prevReviewRally()`
- `setRallyPointEndType()`, `setRallyLuckType()`
- `openEndOfPointModal()`, `closeEndOfPointModal()`, `confirmEndOfPoint()`
- `autoPruneContacts()`, `undoLastPrune()`
- `getCurrentRally()`

#### Types Migration

- `app/src/types/index.ts` now re-exports from `@/rules/types`
- Backward compatible — existing imports still work
- New code should import from `@/rules/types` or `@/rules`

#### Configuration Updates

| File | Change |
|------|--------|
| `tsconfig.app.json` | Added `baseUrl` and `paths` for `@/*` alias |
| `vite.config.ts` | Added `resolve.alias` for `@` path |

#### Architecture Alignment

Implementation follows the architecture defined in `Architecture.md`:
- **Composers** access stores and call derive hooks
- **Sections** receive view models via props
- **Blocks** are presentational only (no store access)
- **Rules** are pure functions (no React, no IO)
- **ui-mine** wraps shadcn primitives with project theming

#### Keyboard Shortcuts Implemented

| Key | Action |
|-----|--------|
| `Space` | Add contact |
| `Enter` | End rally (scoring) |
| `L` | End rally (let/no score) |
| `Backspace` | Undo last contact |
| `Shift+S` | Mark end of set |

---

### 2025-12-01: v0.9.4 — Unified Tagging Screen Implementation

**Context:** Implemented the complete unified tagging screen with both Part 1 (Match Framework) and Part 2 (Rally Detail) on a single page.

#### Critical Requirements Implemented

| REQ | Description | Status |
|-----|-------------|--------|
| REQ-1 | Match Details Modal MUST complete before Part 1 begins | ✅ |
| REQ-3 | First serve timestamp manually located and stored | ✅ |
| REQ-6 | Part 2 processes rallies sequentially (no random access) | ✅ |
| REQ-9 | Server derived from first server + 2-serve rule | ✅ |
| REQ-10 | Error quality auto-prunes subsequent shots | ✅ |

#### Match Details Modal Updates

The Match Details Modal now captures the critical first serve timestamp:

| Field | Purpose |
|-------|---------|
| Player 1 Name | Identity |
| Player 2 Name | Identity |
| Match Date | Metadata |
| First Server | Enables server derivation for all rallies |
| Starting Set Score | For partial videos (e.g., "1-1") |
| Starting Points Score | For partial videos (e.g., "5-3") |
| **First Serve Timestamp** | **NEW** — User locates in video, marks with button |

**Validation:** Submit button disabled until first serve timestamp is marked.

#### Store Updates

**New State Fields:**
- `taggingPhase: 'setup' | 'part1' | 'part2'` — Current workflow phase
- `activeRallyIndex: number` — Current rally in Part 2
- `activeShotIndex: number` — Current shot within rally (1-based)
- `shotQuestionStep: number` — Current question step (1-4 for Essential)

**New Actions:**
- `setTaggingPhase(phase)` — Transition between phases
- `initMatchFramework(data)` — Initialize match from Match Details Modal
- `advanceToNextShot()` — Move to next shot in Part 2
- `advanceToNextRally()` — Move to next rally in Part 2
- `setShotQuestionStep(step)` — Set current question step

#### MatchPanelSection Part 2 Mode

The left panel now supports Part 2 mode with:
- Active rally expanded to show shot list
- Future rallies locked (grayed, no click)
- Completed rallies show checkmark
- Current shot highlighted
- End of Point row at bottom of shot list

#### ShotQuestionSection Created

New section for inline shot tagging questions:

**Essential Mode - Serve:**
1. Type (7 options, keys 1-7)
2. Spin Grid (3x3, numpad 1-9)
3. Landing Zone (3x3, numpad 1-9) — SKIP if error quality
4. Quality (6 options, G/A/W/N/L/D)

**Essential Mode - Rally Shot:**
1. Wing (F/B)
2. Type (9 options, keys 1-9)
3. Landing Zone (3x3)
4. Quality (6 options)

#### Video Loop Behavior

Part 2 video now uses constrained playback:
- `loopOnEnd: true` for shots (loops from shot start to next shot + 0.2s)
- `loopOnEnd: false` for end-of-point (still frame)

#### Phase Transitions

- **Setup → Part 1:** After Match Details Modal submit
- **Part 1 → Part 2:** "Complete Part 1 → Start Shot Tagging" button

#### Files Deleted

| File | Reason |
|------|--------|
| `pages/Step1ContactTagger.tsx` | Replaced by unified TaggingScreen |
| `pages/Step1Review.tsx` | Merged into TaggingScreen Part 2 |
| `pages/RallyDetailScreen.tsx` | Merged into TaggingScreen Part 2 |
| `features/tagging/composers/RallyDetailComposer.tsx` | Merged into TaggingScreenComposer |
| `features/tagging/sections/RallyDetailSection.tsx` | Replaced by MatchPanelSection Part 2 mode |

#### Routes Cleaned Up

**Removed:**
- `/matches/new/step1`
- `/matches/:id/step1`
- `/matches/new/review`
- `/matches/:id/review`
- `/matches/new/rally-detail`
- `/matches/:id/rally-detail`

**Active:**
- `/matches/new/tagging` — Unified tagging screen
- `/matches/:id/tagging` — Unified tagging screen (existing match)

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2025-12-01 | 0.1.0 | Initial implementation with Step 1 tagger and review |
| 2025-12-01 | 0.2.0 | Added timing conventions, constrained playback, video export |
| 2025-12-01 | 0.3.0 | FFmpeg.wasm fix, quality presets, frame rate options |
| 2025-12-01 | 0.4.0 | Insert rally, highlight feature, looping behavior, layout fixes |
| 2025-12-01 | 0.5.0 | Step 1 Tagger redesign: fast-forward workflow, settings sidebar, deferred winner |
| 2025-12-01 | 0.6.0 | Step 1 Review: shot labels, end-of-point, first server selection, server overlay |
| 2025-12-01 | 0.7.0 | Delete rally, server auto-alternate with manual override, video export optimization |
| 2025-12-01 | 0.8.0 | MVP Flowchange: unified layout, match framework phase, rally detail phase, essential mode |
| 2025-12-01 | 0.8.1 | Figma design prompts updated for new two-part workflow |
| 2025-12-01 | 0.9.1 | Foundation implementation: rules layer, UI components, tagging feature scaffold |
| 2025-12-01 | 0.9.4 | Unified tagging screen: Match Details Modal, Part 2 sequential flow, ShotQuestionSection |
| 2025-12-01 | **0.9.5** | **Bug fixes: inline setup panel, responsive video, FF mode, delete buttons** |

---

### 2025-12-01: v0.9.5 — Tagging Screen Bug Fixes

**Context:** User testing revealed critical issues blocking the core tagging workflow.

#### Issues Fixed

| # | Issue | Impact | Solution |
|---|-------|--------|----------|
| 1 | Modal blocks video — cannot mark first serve | Critical | Converted to inline panel below video |
| 2 | Video crops when wide instead of containing | Visual | Removed fixed aspect ratio classes |
| 3 | Space pauses video instead of marking contact | Core workflow broken | Restored proper keyboard handling |
| 4 | No delete/undo for misinputs | Cannot fix mistakes | Added delete buttons + keyboard shortcuts |
| 5 | FF mode not working | Core workflow broken | Implemented FF mode state and auto-play |

#### Fix 1: Inline Setup Panel

**Before:** `MatchDetailsModalBlock` — modal overlay blocked video navigation

**After:** `MatchSetupPanelBlock` — inline panel below video during setup phase

Layout during setup:
```
┌────────────────────────────────────────────────────┐
│ Left Panel          │ Video Player                 │
│ (empty until        │ ┌────────────────────────┐   │
│  setup complete)    │ │   [Video playback]     │   │
│                     │ └────────────────────────┘   │
│                     │ ┌────────────────────────┐   │
│                     │ │ MATCH SETUP PANEL      │   │
│                     │ │ [Inline form...]       │   │
│                     │ │ [Start Tagging →]      │   │
│                     │ └────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Files Changed:**
- **Created:** `blocks/MatchSetupPanelBlock.tsx`
- **Updated:** `composers/TaggingScreenComposer.tsx` — renders inline panel in setup phase

#### Fix 2: Video Responsive Sizing

**Before:** `aspect-video` class forced 16:9, causing vertical cropping on wide screens

**After:** `w-full h-full` with parent using `flex-1 min-h-0` for proper flex containment

**Files Changed:**
- `components/tagging/VideoPlayer.tsx` — removed `aspect-video` and `aspect-[16/10]`
- `composers/TaggingScreenComposer.tsx` — video container uses `flex-1 min-h-0`

#### Fix 3: Restored Tagging Behavior (Per Spec Section 1.2.3-1.2.4)

**Keyboard Shortcuts Updated:**

| Key | Before | After (Per Spec) |
|-----|--------|------------------|
| Space | Toggle play/pause | Mark contact (NO pause) |
| → | Step frame | End rally + enter FF mode |
| ← | Step frame | Decrease FF speed / exit FF |
| K | (none) | Play/Pause (dedicated) |

**Speed Presets (Per Spec Section 1.2.4):**

| Mode | Default | Options |
|------|---------|---------|
| Tagging | 0.25× | 0.125×, 0.25×, 0.5×, 0.75×, 1× |
| Fast Forward | 1× | 0.5×, 1×, 2×, 3×, 4×, 5× |

**FF Mode Behavior:**
- Activated on `→` (end rally)
- Auto-plays at FF speed
- `←` decreases speed or exits
- Space marks new rally serve + exits FF mode

**Local State Added (not persisted):**
```typescript
// In TaggingScreenComposer
const [isInFFMode, setIsInFFMode] = useState(false)
const [taggingSpeed, setTaggingSpeed] = useState(0.25)
const [ffSpeed, setFFSpeed] = useState(1)
```

#### Fix 3b: Split Control Panel Layout

**Before:** Single row of controls

**After:** Two-column layout:

```
┌─────────────────────────────┬───────────────────┐
│ TAGGING BUTTONS             │ SPEED CONTROLS    │
│                             │                   │
│ [    CONTACT    ]           │ Tag: .125 [.25]   │
│                             │      .5  .75  1x  │
│ [End Rally] [Let]           │                   │
│                             │ FF:  .5  [1x]  2x │
│ [Undo] [End Set]            │      3x  4x   5x  │
└─────────────────────────────┴───────────────────┘
```

- Both Tag and FF speed rows always visible
- Active mode highlighted (Tag vs FF)
- Clicking speed sets it for that mode

**Files Changed:**
- `sections/TaggingControlsSection.tsx` — complete rewrite with split layout

#### Fix 4: Delete/Undo Functionality

**Capabilities Added:**

| Action | UI | Keyboard |
|--------|-----|----------|
| Delete contact | Trash icon on shot row (hover) | Delete |
| Delete rally | Trash icon on rally header (hover) | Shift+Delete |
| Undo last contact | Undo button | Ctrl+Z / Backspace |
| Toggle highlight | — | H |

**Props Added:**
- `RallyPodBlock.onDelete?: () => void`
- `ShotRowBlock.onDelete?: () => void`
- `MatchPanelSection.onDeleteContact?: (rallyId, contactId) => void`
- `MatchPanelSection.onDeleteRally?: (rallyId) => void`

**Files Changed:**
- `blocks/RallyPodBlock.tsx` — added delete button (hidden until hover)
- `blocks/ShotRowBlock.tsx` — added delete button (hidden until hover)
- `sections/MatchPanelSection.tsx` — wires delete callbacks
- `composers/TaggingScreenComposer.tsx` — handles delete actions

#### Fix 5: End-of-Point Component

**New Component:** `ForcedUnforcedBlock.tsx`

For Shot 3+ errors, displays:
- Error player and winner names
- Forced vs Unforced buttons
- Keyboard hints (F/U keys)

**Per Spec Section 1.10:**

| Last Shot Quality | Shot Index | Derived Winner | Derived pointEndType | User Input |
|-------------------|------------|----------------|----------------------|------------|
| Error | 1 (Serve) | Receiver | `serviceFault` | None |
| Error | 2 (Return) | Server | `receiveError` | None |
| Error | 3+ | Other player | — | Forced/Unforced? |
| In-play | Any | Shooter | `winnerShot` | None |

#### Files Summary

**New Files:**
- `app/src/features/tagging/blocks/MatchSetupPanelBlock.tsx`
- `app/src/features/tagging/blocks/ForcedUnforcedBlock.tsx`

**Modified Files:**
- `app/src/features/tagging/composers/TaggingScreenComposer.tsx`
- `app/src/features/tagging/sections/TaggingControlsSection.tsx`
- `app/src/features/tagging/sections/MatchPanelSection.tsx`
- `app/src/features/tagging/blocks/RallyPodBlock.tsx`
- `app/src/features/tagging/blocks/ShotRowBlock.tsx`
- `app/src/features/tagging/blocks/index.ts`
- `app/src/components/tagging/VideoPlayer.tsx`

---

### 2025-12-01: Gap Resolution Task List Created

**Context:** Actionable task list created to close all gaps identified in the Gap Analysis.

#### Task List Summary

| Phase | Focus | Tasks | Est. Hours |
|-------|-------|-------|------------|
| **Phase 1** | Shot Data Persistence | 5 tasks | 4-5 hrs |
| **Phase 2** | Part 1 Completion Flow | 3 tasks | 2-3 hrs |
| **Phase 3** | End-of-Point Integration | 3 tasks | 2-3 hrs |
| **Phase 4** | Part 2 UX Polish | 4 tasks | 2-3 hrs |
| **Phase 5** | Full Mode Implementation | 4 tasks | 4-5 hrs |
| **Phase 6** | Minor Polish | 4 tasks | 1-2 hrs |
| **Total** | | **23 tasks** | **15-21 hrs** |

#### Critical Tasks (P0)

| Task ID | Description | Files |
|---------|-------------|-------|
| TASK-GAP-001 | Add Shot entity to store types | `rules/types.ts` |
| TASK-GAP-002 | Add shots array to store state | `stores/taggingStore.ts` |
| TASK-GAP-003 | Add shot CRUD actions | `stores/taggingStore.ts` |
| TASK-GAP-004 | Wire ShotQuestionSection to store | `TaggingScreenComposer.tsx` |
| TASK-GAP-006 | Create MatchCompletionModalBlock | NEW |
| TASK-GAP-009 | Wire ForcedUnforcedBlock to workflow | `TaggingScreenComposer.tsx` |

#### File Created

| File | Purpose |
|------|---------|
| `specs/GapResolution_Tasks.md` | Full task list with code snippets and execution checklist |

---

### 2025-12-01: Gap Resolution Phases 1-3 Implemented (v0.9.6)

**Context:** Executed first 3 phases of the Gap Resolution Task List to enable shot data persistence, Part 1 completion flow, and end-of-point integration.

#### Phase 1: Shot Data Persistence ✅

**Contact = Shot model implemented.** Shot data fields added directly to Contact interface:

```typescript
interface Contact {
  // Existing fields
  id, rallyId, time, shotIndex
  
  // NEW: Shot data fields
  playerId?: PlayerId
  serveType?: ServeType
  serveSpin?: ServeSpin
  wing?: Wing
  shotType?: EssentialShotType
  landingZone?: LandingZone
  shotQuality?: ShotQuality
  landingType?: LandingType    // Derived
  inferredSpin?: InferredSpin  // Derived
  isTagged?: boolean           // Completion flag
}
```

**New store actions:**
- `updateContactShotData(contactId, data)` — Partial update for shot fields
- `completeContactTagging(contactId, quality)` — Complete with derived fields

**Question order changed:**
- Old: Type → Spin → Landing → Quality
- New: Type → Spin → Quality → Landing (skip landing if error)

#### Phase 2: Part 1 Completion Flow ✅

**New component:** `MatchCompletionModalBlock` captures:
- Match result (Player 1 / Player 2 / Incomplete)
- Final set score
- Final points score  
- Video coverage type

**New store action:**
- `completeMatchFramework(data)` — Sets completion data and transitions to Part 2

**UX flow:**
1. User clicks "Complete Part 1 → Start Shot Tagging"
2. Modal opens with completion form
3. On submit, transitions to Part 2 with rally/shot indices reset

#### Phase 3: End-of-Point Integration ✅

**Forced/Unforced inline question** (not modal):
- Shows when error quality selected on shot 3+
- Replaces shot questions in same area
- Keyboard shortcuts: F = Forced, U = Unforced

**Auto-prune with undo toast:**
- When error quality selected, subsequent contacts auto-deleted
- 5-second toast with undo button
- Dismissible with × button

**Error handling flow:**
```
Quality selected → Is Error?
├── NO → Go to Landing Zone (step 4)
└── YES → Complete contact + Derive pointEndType
    ├── Shot 1 → serviceFault (auto)
    ├── Shot 2 → receiveError (auto)
    └── Shot 3+ → Show F/U inline question
        └── After selection → Set pointEndType → Auto-prune → Advance
```

#### Files Changed

| File | Change |
|------|--------|
| `rules/types.ts` | Extended Contact interface with shot fields |
| `stores/taggingStore.ts` | Added shot data actions + completeMatchFramework |
| `features/tagging/sections/ShotQuestionSection.tsx` | Reordered questions, updated types |
| `features/tagging/blocks/MatchCompletionModalBlock.tsx` | NEW: Part 1 completion modal |
| `features/tagging/composers/TaggingScreenComposer.tsx` | Wired all handlers, F/U inline, undo toast |
| `features/tagging/blocks/index.ts` | Exported new component |

---

### 2025-12-02: MVP Testing Feedback Implementation (v0.9.8)

**Context:** Major refactoring based on Paul's full testing feedback. See `NotesTestingMVPPaul.md`.

#### Phase A: Data Model Updates ✅
- **Tournament dropdown**: Friendly, Club, Regional, National (enum)
- **Match format**: Best of 1, 3, 5, 7 (default 5)
- **Video start score**: Split into 4 fields (P1 Sets, P2 Sets, P1 Points, P2 Points)
- **Default tagging speed**: Changed 0.25x → 0.5x

#### Phase B: Mark First Serve Creates Rally ✅
- "Mark First Serve" now creates Rally #1 with serve contact immediately
- Rally appears in timeline panel instantly

#### Phase C: Unified MatchTimelinePanelSection ✅
- **NEW component**: Linear timeline panel replacing MatchPanelSection
- Persistent across all phases (setup, part1, part2)
- Set-relative rally numbering (Set 2, Rally 1)
- Expandable rally rows showing shots
- End of Point timestamps visible
- Set summary lines
- Match completion footer

#### Phase E: Part 1 Workflow Fixes ✅
- **Removed winner dialog** from Part 1 (winner set in Part 2)
- **Spacebar marks contact** while video is playing
- **→ arrow = End Rally + FF mode** (creates new rally container)
- **Spacebar in FF mode = mark serve** + exit FF + resume tagging speed
- **Real-time panel updates** as contacts are added

#### Phase F: Video Playback Fixes ✅
- **Auto-play** from first serve after "Start Tagging"
- **Frame-step with ←/→ arrows** (when not in FF mode)
- **Part 2 auto-play** with constrained playback loop

#### Phase G: Routing Cleanup ✅
- `/matches/new` now goes directly to TaggingScreen
- Removed MatchSetup page route
- Inline setup panel in TaggingScreen

#### New Actions
```typescript
startNewRallyWithServe: () => void  // Creates new rally with serve at current time
```

#### Files Changed/Created
| File | Change |
|------|--------|
| `sections/MatchTimelinePanelSection.tsx` | NEW: Unified timeline panel |
| `blocks/MatchSetupPanelBlock.tsx` | Tournament/format dropdowns, 4 score fields |
| `derive/deriveRallyDetail.ts` | Allow contact marking while playing |
| `stores/taggingStore.ts` | startNewRallyWithServe, endRallyScore without winner |
| `composers/TaggingScreenComposer.tsx` | New panel, auto-play, keyboard fixes |
| `App.tsx` | Routing update |
| `pages/index.ts` | Removed MatchSetup export |

#### Keyboard Shortcuts (Part 1)
| Key | Not in Rally | In Rally | FF Mode |
|-----|--------------|----------|---------|
| Space | Add contact | Add contact | Mark serve + exit FF |
| → | Frame step | End rally + FF | Increase FF speed |
| ← | Frame step | Frame step | Decrease FF speed / exit |
| K | Toggle play | Toggle play | Toggle play |

---

### 2025-12-01: Gap Resolution Phases 4 & 6 Implemented (v0.9.7)

**Context:** Completed remaining phases of the Gap Resolution Task List.

#### Phase 4: Part 2 UX Polish ✅

**New component:** `Part2SpeedControlsSection`
- Loop speed control (0.25x, 0.5x, 0.75x, 1x)
- Preview buffer control (0.1s - 0.5s)
- Rendered alongside shot questions in Part 2

**New store fields:**
```typescript
loopSpeed: number        // Default 0.5
previewBufferSeconds: number  // Default 0.2
```

**New actions:**
- `setLoopSpeed(speed)` — Change loop playback speed
- `setPreviewBuffer(seconds)` — Change preview buffer duration
- `goToPreviousShot()` — Navigate back in Part 2

**End of Set constraint (REQ-4):**
- `canEndSet` added to `TaggingControlsVM`
- End Set button disabled during open rally

#### Phase 6: Minor Polish ✅

**Match format dropdown:**
- Options: Best of 3/5/7 to 11, Best of 3 to 21, Single Set
- Stored in `matchFormat` field

**Tournament field:**
- Optional text input for match context
- Stored in `tournament` field

**Part 2 completion modal:**
- `Part2CompletionBlock` shows when all rallies tagged
- Primary action: "View Match Stats"
- Secondary: "Back to Matches"

**Navigation in Part 2:**
- Previous/Next buttons added
- `goToPreviousShot` navigates back through rallies

#### Files Changed

| File | Change |
|------|--------|
| `sections/Part2SpeedControlsSection.tsx` | NEW: Loop/buffer controls |
| `blocks/Part2CompletionBlock.tsx` | NEW: Completion screen |
| `blocks/MatchSetupPanelBlock.tsx` | Added matchFormat, tournament fields |
| `sections/TaggingControlsSection.tsx` | End Set button disabled constraint |
| `derive/deriveRallyDetail.ts` | Added canEndSet to controls |
| `models.ts` | Updated TaggingControlsVM |
| `stores/taggingStore.ts` | Added speed settings, goToPreviousShot, format/tournament |
| `composers/TaggingScreenComposer.tsx` | Wired all new features |

#### All Gap Resolution Complete ✅

| Phase | Status |
|-------|--------|
| Phase 1: Shot Data Persistence | ✅ Complete |
| Phase 2: Part 1 Completion Flow | ✅ Complete |
| Phase 3: End-of-Point Integration | ✅ Complete |
| Phase 4: Part 2 UX Polish | ✅ Complete |
| Phase 5: Full Mode | ⏸️ Deferred |
| Phase 6: Minor Polish | ✅ Complete |

---

### 2025-12-01: Gap Resolution Task List — Clarifications Applied (v1.1.0)

**Context:** User clarifications received and applied to the Gap Resolution Task List.

#### Clarifications Applied

| # | Decision | Impact |
|---|----------|--------|
| 1 | **Contact = Shot** | No separate Shot entity needed. Shot data fields added directly to Contact interface. Simplifies data model. |
| 2 | **Essential Mode only** | Full Mode deferred for post-MVP. Phase 5 removed from task list. |
| 3 | **Question order: Quality → Landing** | Landing Zone step moved after Quality. Skipped entirely if error quality selected. |
| 4 | **Completion → View Match Stats** | Part 2 completion modal shows "View Match Stats" as primary action. |
| 5 | **Clean slate** | No data migration needed. Can assume fresh localStorage. |
| 6 | **5 second undo toast** | Auto-prune undo toast persists for 5 seconds with dismiss button. |

#### Updated Task List Summary

| Phase | Focus | Tasks | Est. Hours |
|-------|-------|-------|------------|
| **Phase 1** | Shot Data on Contact | 4 tasks | 3-4 hrs |
| **Phase 2** | Part 1 Completion Flow | 3 tasks | 2-3 hrs |
| **Phase 3** | End-of-Point Integration | 3 tasks | 2-3 hrs |
| **Phase 4** | Part 2 UX Polish | 4 tasks | 2-3 hrs |
| **Phase 5** | ~~Full Mode~~ | ~~DEFERRED~~ | — |
| **Phase 6** | Minor Polish | 4 tasks | 1-2 hrs |
| **Total** | | **18 tasks** | **10-15 hrs** |

#### Key Changes from v1.0.0

1. **Merged Shot into Contact** — Tasks 001-004 simplified to extend Contact type instead of creating separate Shot entity
2. **Removed Phase 5** — Tasks 016-019 deferred (Full Mode)
3. **New Question Order** — Quality before Landing Zone, with skip logic on error

#### File Updated

| File | Change |
|------|--------|
| `specs/GapResolution_Tasks.md` | Updated to v1.1.0 with clarifications |

---

### 2025-12-01: Gap Analysis Report Created (v0.9.5)

**Context:** Comprehensive gap analysis comparing current implementation against MVP Flowchange Specification.

#### Summary

| Category | Completion |
|----------|------------|
| Data Types | 100% ✅ |
| Store State Fields | 100% ✅ |
| Store Actions | 78% 🟡 |
| Rules Engine | 100% ✅ |
| UI Components | 73% 🟡 |
| Workflow Requirements | 73% 🟡 |
| **Overall** | **~75%** |

#### Critical Gaps Identified

| Priority | Gap | Impact |
|----------|-----|--------|
| **P0** | Shot data not persisted | No analysis possible |
| **P0** | Match Completion Modal missing | Part 1 → Part 2 transition incomplete |
| **P1** | Forced/Unforced flow not triggered | Point classification incomplete |
| **P1** | Auto-prune not triggered | REQ-10 unfulfilled |
| **P2** | Full Mode not implemented | Only Essential works |
| **P2** | Loop/preview speed controls missing | Part 2 UX |

#### Files Created

| File | Purpose |
|------|---------|
| `specs/GapAnalysis_v0.9.5.md` | Full gap analysis with implementation recommendations |

#### Recommended Next Steps

1. Add Shot entity to store and persist shot data
2. Wire Forced/Unforced block to workflow
3. Create Match Completion Modal
4. Add Part 2 speed controls

---

*Last updated: 2025-12-01*

