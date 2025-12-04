# Edge TT Match Analyser — Gap Resolution Task List

> **Version:** 1.2.0  
> **Date:** 2025-12-01  
> **Reference:** GapAnalysis_v0.9.5.md  
> **Status:** ✅ ALL PHASES COMPLETE (except Phase 5 - DEFERRED)

This document provides an actionable task list to close all gaps identified in the Gap Analysis. Tasks are organized into phases with dependencies mapped.

---

## Clarifications Applied

| # | Decision |
|---|----------|
| 1 | **Contact = Shot** — Add shot fields directly to Contact type (no separate entity) |
| 2 | **Essential Mode only** — Full Mode deferred (Phase 5 removed) |
| 3 | **Question order: Quality → Landing** — Landing Zone skipped if error quality selected |
| 4 | **Completion → View Match Stats** — Modal with stats navigation |
| 5 | **Clean slate** — No data migration needed |
| 6 | **5 second undo toast** — With dismiss button |

---

## Phase Overview

| Phase | Focus | Tasks | Est. Hours | Status |
|-------|-------|-------|------------|--------|
| **Phase 1** | Shot Data Persistence | 4 tasks | 3-4 hrs | ✅ Complete |
| **Phase 2** | Part 1 Completion Flow | 3 tasks | 2-3 hrs | ✅ Complete |
| **Phase 3** | End-of-Point Integration | 3 tasks | 2-3 hrs | ✅ Complete |
| **Phase 4** | Part 2 UX Polish | 4 tasks | 2-3 hrs | ✅ Complete |
| **Phase 5** | ~~Full Mode~~ | ~~DEFERRED~~ | — | ⏸️ Deferred |
| **Phase 6** | Minor Polish | 4 tasks | 1-2 hrs | ✅ Complete |
| **Total** | | **18 tasks** | **10-15 hrs** | **✅ Done** |

---

## Phase 1: Shot Data Persistence (P0 - CRITICAL)

**Goal:** Enable shot question answers to be saved to the store so analysis is possible.

**Key Decision:** Contact = Shot. Shot data fields are added directly to the Contact interface (no separate entity).

### TASK-GAP-001: Extend Contact Type with Shot Fields

**File:** `app/src/rules/types.ts`

**Update Contact interface to include shot data:**
```typescript
export interface Contact {
  id: string
  rallyId: string
  time: number // seconds in video
  shotIndex: number
  
  // Shot data fields (filled in Part 2)
  playerId?: PlayerId
  
  // Serve-specific fields (shotIndex === 1)
  serveType?: ServeType
  serveSpin?: ServeSpin
  
  // Rally shot fields (shotIndex > 1)
  wing?: Wing
  shotType?: EssentialShotType
  
  // Common fields
  landingZone?: LandingZone
  shotQuality?: ShotQuality
  
  // Derived fields (calculated, not input)
  landingType?: LandingType
  inferredSpin?: InferredSpin
  
  // Metadata
  isTagged?: boolean // True when Part 2 tagging complete for this shot
}
```

**Estimate:** 20 minutes

---

### TASK-GAP-002: Add Contact Update Actions to Store

**File:** `app/src/stores/taggingStore.ts`

**Add actions:**
```typescript
// Update contact with shot data (Part 2)
updateContactShotData: (contactId: string, data: Partial<Contact>) => {
  const { contacts, rallies } = get()
  
  // Update in contacts array
  const updatedContacts = contacts.map(c => 
    c.id === contactId ? { ...c, ...data } : c
  )
  
  // Update in rally's contacts array
  const updatedRallies = rallies.map(rally => ({
    ...rally,
    contacts: rally.contacts.map(c => 
      c.id === contactId ? { ...c, ...data } : c
    ),
  }))
  
  set({ contacts: updatedContacts, rallies: updatedRallies })
}

// Mark contact as fully tagged (all questions answered)
completeContactTagging: (contactId: string, finalQuality: ShotQuality) => {
  const { contacts, rallies } = get()
  
  // Find the contact
  const contact = contacts.find(c => c.id === contactId)
  if (!contact) return
  
  // Derive landing type from quality
  const landingType = deriveLandingType(finalQuality)
  
  // Derive inferred spin from shot type (if applicable)
  const inferredSpin = contact.shotType 
    ? deriveInferredSpin(contact.shotType as ShotType)
    : undefined
  
  const updateData = { 
    shotQuality: finalQuality, 
    landingType, 
    inferredSpin, 
    isTagged: true 
  }
  
  // Update in contacts array
  const updatedContacts = contacts.map(c => 
    c.id === contactId ? { ...c, ...updateData } : c
  )
  
  // Update in rally's contacts array
  const updatedRallies = rallies.map(rally => ({
    ...rally,
    contacts: rally.contacts.map(c => 
      c.id === contactId ? { ...c, ...updateData } : c
    ),
  }))
  
  set({ contacts: updatedContacts, rallies: updatedRallies })
}
```

**Estimate:** 45 minutes

---

### TASK-GAP-003: Update ShotQuestionSection with New Question Order

**File:** `app/src/features/tagging/sections/ShotQuestionSection.tsx`

**New question order:** Quality BEFORE Landing Zone, skip landing if error.

**Serve flow (3-4 inputs):**
1. Serve Type (7 options, keys 1-7)
2. Spin Grid (3x3, numpad 1-9)
3. Quality (6 options, G/A/W/N/L/D)
4. Landing Zone (3x3, numpad 1-9) — **SKIP if error quality**

**Rally shot flow (3-4 inputs):**
1. Wing (F/B)
2. Shot Type (9 options, keys 1-9)
3. Quality (6 options)
4. Landing Zone (3x3) — **SKIP if error quality**

**Key changes:**
```typescript
// Update step mapping
const getServeStepLabel = (step: number): ServeQuestionStep => {
  const steps: ServeQuestionStep[] = ['type', 'spin', 'quality', 'landing']  // REORDERED
  return steps[step - 1] || 'type'
}

const getRallyShotStepLabel = (step: number): RallyShotQuestionStep => {
  const steps: RallyShotQuestionStep[] = ['wing', 'type', 'quality', 'landing']  // REORDERED
  return steps[step - 1] || 'wing'
}

// Quality handler checks for error and skips landing
const handleQualitySelect = (quality: ShotQuality) => {
  const isError = ['inNet', 'missedLong', 'missedWide'].includes(quality)
  
  if (isError) {
    // Skip landing zone, complete immediately
    onQualitySelect(quality)  // This triggers completion + error handling
  } else {
    // Store quality, move to landing zone step
    onQualitySelect(quality)
    // Parent will advance to step 4 (landing)
  }
}
```

**Update render order to match new steps.**

**Estimate:** 1 hour

---

### TASK-GAP-004: Wire ShotQuestionSection to Store

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Changes:**

1. Get store actions:
```typescript
const {
  updateContactShotData,
  completeContactTagging,
  // ... existing
} = useTaggingStore()
```

2. Initialize contact playerId when entering Part 2:
```typescript
useEffect(() => {
  if (taggingPhase !== 'part2' || !currentRally || !currentContact) return
  
  // Skip if already has playerId
  if (currentContact.playerId) return
  
  // Determine player for this shot (alternating from server)
  const isEvenShot = activeShotIndex % 2 === 0
  const playerId: PlayerId = currentRally.serverId === 'player1'
    ? (isEvenShot ? 'player2' : 'player1')
    : (isEvenShot ? 'player1' : 'player2')
  
  updateContactShotData(currentContact.id, { playerId })
}, [taggingPhase, activeRallyIndex, activeShotIndex, currentContact?.playerId])
```

3. Update handlers to persist data:
```typescript
const handleServeTypeSelect = useCallback((type: ServeType) => {
  if (currentContact) {
    updateContactShotData(currentContact.id, { 
      serveType: type,
      wing: deriveServeWing(type) // Auto-derive wing
    })
  }
  setShotQuestionStep(2) // Go to Spin
}, [currentContact, setShotQuestionStep, updateContactShotData])

const handleSpinSelect = useCallback((spin: ServeSpin) => {
  if (currentContact) {
    updateContactShotData(currentContact.id, { serveSpin: spin })
  }
  setShotQuestionStep(3) // Go to Quality (REORDERED)
}, [currentContact, setShotQuestionStep, updateContactShotData])

const handleWingSelect = useCallback((wing: 'forehand' | 'backhand') => {
  if (currentContact) {
    updateContactShotData(currentContact.id, { wing: wing === 'forehand' ? 'FH' : 'BH' })
  }
  setShotQuestionStep(2) // Go to Shot Type
}, [currentContact, setShotQuestionStep, updateContactShotData])

const handleShotTypeSelect = useCallback((type: EssentialShotType) => {
  if (currentContact) {
    updateContactShotData(currentContact.id, { shotType: type })
  }
  setShotQuestionStep(3) // Go to Quality (REORDERED)
}, [currentContact, setShotQuestionStep, updateContactShotData])

const handleQualitySelect = useCallback((quality: ShotQuality) => {
  if (!currentContact || !currentRally) return
  
  const isError = ['inNet', 'missedLong', 'missedWide'].includes(quality)
  
  if (isError) {
    // Complete contact with error quality (skips landing zone)
    completeContactTagging(currentContact.id, quality)
    
    // Handle error: derive end-of-point, check for forced/unforced
    const playerId = currentContact.playerId || 'player1'
    const derived = deriveEndOfPoint({
      playerId,
      shotIndex: activeShotIndex,
      shotQuality: quality,
    })
    
    if (derived.needsForcedUnforcedQuestion) {
      // Show forced/unforced prompt (shot 3+)
      setPendingErrorData({
        contactId: currentContact.id,
        errorPlayerId: playerId,
        winnerId: derived.winnerId,
        shotIndex: activeShotIndex,
      })
      setShowForcedUnforced(true)
      return // Don't advance yet
    } else {
      // Auto-derive pointEndType (serve fault or receive error)
      setRallyPointEndType(currentRally.id, derived.pointEndType!)
      updateRallyWinner(currentRally.id, derived.winnerId)
    }
    
    // Trigger auto-prune if not last shot
    if (!isLastShot) {
      autoPruneContacts(currentRally.id, activeShotIndex)
    }
    
    // Error ends the rally, advance
    advanceToNextRally()
  } else {
    // Not an error, store quality and move to landing zone (step 4)
    updateContactShotData(currentContact.id, { shotQuality: quality })
    setShotQuestionStep(4)
  }
}, [/* deps */])

const handleLandingZoneSelect = useCallback((zone: LandingZone) => {
  if (currentContact) {
    // Complete the contact (landing zone is final step for non-errors)
    completeContactTagging(currentContact.id, currentContact.shotQuality!)
    updateContactShotData(currentContact.id, { landingZone: zone })
  }
  // Advance to next shot
  advanceToNextShot()
}, [currentContact, advanceToNextShot, completeContactTagging, updateContactShotData])
```

**Estimate:** 1.5 hours

---

## Phase 2: Part 1 Completion Flow (P0 - CRITICAL)

**Goal:** Add proper transition from Part 1 to Part 2 with match completion data capture.

### TASK-GAP-006: Create MatchCompletionModalBlock Component

**File:** `app/src/features/tagging/blocks/MatchCompletionModalBlock.tsx`

**Create new component:**
```typescript
/**
 * MatchCompletionModalBlock — Modal for completing Part 1
 * 
 * Captures:
 * - Match result (Player 1 / Player 2 / Incomplete)
 * - Final set score
 * - Final points score
 * - Video coverage type
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button, Icon, Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'
import type { MatchResult, VideoCoverage } from '@/rules/types'

export interface MatchCompletionData {
  matchResult: MatchResult
  finalSetScore: string
  finalPointsScore: string
  videoCoverage: VideoCoverage
}

export interface MatchCompletionModalBlockProps {
  player1Name: string
  player2Name: string
  currentSetScore: string
  currentPointsScore: string
  onSubmit: (data: MatchCompletionData) => void
  onCancel: () => void
  className?: string
}

export function MatchCompletionModalBlock({
  player1Name,
  player2Name,
  currentSetScore,
  currentPointsScore,
  onSubmit,
  onCancel,
  className,
}: MatchCompletionModalBlockProps) {
  const [formData, setFormData] = useState<MatchCompletionData>({
    matchResult: 'incomplete',
    finalSetScore: currentSetScore,
    finalPointsScore: currentPointsScore,
    videoCoverage: 'full',
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }
  
  return (
    <Card className={cn('w-full max-w-md', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="flag-checkered" size="md" />
          Complete Part 1 — Match Framework
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Match Result */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Match Result
            </label>
            <div className="flex gap-2">
              {[
                { value: 'player1', label: player1Name },
                { value: 'player2', label: player2Name },
                { value: 'incomplete', label: 'Incomplete' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, matchResult: opt.value as MatchResult }))}
                  className={cn(
                    'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                    formData.matchResult === opt.value
                      ? opt.value === 'incomplete' 
                        ? 'bg-warning text-black'
                        : 'bg-success text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Final Scores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Final Set Score
              </label>
              <input
                type="text"
                value={formData.finalSetScore}
                onChange={(e) => setFormData(d => ({ ...d, finalSetScore: e.target.value }))}
                placeholder="e.g. 3-2"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Final Points (Last Set)
              </label>
              <input
                type="text"
                value={formData.finalPointsScore}
                onChange={(e) => setFormData(d => ({ ...d, finalPointsScore: e.target.value }))}
                placeholder="e.g. 11-9"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-neutral-100"
              />
            </div>
          </div>
          
          {/* Video Coverage */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Video Coverage
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'full', label: 'Full Match' },
                { value: 'truncatedStart', label: 'Truncated Start' },
                { value: 'truncatedEnd', label: 'Truncated End' },
                { value: 'truncatedBoth', label: 'Truncated Both' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(d => ({ ...d, videoCoverage: opt.value as VideoCoverage }))}
                  className={cn(
                    'py-2 px-3 rounded text-xs font-medium transition-colors',
                    formData.videoCoverage === opt.value
                      ? 'bg-brand-primary text-white'
                      : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              <Icon name="check" size="sm" />
              Complete Part 1
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Estimate:** 1 hour

---

### TASK-GAP-007: Add completeMatchFramework Action

**File:** `app/src/stores/taggingStore.ts`

**Add action:**
```typescript
completeMatchFramework: (data: MatchCompletionData) => {
  set({
    matchResult: data.matchResult,
    finalSetScore: data.finalSetScore,
    finalPointsScore: data.finalPointsScore,
    videoCoverage: data.videoCoverage,
    step1Complete: true,
    showMatchCompletionModal: false,
    taggingPhase: 'part2',
    activeRallyIndex: 0,
    activeShotIndex: 1,
    shotQuestionStep: 1,
  })
}
```

**Also add UI state:**
```typescript
// In state
showMatchCompletionModal: boolean

// In initial state
showMatchCompletionModal: false,

// Add toggle actions
openMatchCompletionModal: () => set({ showMatchCompletionModal: true }),
closeMatchCompletionModal: () => set({ showMatchCompletionModal: false }),
```

**Estimate:** 30 minutes

---

### TASK-GAP-008: Wire Match Completion Modal to Composer

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Changes:**

1. Import the modal:
```typescript
import { MatchCompletionModalBlock, type MatchCompletionData } from '../blocks/MatchCompletionModalBlock'
```

2. Get store state/actions:
```typescript
const {
  // ... existing ...
  showMatchCompletionModal,
  openMatchCompletionModal,
  closeMatchCompletionModal,
  completeMatchFramework,
} = useTaggingStore()
```

3. Update Part 1 completion button:
```typescript
// Replace existing "Complete Part 1" button
{rallies.length > 0 && !isInFFMode && (
  <div className="mt-4 flex justify-center">
    <button
      onClick={openMatchCompletionModal}  // Changed from handleCompletePart1
      className="px-6 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90 transition-colors"
    >
      Complete Part 1 → Start Shot Tagging
    </button>
  </div>
)}
```

4. Add modal render:
```typescript
{/* Match Completion Modal */}
{showMatchCompletionModal && (
  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
    <MatchCompletionModalBlock
      player1Name={player1Name}
      player2Name={player2Name}
      currentSetScore={matchPanel.currentSetScore}
      currentPointsScore={matchPanel.currentPointsScore}
      onSubmit={completeMatchFramework}
      onCancel={closeMatchCompletionModal}
    />
  </div>
)}
```

**Estimate:** 30 minutes

---

## Phase 3: End-of-Point Integration (P1 - HIGH)

**Goal:** Properly trigger forced/unforced question and auto-prune on errors.

### TASK-GAP-009: Wire ForcedUnforcedBlock to Workflow

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Changes:**

1. Add state for forced/unforced prompt:
```typescript
const [showForcedUnforced, setShowForcedUnforced] = useState(false)
const [pendingErrorData, setPendingErrorData] = useState<{
  shotId: string
  errorPlayerId: PlayerId
  winnerId: PlayerId
  shotIndex: number
} | null>(null)
```

2. Update quality select handler:
```typescript
const handleQualitySelect = useCallback((quality: ShotQuality) => {
  if (!currentShotId || !currentRally) return
  
  const isError = ['inNet', 'missedLong', 'missedWide'].includes(quality)
  
  // Complete the shot with quality
  completeShot(currentShotId, quality)
  
  if (isError) {
    // Derive end-of-point data
    const shot = getShotByContactId(currentContact?.id || '')
    const playerId = shot?.playerId || 'player1'
    const derived = deriveEndOfPoint({
      playerId,
      shotIndex: activeShotIndex,
      shotQuality: quality,
    })
    
    if (derived.needsForcedUnforcedQuestion) {
      // Show forced/unforced prompt (shot 3+)
      setPendingErrorData({
        shotId: currentShotId,
        errorPlayerId: playerId,
        winnerId: derived.winnerId,
        shotIndex: activeShotIndex,
      })
      setShowForcedUnforced(true)
      return // Don't advance yet
    } else {
      // Auto-derive pointEndType (serve fault or receive error)
      setRallyPointEndType(currentRally.id, derived.pointEndType!)
      updateRallyWinner(currentRally.id, derived.winnerId)
    }
    
    // Trigger auto-prune if not last shot
    if (!isLastShot) {
      autoPruneContacts(currentRally.id, activeShotIndex)
    }
  }
  
  // Advance to next shot or rally
  if (isLastShot || isError) {
    advanceToNextRally()
  } else {
    advanceToNextShot()
  }
}, [/* deps */])
```

3. Add forced/unforced handler:
```typescript
const handleForcedUnforcedSelect = useCallback((type: 'forcedError' | 'unforcedError') => {
  if (!pendingErrorData || !currentRally) return
  
  // Set the point end type
  setRallyPointEndType(currentRally.id, type)
  updateRallyWinner(currentRally.id, pendingErrorData.winnerId)
  
  // Clear state and advance
  setPendingErrorData(null)
  setShowForcedUnforced(false)
  advanceToNextRally()
}, [pendingErrorData, currentRally])
```

4. Add render for ForcedUnforcedBlock:
```typescript
{/* Forced/Unforced Modal */}
{showForcedUnforced && pendingErrorData && (
  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
    <ForcedUnforcedBlock
      errorPlayerId={pendingErrorData.errorPlayerId}
      errorPlayerName={pendingErrorData.errorPlayerId === 'player1' ? player1Name : player2Name}
      winnerId={pendingErrorData.winnerId}
      winnerName={pendingErrorData.winnerId === 'player1' ? player1Name : player2Name}
      shotIndex={pendingErrorData.shotIndex}
      onSelect={handleForcedUnforcedSelect}
    />
  </div>
)}
```

**Estimate:** 1.5 hours

---

### TASK-GAP-010: Add Keyboard Shortcuts for Forced/Unforced

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Add to keyboard handler:**
```typescript
// In useEffect keyboard handler
case 'KeyF':
  if (showForcedUnforced) {
    e.preventDefault()
    handleForcedUnforcedSelect('forcedError')
  }
  break
  
case 'KeyU':
  if (showForcedUnforced) {
    e.preventDefault()
    handleForcedUnforcedSelect('unforcedError')
  }
  break
```

**Estimate:** 15 minutes

---

### TASK-GAP-011: Add Undo Toast for Auto-Prune

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Add toast state and display:**
```typescript
const [pruneToast, setPruneToast] = useState<{ count: number; rallyId: string } | null>(null)

// After autoPruneContacts call:
const pruneResult = autoPruneContacts(currentRally.id, activeShotIndex)
if (pruneResult.prunedCount > 0) {
  setPruneToast({ count: pruneResult.prunedCount, rallyId: currentRally.id })
  // Auto-dismiss after 5 seconds
  setTimeout(() => setPruneToast(null), 5000)
}

// Add toast render (near bottom of component):
{pruneToast && (
  <div className="fixed bottom-4 right-4 bg-warning text-black px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
    <Icon name="alert-triangle" size="sm" />
    <span>Auto-removed {pruneToast.count} shot(s) after error</span>
    <button
      onClick={() => {
        undoLastPrune(pruneToast.rallyId)
        setPruneToast(null)
      }}
      className="ml-2 px-2 py-1 bg-black/20 rounded text-sm font-medium hover:bg-black/30"
    >
      Undo
    </button>
    <button onClick={() => setPruneToast(null)} className="text-black/60 hover:text-black">
      <Icon name="x" size="sm" />
    </button>
  </div>
)}
```

**Note:** Need to update `autoPruneContacts` to return the prune count.

**Estimate:** 30 minutes

---

## Phase 4: Part 2 UX Polish (P2 - MEDIUM)

**Goal:** Add missing Part 2 controls for loop speed and preview buffer.

### TASK-GAP-012: Add Part 2 Speed Controls Section

**File:** `app/src/features/tagging/sections/Part2SpeedControlsSection.tsx` (NEW)

**Create component:**
```typescript
/**
 * Part2SpeedControlsSection — Loop speed and preview buffer controls
 */

import { cn } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/ui-mine'

const LOOP_SPEEDS = [0.25, 0.5, 0.75, 1]
const BUFFER_OPTIONS = [0.1, 0.2, 0.3, 0.4, 0.5]

export interface Part2SpeedControlsSectionProps {
  loopSpeed: number
  previewBuffer: number
  onLoopSpeedChange: (speed: number) => void
  onPreviewBufferChange: (buffer: number) => void
  className?: string
}

export function Part2SpeedControlsSection({
  loopSpeed,
  previewBuffer,
  onLoopSpeedChange,
  onPreviewBufferChange,
  className,
}: Part2SpeedControlsSectionProps) {
  return (
    <Card className={cn('p-3', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Preview Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Loop Speed */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Loop Speed
          </label>
          <div className="flex gap-1">
            {LOOP_SPEEDS.map(speed => (
              <button
                key={speed}
                onClick={() => onLoopSpeedChange(speed)}
                className={cn(
                  'flex-1 py-1.5 rounded text-xs font-mono transition-colors',
                  loopSpeed === speed
                    ? 'bg-brand-primary text-white'
                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
        
        {/* Preview Buffer */}
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            Preview Buffer: +{previewBuffer.toFixed(1)}s
          </label>
          <input
            type="range"
            min={0.1}
            max={0.5}
            step={0.1}
            value={previewBuffer}
            onChange={(e) => onPreviewBufferChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-0.5">
            <span>0.1s</span>
            <span>0.5s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Estimate:** 45 minutes

---

### TASK-GAP-013: Add setPreviewBuffer and setLoopSpeed Actions

**File:** `app/src/stores/taggingStore.ts`

**Add actions:**
```typescript
setPreviewBuffer: (seconds: number) => set({ previewBufferSeconds: seconds }),
setLoopSpeed: (speed: number) => set({ loopSpeed: speed }),
```

**Estimate:** 10 minutes

---

### TASK-GAP-014: Wire Part 2 Speed Controls to Composer

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Add to Part 2 render:**
```typescript
// Import
import { Part2SpeedControlsSection } from '../sections/Part2SpeedControlsSection'

// Get from store
const {
  previewBufferSeconds,
  loopSpeed,
  setPreviewBuffer,
  setLoopSpeed,
} = useTaggingStore()

// Update constrained playback to use store values
const constrainedPlayback: ConstrainedPlayback | undefined = 
  taggingPhase === 'part2' && currentContact
    ? {
        enabled: true,
        startTime: currentContact.time,
        endTime: nextContact 
          ? nextContact.time + previewBufferSeconds  // Use from store
          : (currentRally?.endOfPointTime || currentContact.time + 1),
        loopOnEnd: !isLastShot,
        speed: loopSpeed,  // Pass speed to video player
      }
    : undefined

// Add to Part 2 layout (right side):
{taggingPhase === 'part2' && (
  <div className="w-48 shrink-0">
    <Part2SpeedControlsSection
      loopSpeed={loopSpeed}
      previewBuffer={previewBufferSeconds}
      onLoopSpeedChange={setLoopSpeed}
      onPreviewBufferChange={setPreviewBuffer}
    />
  </div>
)}
```

**Estimate:** 30 minutes

---

### TASK-GAP-015: Add End of Set Constraint (REQ-4)

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Update End Set handler:**
```typescript
const handleEndOfSet = useCallback(() => {
  // REQ-4: Only allow after rally is complete (no open contacts)
  const { currentRallyContacts } = useTaggingStore.getState()
  if (currentRallyContacts.length > 0) {
    // Show toast or warning
    console.warn('Cannot mark end of set while rally is in progress')
    return
  }
  markEndOfSet()
}, [markEndOfSet])
```

**Update button disabled state:**
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={handleEndOfSet}
  disabled={taggingControls.currentRallyContactCount > 0}  // Disable during open rally
  shortcut="E"
>
  <Icon name="flag" size="sm" />
  End Set
</Button>
```

**Estimate:** 15 minutes

---

## Phase 5: Full Mode Implementation — DEFERRED

> **Status:** DEFERRED for post-MVP
> **Reason:** User decision — Essential Mode only for MVP

Full Mode would add:
- Position sector step (PositionGrid)
- Full 14 shot type list
- Issue cause conditionals (serve/receive/third ball issues)
- Luck type at end-of-point

These features are architecturally designed but not implemented in this sprint.

---

## Phase 6: Minor Polish (P3 - LOW)

**Goal:** Address remaining minor gaps for completeness.

### TASK-GAP-020: Add Match Format Dropdown to Setup

**File:** `app/src/features/tagging/blocks/MatchSetupPanelBlock.tsx`

**Add field:**
```typescript
// In form state
matchFormat: 'bestOf5To11' as string,

// In form UI
<div>
  <label className="block text-sm font-medium text-neutral-300 mb-1">
    Match Format
  </label>
  <select
    value={formData.matchFormat}
    onChange={(e) => updateField('matchFormat', e.target.value)}
    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100"
  >
    <option value="bestOf3To11">Best of 3, to 11</option>
    <option value="bestOf5To11">Best of 5, to 11</option>
    <option value="bestOf7To11">Best of 7, to 11</option>
    <option value="bestOf3To21">Best of 3, to 21</option>
    <option value="single">Single Set, to 11</option>
  </select>
</div>
```

**Also add to store state and `initMatchFramework` action.**

**Estimate:** 30 minutes

---

### TASK-GAP-021: Add Tournament/Context Field to Setup

**File:** `app/src/features/tagging/blocks/MatchSetupPanelBlock.tsx`

**Add field:**
```typescript
// In form state
tournament: '' as string,

// In form UI
<div>
  <label className="block text-sm font-medium text-neutral-400 mb-1">
    Tournament / Context (optional)
  </label>
  <input
    type="text"
    value={formData.tournament}
    onChange={(e) => updateField('tournament', e.target.value)}
    placeholder="e.g. Club Championship, Practice"
    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-600 rounded-md text-neutral-100"
  />
</div>
```

**Also add to store state.**

**Estimate:** 15 minutes

---

### TASK-GAP-022: Add goToPreviousShot Action

**File:** `app/src/stores/taggingStore.ts`

**Add action:**
```typescript
goToPreviousShot: () => {
  const { activeRallyIndex, activeShotIndex, rallies } = get()
  
  if (activeShotIndex > 1) {
    // Go to previous shot in same rally
    set({ 
      activeShotIndex: activeShotIndex - 1,
      shotQuestionStep: 1,
    })
  } else if (activeRallyIndex > 0) {
    // Go to last shot of previous rally
    const prevRally = rallies[activeRallyIndex - 1]
    set({
      activeRallyIndex: activeRallyIndex - 1,
      activeShotIndex: prevRally.contacts.length,
      shotQuestionStep: 1,
    })
  }
  // If at first shot of first rally, do nothing
}
```

**Add "Back" button to ShotQuestionSection if needed.**

**Estimate:** 20 minutes

---

### TASK-GAP-023: Add Part 2 Completion Modal

**File:** `app/src/features/tagging/composers/TaggingScreenComposer.tsx`

**Add completion detection and modal with "View Match Stats" as primary action:**
```typescript
// Detect completion
const isAllRalliesTagged = rallies.length > 0 && 
  activeRallyIndex >= rallies.length &&
  step2Complete

// Show completion modal
{taggingPhase === 'part2' && isAllRalliesTagged && (
  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
    <Card className="max-w-md text-center p-8">
      <Icon name="check-circle" size="xl" className="text-success mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-neutral-100 mb-2">
        Tagging Complete!
      </h2>
      <p className="text-neutral-400 mb-6">
        All {rallies.length} rallies have been tagged.
      </p>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={() => navigate('/matches')}>
          Back to Matches
        </Button>
        <Button variant="primary" onClick={() => navigate(`/matches/${matchId}/stats`)}>
          <Icon name="bar-chart-2" size="sm" />
          View Match Stats
        </Button>
      </div>
    </Card>
  </div>
)}
```

**Note:** "View Match Stats" is the primary action per user clarification #4.

**Estimate:** 30 minutes

---

## Execution Checklist

### Phase 1: Shot Data on Contact (Contact = Shot)
- [x] TASK-GAP-001: Extend Contact interface with shot fields ✅
- [x] TASK-GAP-002: Add contact update actions to store ✅
- [x] TASK-GAP-003: Update ShotQuestionSection with new question order (Quality → Landing) ✅
- [x] TASK-GAP-004: Wire ShotQuestionSection handlers to store ✅

### Phase 2: Part 1 Completion Flow
- [x] TASK-GAP-006: Create MatchCompletionModalBlock ✅
- [x] TASK-GAP-007: Add completeMatchFramework action ✅
- [x] TASK-GAP-008: Wire modal to composer ✅

### Phase 3: End-of-Point Integration
- [x] TASK-GAP-009: Wire ForcedUnforcedBlock ✅
- [x] TASK-GAP-010: Add F/U keyboard shortcuts ✅
- [x] TASK-GAP-011: Add undo toast for auto-prune (5 sec with dismiss) ✅

### Phase 4: Part 2 UX Polish
- [x] TASK-GAP-012: Create Part2SpeedControlsSection ✅
- [x] TASK-GAP-013: Add speed control actions ✅
- [x] TASK-GAP-014: Wire controls to composer ✅
- [x] TASK-GAP-015: Add End of Set constraint ✅

### Phase 5: Full Mode — DEFERRED
- ~~TASK-GAP-016~~ DEFERRED
- ~~TASK-GAP-017~~ DEFERRED
- ~~TASK-GAP-018~~ DEFERRED
- ~~TASK-GAP-019~~ DEFERRED

### Phase 6: Minor Polish
- [x] TASK-GAP-020: Add match format dropdown ✅
- [x] TASK-GAP-021: Add tournament field ✅
- [x] TASK-GAP-022: Add goToPreviousShot action ✅
- [x] TASK-GAP-023: Add Part 2 completion modal (View Match Stats) ✅

---

## ✅ Implementation Complete Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 1 | Shot Data on Contact | ✅ 4/4 Complete |
| Phase 2 | Part 1 Completion Flow | ✅ 3/3 Complete |
| Phase 3 | End-of-Point Integration | ✅ 3/3 Complete |
| Phase 4 | Part 2 UX Polish | ✅ 4/4 Complete |
| Phase 5 | Full Mode | ⏸️ DEFERRED |
| Phase 6 | Minor Polish | ✅ 4/4 Complete |
| **TOTAL** | **18 active tasks** | **✅ 18/18 Complete** |

### Files Created
- `app/src/features/tagging/sections/Part2SpeedControlsSection.tsx`
- `app/src/features/tagging/blocks/Part2CompletionBlock.tsx`
- `app/src/features/tagging/blocks/MatchCompletionModalBlock.tsx`
- `app/src/features/tagging/blocks/ForcedUnforcedBlock.tsx`
- `app/src/features/tagging/blocks/MatchSetupPanelBlock.tsx`

### Key Changes
- **Contact = Shot**: Shot data fields merged into Contact interface
- **Question Order**: Quality → Landing (skip landing on error)
- **Store Actions**: `updateContactShotData`, `completeContactTagging`, `completeMatchFramework`, `goToPreviousShot`, `setLoopSpeed`, `setPreviewBuffer`
- **End of Set**: Disabled during open rally (REQ-4)
- **Auto-prune**: 5-second undo toast with dismiss button
- **Forced/Unforced**: Inline question with F/U keyboard shortcuts

---

## Verification Tests

After completing all tasks, verify:

### Part 1 Tests
- [ ] Match setup captures all fields including format/tournament
- [ ] First serve timestamp required before start
- [ ] Tagging creates contacts correctly
- [ ] End rally opens winner dialog
- [ ] End of Set disabled during open rally
- [ ] Match Completion Modal appears on complete
- [ ] Transition to Part 2 works

### Part 2 Tests (Essential Mode)
- [ ] Shot questions appear for each contact
- [ ] Answers persist to Contact (Contact = Shot)
- [ ] Question order: Type/Wing → Spin/ShotType → **Quality** → Landing
- [ ] Error quality (inNet/missedLong/missedWide) **skips landing zone**
- [ ] Non-error quality proceeds to landing zone
- [ ] Forced/Unforced prompt on error shot 3+
- [ ] Auto-prune triggers with 5-second undo toast
- [ ] Undo toast dismissible
- [ ] Loop speed/preview buffer controls work
- [ ] Rally advances after completion
- [ ] Part 2 completion modal shows with "View Match Stats" option

### Derivation Tests
- [ ] Serve wing derived from type
- [ ] Landing type derived from quality
- [ ] Winner derived from error quality
- [ ] Point end type auto-set for serve/receive errors
- [ ] Inferred spin derived from shot type

---

*Last updated: 2025-12-01 — All phases complete*

