# Phase 1: Database Schema Updates

**Status:** 🔴 Not Started  
**Estimated Time:** 2 hours  
**Dependencies:** None  
**Next Phase:** Phase 2 (Rules Functions)

---

## Objective

Update database schema to support set setup flow:
1. Add setup tracking fields to Set table
2. Add stub rally indicator to Rally table
3. Update type definitions and database operations

---

## Tasks

### Task 1.1: Update Set Type Definitions

**File:** `app/src/data/entities/sets/set.types.ts`

**Action:** Add new fields to `DBSet` and `NewSet` interfaces

```typescript
export interface DBSet {
  // ... existing fields ...
  
  // NEW: Setup tracking fields
  setup_starting_score_p1: number | null
  setup_starting_score_p2: number | null
  setup_next_server_id: string | null
  setup_completed_at: string | null
}

export interface NewSet {
  // ... existing fields ...
  
  // NEW: Setup tracking (optional on creation)
  setup_starting_score_p1?: number | null
  setup_starting_score_p2?: number | null
  setup_next_server_id?: string | null
  setup_completed_at?: string | null
}
```

**Verification:**
- [ ] TypeScript compiles without errors
- [ ] All existing code using `DBSet` and `NewSet` still works

---

### Task 1.2: Update Set Database Operations

**File:** `app/src/data/entities/sets/set.db.ts`

**Action:** Ensure new fields are handled in database operations

**Check these functions:**
- `create()` - Should accept new optional fields
- `update()` - Should accept new fields for updates
- `getById()`, `getByMatchId()`, etc. - Should return new fields

**Note:** If using IndexedDB or similar, may need to handle schema migration for existing records.

**Verification:**
- [ ] Can create set with setup fields
- [ ] Can update set with setup fields
- [ ] Can query sets and retrieve setup fields
- [ ] Existing sets return `null` for new fields

---

### Task 1.3: Update Rally Type Definitions

**File:** `app/src/data/entities/rallies/rally.types.ts`

**Action:** Add `is_stub_rally` flag

```typescript
export interface DBRally {
  // ... existing fields ...
  
  // NEW: Stub rally indicator
  is_stub_rally: boolean  // Default: false
}

export interface NewRally {
  // ... existing fields ...
  
  // NEW: Stub rally indicator (optional, defaults to false)
  is_stub_rally?: boolean
}
```

**Verification:**
- [ ] TypeScript compiles without errors
- [ ] All existing code using `DBRally` and `NewRally` still works

---

### Task 1.4: Update Rally Database Operations

**File:** `app/src/data/entities/rallies/rally.db.ts`

**Action:** Ensure `is_stub_rally` field is handled with default `false`

**Update `create()` function:**
```typescript
async create(rally: NewRally): Promise<DBRally> {
  const newRally = {
    ...rally,
    is_stub_rally: rally.is_stub_rally ?? false, // Default to false
    // ... other fields
  }
  // ... save to database
}
```

**Verification:**
- [ ] Can create rally with `is_stub_rally: true`
- [ ] Can create rally without specifying `is_stub_rally` (defaults to false)
- [ ] Can query rallies and retrieve `is_stub_rally` field
- [ ] Existing rallies return `false` for `is_stub_rally`

---

### Task 1.5: Update Index Exports

**File:** `app/src/data/entities/sets/index.ts`  
**File:** `app/src/data/entities/rallies/index.ts`

**Action:** Ensure new types are exported

```typescript
export type { DBSet, NewSet } from './set.types'
export { setDb } from './set.db'
```

**Verification:**
- [ ] Can import updated types from index
- [ ] No circular dependency issues

---

### Task 1.6: Test Database Changes

**Create test file (optional but recommended):**  
`app/src/data/entities/__tests__/schema-updates.test.ts`

**Test scenarios:**
1. Create set with setup fields → retrieve → verify fields present
2. Create set without setup fields → verify fields are null
3. Update set with setup fields → retrieve → verify updates
4. Create rally with `is_stub_rally: true` → verify flag
5. Create rally without `is_stub_rally` → verify defaults to false
6. Query rallies filtering by `is_stub_rally`

**Manual Testing:**
```typescript
// In browser console or test file
import { setDb, rallyDb } from '@/data'

// Test set with setup
const testSet = await setDb.create({
  match_id: 'test-match',
  set_number: 1,
  setup_starting_score_p1: 2,
  setup_starting_score_p2: 3,
  setup_next_server_id: 'player-1',
})
console.log('Set created:', testSet)

// Test stub rally
const stubRally = await rallyDb.create({
  set_id: testSet.id,
  rally_index: 1,
  server_id: 'player-1',
  receiver_id: 'player-2',
  is_stub_rally: true,
  // ... other required fields
})
console.log('Stub rally created:', stubRally)
```

---

## Completion Checklist

- [ ] Task 1.1: Set types updated
- [ ] Task 1.2: Set database operations updated
- [ ] Task 1.3: Rally types updated
- [ ] Task 1.4: Rally database operations updated
- [ ] Task 1.5: Index exports updated
- [ ] Task 1.6: Schema changes tested
- [ ] All TypeScript errors resolved
- [ ] No existing functionality broken
- [ ] Existing data migrates gracefully (new fields return null/false)

---

## Common Issues & Solutions

### Issue: TypeScript errors in existing code
**Solution:** The new fields are optional/nullable, so existing code should work. If not, add null checks or update the code to handle new fields.

### Issue: Database migration needed
**Solution:** If using IndexedDB, you may need to increment the database version and handle migration in the database initialization code.

### Issue: Circular dependencies
**Solution:** Ensure types are defined in `.types.ts` files and only imported, not re-exported with logic.

---

## Next Steps

After completing this phase:
1. Commit changes with message: "feat: Add setup tracking fields to Set and Rally schemas"
2. Verify all tests pass
3. Move to **Phase 2: Core Logic Functions**
4. Open task file: `Phase1_Setup_Flow_Phase2_Rules.md`

---

**Phase 1 Complete?** ✅ Move to Phase 2

