# Phase 2: Core Logic Functions

**Status:** 🔴 Not Started  
**Estimated Time:** 3-4 hours  
**Dependencies:** Phase 1 (Database Schema)  
**Next Phase:** Phase 3 (UI Components)

---

## Objective

Create pure domain logic functions to support setup flow:
1. Calculate previous servers (work backwards from next server)
2. Validate set scores (check if reachable)
3. Detect set end conditions

**Important:** All functions in `rules/` must be pure - NO React, NO IO, NO side effects.

---

## Tasks

### Task 2.1: Create Server Calculation Function

**File:** `app/src/rules/calculate/calculatePreviousServers.ts`

**Create new file with:**

```typescript
/**
 * Work backwards from next server to determine who served each previous rally
 * Uses table tennis serve alternation rules:
 * - Every 2 points in normal play (0-0 to 10-9)
 * - Every 1 point in deuce (after 10-10)
 * 
 * @param totalPoints - Number of completed points (e.g., 5 for score 2-3)
 * @param nextServerId - Who serves the NEXT point
 * @param player1Id - ID for player 1
 * @param player2Id - ID for player 2
 * @returns Array of server IDs for rallies [1..totalPoints]
 * 
 * @example
 * calculatePreviousServers(5, 'player2', 'p1', 'p2')
 * // Returns: ['p1', 'p1', 'p2', 'p2', 'p1']
 * // Rally 1-2: p1 serves, Rally 3-4: p2 serves, Rally 5: p1 serves
 */
export function calculatePreviousServers(
  totalPoints: number,
  nextServerId: 'player1' | 'player2',
  player1Id: string,
  player2Id: string
): string[] {
  if (totalPoints === 0) return []
  
  const servers: string[] = new Array(totalPoints)
  
  // Determine if we're in deuce territory (both players at 10+)
  const isDeuceTerritory = totalPoints >= 20
  
  // Work backwards from the next server
  for (let point = totalPoints; point >= 1; point--) {
    let currentServer: 'player1' | 'player2'
    
    if (isDeuceTerritory && point >= 20) {
      // In deuce: server alternates every point
      // If next is player2, then point totalPoints is player1, totalPoints-1 is player2, etc.
      const pointsFromNext = totalPoints - point
      currentServer = pointsFromNext % 2 === 0 
        ? nextServerId 
        : (nextServerId === 'player1' ? 'player2' : 'player1')
    } else {
      // Normal play: server changes every 2 points
      // Points 1-2: server A, Points 3-4: server B, Points 5-6: server A, etc.
      const currentBlock = Math.ceil(point / 2)
      const nextBlock = Math.ceil((totalPoints + 1) / 2)
      const blocksFromNext = nextBlock - currentBlock
      
      currentServer = blocksFromNext % 2 === 0 
        ? nextServerId 
        : (nextServerId === 'player1' ? 'player2' : 'player1')
    }
    
    servers[point - 1] = currentServer === 'player1' ? player1Id : player2Id
  }
  
  return servers
}
```

**Test Cases to Verify:**
```typescript
// Test 1: Score 2-3 (5 points), next server is player2
calculatePreviousServers(5, 'player2', 'p1', 'p2')
// Expected: ['p1', 'p1', 'p2', 'p2', 'p1']
// Next (point 6) would be p2 ✓

// Test 2: Score 0-0, next server is player1  
calculatePreviousServers(0, 'player1', 'p1', 'p2')
// Expected: []

// Test 3: Score 10-10 (20 points), next is player1
calculatePreviousServers(20, 'player1', 'p1', 'p2')
// Expected: Last server should alternate from player1
// Point 20 should be player2, point 19 should be player1, etc.

// Test 4: Score 11-10 (21 points, in deuce), next is player2
calculatePreviousServers(21, 'player2', 'p1', 'p2')
// Expected: Should alternate every point after point 20
```

**Verification:**
- [ ] Function is pure (no side effects)
- [ ] All test cases pass
- [ ] Works for deuce scenarios (10-10+)
- [ ] Works for normal play (0-0 to 10-9)

---

### Task 2.2: Create Score Validation Function

**File:** `app/src/rules/validate/validateSetScore.ts`

**Create new file with:**

```typescript
/**
 * Validate score is reachable given table tennis set end rules
 * Rules: First to 11 wins (with 2 point lead). At 10-10, play continues until 2 point lead.
 * 
 * @param p1Score - Player 1 score
 * @param p2Score - Player 2 score
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateSetScore(11, 9) // { valid: true }
 * validateSetScore(15, 3) // { valid: false, error: '...' }
 */
export function validateSetScore(
  p1Score: number,
  p2Score: number
): { valid: boolean; error?: string } {
  // Basic range check
  if (p1Score < 0 || p2Score < 0) {
    return { valid: false, error: 'Scores cannot be negative' }
  }
  
  if (p1Score > 30 || p2Score > 30) {
    return { valid: false, error: 'Scores unreasonably high (>30). Please check input.' }
  }
  
  const higherScore = Math.max(p1Score, p2Score)
  const lowerScore = Math.min(p1Score, p2Score)
  const scoreDiff = higherScore - lowerScore
  
  // If higher score >= 11 with 2+ point lead, check if set should have ended
  if (higherScore >= 11 && scoreDiff >= 2) {
    // This indicates a completed set, which is fine
    // User might be setting up to tag a completed set or mid-completion
    // We allow it
    return { valid: true }
  }
  
  // For scores where higher < 11, any score is valid (in-progress)
  if (higherScore < 11) {
    return { valid: true }
  }
  
  // Deuce scenarios (11-10, 10-11, 12-12, etc.) are valid
  if (higherScore >= 11 && scoreDiff < 2) {
    return { valid: true }
  }
  
  // All other cases are valid
  return { valid: true }
}
```

**Test Cases to Verify:**
```typescript
// Valid scores
validateSetScore(0, 0)    // { valid: true }
validateSetScore(5, 3)    // { valid: true }
validateSetScore(10, 10)  // { valid: true } - deuce
validateSetScore(11, 9)   // { valid: true } - normal end
validateSetScore(12, 10)  // { valid: true } - deuce end
validateSetScore(15, 17)  // { valid: true } - extended deuce

// Invalid scores
validateSetScore(-1, 5)   // { valid: false, error: '...' }
validateSetScore(50, 3)   // { valid: false, error: '...' }
```

**Verification:**
- [ ] Function is pure
- [ ] All test cases pass
- [ ] Allows valid deuce scenarios
- [ ] Blocks impossible scores

---

### Task 2.3: Create Set End Detection Function

**File:** `app/src/rules/derive/set/deriveSetEndConditions.ts`

**Create new file with:**

```typescript
/**
 * Check if current score meets set end conditions
 * Set ends when someone reaches 11+ with 2+ point lead
 * 
 * @param p1Score - Player 1 current score
 * @param p2Score - Player 2 current score
 * @returns Set end status and winner
 * 
 * @example
 * deriveSetEndConditions(11, 8)   // { isSetEnd: true, winner: 'player1' }
 * deriveSetEndConditions(10, 10)  // { isSetEnd: false }
 * deriveSetEndConditions(12, 10)  // { isSetEnd: true, winner: 'player1' }
 */
export function deriveSetEndConditions(
  p1Score: number,
  p2Score: number
): { isSetEnd: boolean; winner?: 'player1' | 'player2' } {
  const scoreDiff = Math.abs(p1Score - p2Score)
  const maxScore = Math.max(p1Score, p2Score)
  
  // Set ends when:
  // 1. Someone reaches 11+ AND has 2+ point lead
  if (maxScore >= 11 && scoreDiff >= 2) {
    return {
      isSetEnd: true,
      winner: p1Score > p2Score ? 'player1' : 'player2'
    }
  }
  
  // Otherwise, set continues
  return { isSetEnd: false }
}
```

**Test Cases to Verify:**
```typescript
// Set should end
deriveSetEndConditions(11, 9)   // { isSetEnd: true, winner: 'player1' }
deriveSetEndConditions(7, 11)   // { isSetEnd: true, winner: 'player2' }
deriveSetEndConditions(12, 10)  // { isSetEnd: true, winner: 'player1' }
deriveSetEndConditions(15, 13)  // { isSetEnd: true, winner: 'player1' }

// Set should continue
deriveSetEndConditions(10, 10)  // { isSetEnd: false }
deriveSetEndConditions(11, 10)  // { isSetEnd: false } - only 1 point diff
deriveSetEndConditions(5, 3)    // { isSetEnd: false } - under 11
deriveSetEndConditions(12, 11)  // { isSetEnd: false } - deuce continues
```

**Verification:**
- [ ] Function is pure
- [ ] All test cases pass
- [ ] Correctly identifies set end
- [ ] Correctly identifies deuce scenarios

---

### Task 2.4: Export New Functions

**File:** `app/src/rules/index.ts`

**Add exports:**

```typescript
// ... existing exports ...

// Server calculation
export { calculatePreviousServers } from './calculate/calculatePreviousServers'

// Validation
export { validateSetScore } from './validate/validateSetScore'

// Set derivations
export { deriveSetEndConditions } from './derive/set/deriveSetEndConditions'
```

**Verification:**
- [ ] Functions can be imported from `@/rules`
- [ ] No circular dependency issues

---

### Task 2.5: Create Unit Tests (Optional but Recommended)

**File:** `app/src/rules/__tests__/setupFlow.test.ts`

**Test all three functions with edge cases:**

```typescript
import { describe, it, expect } from 'vitest'
import { 
  calculatePreviousServers, 
  validateSetScore, 
  deriveSetEndConditions 
} from '@/rules'

describe('Setup Flow Rules', () => {
  describe('calculatePreviousServers', () => {
    it('should handle empty score (0-0)', () => {
      const result = calculatePreviousServers(0, 'player1', 'p1', 'p2')
      expect(result).toEqual([])
    })
    
    it('should calculate normal play correctly', () => {
      // Score 2-3, next is player2
      // Rally 1-2: player1, Rally 3-4: player2, Rally 5: player1
      // Next (6) is player2 ✓
      const result = calculatePreviousServers(5, 'player2', 'p1', 'p2')
      expect(result).toEqual(['p1', 'p1', 'p2', 'p2', 'p1'])
    })
    
    it('should handle deuce correctly', () => {
      // At 10-10 (20 points), servers alternate every point
      const result = calculatePreviousServers(20, 'player1', 'p1', 'p2')
      // Last serve (point 20) should be player2, then alternating
      expect(result[19]).toBe('p2') // Point 20
      expect(result[18]).toBe('p1') // Point 19
    })
    
    // Add more tests...
  })
  
  describe('validateSetScore', () => {
    it('should accept valid in-progress scores', () => {
      expect(validateSetScore(5, 3).valid).toBe(true)
      expect(validateSetScore(10, 10).valid).toBe(true)
    })
    
    it('should accept valid completed scores', () => {
      expect(validateSetScore(11, 9).valid).toBe(true)
      expect(validateSetScore(12, 10).valid).toBe(true)
    })
    
    it('should reject negative scores', () => {
      expect(validateSetScore(-1, 5).valid).toBe(false)
    })
    
    // Add more tests...
  })
  
  describe('deriveSetEndConditions', () => {
    it('should detect normal set end', () => {
      const result = deriveSetEndConditions(11, 9)
      expect(result.isSetEnd).toBe(true)
      expect(result.winner).toBe('player1')
    })
    
    it('should not end set in deuce', () => {
      const result = deriveSetEndConditions(10, 10)
      expect(result.isSetEnd).toBe(false)
    })
    
    // Add more tests...
  })
})
```

**Run tests:**
```bash
npm test -- setupFlow.test.ts
```

**Verification:**
- [ ] All unit tests pass
- [ ] Edge cases covered
- [ ] Functions work as expected

---

## Completion Checklist

- [ ] Task 2.1: `calculatePreviousServers()` created and tested
- [ ] Task 2.2: `validateSetScore()` created and tested
- [ ] Task 2.3: `deriveSetEndConditions()` created and tested
- [ ] Task 2.4: Functions exported from rules index
- [ ] Task 2.5: Unit tests written and passing (optional)
- [ ] All functions are pure (no side effects)
- [ ] TypeScript compiles without errors

---

## Common Issues & Solutions

### Issue: Server calculation doesn't match expected
**Solution:** Review TT rules - serves change every 2 points normally, every 1 point in deuce (after 10-10).

### Issue: Deuce scenarios not handled correctly
**Solution:** Check the `totalPoints >= 20` condition for deuce detection.

### Issue: Functions have side effects
**Solution:** Remove any console.logs, mutations, or IO. Rules must be pure.

---

## Next Steps

After completing this phase:
1. Commit changes: "feat: Add setup flow rules functions"
2. Verify all tests pass
3. Move to **Phase 3: UI Components**
4. Open task file: `Phase1_Setup_Flow_Phase3_Components.md`

---

**Phase 2 Complete?** ✅ Move to Phase 3

