# Phase 1 Setup Flow - OVERVIEW & CONTEXT

**Date:** December 9, 2025  
**Status:** Planning Complete - Ready for Implementation  
**Estimated Effort:** 7 phases, ~20-30 hours total

---

## 🎯 Objective

Improve data capture and accuracy of Phase1TimestampComposer by adding a **Set Setup** flow that:
- Captures starting conditions (score, next server) before tagging begins
- Creates stub rally records for previous points
- Enables accurate score tracking throughout the set
- Provides proper set completion workflow
- Maintains consistency with table tennis rules

---

## 🔑 Key Decisions (from 17-question Q&A)

### 1. **Stub Rally Data**
- Create minimal rally records for pre-existing points
- Include: `server_id`, `receiver_id`, `is_scoring: true`, `rally_index`
- **Exclude:** `winner_id` (unknown), timestamps, shots
- Mark with: `is_stub_rally: true`, `framework_confirmed: false`

### 2. **Score Tracking**
- Stub rallies: NO score fields (null)
- Tagged rallies: Track `score_before` and `score_after`
- First tagged rally uses setup scores as `score_before`
- Subsequent rallies derive from previous rally's `score_after`

### 3. **Setup UI Integration**
- Integrated into Phase1TimestampComposer (not separate page/modal)
- Uses bottom control area (where tagging buttons normally are)
- Tagging buttons hidden until setup complete
- Video upload optional (existing VideoPlayer component)

### 4. **Duplicate Prevention**
- If ANY rallies exist → skip setup (resume mode)
- Setup only shows for brand new sets

### 5. **Save Behavior**
- **REMOVE** "Save Progress" button (creates duplicates)
- **RENAME** "Complete Phase 1 →" to "Save Set"
- Each rally auto-saves immediately (existing behavior)
- "Save Set" finalizes the set and shows completion modal

### 6. **Set End Detection**
- Detect when score meets end conditions (first to 11, 2 clear points)
- Show warning banner with [Save Set] [Continue Tagging]
- Allow continuing past set end (for tagging errors/corrections)

### 7. **Completion Flow**
- Modal after "Save Set" with: [Tag Next Set] [Back to Matches] [View Data]
- "Tag Next Set" creates or resumes next set automatically
- "View Data" navigates to DataViewer with setId filter

### 8. **Score Conflicts**
- Tagged data = source of truth
- Always overwrite pre-entered match results with tagged scores

### 9. **Server Calculation**
- Work BACKWARDS from "next server" using TT alternation rules
- Every 2 points (normal play), every 1 point (after 10-10 deuce)

### 10. **Validation**
- Block impossible scores (e.g., 15-3 would have ended at 11-3)
- Use set end rules for validation

---

## 📊 Database Schema Changes

### Set Table - NEW FIELDS
```typescript
setup_starting_score_p1: number | null
setup_starting_score_p2: number | null
setup_next_server_id: string | null
setup_completed_at: string | null
```

### Rally Table - NEW FIELD
```typescript
is_stub_rally: boolean  // Default: false
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│  Phase1TimestampComposer                │
├─────────────────────────────────────────┤
│                                         │
│  [SETUP PHASE] (if no rallies exist)   │
│  ┌──────────────────────────────┐      │
│  │ SetupControlsBlock           │      │
│  │ - Who serves next?           │      │
│  │ - Current score?             │      │
│  │ - [Start Tagging] button     │      │
│  └──────────────────────────────┘      │
│          ↓                              │
│  [CREATE STUB RALLIES]                 │
│  - Calculate previous servers          │
│  - Create rally records (is_stub=true) │
│  - Save setup to Set record            │
│          ↓                              │
│  [TAGGING PHASE]                       │
│  - Normal Phase 1 tagging              │
│  - Track score before/after            │
│  - Auto-save each rally                │
│  - Detect set end                      │
│          ↓                              │
│  [SET END DETECTED]                    │
│  ┌──────────────────────────────┐      │
│  │ SetEndWarningBlock           │      │
│  │ - [Save Set] [Continue]      │      │
│  └──────────────────────────────┘      │
│          ↓                              │
│  [COMPLETION]                          │
│  ┌──────────────────────────────┐      │
│  │ CompletionModal              │      │
│  │ - [Tag Next Set]             │      │
│  │ - [Back to Matches]          │      │
│  │ - [View Data]                │      │
│  └──────────────────────────────┘      │
└─────────────────────────────────────────┘
```

---

## 📁 Implementation Phases

Work through these **sequentially** - each phase has its own detailed task file:

### ✅ Phase 1: Database Schema Updates
**File:** `Phase1_Setup_Flow_Phase1_Database.md`  
**Effort:** ~2 hours  
**Dependencies:** None  
**Deliverables:** Updated Set and Rally types + DB operations

### ✅ Phase 2: Core Logic Functions  
**File:** `Phase1_Setup_Flow_Phase2_Rules.md`  
**Effort:** ~3-4 hours  
**Dependencies:** Phase 1  
**Deliverables:** 3 new rules functions with tests

### ✅ Phase 3: UI Components
**File:** `Phase1_Setup_Flow_Phase3_Components.md`  
**Effort:** ~4-5 hours  
**Dependencies:** Phase 1, Phase 2  
**Deliverables:** 3 new UI components

### ✅ Phase 4: Phase1TimestampComposer Updates
**File:** `Phase1_Setup_Flow_Phase4_Composer.md`  
**Effort:** ~8-10 hours (most complex)  
**Dependencies:** Phase 1, Phase 2, Phase 3  
**Deliverables:** Fully integrated setup flow in composer

### ✅ Phase 5: Match Detail Page
**File:** `Phase1_Setup_Flow_Phase5_MatchDetail.md`  
**Effort:** ~2 hours  
**Dependencies:** Phase 4  
**Deliverables:** Enhanced set display with status badges

### ✅ Phase 6: Cleanup
**File:** `Phase1_Setup_Flow_Phase6_Cleanup.md`  
**Effort:** ~1 hour  
**Dependencies:** Phase 4  
**Deliverables:** Removed manual save functionality

### ✅ Phase 7: Documentation
**File:** `Phase1_Setup_Flow_Phase7_Documentation.md`  
**Effort:** ~1-2 hours  
**Dependencies:** All phases complete  
**Deliverables:** Updated specAddendumMVP.md

---

## 🧪 Testing Strategy

### After Each Phase
- Unit tests for rules functions (Phase 2)
- Component tests for UI (Phase 3)
- Integration tests for composer (Phase 4)

### Final End-to-End Testing
1. Fresh set - setup → tag → save → completion
2. Resume set - skip setup → tag → save
3. Set end detection - warning → continue → save
4. Navigation - next set → match detail → data viewer

---

## 📋 Current Project Context

### Tech Stack
- **Frontend:** Vite + React 18 + TypeScript + Zustand + Tailwind CSS
- **Database:** Local (IndexedDB via custom DB layer)
- **State:** Zustand stores with persist middleware

### Key Existing Files
- `app/src/features/shot-tagging-engine/composers/Phase1TimestampComposer.tsx` - Main file to update
- `app/src/data/entities/sets/` - Set database schema
- `app/src/data/entities/rallies/` - Rally database schema
- `app/src/rules/` - Pure domain logic functions
- `app/src/features/shot-tagging-engine/blocks/` - UI components

### Existing Rules Functions to Reference
- `calculateServer()` - Determines server based on score (we'll use for validation)
- `calculateShotPlayer()` - Determines which player hit a shot
- `deriveRally_winner_id()` - Determines rally winner from shot data

### Important Conventions
- **Rules layer:** Pure functions, NO React, NO IO
- **Components:** Composers access stores, Sections receive props, Blocks are presentational
- **Database:** All saves async, handle errors gracefully
- **Naming:** 
  - Components: `<Thing>Block.tsx`, `<Thing>Section.tsx`, `<Thing>Composer.tsx`
  - Rules: `calculate<Thing>()`, `derive<Thing>()`, `validate<Thing>()`
  - Hooks: `use<Thing>()`, `useDerive<Thing>()`

---

## 🚨 Critical Reminders for Implementation

1. **Score Tracking Consistency**
   - First tagged rally gets `score_before` from setup
   - Subsequent rallies copy previous `score_after` to current `score_before`
   - Calculate `score_after` = `score_before + 1` for winner (except let rallies)

2. **Stub Rally Marker**
   - Always set `is_stub_rally: true` for pre-populated rallies
   - Always set `framework_confirmed: false` for stubs
   - Never set `winner_id` for stubs (unknown)

3. **Server Calculation**
   - Work BACKWARDS from next server
   - Use TT rules: every 2 points, or every 1 after 10-10
   - Test edge cases: 0-0, 10-10, 11-9, 12-12

4. **Auto-Save Only**
   - Remove manual save button completely
   - Each rally saves automatically when completed
   - "Save Set" only finalizes set status and shows modal

5. **Tagged Data Wins**
   - Always overwrite pre-entered scores with tagged scores
   - Tagged data is source of truth

---

## 🔄 Agent Handoff Instructions

If another agent needs to continue this work:

1. **Read this OVERVIEW file first** - understand the big picture and key decisions
2. **Check progress** - see which phase task files are complete
3. **Start at next incomplete phase** - each phase file is self-contained
4. **Reference the full plan** - `Phase1_Setup_Flow_Implementation_Plan.md` has ALL code examples
5. **Follow conventions** - see "Important Conventions" section above
6. **Test incrementally** - don't move to next phase until current one works

---

## 📞 Questions or Issues?

If you encounter ambiguity:
1. Refer to the full implementation plan for complete code examples
2. Check existing similar implementations in the codebase
3. Follow the principle: "Tagged data is source of truth"
4. When in doubt, favor simplicity and consistency with existing patterns

---

## ✅ Success Criteria

Phase 1 Setup Flow is complete when:
- [ ] User can start tagging from any score (e.g., 2-3)
- [ ] Stub rallies are created for previous points
- [ ] Score tracking is accurate throughout tagging
- [ ] Set end detection works correctly
- [ ] Completion modal appears with all 3 navigation options
- [ ] "Tag Next Set" creates/resumes next set
- [ ] Match detail page shows status badges
- [ ] All manual testing scenarios pass
- [ ] Documentation is updated

---

**Next Step:** Start with Phase 1 (Database Schema Updates)  
**Task File:** `Phase1_Setup_Flow_Phase1_Database.md`

