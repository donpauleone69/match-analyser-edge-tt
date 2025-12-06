# Statistics System Testing Guide

> **Purpose:** Guide for testing and validating the statistics dashboard  
> **Version:** 2.2.0  
> **Date:** 2025-12-06

---

## Quick Start

### 1. Access the Dashboard

```
1. Start the application
2. Navigate to /stats or click "Stats" in the sidebar
3. You should see the statistics dashboard
```

### 2. Test with Sample Data

If you have tagged matches in the database:
- Select a player from the dropdown
- Browse through the tabs (Summary, Serve/Receive, Tactical, Errors, Raw Data)
- Check that statistics display with confidence badges

---

## Testing Checklist

### ✅ Basic Functionality

- [ ] Dashboard loads without errors
- [ ] Player dropdown populates
- [ ] Can switch between players
- [ ] All 5 tabs are accessible (Summary, Serve/Receive, Tactical, Errors, Raw Data)
- [ ] Confidence badges display correctly (✅ ⚠️ ❌)
- [ ] Statistics cards render with proper formatting
- [ ] Raw data section shows rally-by-rally breakdown

### ✅ Data Accuracy (High Confidence Stats)

**Match Summary:**
- [ ] Matches played count is correct
- [ ] Sets won/lost match actual results
- [ ] Points won/lost tally is accurate
- [ ] Win percentages calculate correctly

**Serve Stats:**
- [ ] Serve win rate matches manual count
- [ ] Serve faults counted correctly
- [ ] Spin family distribution accurate
- [ ] Length distribution accurate

**Receive Stats:**
- [ ] Receive win rate matches manual count
- [ ] Receive errors counted correctly

**Error Stats:**
- [ ] Total errors match actual count
- [ ] Unforced vs forced split is correct
- [ ] Net vs long errors accurate

### ✅ Inference Accuracy (Medium Confidence Stats)

**3rd Ball:**
- [ ] 3rd ball attacks counted (shot_index=3 + aggressive)
- [ ] Winners identified correctly
- [ ] Forced errors detected (opponent errors after 3rd ball)

**4th Ball:**
- [ ] Counter-attacks counted (shot_index=4 + aggressive)
- [ ] Blocks counted (shot_index=4 + defensive/neutral)

**Initiative:**
- [ ] Initiative holder = first aggressive shot in rally
- [ ] Initiative stolen when opponent counters and wins

**Opening Quality:**
- [ ] Excellent = 3rd ball winner or opponent error
- [ ] Good = 3rd ball good quality, opponent defensive
- [ ] Poor = opponent counter-attacks successfully

### ✅ Filters & UI

- [ ] Match filter dropdown works
- [ ] "All Matches" shows aggregate stats
- [ ] Single match filter shows that match only
- [ ] Reset filters button works
- [ ] Tab switching preserves selected player/filters

### ✅ Edge Cases

- [ ] Empty data displays gracefully (no errors)
- [ ] Single rally match displays correctly
- [ ] Non-scoring rallies handled (don't affect stats)
- [ ] Missing data (null values) handled gracefully

---

## Validation Tests

### Test 1: Serve Efficiency

**Manual Count:**
1. Count rallies where player was server
2. Count how many they won
3. Calculate: (wins / total serves) × 100

**Compare to Dashboard:**
- Match Summary → Serve Efficiency
- Should be ✅ High confidence
- Values should match within rounding

### Test 2: 3rd Ball Attack

**Manual Count:**
1. Find all rallies where player was server
2. Count shot_index=3 with intent='aggressive'
3. Count how many of those rallies the player won

**Compare to Dashboard:**
- Tactical → 3rd Ball Attack → Success Rate
- Should be ⚠️ Medium confidence
- Values should be close (within 5%)

### Test 3: Error Breakdown

**Manual Count:**
1. Count rallies lost with point_end_type='unforcedError'
2. Count rallies lost with point_end_type='forcedError'
3. Count rallies lost with point_end_type='serviceFault'

**Compare to Dashboard:**
- Errors → Unforced/Forced/Serve Errors
- Should all be ✅ High confidence
- Should match exactly

### Test 4: Raw Data Integrity

**Verify:**
1. Go to Raw Data tab
2. Pick a set
3. Manually verify 3-5 rallies match what you tagged
4. Check: server, receiver, score, winner, shot count

---

## Common Issues & Solutions

### Issue: No data appears

**Cause:** No matches in database or no player selected  
**Solution:**
- Tag at least one match using the Shot Tagging Engine
- Ensure Phase 1 (framework) is complete
- Select a player from the dropdown

### Issue: Statistics show 0% or NaN

**Cause:** Division by zero (no attempts)  
**Solution:**
- Normal for stats with no data (e.g., 0 aggressive receives)
- Tag more rallies to populate stats

### Issue: Confidence badges missing

**Cause:** Stat value is null/undefined  
**Solution:**
- Check that shot data includes required fields (wing, intent, shot_result)
- Phase 2 tagging required for most inferred stats

### Issue: Inferred stats seem wrong

**Cause:** Inference logic may need tuning  
**Solution:**
- Check inference function in `rules/stats/`
- Validate with Raw Data tab
- Report issue with specific example

---

## Performance Testing

### Load Test

**Test with increasing data sizes:**
1. 1 match (20-50 rallies)
2. 5 matches (100-250 rallies)
3. 20 matches (400-1000 rallies)

**Verify:**
- [ ] Dashboard loads in <2 seconds
- [ ] Filtering responds instantly
- [ ] Tab switching is smooth
- [ ] No memory leaks (check DevTools)

### Browser Compatibility

Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)

---

## Inference Validation

### Level 1 (Direct) - Should be 95-100% accurate

**Test: Shot Type Inference**
```typescript
// Given
shot_index = 3
intent = 'aggressive'
wing = 'FH'

// Expect
inferred_shot_type = 'FH_loop'
confidence = 'high' or 'medium'
```

### Level 2 (Multi-Point) - Should be 70-85% accurate

**Test: Initiative Detection**
```typescript
// Given rally
shot 1: serve (player A)
shot 2: receive (player B)
shot 3: push (player A, intent='defensive')
shot 4: loop (player B, intent='aggressive')  ← First aggressive
shot 5: block (player A, intent='defensive')
shot 6: smash (player B, intent='aggressive')
winner: player B

// Expect
initiative_holder = player B (shot 4)
initiative_stolen = false (they won)
```

### Level 3 (Deep) - Should be 50-75% accurate

**Test: Pivot Detection**
```typescript
// Given sequence
shot[n-1]: wing='BH', origin='mid'
shot[n]: wing='FH', origin='left', destination='right'

// Expect
pivoted = true
to_wing = 'FH'
successful = (shot[n].result === 'good')
confidence = 'medium'
```

---

## Manual Validation Workflow

### Step 1: Tag a Match

1. Tag a complete match (Phase 1 + Phase 2)
2. Note key stats manually during tagging:
   - Who served first
   - Final scores
   - Any obvious patterns (e.g., many 3rd ball attacks)

### Step 2: Check Dashboard

1. Navigate to /stats
2. Select the player
3. Filter to that match only
4. Verify:
   - Match count = 1
   - Set scores match your notes
   - Serve stats look reasonable

### Step 3: Spot Check

1. Go to Raw Data tab
2. Pick 5 random rallies
3. For each rally:
   - Verify server/receiver
   - Verify score progression
   - Verify winner
   - Verify shot count

### Step 4: Deep Dive

1. Pick one specific stat (e.g., "3rd ball attack success")
2. Manually count all instances in Raw Data
3. Calculate expected value
4. Compare to dashboard value
5. Variance should be <10% for medium confidence stats

---

## Automated Testing (Future)

### Unit Tests

**Inference Functions:**
```typescript
describe('inferInitiative', () => {
  it('should detect initiative holder', () => {
    const rally = createMockRally()
    const shots = [
      { shot_index: 1, intent: null, player_id: 'p1' }, // serve
      { shot_index: 2, intent: 'defensive', player_id: 'p2' }, // receive
      { shot_index: 3, intent: 'aggressive', player_id: 'p1' }, // ← initiative
    ]
    
    const result = inferInitiative(rally, shots)
    expect(result.initiativeHolder).toBe('p1')
    expect(result.initiativeShotIndex).toBe(3)
  })
})
```

**Stats Calculators:**
```typescript
describe('calculateServeStats', () => {
  it('should calculate serve win rate', () => {
    const rallies = [
      { server_id: 'p1', winner_id: 'p1', is_scoring: true },
      { server_id: 'p1', winner_id: 'p2', is_scoring: true },
      { server_id: 'p1', winner_id: 'p1', is_scoring: true },
    ]
    const shots = [] // serve shots
    
    const stats = calculateServeStats('p1', rallies, shots)
    expect(stats.serveWinRate).toBe(66.67) // 2/3
  })
})
```

---

## Reporting Issues

When reporting a statistics issue, include:

1. **What stat is wrong:** (e.g., "3rd ball success rate")
2. **Expected value:** (from manual count)
3. **Actual value:** (from dashboard)
4. **Data sample:** (export raw data or describe rally)
5. **Confidence level:** (was it high, medium, or low?)

**Example:**
```
Issue: 3rd ball success rate shows 80% ⚠️ but should be 65%

Expected: 13 successes / 20 attempts = 65%
Actual: Dashboard shows 80%
Confidence: Medium (⚠️)

Possible cause: Inference is counting rallies won after 3rd ball attack,
but not checking if attack was successful or if player recovered from poor 3rd ball.
```

---

## Next Steps After Testing

### If Stats Look Good ✅
1. Tag 5-10 more matches
2. Monitor accuracy across different playing styles
3. Start using for actual coaching insights
4. Build visualizations based on most useful stats

### If Stats Need Tuning ⚠️
1. Identify specific stats that are off
2. Check inference functions in `rules/stats/`
3. Adjust confidence thresholds
4. Add edge case handling
5. Re-test with same dataset

### If Major Issues ❌
1. Check that Phase 1 + Phase 2 tagging is complete
2. Verify data integrity in Raw Data tab
3. Look for console errors in browser DevTools
4. Check that all shot fields are populated (wing, intent, result, etc.)

---

*End of Testing Guide*

