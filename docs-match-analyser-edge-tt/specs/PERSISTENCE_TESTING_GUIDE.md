# Persistence System - Complete Testing Guide

## 🔬 Test Scenarios & Expected Behavior

### Test 1: Fresh Start - Phase 1
**Steps:**
1. Navigate to match list
2. Click set → "Start" button
3. Select video file
4. Answer setup questions (who serves, starting score)
5. Tag 2-3 rallies
6. **Manually click "Save Progress" button**
7. Check browser console for save logs
8. Refresh page (F5)
9. Click "Continue" button

**Expected:**
- ✅ Console shows: `[Manual Save] ✓ Saved X new rallies`
- ✅ Last save time appears next to button
- ✅ After refresh: rallies still in shot log
- ✅ Video loads from IndexedDB (no re-select needed)
- ✅ Score displays correctly
- ✅ Can continue tagging from where left off

**Console Logs to Watch:**
```
[Manual Save] Saving 3 rallies...
[Manual Save] ✓ Saved 3 new rallies (3 total rallies)
[Resume] Starting resume for Set 1, phase: phase1_in_progress
[Resume] Found 3 rallies, 9 shots
[Resume] ✓ Video loaded from IndexedDB: video.mp4 (125.50 MB)
```

---

### Test 2: Phase 1 Complete → Phase 2 Transition
**Steps:**
1. Complete several rallies in Phase 1
2. Click "Complete Phase 1 →"
3. Observe Phase 2 loads
4. Check if video is visible
5. Check if player names show
6. Verify shot count matches rallies

**Expected:**
- ✅ Console: `[Phase1→Phase2] ✓ Phase 1 marked as complete in database`
- ✅ Console: `[Phase1→Phase2] ✓ Video URL preserved`
- ✅ Phase 2 shows all shots from all rallies
- ✅ Video player functional
- ✅ Player names visible in shot log

**Console Logs:**
```
[Phase1→Phase2] Completing Phase 1 with 5 rallies
[Phase1→Phase2] ✓ Phase 1 marked as complete in database
[Phase1→Phase2] ✓ Video URL preserved: blob:http://localhost...
```

---

### Test 3: Phase 2 Progress & Manual Save
**Steps:**
1. In Phase 2, tag 3-4 shots with full details
2. Click "Save Progress" button (top right)
3. Check console
4. Close browser completely
5. Reopen, navigate back to match
6. Click "Continue"

**Expected:**
- ✅ Console: `[Manual Save] ✓ Saved X shot details successfully`
- ✅ Last save time updates
- ✅ After reopen: resumes at correct shot (e.g., shot 5 if saved at 4)
- ✅ Previously tagged shots show their details (direction, spin, etc.)
- ✅ Video loads from IndexedDB

**Console Logs:**
```
[Manual Save] Saving Phase 2 progress for 4 shots...
[Phase2] Updating shot abc123 with: ['shot_origin', 'shot_destination', 'wing', 'intent']
[Manual Save] ✓ Saved 4 shot details successfully

[After Resume]
[Resume] → Resuming at Phase 2, shot 4/15
[Phase2] Loading existing data, resuming from shot 4/15
[Phase2] Found 30 shots in database
[Phase2] ✓ Merged Phase 2 data for 4 shots
```

---

### Test 4: Auto-Save (Rally-by-Rally in Phase 1)
**Steps:**
1. Start fresh Phase 1
2. Tag rally #1 - complete it (press "Win" or "Fault")
3. **Do NOT click manual save**
4. Immediately close browser tab (or kill browser)
5. Reopen, click "Continue"

**Expected:**
- ✅ Rally #1 is saved (auto-saved on completion)
- ✅ Shot log shows rally #1
- ✅ Can continue from rally #2

**Console Logs:**
```
[During Rally Completion]
Saved rally 1 to database

[After Resume]
[Resume] Found 1 rallies, 3 shots
```

---

### Test 5: Phone Screen Sleep
**Steps:**
1. On mobile device, start tagging
2. Tag several rallies
3. Click "Save Progress"
4. Lock phone / let screen turn off
5. Wait 30+ seconds
6. Unlock phone, navigate back to app

**Expected:**
- ✅ All progress intact
- ✅ Video may need user gesture to resume playback (browser security)
- ✅ Can continue tagging immediately

---

### Test 6: Navigate Away & Return
**Steps:**
1. Mid-tagging in Phase 1
2. Click browser back button (or navigate to home)
3. Return to matches list
4. Click "Continue" on the set

**Expected:**
- ✅ Returns to exact state
- ✅ Shot log intact
- ✅ Video loads
- ✅ No data loss

---

### Test 7: Redo Workflow (Clear Everything)
**Steps:**
1. Start tagging a set (save some progress)
2. Go back to match list
3. Click "Redo" button
4. Confirm deletion
5. Should restart from setup

**Expected:**
- ✅ Console: `Cleared tagging data for Set X`
- ✅ All rallies/shots deleted from DB
- ✅ Shows setup questions again
- ✅ Video needs re-selection
- ✅ Fresh start

---

### Test 8: Multiple Sets in Same Match
**Steps:**
1. Tag Set 1 completely
2. Return to match list
3. Start Set 2
4. Tag partially
5. Return to match list
6. Verify both sets show correct status

**Expected:**
- ✅ Set 1 shows "Complete" badge
- ✅ Set 2 shows "In Progress" badge
- ✅ Can click "Continue" on Set 2
- ✅ Can click "Redo" on Set 1
- ✅ Each set has independent state

---

### Test 9: Video Not in IndexedDB (Edge Case)
**Steps:**
1. Use browser DevTools
2. Application → IndexedDB → `tt-match-videos` → delete all
3. Return to app, click "Continue" on in-progress set

**Expected:**
- ⚠️ Console: `[Resume] ⚠ No video file found in IndexedDB - user will need to re-select`
- ✅ Shows video player with "Click to load video" prompt
- ✅ User can select video file again
- ✅ All rally/shot data intact
- ✅ Continues normally after video selected

---

### Test 10: Duplicate Save Protection
**Steps:**
1. Tag 3 rallies
2. Click "Save Progress"
3. Click "Save Progress" again immediately

**Expected:**
- ✅ First save: `✓ Saved 3 new rallies`
- ✅ Second save: `✓ Saved 0 new rallies (3 total rallies)`
- ✅ No duplicates in database
- ✅ No errors

**Console Logs:**
```
[Manual Save] Rally 1 already saved, skipping
[Manual Save] Rally 2 already saved, skipping
[Manual Save] Rally 3 already saved, skipping
[Manual Save] ✓ Saved 0 new rallies (3 total rallies)
```

---

## 🐛 Known Issues & Limitations

### Video File Size
- **Limit:** Browser IndexedDB typically allows ~50-100MB per origin
- **Impact:** Very large videos (>100MB) may not save to IndexedDB
- **Workaround:** User will need to re-select video on resume
- **Future:** Consider video compression or cloud storage

### Browser Differences
- **Safari:** May have stricter IndexedDB quotas
- **Firefox:** Prompts user for storage permission
- **Chrome:** Most permissive

### Data Persistence
- **localStorage:** ~5-10MB limit (used for session state)
- **IndexedDB:** ~50-100MB typical, can be larger with user permission
- **Clearing browser data:** Will delete all saved progress

---

## 🔍 Debugging Checklist

**If data not persisting:**
1. ✅ Check console for `[Manual Save]` or `Saved rally X` logs
2. ✅ Verify `currentSetId` is not null (check `[Setup] Set ID initialized` log)
3. ✅ Check browser DevTools → Application → IndexedDB → verify data exists
4. ✅ Check `tagging_phase` field in `sets` table
5. ✅ Verify browser allows IndexedDB (not in Private/Incognito mode)

**If video not loading:**
1. ✅ Check console for `[Resume] ✓ Video loaded from IndexedDB`
2. ✅ If warning appears, user needs to re-select video
3. ✅ Check DevTools → Application → IndexedDB → `tt-match-videos` → verify video blob exists
4. ✅ Check file size - if >100MB, may have been rejected

**If "Continue" button not working:**
1. ✅ Check `tagging_phase` field - should not be 'not_started'
2. ✅ Check console for `[Setup]` logs showing match loading
3. ✅ Verify `phase1_last_rally` or `phase2_last_shot_index` has value
4. ✅ Check if `currentMatch` is loaded before resume attempt

---

## ✅ Success Indicators

**Phase 1 Working:**
- Each rally saves immediately (see console log)
- "Save Progress" button works
- Last save time appears
- Resume shows correct rally count
- Video persists

**Phase 2 Working:**
- Shot details save after each shot
- "Save Progress" button works
- Resume starts at correct shot index
- Previously tagged shots show details
- Progress percentage accurate

**Full Cycle Working:**
- Tag Phase 1 → Complete → Phase 2 flows smoothly
- All data survives browser refresh
- All data survives browser restart
- All data survives phone sleep
- Can resume from any point
- Manual save anytime works

---

## 📊 Database Schema Quick Reference

**DBSet Progress Fields:**
```typescript
tagging_phase: 'not_started' | 'phase1_in_progress' | 'phase1_complete' | 'phase2_in_progress' | 'phase2_complete'
phase1_last_rally: number | null  // Last rally saved in Phase 1
phase1_total_rallies: number | null  // Total rallies (for progress %)
phase2_last_shot_index: number | null  // Last shot detailed in Phase 2  
phase2_total_shots: number | null  // Total shots (for progress %)
```

**Video Storage:**
- Location: IndexedDB → `tt-match-videos` store
- Key: `${matchId}-${setNumber}` (e.g., "match-123-1")
- Value: `{ id, file: File, timestamp: number }`
- Auto-cleanup: Files older than 7 days deleted

---

## 🎯 Quick Smoke Test (5 minutes)

1. Start fresh set, tag 2 rallies, click "Save Progress" → verify alert
2. Refresh page, click "Continue" → verify rallies still there
3. Complete Phase 1 → verify Phase 2 loads with video
4. Tag 2 shots, click "Save Progress" → verify alert
5. Close browser, reopen, click "Continue" → verify resumes at shot 3
6. ✅ If all pass, persistence is working!




