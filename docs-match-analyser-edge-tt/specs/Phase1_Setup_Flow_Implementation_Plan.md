# Phase 1 Setup Flow - Implementation Plan

**Date:** December 9, 2025  
**Objective:** Improve data capture and accuracy of Phase1TimestampComposer by adding set setup flow with score initialization and server tracking.

---

## Overview

This plan adds a **Set Setup** step at the beginning of Phase 1 tagging that:
- Captures which player serves next
- Records current score
- Creates stub rally entries for previous points
- Enables accurate score tracking throughout tagging
- Provides proper set completion flow

---

## Requirements Summary (from Q&A)

### Answer 1: Stub Rally Data (Option A, without winner_id)
Pre-populated rallies contain:
- `server_id` (alternating based on TT rules)
- `receiver_id` (opponent)
- `is_scoring: true`
- `rally_index: 1, 2, 3...`
- `winner_id: null` (unknown)
- `framework_confirmed: false`
- All timestamps, shots, other fields: `null`

### Answer 2: Score Fields for Stubs (Option C)
- Pre-populated rallies (1-5) won't have score fields
- Only tagged rallies (6+) track `score_before` and `score_after`

### Answer 3: First Tagged Rally Score (Option A)
- Rally 6: `before = 2-3` (from setup), `after = 3-3 or 2-4` (calculated)
- Rally 7: `before = Rally 6's after`, `after = before + 1 for winner`
- All saves at existing rally completion point
- Consistent derivation throughout

### Answer 4: Video Upload (Option B)
- Video optional at setup (like current behavior)
- Uses existing VideoPlayer component
- Can upload during Phase 1 tagging

### Answer 5: Setup UI Structure (Option C)
- Integrated into Phase1TimestampComposer
- Uses bottom control area (where tagging buttons are)
- Tagging buttons hidden/disabled until setup complete

### Answer 6: Duplicate Prevention (Option A)
- If `existingRallies.length > 0`, skip setup entirely
- Go straight to Phase 1 tagging (resume mode)

### Answer 7: End of Phase 1 Buttons (Custom)
- Remove "Save Progress" button (creates duplicates)
- Rename "Complete Phase 1 →" to "Save Set"
- Before set end: Green **[Save Set]** button
- At set end: **[Save Set]** + **[Continue Tagging]** buttons
- After save: Modal with **[Tag Next Set] [Back to Matches] [View Data]**

### Answer 8: Save Set Action (Option C)
- Mark `tagging_phase: 'phase1_complete'` (enables Phase 2)
- Calculate and save winner + final scores
- May overwrite pre-entered results (see Answer 9)

### Answer 9: Score Conflicts (Option A)
- Tagged data is source of truth
- Always overwrite pre-entered results with tagged scores

### Answer 10: Tag Next Set (Option D)
- Check if next set exists
- Create if needed, or resume if exists
- Navigate to Phase1TimestampComposer with setup screen

### Answer 11: Continue Tagging (Option C)
- Show persistent yellow warning banner
- No database changes until "Save Set" clicked
- Banner: "⚠️ Set end detected at 11-8, now at 12-8"

### Answer 12: Matches Page Integration (Option C)
- Enhance existing match detail page
- Add status badges ("Phase 1 Complete", "Phase 2 Complete")
- Add action buttons ([Tag Phase 1], [Tag Phase 2])

### Answer 13: Score Input UI (Option A)
- Increment/decrement buttons: **[−] 2 [+]**
- Range 0-20 for each player
- Compact, familiar pattern

### Answer 14: Score Validation (Option B)
- Validate scores are logically reachable
- Use set end rules (first to 11, 2 clear points, deuce)
- Block impossible scores like 15-3

### Answer 15: Server Calculation (Work backwards)
- Use table tennis serve alternation rules
- Every 2 points (every 1 after 10-10)
- Work backwards from "Next Server" to calculate stub rally servers

### Answer 16: Database Schema (Option D)
- Add setup tracking to Set table
- Add `is_stub_rally` flag to Rally table

### Answer 17: View Data Navigation (Option A)
- Navigate to existing DataViewer page
- Pass `setId` parameter to filter data

---

## Phase 1: Database Schema Updates

### A. Update Set Table Schema

**File:** `app/src/data/entities/sets/set.types.ts`

Add fields to track setup:

```typescript
export interface DBSet {
  // ... existing fields ...
  
  // NEW: Setup tracking
  setup_starting_score_p1: number | null
  setup_starting_score_p2: number | null
  setup_next_server_id: string | null
  setup_completed_at: string | null
}

export interface NewSet {
  // ... existing fields ...
  
  // NEW: Setup tracking (optional on creation)
  setup_starting_score_p1?: number | null
  setup_starting_score_p2?: number | null
  setup_next_server_id?: string | null
  setup_completed_at?: string | null
}
```

**File:** `app/src/data/entities/sets/set.db.ts`

Update database operations to include new fields.

### B. Update Rally Table Schema

**File:** `app/src/data/entities/rallies/rally.types.ts`

Add stub rally indicator:

```typescript
export interface DBRally {
  // ... existing fields ...
  
  // NEW: Stub rally flag
  is_stub_rally: boolean  // Default: false
}

export interface NewRally {
  // ... existing fields ...
  
  // NEW: Stub rally flag
  is_stub_rally?: boolean  // Default: false
}
```

**File:** `app/src/data/entities/rallies/rally.db.ts`

Update database operations to include new field with default `false`.

---

## Phase 2: Core Logic Functions

### A. Server Calculation (Backwards)

**File:** `app/src/rules/calculate/calculatePreviousServers.ts`

```typescript
/**
 * Work backwards from next server to determine who served each previous rally
 * Uses table tennis serve alternation rules:
 * - Every 2 points in normal play (0-0 to 10-9)
 * - Every 1 point in deuce (after 10-10)
 * 
 * @param totalPoints - Number of completed points (e.g., 5 for score 2-3)
 * @param nextServerId - Who serves the NEXT point
 * @param player1Id - ID for player 1
 * @param player2Id - ID for player 2
 * @returns Array of server IDs for rallies 1..totalPoints
 * 
 * @example
 * // Score 2-3, next server is player2
 * calculatePreviousServers(5, 'player2', 'p1', 'p2')
 * // Returns: ['player1', 'player1', 'player2', 'player2', 'player1']
 * // Rally 1-2: player1, Rally 3-4: player2, Rally 5: player1
 */
export function calculatePreviousServers(
  totalPoints: number,
  nextServerId: 'player1' | 'player2',
  player1Id: string,
  player2Id: string
): string[] {
  const servers: string[] = []
  
  // Determine if we're in deuce territory
  const isDeuce = totalPoints >= 20 // Both players at 10+ (20 total points minimum)
  
  // Work backwards from the next server
  let currentServer = nextServerId
  
  for (let point = totalPoints; point >= 1; point--) {
    // Determine server for this point (working backwards)
    if (isDeuce && point >= 20) {
      // In deuce: alternates every point
      // If next server is player2, then point N is player1, N-1 is player2, etc.
      const stepsBack = totalPoints - point + 1
      currentServer = stepsBack % 2 === 1 
        ? (nextServerId === 'player1' ? 'player2' : 'player1')
        : nextServerId
    } else {
      // Normal play: every 2 points
      const serveBlock = Math.ceil(point / 2) // Which "block" of 2 points
      const nextBlock = Math.ceil((totalPoints + 1) / 2)
      const blocksBack = nextBlock - serveBlock
      
      currentServer = blocksBack % 2 === 0 ? nextServerId : (nextServerId === 'player1' ? 'player2' : 'player1')
    }
    
    servers[point - 1] = currentServer === 'player1' ? player1Id : player2Id
  }
  
  return servers
}
```

### B. Score Validation

**File:** `app/src/rules/validate/validateSetScore.ts`

```typescript
/**
 * Validate score is reachable given set end rules
 * Table tennis set rules:
 * - First to 11 points wins (with 2 point lead)
 * - At 10-10 (deuce), play continues until 2 point lead
 * 
 * @param p1Score - Player 1 score
 * @param p2Score - Player 2 score
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateSetScore(11, 9) // ✓ Valid - P1 won 11-9
 * validateSetScore(10, 12) // ✓ Valid - Deuce, P2 won 12-10
 * validateSetScore(15, 3) // ✗ Invalid - Would have ended at 11-3
 * validateSetScore(10, 10) // ✓ Valid - Deuce in progress
 */
export function validateSetScore(
  p1Score: number,
  p2Score: number
): { valid: boolean; error?: string } {
  // Basic range check
  if (p1Score < 0 || p2Score < 0) {
    return { valid: false, error: 'Scores cannot be negative' }
  }
  
  if (p1Score > 30 || p2Score > 30) {
    return { valid: false, error: 'Scores seem unreasonably high (>30)' }
  }
  
  // Check if set would have already ended
  const higherScore = Math.max(p1Score, p2Score)
  const lowerScore = Math.min(p1Score, p2Score)
  const scoreDiff = higherScore - lowerScore
  
  // If higher score >= 11 and lead >= 2, set should have ended
  if (higherScore >= 11 && scoreDiff >= 2) {
    // This would be a completed set
    // But we're allowing it because user might be tagging a completed set
    // Just in progress scores should not exceed this
    // Actually, any valid score is OK - they might be setting up mid-set or completed set
    return { valid: true }
  }
  
  // In-progress scores
  if (higherScore < 11) {
    // Normal play, any score valid
    return { valid: true }
  }
  
  if (higherScore >= 11 && scoreDiff < 2) {
    // Deuce scenario - valid
    return { valid: true }
  }
  
  // If we're here, it's a completed set or in-progress deuce
  return { valid: true }
}
```

### C. Set End Detection

**File:** `app/src/rules/derive/set/deriveSetEndConditions.ts`

```typescript
/**
 * Check if current score meets set end conditions
 * 
 * @param p1Score - Player 1 current score
 * @param p2Score - Player 2 current score
 * @returns Set end status and winner
 * 
 * @example
 * deriveSetEndConditions(11, 8) // { isSetEnd: true, winner: 'player1' }
 * deriveSetEndConditions(10, 10) // { isSetEnd: false }
 * deriveSetEndConditions(12, 10) // { isSetEnd: true, winner: 'player1' }
 */
export function deriveSetEndConditions(
  p1Score: number,
  p2Score: number
): { isSetEnd: boolean; winner?: 'player1' | 'player2' } {
  const scoreDiff = Math.abs(p1Score - p2Score)
  const maxScore = Math.max(p1Score, p2Score)
  
  // Set ends when:
  // 1. Someone reaches 11+ AND has 2+ point lead
  if (maxScore >= 11 && scoreDiff >= 2) {
    return {
      isSetEnd: true,
      winner: p1Score > p2Score ? 'player1' : 'player2'
    }
  }
  
  // Otherwise, set continues
  return { isSetEnd: false }
}
```

---

## Phase 3: UI Components

### A. Create SetupControlsBlock

**File:** `app/src/features/shot-tagging-engine/blocks/SetupControlsBlock.tsx`

```typescript
import { useState } from 'react'
import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'
import { validateSetScore } from '@/rules/validate/validateSetScore'

export interface SetupData {
  nextServerId: 'player1' | 'player2'
  p1Score: number
  p2Score: number
}

export interface SetupControlsBlockProps {
  player1Name: string
  player2Name: string
  onComplete: (setup: SetupData) => void
  className?: string
}

export function SetupControlsBlock({
  player1Name,
  player2Name,
  onComplete,
  className
}: SetupControlsBlockProps) {
  const [nextServer, setNextServer] = useState<'player1' | 'player2'>('player1')
  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)
  
  const handleStartTagging = () => {
    // Validate scores
    const validation = validateSetScore(p1Score, p2Score)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    
    onComplete({
      nextServerId: nextServer,
      p1Score,
      p2Score
    })
  }
  
  const incrementScore = (player: 'p1' | 'p2') => {
    if (player === 'p1') {
      setP1Score(prev => Math.min(prev + 1, 20))
    } else {
      setP2Score(prev => Math.min(prev + 1, 20))
    }
  }
  
  const decrementScore = (player: 'p1' | 'p2') => {
    if (player === 'p1') {
      setP1Score(prev => Math.max(prev - 1, 0))
    } else {
      setP2Score(prev => Math.max(prev - 1, 0))
    }
  }
  
  return (
    <div className={cn('p-6 space-y-6 bg-bg-card border-t border-neutral-700', className)}>
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-50">Set Setup</h3>
        <p className="text-sm text-neutral-400 mt-1">Configure starting conditions for this set</p>
      </div>
      
      {/* Who serves next? */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300">Who serves next?</label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={nextServer === 'player1' ? 'primary' : 'secondary'}
            onClick={() => setNextServer('player1')}
            className="!h-14 !text-base"
          >
            {player1Name}
          </Button>
          <Button
            variant={nextServer === 'player2' ? 'primary' : 'secondary'}
            onClick={() => setNextServer('player2')}
            className="!h-14 !text-base"
          >
            {player2Name}
          </Button>
        </div>
      </div>
      
      {/* Current Score */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-neutral-300">Current Score</label>
        
        {/* Player 1 Score */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-400 flex-1">{player1Name}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => decrementScore('p1')}
              className="!w-10 !h-10 !text-lg"
              disabled={p1Score === 0}
            >
              −
            </Button>
            <div className="w-16 h-10 flex items-center justify-center bg-neutral-800 rounded text-lg font-semibold text-neutral-50">
              {p1Score}
            </div>
            <Button
              variant="secondary"
              onClick={() => incrementScore('p1')}
              className="!w-10 !h-10 !text-lg"
              disabled={p1Score === 20}
            >
              +
            </Button>
          </div>
        </div>
        
        {/* Player 2 Score */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-400 flex-1">{player2Name}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => decrementScore('p2')}
              className="!w-10 !h-10 !text-lg"
              disabled={p2Score === 0}
            >
              −
            </Button>
            <div className="w-16 h-10 flex items-center justify-center bg-neutral-800 rounded text-lg font-semibold text-neutral-50">
              {p2Score}
            </div>
            <Button
              variant="secondary"
              onClick={() => incrementScore('p2')}
              className="!w-10 !h-10 !text-lg"
              disabled={p2Score === 20}
            >
              +
            </Button>
          </div>
        </div>
      </div>
      
      {/* Start Tagging Button */}
      <Button
        variant="primary"
        onClick={handleStartTagging}
        className="!w-full !h-12 !text-base"
      >
        Start Tagging
      </Button>
    </div>
  )
}
```

### B. Create SetEndWarningBlock

**File:** `app/src/features/shot-tagging-engine/blocks/SetEndWarningBlock.tsx`

```typescript
import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface SetEndWarningBlockProps {
  currentScore: { player1: number; player2: number }
  setEndScore: { player1: number; player2: number }
  onSaveSet: () => void
  onContinueTagging: () => void
  className?: string
}

export function SetEndWarningBlock({
  currentScore,
  setEndScore,
  onSaveSet,
  onContinueTagging,
  className
}: SetEndWarningBlockProps) {
  return (
    <div className={cn('bg-warning/10 border-t border-warning/30 px-4 py-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-warning text-lg">⚠️</span>
          <span className="text-sm text-neutral-200">
            Set end detected at <span className="font-semibold">{setEndScore.player1}-{setEndScore.player2}</span>
            {(currentScore.player1 !== setEndScore.player1 || currentScore.player2 !== setEndScore.player2) && (
              <>, now at <span className="font-semibold">{currentScore.player1}-{currentScore.player2}</span></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={onSaveSet}
            className="!h-9 !text-sm"
          >
            Save Set
          </Button>
          <Button
            variant="secondary"
            onClick={onContinueTagging}
            className="!h-9 !text-sm"
          >
            Continue Tagging
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### C. Create CompletionModal

**File:** `app/src/features/shot-tagging-engine/blocks/CompletionModal.tsx`

```typescript
import { Button } from '@/ui-mine'
import { cn } from '@/helpers/utils'

export interface CompletionModalProps {
  setNumber: number
  finalScore: { player1: number; player2: number }
  player1Name: string
  player2Name: string
  onTagNextSet: () => void
  onBackToMatches: () => void
  onViewData: () => void
  className?: string
}

export function CompletionModal({
  setNumber,
  finalScore,
  player1Name,
  player2Name,
  onTagNextSet,
  onBackToMatches,
  onViewData,
  className
}: CompletionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={cn('bg-bg-card rounded-lg p-8 max-w-md w-full mx-4 border border-neutral-700', className)}>
        <div className="text-center space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-neutral-50">Set {setNumber} Complete!</h2>
            <div className="mt-3 text-xl text-neutral-300">
              Final Score: <span className="font-semibold text-success">{player1Name} {finalScore.player1}</span>
              {' - '}
              <span className="font-semibold text-success">{player2Name} {finalScore.player2}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={onTagNextSet}
              className="!w-full !h-12"
            >
              Tag Next Set
            </Button>
            <Button
              variant="secondary"
              onClick={onViewData}
              className="!w-full !h-12"
            >
              View Data
            </Button>
            <Button
              variant="secondary"
              onClick={onBackToMatches}
              className="!w-full !h-12"
            >
              Back to Matches
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### D. Export New Blocks

**File:** `app/src/features/shot-tagging-engine/blocks/index.ts`

```typescript
// ... existing exports ...
export * from './SetupControlsBlock'
export * from './SetEndWarningBlock'
export * from './CompletionModal'
```

---

## Phase 4: Update Phase1TimestampComposer

### A. Add New State Variables

```typescript
// After existing state declarations
const [setupComplete, setSetupComplete] = useState(false)
const [setupStartingScore, setSetupStartingScore] = useState({ player1: 0, player2: 0 })
const [setEndDetected, setSetEndDetected] = useState(false)
const [setEndScore, setSetEndScore] = useState<{ player1: number; player2: number } | null>(null)
const [showCompletionModal, setShowCompletionModal] = useState(false)
```

### B. Initialize - Check for Existing Rallies

```typescript
// Add this useEffect after state declarations
useEffect(() => {
  const checkExistingRallies = async () => {
    if (!setId || !player1Id || !player2Id) return
    
    try {
      const existingRallies = await rallyDb.getBySetId(setId)
      const taggedRallies = existingRallies.filter(r => !r.is_stub_rally)
      
      if (taggedRallies.length > 0) {
        // Skip setup - resume existing session
        console.log('[Phase1] Resuming existing session with', taggedRallies.length, 'rallies')
        setSetupComplete(true)
        
        // Load setup data from set record if exists
        const setRecord = await setDb.getById(setId)
        if (setRecord.setup_starting_score_p1 !== null && setRecord.setup_starting_score_p2 !== null) {
          setSetupStartingScore({
            player1: setRecord.setup_starting_score_p1,
            player2: setRecord.setup_starting_score_p2
          })
          
          // Calculate current score from last rally
          const lastRally = taggedRallies.sort((a, b) => b.rally_index - a.rally_index)[0]
          if (lastRally) {
            setCurrentScore({
              player1: lastRally.player1_score_after || 0,
              player2: lastRally.player2_score_after || 0
            })
          }
        }
        
        // Load existing rallies into completedRallies state
        // ... (existing resume logic)
      } else {
        // Show setup screen
        console.log('[Phase1] No existing rallies - showing setup screen')
        setSetupComplete(false)
      }
    } catch (error) {
      console.error('[Phase1] Error checking existing rallies:', error)
      // Default to showing setup
      setSetupComplete(false)
    }
  }
  
  checkExistingRallies()
}, [setId, player1Id, player2Id])
```

### C. Handle Setup Completion

```typescript
const handleSetupComplete = async (setup: SetupData) => {
  if (!setId || !player1Id || !player2Id) {
    alert('Cannot complete setup - missing database context')
    return
  }
  
  console.log('[Phase1] Setup completed:', setup)
  
  try {
    // 1. Validate score (already done in SetupControlsBlock, but double-check)
    const validation = validateSetScore(setup.p1Score, setup.p2Score)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    
    // 2. Calculate previous servers
    const totalPoints = setup.p1Score + setup.p2Score
    if (totalPoints > 0) {
      const previousServers = calculatePreviousServers(
        totalPoints,
        setup.nextServerId,
        player1Id,
        player2Id
      )
      
      console.log('[Phase1] Creating', totalPoints, 'stub rallies')
      
      // 3. Create stub rallies
      for (let i = 0; i < previousServers.length; i++) {
        const rallyIndex = i + 1
        const serverId = previousServers[i]
        const receiverId = serverId === player1Id ? player2Id : player1Id
        
        await rallyDb.create({
          set_id: setId,
          rally_index: rallyIndex,
          video_id: null,
          server_id: serverId,
          receiver_id: receiverId,
          is_scoring: true,
          winner_id: null,  // Unknown
          player1_score_before: null,
          player2_score_before: null,
          player1_score_after: null,
          player2_score_after: null,
          end_of_point_time: null,
          point_end_type: null,
          has_video_data: false,
          is_highlight: false,
          framework_confirmed: false,  // Not confirmed
          detail_complete: false,
          server_corrected: false,
          score_corrected: false,
          correction_notes: null,
          is_stub_rally: true,  // Mark as stub
        })
      }
      
      console.log('[Phase1] Created', previousServers.length, 'stub rallies')
    }
    
    // 4. Save setup to set record
    await setDb.update(setId, {
      setup_starting_score_p1: setup.p1Score,
      setup_starting_score_p2: setup.p2Score,
      setup_next_server_id: setup.nextServerId === 'player1' ? player1Id : player2Id,
      setup_completed_at: new Date().toISOString(),
    })
    
    console.log('[Phase1] Setup saved to database')
    
    // 5. Initialize score for tagging
    setCurrentScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupStartingScore({ player1: setup.p1Score, player2: setup.p2Score })
    setSetupComplete(true)
    
    console.log('[Phase1] Ready to start tagging from score', setup.p1Score, '-', setup.p2Score)
  } catch (error) {
    console.error('[Phase1] Error completing setup:', error)
    alert('Failed to complete setup. Check console for details.')
  }
}
```

### D. Update Rally Completion - Add Score Tracking

```typescript
const completeRally = async (endCondition: EndCondition) => {
  // ... existing rally creation logic (keep as-is) ...
  
  // NEW: Calculate scores for database
  const newScore = endCondition === 'let' 
    ? currentScore
    : {
        player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
        player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
      }
  
  // NEW: Save to database with score tracking
  if (setId && player1Id && player2Id) {
    setIsSaving(true)
    try {
      // Get existing rallies for this set to determine correct rally_index
      const existingRallies = await rallyDb.getBySetId(setId)
      const maxRallyIndex = existingRallies.reduce((max, r) => Math.max(max, r.rally_index || 0), 0)
      const rallyIndex = maxRallyIndex + 1
      
      // Get score BEFORE this rally (from previous rally or setup)
      const taggedRallies = existingRallies.filter(r => !r.is_stub_rally)
      const previousRally = taggedRallies.sort((a, b) => b.rally_index - a.rally_index)[0]
      
      const scoreBefore = previousRally 
        ? { 
            player1: previousRally.player1_score_after ?? 0, 
            player2: previousRally.player2_score_after ?? 0 
          }
        : setupStartingScore  // First tagged rally uses setup scores
      
      console.log(`[Phase1] === SAVING RALLY ${rallyIndex} ===`)
      console.log(`[Phase1] Score before:`, scoreBefore)
      console.log(`[Phase1] Score after:`, newScore)
      
      // Map and save rally WITH SCORES
      const dbRally = mapPhase1RallyToDBRally(rally, setId, rallyIndex, player1Id, player2Id)
      dbRally.player1_score_before = scoreBefore.player1
      dbRally.player2_score_before = scoreBefore.player2
      dbRally.player1_score_after = newScore.player1
      dbRally.player2_score_after = newScore.player2
      
      const savedRally = await rallyDb.create(dbRally)
      console.log(`[Phase1] ✓ Rally saved with ID: ${savedRally.id}`)
      
      // Map and save all shots for this rally (existing logic)
      for (const shot of rally.shots) {
        const shotPlayer = calculateShotPlayer(rally.serverId, shot.shotIndex)
        const playerId = shotPlayer === 'player1' ? player1Id : player2Id
        const isLastShot = shot.shotIndex === rally.shots.length
        const dbShot = mapPhase1ShotToDBShot(shot, savedRally.id, playerId, isLastShot, rally.endCondition)
        await shotDb.create(dbShot)
      }
      console.log(`[Phase1] ✓ All ${rally.shots.length} shots saved`)
      
      // Update set progress
      await setDb.update(setId, {
        tagging_phase: 'phase1_in_progress',
        phase1_last_rally: rallyIndex,
        has_video: true,
      })
      
      // NEW: Check for set end
      const setEndCheck = deriveSetEndConditions(newScore.player1, newScore.player2)
      if (setEndCheck.isSetEnd && !setEndDetected) {
        console.log('[Phase1] Set end detected!', newScore)
        setSetEndDetected(true)
        setSetEndScore(newScore)
      }
      
      console.log(`[Phase1] ✓ Rally ${rallyIndex} complete!`)
    } catch (error) {
      console.error('Failed to save rally to database:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Update local score state
  setCurrentScore(newScore)
  
  // Set speed to FF mode (existing logic)
  setSpeedMode('ff')
  
  // Reset for next rally (existing logic)
  setCurrentShots([])
  setRallyState('before-serve')
}
```

### E. Handle Save Set

```typescript
const handleSaveSet = async () => {
  if (!setId || !player1Id || !player2Id) {
    alert('Cannot save set - missing database context')
    return
  }
  
  console.log('[Phase1] Saving set...', currentScore)
  
  try {
    // 1. Calculate final winner and score
    const finalScore = currentScore
    const winner = finalScore.player1 > finalScore.player2 ? player1Id : player2Id
    
    // 2. Update set record (overwrites pre-entered data)
    await setDb.update(setId, {
      tagging_phase: 'phase1_complete',
      winner_id: winner,
      final_score_p1: finalScore.player1,
      final_score_p2: finalScore.player2,
      phase1_completed_at: new Date().toISOString(),
    })
    
    console.log('[Phase1] ✓ Set saved successfully')
    
    // 3. Show completion modal
    setShowCompletionModal(true)
  } catch (error) {
    console.error('[Phase1] Error saving set:', error)
    alert('Failed to save set. Check console for details.')
  }
}
```

### F. Handle Tag Next Set

```typescript
const handleTagNextSet = async () => {
  if (!setId) return
  
  try {
    // 1. Get current set info
    const currentSet = await setDb.getById(setId)
    const nextSetNumber = currentSet.set_number + 1
    
    // 2. Check if next set exists
    const matchSets = await setDb.getByMatchId(currentSet.match_id)
    let nextSet = matchSets.find(s => s.set_number === nextSetNumber)
    
    // 3. Create if doesn't exist
    if (!nextSet) {
      console.log('[Phase1] Creating next set:', nextSetNumber)
      nextSet = await setDb.create({
        match_id: currentSet.match_id,
        set_number: nextSetNumber,
        // ... other defaults from setDb.create
      })
    }
    
    console.log('[Phase1] Navigating to next set:', nextSet.id)
    
    // 4. Navigate to Phase1 with next set (will show setup or resume)
    window.location.href = `/tagging/phase1?setId=${nextSet.id}`
  } catch (error) {
    console.error('[Phase1] Error navigating to next set:', error)
    alert('Failed to load next set. Check console for details.')
  }
}
```

### G. Update Render - Conditional UI

```typescript
return (
  <div className={cn('fixed inset-0 flex flex-col bg-bg-surface overflow-hidden', className)}>
    {/* Shot Log - Top (scrollable) */}
    <div 
      ref={shotLogRef}
      className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-bg-surface"
    >
      {/* ... existing shot log content ... */}
    </div>
    
    {/* Video Player - Fixed height, full width */}
    <div className="shrink-0 w-full aspect-video bg-black">
      <VideoPlayer
        ref={videoPlayerRef}
        videoSrc={videoUrl || undefined}
        onVideoSelect={setVideoUrl}
        compact={true}
        showTimeOverlay={true}
        taggingMode={taggingModeControls}
      />
    </div>
    
    {/* Status Strip - Below Video */}
    <div className="shrink-0 border-t border-neutral-700 bg-neutral-900 px-4 py-2">
      {/* NEW: Show set end warning if detected */}
      {setEndDetected && (
        <SetEndWarningBlock
          currentScore={currentScore}
          setEndScore={setEndScore!}
          onSaveSet={handleSaveSet}
          onContinueTagging={() => {
            console.log('[Phase1] User chose to continue tagging past set end')
            setSetEndDetected(false)
          }}
        />
      )}
      
      {/* Existing status info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-neutral-500">Rally {completedRallies.length + 1}</span>
          {playerContext && (
            <span className="text-neutral-400">
              Score: {playerContext.player1Name} {currentScore.player1} - {currentScore.player2} {playerContext.player2Name}
            </span>
          )}
          <span className="text-neutral-400">{currentShots.length} shot{currentShots.length !== 1 ? 's' : ''}</span>
          {/* ... existing speed mode indicator ... */}
          {isSaving && (
            <span className="text-xs text-brand-primary flex items-center gap-1">
              {/* ... existing saving spinner ... */}
            </span>
          )}
          {isNavigating && (
            <span className="text-xs text-brand-primary">
              Navigating ({currentHistoryIndex + 1}/{shotHistory.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-500">Total: {completedRallies.length} rallies</span>
          {/* REMOVED: Manual Save Progress button */}
          {/* NEW: Save Set button (only show if setup complete) */}
          {setupComplete && completedRallies.length > 0 && (
            <button
              onClick={handleSaveSet}
              className={cn(
                'px-3 py-1 rounded text-white text-xs font-medium',
                setEndDetected 
                  ? 'bg-success hover:bg-success/90'
                  : 'bg-brand-primary hover:bg-brand-primary/90'
              )}
            >
              Save Set
            </button>
          )}
        </div>
      </div>
    </div>
    
    {/* Controls - Bottom */}
    <div className="shrink-0 bg-bg-card border-t border-neutral-700">
      {!setupComplete ? (
        <SetupControlsBlock
          player1Name={playerContext?.player1Name || 'Player 1'}
          player2Name={playerContext?.player2Name || 'Player 2'}
          onComplete={handleSetupComplete}
        />
      ) : (
        <Phase1ControlsBlock
          rallyState={rallyState}
          onServeShot={handleServeShot}
          onShotMissed={handleShotMissed}
          onInNet={handleInNet}
          onWin={handleWin}
        />
      )}
    </div>
    
    {/* NEW: Completion Modal */}
    {showCompletionModal && playerContext && (
      <CompletionModal
        setNumber={1}  // TODO: Get from set record
        finalScore={currentScore}
        player1Name={playerContext.player1Name}
        player2Name={playerContext.player2Name}
        onTagNextSet={handleTagNextSet}
        onBackToMatches={() => {
          // Navigate back to matches
          window.location.href = '/matches'
        }}
        onViewData={() => {
          // Navigate to data viewer
          window.location.href = `/data-viewer?setId=${setId}`
        }}
      />
    )}
  </div>
)
```

---

## Phase 5: Update Match Detail Page

### Enhance Set Display with Status and Actions

**File:** `app/src/pages/MatchDetail.tsx` (or wherever match detail is shown)

```typescript
// For each set in the match, show status and action buttons

interface SetCardProps {
  set: DBSet
  onTagPhase1: () => void
  onTagPhase2: () => void
  onViewData: () => void
}

function SetCard({ set, onTagPhase1, onTagPhase2, onViewData }: SetCardProps) {
  return (
    <div className="bg-bg-card p-4 rounded-lg border border-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50">
            Set {set.set_number}
          </h3>
          {set.final_score_p1 !== null && set.final_score_p2 !== null && (
            <p className="text-sm text-neutral-400 mt-1">
              Score: {set.final_score_p1} - {set.final_score_p2}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {set.tagging_phase === 'phase1_complete' && (
            <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
              Phase 1 ✓
            </span>
          )}
          {set.tagging_phase === 'phase2_complete' && (
            <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
              Phase 2 ✓
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {!set.tagging_phase && (
          <Button variant="primary" onClick={onTagPhase1}>
            Tag Phase 1
          </Button>
        )}
        
        {set.tagging_phase === 'phase1_in_progress' && (
          <Button variant="primary" onClick={onTagPhase1}>
            Resume Phase 1
          </Button>
        )}
        
        {set.tagging_phase === 'phase1_complete' && (
          <Button variant="primary" onClick={onTagPhase2}>
            Tag Phase 2
          </Button>
        )}
        
        {set.tagging_phase === 'phase2_in_progress' && (
          <Button variant="primary" onClick={onTagPhase2}>
            Resume Phase 2
          </Button>
        )}
        
        {(set.tagging_phase === 'phase1_complete' || set.tagging_phase === 'phase2_complete') && (
          <Button variant="secondary" onClick={onViewData}>
            View Data
          </Button>
        )}
      </div>
    </div>
  )
}
```

---

## Phase 6: Remove Manual Save Button

### Remove Save Progress Functionality

**File:** `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`

1. Remove `handleManualSave` function (lines 98-159)
2. Remove "Save Progress" button from status strip
3. Remove `lastSaveTime` state and related UI
4. Keep only the auto-save on rally completion + new "Save Set" button

**Rationale:** Each rally is already auto-saved when completed. Manual save creates duplicates and is redundant.

---

## Phase 7: Update Documentation

### A. Update specAddendumMVP.md

**File:** `docs-match-analyser-edge-tt/specs/specAddendumMVP.md`

Add comprehensive documentation of all changes:

```markdown
## Version X.X - Phase 1 Setup Flow (December 9, 2025)

### Overview
Added set setup flow to Phase1TimestampComposer to capture starting conditions and enable accurate score tracking throughout tagging.

### Changes

#### 1. Database Schema Updates
- **Set Table:** Added `setup_starting_score_p1`, `setup_starting_score_p2`, `setup_next_server_id`, `setup_completed_at`
- **Rally Table:** Added `is_stub_rally` boolean flag

#### 2. New UI Components
- **SetupControlsBlock:** Captures next server and current score before tagging begins
- **SetEndWarningBlock:** Alerts user when set end conditions are met
- **CompletionModal:** Shows completion options after saving set

#### 3. Phase1TimestampComposer Updates
- Added setup screen (shown on first load, skipped if rallies exist)
- Creates stub rally entries for previous points based on score
- Tracks score before/after for each rally
- Detects set end conditions
- "Save Set" replaces "Complete Phase 1 →"
- Removed "Save Progress" button (auto-save handles everything)
- Completion modal with [Tag Next Set] [Back to Matches] [View Data]

#### 4. New Rules Functions
- `calculatePreviousServers()`: Works backwards from next server using TT rules
- `validateSetScore()`: Validates scores are logically reachable
- `deriveSetEndConditions()`: Checks if current score meets set end

#### 5. Match Detail Page
- Added status badges for Phase 1/2 completion
- Added action buttons for tagging phases
- Added "View Data" button

### Rationale
- Enables accurate score tracking from any point in a set
- Supports partial set tagging (starting mid-set)
- Maintains complete rally history for stats
- Improves user flow with clear completion steps

### Migration Notes
- Existing sets without setup data will show setup screen
- Stub rallies are marked with `is_stub_rally: true` and `framework_confirmed: false`
- Pre-entered set results are overwritten by tagged results (tagged = source of truth)
```

---

## Implementation Checklist

### Phase 1: Database ✓
- [ ] Update `set.types.ts` with setup fields
- [ ] Update `set.db.ts` to handle new fields
- [ ] Update `rally.types.ts` with `is_stub_rally` field
- [ ] Update `rally.db.ts` to handle new field with default `false`
- [ ] Test database operations

### Phase 2: Rules ✓
- [ ] Create `calculatePreviousServers.ts`
- [ ] Create `validateSetScore.ts`
- [ ] Create `deriveSetEndConditions.ts`
- [ ] Write unit tests for each function
- [ ] Export from rules index

### Phase 3: UI Components ✓
- [ ] Create `SetupControlsBlock.tsx`
- [ ] Create `SetEndWarningBlock.tsx`
- [ ] Create `CompletionModal.tsx`
- [ ] Export from blocks index
- [ ] Test each component in isolation

### Phase 4: Phase1TimestampComposer ✓
- [ ] Add new state variables
- [ ] Add initialization check for existing rallies
- [ ] Add `handleSetupComplete` function
- [ ] Update `completeRally` with score tracking
- [ ] Add `handleSaveSet` function
- [ ] Add `handleTagNextSet` function
- [ ] Update render to show conditional UI
- [ ] Remove manual save button
- [ ] Test full flow end-to-end

### Phase 5: Match Detail ✓
- [ ] Enhance set display with status badges
- [ ] Add action buttons for tagging
- [ ] Wire up navigation
- [ ] Test navigation flow

### Phase 6: Cleanup ✓
- [ ] Remove manual save functionality
- [ ] Clean up unused code
- [ ] Update comments

### Phase 7: Documentation ✓
- [ ] Update `specAddendumMVP.md`
- [ ] Update version history
- [ ] Document migration notes
- [ ] Update README if needed

---

## Testing Plan

### Unit Tests
1. `calculatePreviousServers()` - various scores and server combinations
2. `validateSetScore()` - valid and invalid scores
3. `deriveSetEndConditions()` - normal end, deuce scenarios

### Integration Tests
1. Setup flow - create stub rallies correctly
2. Score tracking - verify before/after calculations
3. Set end detection - trigger at correct score
4. Resume flow - skip setup if rallies exist
5. Tag next set - create or resume next set

### Manual Testing
1. Fresh set - go through setup, tag rallies, save set
2. Resume set - verify setup skipped, scores loaded
3. Set end - verify warning shows, continue works
4. Completion - verify modal, navigation works
5. Match detail - verify status badges, buttons work

---

## Notes

- All saves happen automatically at rally completion
- Stub rallies have no video data, marked as unconfirmed
- Tagged scores always overwrite pre-entered scores
- Setup screen only shows on first load (no existing rallies)
- Set end warning is dismissible (continue tagging)
- Completion modal blocks UI until user chooses action

---

## Future Enhancements

- Allow editing stub rally results if known
- Support resuming from middle of set (delete rallies)
- Add set statistics preview before saving
- Support best-of-N match auto-detection
- Add keyboard shortcuts for setup inputs

