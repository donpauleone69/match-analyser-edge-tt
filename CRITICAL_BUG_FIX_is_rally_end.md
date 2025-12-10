# CRITICAL BUG FIX: is_rally_end and rally_end_role Not Set in Phase 1

**Date:** December 8, 2025  
**Status:** FIXED

## Bug Description

After implementing the shot_result/shot_quality split, the `is_rally_end` and `rally_end_role` fields were not being properly set in Phase 1. This caused cascading failures in the database:

### Symptoms (User Reported)

**Test 1: Winner Rally**
- UI: ❌ Showed incorrect winner
- DB: ✅ shot_result = 'in_play' (correct)
- DB: ❌ rally_end_role = 'none' (should be 'winner')

**Test 2: In-Net Rally** 
- UI: ✅ Showed correct winner and "in net"
- DB: ❌ shot_result = 'in_play' (should be 'in_net')
- DB: ❌ rally_end_role = 'none' (should be 'unforced_error' after Phase 2, or 'service_fault'/'receive_error' if shot 1 or 2)
- DB: ❌ point_end_type = null (should be set based on rally_end_role)

**Test 3: Long Rally (Forced Error)**
- UI: ✅ Showed correct winner and "long"  
- DB: ❌ shot_result = 'in_play' (should be 'missed_long')
- DB: ❌ rally_end_role = 'none' (should be 'forced_error')
- DB: ✅ is_rally_end = true (correct)
- DB: ❌ point_end_type = null (should be 'forcedError')

## Root Cause

In `mapPhase1ShotToDBShot()` function, the fields were hardcoded:

```typescript
// BEFORE (BROKEN)
return {
  // ...
  is_rally_end: false, // Will be set for last shot ❌ BUT WE NEVER SET IT!
  rally_end_role: 'none', // ❌ ALWAYS 'none' - never updated!
}
```

**The comment said "Will be set for last shot" but we never actually set it!**

This meant:
- ALL shots (including rally-ending shots) had `is_rally_end = false`
- ALL shots had `rally_end_role = 'none'`
- This broke winner derivation (which relies on rally_end_role)
- This broke point_end_type derivation (which also relies on rally_end_role)

## The Fix

Updated `mapPhase1ShotToDBShot()` to properly set these fields based on rally end condition:

```typescript
// AFTER (FIXED)
export function mapPhase1ShotToDBShot(
  shot: Phase1Shot,
  rallyId: string,
  playerId: string,
  isLastShot: boolean,
  rallyEndCondition: EndCondition
): NewShot {
  let shotResult: 'in_net' | 'missed_long' | 'in_play' = 'in_play'
  let rallyEndRole: RallyEndRole = 'none'
  
  if (isLastShot) {
    if (rallyEndCondition === 'innet') {
      shotResult = 'in_net'
      // Determine rally_end_role based on shot index
      if (shot.shotIndex === 1) {
        rallyEndRole = 'service_fault'
      } else if (shot.shotIndex === 2) {
        rallyEndRole = 'receive_error'
      }
      // Shot 3+ leaves as 'none' - will be set in Phase 2 when errorType captured
    } else if (rallyEndCondition === 'long') {
      shotResult = 'missed_long'
      if (shot.shotIndex === 1) {
        rallyEndRole = 'service_fault'
      } else if (shot.shotIndex === 2) {
        rallyEndRole = 'receive_error'
      }
    } else if (rallyEndCondition === 'winner') {
      shotResult = 'in_play'
      rallyEndRole = 'winner' // Winner shot - opponent couldn't return
    }
  }
  
  return {
    // ...
    is_rally_end: isLastShot, // ✅ TRUE for last shot, FALSE for others
    rally_end_role: rallyEndRole, // ✅ Set based on end condition and shot index
  }
}
```

## Logic Flow (Fixed)

### Phase 1: Set Initial Values

**For Winner Rallies (endCondition = 'winner'):**
- Last shot: `shot_result = 'in_play'`, `rally_end_role = 'winner'`, `is_rally_end = true`
- Other shots: `shot_result = 'in_play'`, `rally_end_role = 'none'`, `is_rally_end = false`

**For Error Rallies (endCondition = 'innet' or 'long'):**

*Shot 1 (Serve):*
- `shot_result = 'in_net'` or `'missed_long'`
- `rally_end_role = 'service_fault'`
- `is_rally_end = true`

*Shot 2 (Receive):*
- `shot_result = 'in_net'` or `'missed_long'`
- `rally_end_role = 'receive_error'`  
- `is_rally_end = true`

*Shot 3+ (Rally):*
- `shot_result = 'in_net'` or `'missed_long'`
- `rally_end_role = 'none'` (will be updated in Phase 2)
- `is_rally_end = true`

### Phase 2: Update rally_end_role for Shot 3+ Errors

If shot 3+ has an error (`shot_result !== 'in_play'`) and user answers errorType:
- `rally_end_role = 'forced_error'` (if errorType = 'forced')
- `rally_end_role = 'unforced_error'` (if errorType = 'unforced')

## Expected Results After Fix

**Test 1: Winner Rally (Serve, Shot, Shot → Winner)**
- Last shot: `shot_result = 'in_play'` ✅
- Last shot: `rally_end_role = 'winner'` ✅
- Last shot: `is_rally_end = true` ✅
- Rally: `point_end_type = 'winnerShot'` ✅
- Rally: Correct winner derived ✅

**Test 2: Error Rally Shot 3 In-Net → Unforced**
- Last shot: `shot_result = 'in_net'` ✅
- Last shot: `rally_end_role = 'none'` initially ✅
- After Phase 2: `rally_end_role = 'unforced_error'` ✅
- Rally: `point_end_type = 'unforcedError'` ✅

**Test 3: Error Rally Shot 3 Long → Forced**
- Last shot: `shot_result = 'missed_long'` ✅
- Last shot: `rally_end_role = 'none'` initially ✅
- After Phase 2: `rally_end_role = 'forced_error'` ✅
- Rally: `point_end_type = 'forcedError'` ✅

## Files Modified

1. `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
   - Updated `mapPhase1ShotToDBShot()` function
   - Added logic to set `is_rally_end` and `rally_end_role` properly

## Impact

- ✅ Fixes winner derivation (relies on rally_end_role)
- ✅ Fixes point_end_type derivation (relies on rally_end_role)  
- ✅ Fixes error stats (relies on shot_result and rally_end_role)
- ✅ Fixes all downstream analytics and inference

## Testing Needed

Please re-test all three scenarios:
1. Winner rally (Serve, Shot, Shot → Winner)
2. Error rally (Serve, Shot, Shot → In-Net, mark as Unforced)
3. Error rally (Serve, Shot, Shot → Long, mark as Forced)

All database fields should now be correct!

