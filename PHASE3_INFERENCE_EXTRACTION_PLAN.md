# Phase 3 Inference Extraction Plan

**Date:** 2025-12-09  
**Status:** Ready for Implementation  
**Complexity:** Medium  
**Estimated Changes:** 5 files (1 new, 4 modified)

---

## 1. Context & Rationale

### Current Problem
Currently, the **inference engine** (`runInference.ts`) is **automatically executed** at the end of Phase 2 (shot tagging) within `Phase2DetailComposer.tsx` at lines 581-585. This means:

- Users cannot skip inference if they only want raw tagged data
- Inference cannot be re-run if rules are updated
- Phase 2 completion is slower (inference adds processing time)
- No clear separation between tagging (Phase 2) and analysis (inference)

### Proposed Solution
Extract inference into a **standalone Phase 3** that:
- Can be **optionally executed** after Phase 2
- Can be **skipped** if user doesn't need it immediately
- Can be **re-run later** from the data viewer
- Provides clearer separation of concerns

---

## 2. Current State Analysis

### Database Operations by Composer

#### TaggingUIComposer.tsx (Orchestrator)
**Reads:**
- `setDb.getByMatchId()` - load sets
- `rallyDb.getBySetId()` - load rallies for resume (2x)
- `shotDb.getBySetId()` - load shots for resume (2x)

**Writes:**
- `setDb.deleteTaggingData()` - clear data on redo
- `setDb.markTaggingStarted()` - mark set as started (2x)
- `setDb.update()` - mark Phase 1 complete

#### Phase1TimestampComposer.tsx (Timestamp Capture)
**Reads:**
- `rallyDb.getBySetId()` - check existing rallies (2x)
- `setDb.getById()` - load setup data (2x)
- `setDb.getByMatchId()` - check for next set

**Writes:**
- `rallyDb.create()` - create stub rallies (loop), create rallies (per rally)
- `shotDb.create()` - create shots (loop per rally)
- `setDb.update()` - save setup, update progress, mark complete, save winner

#### Phase2DetailComposer.tsx (Shot Detail Tagging)
**Reads:**
- `shotDb.getBySetId()` - load existing shots (3x)
- `shotDb.getById()` - verify save
- `rallyDb.getBySetId()` - **for inference** ← EXTRACTED TO PHASE 3
- `setDb.getById()` - for finalize

**Writes:**
- `shotDb.update()` - update shot details (per shot)
- `setDb.update()` - update progress (3x), mark complete
- **Calls:**
  - `runInferenceForSet()` - **LINES 581-585** ← REMOVE THIS
  - `finalizeMatchAfterPhase2()` - **KEEP** (calculates match-level data)

### What finalizeMatch Does (KEEP THIS)
Located at: `app/src/features/shot-tagging-engine/composers/finalizeMatch.ts`

**Purpose:** Calculate match-level metadata after a set is tagged

**Operations:**
1. Gets all sets for the match
2. Calculates `sets_before` / `sets_after` for each set
3. Updates each set record with set progression data
4. Determines match winner based on sets won
5. Updates match record with final sets count and winner
6. Sets `match_detail_level` to `'shots'`

**Note:** This is **NOT** inference - this is deterministic match-level calculation and should **remain in Phase 2**.

### What runInference Does (EXTRACT TO PHASE 3)
Located at: `app/src/features/shot-tagging-engine/composers/runInference.ts`

**Purpose:** Apply probabilistic inferences to shots after tagging is complete

**Operations:**
- Infers `shot_type` (drive, push, loop, etc.)
- Infers `shot_spin` (topspin, backspin, sidespin)
- Infers `player_position` (forehand side, backhand side, middle)
- Infers `player_distance` (close, mid, far)
- Infers `pressure_level` (low, medium, high)
- Infers `intent_quality` (quality of shot execution)
- Sets special flags: `is_third_ball_attack`, `is_receive_attack`

**Note:** This is **probabilistic analysis** and should be **optional** (Phase 3).

---

## 3. Implementation Plan

### Phase 1: Create Phase3InferenceComposer

**File:** `app/src/features/shot-tagging-engine/composers/Phase3InferenceComposer.tsx` (NEW)

**Location:** `app/src/features/shot-tagging-engine/composers/`

**Purpose:** Standalone composer for running inference engine with user control

**Features:**
- "Run Inference" button to start
- "Skip" button to bypass
- Progress indicator during execution
- Error handling with retry option
- Visual feedback of completion

**Code Template:**
```typescript
/**
 * Phase3InferenceComposer — Optional inference engine execution
 * 
 * Runs probabilistic shot analysis after Phase 2 tagging is complete.
 * User can skip this step and run it later from the data viewer.
 */

import { useState } from 'react'
import { cn } from '@/helpers/utils'
import { Button, Card } from '@/ui-mine'
import { rallyDb, shotDb, setDb } from '@/data'
import { runInferenceForSet } from './runInference'

export interface Phase3InferenceComposerProps {
  setId: string
  matchId: string
  player1Name: string
  player2Name: string
  onComplete?: () => void
  onSkip?: () => void
  className?: string
}

type Status = 'ready' | 'running' | 'complete' | 'error'

export function Phase3InferenceComposer({ 
  setId, 
  matchId,
  player1Name,
  player2Name,
  onComplete, 
  onSkip,
  className 
}: Phase3InferenceComposerProps) {
  const [status, setStatus] = useState<Status>('ready')
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  
  const handleRunInference = async () => {
    setStatus('running')
    setError(null)
    
    try {
      console.log('[Phase3] Starting inference...')
      setProgress('Loading rallies and shots...')
      
      const rallies = await rallyDb.getBySetId(setId)
      const shots = await shotDb.getBySetId(setId)
      
      console.log(`[Phase3] Found ${rallies.length} rallies, ${shots.length} shots`)
      setProgress(`Running inference on ${shots.length} shots...`)
      
      await runInferenceForSet(rallies, shots)
      
      console.log('[Phase3] Inference complete, updating set status...')
      setProgress('Finalizing...')
      
      await setDb.update(setId, {
        inference_complete: true,
        inference_completed_at: new Date().toISOString(),
      })
      
      console.log('[Phase3] ✓ Inference complete')
      setStatus('complete')
      
      // Auto-advance after 1 second
      setTimeout(() => {
        onComplete?.()
      }, 1000)
      
    } catch (err) {
      console.error('[Phase3] ✗ Inference failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }
  
  const handleSkip = () => {
    console.log('[Phase3] User skipped inference')
    onSkip?.()
  }
  
  return (
    <div className={cn('h-dvh flex items-center justify-center bg-bg-surface', className)}>
      <Card className="p-8 max-w-lg text-center">
        {status === 'ready' && (
          <>
            <div className="text-5xl mb-4">🧠</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Run Shot Analysis?</h2>
            <p className="text-neutral-400 mb-6">
              The inference engine will analyze your tagged shots to predict:<br />
              <span className="text-sm text-neutral-500 mt-2 block">
                Shot types • Spin • Player position • Pressure levels • Special patterns
              </span>
            </p>
            <p className="text-sm text-neutral-500 mb-6">
              You can skip this step and run it later from the data viewer.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleSkip}>
                Skip for Now
              </Button>
              <Button variant="primary" onClick={handleRunInference}>
                Run Analysis
              </Button>
            </div>
          </>
        )}
        
        {status === 'running' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
            </div>
            <h2 className="text-2xl font-bold text-neutral-50 mb-2">Analyzing Shots...</h2>
            <p className="text-neutral-400">{progress}</p>
          </>
        )}
        
        {status === 'complete' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Analysis Complete!</h2>
            <p className="text-neutral-400 mb-6">
              Shot predictions and insights are now available.
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-3xl font-bold text-neutral-50 mb-2">Analysis Failed</h2>
            <p className="text-danger mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={handleSkip}>
                Skip
              </Button>
              <Button variant="primary" onClick={handleRunInference}>
                Retry
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
```

---

### Phase 2: Update Phase2DetailComposer.tsx

**File:** `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

**Changes:**

#### Change 1: Remove Inference Import (Line 31)
```typescript
// REMOVE THIS LINE:
import { runInferenceForSet } from './runInference'
```

#### Change 2: Remove Inference Execution (Lines 580-586)
Find this block around line 566-604:

```typescript
// BEFORE:
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
      
      // 2. Run inference on all shots ← REMOVE THIS SECTION
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

**Replace with:**

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
      
      // 2. Finalize match-level data (inference moved to Phase 3)
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

#### Change 3: Remove rallyDb Import (Line 30)
Check if `rallyDb` is still used elsewhere in the file. If not, remove it from the import:

```typescript
// BEFORE:
import { shotDb, setDb, rallyDb } from '@/data'

// AFTER (if rallyDb not used elsewhere):
import { shotDb, setDb } from '@/data'
```

**Note:** Check lines 582-583 - if `rallyDb` is not used elsewhere after removing the inference block, remove it from imports.

---

### Phase 3: Update TaggingUIComposer.tsx

**File:** `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx`

**Changes:**

#### Change 1: Add Phase3 Import (After Line 12)
```typescript
import { Phase2DetailComposer, type DetailedShot } from './Phase2DetailComposer'
// ADD THIS LINE:
import { Phase3InferenceComposer } from './Phase3InferenceComposer'
```

#### Change 2: Update Phase Type (Line 30)
```typescript
// BEFORE:
type Phase = 'setup' | 'phase1' | 'phase2' | 'saving' | 'complete'

// AFTER:
type Phase = 'setup' | 'phase1' | 'phase2' | 'phase3' | 'complete'
```

**Note:** Removed `'saving'` state as it's no longer used (was removed previously).

#### Change 3: Update handleCompletePhase2 (Lines 246-253)
```typescript
// BEFORE:
const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
  console.log('[TaggingUI] Phase 2 complete!')
  console.log('[TaggingUI] All data already saved by Phase1 and Phase2 composers')
  console.log('[TaggingUI] Inference and match finalization already complete')
  
  // Transition to completion screen
  setPhase('complete')
}

// AFTER:
const handleCompletePhase2 = async (detailedShots: DetailedShot[]) => {
  console.log('[TaggingUI] Phase 2 complete!')
  console.log('[TaggingUI] All data already saved by Phase1 and Phase2 composers')
  console.log('[TaggingUI] Match finalization complete (inference moved to Phase 3)')
  
  // Transition to Phase 3 (inference)
  setPhase('phase3')
}
```

#### Change 4: Add Phase3 Handlers (After handleCompletePhase2)
```typescript
const handleCompletePhase3 = () => {
  console.log('[TaggingUI] Phase 3 (inference) complete!')
  setPhase('complete')
}

const handleSkipPhase3 = () => {
  console.log('[TaggingUI] Phase 3 (inference) skipped by user')
  setPhase('complete')
}
```

#### Change 5: Add Phase3 Render Block (After Phase2 render, before Phase1 render)
Insert this block after the `if (phase === 'phase2')` block (around line 335-347):

```typescript
if (phase === 'phase2') {
  return (
    <Phase2DetailComposer
      phase1Rallies={phase1Rallies}
      onComplete={handleCompletePhase2}
      className={className}
      setId={currentSetId}
      player1Id={currentMatch.player1_id}
      player2Id={currentMatch.player2_id}
      resumeFromShotIndex={phase2ResumeIndex}
    />
  )
}

// ADD THIS BLOCK:
if (phase === 'phase3') {
  const player1Name = players.find(p => p.id === currentMatch?.player1_id)?.first_name || 'Player 1'
  const player2Name = players.find(p => p.id === currentMatch?.player2_id)?.first_name || 'Player 2'
  
  return (
    <Phase3InferenceComposer
      setId={currentSetId!}
      matchId={matchId!}
      player1Name={player1Name}
      player2Name={player2Name}
      onComplete={handleCompletePhase3}
      onSkip={handleSkipPhase3}
      className={className}
    />
  )
}

// Build player context for Phase1...
```

---

### Phase 4: Update composers/index.ts

**File:** `app/src/features/shot-tagging-engine/composers/index.ts`

**Change:** Add Phase3InferenceComposer export

```typescript
// BEFORE:
export { TaggingUIComposer } from './TaggingUIComposer'
export { Phase1TimestampComposer } from './Phase1TimestampComposer'
export { Phase2DetailComposer } from './Phase2DetailComposer'
export type { Phase1Rally, Phase1Shot } from './Phase1TimestampComposer'
export type { DetailedShot } from './Phase2DetailComposer'
export { finalizeMatchAfterPhase2 } from './finalizeMatch'
export { runInferenceForSet, runInferenceForRally } from './runInference'

// AFTER:
export { TaggingUIComposer } from './TaggingUIComposer'
export { Phase1TimestampComposer } from './Phase1TimestampComposer'
export { Phase2DetailComposer } from './Phase2DetailComposer'
export { Phase3InferenceComposer } from './Phase3InferenceComposer' // ADD THIS
export type { Phase1Rally, Phase1Shot } from './Phase1TimestampComposer'
export type { DetailedShot } from './Phase2DetailComposer'
export { finalizeMatchAfterPhase2 } from './finalizeMatch'
export { runInferenceForSet, runInferenceForRally } from './runInference'
```

---

### Phase 5: Update Data Schema (Optional - for tracking)

**File:** `app/src/data/entities/sets/set.types.ts`

**Change:** Add inference tracking fields (if not already present)

Check if these fields exist in the `DBSet` type. If not, add them:

```typescript
export interface DBSet {
  // ... existing fields ...
  
  // Phase 3 (Inference) tracking
  inference_complete?: boolean | null
  inference_completed_at?: string | null  // ISO timestamp
}
```

**Note:** Check the actual schema file before making changes. These fields may already exist or may need to be added to the database schema as well.

---

## 4. Testing Plan

### Test Case 1: Fresh Tagging (Happy Path)
1. Start fresh tagging session for a set
2. Complete Phase 1 (timestamp capture)
3. Complete Phase 2 (shot detail tagging)
4. **Verify:** Phase 3 screen appears with "Run Analysis?" prompt
5. Click "Run Analysis"
6. **Verify:** Progress indicator shows
7. **Verify:** Completion screen appears after inference
8. **Verify:** Database has `inference_complete: true`

### Test Case 2: Skip Inference
1. Complete Phase 1 and Phase 2
2. **Verify:** Phase 3 screen appears
3. Click "Skip for Now"
4. **Verify:** Goes directly to completion screen
5. **Verify:** Database has `inference_complete: null` or `false`

### Test Case 3: Inference Error Handling
1. Complete Phase 1 and Phase 2
2. Trigger an error (e.g., disconnect database)
3. Click "Run Analysis"
4. **Verify:** Error screen appears
5. **Verify:** "Retry" button works
6. **Verify:** "Skip" button works

### Test Case 4: Resume Session (No Phase3 Yet)
1. Start tagging, complete Phase 1
2. Close browser
3. Reopen and resume
4. Complete Phase 2
5. **Verify:** Phase 3 appears normally

### Test Case 5: Console Logs
Check console during Phase 2 → Phase 3 transition:
- `[Phase2] ✓ Match finalized` (should appear)
- `[Phase2] Running inference...` (should NOT appear)
- `[TaggingUI] Phase 3 (inference) complete!` (when run)
- `[TaggingUI] Phase 3 (inference) skipped by user` (when skipped)

---

## 5. File Checklist

- [ ] **CREATE:** `app/src/features/shot-tagging-engine/composers/Phase3InferenceComposer.tsx`
- [ ] **UPDATE:** `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
  - [ ] Remove `runInferenceForSet` import
  - [ ] Remove inference execution (lines 580-586)
  - [ ] Remove `rallyDb` import (if not used elsewhere)
- [ ] **UPDATE:** `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx`
  - [ ] Add Phase3InferenceComposer import
  - [ ] Update Phase type
  - [ ] Update handleCompletePhase2
  - [ ] Add handleCompletePhase3 and handleSkipPhase3
  - [ ] Add Phase3 render block
- [ ] **UPDATE:** `app/src/features/shot-tagging-engine/composers/index.ts`
  - [ ] Export Phase3InferenceComposer
- [ ] **UPDATE (Optional):** `app/src/data/entities/sets/set.types.ts`
  - [ ] Add `inference_complete` and `inference_completed_at` fields

---

## 6. Post-Implementation Tasks

### Documentation Update
After implementation is complete and tested, update:

**File:** `docs-match-analyser-edge-tt/specs/specAddendumMVP.md`

Add entry at the top:

```markdown
### 2025-12-09: Extract Inference to Phase 3 (v0.X.X)

**Change Type:** Architecture - Flow Enhancement

**What Changed:**
- Extracted inference engine from Phase 2 to new Phase 3 composer
- Phase 2 now completes immediately after shot tagging
- Phase 3 offers "Run Analysis" or "Skip" options
- Inference is now optional and can be run later

**Files Modified:**
- Created: `Phase3InferenceComposer.tsx`
- Modified: `Phase2DetailComposer.tsx`, `TaggingUIComposer.tsx`, `index.ts`

**Rationale:**
- Faster Phase 2 completion for users who want raw data
- Clearer separation between tagging (Phase 2) and analysis (Phase 3)
- Allows re-running inference if rules are updated
- Better user control over workflow

**Migration Notes:**
- Existing sessions will complete Phase 2 normally
- Next session will show Phase 3 screen
- No data migration required

**User Impact:**
- Positive: Faster tagging completion, more control
- New screen: Phase 3 choice modal after Phase 2
```

---

## 7. Future Enhancements (Optional)

### Enhancement 1: Run Inference from Data Viewer
Add a "Run Inference" button in the data viewer for sets where `inference_complete` is `false` or `null`.

**Location:** `app/src/features/data-viewer/` (wherever set details are shown)

**Code Snippet:**
```typescript
const handleRunInferenceFromViewer = async () => {
  const { runInferenceForSet } = await import('@/features/shot-tagging-engine/composers/runInference')
  const rallies = await rallyDb.getBySetId(setId)
  const shots = await shotDb.getBySetId(setId)
  await runInferenceForSet(rallies, shots)
  await setDb.update(setId, { inference_complete: true })
  // Refresh data viewer
}
```

### Enhancement 2: Inference Status Badge
Show inference status in set list:
- ✅ "Analyzed" (green badge) if `inference_complete === true`
- ⏭️ "Skipped" (gray badge) if `inference_complete === false`
- ⏸️ "Pending" (orange badge) if `inference_complete === null`

---

## 8. Critical Notes for Implementation

### DO NOT:
1. ❌ **DO NOT** remove `finalizeMatchAfterPhase2()` from Phase2 - this is match-level calculation, NOT inference
2. ❌ **DO NOT** change Phase 1 - it is unaffected by this change
3. ❌ **DO NOT** modify `runInference.ts` - it remains unchanged
4. ❌ **DO NOT** modify `finalizeMatch.ts` - it remains unchanged

### DO:
1. ✅ **DO** keep all existing Phase 2 functionality except inference call
2. ✅ **DO** test resume functionality after changes
3. ✅ **DO** verify console logs show correct flow
4. ✅ **DO** check that shot data is still saved correctly in Phase 2
5. ✅ **DO** ensure match winner calculation still works (it's in finalizeMatch, not inference)

---

## 9. Rollback Plan

If issues arise after implementation:

1. Restore `Phase2DetailComposer.tsx` from git history
2. Restore `TaggingUIComposer.tsx` from git history
3. Delete `Phase3InferenceComposer.tsx`
4. Restore `index.ts` export list

**Git commands:**
```bash
git checkout HEAD -- app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx
git checkout HEAD -- app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx
git rm app/src/features/shot-tagging-engine/composers/Phase3InferenceComposer.tsx
```

---

## 10. Summary

**Goal:** Extract inference from Phase 2 into optional Phase 3

**Impact:**
- ✅ Faster Phase 2 completion
- ✅ User choice: run or skip inference
- ✅ Clearer separation of concerns
- ✅ Ability to re-run inference later

**Risk:** Low - Changes are isolated to composer layer, no database schema changes required

**Estimated Implementation Time:** 30-45 minutes

**Testing Time:** 15-20 minutes

---

**Ready for Implementation** ✅

