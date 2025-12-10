# Remove Database Saves from TaggingUIComposer - Implementation Plan

**Date:** December 9, 2025  
**Status:** 🔵 Ready for Implementation  
**Complexity:** Medium  
**Estimated Time:** 3-4 hours

---

## Context & Background

### Current Architecture Problem

The **TaggingUIComposer** currently acts as both an orchestrator AND a data persistence layer. After Phase 1 and Phase 2 composers have ALREADY auto-saved data to the database, TaggingUIComposer:

1. **DELETES all saved data** (`deleteSetTaggingData()`)
2. **Re-saves everything from scratch** (rallies, shots, scores)
3. Performs additional calculations (timestamp_end, inference, match finalization)

This creates several issues:
- ❌ **Redundant database operations** - data saved 2-3 times
- ❌ **Data loss risk** - if browser crashes during TaggingUIComposer's batch save, all Phase 1/2 auto-saves are lost
- ❌ **Violation of separation of concerns** - orchestrator shouldn't handle persistence
- ❌ **Complex code** - 240+ lines of save logic in TaggingUIComposer

### Recent Changes That Enable This Refactor

**Phase1TimestampComposer** was recently updated (December 2025) to:
- ✅ Auto-save each rally immediately on completion
- ✅ Auto-save all shots for each rally
- ✅ Calculate and save scores (before/after) for each rally
- ✅ Save set completion status

**Phase2DetailComposer** already:
- ✅ Auto-saves each shot's Phase 2 details immediately
- ✅ Updates set progress after each shot
- ✅ Marks set as phase2_complete when done

**What's Missing:**
- ❌ Shot `timestamp_end` calculations (currently null)
- ❌ Rally `timestamp_start/timestamp_end` fields (don't exist)
- ❌ Inference execution (only happens in TaggingUIComposer)
- ❌ Match-level finalization (only happens in TaggingUIComposer)

---

## Goal

**Move ALL database operations from TaggingUIComposer into Phase1 and Phase2 composers**, making TaggingUIComposer a pure orchestrator with zero database writes.

### Target Architecture

```
Phase1TimestampComposer
  ├─ Auto-saves rallies with timestamps ✓
  ├─ Auto-saves shots with timestamp_start ✓
  ├─ Auto-saves scores before/after ✓
  └─ NEW: Saves shot timestamp_end ⬅️ ADD THIS

Phase2DetailComposer  
  ├─ Auto-saves shot Phase 2 details ✓
  ├─ Updates set progress ✓
  ├─ Marks set complete ✓
  ├─ NEW: Runs inference ⬅️ ADD THIS
  └─ NEW: Finalizes match data ⬅️ ADD THIS

TaggingUIComposer
  ├─ Orchestrates phase transitions ✓
  ├─ Manages routing ✓
  ├─ Shows loading/completion UI ✓
  └─ REMOVE: All database saves ⬅️ DELETE THIS
```

---

## Current State Analysis

### Files Involved

| File | Role | Database Saves? |
|------|------|----------------|
| `Phase1TimestampComposer.tsx` | Captures timestamps, marks rally boundaries | ✅ Yes (auto-save on rally end) |
| `Phase2DetailComposer.tsx` | Captures shot details (stroke, direction, etc.) | ✅ Yes (auto-save on shot complete) |
| `TaggingUIComposer.tsx` | Orchestrates two-phase flow | ✅ Yes (batch delete + re-save) |
| `dataMapping.ts` | Maps UI data to DB schema | No (helper functions) |
| `runInference.ts` | Derives shot_type, spin, etc. | No (but modifies DB) |

### What Each Composer Currently Saves

**Phase1TimestampComposer** (lines 368-453):
```typescript
completeRally() {
  // ✅ Saves rally with server_id, receiver_id, winner_id
  // ✅ Saves player1/2_score_before and _after
  // ✅ Saves all shots with timestamp_start
  // ❌ Sets timestamp_end to NULL
  // ✅ Updates set progress (phase1_in_progress)
}

handleSaveSet() {
  // ✅ Marks set as phase1_complete
  // ✅ Saves set winner and final scores
}
```

**Phase2DetailComposer** (lines 379-520):
```typescript
saveCurrentShotToDatabase() {
  // ✅ Updates shot with direction, length, spin, stroke, intent
  // ✅ Updates shot with errorType (if error shot)
  // ✅ Updates shot with shotQuality (if in-play shot)
  // ✅ Marks shot as is_tagged: true
  // ✅ Updates set progress (phase2_in_progress)
}

// When all shots complete (lines 565-573):
// ✅ Marks set as phase2_complete
// ❌ Does NOT run inference
// ❌ Does NOT finalize match
```

**TaggingUIComposer** (lines 276-514):
```typescript
handleCompletePhase2() {
  // ❌ deleteSetTaggingData() - DELETES ALL DATA
  // ❌ Re-saves all rallies (redundant)
  // ❌ Re-saves all shots (redundant)
  // ✅ Calculates timestamp_end for shots (UNIQUE - needs to move)
  // ❌ Marks is_rally_end (redundant - Phase1 already does this)
  // ✅ Runs inference (UNIQUE - needs to move)
  // ✅ Calculates sets_before/after (UNIQUE - needs to move)
  // ✅ Updates match winner/sets (UNIQUE - needs to move)
}
```

---

## Implementation Plan

### **Phase 1: Update Rally Schema**

**File:** `app/src/data/entities/rallies/rally.types.ts`

**Current:**
```typescript
export interface DBRally {
  // ... existing fields ...
  end_of_point_time: number | null   // Rally end timestamp
}
```

**Add:**
```typescript
export interface DBRally {
  // ... existing fields ...
  
  // Rally timing
  timestamp_start: number | null  // First shot's timestamp_start
  timestamp_end: number | null    // Last shot's timestamp_end
  end_of_point_time: number | null // KEEP for backwards compatibility
}
```

**Rationale:** 
- `timestamp_start` = first shot's timestamp
- `timestamp_end` = last shot's timestamp_end (may differ from end_of_point_time if rally continues after last contact)
- Keep `end_of_point_time` for existing code compatibility

**Update:** `app/src/data/entities/rallies/rally.db.ts` to handle new fields (if schema validation exists)

---

### **Phase 2: Calculate Shot timestamp_end in Phase1TimestampComposer**

**File:** `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`

**Current code (lines 415-429):**
```typescript
// Map and save all shots for this rally
console.log(`[Phase1] Saving ${rally.shots.length} shots...`)
for (const shot of rally.shots) {
  const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
  const playerId = shotPlayer === 'player1' ? player1Id : player2Id
  const isLastShot = shot.shotIndex === rally.shots.length
  const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId, isLastShot, rally.endCondition)
  console.log(`[Phase1] Shot ${shot.shotIndex}:`, {
    player_id: dbShot.player_id,
    time: dbShot.timestamp_start,
    shot_index: dbShot.shot_index,
    shot_result: dbShot.shot_result,
  })
  await shotDb.create(dbShot)
}
```

**Updated code:**
```typescript
// Map and save all shots for this rally
console.log(`[Phase1] Saving ${rally.shots.length} shots...`)
for (let i = 0; i < rally.shots.length; i++) {
  const shot = rally.shots[i]
  const nextShot = rally.shots[i + 1] // undefined for last shot
  
  const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
  const playerId = shotPlayer === 'player1' ? player1Id : player2Id
  const isLastShot = i === rally.shots.length - 1
  
  // Calculate timestamp_end
  const timestamp_end = nextShot 
    ? nextShot.timestamp          // Next shot's start time
    : rally.endTimestamp          // Rally end time for last shot
  
  const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId, isLastShot, rally.endCondition)
  dbShot.timestamp_end = timestamp_end  // ✓ Set timestamp_end!
  
  console.log(`[Phase1] Shot ${shot.shotIndex}:`, {
    player_id: dbShot.player_id,
    time_start: dbShot.timestamp_start,
    time_end: dbShot.timestamp_end,  // NEW
    shot_index: dbShot.shot_index,
    shot_result: dbShot.shot_result,
  })
  await shotDb.create(dbShot)
}
console.log(`[Phase1] ✓ All ${rally.shots.length} shots saved with timestamp_end`)
```

**Changes:**
- Switch from `for...of` to indexed `for` loop to access next shot
- Calculate `timestamp_end` before saving
- Override the `null` value from `mapPhase1ShotToDBShot()`

---

### **Phase 3: Calculate Rally Timestamps in Phase1TimestampComposer**

**File:** `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`

**Location:** Inside `completeRally()`, around line 399 (before saving rally)

**Add:**
```typescript
// Calculate rally timestamps
const rallyTimestampStart = rally.shots[0].timestamp
const rallyTimestampEnd = rally.endTimestamp

// Map and save rally WITH SCORES AND TIMESTAMPS
const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
dbRally.player1_score_before = scoreBefore.player1
dbRally.player2_score_before = scoreBefore.player2
dbRally.player1_score_after = newScore.player1
dbRally.player2_score_after = newScore.player2
dbRally.timestamp_start = rallyTimestampStart  // NEW
dbRally.timestamp_end = rallyTimestampEnd      // NEW
dbRally.end_of_point_time = rallyTimestampEnd  // Keep existing field populated
```

**Rationale:**
- Rally start = first shot's timestamp
- Rally end = rally.endTimestamp (captured when user marks end condition)
- Populate both new fields and existing `end_of_point_time`

---

### **Phase 4: Create Match Finalization Module**

**New File:** `app/src/features/shot-tagging-engine/composers/finalizeMatch.ts`

```typescript
/**
 * Finalize match-level data after Phase 2 completion
 * Calculates sets_before/after and match winner
 */

import { setDb, matchDb } from '@/data'

export async function finalizeMatchAfterPhase2(
  matchId: string,
  setId: string,
  player1Id: string,
  player2Id: string
): Promise<void> {
  console.log('[Finalize] Starting match finalization...')
  
  try {
    // 1. Get all sets for this match
    const allSets = await setDb.getByMatchId(matchId)
    console.log(`[Finalize] Found ${allSets.length} sets in match`)
    
    // 2. Calculate sets_before/after for each set
    const { calculateSetsBeforeAfter } = await import('./dataMapping')
    const setsMap = calculateSetsBeforeAfter(
      allSets.map(s => ({ set_number: s.set_number, winner_id: s.winner_id })),
      player1Id,
      player2Id
    )
    
    // 3. Update each set with its sets_before/after values
    for (const set of allSets) {
      const setsCounts = setsMap.get(set.set_number)
      if (setsCounts) {
        await setDb.update(set.id, {
          player1_sets_before: setsCounts.player1_sets_before,
          player1_sets_after: setsCounts.player1_sets_after,
          player2_sets_before: setsCounts.player2_sets_before,
          player2_sets_after: setsCounts.player2_sets_after,
        })
        console.log(`[Finalize] Set ${set.set_number}: P1 sets ${setsCounts.player1_sets_before}→${setsCounts.player1_sets_after}, P2 sets ${setsCounts.player2_sets_before}→${setsCounts.player2_sets_after}`)
      }
    }
    
    // 4. Calculate match winner
    const player1SetsWon = allSets.filter(s => s.winner_id === player1Id && s.is_tagged).length
    const player2SetsWon = allSets.filter(s => s.winner_id === player2Id && s.is_tagged).length
    const matchWinnerId = player1SetsWon > player2SetsWon 
      ? player1Id 
      : player2SetsWon > player1SetsWon
      ? player2Id
      : null
    
    // 5. Update match record
    await matchDb.update(matchId, {
      player1_sets_final: player1SetsWon,
      player2_sets_final: player2SetsWon,
      winner_id: matchWinnerId,
      match_detail_level: 'shots',
    })
    
    console.log(`[Finalize] ✓ Match finalized: P1=${player1SetsWon} sets, P2=${player2SetsWon} sets, Winner=${matchWinnerId}`)
  } catch (error) {
    console.error('[Finalize] ✗ Failed to finalize match:', error)
    throw error
  }
}
```

**Purpose:** Encapsulates all match-level finalization logic in a reusable module.

---

### **Phase 5: Update Phase2DetailComposer to Run Inference and Finalize Match**

**File:** `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

**Current code (lines 565-575):**
```typescript
} else {
  // All shots complete
  if (setId) {
    setDb.update(setId, {
      tagging_phase: 'phase2_complete',
      is_tagged: true,
      tagging_completed_at: new Date().toISOString(),
      phase2_last_shot_index: currentShotIndex + 1,
      phase2_total_shots: allShots.length,
    }).catch(console.error)
  }
  if (onComplete) onComplete(updatedShots)
}
```

**Updated code:**
```typescript
} else {
  // All shots complete
  if (setId && player1Id && player2Id) {
    try {
      console.log('[Phase2] All shots tagged - finalizing...')
      
      // 1. Update set status
      await setDb.update(setId, {
        tagging_phase: 'phase2_complete',
        is_tagged: true,
        tagging_completed_at: new Date().toISOString(),
        phase2_last_shot_index: currentShotIndex + 1,
        phase2_total_shots: allShots.length,
      })
      console.log('[Phase2] ✓ Set marked as complete')
      
      // 2. Run inference on all shots
      console.log('[Phase2] Running inference...')
      const dbRallies = await rallyDb.getBySetId(setId)
      const dbShots = await shotDb.getBySetId(setId)
      await runInferenceForSet(dbRallies, dbShots)
      console.log('[Phase2] ✓ Inference complete')
      
      // 3. Finalize match-level data
      console.log('[Phase2] Finalizing match...')
      const currentSet = await setDb.getById(setId)
      if (currentSet) {
        const { finalizeMatchAfterPhase2 } = await import('./finalizeMatch')
        await finalizeMatchAfterPhase2(currentSet.match_id, setId, player1Id, player2Id)
      }
      console.log('[Phase2] ✓ Match finalized')
      
    } catch (error) {
      console.error('[Phase2] ✗ Error during finalization:', error)
      alert('Tagging complete, but some finalization steps failed. Check console.')
    }
  }
  
  if (onComplete) onComplete(updatedShots)
}
```

**Add imports at top:**
```typescript
import { runInferenceForSet } from './runInference'
import { rallyDb, shotDb, setDb } from '@/data'
```

**Changes:**
- Make update operations sequential with `await`
- Add inference execution
- Add match finalization
- Add error handling with user feedback

---

### **Phase 6: Gut TaggingUIComposer's handleCompletePhase2**

**File:** `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx`

**Current code (lines 276-514):** ~240 lines of save logic

**Replace with:**
```typescript
const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
  console.log('[TaggingUI] Phase 2 complete!')
  console.log('[TaggingUI] All data already saved by Phase1 and Phase2 composers')
  console.log('[TaggingUI] Inference and match finalization already complete')
  
  // Transition to completion screen
  setPhase('complete')
}
```

**Remove these imports (no longer needed):**
```typescript
import { rallyDb, shotDb } from '@/data'  // Remove
import { 
  calculateScoresForRallies,              // Remove
  markRallyEndShots,                      // Remove
  applyTimestampEnd,                      // Remove
  // ... keep only what's still used
} from './dataMapping'
import { runInferenceForSet } from './runInference'  // Remove
```

**Delete these helper functions if they exist:**
- `deleteSetTaggingData()` - no longer needed
- Any local save logic

**Changes:**
- **Removed:** 240+ lines of database operations
- **Kept:** Phase transition logic only
- **Result:** Pure orchestrator with no database writes

---

### **Phase 7: Clean Up dataMapping.ts (Optional)**

**File:** `app/src/features/shot-tagging-engine/composers/dataMapping.ts`

Check if these functions are still used:
- `markRallyEndShots()` - likely unused now
- `applyTimestampEnd()` - likely unused now

If not used elsewhere, consider removing or marking as deprecated.

**Note:** Keep for now unless causing issues. Can clean up in separate refactor.

---

## Testing Plan

### **Test 1: Fresh Set Tagging (Happy Path)**

1. Create new match with 1 set
2. Tag Phase 1:
   - Tag 3 rallies (serve + 2 shots each)
   - Verify rallies saved to DB
   - Verify shots have `timestamp_end` populated
   - Verify rallies have `timestamp_start` and `timestamp_end`
   - Click "Save Set"
3. Tag Phase 2:
   - Complete all shot details
   - Watch console for inference execution
   - Watch console for match finalization
   - Verify no errors
4. Check database:
   - All shots have `timestamp_end` ≠ null
   - All rallies have `timestamp_start` and `timestamp_end`
   - Set has `phase2_complete` status
   - Match has `match_detail_level: 'shots'`
   - Match has correct winner and set counts

**Expected:** All data present, no delete/re-save operations logged

---

### **Test 2: Resume Phase 1**

1. Tag 2 rallies in Phase 1
2. Close browser (simulate crash)
3. Reopen, navigate to set
4. Resume Phase 1
5. Tag 1 more rally
6. Click "Save Set"

**Expected:** All 3 rallies present with correct timestamps

---

### **Test 3: Resume Phase 2**

1. Complete Phase 1 (3 rallies)
2. Start Phase 2, tag 5 shots
3. Close browser
4. Reopen, resume Phase 2
5. Complete remaining shots

**Expected:** 
- No data loss
- Inference runs only once (at completion)
- Match finalization runs only once

---

### **Test 4: Multi-Set Match**

1. Create match with 3 sets
2. Complete Set 1 (Phase 1 + Phase 2)
3. Complete Set 2 (Phase 1 + Phase 2)
4. Check match data after Set 2:
   - `player1_sets_final` and `player2_sets_final` correct
   - Each set has correct `sets_before/after` values
   - No duplicate finalization

**Expected:** Match data updates correctly after each set completion

---

### **Test 5: Browser Crash During Phase 2**

1. Complete Phase 1 (3 rallies saved)
2. Start Phase 2, tag 8 shots
3. Force close browser (kill process)
4. Reopen application
5. Check database directly

**Expected:**
- All 3 rallies present (from Phase 1)
- First 8 shots have Phase 2 details saved
- Can resume from shot 9
- No data corruption

---

### **Test 6: TypeScript Compilation**

```bash
cd app
npx tsc --noEmit
```

**Expected:** No type errors

---

### **Test 7: Console Log Verification**

Watch console during Phase 1:
- Should see: `[Phase1] Shot X: time_start: X.XX, time_end: X.XX`
- Should NOT see: `timestamp_end: null`

Watch console during Phase 2 completion:
- Should see: `[Phase2] Running inference...`
- Should see: `[Phase2] ✓ Inference complete`
- Should see: `[Phase2] Finalizing match...`
- Should see: `[Finalize] ✓ Match finalized`

Watch console in TaggingUIComposer:
- Should NOT see: `[Save] Step 0: Cleaning up existing data...`
- Should NOT see: `deleteSetTaggingData`
- Should see: `[TaggingUI] All data already saved by Phase1 and Phase2 composers`

---

## Success Criteria

✅ **All shots have timestamp_end populated**  
✅ **All rallies have timestamp_start and timestamp_end populated**  
✅ **Inference runs automatically after Phase 2**  
✅ **Match data finalizes automatically after Phase 2**  
✅ **No delete/re-save operations in logs**  
✅ **TaggingUIComposer has no database imports**  
✅ **handleCompletePhase2 is < 10 lines**  
✅ **All tests pass**  
✅ **TypeScript compiles with no errors**  

---

## Rollback Plan

If issues arise:

1. **Revert Phase2DetailComposer changes** (keep inference/finalization in TaggingUIComposer)
2. **Revert Phase1TimestampComposer timestamp_end changes** (keep batch calculation)
3. **Keep rally timestamp_start/end fields** (no harm, just null)
4. **Restore TaggingUIComposer handleCompletePhase2** from git history

**Low Risk:** Changes are additive. Phase 1/2 composers continue to work independently. Only TaggingUIComposer logic changes significantly.

---

## Files to Modify

### Database Schema
- [ ] `app/src/data/entities/rallies/rally.types.ts` - Add timestamp fields

### Composers
- [ ] `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` - Add timestamp_end calculation
- [ ] `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx` - Add inference + finalization
- [ ] `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx` - Remove all save logic

### New Files
- [ ] `app/src/features/shot-tagging-engine/composers/finalizeMatch.ts` - Create match finalization module

### Documentation
- [ ] `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` - Log changes

---

## Estimated Timeline

| Phase | Time | Description |
|-------|------|-------------|
| Schema Update | 15 min | Add rally timestamp fields |
| Phase1 Updates | 45 min | Timestamp_end calculation, rally timestamps |
| finalizeMatch.ts | 30 min | Create new module |
| Phase2 Updates | 30 min | Add inference + finalization |
| TaggingUI Cleanup | 30 min | Remove save logic |
| Testing | 60 min | All test cases |
| Documentation | 15 min | Update changelog |
| **Total** | **3-4 hours** | End-to-end implementation |

---

## Notes for Implementation Agent

1. **Work sequentially** - Each phase depends on the previous
2. **Test after each phase** - Use `npx tsc --noEmit` frequently
3. **Check console logs** - Verify new logging appears as expected
4. **Database schema first** - TypeScript will catch missing fields
5. **Keep old code commented** - Don't delete until testing passes
6. **Update changelog** - Document in specAddendumMVP.md when complete

---

## References

- **Phase 1 Setup Flow Spec:** `docs-match-analyser-edge-tt/specs/Phase1_Setup_Flow_Implementation_Plan.md`
- **Data Schema:** `docs-match-analyser-edge-tt/DataSchema.md`
- **Architecture:** `docs-match-analyser-edge-tt/Architecture.md`
- **Changelog:** `docs-match-analyser-edge-tt/specs/specAddendumMVP.md`

