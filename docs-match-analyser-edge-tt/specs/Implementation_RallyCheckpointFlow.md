# Implementation Plan: Rally Checkpoint Flow

**Date:** 2025-12-02  
**Source Spec:** `chat_notes/Spec_RallyCheckpointFlow.md`  
**Status:** Ready to Implement

---

## Overview

This document provides the implementation plan and task list for the Rally Checkpoint Flow feature. The implementation is broken into phases that can be completed incrementally.

---

## Architecture Changes

### State Machine (New)

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

### Store Restructure

```typescript
interface TaggingState {
  // Match info (unchanged)
  matchId: string | null
  player1Name: string
  player2Name: string
  firstServerId: PlayerId
  
  // NEW: State machine
  frameworkState: FrameworkState
  currentSetNumber: number
  
  // NEW: Per-set data
  sets: GameSet[]
  
  // Current set rallies (cleared when set complete)
  rallies: Rally[]
  
  // Current rally (cleared on confirm)
  currentRallyContacts: Contact[]
  currentRallyStartTime: number | null
  
  // Video state (unchanged)
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  
  // Part 2 state
  activeRallyIndex: number
  activeShotIndex: number
  shotQuestionStep: number
}
```

---

## Phase 1: Core State Machine

**Goal:** Implement the framework state machine without UI changes.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 1.1 | Add `frameworkState` to store | High | Low |
| 1.2 | Add state transition actions | High | Medium |
| 1.3 | Refactor `addContact` to only work in `tagging` state | High | Low |
| 1.4 | Refactor `endRallyScore` to transition to `checkpoint` state | High | Low |
| 1.5 | Add `confirmRally` action (checkpoint → ff_mode) | High | Medium |
| 1.6 | Add `redoCurrentRally` action (checkpoint → ff_mode) | High | Medium |
| 1.7 | Refactor `startNewRallyWithServe` to transition to `tagging` state | High | Low |
| 1.8 | Add `endSet` action (ff_mode → shot_detail) | High | Medium |

### Detailed Task Specs

#### 1.1 Add `frameworkState` to store
```typescript
// In initialState
frameworkState: 'setup' as FrameworkState,
currentSetNumber: 1,
```

#### 1.5 Add `confirmRally` action
```typescript
confirmRally: () => {
  const { currentRallyContacts, rallies, currentServerId, currentTime } = get()
  
  if (currentRallyContacts.length === 0) return
  
  // Create rally from current contacts
  const rallyId = generateId()
  const newRally: Rally = {
    id: rallyId,
    contacts: currentRallyContacts.map(c => ({ ...c, rallyId })),
    endOfPointTime: currentTime,
    serverId: currentServerId,
    receiverId: currentServerId === 'player1' ? 'player2' : 'player1',
    frameworkConfirmed: true,
    detailComplete: false,
  }
  
  // Calculate next server
  const nextServerId = calculateServerFromRallyCount(rallies.length + 1, get().firstServerId)
  
  set({
    rallies: [...rallies, newRally],
    currentRallyContacts: [],
    currentServerId: nextServerId,
    frameworkState: 'ff_mode',
  })
}
```

#### 1.6 Add `redoCurrentRally` action
```typescript
redoCurrentRally: () => {
  const { rallies } = get()
  
  // Get previous rally's end time (or first serve time if Rally 1)
  const seekTime = rallies.length > 0 
    ? rallies[rallies.length - 1].endOfPointTime 
    : get().firstServeTimestamp || 0
  
  set({
    currentRallyContacts: [],
    frameworkState: 'ff_mode',
  })
  
  // Seek handled by component
  return seekTime
}
```

---

## Phase 2: Checkpoint UI

**Goal:** Create the checkpoint UI that appears after ending a rally.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 2.1 | Create `CheckpointSection` component | High | Medium |
| 2.2 | Add checkpoint keyboard handlers (Enter, Backspace) | High | Low |
| 2.3 | Update `TaggingScreenComposer` to render checkpoint | High | Medium |
| 2.4 | Add rally preview visualization in checkpoint | Medium | Medium |

### Component Structure

```
CheckpointSection/
├── CheckpointSection.tsx
│   ├── Rally number + contact count
│   ├── Server (derived)
│   ├── Duration
│   ├── Contact timeline preview
│   └── Confirm / Redo buttons
```

---

## Phase 3: Timeline Panel Updates

**Goal:** Update timeline to show locked vs current rallies.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 3.1 | Add `frameworkConfirmed` visual state (✓ icon, greyed) | High | Low |
| 3.2 | Add "Redo from here" context menu on locked rallies | Medium | Medium |
| 3.3 | Implement `redoFromRally(rallyId)` action | Medium | Medium |
| 3.4 | Add click-to-seek on locked rallies (view only) | Low | Low |

### Redo From Rally Action

```typescript
redoFromRally: (rallyId: string) => {
  const { rallies } = get()
  
  const rallyIndex = rallies.findIndex(r => r.id === rallyId)
  if (rallyIndex === -1) return
  
  // Get seek time (previous rally's end or first serve)
  const seekTime = rallyIndex > 0 
    ? rallies[rallyIndex - 1].endOfPointTime 
    : get().firstServeTimestamp || 0
  
  // Delete rallies from index onward
  const remainingRallies = rallies.slice(0, rallyIndex)
  
  // Recalculate server for next rally
  const nextServerId = calculateServerFromRallyCount(remainingRallies.length, get().firstServerId)
  
  set({
    rallies: remainingRallies,
    currentRallyContacts: [],
    currentServerId: nextServerId,
    frameworkState: 'ff_mode',
  })
  
  return seekTime
}
```

---

## Phase 4: Shot Detail Phase (Per Set)

**Goal:** Scope Part 2 to work per-set rather than full match.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 4.1 | Add `endSet` action that transitions to `shot_detail` | High | Low |
| 4.2 | Scope `activeRallyIndex` to current set's rallies | High | Low |
| 4.3 | Add set completion detection | High | Medium |
| 4.4 | Add `startNextSet` action | High | Medium |

---

## Phase 5: Rally Review with Video Sync

**Goal:** Implement the end-of-rally review with looping video and synced highlights.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 5.1 | Create `RallyReviewSection` component | High | Medium |
| 5.2 | Implement constrained video loop (rally start → end) | High | Low |
| 5.3 | Add shot highlight sync based on `currentTime` | High | Medium |
| 5.4 | Add end-of-point time nudge (← →) | Medium | Low |
| 5.5 | Add confirm button (Enter → next rally) | High | Low |

### Rally Review Component

```typescript
interface RallyReviewSectionProps {
  rally: Rally
  player1Name: string
  player2Name: string
  currentVideoTime: number
  onEndTimeNudge: (direction: 'earlier' | 'later') => void
  onConfirm: () => void
}

// Highlight logic
const getHighlightedShotIndex = (currentTime: number, contacts: Contact[]): number => {
  for (let i = contacts.length - 1; i >= 0; i--) {
    if (currentTime >= contacts[i].time) return i
  }
  return 0
}
```

---

## Phase 6: Persistence & Resume

**Goal:** Save rallies incrementally and support resuming.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 6.1 | Update Zustand persist to save per-rally | High | Low |
| 6.2 | Add resume detection on page load | High | Medium |
| 6.3 | Create resume UI ("Continue from Rally X?") | Medium | Medium |
| 6.4 | Handle browser crash recovery | Medium | Low |

---

## Phase 7: Cleanup & Polish

**Goal:** Remove old code, polish UX.

### Tasks

| ID | Task | Priority | Complexity |
|----|------|----------|------------|
| 7.1 | Remove old Part 1 batch mode code | Medium | Medium |
| 7.2 | Remove `showWinnerDialog` (not needed in new flow) | Low | Low |
| 7.3 | Update keyboard shortcut help | Low | Low |
| 7.4 | Add loading states for saves | Low | Low |
| 7.5 | Test full flow end-to-end | High | Medium |

---

## Implementation Order

```
Phase 1 (Core State Machine)
    │
    ├── Must complete before any other phase
    │
    ▼
Phase 2 (Checkpoint UI) ──────────┐
    │                             │
    ▼                             │
Phase 3 (Timeline Updates) ───────┤
    │                             │
    ▼                             │
Phase 4 (Shot Detail Per-Set) ────┤ Can be parallelized
    │                             │
    ▼                             │
Phase 5 (Rally Review Sync) ──────┘
    │
    ▼
Phase 6 (Persistence)
    │
    ▼
Phase 7 (Cleanup)
```

---

## Task Checklist

### Phase 1: Core State Machine
- [ ] 1.1 Add `frameworkState` to store
- [ ] 1.2 Add state transition actions
- [ ] 1.3 Refactor `addContact` to only work in `tagging` state
- [ ] 1.4 Refactor `endRallyScore` to transition to `checkpoint` state
- [ ] 1.5 Add `confirmRally` action
- [ ] 1.6 Add `redoCurrentRally` action
- [ ] 1.7 Refactor `startNewRallyWithServe` to transition to `tagging`
- [ ] 1.8 Add `endSet` action

### Phase 2: Checkpoint UI
- [ ] 2.1 Create `CheckpointSection` component
- [ ] 2.2 Add checkpoint keyboard handlers
- [ ] 2.3 Update `TaggingScreenComposer` for checkpoint
- [ ] 2.4 Add rally preview visualization

### Phase 3: Timeline Panel Updates
- [ ] 3.1 Add `frameworkConfirmed` visual state
- [ ] 3.2 Add "Redo from here" context menu
- [ ] 3.3 Implement `redoFromRally(rallyId)` action
- [ ] 3.4 Add click-to-seek on locked rallies

### Phase 4: Shot Detail Per-Set
- [ ] 4.1 Add `endSet` transition to `shot_detail`
- [ ] 4.2 Scope `activeRallyIndex` to current set
- [ ] 4.3 Add set completion detection
- [ ] 4.4 Add `startNextSet` action

### Phase 5: Rally Review with Video Sync
- [ ] 5.1 Create `RallyReviewSection` component
- [ ] 5.2 Implement constrained video loop
- [ ] 5.3 Add shot highlight sync
- [ ] 5.4 Add end-of-point time nudge
- [ ] 5.5 Add confirm button

### Phase 6: Persistence & Resume
- [ ] 6.1 Update persist for per-rally save
- [ ] 6.2 Add resume detection
- [ ] 6.3 Create resume UI
- [ ] 6.4 Handle crash recovery

### Phase 7: Cleanup & Polish
- [ ] 7.1 Remove old Part 1 batch mode
- [ ] 7.2 Remove `showWinnerDialog`
- [ ] 7.3 Update keyboard help
- [ ] 7.4 Add loading states
- [ ] 7.5 Full end-to-end test

---

## Estimated Effort

| Phase | Tasks | Est. Hours |
|-------|-------|------------|
| Phase 1 | 8 | 4-6 |
| Phase 2 | 4 | 3-4 |
| Phase 3 | 4 | 3-4 |
| Phase 4 | 4 | 2-3 |
| Phase 5 | 5 | 4-5 |
| Phase 6 | 4 | 2-3 |
| Phase 7 | 5 | 2-3 |
| **Total** | **34** | **20-28** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| State machine complexity | Keep states minimal, test transitions |
| Video seek accuracy | Use ±100ms tolerance, test on real videos |
| Data loss on crash | Zustand persist handles this, test recovery |
| Migration from old flow | Keep old code until new flow proven, then delete |

---

## Files to Create

```
app/src/features/tagging/
├── sections/
│   ├── CheckpointSection.tsx      (NEW - Phase 2)
│   └── RallyReviewSection.tsx     (NEW - Phase 5)
├── derive/
│   └── deriveFrameworkState.ts    (NEW - Phase 1)
```

## Files to Modify

```
app/src/stores/taggingStore.ts     (Phase 1, 3, 4, 6)
app/src/features/tagging/
├── composers/
│   └── TaggingScreenComposer.tsx  (Phase 2, 3, 4, 5)
├── sections/
│   └── MatchTimelinePanelSection.tsx (Phase 3)
```

---

*Ready to begin implementation. Start with Phase 1.*















