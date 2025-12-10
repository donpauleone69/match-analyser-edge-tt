# Complete Bug Analysis - All Bugs Found and Fixed

**Date:** December 8, 2025  
**Status:** 7 CRITICAL BUGS FIXED

## Summary

The shot_result/shot_quality split introduced cascading bugs because the type system change wasn't propagated everywhere. Here's every bug found through deep analysis:

---

## Bug 1: Phase 1 Winner Derivation Using Old Value ⚠️ CRITICAL

**File:** `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` (line 245)

**Problem:**
```typescript
const shotResult = 
  endCondition === 'innet' ? 'in_net' :
  endCondition === 'long' ? 'missed_long' :
  'good' // ❌ OLD VALUE!
```

**Impact:** Winner rallies had WRONG winner because `deriveRally_winner_id()` checks `shot_result !== 'in_play'`, and `'good' !== 'in_play'` = TRUE, so it thought winner shots were errors!

**Fix:** Changed `'good'` → `'in_play'`

---

## Bug 2: Phase 2 Shot Matching By Index Only ⚠️ CRITICAL

**File:** `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

**Problem:**
```typescript
const matchingShot = rallyShots.find(s => 
  s.shot_index === shot.shotIndex  // ❌ Doesn't check rally!
)
```

**Impact:** When tagging Rally 2 Shot 3, it would find and update Rally 1 Shot 3! All rallies' data got cross-contaminated.

**Fix:** Added rally_id check:
```typescript
const matchingShot = rallyShots.find(s => 
  s.rally_id === shot.rallyId && s.shot_index === shot.shotIndex
)
```

---

## Bug 3: Phase 1 Not Setting is_rally_end and rally_end_role ⚠️ CRITICAL

**File:** `app/src/features/shot-tagging-engine/composers/dataMapping.ts` (mapPhase1ShotToDBShot)

**Problem:**
```typescript
is_rally_end: false, // ❌ Hardcoded!
rally_end_role: 'none', // ❌ Hardcoded!
```

**Impact:** ALL shots had `is_rally_end = false` and `rally_end_role = 'none'`, breaking winner derivation and point_end_type.

**Fix:** Properly set based on rally end condition:
```typescript
is_rally_end: isLastShot,
rally_end_role: rallyEndRole, // Derived from endCondition and shot_index
```

---

## Bug 4: isError Set for ALL Shots in Error Rally ⚠️ MAJOR

**File:** `app/src/features/shot-tagging-engine/composers/dataMapping.ts` (convertDBShotToDetailedShot, line 585)

**Problem:**
```typescript
isError: !rally.is_scoring,  // ❌ True for ALL shots in error rally!
```

**Impact:** For a 3-shot error rally, shots 1, 2, AND 3 all had `isError = true`. This could cause errorType question to be asked multiple times and interfere with save logic.

**Fix:** Only rally-ending shot is error shot:
```typescript
isError: !rally.is_scoring && dbShot.is_rally_end,
```

---

## Bug 5: Tactical Stats Using shot_result Instead of shot_quality

**File:** `app/src/rules/stats/tacticalStats.ts` (line 66)

**Problem:**
```typescript
if (s.shot_result !== 'good') return false  // ❌ Wrong field!
```

**Impact:** Forced error stats calculated incorrectly.

**Fix:**
```typescript
if (s.shot_quality !== 'high') return false
```

---

## Bug 6: Movement Inference Using shot_result (Instance 1)

**File:** `app/src/rules/infer/rally-patterns/inferMovement.ts` (line 68)

**Problem:**
```typescript
const successful = currentShot.shot_result === 'good' ||  // ❌ Wrong field!
                   currentShot.rally_end_role === 'winner'
```

**Impact:** Pivot success rate calculated incorrectly.

**Fix:**
```typescript
const successful = currentShot.shot_quality === 'high' ||
                   currentShot.rally_end_role === 'winner'
```

---

## Bug 7: Movement Inference Using shot_result (Instance 2)

**File:** `app/src/rules/infer/rally-patterns/inferMovement.ts` (line 234)

**Problem:**
```typescript
} else if (positionRecovered && currentShot.shot_result === 'good') {  // ❌
  quality = 'excellent'
}
```

**Impact:** Recovery quality assessment wrong.

**Fix:**
```typescript
} else if (positionRecovered && currentShot.shot_quality === 'high') {
  quality = 'excellent'
}
```

---

## Root Cause Analysis

The fundamental issue: **Type system changes weren't propagated consistently**.

When splitting `ShotResult` into two types, I updated:
- ✅ Type definitions
- ✅ Phase 1 shot creation (mapPhase1ShotToDBShot)
- ✅ Phase 2 data mapping (mapPhase2DetailToDBShot)
- ✅ Most inference functions

But MISSED:
- ❌ Phase 1 winner derivation (still using 'good')
- ❌ Phase 2 shot matching (wrong logic)
- ❌ Phase 1 rally-end field setting (not implemented)
- ❌ DetailedShot construction (isError logic)
- ❌ 3 inference functions (still checking shot_result === 'good')

---

## Testing After All Fixes

**Expected Results:**

### Phase 1:
- Rally 1 (Winner): ✅ Correct winner shown
- Rally 2 (In-Net): ✅ Correct winner shown
- Rally 3 (Long): ✅ Correct winner shown

### Database After Phase 1:
- Rally 1, Shot 3: `shot_result='in_play'`, `rally_end_role='winner'`, `is_rally_end=true`
- Rally 2, Shot 3: `shot_result='in_net'`, `rally_end_role='none'`, `is_rally_end=true`
- Rally 3, Shot 3: `shot_result='missed_long'`, `rally_end_role='none'`, `is_rally_end=true`

### Database After Phase 2:
- Rally 1, Shot 3: `rally_end_role='winner'` (unchanged)
- Rally 2, Shot 3: `rally_end_role='unforced_error'` (updated from 'none')
- Rally 3, Shot 3: `rally_end_role='forced_error'` (updated from 'none')

---

## Files Modified (Total: 21 files)

All original implementation files PLUS:
- Phase1TimestampComposer.tsx (winner derivation fix)
- Phase2DetailComposer.tsx (shot matching fix)
- dataMapping.ts (is_rally_end, rally_end_role, isError fixes)
- tacticalStats.ts (shot_quality fix)
- inferMovement.ts (2x shot_quality fixes)

---

## Lessons Learned

1. **Type changes require comprehensive grep**: Search for ALL old values
2. **Test cross-rally scenarios**: Bugs only appeared with multiple rallies
3. **Deep analysis beats quick fixes**: Finding all 7 bugs required systematic review
4. **Field semantics matter**: isError should check individual shot, not whole rally
5. **Debug logging is essential**: Console logs revealed the actual data flow

---

## Status: READY FOR TESTING

All 7 bugs are now fixed. Please test with the full 3-rally scenario!

