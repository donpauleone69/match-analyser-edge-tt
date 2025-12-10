# Shot Result/Quality Split - Implementation Complete ✅

**Date:** December 8, 2025  
**Status:** All changes implemented and tested (linting passed)

## Overview

Successfully split the combined `shot_result` field into two separate fields:
- **`shot_result`**: Objective error states ('in_net' | 'missed_long' | 'missed_wide' | 'in_play')
- **`shot_quality`**: Subjective quality assessment ('high' | 'average' | null)

## Key Changes Summary

### 1. Type System Updates ✅

**File:** `app/src/data/entities/shots/shot.types.ts`

- Split `ShotResult` type: Removed 'good'/'average', added 'in_play'
- Created new `ShotQuality` type: 'high' | 'average'
- Updated `DBShot` interface:
  - `shot_result: ShotResult` (NOT NULL - defaults to 'in_play')
  - `shot_quality: ShotQuality | null` (added to SUBJECTIVE DATA section)

**File:** `app/src/data/index.ts`

- Added `ShotQuality` to exports

### 2. Default Values ✅

**File:** `app/src/helpers/createEntityDefaults.ts`

- `shot_result: 'in_play'` (NOT NULL, default value)
- `shot_quality: null` (set in Phase 2 only if shot is in_play)

### 3. Phase 1 - Timestamp Capture ✅

**Files Modified:**
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`

**Changes:**
- Updated `mapPhase1ShotToDBShot()` signature to accept `isLastShot` and `rallyEndCondition`
- Only the LAST shot in a rally gets error shot_result based on endCondition:
  - `endCondition === 'innet'` → `shot_result = 'in_net'`
  - `endCondition === 'long'` → `shot_result = 'missed_long'`
  - `endCondition === 'winner'` → `shot_result = 'in_play'`
- All other shots default to `shot_result = 'in_play'`
- Set `shot_quality = null` (filled in Phase 2)

### 4. Phase 2 - Detail Capture ✅

**Files Modified:**
- `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts`

**Phase2DetailComposer.tsx:**
- Added `serveType` to `DetailedShot` interface (bug fix)
- Updated `saveCurrentShotToDatabase()`:
  - Added `serveType` save logic
  - `shot_result` is READ-ONLY (not modified in Phase 2)
  - `shot_quality` set only if `!shot.isError && shot.shotQuality`
  - Error shots: `shot_quality = null`
  - Simplified `rally_end_role` derivation (direct mapping from errorType)

**dataMapping.ts:**
- Updated `mapPhase2DetailToDBShot()`: Removed shot_result modification, added shot_quality logic
- Updated `convertDBShotToDetailedShot()`: Map from `shot_quality` field instead of `shot_result`
- Added `serveType` mapping in `convertDBShotToDetailedShot()`

### 5. Inference/Derivation Functions ✅

Updated all inference and derivation functions to use the new fields:

**Error Detection (use `shot_result !== 'in_play'`):**
- `app/src/rules/derive/rally/deriveRally_winner_id.ts`
- `app/src/rules/derive/rally/deriveRally_point_end_type.ts`
- `app/src/rules/derive/shot/deriveShot_rally_end_role.ts`
- `app/src/rules/stats/errorStats.ts`

**Quality Assessment (use `shot_quality === 'high'`):**
- `app/src/rules/infer/shot-level/inferShotType.ts`
- `app/src/rules/infer/shot-level/inferPressure.ts`
- `app/src/rules/infer/rally-patterns/inferTacticalPatterns.ts`
- `app/src/rules/infer/rally-patterns/inferMovement.ts`
- `app/src/rules/stats/tacticalStats.ts`
- `app/src/rules/stats/serveReceiveStats.ts`

### 6. Data Viewer ✅

**File:** `app/src/pages/DataViewer.tsx`

- Added `shot_quality` field display in SUBJECTIVE DATA section
- Fields now display in correct order matching DBShot interface

## Files Modified (Total: 18 files)

### Core Types & Exports (2 files)
1. `app/src/data/entities/shots/shot.types.ts`
2. `app/src/data/index.ts`

### Defaults (1 file)
3. `app/src/helpers/createEntityDefaults.ts`

### Phase 1 Components (2 files)
4. `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
5. `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx`

### Phase 2 Components (1 file)
6. `app/src/features/shot-tagging-engine/composers/Phase2DetailComposer.tsx`

### UI/Display (1 file)
7. `app/src/pages/DataViewer.tsx`

### Derivation Rules (3 files)
8. `app/src/rules/derive/rally/deriveRally_winner_id.ts`
9. `app/src/rules/derive/rally/deriveRally_point_end_type.ts`
10. `app/src/rules/derive/shot/deriveShot_rally_end_role.ts`

### Inference Rules (4 files)
11. `app/src/rules/infer/shot-level/inferShotType.ts`
12. `app/src/rules/infer/shot-level/inferPressure.ts`
13. `app/src/rules/infer/rally-patterns/inferTacticalPatterns.ts`
14. `app/src/rules/infer/rally-patterns/inferMovement.ts`

### Stats (3 files)
15. `app/src/rules/stats/errorStats.ts`
16. `app/src/rules/stats/tacticalStats.ts`
17. `app/src/rules/stats/serveReceiveStats.ts`

### Documentation (1 file)
18. `.cursor/plans/split_shot_result_REVISED.plan.md`

## Bug Fixes Included

### ServeType Bug Fix ✅
- **Issue:** `serveType` was used in UI but not in TypeScript interface or save function
- **Fix:** 
  - Added `serveType` to `DetailedShot` interface
  - Added save logic in `saveCurrentShotToDatabase()`
  - Added mapping in `convertDBShotToDetailedShot()`

## Logic Summary

### Phase 1 (Timestamp Capture)
```typescript
// Only last shot gets error shot_result
if (isLastShot) {
  if (rallyEndCondition === 'innet') shot_result = 'in_net'
  else if (rallyEndCondition === 'long') shot_result = 'missed_long'
  else shot_result = 'in_play' // winner
} else {
  shot_result = 'in_play' // default for all non-ending shots
}
shot_quality = null // will be set in Phase 2
```

### Phase 2 (Detail Capture)
```typescript
// shot_result is READ-ONLY from Phase 1 - never modified

// shot_quality only set for in-play shots
if (!shot.isError && shot.shotQuality) {
  shot_quality = shot.shotQuality // 'high' or 'average'
} else if (shot.isError) {
  shot_quality = null
}
// If user hasn't answered quality yet, stays null
```

### Inference/Derivation Functions
```typescript
// Error detection
const isError = shot_result !== 'in_play'

// Quality assessment
const isHighQuality = shot_quality === 'high'
const isSuccess = shot_quality === 'high' || rally_end_role === 'winner'
```

## Testing Checklist

✅ All TypeScript linting passed (no errors)  
⏳ Manual testing pending (see below)

### Manual Testing Steps
1. Start new tagging session (Phase 1)
2. Tag a rally ending with "Win" - verify last shot gets `shot_result='in_play'`
3. Tag a rally ending with "In-Net" - verify last shot gets `shot_result='in_net'`
4. Tag a rally ending with "Long" - verify last shot gets `shot_result='missed_long'`
5. Check DataViewer - verify all shots have `shot_result` (not null)
6. Move to Phase 2
7. Tag a serve - verify `serveType` is saved to database
8. Tag an in-play shot with quality - verify `shot_quality` is saved
9. Tag an error shot - verify `shot_quality` is null
10. Check DataViewer - verify `shot_quality` field appears with correct values

## Migration Notes

**Clean Start Recommended:**
- Old data will have 'good'/'average' in `shot_result` field
- These values are no longer valid for the new schema
- Recommend clearing localStorage and starting fresh tagging

**If preserving data:**
- Manual SQL update needed to:
  - Set `shot_result = 'in_play'` for all non-error shots
  - Move 'good'/'average' values from `shot_result` to new `shot_quality` field
  - Set `shot_result` appropriately for error shots based on rally end conditions

## Next Steps

1. **Manual Testing:** Run through the testing checklist above
2. **User Validation:** Test the full tagging workflow (Phase 1 → Phase 2)
3. **Data Verification:** Check DataViewer to ensure all fields display correctly
4. **Update Changelog:** Document these changes in `specAddendumMVP.md`

## Notes

- 'missed_wide' kept in type definition for future use (not currently used in UI)
- All mapper functions already worked correctly - no changes needed
- No breaking changes to existing UI components (only internal data handling)

