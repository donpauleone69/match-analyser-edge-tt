# MVP Spec Addendum

> This document tracks all changes, refinements, and additions to the original MVP specification made during development. Each entry includes the date, what changed, and the rationale.

---

## Change Log

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

---

[Rest of document remains the same...]
