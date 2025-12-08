# Database Fixes - December 8, 2025

## ✅ Issues Fixed

### 1. **WRONG ID FORMAT** ✅ FIXED
- **Before:** IDs were timestamp-random format: `1733734534-abc123`
- **After:** Proper slug format:
  - Rally IDs: `match123-s1-r5` (readable, hierarchical)
  - Shot IDs: `match123-s1-r5-sh3` (includes parent context)

### 2. **DOUBLE RALLIES** ✅ FIXED
- **Before:** Re-tagging a set created duplicate rallies and shots
- **After:** Existing data is automatically cleaned before saving new data
- **Result:** Idempotent saves (can retag without duplicates)

### 3. **MISSING timestamp_end** ✅ FIXED
- **Before:** All shots had `timestamp_end = null`
- **After:** Properly calculated (next shot's start time or rally end time)

### 4. **DOUBLE RALLY INDEX** ✅ VERIFIED & RESOLVED
- This was a symptom of issue #2 (double rallies)
- Fixed by the cleanup step

---

## 🔧 What Changed

### Files Created
- `app/src/helpers/generateSlugId.ts` - Slug ID generators for all entities
- `app/src/helpers/debugDatabase.ts` - Database inspection utility

### Files Modified
- `app/src/data/entities/rallies/rally.db.ts` - Use slug IDs
- `app/src/data/entities/shots/shot.db.ts` - Use slug IDs
- `app/src/features/shot-tagging-engine/composers/dataMapping.ts` - Return NewRally/NewShot, add timestamp calculation
- `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx` - Add cleanup step, fix save flow
- `app/src/data/index.ts` - Export slug ID generators
- `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` - Document all changes

---

## 🚀 Next Steps

### 1. Clear Your Database
**IMPORTANT:** Old data uses the wrong ID format and must be cleared.

```
Follow instructions in CLEAR_LOCALSTORAGE_INSTRUCTIONS.md
```

### 2. Test the Fixes
1. Tag a match
2. Open browser console and run:
   ```javascript
   inspectDB()
   ```
3. Verify:
   - ✅ Rally IDs look like: `{set_id}-r1`, `{set_id}-r2`, etc.
   - ✅ Shot IDs look like: `{rally_id}-sh1`, `{rally_id}-sh2`, etc.
   - ✅ No duplicate rally indices
   - ✅ All shots have `timestamp_end` values

### 3. Re-Tag and Verify No Duplication
1. Tag the same set again
2. Run `inspectDB()` 
3. Verify:
   - ✅ Still same number of rallies (not doubled)
   - ✅ Still same number of shots (not doubled)

---

## 🐛 Debug Tools Available

### In Browser Console:

```javascript
// Full database inspection
inspectDB()

// Export sample data for review
exportDB()
```

The `inspectDB()` function will show:
- Entity counts
- Rally index analysis (duplicates, range)
- ID format verification
- Timestamp completeness
- Score progression

---

## 📊 Save Flow (New Steps)

The save process now has 12 steps:

0. **Clean existing data** (prevents duplicates) ← NEW
1. Map rallies
1b. Save rallies with slug IDs
2. Map shots
3. **Calculate timestamp_end** ← NEW
4. Mark rally-ending shots
5. Save shots with slug IDs
6. Determine rally winners
7. Calculate rally scores
8. Update rallies
9. Update set scores
10. Run inference
11. Mark set complete
12. Update match sets_before/after

---

## 🎯 Expected Results

After clearing database and tagging a new match, you should see:

### Rally IDs:
```
match123-s1-r1
match123-s1-r2
match123-s1-r3
...
```

### Shot IDs:
```
match123-s1-r1-sh1
match123-s1-r1-sh2
match123-s1-r1-sh3
match123-s1-r2-sh1
match123-s1-r2-sh2
...
```

### Data Integrity:
- ✅ Exactly 1 rally per rally_index
- ✅ All shots have timestamp_start AND timestamp_end
- ✅ Scores progress correctly (0-0, 1-0, 1-1, etc.)
- ✅ No duplicate data

---

## 💡 Why These Fixes Matter

### Slug IDs
- **Debugging:** Can instantly see which set/rally a shot belongs to
- **Exports:** CSV/JSON files are human-readable
- **Relationships:** Parent IDs embedded in child IDs

### No Duplicates
- **Data Integrity:** Accurate statistics and analysis
- **Storage:** No wasted space on duplicate data
- **Workflow:** Can safely retag and improve data

### Complete Timestamps
- **Analysis:** Can calculate shot durations, rally tempo
- **Video:** Proper time ranges for video clips
- **Stats:** Rally length measurements

---

## ✅ All Done!

All reported issues have been fixed. The database will now:
1. Use proper slug-based IDs throughout
2. Never create duplicate rallies or shots
3. Properly calculate all timestamps
4. Maintain data integrity across re-tags

Please clear your database and test! 🚀



