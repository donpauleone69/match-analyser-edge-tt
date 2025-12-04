# Part 1 Tagging Flow - Architecture Analysis

**STATUS: RESOLVED** (2025-12-02)

## Problem Statement

Four critical bugs existed in the Part 1 tagging workflow:

1. **Double-counting serves**: When marking a serve in FF mode, the serve appears in TWO rallies
2. **End of point issues**: No way to edit end-of-point time, set forced/unforced, or determine winner properly

## Root Cause Analysis

### Bug 1: Double-Counting Serves

**Trace through the code:**

1. **Mark First Serve** (`initMatchFramework`):
   - Creates first contact
   - Adds to `currentRallyContacts: [firstContact]`
   - Does NOT create rally ✓

2. **Add Contacts** (`addContact`):
   - Creates new contact
   - Adds to `currentRallyContacts` ✓

3. **End Rally** (`endRallyScore`):
   - Creates rally from `currentRallyContacts`
   - Clears `currentRallyContacts` ✓
   - User enters FF mode

4. **Mark Serve in FF Mode** (`startNewRallyWithServe`) — **THE BUG**:
   ```typescript
   // Creates NEW rally immediately
   const newRally: Rally = { ..., contacts: [serveContact] }
   
   set({
     rallies: [...rallies, newRally],  // Rally N+1 created HERE
     contacts: [...get().contacts, serveContact],
     currentRallyContacts: [serveContact],  // Also added HERE
   })
   ```

5. **Add more contacts** (`addContact`):
   - Adds to `currentRallyContacts` which already has the serve

6. **End Rally** (`endRallyScore`):
   - Creates ANOTHER rally from `currentRallyContacts`
   - This rally ALSO contains the serve from step 4

**Result**: The serve exists in:
- Rally N+1 (created by `startNewRallyWithServe`)
- Rally N+2 (created by `endRallyScore`)

### Bug 2: End of Point Issues

The Part 2 flow is incomplete:

1. **No End-of-Point step**: After tagging all shots, there's no step to:
   - Review/edit the end of point timestamp
   - Determine the rally winner
   - Handle forced/unforced error questions

2. **Missing winner derivation**: The winner should be derived from:
   - If last shot quality is error (inNet, missedLong, missedWide) → Other player wins
   - If error is on serve (shotIndex 1) and serve type is fault-capable → Service fault
   - If error is on return (shotIndex 2) → Receive error
   - Otherwise → Need to ask forced/unforced

## Correct Architecture

### Principle: Rallies are created ONLY when user ends them

```
┌─────────────────────────────────────────────────────────────────┐
│  currentRallyContacts  →  Rally (on end)  →  rallies[]         │
│  (working buffer)          (finalized)        (completed list)  │
└─────────────────────────────────────────────────────────────────┘
```

### Part 1 Flow (Correct)

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: Mark First Serve                                        │
│   → Add serve contact to currentRallyContacts                   │
│   → NO rally created                                            │
├─────────────────────────────────────────────────────────────────┤
│ Step 2: Add Contacts (Space key)                                │
│   → Add each contact to currentRallyContacts                    │
│   → NO rally created                                            │
├─────────────────────────────────────────────────────────────────┤
│ Step 3: End Rally (→ key)                                       │
│   → Create rally from currentRallyContacts                      │
│   → Add to rallies[]                                            │
│   → Clear currentRallyContacts                                  │
│   → Enter FF mode                                               │
├─────────────────────────────────────────────────────────────────┤
│ Step 4: Mark Next Serve (Space in FF mode)                      │
│   → Calculate next server based on score                        │
│   → Add serve contact to currentRallyContacts (now empty)       │
│   → Update currentServerId                                      │
│   → Exit FF mode                                                │
│   → NO rally created                                            │
├─────────────────────────────────────────────────────────────────┤
│ Repeat Steps 2-4 for each rally                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Part 2 Flow (Correct)

```
┌─────────────────────────────────────────────────────────────────┐
│ For each Rally:                                                 │
├─────────────────────────────────────────────────────────────────┤
│ For each Shot (Contact):                                        │
│   1. Wing (F/B) - if not serve                                  │
│   2. Shot Type (1-9)                                            │
│   3. Quality (G/A/W/N/L/D)                                      │
│      → If error: Skip landing, go to End of Rally step          │
│   4. Landing Zone (1-9) - if not error                          │
├─────────────────────────────────────────────────────────────────┤
│ After last shot OR after error shot:                            │
│   END OF RALLY STEP:                                            │
│   1. Show end-of-point timestamp (editable via ←→)              │
│   2. Derive winner from last shot quality:                      │
│      - Error quality → Other player wins                        │
│      - Service fault → Other player wins                        │
│      - Winner shot → Current player wins                        │
│   3. If error (not fault/receiverError): Ask forced/unforced    │
│   4. Display derived winner, allow override                     │
│   5. Confirm and move to next rally                             │
└─────────────────────────────────────────────────────────────────┘
```

## Required Code Changes

### 1. Fix `startNewRallyWithServe`

**Before (buggy):**
```typescript
startNewRallyWithServe: () => {
  // ... creates rally AND adds to currentRallyContacts
  const newRally = { ..., contacts: [serveContact] }
  set({
    rallies: [...rallies, newRally],
    currentRallyContacts: [serveContact],
  })
}
```

**After (correct):**
```typescript
startNewRallyWithServe: () => {
  // Calculate next server
  // Create serve contact
  // Add ONLY to currentRallyContacts
  // NO rally creation - that happens when user ends the rally
  set({
    currentRallyContacts: [serveContact],
    currentServerId: nextServerId,
  })
}
```

### 2. Add End-of-Rally step to Part 2

Add a new step after the last shot (or after error shot) that:
1. Displays the end-of-point timestamp
2. Allows editing via ←→ keys
3. Shows the derived winner
4. Asks forced/unforced if applicable
5. Allows winner override if needed

### 3. Rename for clarity

Consider renaming `startNewRallyWithServe` to `markServeForNextRally` to clarify that it doesn't create a rally.

