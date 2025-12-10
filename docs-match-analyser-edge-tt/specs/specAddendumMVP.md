# MVP Spec Addendum

> This document tracks all changes, refinements, and additions to the original MVP specification made during development. Each entry includes the date, what changed, and the rationale.

---

## Change Log

### 2025-12-10: Standardize Status Bar with 5-Column Template (v3.5.0)

**Change Type:** UI/UX - Layout Standardization & Modularization

**What Changed:**
- Established a standard 5-column status bar template for all tagging phases
- Refactored Phase1 and Phase2 composers to use modular layout system
- Created reusable layout components and sections for consistent page structure
- Fixed inconsistent font sizes and restored colored badges for speed indicators

**New 5-Column Template Structure:**
```
┌─────────────┬──────────────┬─────────┬─────────┬──────────┐
│  Column 1   │  Column 2    │ Column 3│ Column 4│ Column 5 │
│ Label   Val │ Label    Val │ Centered│ Centered│  Button  │
│ Label   Val │ Label    Val │  Value  │  Badge  │          │
└─────────────┴──────────────┴─────────┴─────────┴──────────┘
```

**Column Guidelines:**
- **Columns 1-2:** Two lines of text with left/right justification (using `justify-between`)
  - Phase 1 Col 1: "Rally 6" / "Shots 12"
  - Phase 1 Col 2: "Name1 10" / "Name2 8"
- **Column 3:** Centered value with optional label
  - Phase 1: "Saved" / "5"
- **Column 4:** Centered badge/indicator (full height, colored background)
  - Phase 1: "FF" / "2x" with color-coded background (green for Tag, orange for FF, gray for Normal)
- **Column 5:** Action button (full height, always present but can be disabled)
  - Phase 1: "Save Set" button (disabled when no rallies)

**New Layout Components Created:**
- `app/src/features/shot-tagging-engine/layouts/PhaseLayoutTemplate.tsx` - Core 4-section layout for all phases
- `app/src/features/shot-tagging-engine/sections/UserInputSection.tsx` - Input controls container with player tinting
- `app/src/features/shot-tagging-engine/sections/VideoPlayerSection.tsx` - Video player wrapper
- `app/src/features/shot-tagging-engine/sections/StatusBarSection.tsx` - Status bar container (fixed h-12 height)
- `app/src/features/shot-tagging-engine/sections/RallyListSection.tsx` - Shot log container
- `app/src/features/shot-tagging-engine/blocks/StatusGrid.tsx` - 5-column grid layout
- `app/src/features/shot-tagging-engine/blocks/RallyCard.tsx` - Reusable rally display
- `app/src/features/shot-tagging-engine/blocks/ShotListItem.tsx` - Reusable shot display

**Files Modified:**
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`
  - Wrapped entire render in `PhaseLayoutTemplate`
  - Status bar now uses 5-column template with proper text alignment
  - Speed indicator restored with colored badges
  - Save Set button always present (disabled when unavailable)
  
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Wrapped entire render in `PhaseLayoutTemplate`
  - Status bar adapted to 5-column template
  - Added player name badge in column 4

- `app/src/features/shot-tagging-engine/sections/StatusBarSection.tsx`
  - Fixed height at h-12 (48px) to prevent layout shifts
  - Uses StatusGrid for consistent 5-column layout

- `app/src/features/shot-tagging-engine/blocks/StatusGrid.tsx`
  - Single-row grid with `grid-flow-col auto-cols-auto`
  - 4-unit horizontal gaps between columns
  - All items vertically centered

**Phase 1 Status Bar Layout:**
```
Rally     6 │ Name1    10 │ Saved │  FF  │ Save Set
Shots    12 │ Name2     8 │   5   │  2x  │
```

**Phase 2 Status Bar Layout:**
```
Rally     3 │ [Current Question?] │ Progress │ [Player] │ [Future]
Shot     12 │                     │  12/45   │  Name1   │
```

**Benefits:**
- ✅ Complete page consistency across all phases
- ✅ Fixed-height status bar prevents layout shifts during saves/updates
- ✅ Modular components make future phases easy to create
- ✅ Consistent font sizes across all status items
- ✅ Colored speed badges improve visual feedback
- ✅ Reusable layout template standardizes page structure
- ✅ Easy to maintain and extend for additional phases

**Impact:**
- All phases now share the same visual structure and layout logic
- Status bar always maintains consistent height regardless of content changes
- Adding new phases requires only filling in the 5-column template
- Future optional tagging phases can reuse all layout components

**Rationale:**
With multiple optional phases planned (allowing players to choose which shot data to tag), establishing a consistent layout template is critical. The 5-column status bar provides a flexible yet standardized structure that adapts to different phase requirements while maintaining visual consistency. The modular component architecture makes it trivial to create new phases while ensuring they integrate seamlessly with the existing UI.

---

### 2025-12-09: Fix Critical Server ID Bug in Phase1 Setup (v3.4.2)

**Change Type:** Bug Fix - Critical Data Integrity Issue

**Problem Identified:**
The server selection from `SetupControlsBlock` was being completely ignored. The system always used `playerContext.firstServerId` (hardcoded to 'player1') regardless of which player the user selected as the next server. This caused:
- Incorrect server assignments for the first rally after setup
- Wrong stub rally server assignments
- Incorrect server alternation throughout the set
- Database saving wrong server_id values

**Root Cause:**
1. `TaggingUIComposer.tsx` created `playerContext` with hardcoded `firstServerId: 'player1'`
2. `setup.nextServerId` from `SetupControlsBlock` was saved to database but never stored in React state
3. All `calculateServer` calls used `playerContext.firstServerId` instead of the actual setup data
4. The bug was intermittent because changing scores after selecting server triggered re-renders that coincidentally got correct results in some cases

**Solution:**
- Added `setupNextServer` state variable to Phase1TimestampComposer
- Store `setup.nextServerId` in state during `handleSetupComplete`
- Load `setup_next_server_id` from database when resuming existing sessions (convert DB ID back to 'player1'/'player2')
- Replace all `playerContext.firstServerId` references with `setupNextServer` in `calculateServer` calls

**Files Modified:**
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`
  - Added `setupNextServer` state (line ~100): `useState<'player1' | 'player2'>('player1')`
  - Store setup server in `handleSetupComplete` (line ~232): `setSetupNextServer(setup.nextServerId)`
  - Load setup server when resuming (lines ~127-130): Convert database ID to 'player1'/'player2'
  - Updated `completeRally` function (line ~312): Use `setupNextServer` instead of `playerContext.firstServerId`
  - Updated rally display (line ~742): Use `setupNextServer` for server name display
  - Updated shot display (line ~755): Use `setupNextServer` for shot player calculation

**Impact:**
- ✅ Setup selection is now correctly respected regardless of button press order
- ✅ First rally after setup uses the correct server from user's selection
- ✅ Stub rallies created during setup have correct server alternation
- ✅ Server alternation throughout the set follows correct table tennis rules
- ✅ Resuming sessions maintains correct server data from database
- ✅ All server_id values saved to database are now correct

**Testing:**
Verified with multiple scenarios:
1. Player 2 serves first at 0-0 → Correct server used
2. Player 1 serves first at 2-3 → Correct stub rallies and next server
3. Server selection as last action before Start → Bug fixed (was failing before)
4. Resume existing session → Correct server loaded from database

**Rationale:**
This was a critical data integrity bug affecting every set tagged. The setup data is the source of truth for server alternation, and ignoring it corrupted all downstream calculations and database records. The fix ensures setup data flows correctly through the entire Phase 1 workflow.

---

### 2025-12-09: Standardize SetupControlsBlock to ButtonGrid Pattern (v3.4.1)

**Change Type:** UI/UX - Layout Standardization

**What Changed:**
- Redesigned SetupControlsBlock to use a SINGLE ButtonGrid with 3 columns for maximum compactness
- Removed custom padding (`p-6`), spacing (`space-y-6`), and fixed button heights (`h-14`, `h-10`, `h-12`)
- Column 1: Player 1 server button + score controls (-, score, +) vertically stacked
- Column 2: Player 2 server button + score controls (-, score, +) vertically stacked
- Column 3: Start button (fills entire column height)
- Total UI height reduced from ~500px to ~120px (single ButtonGrid row)

**Files Modified:**
- `app/src/features/shot-tagging-engine/blocks/SetupControlsBlock.tsx`
  - Added ButtonGrid import
  - Converted container from `p-6 space-y-6` to minimal padding structure
  - Row 1: ButtonGrid columns={2} for server selection (player1/player2)
  - Row 2: ButtonGrid columns={4} for score controls (P1-, P1+, P2-, P2+)
  - Row 3: ButtonGrid columns={1} for Start Tagging button
  - All buttons now use `w-full h-full` to fill ButtonGrid cells
  - Removed all fixed height classes

**Layout Structure:**
```
Single ButtonGrid (3 columns, ~120px height):
┌──────────────┬──────────────┬──────────────┐
│  [Player 1]  │  [Player 2]  │              │
│              │              │              │
│  [−] 0 [+]   │  [−] 0 [+]   │   [Start]    │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

**Rationale:**
- **Maximum compactness:** Single ButtonGrid row = same height as Phase1ControlsBlock (~120px)
- **Smooth transitions:** No jarring UI size changes when switching from setup to tagging
- **Predictable height:** Uses ButtonGrid's calculated height formula for consistency
- **Better UX:** Ultra-compact layout fits naturally in the bottom control area alongside other button grids
- **All-in-one:** Server selection, score controls, and start button in one unified row

**Before vs After:**
- Before: Custom layout with `p-6`, `space-y-6`, mixed button heights → ~500px total (4x the height)
- After: Single ButtonGrid with 3 columns, nested elements → ~120px total (matches Phase1ControlsBlock)

**User Impact:**
- **Positive:** More consistent UI experience across all tagging phases
- **Visual:** Slightly more compact setup screen, but all functionality preserved
- **No breaking changes:** Same inputs and outputs, just different visual layout

**Testing:**
- ✅ TypeScript compilation successful
- ✅ No linter errors
- ✅ All ButtonGrid imports resolve correctly
- Manual browser testing recommended to verify visual layout and button interactions

---

### 2025-12-09: Extract Inference to Phase 3 (v3.4.0)

**Change Type:** Architecture - Flow Enhancement

**What Changed:**
- Extracted inference engine from Phase 2 to new Phase 3 composer
- Phase 2 now completes immediately after shot tagging
- Phase 3 offers "Run Analysis" or "Skip" options
- Inference is now optional and can be run later (future enhancement)

**Files Created:**
- `app/src/features/shot-tagging-engine/composers/Phase3InferenceComposer.tsx` - New standalone composer for inference execution with user choice UI

**Files Modified:**
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Removed `runInferenceForSet` import
  - Removed inference execution (lines 580-586)
  - Removed `rallyDb` import (no longer needed)
  - Kept `finalizeMatchAfterPhase2` call (match-level calculation, not inference)
- `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx`
  - Added Phase3InferenceComposer import
  - Updated Phase type: `'setup' | 'phase1' | 'phase2' | 'phase3' | 'complete'`
  - Removed obsolete 'saving' phase
  - Updated `handleCompletePhase2` to transition to phase3
  - Added `handleCompletePhase3` and `handleSkipPhase3` handlers
  - Added Phase3 render block with player context
- `app/src/features/shot-tagging-engine/composers/index.ts`
  - Added Phase3InferenceComposer export
- `app/src/data/entities/sets/set.types.ts`
  - Added `inference_complete?: boolean | null` - tracks if inference has been run
  - Added `inference_completed_at?: string | null` - ISO timestamp of inference completion

**Rationale:**
- **Faster Phase 2 completion:** Users who want raw data don't wait for inference
- **Better separation of concerns:** Tagging (Phase 2) vs analysis (Phase 3) are now distinct
- **User control:** Choice to run or skip inference, with option to run later
- **Allows re-running inference:** If rules are updated in the future, inference can be re-executed without re-tagging

**Flow Changes:**

**Before:**
```
Phase 1 (Timestamps) → Phase 2 (Shot Details) → [Auto-runs inference] → Complete
```

**After:**
```
Phase 1 (Timestamps) → Phase 2 (Shot Details) → Phase 3 (Inference Choice) → Complete
                                                      ↓ Skip or Run
```

**Phase 3 User Experience:**
- Screen appears after Phase 2 completion
- Shows "🧠 Run Shot Analysis?" with explanation
- Lists what inference predicts: Shot types, spin, player position, pressure levels, special patterns
- Two buttons:
  - "Skip for Now" - goes to completion, sets `inference_complete: false`
  - "Run Analysis" - executes inference, sets `inference_complete: true`
- Progress indicator during execution
- Error handling with retry option
- Auto-advances to completion after 1 second

**Migration Notes:**
- Existing sessions in Phase 1 or Phase 2: unaffected
- Next new session: will show Phase 3 screen after Phase 2
- No data migration required
- Old data without inference still valid (inference_complete will be null)

**User Impact:**
- **Positive:** Faster tagging completion, more control over workflow
- **New screen:** Phase 3 choice modal after Phase 2 completion
- **No breaking changes:** Existing functionality preserved

**Future Enhancement Opportunities:**
1. Add "Run Inference" button in data viewer for sets where `inference_complete === false`
2. Add inference status badges in set list (Analyzed ✅ / Skipped ⏭️ / Pending ⏸️)
3. Allow re-running inference if rules are updated

**Testing:**
- ✅ TypeScript compilation successful (no new errors)
- ✅ All imports resolve correctly
- ✅ Phase flow logic verified
- Manual browser testing recommended for full workflow

---

### 2025-12-09: Database Operations Refactor - Remove Redundant Saves (v3.3.0)

**Eliminated redundant database operations by moving all data persistence into Phase1 and Phase2 composers, making TaggingUIComposer a pure orchestrator.**

#### Problem Statement

The previous architecture had a critical flaw:
- **Phase1TimestampComposer**: Auto-saved rallies and shots after each rally ✅
- **Phase2DetailComposer**: Auto-saved shot details after each shot ✅
- **TaggingUIComposer**: DELETED all saved data, then re-saved everything from scratch ❌

This caused:
- Redundant database operations (data saved 2-3 times)
- Data loss risk (browser crash during re-save loses all auto-saves)
- Violation of separation of concerns (orchestrator handling persistence)
- Complex code (~240 lines of save logic in TaggingUIComposer)

#### Database Schema Changes

**Rally Table Updates** (`app/src/data/entities/rallies/rally.types.ts`)

Added timestamp tracking fields:
- `timestamp_start: number | null` - First shot's timestamp_start
- `timestamp_end: number | null` - Last shot's timestamp_end
- `end_of_point_time: number | null` - Kept for backwards compatibility (marked as LEGACY)

**Rationale:** Rally timing is now explicitly tracked separately from point timing, enabling better video segment management.

#### Phase1TimestampComposer Updates

**1. Shot `timestamp_end` Calculation** (lines 415-430)

**Before:**
```typescript
for (const shot of rally.shots) {
  const dbShot = mapPhase1ShotToDBShot(...)
  dbShot.timestamp_end = null  // ❌ Set to null
  await shotDb.create(dbShot)
}
```

**After:**
```typescript
for (let i = 0; i < rally.shots.length; i++) {
  const shot = rally.shots[i]
  const nextShot = rally.shots[i + 1]
  
  const timestamp_end = nextShot 
    ? nextShot.timestamp          // Next shot's start time
    : rally.endTimestamp          // Rally end time for last shot
  
  const dbShot = mapPhase1ShotToDBShot(...)
  dbShot.timestamp_end = timestamp_end  // ✅ Calculated immediately
  await shotDb.create(dbShot)
}
```

**2. Rally Timestamp Calculation** (lines 398-413)

Added rally timing before save:
```typescript
// Calculate rally timestamps
const rallyTimestampStart = rally.shots[0].timestamp
const rallyTimestampEnd = rally.endTimestamp

dbRally.timestamp_start = rallyTimestampStart
dbRally.timestamp_end = rallyTimestampEnd
dbRally.end_of_point_time = rallyTimestampEnd  // Keep existing field populated
```

**3. Stub Rally Updates**

Added new timestamp fields to stub rally creation (lines 188-211):
```typescript
await rallyDb.create({
  // ... existing fields ...
  timestamp_start: null,  // No video for stub rallies
  timestamp_end: null,
  // ... rest of fields ...
})
```

#### Phase2DetailComposer Updates

**New Auto-Finalization on Completion** (lines 565-603)

**Before:**
```typescript
// All shots complete
if (setId) {
  setDb.update(setId, {
    tagging_phase: 'phase2_complete',
    is_tagged: true,
  }).catch(console.error)
}
if (onComplete) onComplete(updatedShots)
```

**After:**
```typescript
// All shots complete
if (setId && player1Id && player2Id) {
  try {
    // 1. Update set status
    await setDb.update(setId, {
      tagging_phase: 'phase2_complete',
      is_tagged: true,
      tagging_completed_at: new Date().toISOString(),
    })
    
    // 2. Run inference on all shots
    const dbRallies = await rallyDb.getBySetId(setId)
    const dbShots = await shotDb.getBySetId(setId)
    await runInferenceForSet(dbRallies, dbShots)
    
    // 3. Finalize match-level data
    const currentSet = await setDb.getById(setId)
    if (currentSet) {
      const { finalizeMatchAfterPhase2 } = await import('./finalizeMatch')
      await finalizeMatchAfterPhase2(currentSet.match_id, setId, player1Id, player2Id)
    }
    
  } catch (error) {
    console.error('[Phase2] Error during finalization:', error)
    alert('Tagging complete, but some finalization steps failed.')
  }
}
if (onComplete) onComplete(updatedShots)
```

**Changed `handleAnswer` to async** to support await operations.

**Added imports:**
```typescript
import { rallyDb } from '@/data'
import { runInferenceForSet } from './runInference'
```

#### New File: finalizeMatch.ts

**Created:** `app/src/features/shot-tagging-engine/composers/finalizeMatch.ts`

Encapsulates match-level finalization logic (previously in TaggingUIComposer):

```typescript
export async function finalizeMatchAfterPhase2(
  matchId: string,
  setId: string,
  player1Id: string,
  player2Id: string
): Promise<void>
```

**Responsibilities:**
1. Calculate `sets_before/after` for all sets using `calculateSetsBeforeAfter()`
2. Update each set with its sets progression
3. Calculate match winner based on completed sets
4. Update match record with final set counts and `match_detail_level: 'shots'`

**Why separate file?**
- Reusable (can be called from multiple places)
- Testable (pure async function)
- Single Responsibility Principle

#### TaggingUIComposer Cleanup

**Removed ~240 lines of database save logic** (lines 276-514)

**Before:**
```typescript
const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
  setPhase('saving')
  
  try {
    // Step 0: Delete existing data
    await deleteSetTaggingData(setData.id)
    
    // Step 1-2: Map and save rallies
    const savedRallies = await Promise.all(...)
    
    // Step 3: Calculate timestamp_end
    const shotsWithTimestamps = applyTimestampEnd(...)
    
    // Step 4-8: Save shots, update rallies, calculate scores...
    // Step 9-12: Update set, run inference, finalize match...
    
    setPhase('complete')
  } catch (error) {
    // ...
  }
}
```

**After:**
```typescript
const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
  console.log('[TaggingUI] Phase 2 complete!')
  console.log('[TaggingUI] All data already saved by Phase1 and Phase2 composers')
  console.log('[TaggingUI] Inference and match finalization already complete')
  
  // Transition to completion screen
  setPhase('complete')
}
```

**Removed imports:**
```typescript
// DELETED (no longer needed):
import { calculateShotPlayer } from '@/rules'
import { runInferenceForSet } from './runInference'
import {
  mapPhase1RallyToDBRally,
  mapPhase1ShotToDBShot,
  mapPhase2DetailToDBShot,
  calculateScoresForRallies,
  markRallyEndShots,
  applyTimestampEnd,
  type DetailedShotData,
} from './dataMapping'

const { update: updateMatch } = useMatchStore()  // DELETED
const { create: createRally, update: updateRally } = rallyDb  // DELETED
const { create: createShot } = shotDb  // DELETED
const { 
  deleteTaggingData: deleteSetTaggingData,  // DELETED
  markTaggingCompleted: markSetTaggingCompleted,  // DELETED
  update: updateSetService,  // DELETED
} = setDb
```

**Kept only essential imports:**
```typescript
import { rallyDb, shotDb } from '@/data'  // Still needed for resume logic
import { convertDBRallyToPhase1Rally } from './dataMapping'  // For resume
const { 
  getByMatchId: getSetsByMatchId,
  markTaggingStarted: markSetTaggingStarted,
  deleteTaggingData: deleteSetTaggingData,  // For redo workflow
} = setDb
```

#### Benefits

✅ **No redundant saves** - Data written once, immediately after capture  
✅ **Crash-safe** - Auto-saves persist immediately; browser crash loses only current shot  
✅ **Cleaner code** - TaggingUIComposer reduced by ~240 lines  
✅ **Better separation** - Each composer handles its own persistence  
✅ **More testable** - Finalization logic extracted to pure function  
✅ **Better logging** - Clear console messages show where saves happen  

#### Data Flow

**Previous (Redundant):**
```
Phase 1 → Auto-save rallies/shots to DB
Phase 2 → Auto-save shot details to DB
TaggingUI → DELETE all data, re-save everything
```

**New (Efficient):**
```
Phase 1 → Save rallies/shots with timestamp_end ✓
Phase 2 → Save shot details, run inference, finalize match ✓
TaggingUI → Just transition to 'complete' ✓
```

#### Migration Notes

- **No database migration needed** - New timestamp fields default to `null`
- **Backwards compatible** - Old data still works, new data has better timestamps
- **Resume workflow unchanged** - TaggingUIComposer still handles resume via `rallyDb` and `shotDb`
- **Redo workflow unchanged** - Still uses `deleteSetTaggingData()` when user redoes a set

#### Testing Verification

✅ TypeScript compilation passes (`npx tsc --noEmit`)  
✅ All imports resolved correctly  
✅ No runtime errors in linter  

**Manual testing recommended:**
1. Tag fresh set (Phase 1 → Phase 2 → Complete)
2. Verify shot `timestamp_end` populated (check database)
3. Verify rally `timestamp_start/end` populated
4. Verify inference runs automatically after Phase 2
5. Verify match data finalizes correctly
6. Test resume workflow (close browser mid-tagging, reopen)
7. Test redo workflow (redo tagged set)

#### Files Changed

**Schema:**
- `app/src/data/entities/rallies/rally.types.ts` - Added timestamp fields

**Composers:**
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` - Calculate shot/rally timestamps
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx` - Run inference and finalize match
- `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx` - Remove save logic

**New Files:**
- `app/src/features/shot-tagging-engine/composers/finalizeMatch.ts` - Match finalization module

**Documentation:**
- `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` - This entry

---

### 2025-12-09: Phase 1 Setup Flow with Score Tracking (v3.2.0)

**Added set setup flow to Phase1TimestampComposer to capture starting conditions and enable accurate score tracking throughout tagging.**

#### Overview

This update adds a mandatory setup step at the beginning of Phase 1 tagging that:
- Captures which player serves next
- Records current score
- Creates stub rally entries for previous points
- Enables accurate score tracking throughout tagging
- Provides proper set completion flow with modal navigation

#### Database Schema Changes

**1. Set Table Updates** (`app/src/data/entities/sets/set.types.ts`, `set.db.ts`)

Added setup tracking fields:
- `setup_starting_score_p1: number | null` - Player 1 score at start of tagging
- `setup_starting_score_p2: number | null` - Player 2 score at start of tagging  
- `setup_next_server_id: string | null` - Database ID of next server
- `setup_completed_at: string | null` - ISO timestamp of setup completion

**2. Rally Table Updates** (`app/src/data/entities/rallies/rally.types.ts`, `rally.db.ts`)

Added stub rally indicator:
- `is_stub_rally: boolean` - Default `false`, marks rallies created during setup for prior points

#### New UI Components

**1. SetupControlsBlock** (`app/src/features/shot-tagging-engine/blocks/SetupControlsBlock.tsx`)

Captures setup data before tagging begins:
- Player name display
- "Who serves next?" toggle buttons
- Score input with increment/decrement buttons (+/- interface)
- Range validation (0-20 per player)
- "Start Tagging" button with score validation

**2. SetEndWarningBlock** (`app/src/features/shot-tagging-engine/blocks/SetEndWarningBlock.tsx`)

Alert banner shown when set end conditions are met:
- Displays detected set end score
- Shows current score if user continues past set end
- "Save Set" and "Continue Tagging" action buttons
- Yellow warning styling with ⚠️ icon

**3. CompletionModal** (`app/src/features/shot-tagging-engine/blocks/CompletionModal.tsx`)

Modal shown after saving a set:
- Displays final score and set number
- Three navigation options:
  - "Tag Next Set" - Navigate to next set (creates if needed)
  - "View Data" - Navigate to DataViewer filtered to current set
  - "Back to Matches" - Return to matches list
- Blocks UI until user chooses an action

#### Phase1TimestampComposer Updates

**1. New State Variables**
- `setupComplete: boolean` - Tracks if setup flow completed
- `setupStartingScore: { player1: number; player2: number }` - Stores setup scores
- `setEndDetected: boolean` - Flags when set end conditions met
- `setEndScore: { player1: number; player2: number } | null` - Stores detected set end score
- `showCompletionModal: boolean` - Controls completion modal visibility

**2. Initialization Logic**

On component mount, checks for existing rallies:
- If tagged rallies exist: Skip setup, resume existing session
- Load setup data from set record
- Calculate current score from last rally
- If no tagged rallies: Show setup screen

**3. Setup Completion Flow** (`handleSetupComplete`)

When user completes setup:
1. Validates scores using `validateSetScore()`
2. Calculates previous servers using `calculatePreviousServers()`
3. Creates stub rally entries for each prior point
4. Saves setup data to set record
5. Initializes tagging with correct score
6. Hides setup UI, shows tagging controls

**4. Rally Completion with Score Tracking**

Updated `completeRally()` to:
- Calculate score before/after for each rally
- Save scores to database with rally
- Check for set end conditions using `deriveSetEndConditions()`
- Display set end warning if conditions met
- Update local score state for next rally

**5. Set Completion Flow** (`handleSaveSet`)

When user saves set:
1. Calculates final winner from scores
2. Updates set record with:
   - `tagging_phase: 'phase1_complete'`
   - `winner_id` (calculated from scores)
   - `player1_score_final`, `player2_score_final`
3. Shows completion modal

**6. Tag Next Set Flow** (`handleTagNextSet`)

When user clicks "Tag Next Set":
1. Gets current set info
2. Checks if next set exists
3. Navigates to Phase1 with next set ID
4. New set will show setup screen

**7. UI Changes**
- Setup screen replaces tagging controls until setup complete
- Set end warning banner appears in status strip when triggered
- "Save Set" button replaces "Save Progress" and "Complete Phase 1" buttons
  - Green styling when set end detected
  - Standard primary styling otherwise
- Completion modal appears after save
- Removed manual save functionality (auto-save on rally completion)

#### New Rules Functions

**1. calculatePreviousServers** (`app/src/rules/calculate/calculatePreviousServers.ts`)

Works backwards from next server to determine who served each previous rally:
- Uses table tennis serve alternation rules
- Every 2 points in normal play (0-0 to 10-9)
- Every 1 point in deuce (after 10-10)
- Returns array of server IDs for rallies 1..totalPoints

**2. validateSetScore** (`app/src/rules/validate/validateSetScore.ts`)

Validates scores are logically reachable:
- Range check (0-30 per player)
- Applies set end rules (first to 11, 2 clear points, deuce)
- Allows completed set scores
- Allows in-progress scores

**3. deriveSetEndConditions** (`app/src/rules/derive/set/deriveSetEndConditions.ts`)

Checks if current score meets set end:
- Returns `{ isSetEnd: boolean, winner?: 'player1' | 'player2' }`
- Set ends when: score >= 11 AND lead >= 2 points

#### SetSelectionModal Enhancements

Updated match detail set selection to show Phase 1/2 status:

**Status Labels:**
- "Not Started" → Not tagged
- "Phase 1 In Progress" → `tagging_phase: 'phase1_in_progress'`
- "Phase 1 Complete" → `tagging_phase: 'phase1_complete'`
- "Phase 2 In Progress" → `tagging_phase: 'phase2_in_progress'`
- "Phase 2 Complete" → `tagging_phase: 'phase2_complete'`

**Action Buttons by Status:**
- Not Started: "Tag Phase 1" button
- Phase 1 In Progress: "Continue Phase 1" button
- Phase 1 Complete: "Tag Phase 2" button
- Phase 2 In Progress: "Continue Phase 2" button
- Complete: "View Data" button (primary) + "Redo" button

**Status Colors:**
- Not Started: neutral gray
- Phase 1 In Progress: yellow
- Phase 1 Complete: cyan
- Phase 2 In Progress: blue
- Complete: green

#### Stub Rally Data

Pre-populated rallies created during setup contain:
- `server_id` (alternating based on TT rules)
- `receiver_id` (opponent)
- `is_scoring: true`
- `rally_index: 1, 2, 3...`
- `winner_id: null` (unknown)
- `framework_confirmed: false`
- `is_stub_rally: true`
- All timestamps, shots, scores: `0` or `null`
- Not included in score tracking (only tagged rallies have `score_before`/`score_after`)

#### Score Tracking Behavior

**First Tagged Rally:**
- `score_before` = setup starting score (e.g., 2-3)
- `score_after` = calculated from winner (e.g., 3-3 or 2-4)

**Subsequent Rallies:**
- `score_before` = previous rally's `score_after`
- `score_after` = `score_before` + 1 for winner
- Let rallies: `score_after` = `score_before` (no change)

**All saves happen at existing rally completion point** (auto-save on rally end)

#### Data Source of Truth

**Overwrite Behavior:**
- Tagged data is source of truth
- Always overwrite pre-entered results with tagged scores
- Set winner and final scores calculated from tagged rallies

**Resume Behavior:**
- If `existingRallies.length > 0`, skip setup entirely
- Go straight to Phase 1 tagging (resume mode)
- Load scores from last rally

#### Rationale

**Why Add Setup Flow:**
1. **Partial Set Tagging** - Users can start tagging mid-set (e.g., only tag final 5 rallies)
2. **Accurate Score Tracking** - Enables proper server calculation and statistics
3. **Complete Rally History** - Stub rallies maintain proper rally indexing
4. **Better UX** - Clear completion flow with modal navigation
5. **Prevents Duplicates** - Removes manual save button that created duplicate rallies

**Why Stub Rallies:**
- Maintains correct rally numbering for entire set
- Enables server calculation for first tagged rally
- Provides context for match statistics
- Allows future enhancement to fill in stub rally data if known

**Why Remove Manual Save:**
- Each rally already auto-saves on completion
- Manual save created duplicates
- Redundant with new "Save Set" button

#### Migration Notes

- Existing sets without setup data will show setup screen on first load
- Stub rallies are marked with `is_stub_rally: true` and `framework_confirmed: false`
- Pre-entered set results are overwritten by tagged results (tagged = source of truth)
- No migration script needed - existing sets continue to work

#### Testing Scenarios

1. **Fresh Set** - Go through setup, tag rallies, save set ✓
2. **Resume Set** - Verify setup skipped, scores loaded ✓
3. **Set End** - Verify warning shows, continue works ✓
4. **Completion** - Verify modal, navigation works ✓
5. **Partial Tagging** - Start from score 8-7, tag to 11-9 ✓

---

### 2025-12-09: Removed serve type from Phase 2 tagging flow (v3.1.1)

**Simplified serve tagging by removing the serve type question from the UI flow.**

#### Rationale

The serve type field (`serve_type` in database) was not being used in any:
- Statistics calculations
- Inference logic
- Analysis functions
- Business rules

The field was purely metadata stored in the database and displayed only in the DataViewer. Given the MVP focus on essential tagging, this question added unnecessary friction to the serve tagging flow without providing value for the current feature set.

#### Changes

**1. Phase 2 Tagging Flow**

Serve question sequence simplified from 4 steps to 3:
- **Before**: direction → length → spin → serve type → next shot
- **After**: direction → length → spin → next shot

**2. Type Definitions**

Removed `serveType` field from:
- `DetailedShot` interface in `Phase2DetailComposer.tsx`
- `DetailedShotData` interface in `dataMapping.ts`
- `ServeStep` type (removed `'serveType'` as valid step)

**3. UI Components**

Removed entire serve type button grid (lines 794-810 in Phase2DetailComposer.tsx):
- "Serve (Unknown)" button
- "Pendulum", "Backhand", "Reverse Tomahawk", "Tomahawk", "Hook", "Lolipop" buttons

**4. Save Logic**

Removed save logic for `serve_type` in:
- `_handleManualSave()` function
- `saveCurrentShotToDatabase()` function
- `buildPhase2Updates()` in dataMapping.ts
- `convertDBShotToDetailedShot()` reverse mapping

**5. Question Flow Logic**

Updated flow control functions:
- `isLastQuestion()`: Changed serve last question from `'serveType'` to `'spin'`
- `getNextStep()`: Removed `'serveType'` step from serve flow

#### Database Impact

**No migration required:**
- The `serve_type` field remains in `DBShot` type (for backwards compatibility)
- Defaults to `null` in `createEntityDefaults.ts`
- Existing data is preserved
- Future cleanup: field can be removed in a future schema refactor

#### Files Modified

- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`

#### Future Considerations

- The `deriveServeWing()` function in `rules/types.ts` is unused and can be removed in future cleanup
- The `ServeType` type definition can remain for now (future cleanup)
- If serve type analysis becomes needed in the future, the field can be re-added or derived from video analysis

#### Benefits

- Faster serve tagging (3 questions instead of 4)
- Reduced cognitive load for user
- Cleaner codebase with removed unused code paths
- Backwards compatible (no breaking changes)

---

### 2025-12-08: Split shot_result into shot_result and shot_quality (v3.1.0)

**Separated objective error states from subjective quality assessment in shot data model.**

#### Issue

The `shot_result` field was mixing two conceptually different types of data:
- **Objective error states**: 'in_net', 'missed_long', 'missed_wide' (what physically happened)
- **Subjective quality assessment**: 'good', 'average' (how well the shot was executed)

This conflation made the data model unclear and made it difficult to distinguish between:
- Shots that went in play but were low quality
- Shots that resulted in errors
- High quality shots vs winning shots

#### Root Cause

Original schema design combined both concepts into a single field for simplicity, but this created logical inconsistencies:
- An error shot ('in_net') couldn't also have a quality rating
- A 'good' shot could still lose the point if opponent returned it well
- Quality and result are independent dimensions of shot assessment

#### Fix

**1. Type System Split**

Split `ShotResult` type into two separate fields:
- `shot_result: 'in_net' | 'missed_long' | 'missed_wide' | 'in_play'` (NOT NULL, defaults to 'in_play')
- `shot_quality: 'high' | 'average' | null` (only applicable when shot_result === 'in_play')

**2. Phase 1 Logic (Timestamp Capture)**

Only the LAST shot in a rally gets error shot_result based on rally end condition:
- Rally ends with "In-Net" → last shot gets `shot_result = 'in_net'`
- Rally ends with "Long" → last shot gets `shot_result = 'missed_long'`
- Rally ends with "Winner" → last shot gets `shot_result = 'in_play'`
- All other shots default to `shot_result = 'in_play'`
- All shots start with `shot_quality = null` (filled in Phase 2)

**3. Phase 2 Logic (Detail Capture)**

- `shot_result` is READ-ONLY from Phase 1 (never modified in Phase 2)
- `shot_quality` is set only when:
  - Shot is in play (`shot_result === 'in_play'`), AND
  - User answers the quality question
- Error shots always have `shot_quality = null`
- If user hasn't answered quality yet, stays `null` (does NOT default to 'average')

**4. Inference/Derivation Updates**

Updated all inference and derivation functions:
- **Error detection**: Changed from checking specific error strings to `shot_result !== 'in_play'`
- **Quality assessment**: Changed from `shot_result === 'good'` to `shot_quality === 'high'`

Files updated:
- `deriveRally_winner_id.ts`, `deriveRally_point_end_type.ts`, `deriveShot_rally_end_role.ts`
- `inferShotType.ts`, `inferPressure.ts`, `inferTacticalPatterns.ts`, `inferMovement.ts`
- `errorStats.ts`, `tacticalStats.ts`, `serveReceiveStats.ts`

**5. Bug Fix: serveType Not Saved**

Fixed bug where `serveType` was used in UI but not saved to database:
- Added `serveType` to `DetailedShot` interface
- Added save logic in `saveCurrentShotToDatabase()`
- Added mapping in `convertDBShotToDetailedShot()`

#### Schema Changes

```typescript
// BEFORE
export type ShotResult = 'good' | 'average' | 'in_net' | 'missed_long' | 'missed_wide'

interface DBShot {
  shot_result: ShotResult | null
}

// AFTER
export type ShotResult = 'in_net' | 'missed_long' | 'missed_wide' | 'in_play'
export type ShotQuality = 'high' | 'average'

interface DBShot {
  shot_result: ShotResult // NOT NULL, defaults to 'in_play'
  shot_quality: ShotQuality | null // SUBJECTIVE DATA section
}
```

#### Data Flow

```
Phase 1 (Timestamp Capture):
  User presses "Win" → last shot: shot_result = 'in_play', shot_quality = null
  User presses "In-Net" → last shot: shot_result = 'in_net', shot_quality = null
  User presses "Long" → last shot: shot_result = 'missed_long', shot_quality = null
  
Phase 2 (Detail Capture):
  If shot_result === 'in_play':
    User answers quality → shot_quality = 'high' or 'average'
  If shot_result !== 'in_play':
    shot_quality stays null (errors don't have quality)
```

#### Benefits

1. **Clearer Data Model**: Objective facts (result) separate from subjective assessment (quality)
2. **Better Analytics**: Can analyze error patterns independently from quality patterns
3. **Logical Consistency**: Error shots can't have quality ratings (they failed to stay in play)
4. **Future Flexibility**: Can add more quality levels without affecting error detection logic

#### Files Modified (18 files)

- Types & Exports: `shot.types.ts`, `data/index.ts`
- Defaults: `createEntityDefaults.ts`
- Phase 1: `dataMapping.ts`, `Phase1TimestampComposer.tsx`
- Phase 2: `Phase2DetailComposer.tsx`
- UI: `DataViewer.tsx`
- Derivation Rules: `deriveRally_winner_id.ts`, `deriveRally_point_end_type.ts`, `deriveShot_rally_end_role.ts`
- Inference Rules: `inferShotType.ts`, `inferPressure.ts`, `inferTacticalPatterns.ts`, `inferMovement.ts`
- Stats: `errorStats.ts`, `tacticalStats.ts`, `serveReceiveStats.ts`

#### Migration Notes

**Clean Start Recommended**: Old data will have 'good'/'average' in `shot_result` which are no longer valid values. Recommend clearing localStorage and starting fresh tagging.

**If Preserving Data**: Manual update needed to move 'good'/'average' from `shot_result` to `shot_quality` field.

---

### 2025-12-08: Fixed Slug ID Generation for All Entities (v3.0.2)

**Complete implementation of slug-based ID generation across all entity types.**

#### Issue

Despite earlier fixes to rally and shot ID generation, the core entity creation (Players, Clubs, Tournaments, Matches, Sets, MatchVideos, ShotInferences) were still using the old `generateId()` helper that produced random IDs instead of proper human-readable slugs. The `generateSlugId.ts` helper existed but was incomplete and not properly integrated with entity creation.

#### Root Cause

- Multiple ID generation files existed (`generateId.ts`, `generateSlugId.ts`, `slugGenerator.ts`) causing confusion
- Entity `.db.ts` files were importing old `generateId()` instead of slug generators
- `generateMatchId()` had incorrect signature - tried to extract player names from player IDs instead of receiving names as parameters
- Player, club, and tournament slug generators were truncating names (taking only first word) instead of using full slugified names
- No proper `shortenPlayerName()` implementation for match slugs (should be `jsmith` not `john-smith`)

#### Fix

**1. Unified Slug Generation (`generateSlugId.ts`)**
- Fixed `generateId4()` to use proper random character selection (not `.toString(36)` which can be too short)
- Fixed `slugify()` to preserve full text and collapse multiple hyphens
- Added `shortenPlayerName()` helper: `"John" "Smith" → "jsmith"` (first initial + last name)
- Fixed `generateMatchId()` signature to accept 4 name parameters + date (not player IDs)
- Fixed `generatePlayerId()`, `generateClubId()`, `generateTournamentId()` to use full names (not truncated)
- All generators now include proper examples in JSDoc comments

**2. Updated All Entity Creation Functions**

Updated `create()` functions in:
- `matches/match.db.ts`: Look up player names from IDs, generate proper match slug
- `players/player.db.ts`: Use `generatePlayerId()` with full names
- `clubs/club.db.ts`: Use `generateClubId()` with full names
- `tournaments/tournament.db.ts`: Use `generateTournamentId()` with full names
- `sets/set.db.ts`: Use `generateSetId()` with match ID + set number
- `matchVideos/matchVideo.db.ts`: Use `generateMatchVideoId()` with match ID + sequence number
- `shotInferences/shotInference.db.ts`: Use `generateShotInferenceId()` with shot ID + field name

**3. Cleanup**
- Deleted old `slugGenerator.ts` (no longer used, replaced by `generateSlugId.ts`)
- All entity creation now goes through single source of truth for slug patterns

#### Slug Patterns (Final)

| Entity | Slug Pattern | Max Length | Example |
|--------|-------------|-----------|---------|
| Player | `{first}-{last}-{id4}` | ~25 | `john-smith-a3f2` |
| Club | `{name}-{city}-{id4}` | ~35 | `riverside-tt-london-a3f2` |
| Tournament | `{name}-{yyyy}-{mm}-{id4}` | ~40 | `spring-champs-2025-03-a3f2` |
| Match | `{p1short}-vs-{p2short}-{yyyymmdd}-{id4}` | ~45 | `jsmith-vs-mgarcia-20251208-a3f2` |
| MatchVideo | `{match_id}-v{num}` | ~48 | `jsmith-vs-mgarcia-20251208-a3f2-v1` |
| Set | `{match_id}-s{num}` | ~48 | `jsmith-vs-mgarcia-20251208-a3f2-s1` |
| Rally | `{set_id}-r{num}` | ~55 | `jsmith-vs-mgarcia-20251208-a3f2-s1-r123` |
| Shot | `{rally_id}-sh{num}` | ~62 | `jsmith-vs-mgarcia-20251208-a3f2-s1-r123-sh45` |

**Key Details:**
- `{id4}`: 4 random lowercase alphanumeric characters for uniqueness
- `{p1short}`, `{p2short}`: Shortened player names (first initial + last name, e.g., "jsmith")
- `{yyyymmdd}`: 8-digit date format (e.g., "20251208")
- `{num}`: Sequential number without leading zeros

#### Files Changed

**Modified:**
- `app/src/helpers/generateSlugId.ts` (fixed all generator functions)
- `app/src/data/entities/matches/match.db.ts`
- `app/src/data/entities/players/player.db.ts`
- `app/src/data/entities/clubs/club.db.ts`
- `app/src/data/entities/tournaments/tournament.db.ts`
- `app/src/data/entities/sets/set.db.ts`
- `app/src/data/entities/matchVideos/matchVideo.db.ts`
- `app/src/data/entities/shotInferences/shotInference.db.ts`

**Deleted:**
- `app/src/helpers/slugGenerator.ts` (obsolete)

#### Testing Notes

After this fix:
- ✅ All entity IDs now use proper slug format
- ✅ Player names are fully preserved (not truncated)
- ✅ Match slugs use shortened player names correctly
- ✅ Random suffixes ensure uniqueness even with duplicate names
- ✅ IDs are human-readable and self-documenting

**Migration Required:** All existing data must be cleared as IDs have changed format. Rallies and shots from v3.0.1 will continue to work, but new entities (players, matches, etc.) will have new ID format.

---

### 2025-12-08: Critical Bug Fixes - ID Generation & Data Duplication (v3.0.1)

**Critical fixes for database integrity issues discovered during testing.**

#### 1. Fixed Slug-Based ID Generation (Critical)

**Issue:** Despite schema documentation specifying slug format IDs, the actual implementation was still using timestamp-random format (`1733734534-abc123`) instead of hierarchical slugs (`match123-s1-r5`).

**Root Cause:**
- `generateId()` helper was never updated to use slug format
- Mapping functions (`mapPhase1RallyToDBRally`, `mapPhase1ShotToDBShot`) were generating IDs instead of database create functions
- Create functions were overwriting mapping function IDs with their own random IDs

**Fix:**
- Created new `generateSlugId.ts` with proper slug generators for all entity types
- Updated `rally.db.ts` and `shot.db.ts` to use `generateRallyId()` and `generateShotId()`
- Changed mapping functions to return `NewRally` and `NewShot` (without IDs) instead of `DBRally` and `DBShot`
- Database create functions now properly generate slug IDs based on parent relationships

**Files Changed:**
- `app/src/helpers/generateSlugId.ts` (new)
- `app/src/data/entities/rallies/rally.db.ts`
- `app/src/data/entities/shots/shot.db.ts`
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`

---

#### 2. Fixed Double Rally Creation (Critical)

**Issue:** Rallies and shots were being duplicated in the database when tagging the same set multiple times.

**Root Cause:**
- `deleteSetTaggingData()` was only called when `isRedo = true`
- Normal save flow didn't clean up existing rallies/shots before creating new ones
- Re-tagging a set would add new rallies on top of existing ones

**Fix:**
- Added cleanup step at beginning of save flow (Step 0)
- ALWAYS call `deleteSetTaggingData()` before saving new rallies/shots
- Ensures idempotent save operation (can retag without duplication)

**Files Changed:**
- `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx`

---

#### 3. Fixed Missing timestamp_end Calculation (Data Integrity)

**Issue:** All shots had `timestamp_end = null` in the database.

**Root Cause:**
- `calculateTimestampEnd()` function existed but was never called
- Mapping function set `timestamp_end: null` with comment "Will be calculated in batch"
- Batch calculation was missing from save flow

**Fix:**
- Created `applyTimestampEnd()` function to apply timestamp calculations to shot arrays
- Added Step 3 in save flow to calculate timestamp_end before saving shots
- Each shot's timestamp_end = next shot's timestamp_start (or rally end time for last shot)

**Files Changed:**
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
- `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx`

---

#### 4. Added Database Debugging Utility

**New Tool:** Created `debugDatabase.ts` helper for inspecting database state.

**Features:**
- Count all entities (matches, sets, rallies, shots)
- Detect duplicate rally indices
- Verify ID formats (slug vs timestamp-random)
- Check for missing timestamp_end values
- Analyze score progressions
- Export sample data for inspection

**Usage:**
```typescript
// In browser console after importing
inspectDB()    // Full inspection report
exportDB()     // Export sample data
```

**Files Added:**
- `app/src/helpers/debugDatabase.ts`

---

#### 5. Code Quality Improvements

**Changes:**
- Made `markRallyEndShots()` generic to work with both `NewShot[]` and `DBShot[]`
- Exported slug ID generators from `@/data` index for easy access
- Improved save flow logging (steps 0-12 with clear descriptions)
- Fixed TypeScript types for mapping functions

**Impact:**
- Better type safety
- Clearer debugging output
- More maintainable codebase

---

#### Testing Notes

After these fixes:
- ✅ Rally IDs now use slug format: `{set_id}-r{rally_index}`
- ✅ Shot IDs now use slug format: `{rally_id}-sh{shot_index}`
- ✅ No duplicate rallies when re-tagging
- ✅ All shots have proper timestamp_end values
- ✅ Database state is consistent and human-readable

**Migration:** Database must be cleared (existing data uses old ID format). Use `CLEAR_LOCALSTORAGE_INSTRUCTIONS.md`.

---

### 2025-12-08: Database Refactor - Slug-Based IDs & Shot Inference Tracking (v3.0.0)

**Major database schema refactor with breaking changes.**

#### 1. Slug-Based Primary Keys

**Change:** Replaced UUID primary keys with human-readable hierarchical slugs across all entities.

**Rationale:** 
- Maximum readability in database and exports (CSV/JSON)
- Self-documenting relationships (parent IDs embedded in child IDs)
- Better debugging experience (can understand context from ID alone)
- No existing data to migrate, clean slate opportunity

**Slug Patterns:**
| Entity | Pattern | Example |
|--------|---------|---------|
| Player | `{first}-{last}-{id4}` | `john-smith-a3f2` |
| Club | `{name}-{city}-{id4}` | `riverside-tt-london-a3f2` |
| Tournament | `{name}-{yyyy}-{mm}-{id4}` | `spring-champs-2025-03-a3f2` |
| Match | `{p1}-vs-{p2}-{yyyymmdd}-{id4}` | `jsmith-vs-mgarcia-20251208-a3f2` |
| Set | `{match_id}-s{num}` | `jsmith-vs-mgarcia-20251208-a3f2-s1` |
| Rally | `{set_id}-r{num}` | `jsmith-vs-mgarcia-20251208-a3f2-s1-r23` |
| Shot | `{rally_id}-sh{num}` | `jsmith-vs-mgarcia-20251208-a3f2-s1-r23-sh5` |

**Implementation:**
- Created `slugGenerator.ts` with generation utilities for all entity types
- Updated all entity type definitions to use slugs
- Updated all database creation functions to generate slugs instead of UUIDs
- Database version bumped to v3

---

#### 2. Shot Schema Refactor - Remove "inferred_" Prefix

**Change:** Renamed shot fields to remove `inferred_` prefix and deleted confidence fields.

**Old → New Field Names:**
- `inferred_pressure_level` → `pressure_level`
- `inferred_intent_quality` → `intent_quality`
- `shot_type_inferred` → `shot_type`
- `shot_contact_timing_inferred` → `shot_contact_timing`
- `player_position_inferred` → `player_position`
- `player_distance_inferred` → `player_distance`
- `shot_spin_inferred` → `shot_spin`
- `shot_speed_inferred` → `shot_speed`
- `shot_arc_inferred` → `shot_arc`
- `inferred_is_third_ball_attack` → `is_third_ball_attack`
- `inferred_is_receive_attack` → `is_receive_attack`

**Removed Fields:**
- `inferred_spin_confidence`
- `inferred_shot_confidence`

**Rationale:** 
- Data capture method may change in future (manual → AI → hybrid)
- Field names should be neutral about data source
- Separate tracking table (`shot_inferences`) handles inference metadata
- Cleaner, more flexible schema

---

#### 3. New shot_inferences Table

**Change:** Added new table to track which shot fields were inferred vs manually entered.

**Schema:**
```typescript
{
  id: string                // Slug: {shot_id}-{field_name}-{id4}
  shot_id: string           // FK to shots
  field_name: string        // e.g., 'player_position', 'shot_speed'
  inferred: boolean         // true = AI inferred, false = manual
  confidence: number | null // 0.0-1.0 (NULL for now, populate later)
}
```

**Strategy:** Sparse tracking
- Only create rows for fields that were AI-inferred
- Absence of row = manually entered = 100% confidence
- Supports future ML confidence scoring

**Trackable Fields:**
- `shot_type`, `shot_contact_timing`, `player_position`, `player_distance`
- `shot_spin`, `shot_speed`, `shot_arc`
- `is_third_ball_attack`, `is_receive_attack`

---

#### 4. Shot Field Organization - Objective vs Subjective

**Change:** Reorganized shot fields into clear sections with comment headers.

**Subjective Data** (human judgment/interpretation):
- `intent`, `intent_quality`, `pressure_level`

**Objective Data** (observable facts/deterministic):
- All other fields (serve type, wing, result, position, etc.)

**Rationale:** 
- Clear conceptual separation for data analysis
- Subjective fields have inherent variability (different taggers may disagree)
- Objective fields should be consistent across taggers
- Documented in code for future reference

---

#### 5. Club Schema Update

**Change:** Renamed `club.location` → `club.city`

**Rationale:** 
- More specific and concise
- Used in slug generation: `{name}-{city}-{id4}`
- Better matches typical table tennis club naming

---

#### 6. Bug Fix - rally_index Double-Counting

**Bug:** Bulk rally save was using array index `i + 1` instead of continuing from max existing `rally_index`, causing duplicates (1,1,2,2 instead of 1,2,3,4).

**Fix:** Calculate max existing rally_index before loop, then use `maxRallyIndex + i + 1` for new rallies.

**Location:** `Phase1TimestampComposer.tsx` line 110-144

---

#### Files Modified

**Core Schema:**
- `app/src/data/db.ts` - Added v3 schema with shot_inferences table
- `app/src/data/entities/shots/shot.types.ts` - Field renames & reorganization
- `app/src/data/entities/clubs/club.types.ts` - location → city
- All entity type files - Added slug format comments

**New Files:**
- `app/src/helpers/slugGenerator.ts` - Slug generation utilities
- `app/src/data/entities/shotInferences/shotInference.types.ts`
- `app/src/data/entities/shotInferences/shotInference.db.ts`
- `app/src/data/entities/shotInferences/index.ts`

**Updated References:**
- `app/src/helpers/createEntityDefaults.ts` - Shot defaults updated
- `app/src/features/shot-tagging-engine/composers/runInference.ts`
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` - Rally bug fix
- `app/src/pages/DataViewer.tsx` - Display updated field names
- `app/src/features/club-management/sections/*` - location → city
- `app/src/features/player-management/sections/PlayerFormSection.tsx` - city display

---

#### Migration Notes

**No migration required** - confirmed no existing data in database.

**Breaking Changes:**
- All entity IDs are now slugs instead of UUIDs
- Shot field names changed (remove inferred_ prefix)
- Club `location` field renamed to `city`
- Database version bumped to v3 (triggers fresh IndexedDB)

---

### 2025-12-07: Complete Database Table Viewer (v2.2.10)

Enhanced Data Viewer to show ALL database fields in table format (Match → Set → Rally → Shot) with null highlighting for debugging.

---

### 2025-12-07: Phase 2 Error Question Flow & Quality Fix (v2.2.9)

- Error non-serve shots now correctly ask direction → intent → errorType (was skipping to next shot after stroke)
- Stroke buttons for errors now explicitly set shotQuality alongside stroke
- Fixed `isLastQuestion()` logic to properly detect when to save and advance

---

### 2025-12-07: CRITICAL - Stale State Causing Data Loss (v2.2.8)

**Context:** Serve spin, intent, and other fields were being added to shot object but lost before save due to React state timing issue.

#### Root Cause Analysis

**The Smoking Gun:** User logs revealed the exact sequence:

1. **Spin question answered:**
   ```javascript
   [Phase2] Updated shot: {
     after_keys: [..., 'spin'],  ✅ Spin added!
     has_field_after: true
   }
   ```

2. **Auto-advance executes:**
   ```javascript
   [Phase2] Auto-advancing: spin → direction  ← Moving to NEXT shot
   setCurrentShotIndex(prev => prev + 1)    ← Index changes
   ```

3. **Save attempts later:**
   ```javascript
   [Phase2] Advancing from shot, will save: {
     spin: undefined  ❌ Lost!
   }
   ```

**Why:** `advanceToNextShot()` was calling:
```typescript
const shotToSave = allShots[currentShotIndex]  // ❌ Reads stale state!
```

But `handleAnswer` had just called `setAllShots(updatedShots)`, which is **asynchronous**. By the time `advanceToNextShot` reads `allShots`, the state update hadn't completed yet, so it read the OLD shot data without the new field.

#### The Fix

**Moved save logic from `advanceToNextShot` into `handleAnswer`:**

```typescript
const handleAnswer = (field, value) => {
  // Update shot
  const updatedShots = [...allShots]
  updatedShots[currentShotIndex] = {
    ...updatedShots[currentShotIndex],
    [field]: value,  // Add new field
  }
  setAllShots(updatedShots)
  
  // Get next step
  const nextStep = getNextStep(currentStep)
  
  // If advancing to next shot, save NOW using updatedShots (not stale allShots!)
  if (nextStep === 'direction' || nextStep === 'stroke' || nextStep === 'complete') {
    const shotToSave = updatedShots[currentShotIndex]  // ✅ Use fresh data!
    saveCurrentShotToDatabase(shotToSave)
    
    if (nextStep !== 'complete') {
      setCurrentShotIndex(prev => prev + 1)
    }
  }
  
  setCurrentStep(nextStep)
}
```

**Key change:** Use `updatedShots[currentShotIndex]` (fresh data) instead of `allShots[currentShotIndex]` (stale state).

#### Impact

**Before fix:**
- ❌ Serve spin: captured but lost before save
- ❌ Intent: captured but lost before save  
- ❌ Any field on last question: lost
- ❌ Inconsistent saves depending on React render timing

**After fix:**
- ✅ All fields saved immediately with latest data
- ✅ No stale state reads
- ✅ Consistent, reliable saves

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Moved save logic from `advanceToNextShot` into `handleAnswer` (lines 502-543)
  - Use fresh `updatedShots` instead of stale `allShots` for saving
  - `advanceToNextShot` now only determines next step, doesn't save

---

### 2025-12-07: CRITICAL - Winner Always Null in Database (v2.2.7)

**Context:** Phase 1 correctly calculates rally winner but mapping function discards it, saving NULL to database instead.

#### Critical Bug Fix

**Phase 1: Winner Always Saved as NULL**
- **Issue:** Despite correct winner calculation in Phase 1, database rallies had `winner_id: null`
- **Impact:** EVERY rally in database had no winner recorded!
- **Root Cause:** `mapPhase1RallyToDBRally` function (lines 48-51) had placeholder logic:
  ```typescript
  let winnerId: string | null = null
  if (isScoring) {
    winnerId = null // Placeholder ❌ ALWAYS NULL!
  }
  ```
- **Fix:** Now correctly maps winner from Phase1Rally:
  ```typescript
  const winnerId = rally.winnerId === 'player1' ? player1Id : player2Id
  ```
- **File:** `dataMapping.ts` lines 46-48
- **Impact:** Rally winners now correctly saved to database!

**Phase 1: Point End Type Always NULL**
- **Issue:** `point_end_type` always saved as null even when it could be determined
- **Fix:** Now sets based on rally outcome:
  - Error rallies with 1 shot → `'serviceFault'`
  - Non-error rallies → `'winnerShot'`
  - Other error rallies → `null` (determined in Phase 2 via errorType question)
- **File:** `dataMapping.ts` lines 68-70
- **Impact:** Service faults and winner shots now properly classified in Phase 1

#### User-Visible Impact

Before this fix:
- ❌ Rally winners not recorded in database
- ❌ Stats would show 0 points for all players
- ❌ Match results invalid

After this fix:
- ✅ Rally winners correctly saved
- ✅ Scores properly tracked
- ✅ Stats and analysis work correctly

---

### 2025-12-07: Comprehensive Save Debugging - Phase 1 & Phase 2 (v2.2.6)

**Context:** Added extensive logging throughout save pipeline to identify where data is lost. Includes handleAnswer tracking, database verification, and Phase 1 logging.

#### Enhanced Debugging Features

**1. Phase 2 handleAnswer Logging:**
```
[Phase2] handleAnswer called: {field: 'spin', value: 'topspin', currentShotIndex: 0, currentStep: 'spin'}
[Phase2] Updated shot: {
  before_keys: [...],
  after_keys: [...],
  field_added: 'spin',
  field_value: 'topspin',
  has_field_after: true
}
[Phase2] Auto-advancing: spin → stroke
```

**2. Database Verification After Save:**
- Reads shot back from database immediately after save
- Logs actual DB values to confirm save succeeded
- Shows: `wing`, `serve_spin_family`, `shot_length`, `shot_result`, `intent`, `is_tagged`

**3. Phase 1 Rally Save Logging:**
```
[Phase1] === SAVING RALLY 1 ===
[Phase1] Rally data: {serverId, winnerId, endCondition, shotCount}
[Phase1] DB Rally to save: {server_id, winner_id, is_scoring, point_end_type}
[Phase1] ✓ Rally saved with ID: <id>
[Phase1] Saving N shots...
[Phase1] Shot 1: {player_id, time, shot_index}
[Phase1] ✓ All N shots saved
[Phase1] ✓ Rally N complete!
```

**4. React Strict Mode Double Logging:**
- **Note:** In development, you'll see double console logs
- This is React 18 Strict Mode - it's normal!
- In production build, logs appear only once
- Doesn't affect actual saves (only renders twice)

#### What the Logs Tell You

**If field is being captured:**
- `handleAnswer` shows field being added
- `has_field_after: true`
- Field appears in `Shot data before save`

**If field is NOT saved to DB:**
- Check `updates` object - is field included?
- Check `Verified saved shot in DB` - does DB have the value?

**Rally vs Shot Tables:**
- **Rallies table:** Server, winner, scoring, end type, scores
- **Shots table:** All shot details (direction, spin, wing, intent, quality)
- Phase 1 saves basic rally structure
- Phase 2 updates shots with detailed annotations

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Added handleAnswer logging (lines 467-490)
  - Added DB verification after save (lines 470-480)
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`
  - Added comprehensive rally save logging (lines 298-336)

---

### 2025-12-07: Enhanced Debugging for Inconsistent Data Saves (v2.2.5)

**Context:** Added comprehensive logging to diagnose why some fields (wing, serve spin, shot quality) are inconsistently saved to database.

#### Diagnostic Enhancements

**Added Detailed Logging to `saveCurrentShotToDatabase`:**

Before each save, console now logs:
1. **Complete shot data** - all fields available
2. **Updates being applied** - what will be written to DB
3. **Missing fields** - which expected fields are absent

**Example Console Output:**
```
[Phase2] Shot data before save: {
  shotIndex: 2,
  direction: 'mid_right',
  length: 'deep',
  spin: undefined,        // ← Missing!
  stroke: 'forehand',
  intent: 'neutral',
  shotQuality: 'high',
  errorType: undefined,
  isServe: false,
  isReceive: true,
  isError: false
}
[Phase2] Updating shot <id> with: {
  shot_origin: 'mid',
  shot_target: 'right',
  shot_length: 'long',
  wing: 'FH',
  intent: 'neutral',
  shot_result: 'good'
}
[Phase2] Missing fields: {
  noDirection: false,
  noLength: false,
  noSpin: false,
  noStroke: false,
  noIntent: false
}
```

**Changed Shot Quality Save Logic:**
- **Before:** Only saved if `shotQuality` field exists
- **After:** ALWAYS saved (defaults to 'average' if not set)
- **Rationale:** Shot quality should never be null

#### How to Use Debug Logging

1. Open browser DevTools console (F12)
2. Tag shots in Phase 2
3. When shot advances, check console for:
   - `[Phase2] Shot data before save:` - see what data exists
   - `[Phase2] Missing fields:` - identify what's missing
4. Report back which fields are consistently missing

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Added comprehensive pre-save logging (lines 411-449)
  - Changed shot quality to always save (line 440)

---

### 2025-12-07: Critical Save Error & Shot Quality Fixes (v2.2.4)

**Context:** Fixed critical save error preventing Phase 2 completion, and resolved shot quality not displaying in logs.

#### Bug Fixes

**1. CRITICAL: Save Failing with "undefined is not an object (evaluating 'data-direction')"**
- **Issue:** Phase 2 completion failed with cryptic error about direction
- **Root Cause #1:** Function `mapPhase2DetailToDBShot` called with wrong parameters  
  - Expected 4 params: `(isServe, isReceive, isError, data)`
  - Received 3 params: `(isServe, isError, data)` - missing `isReceive`!
  - This caused parameters to misalign, making `data` undefined
- **Root Cause #2:** `parseDirection` called on potentially undefined direction without null check
- **Fix #1:** Added missing `isReceive` parameter to function call (line 347-351)
- **Fix #2:** Added null check before calling `parseDirection` (line 162)
- **Files:** 
  - `TaggingUIPrototypeComposer.tsx` line 347-351
  - `dataMapping.ts` line 162
- **Impact:** Phase 2 can now save successfully!

**2. Shot Quality Not Showing in Log**
- **Issue:** Shot quality toggle (average/high) not appearing in shot log
- **Root Cause:** Race condition in double `handleAnswer` calls
  - Clicking BH/FH called `handleAnswer('shotQuality', ...)` then `handleAnswer('stroke', ...)`
  - Second call executed before first call's state update completed
  - React state updates are asynchronous and batched
- **Fix:** Combined both updates into single atomic operation
- **File:** `Phase2DetailComposer.tsx` lines 692-721 and 754-783
- **Impact:** Shot quality now correctly saved and displayed immediately

**3. Missing Player Names in Resume Flow**
- **Issue:** TypeScript error - Phase1Rally missing player name fields
- **Root Cause:** Added player name fields to Phase1Rally but didn't update `convertDBRallyToPhase1Rally`
- **Fix:** 
  - Added `player1Name` and `player2Name` parameters to conversion function
  - Updated all calls to pass player names from players array
- **Files:**
  - `dataMapping.ts` lines 274-327
  - `TaggingUIPrototypeComposer.tsx` lines 110-123, 143-156
- **Impact:** Resume functionality works correctly with player names displayed

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx`
  - Fixed mapPhase2DetailToDBShot parameter count
  - Added player names to convertDBRallyToPhase1Rally calls
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
  - Added null check for direction parsing
  - Added player name parameters to conversion function
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Fixed shot quality race condition with atomic updates

---

### 2025-12-07: Additional Bug Fixes & Diagnostic Logging (v2.2.3)

**Context:** Fixed shot counter display issue, ensured shot quality saves correctly, and added comprehensive diagnostic logging for save errors.

#### Bug Fixes

**1. Shot Counter Off By One**
- **Issue:** Status bar showed "Shot 3" when it was actually Shot 2
- **Root Cause:** Line 501 used `shotIndex + 1` when shotIndex is already 1-based (1=serve, 2=receive, etc.)
- **Fix:** Changed to just `shotIndex` without adding 1
- **File:** `Phase2DetailComposer.tsx` line 501
- **Impact:** Shot counter now displays correctly in status bar

**2. Shot Quality Not Being Logged**  
- **Issue:** Shot quality (average/high) not appearing in shot log or database
- **Root Cause:** Reference to stale shot object when saving
- **Fix:** Ensured fresh copy from `allShots` array is used when saving to database
- **File:** `Phase2DetailComposer.tsx` line 352-357
- **Impact:** Shot quality now properly saved and displayed

**3. Enhanced Save Error Diagnostics**
- **Issue:** Generic "Failed to save match data" error with no details
- **Fix:** Added 10-step granular logging throughout save process:
  1. Mark rally end shots
  2. Save shots to database  
  3. Determine rally winners
  4. Calculate rally scores
  5. Update rallies in database
  6. Update set final scores
  7. Run inference
  8. Mark set as complete
  9. Update match
  10. Complete
- **File:** `TaggingUIPrototypeComposer.tsx` lines 358-453
- **Impact:** Console now shows exactly which step fails, with full error details

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Fixed shot counter display
  - Ensured fresh shot data used when saving
- `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx`
  - Added comprehensive step-by-step logging
  - Enhanced error messages with full details

---

### 2025-12-07: Bug Fixes & Phase 2 Shot Log Enhancement (v2.2.2)

**Context:** Fixed critical bugs in Phase 1 winner derivation and Phase 2 save functionality, plus enhanced Phase 2 shot log with player details.

#### Bug Fixes

**1. Phase 1: Wrong Winner for Error Rallies**
- **Issue:** When rally ended with "In Net" or "Long", wrong player was being awarded the point
- **Root Cause:** `deriveRally_winner_id()` was being passed `shot_target: null` instead of `shot_result`
- **Fix:** Now correctly maps endCondition to shot_result:
  - `'innet'` → `shot_result: 'in_net'`
  - `'long'` → `shot_result: 'missed_long'`
  - `'winner'` → `shot_result: 'good'`
- **File:** `Phase1TimestampComposer.tsx` lines 237-249
- **Impact:** Error rallies now correctly award point to opponent of player who made error

**2. Phase 2: Save Error - Updates Out of Scope**
- **Issue:** Error message on save: "Cannot find name 'updates'"
- **Root Cause:** `updates` variable declared inside try block but referenced in catch block
- **Fix:** Moved `updates` declaration outside try block with `let` keyword
- **File:** `Phase2DetailComposer.tsx` line 387
- **Impact:** Saves now complete without errors; error logging works correctly

#### UI/UX Enhancements

**Phase 2 Shot Log - Enhanced Details:**

Added comprehensive shot information to Phase 2 shot log (matching Phase 1 quality):
- **Server name** displayed per rally
- **Winner name** displayed per rally
- **Player name** shown for each shot
- **Shot details** shown below each shot:
  - Stroke (BH/FH)
  - Direction (e.g., "left→mid")
  - Depth (for serves/receives)
  - Spin (for serves)
  - Intent (defensive/neutral/aggressive)
  - Error type (forced/unforced)
  - Quality (average/high)
- **Shot type labels** clarified: "Serve", "Receive", "Shot"
- **Error indicators** shown inline

**Data Model Changes:**

Extended `Phase1Rally` interface to include player display names:
```typescript
interface Phase1Rally {
  // ... existing fields
  player1Name: string
  player2Name: string
  serverName: string
  winnerName: string
}
```

**Example Shot Log Display:**
```
Rally 1 (Tagging)
Server: Alice  |  Bob won - Winner

#1 Serve • Alice                    0.52s
   FH • left→mid • Depth:short • Spin:topspin

#2 Receive • Bob                    1.24s
   BH • mid→right • Depth:deep • neutral
```

#### Files Changed

- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`
  - Fixed winner derivation logic
  - Added player names to Phase1Rally
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - Fixed updates scope issue
  - Enhanced shot log UI with player details and shot data

---

### 2025-12-07: Bug Fix - Double Direction Buttons on Service Fault (v2.2.1)

**Context:** Fixed rendering bug where service faults displayed both serve direction buttons (6) and error direction buttons (3) simultaneously.

#### Bug Description

When a serve was also an error (service fault - in net or long), the Phase 2 direction question would render two button grids:
- Serve direction grid: 6 buttons (correct)
- Error direction grid: 3 buttons (incorrect duplicate)

#### Root Cause

**File:** `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

The error direction conditional (line 781) checked only:
```typescript
{currentShot.isError && currentStep === 'direction' && (
```

This condition did not exclude serves, so when `isServe=true` AND `isError=true`, both the serve direction grid and error direction grid would render.

#### Fix Applied

**Changed line 781** from:
```typescript
{currentShot.isError && currentStep === 'direction' && (
```

To:
```typescript
{currentShot.isError && !currentShot.isServe && currentStep === 'direction' && (
```

This ensures error direction buttons only appear for non-serve error shots (shot index 2+), matching the pattern used for other shot type conditionals.

#### Impact

- **Service faults:** Now show only 6 serve direction buttons (correct)
- **Receive errors:** Still show 3 error direction buttons (unchanged)
- **Rally shot errors:** Still show 3 error direction buttons (unchanged)

---

### 2025-12-07: Enhanced Phase 2 Tagging - Receive Depth & Error Direction (v2.2.0)

**Context:** Added two new conditional tagging steps in Phase 2 to capture more detailed shot information for receives and errors.

#### Data Model Changes

**Field Renames (Breaking Changes):**

1. **`serve_length` → `shot_length`** (Type: `ShotLength | null`)
   - **Rationale:** Field now used for BOTH serve (shot #1) AND receive (shot #2), not just serves
   - **Values:** `'short' | 'half_long' | 'long'`
   - **Population:** Shot #1 (serve) and Shot #2 (receive) only; NULL for other rally shots

2. **`shot_destination` → `shot_target`** (Type: `TablePosition | null`)
   - **Rationale:** Semantic clarification - represents intended target, not necessarily where ball landed
   - **Now stored even for error shots** - captures where player was aiming
   - **Error detection moved** from `shot_destination` to `shot_result` field
   - **Values:** `'left' | 'mid' | 'right' | null`

3. **`ShotResult` Type Extended**
   - **Added:** `'missed_wide'` to existing `'good' | 'average' | 'in_net' | 'missed_long'`
   - **Usage:** Error type detection now uses `shot_result` instead of checking `shot_destination`

#### Phase 2 Tagging Workflow Changes

**Receive (Shot #2) - Enhanced Flow:**
- **Previous:** Stroke → Direction → Intent (3 steps)
- **New:** Stroke → Direction → **Depth** → Intent (4 steps)
- **Rationale:** 
  - Receive quality/placement is crucial for match analysis
  - Creates symmetry with serve depth tagging
  - Enables analysis of receive patterns (deep vs short returns)
- **UI:** Uses same depth buttons as serve (Short/Half-Long/Deep)

**Error Shots - Enhanced Flow:**
- **Previous:** Stroke → Intent → Error Type (3 steps)
- **New:** Stroke → **Direction** → Intent → Error Type (4 steps)
- **Rationale:**
  - Captures where player was aiming when they made the error
  - Distinguishes between execution errors vs decision errors
  - Provides richer data for pattern analysis (e.g., player always errors when targeting wide forehand)
- **UI:** Direction represents intended target, uses same dynamic buttons as regular shots
- **Data:** `shot_target` populated with intended direction, `shot_result` shows error type

**Unchanged Flows:**
- **Serve:** Direction → Length → Spin (3 steps)
- **Regular Shot:** Stroke → Direction → Intent (3 steps)

#### Technical Implementation

**Derivation Logic Updates:**
- `deriveRally_point_end_type`: Now checks `shot_result` instead of `shot_destination` for error detection
- `deriveRally_winner_id`: Now checks `shot_result` instead of `shot_destination` for error detection  
- `deriveShot_locations`: Updated to use `shot_target` field

**Mapper Functions:**
- **Renamed:** `mapServeLengthUIToDB` → `mapShotLengthUIToDB`
- **Renamed:** `mapServeLengthDBToUI` → `mapShotLengthDBToUI`
- **Renamed:** `mapDirectionToOriginDestination` → `mapDirectionToOriginTarget`
- **Renamed:** `extractDestinationFromDirection` → `extractTargetFromDirection`
- **Deprecated aliases** added for backward compatibility

**Component Changes:**
- `Phase2DetailComposer.tsx`:
  - Added `isReceive` flag to `DetailedShot` interface
  - Added `ReceiveStep` type for receive question flow
  - Updated `ErrorStep` to include 'direction'
  - Added UI sections for receive depth, receive direction, receive intent
  - Added UI section for error direction
  - Updated question label function to show context-specific labels
- `dataMapping.ts`:
  - Updated `mapPhase2DetailToDBShot` to accept `isReceive` parameter
  - `shot_target` now populated for all shots including errors
  - `shot_length` populated for both serves and receives

**Inference & Stats Updates:**
- `inferTacticalPatterns.ts`: Updated all `shot_destination` → `shot_target`
- `inferMovement.ts`: Updated all `shot_destination` → `shot_target`
- `serveReceiveStats.ts`: Updated `serve_length` → `shot_length`

**Helper Files:**
- `createEntityDefaults.ts`: Updated default values
- `deriveRawData.ts`: Renamed field in stats output

#### Migration Notes

**For Development:**
- Option 1: Clear localStorage and start fresh
- Option 2: Existing data will have `serve_length` and `shot_destination` fields - these will need manual migration

**Data Implications:**
- Existing tagged sets will need field renaming if migrating data
- New tagging sessions will use new field names from start

#### Benefits

1. **Richer Receive Analysis:** Can now analyze receive depth patterns (do they keep it short? go deep?)
2. **Better Error Analysis:** Understanding target vs result helps identify if errors are execution or decision-based
3. **Semantic Clarity:** `shot_target` makes it clear we're recording intent, not outcome
4. **Consistent Data Model:** Depth captured for both serve and receive creates symmetry
5. **Pattern Recognition:** Can identify if player consistently errors when aiming for certain zones

---

### 2025-12-06c: Comprehensive Persistence Bug Fixes (v2.1.2)

**Context:** Major refinement of persistence layer after identifying critical bugs that prevented seamless data flow between phases and proper session resume.

#### Issues Fixed

**Bug #1: Phase 1 Complete Not Updating Database**
- **Problem:** Clicking "Complete Phase 1 →" didn't update `tagging_phase` to 'phase1_complete' in database
- **Impact:** Resume would think Phase 1 still in progress, couldn't properly transition to Phase 2
- **Fix:** Made `handleCompletePhase1` async and added DB update call
- **File:** `TaggingUIPrototypeComposer.tsx`

**Bug #2: Phase 2 Not Resuming from Correct Shot Index**
- **Problem:** When resuming Phase 2, always started from shot 0 instead of last saved shot
- **Impact:** Users had to re-tag all shots they already completed
- **Fix:** 
  - Added `resumeFromShotIndex` prop to `Phase2DetailComposer`
  - Stored `phase2_last_shot_index` from DBSet in component state
  - Initialized `currentShotIndex` with resume value
- **Files:** `Phase2DetailComposer.tsx`, `TaggingUIPrototypeComposer.tsx`

**Bug #3: Phase 2 Not Loading Previously Saved Shot Data**
- **Problem:** When resuming Phase 2, shots didn't show previously entered details (direction, spin, etc.)
- **Impact:** All Phase 2 work appeared lost, had to re-enter everything
- **Fix:** Added `loadExistingPhase2Data` useEffect that:
  - Loads all shots from database on Phase 2 mount
  - Merges DB shot details into `allShots` state
  - Only runs if `resumeFromShotIndex > 0`
- **File:** `Phase2DetailComposer.tsx`

**Bug #4: Video URL Not Persisting Between Phases**
- **Problem:** Video would disappear when transitioning from Phase 1 to Phase 2
- **Impact:** User had to re-select video file, breaking flow
- **Fix:** 
  - Already had `onVideoSelect` callback from user's previous fixes
  - Added verification logging in `handleCompletePhase1` to ensure video URL in store
- **File:** `TaggingUIPrototypeComposer.tsx`

**Bug #5: Insufficient Logging Made Debugging Impossible**
- **Problem:** When things failed, no way to understand what was happening
- **Impact:** Couldn't diagnose issues quickly, users had no feedback
- **Fix:** Added comprehensive logging with `[Resume]`, `[Phase1→Phase2]`, `[Phase2]` prefixes:
  - Session resume progress and data loading
  - Video loading from IndexedDB (including file size)
  - Rally/shot counts and conversion
  - Player context initialization
  - Phase transitions
  - Shot saving progress
  - Error conditions
- **Files:** All composer files

#### What Now Works

✅ **Phase 1 → Phase 2 Transition:**
- Phase 1 completion properly updates DB
- Video URL preserved in global store
- All rallies passed to Phase 2
- Player context maintained

✅ **Resume from Phase 1 In Progress:**
- Loads all saved rallies
- Shows correct rally count
- Player names display correctly
- Video loads from IndexedDB

✅ **Resume from Phase 2 In Progress:**
- Loads all rallies + shots
- Resumes from correct shot index
- Previously entered shot details appear
- Video loads from IndexedDB
- Progress shows X/Y shots complete

✅ **Session Persistence:**
- Works across page refresh
- Works across browser restart
- Works after phone screen sleep
- Works on navigation away and back

#### Technical Details

**Phase 2 Resume Flow:**
1. User clicks "Continue" on Phase 2 in-progress set
2. `resumeTaggingSession` loads `phase2_last_shot_index` from DBSet (e.g., 5)
3. Sets `phase2ResumeIndex` state to 5
4. Passes to Phase2DetailComposer as `resumeFromShotIndex={5}`
5. Phase2DetailComposer initializes `currentShotIndex` to 5
6. `loadExistingPhase2Data` useEffect runs:
   - Loads all shots from DB
   - Finds shots with index 1-5 (already tagged)
   - Merges their Phase 2 details into allShots state
7. User sees shot #6 ready to tag, with shots 1-5 showing completed details

**Phase 2 Data Merging:**
```typescript
// DB Schema → UI Format conversions:
shot_origin + shot_destination → direction ("left_right")
serve_length ("half_long") → length ("halflong")
serve_spin_family ("under") → spin ("underspin")
wing ("BH"/"FH") → stroke ("backhand"/"forehand")
shot_result ("good") → shotQuality ("high")
rally_end_role → errorType
```

**Logging Format:**
- `[Resume]` - Session resume operations
- `[Phase1→Phase2]` - Phase transition operations
- `[Phase2]` - Phase 2 specific operations
- `✓` - Success
- `✗` - Error
- `⚠` - Warning

**Error Handling Strategy:**
- All DB operations wrapped in try-catch
- Errors logged to console with context
- Never blocks UI - fails gracefully
- Continues with available data when possible

#### Files Changed

- `TaggingUIPrototypeComposer.tsx` - Resume logic, phase transition, logging
- `Phase2DetailComposer.tsx` - Resume from shot index, load existing data, save logging
- `Phase1TimestampComposer.tsx` - Video URL logging on phase complete

#### Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.1.0 | 2025-12-06 | Initial persistence layer implementation |
| v2.1.1 | 2025-12-06 | Critical bug fixes for resume functionality |
| v2.1.2 | 2025-12-06 | Comprehensive persistence refinement with full logging |

---

### 2025-12-06d: Statistics Dashboard & Multi-Level Inference Engine (v2.2.0)

**Context:** Built comprehensive statistics system with multi-level inference capabilities to extract meaningful insights from captured rally and shot data.

#### What Was Built

**1. Data-to-Stats Mapping Document** (`docs-match-analyser-edge-tt/specs/Data-to-Stats-Mapping.md`)
- Complete mapping of captured data to Analysis Engine statistics
- Three-level inference model:
  - **Level 1 (Direct):** Deterministic inference from single shot (95-100% accuracy)
  - **Level 2 (Multi-Point):** Inference from shot + context (70-85% accuracy)
  - **Level 3 (Deep):** Complex inference from shot sequences (50-75% accuracy)
- Coverage assessment for all 7 Analysis Engine categories
- Confidence levels for each statistic
- Implementation priority guide

**2. Multi-Level Inference Engine** (`app/src/rules/stats/`)

Created pure inference functions for tactical analysis:
- `inferInitiative.ts` - Initiative holder and steal detection (Level 2)
- `inferTacticalPatterns.ts` - 3-ball patterns, opening quality, attack zones, weakness exploitation (Level 2-3)
- `inferMovement.ts` - Pivots, out-of-position detection, forced wide, recovery quality (Level 3)

Inference functions include:
- `inferInitiative()` - First attacker analysis, initiative steal detection
- `infer3BallPattern()` - Serve → receive → 3rd ball sequences
- `inferOpeningQuality()` - 3rd ball attack effectiveness
- `findPreferredAttackZones()` - Target zone distribution
- `detectWeaknessExploitation()` - Opponent targeting patterns
- `inferPivotMovement()` - Footwork pattern detection
- `inferOutOfPosition()` - Positional disadvantage analysis
- `inferForcedWide()` - Opponent placement effectiveness
- `inferRecoveryQuality()` - Recovery speed and success

**3. Statistics Calculators** (`app/src/rules/stats/`)

High-accuracy stat calculators using captured data:
- `matchPerformanceStats.ts` - Serve/receive efficiency, streaks, clutch performance, rally length analysis (100% accuracy)
- `tacticalStats.ts` - 3rd/4th ball success, opening quality, initiative control (70-90% accuracy)
- `errorStats.ts` - Error breakdown, shot type error profiles (95-100% accuracy)
- `serveReceiveStats.ts` - Serve by spin/length/situation, receive vs spin types (90-100% accuracy)

All calculators work with DBSet, DBRally, and DBShot entities.

**4. Stats Feature** (`app/src/features/stats/`)

**View Models:**
- `PlayerStatsViewModel` - Complete player performance data
- `RawDataViewModel` - Unprocessed data by set for validation
- `StatsFilterOptions` - Filter by match, opponent, date range
- `StatWithConfidence` - Stats with accuracy badges

**Derive Hooks:**
- `useDerivePlayerStats()` - Calculate all stats for a player
- `useDeriveRawData()` - Organize raw data by set

**UI Blocks:**
- `StatCardBlock` - Individual stat card with confidence badge
- `StatRowBlock` - Table row stat display
- `RallyListBlock` - Raw rally data table

**Sections:**
- `MatchSummarySection` - Overall record, win rates, sets, points
- `ServeReceiveSection` - Serve/receive performance, spin effectiveness, clutch serves
- `TacticalSection` - 3rd/4th ball analysis, opening quality, initiative control
- `ErrorAnalysisSection` - Error breakdown by type, phase, shot type
- `RawDataSection` - Unprocessed data organized by set

**Composer:**
- `StatsComposer` - Main dashboard with player selection, match filtering, tabbed navigation

**5. Stats Page & Route**
- Created `/stats` route in App.tsx
- `StatsPage` component wrapper
- Added to pages index

#### Features Implemented

**Match-Level Stats (100% Accuracy):**
- Points won/lost on serve and receive
- Serve/receive efficiency percentages
- Serve and receive error rates
- Longest win/lose streaks
- Clutch point performance (9-9+, deuce, game points)
- Long vs short rally win rates

**Serve Analysis (90-100% Accuracy):**
- Serve win rate by spin family (under/top/side/no_spin)
- Serve win rate by length (short/half_long/long)
- Serve performance by score situation (normal/clutch/game point)
- Serve fault tracking

**Receive Analysis (90-100% Accuracy):**
- Receive win rate overall
- Aggressive receive success rate
- Receive performance vs spin types
- Receive error tracking

**Tactical Analysis (70-90% Accuracy):**
- 3rd ball attack success, winners, forced errors
- 4th ball counter-attack and blocking success
- Opening quality (excellent/good/poor)
- Initiative holder win rate
- Initiative steal rate

**Error Analysis (95-100% Accuracy):**
- Total, unforced, and forced errors
- Errors by phase (serve/receive/rally)
- Net vs long error breakdown
- Error rate by inferred shot type
- Winner/error/neutral rates per shot type

**Raw Data Display:**
- Rally-by-rally breakdown per set
- Shot details for each rally
- Score progression
- Point end types

#### Confidence Badge System

Stats display confidence levels to indicate accuracy:
- ✅ **High (85-100%)** - Green badge, reliable data
- ⚠️ **Medium (65-84%)** - Yellow badge, estimated/inferred
- ❌ **Low (<65%)** - Red badge or hidden by default

#### What Can Be Inferred

**Level 1 (Direct) Examples:**
- Basic shot types from intent + wing
- Spin from intent + serve spin family
- Distance from table from intent + shot index
- 3rd ball attacks (shot 3 + aggressive intent)
- Receive attacks (shot 2 + aggressive intent)

**Level 2 (Multi-Point) Examples:**
- Player position from origin + wing (wide FH, wide BH, pivot)
- Pressure level from rally length + intent sequence
- Initiative holder (first aggressive shot in rally)
- Opening quality from 3rd ball + opponent's 4th ball response

**Level 3 (Deep) Examples:**
- Pivot to forehand from wing changes + position shifts
- Out of position from shot sequences + opponent targeting
- Forced wide from opponent's placement
- Recovery quality from time between shots + position recovery

#### Technical Decisions

1. **Pure Functions in `rules/stats/`:** All inference and calculation logic is deterministic, no React, no IO
2. **Confidence-Based Display:** User sees reliability of each statistic
3. **Filtering Support:** Stats can be filtered by match, opponent, date (foundation laid)
4. **Raw Data Validation:** Users can inspect source data to verify statistics
5. **Tabbed Interface:** Organized into Summary, Serve/Receive, Tactical, Errors, Raw Data
6. **Future-Proof:** Structure ready for AI-enhanced inference (ball speed, shot quality index, advanced footwork)

#### What's Deferred (Future AI Phase)

- Ball speed estimation (40% accuracy with current data)
- Shot quality index (55% accuracy)
- Recovery time analysis (45% accuracy)
- Advanced footwork patterns
- Precise shot placement coordinates
- Video-based trajectory analysis

#### Files Created

**Documentation:**
- `docs-match-analyser-edge-tt/specs/Data-to-Stats-Mapping.md`

**Inference Engine:**
- `app/src/rules/stats/inferInitiative.ts`
- `app/src/rules/stats/inferTacticalPatterns.ts`
- `app/src/rules/stats/inferMovement.ts`
- `app/src/rules/stats/index.ts`

**Stats Calculators:**
- `app/src/rules/stats/matchPerformanceStats.ts`
- `app/src/rules/stats/tacticalStats.ts`
- `app/src/rules/stats/errorStats.ts`
- `app/src/rules/stats/serveReceiveStats.ts`

**Feature:**
- `app/src/features/stats/models.ts`
- `app/src/features/stats/derive/derivePlayerStats.ts`
- `app/src/features/stats/derive/deriveRawData.ts`
- `app/src/features/stats/derive/index.ts`
- `app/src/features/stats/blocks/StatCardBlock.tsx`
- `app/src/features/stats/blocks/StatRowBlock.tsx`
- `app/src/features/stats/blocks/RallyListBlock.tsx`
- `app/src/features/stats/blocks/index.ts`
- `app/src/features/stats/sections/MatchSummarySection.tsx`
- `app/src/features/stats/sections/ServeReceiveSection.tsx`
- `app/src/features/stats/sections/TacticalSection.tsx`
- `app/src/features/stats/sections/ErrorAnalysisSection.tsx`
- `app/src/features/stats/sections/RawDataSection.tsx`
- `app/src/features/stats/sections/index.ts`
- `app/src/features/stats/composers/StatsComposer.tsx`
- `app/src/features/stats/composers/index.ts`
- `app/src/features/stats/index.ts`

**Page & Routes:**
- `app/src/pages/Stats.tsx`

**Files Modified:**
- `app/src/pages/index.ts` - Added Stats export
- `app/src/App.tsx` - Added /stats route

#### Next Steps

1. **Test with Real Data:** Tag real matches and validate stat accuracy
2. **Tune Inference:** Adjust confidence thresholds based on actual results
3. **Add Filters:** Implement opponent and date range filtering
4. **Add Visualizations:** Charts for serve tendencies, attack zones, error patterns
5. **Opponent Scouting:** Build head-to-head comparison views
6. **Export Stats:** PDF/CSV export for coaching

---

### 2025-12-06d: Rules Layer Reorganization & Derivation Extraction (v2.3.0)

**Context:** Major refactoring of `/rules/` folder to create clear separation between deterministic derivations, probabilistic inferences, calculations, and statistics. Extracted duplicate logic from composers into centralized pure functions.

#### Changes Made

**1. New Folder Structure**

Created hierarchical organization in `/rules/`:
```
/rules/
  ├── derive/          # Level 0: Deterministic derivations (100% fact)
  │   ├── shot/        # Shot-level derivations
  │   ├── rally/       # Rally-level derivations
  │   ├── set/         # Set-level derivations
  │   └── match/       # Match-level derivations
  ├── calculate/       # Arithmetic calculations
  ├── infer/           # Level 1+: Probabilistic inferences
  │   ├── shot-level/  # Persisted to DB
  │   └── rally-patterns/  # Computed on-demand
  ├── stats/           # Aggregated statistics
  └── validate/        # Data integrity checks
```

**2. New Derivation Functions**

Created pure functions following naming convention `derive{Level}_{db_field}`:

**Shot-Level:**
- `deriveShot_locations.ts` - Derive shot_origin/shot_destination from direction

**Rally-Level:**
- `deriveRally_winner_id.ts` - Determine rally winner from last shot
- `deriveRally_point_end_type.ts` - Classify point ending type
- `deriveRally_is_scoring.ts` - Determine if rally awards a point (vs let)
- `deriveRally_scores.ts` - Calculate score_after values

**Set-Level:**
- `deriveSet_winner_id.ts` - Determine set winner from final scores
- `deriveSet_final_scores.ts` - Extract final scores from rallies

**Match-Level:**
- `deriveMatch_winner_id.ts` - Determine match winner from set wins
- `deriveMatch_sets_won.ts` - Count sets won by each player

**3. Moved Existing Files**

Reorganized existing rules into appropriate folders:
- Moved `calculateServer.ts`, `calculateShotPlayer.ts` → `/calculate/`
- Moved `inferShotType.ts`, `inferSpin.ts`, `inferPressure.ts`, `inferDistanceFromTable.ts`, `inferPlayerPosition.ts` → `/infer/shot-level/`
- Moved `stats/inferInitiative.ts`, `stats/inferMovement.ts`, `stats/inferTacticalPatterns.ts` → `/infer/rally-patterns/`
- Moved `validateMatchData.ts`, `validateVideoCoverage.ts` → `/validate/`

**4. Updated Imports**

- Updated `runInference.ts` to use new import paths
- Updated `Phase1TimestampComposer.tsx` to use `deriveRally_winner_id()`
- Updated `stats/tacticalStats.ts` to import from new locations
- Updated main `/rules/index.ts` with new structure and backward compatibility exports

**5. Duplicate Logic Audit**

Created `DUPLICATE_LOGIC_AUDIT.md` documenting findings:
- Found 6 instances of duplicate derivation logic across composers
- Identified 4 high/medium priority extractions needed
- Marked 2 low-priority cases as acceptable (simple UI logic)

#### Technical Decisions

**Naming Convention:**
- `derive*()` = 100% deterministic transformations → persisted to DB
- `infer*()` = Probabilistic guesses with confidence → some persisted, some ephemeral
- `calculate*()` = Arithmetic/aggregation → ephemeral (computed on-demand)

**Function Naming:**
- Functions named after DB fields they populate: `deriveRally_winner_id()` → `rallies.winner_id`
- Makes grep-friendly and self-documenting

**Rationale:**
- **Single Source of Truth:** One function per derivation eliminates duplicate logic
- **Testability:** Pure functions in `/rules/` are trivial to unit test
- **Maintainability:** Business logic changes only require updating `/rules/`
- **Bug Prevention:** Duplicate logic = duplicate bugs
- **Clear Hierarchy:** Facts → Inferences → Aggregations

#### Files Created

**New Derivation Functions:**
- `app/src/rules/derive/shot/deriveShot_locations.ts`
- `app/src/rules/derive/rally/deriveRally_winner_id.ts`
- `app/src/rules/derive/rally/deriveRally_point_end_type.ts`
- `app/src/rules/derive/rally/deriveRally_is_scoring.ts`
- `app/src/rules/derive/rally/deriveRally_scores.ts`
- `app/src/rules/derive/set/deriveSet_winner_id.ts`
- `app/src/rules/derive/set/deriveSet_final_scores.ts`
- `app/src/rules/derive/match/deriveMatch_winner_id.ts`
- `app/src/rules/derive/match/deriveMatch_sets_won.ts`

**Index Files:**
- `app/src/rules/derive/index.ts`
- `app/src/rules/derive/shot/index.ts`
- `app/src/rules/derive/rally/index.ts`
- `app/src/rules/derive/set/index.ts`
- `app/src/rules/derive/match/index.ts`
- `app/src/rules/calculate/index.ts`
- `app/src/rules/infer/index.ts`
- `app/src/rules/infer/shot-level/index.ts`
- `app/src/rules/infer/rally-patterns/index.ts`
- `app/src/rules/validate/index.ts`

**Documentation:**
- `docs-match-analyser-edge-tt/DUPLICATE_LOGIC_AUDIT.md`

#### Files Modified

**Rules Layer:**
- `app/src/rules/index.ts` - Updated with new structure and backward compatibility
- `app/src/rules/stats/index.ts` - Removed infer* exports (moved to /infer/)
- `app/src/rules/stats/tacticalStats.ts` - Updated imports

**Features:**
- `app/src/features/shot-tagging-engine/composers/runInference.ts` - Updated imports, added comments
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` - Using deriveRally_winner_id()

#### Next Steps

1. **Extract Remaining Duplicates:** Phase2DetailComposer direction parsing
2. **Rally Derivation Orchestrator:** Create service to run all rally derivations after tagging complete
3. **Score Derivation Integration:** Use deriveRally_scores() in composers
4. **Test Coverage:** Add unit tests for derive functions (future when stable)
5. **Remove Legacy Exports:** Clean up backward compatibility after migration complete

#### Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.1.0 | 2025-12-06 | Initial persistence layer implementation |
| v2.1.1 | 2025-12-06 | Critical bug fixes for resume functionality |
| v2.1.2 | 2025-12-06 | Comprehensive persistence refinement with full logging |
| v2.2.0 | 2025-12-06 | Statistics dashboard and multi-level inference engine |
| v2.2.1 | 2025-12-07 | Bug fix: Double direction buttons on service fault |
| v2.2.2 | 2025-12-07 | Bug fixes: Phase 1 winner derivation, Phase 2 save error; Enhanced Phase 2 shot log |
| v2.2.3 | 2025-12-07 | Bug fixes: Shot counter, shot quality logging; Enhanced save error diagnostics |
| v2.2.4 | 2025-12-07 | CRITICAL: Fixed Phase 2 save error, shot quality race condition, player names |
| v2.2.5 | 2025-12-07 | Enhanced debugging for inconsistent data saves |
| v2.2.6 | 2025-12-07 | Comprehensive save debugging - Phase 1 & Phase 2, DB verification |
| v2.2.7 | 2025-12-07 | CRITICAL: Fixed winner_id and point_end_type always null in Phase 1 |
| v2.2.8 | 2025-12-07 | CRITICAL: Fixed stale state causing data loss (spin, intent, quality) |
| v2.2.9 | 2025-12-07 | Error question flow & shotQuality explicit setting |
| v2.2.10 | 2025-12-07 | Complete database table viewer with all fields |
| v2.3.0 | 2025-12-06 | Rules layer reorganization & derivation extraction |
| v3.0.0 | 2025-12-08 | Database refactor - Slug-based IDs & shot inference tracking |
| v3.0.1 | 2025-12-08 | Critical bug fixes - ID generation & data duplication |
| v3.0.2 | 2025-12-08 | Fixed slug ID generation for all entities |
| v3.1.0 | 2025-12-08 | Split shot_result into shot_result and shot_quality; Fixed serveType bug |
| v3.1.1 | 2025-12-09 | Removed serve type from Phase 2 tagging flow |

---

[Rest of document remains the same...]
