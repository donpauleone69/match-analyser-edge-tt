# MVP Descope: Full Sets Only

**Date:** 2025-12-02  
**Status:** Decision Made ✓

---

## Context

During testing, we identified complexity around:
- Mid-set starting (arbitrary initial scores)
- Server calculation at deuce without knowing score
- Set-end detection
- Partial video coverage

Counter-argument raised: Real-world data is messy (wrong winners tagged, out-of-order serves). System should be flexible, not dictatorial.

---

## Decision: Full Sets Only

**NOT** "Full Match Only" (too restrictive)  
**NOT** "Start anywhere" (too complex)  
**YES** "Full Sets Only" with incomplete set support

---

## The Model

```
Match Structure:
├── Set 1: COMPLETE (all rallies tagged) or INCOMPLETE (just result)
├── Set 2: COMPLETE or INCOMPLETE  
├── Set 3: COMPLETE or INCOMPLETE
├── Set 4: COMPLETE or INCOMPLETE
└── Set 5: COMPLETE or INCOMPLETE (if needed)
```

### Two Types of Sets

| Type | Data | Source |
|------|------|--------|
| **Complete Set** | All rallies, all shots, all winners | Derived from tagging |
| **Incomplete Set** | Winner + optional score (e.g., 11-8) | User input |

---

## Use Cases

### Camera died at the end
```
Set 1: Complete ✓ (fully tagged)
Set 2: Complete ✓ (fully tagged)
Set 3: Complete ✓ (fully tagged)
Set 4: Incomplete → User enters: "Player 2 won 11-6"
Match Result: 3-1 to Player 2
```

### Video starts mid-match
```
Set 1: Incomplete → User enters: "Player 1 won 11-8"
Set 2: Complete ✓ (fully tagged)
Set 3: Complete ✓ (fully tagged)
Set 4: Complete ✓ (fully tagged)
Match Result: 3-1 to Player 1
```

### Both ends incomplete
```
Set 1: Incomplete → "Player 1 won 11-9"
Set 2: Complete ✓
Set 3: Complete ✓
Set 4: Incomplete → "Player 2 won 11-7"
Match Result: 2-2 (incomplete match data)
```

---

## What This Simplifies

| Removed Complexity | Reason |
|--------------------|--------|
| Mid-set starting scores | Sets always start at 0-0 |
| `player1StartPoints`, `player2StartPoints` | Not needed |
| Complex server offset calculation | Rally count works within set |
| Partial video coverage option | Either complete or incomplete set |

---

## What Stays Flexible

| Feature | Behavior |
|---------|----------|
| Server derivation | Derive from rally count, allow override |
| Score tracking | Derive from winners, allow correction |
| Set end | Suggest at 11 points, user confirms |
| Match end | Derive from set winners |

---

## Data Model Changes Needed

```typescript
interface Game {
  id: string
  gameNumber: number
  
  // Existing (for complete sets)
  rallies?: Rally[]
  player1FinalScore?: number
  player2FinalScore?: number
  
  // NEW
  isComplete: boolean  // false = user-entered result only
  winnerId?: PlayerId  // Required for incomplete sets
}
```

---

## UI Flow Changes

1. **Match Setup:**
   - Player names, first server, match format
   - "Which set does the video start in?" → dropdown
   - If not Set 1: Enter results for prior incomplete sets

2. **Part 1 Tagging:**
   - Tag complete sets normally
   - "Mark set as incomplete" option when video ends mid-set

3. **Match Completion:**
   - Prompt for results of any incomplete sets
   - Calculate and display final match score

---

## Philosophy

> We're tagging what happened in the VIDEO, not enforcing game rules.

- Derive server/score as helpful defaults
- Allow override when reality differs
- Don't block user from tagging reality
- Optionally warn about rule mismatches (but don't prevent)

---

## Next Steps

- [ ] Implement data model changes for `isComplete` flag
- [ ] Update Match Setup UI for set selection
- [ ] Add "Mark set as incomplete" flow
- [ ] Add incomplete set result entry
- [ ] Remove mid-set starting fields
- [ ] Update set-end detection to work with complete sets

---

*This descope balances simplicity with real-world flexibility.*

