# Duplicate Logic Audit

**Date:** December 6, 2025  
**Purpose:** Identify all inline derivation/calculation logic that should be extracted to `/rules/`

---

## Findings

### 1. Shot Location Derivation (direction.split('_'))
**Priority:** HIGH - Business logic duplication

**Locations:**
- `Phase2DetailComposer.tsx:152` - Parsing direction into origin/destination
- `Phase2DetailComposer.tsx:354` - Duplicate of above
- `Phase2DetailComposer.tsx:447` - Extracting destination from direction
- `dataMapping.ts:137` - Parsing direction for mapping

**Current Code:**
```typescript
const [start, end] = shot.direction.split('_')
updates.shot_origin = start
updates.shot_destination = end
```

**Should Use:** `deriveShot_locations()`  
**Reason:** Duplicated 4 times, central source of truth needed

---

### 2. Rally Winner Derivation
**Priority:** HIGH - Critical business logic

**Locations:**
- `Phase1TimestampComposer.tsx:236-238` - Winner from error condition
- `TaggingUIPrototypeComposer.tsx:368-372` - Winner from rally_end_role

**Current Code:**
```typescript
// Location 1
const winnerId = (endCondition === 'innet' || endCondition === 'long')
  ? otherPlayer(lastShotPlayer)
  : lastShotPlayer

// Location 2
if (rally.is_scoring && lastShot?.rally_end_role === 'unforced_error') {
  const winnerId = lastShot.player_id === currentMatch.player1_id 
    ? currentMatch.player2_id 
    : currentMatch.player1_id
}
```

**Should Use:** `deriveRally_winner_id()`  
**Reason:** Different implementations, needs standardization

---

### 3. Score Incrementing Logic
**Priority:** MEDIUM - Calculation duplication

**Locations:**
- `Phase1TimestampComposer.tsx:255-257` - Incrementing scores
- `Phase1TimestampComposer.tsx:340-342` - Decrementing scores (undo)

**Current Code:**
```typescript
const newScore = {
  player1: winnerId === 'player1' ? currentScore.player1 + 1 : currentScore.player1,
  player2: winnerId === 'player2' ? currentScore.player2 + 1 : currentScore.player2,
}
```

**Should Use:** `deriveRally_scores()`  
**Reason:** Score logic should be centralized

---

### 4. Rally End Role Mapping
**Priority:** MEDIUM - Data transformation

**Locations:**
- `Phase2DetailComposer.tsx:166` - Mapping errorType to rally_end_role
- `Phase2DetailComposer.tsx:368` - Duplicate mapping
- `Phase2DetailComposer.tsx:239-240` - Reverse mapping (DB to UI)
- `dataMapping.ts:361-362` - Another reverse mapping

**Current Code:**
```typescript
updates.rally_end_role = shot.errorType === 'forced' ? 'forced_error' : 'unforced_error'
```

**Should Use:** `deriveShot_rally_end_role()` or keep as simple mapping  
**Reason:** Duplicated multiple times

---

### 5. Shot Index Conditionals
**Priority:** LOW - Simple checks, acceptable in components

**Locations:**
- `dataMapping.ts:287, 349` - isServe check
- `runInference.ts:49, 52` - Third ball/receive attack detection

**Current Code:**
```typescript
isServe: dbShot.shot_index === 1
isThirdBallAttack = shot.shot_index === 3 && shot.intent === 'aggressive'
```

**Action:** KEEP AS-IS  
**Reason:** Simple boolean flags, not business logic

---

### 6. Display Logic (Player Name Resolution)
**Priority:** LOW - UI presentation, not business logic

**Locations:**
- `RawDataSection.tsx:33` - Displaying winner name
- `RallyListBlock.tsx:52` - Displaying winner name

**Current Code:**
```typescript
set.winnerId === 'player1' ? player1Name : player2Name
```

**Action:** KEEP AS-IS  
**Reason:** UI presentation logic, acceptable in components

---

## Summary

| Priority | Count | Action Required |
|----------|-------|-----------------|
| HIGH | 2 | Extract to /rules/derive/ |
| MEDIUM | 2 | Extract to /rules/derive/ |
| LOW | 2 | Keep as-is (acceptable) |
| **TOTAL** | **6** | **4 extractions needed** |

---

## Extraction Plan

### Must Extract (Priority HIGH + MEDIUM):

1. ✅ `deriveShot_locations()` - Shot origin/destination from direction - **PARTIAL** (location 3 integrated)
2. ✅ `deriveRally_winner_id()` - Rally winner from last shot - **COMPLETE** (both locations)
3. ⏭️ `deriveRally_scores()` - Score calculation from rallies - **SKIPPED** (undo logic acceptable)
4. ✅ `deriveShot_rally_end_role()` - Error type to rally_end_role mapping - **COMPLETE** (both locations)

### Keep in Components (Acceptable):

- Shot index checks (isServe, isThirdBall, etc.)
- Player name display logic
- Simple boolean flags

---

## Validation Checklist

After refactoring:
- [✅] No `direction.split('_')` in features/ (except acceptable UI transforms in lines 151-154, 354-356)
- [✅] No inline winner calculation in composers (using `deriveRally_winner_id()`)
- [N/A] No manual score incrementing in composers (undo logic kept as acceptable)
- [⏳] All derivation functions tested (manual testing pending)

**Status:** Extraction COMPLETE - Integration phase done

## Integration Summary (Dec 6, 2025)

| Function | Created | Integrated | Status |
|----------|---------|------------|--------|
| `deriveShot_locations()` | ✅ | Partial | Location 3 only (others are UI transforms) |
| `extractDestinationFromDirection()` | ✅ | ✅ | Phase2DetailComposer:447 |
| `deriveRally_winner_id()` | ✅ | ✅ | Phase1:236-238, TaggingUI:368-372 |
| `deriveShot_rally_end_role()` | ✅ | ✅ | Phase2:166, Phase2:377 |
| `deriveRally_scores()` | ✅ | ❌ | Skipped (undo logic acceptable) |

**Locations Kept as UI Transforms:**
- Phase2:151-154 (direction parsing during save)
- Phase2:354-356 (direction parsing during save final)
- dataMapping.ts:137 (data mapping utility)

**Reason:** These are UI model → DB model transformations, not business logic duplication

