# Spec: Rally Checkpoint Flow

**Date:** 2025-12-02  
**Status:** Specified ✓

---

## Overview

A new tagging flow that processes matches **set by set**, with **rally-by-rally checkpoints** during the framework phase. Each rally is confirmed before moving to the next, enabling easy error correction and incremental saves.

---

## Philosophy

1. **Set by Set:** Complete one set fully (framework + shot detail) before moving to next
2. **Rally Checkpoints:** Confirm each rally's framework before proceeding
3. **Easy Redo:** One key to retry current rally, click to go back further
4. **Incremental Save:** Each confirmed rally saved to database immediately
5. **No Score Until Part 2:** Score derived from winners, not tracked during framework

---

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SET 1                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ FRAMEWORK PHASE                                             │ │
│ │ Rally 1: Mark → Checkpoint → Confirm ✓                      │ │
│ │ Rally 2: Mark → Checkpoint → Confirm ✓                      │ │
│ │ Rally 3: Mark → Checkpoint → Confirm ✓                      │ │
│ │ ...                                                         │ │
│ │ Rally N: Mark → Checkpoint → End Set                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SHOT DETAIL PHASE                                           │ │
│ │ Rally 1: Serve questions → Shot 2 → Shot 3 → Winner         │ │
│ │ Rally 2: Serve questions → Shot 2 → Winner                  │ │
│ │ ...                                                         │ │
│ │ Rally N: Complete → Set 1 Done ✓                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ SET 2                                                           │
│ ... same pattern ...                                            │
├─────────────────────────────────────────────────────────────────┤
│ MATCH COMPLETE                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Framework Phase (Per Set)

### Per-Rally Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TAGGING MODE                                             │
│    - Video playing at tagging speed (0.5x)                  │
│    - Space → mark contact                                   │
│    - → → end rally (marks end-of-point time, pauses video)  │
├─────────────────────────────────────────────────────────────┤
│ 2. CHECKPOINT                                               │
│    - Video paused                                           │
│    - Show: Rally X • N contacts • Server: [derived]         │
│    - Options:                                               │
│      - Enter → Confirm & Save → FF mode                     │
│      - Backspace → Redo this rally                          │
│      - Click earlier rally → Redo from there                │
├─────────────────────────────────────────────────────────────┤
│ 3a. ON CONFIRM                                              │
│     - Save rally to database (empty container)              │
│     - Lock rally in timeline                                │
│     - Enter FF mode to find next serve                      │
├─────────────────────────────────────────────────────────────┤
│ 3b. ON REDO - Backspace (current rally)                     │
│     - Clear current rally contacts                          │
│     - Seek to previous rally's end-of-point                 │
│     - Enter FF mode (waiting for Space)                     │
├─────────────────────────────────────────────────────────────┤
│ 3c. ON REDO FROM RALLY X (multi-checkpoint)                 │
│     - Confirm: "Delete rallies X through current?"          │
│     - Delete rallies from X onward                          │
│     - Seek to Rally (X-1) end-of-point                      │
│     - Enter FF mode                                         │
├─────────────────────────────────────────────────────────────┤
│ 4. FF MODE                                                  │
│    - Video playing at FF speed (1-5x)                       │
│    - Space → mark serve, start next rally tagging           │
│    - E → end set (move to shot detail phase)                │
└─────────────────────────────────────────────────────────────┘
```

### Keyboard Summary (Framework Phase)

| State | Key | Action |
|-------|-----|--------|
| Tagging | `Space` | Mark contact |
| Tagging | `→` | End rally → Checkpoint |
| Checkpoint | `Enter` | Confirm → Save → FF mode |
| Checkpoint | `Backspace` | Redo current rally |
| FF Mode | `Space` | Mark serve → Start next rally |
| FF Mode | `E` | End set → Shot detail phase |
| FF Mode | `←` | Decrease FF speed |
| FF Mode | `→` | Increase FF speed |

---

## Checkpoint UI

```
┌───────────────────────────────────────────────────────────┐
│ RALLY 7 CHECKPOINT                                        │
│                                                           │
│ Contacts: 4                                               │
│ Server: Paul (derived)                                    │
│ Duration: 1.7 seconds                                     │
│                                                           │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Timeline Preview                                      │ │
│ │ 0:45.2 ──●──●──●──●── 0:46.9                         │ │
│ │         S  2  3  4    End                             │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                           │
│   [ ↺ Redo (Backspace) ]      [ ✓ Confirm (Enter) ]      │
└───────────────────────────────────────────────────────────┘
```

---

## Timeline Panel (Framework Phase)

```
┌─────────────────────────────────┐
│ Set 1 • Framework               │
│ Paul vs Ethan                   │
├─────────────────────────────────┤
│ ✓ Rally 1   3 shots   Paul      │ ← Confirmed (locked)
│ ✓ Rally 2   5 shots   Ethan     │ ← Confirmed (locked)
│ ✓ Rally 3   2 shots   Paul      │ ← Confirmed (locked)
│ ✓ Rally 4   4 shots   Ethan     │ ← Confirmed (locked)
│ ✓ Rally 5   3 shots   Paul      │ ← Confirmed (locked)
│ ✓ Rally 6   6 shots   Ethan     │ ← Click → "Redo from here?"
│ ▶ Rally 7   4 shots   Paul      │ ← AT CHECKPOINT
│   ├── 0:45.2 Serve              │
│   ├── 0:45.6 Shot 2             │
│   ├── 0:46.1 Shot 3             │
│   ├── 0:46.4 Shot 4             │
│   └── 0:46.9 [End]              │
├─────────────────────────────────┤
│ Rallies: 7 confirmed            │
└─────────────────────────────────┘
```

### Timeline Interactions

| Action | Result |
|--------|--------|
| Click confirmed rally | Seek video to rally start (view only) |
| Right-click confirmed rally | Context menu: "Redo from here" |
| Click current rally contact | Seek video to that timestamp |

---

## Shot Detail Phase (Per Set)

After all rallies in a set are framework-confirmed:

```
┌─────────────────────────────────────────────────────────────┐
│ SET 1 • SHOT DETAIL                                         │
│                                                             │
│ For each rally (sequential):                                │
│                                                             │
│ 1. Video loops on current shot                              │
│ 2. Answer questions:                                        │
│    - Serve: Type → Spin → Quality → Landing (if not error)  │
│    - Rally: Wing → Type → Quality → Landing (if not error)  │
│ 3. On error: Derive winner, ask forced/unforced if needed   │
│ 4. After last shot: End of Rally confirmation               │
│ 5. Next rally                                               │
│                                                             │
│ After all rallies: Set complete                             │
└─────────────────────────────────────────────────────────────┘
```

### End of Rally (Shot Detail Phase)

**Key Feature:** Video loops the full rally while shot descriptions highlight in sync.

```
┌───────────────────────────────────────────────────────────┐
│ RALLY 7 COMPLETE                                          │
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │                                                       │ │
│ │              🎬 VIDEO PLAYER                          │ │
│ │         (Rally loops: 0:45.2 → 0:46.9)               │ │
│ │                                                       │ │
│ └───────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────┤
│ Server:  Paul              Winner:  Ethan                 │
│ Shots:   4                 (Paul missed wide - unforced)  │
├───────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Shot 1  Serve   Pendulum ↙  Good   FH Long            │ │◄─┐
│ │ Shot 2  Return  BH Push     Avg    BH Mid             │ │  │
│ │ Shot 3  FH Loop            Good   FH Long            │ │  │ Highlights
│ │ Shot 4  BH Block           Wide   -                  │ │  │ in sync
│ └───────────────────────────────────────────────────────┘ │◄─┘ with video
│                                                           │
│ End of Point: 0:46.9  [← →] to nudge                      │
│                                                           │
│              [ ✓ Confirm → Next Rally (Enter) ]           │
└───────────────────────────────────────────────────────────┘
```

**Sync Behavior:**
- Video plays from rally start to end-of-point, then loops
- As video plays, current shot row highlights (based on contact timestamps)
- User can see video and corresponding shot data together
- Easy to spot errors: "That wasn't a push, it was a flick"
- Rally loops until user presses Enter to confirm

---

## Data Model

### Rally (Framework - Empty Container)

```typescript
interface Rally {
  id: string
  matchId: string
  setNumber: number
  rallyIndex: number  // Derived from position, not stored
  
  // Framework data (saved at checkpoint)
  contacts: Contact[]
  endOfPointTime: number
  serverId: PlayerId  // Derived from rally count
  receiverId: PlayerId
  
  // Shot detail data (filled in Part 2)
  winnerId?: PlayerId
  pointEndType?: PointEndType
  
  // Status
  frameworkConfirmed: boolean
  detailComplete: boolean
}

interface Contact {
  id: string
  rallyId: string
  time: number
  shotIndex: number
  
  // Shot detail (filled in Part 2)
  playerId?: PlayerId
  serveType?: ServeType
  serveSpin?: ServeSpin
  wing?: 'FH' | 'BH'
  shotType?: ShotType
  shotQuality?: ShotQuality
  landingZone?: LandingZone
}
```

### Set

```typescript
interface GameSet {
  id: string
  matchId: string
  setNumber: number
  
  // Status
  frameworkComplete: boolean  // All rallies confirmed
  detailComplete: boolean     // All shot details entered
  
  // Result (derived or entered for incomplete sets)
  isComplete: boolean  // false = manually entered result
  winnerId?: PlayerId
  player1FinalScore?: number
  player2FinalScore?: number
}
```

---

## Implementation Complexity

### Low Complexity
- Core tagging flow (same as current)
- Checkpoint UI (pause + buttons)
- Single rally redo
- FF mode (exists)

### Medium Complexity
- Rally index derivation (derive from array position)
- Server recalculation after redo
- Timeline locked/current state management

### Addressed by Design
- **Score tracking:** Deferred to Part 2 (not needed in framework)
- **Set boundaries:** Stored on set, cleared if rallies deleted
- **Multi-checkpoint redo:** Same as single, just delete more rallies

### Edge Cases
| Case | Handling |
|------|----------|
| Video ends during FF | "End of video" prompt |
| Redo from Rally 1 | Seek to first serve timestamp |
| Set boundary crossed by redo | Clear set boundary, user re-marks |
| Browser crash | Resume from last confirmed rally |

---

## State Machine

```
                         ┌─────────────┐
                         │   SETUP     │
                         └──────┬──────┘
                                │ Mark first serve
                                ▼
        ┌──────────────────────────────────────────┐
        │                                          │
        │    ┌─────────────┐                       │
        │    │   TAGGING   │◄──────────────┐      │
        │    └──────┬──────┘               │      │
        │           │ → (end rally)        │      │
        │           ▼                      │      │
│    ┌─────────────┐               │      │
│    │ CHECKPOINT  │───────────────┤      │
│    └──────┬──────┘ Backspace     │      │
        │           │                      │      │
        │           │ Enter (confirm)      │      │
        │           ▼                      │      │
        │    ┌─────────────┐               │      │
        │    │    SAVE     │               │      │
        │    └──────┬──────┘               │      │
        │           │                      │      │
        │           ▼                      │      │
        │    ┌─────────────┐               │      │
        │    │  FF MODE    │───────────────┘      │
        │    └──────┬──────┘  Space (serve)       │
        │           │                              │
        │           │ E (end set)                  │
        │           ▼                              │
        │    ┌─────────────┐                       │
        │    │SHOT DETAIL  │                       │
        │    │  (Part 2)   │                       │
        │    └──────┬──────┘                       │
        │           │ Set complete                 │
        │           ▼                              │
        │    ┌─────────────┐                       │
        │    │ NEXT SET    │───────────────────────┘
        │    │ or COMPLETE │
        │    └─────────────┘
        │
        └──── SET LOOP ────────────────────────────
```

---

## Benefits Summary

| Benefit | How |
|---------|-----|
| **Error prevention** | Checkpoint after each rally |
| **Easy correction** | R to redo, click for multi-redo |
| **Progress saved** | Each confirm = database save |
| **Resumable** | Pick up from last checkpoint |
| **Practice runs** | Redo = watch again, mark better |
| **Clean data** | Errors caught early, not accumulated |
| **Set isolation** | Complete one set fully before next |

---

## Migration from Current Flow

1. Remove Part 1 "batch all rallies" mode
2. Add checkpoint state after each rally end
3. Add rally-level save on confirm
4. Update timeline to show locked vs current
5. Add redo functionality (single + multi)
6. Keep Part 2 mostly unchanged (per-set scope)

---

*This flow prioritizes accuracy over speed, making it ideal for MVP where correct data matters more than tagging velocity.*

