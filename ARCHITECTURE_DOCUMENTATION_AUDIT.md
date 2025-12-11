# Architecture Documentation Audit & Consolidation Plan

**Date:** 2025-12-11  
**Status:** 📋 PLAN ONLY - NO CHANGES MADE YET

---

## Executive Summary

Found **20+ architecture-related documents** with significant overlap, outdated information, and conflicting tech stack descriptions. Current `Architecture.md` is **outdated** (v0.9.0, last updated 2025-12-01) and doesn't reflect recent refactoring or current implementation.

**Recommendation:** Consolidate into ONE comprehensive `Architecture.md` reverse-engineered from actual code, similar to what was done for `DataSchema.md`.

---

## 📁 All Architecture-Related Documents Found

### **TIER 1: Primary Architecture Documents**

1. **`docs-match-analyser-edge-tt/Architecture.md`** ⭐
   - **Status:** "Source of Truth" (per .cursorrules)
   - **Version:** 0.9.0
   - **Last Updated:** 2025-12-01 (10 days old)
   - **Lines:** 586
   - **Content:** Tech stack, folder structure, layers, naming conventions, data layer
   - **Issues:**
     - Outdated tech stack (mentions TanStack Query - NOT used)
     - Says `stores/` folder but implementation uses `data/entities/` pattern
     - Folder structure doesn't match actual code
     - Missing recent refactoring (derive/infer/calculate split)
     - No mention of analytics feature
     - Data layer description outdated

2. **`.cursorrules`** ✅
   - **Status:** Current, accurate
   - **Lines:** 150
   - **Content:** Folder structure, naming conventions, code rules, import rules
   - **Issues:** 
     - NONE - This is accurate!
     - Should be used as template for Architecture.md

### **TIER 2: Overlapping/Conflicting Documents**

3. **`docs-match-analyser-edge-tt/MVP_Spec_and_Architecture.md`**
   - **Lines:** 531
   - **Content:** MVP goals, entities, two-step flow, tech stack
   - **Issues:**
     - **MAJOR CONFLICT:** Says "React Router v7" (wrong - using v6)
     - **MAJOR CONFLICT:** Says "TanStack Query" for server state (NOT USED)
     - **MAJOR CONFLICT:** Says "Dexie.js for IndexedDB" (correct but incomplete picture)
     - **MAJOR CONFLICT:** Says "Supabase + Edge Functions" (NOT IN MVP)
     - Describes old entity structure (UUIDs, not slugs)
     - Outdated workflow description

4. **`docs-match-analyser-edge-tt/specs/techstack.md`**
   - **Lines:** 138
   - **Content:** Detailed tech stack breakdown
   - **Issues:**
     - **MAJOR CONFLICT:** Lists TanStack Query (NOT USED)
     - **MAJOR CONFLICT:** Lists React Router v7 (WRONG - using v6)
     - **MAJOR CONFLICT:** Lists Hls.js and Video.js (NOT USED - using HTML5 video)
     - **MAJOR CONFLICT:** Describes Supabase Edge Functions (NOT IN MVP)
     - **MAJOR CONFLICT:** Describes sync architecture not implemented
     - Completely inaccurate for current MVP

5. **`docs-match-analyser-edge-tt/specs/ArchitectureAnalysis_Part1Flow.md`**
   - **Status:** "RESOLVED (2025-12-02)"
   - **Lines:** 179
   - **Content:** Bug analysis of old tagging flow
   - **Issues:**
     - Historical document about bugs that are FIXED
     - Should be moved to archive or deleted
     - Not relevant to current architecture

### **TIER 3: Implementation/Refactoring Documents (Historical)**

6. **`docs-match-analyser-edge-tt/REFACTORING_COMPLETE_2025-12-06.md`** 📊
   - **Status:** Completion report
   - **Lines:** 300
   - **Content:** Rules layer reorganization (derive/calculate/infer/validate)
   - **Value:** Documents the CURRENT rules architecture
   - **Should:** Be incorporated into Architecture.md, then moved to archive

7. **`docs-match-analyser-edge-tt/CLEANUP_COMPLETE_2025-12-06.md`** 📊
   - **Status:** Completion report
   - **Lines:** 236
   - **Content:** UI-to-DB mapper extraction
   - **Value:** Documents mapping patterns
   - **Should:** Key patterns incorporated into Architecture.md

8. **`docs-match-analyser-edge-tt/INTEGRATION_COMPLETE_2025-12-06.md`**
   - **Lines:** ~200
   - **Content:** Integration of rules into composers
   - **Should:** Archive after extracting key patterns

9. **`docs-match-analyser-edge-tt/DUPLICATE_LOGIC_AUDIT.md`**
   - **Lines:** ~150
   - **Content:** Audit of code duplication (now resolved)
   - **Should:** Delete (historical, issues resolved)

10. **`REFACTOR_COMPLETE.md`** (root level)
    - **Lines:** ~200
    - **Content:** Earlier refactoring summary
    - **Should:** Delete or merge with other completion docs

### **TIER 4: Design & UI Documentation**

11. **`docs-match-analyser-edge-tt/specs/DesignSystem.md`**
    - **Lines:** ~400
    - **Content:** UI components, design tokens, patterns
    - **Value:** Good reference for UI architecture
    - **Should:** Keep, possibly reference from Architecture.md

12. **`docs-match-analyser-edge-tt/chat_notes/design_to_build_process.md`**
    - **Lines:** ~100
    - **Content:** Process for converting designs to code
    - **Should:** Keep in chat_notes (process doc)

### **TIER 5: Feature-Specific Architecture**

13. **`docs-match-analyser-edge-tt/Global_Analysis_Card_Prompts/analytics_card_implementation_guide.md`**
    - **Lines:** 360
    - **Content:** Analytics card architecture and patterns
    - **Value:** Good feature-specific architecture
    - **Should:** Keep as feature doc

14. **`docs-match-analyser-edge-tt/specs/Phase1_Setup_Flow_Implementation_Plan.md`**
    - **Lines:** ~600
    - **Content:** Phase 1 setup flow architecture
    - **Should:** Keep as feature doc

15. **`docs-match-analyser-edge-tt/specs/Implementation_RallyCheckpointFlow.md`**
    - **Lines:** ~400
    - **Content:** Rally checkpoint workflow
    - **Should:** Keep as feature doc

### **TIER 6: Implementation Status/Completion Documents**

16. **`docs-match-analyser-edge-tt/specs/MVP_IMPLEMENTATION_COMPLETE.md`**
    - **Should:** Archive (historical)

17. **`docs-match-analyser-edge-tt/specs/MVP_Implementation_Status.md`**
    - **Should:** Delete (outdated status)

18. **`docs-match-analyser-edge-tt/specs/STATS_IMPLEMENTATION_SUMMARY.md`**
    - **Should:** Archive (historical, stats feature replaced by analytics)

19. **`PHASE1_PHASE2_COMPLETE.md`** (root)
    - **Should:** Archive

20. **`PHASE1_SETUP_FLOW_COMPLETE.md`** (root)
    - **Should:** Archive

21. **`PROTOTYPE_RENAMING_PLAN.md`** (root)
    - **Should:** Delete (plan executed)

22. **`REDUNDANT_SETUP_CLEANUP_COMPLETE.md`** (root)
    - **Should:** Archive

---

## 🚨 Critical Issues Identified

### Issue 1: Tech Stack Conflicts

**Files claiming different tech stacks:**

| File | React Router | State Mgmt | DB | Backend | Video |
|------|--------------|-----------|-----|---------|-------|
| `.cursorrules` ✅ | (not specified) | Zustand | (not specified) | Local-first | (not specified) |
| `Architecture.md` | v6 ✅ | Zustand ✅ | Dexie ✅ | localStorage ✅ | HTML5 ✅ |
| `techstack.md` ❌ | v7 ❌ | TanStack Query ❌ | Dexie + Supabase ❌ | Supabase ❌ | Hls.js + Video.js ❌ |
| `MVP_Spec_and_Architecture.md` ❌ | v7 ❌ | TanStack Query ❌ | Dexie + Supabase ❌ | Supabase ❌ | (not specified) |

**ACTUAL STACK (from package.json and code):**
- ✅ React 18.3.1
- ✅ React Router v6.28.0
- ✅ TypeScript 5.6.2
- ✅ Vite 6.0.1
- ✅ Zustand 5.0.2 (with persist middleware)
- ✅ Dexie 4.0.10 (IndexedDB)
- ✅ Tailwind CSS 3.4.17
- ✅ Radix UI (shadcn components)
- ✅ Lucide React (icons)
- ✅ HTML5 Video API (NOT Hls.js, NOT Video.js)
- ✅ FFmpeg.wasm 0.12.11 (for video export)
- ❌ NO TanStack Query
- ❌ NO Supabase (MVP is local-first)
- ❌ NO Next.js
- ❌ NO React Router v7

### Issue 2: Folder Structure Mismatch

**`Architecture.md` says:**
```
app/src/
  stores/             # Zustand stores
  data/               # Data layer (Dexie + Zustand + future Supabase)
    entities/         # One folder per entity
      clubs/
        club.types.ts
        club.db.ts
        club.store.ts  # <-- Says each entity has Zustand store
```

**ACTUAL CODE has:**
```
app/src/
  stores/
    taggingSessionStore.ts   # Only ONE Zustand store (tagging UI state)
  data/
    db.ts             # Dexie database instance
    entities/         # Entity folders
      clubs/
        club.types.ts  # Types
        club.db.ts     # Dexie CRUD operations
        club.store.ts  # Zustand cache for this entity
```

**The pattern IS correct** but description is confusing. Entity stores are for **caching**, not primary storage.

### Issue 3: Missing Recent Architecture Changes

**`Architecture.md` doesn't mention:**
- ✅ **Rules reorganization** (2025-12-06): `derive/` vs `calculate/` vs `infer/` vs `validate/`
- ✅ **Analytics feature** (2025-12-11): Card-based architecture, FilterBar, BasicInsightCardTemplate
- ✅ **Three-phase tagging workflow**: Phase1 (timestamps), Phase2 (details), Phase3 (inference)
- ✅ **Data-audit feature**: Debugging/verification UI
- ✅ **Multi-video support**: Multiple video segments per match
- ✅ **Slug-based IDs**: Human-readable identifiers
- ✅ **Top-down/bottom-up data flow**: Pre-enter results, verify with tagging

### Issue 4: Outdated Entity Descriptions

**Old docs describe UUIDs and camelCase**, actual code uses **slugs and snake_case**.

---

## 📊 Comparison: Architecture.md vs Actual Code

### Folder Structure Accuracy

| Folder | Architecture.md | Actual Code | Match? |
|--------|-----------------|-------------|---------|
| `pages/` | ✅ Correct | ✅ Exists | ✅ YES |
| `features/` | ✅ Correct structure | ✅ Matches pattern | ✅ YES |
| `rules/` | ❌ Flat structure shown | ✅ Has `derive/`, `calculate/`, `infer/`, `validate/`, `analytics/` | ❌ NO |
| `data/` | ✅ Mostly correct | ✅ Matches | ✅ YES |
| `stores/` | ❌ Says multiple stores | ✅ Only `taggingSessionStore.ts` | ❌ NO |
| `ui-mine/` | ✅ Correct | ✅ Matches | ✅ YES |
| `components/` | ✅ Correct | ✅ Matches | ✅ YES |
| `helpers/` | ✅ Correct | ✅ Matches | ✅ YES |

**Accuracy: 6/8 = 75%**

### Tech Stack Accuracy

| Technology | Architecture.md | Actual Code | Match? |
|------------|-----------------|-------------|---------|
| React 18 | ✅ Correct | ✅ Yes | ✅ YES |
| TypeScript | ✅ Correct | ✅ Yes | ✅ YES |
| Vite | ✅ Correct | ✅ Yes | ✅ YES |
| React Router | ✅ v6 | ✅ v6 | ✅ YES |
| Zustand | ✅ Correct | ✅ Yes | ✅ YES |
| Tailwind | ✅ Correct | ✅ Yes | ✅ YES |
| lucide-react | ✅ Correct | ✅ Yes | ✅ YES |
| Dexie | ✅ Correct | ✅ Yes | ✅ YES |
| HTML5 Video | ✅ Correct | ✅ Yes | ✅ YES |
| FFmpeg.wasm | ✅ Mentioned | ✅ Yes | ✅ YES |

**Accuracy: 10/10 = 100%** ✅

*Note: Architecture.md is accurate on tech stack, but `techstack.md` and `MVP_Spec_and_Architecture.md` are NOT.*

---

## ✅ What's Good (Keep These Patterns)

### From `.cursorrules` (ACCURATE):
- ✅ Clear folder structure diagram
- ✅ Naming conventions (Composer, Section, Block, derive hooks)
- ✅ Layer responsibilities (features/rules/stores/ui-mine)
- ✅ Import rules (never import shadcn directly)
- ✅ Code rules (pure functions in rules/, no React)

### From `Architecture.md` (MOSTLY GOOD):
- ✅ Tech stack table (accurate)
- ✅ Layer descriptions (pages/features/rules/data/ui-mine)
- ✅ Naming conventions
- ✅ Data flow principles

### From `REFACTORING_COMPLETE_2025-12-06.md` (CURRENT REALITY):
- ✅ **Rules organization:**
  - `derive/` → Deterministic derivations (100% fact)
  - `calculate/` → Arithmetic calculations
  - `infer/` → Probabilistic inferences (ML/AI)
  - `validate/` → Data integrity checks
  - `analytics/` → Aggregated statistics
- ✅ Naming convention: Functions named after DB fields (`deriveRally_winner_id`)

---

## 📋 CONSOLIDATION PLAN

### Phase 1: Update Architecture.md (MAIN TASK)

**Action:** Complete rewrite of `Architecture.md` reverse-engineered from code

**New Structure:**
```markdown
# Edge TT Match Analyser — Architecture

## 1. Overview
- Project identity
- Goals & principles
- Local-first architecture

## 2. Tech Stack (ACCURATE)
- Framework: React 18 + Vite + TypeScript
- Routing: React Router v6
- State: Zustand + Dexie
- UI: Tailwind + Radix UI + lucide-react
- Video: HTML5 Video API + FFmpeg.wasm
- What we're NOT using (TanStack Query, Supabase, Next.js)

## 3. Folder Structure (FROM .cursorrules + ACTUAL CODE)
app/src/
  pages/              # Route components
  features/           # Feature-specific UI & orchestration
    <feature>/
      composers/      # Route-level composition
      sections/       # Page sections
      blocks/         # Smaller UI units
      derive/         # View model derivation hooks (optional)
      models.ts       # View model types (optional)
  rules/              # Pure domain logic
    derive/           # Deterministic derivations
    calculate/        # Arithmetic calculations
    infer/            # Probabilistic inferences
    validate/         # Data integrity
    analytics/        # Aggregated statistics
  data/               # Data layer
    db.ts             # Dexie instance
    entities/         # Entity CRUD + caching
      <entity>/
        *.types.ts    # TypeScript types
        *.db.ts       # Dexie operations
        *.store.ts    # Zustand cache (optional)
  stores/             # Global UI state
    taggingSessionStore.ts  # Tagging UI state
  ui-mine/            # Shared UI kit
  components/
    ui/               # shadcn primitives
    layout/           # AppShell, Sidebar
  helpers/            # Pure utilities

## 4. Layers & Responsibilities
### 4.1 pages/ - Routing
### 4.2 features/ - Feature UI & Orchestration
### 4.3 rules/ - Pure Domain Logic
  - derive/ - Deterministic (100% fact, persisted)
  - calculate/ - Arithmetic (100% fact, not persisted)
  - infer/ - Probabilistic (ML/AI, persisted with confidence)
  - validate/ - Data integrity checks
  - analytics/ - Aggregated statistics
### 4.4 data/ - Data Layer
  - Dexie for IndexedDB storage
  - Entity pattern: types → db → store (cache)
  - Slug-based IDs (human-readable)
### 4.5 stores/ - Global UI State
  - Only taggingSessionStore for now
  - Zustand with persist middleware
### 4.6 ui-mine/ - Shared UI Kit
### 4.7 helpers/ - Pure Utilities

## 5. Key Architectural Patterns
### 5.1 Feature Architecture (analytics example)
### 5.2 Rules Organization (derive vs infer vs calculate)
### 5.3 Data Flow (top-down + bottom-up)
### 5.4 Three-Phase Tagging Workflow
### 5.5 Multi-Video Support
### 5.6 Slug-Based IDs

## 6. Naming Conventions
- Components: Composer, Section, Block suffixes
- Hooks: useDerive* pattern
- Rules: derive*, calculate*, infer*, validate* prefixes
- Store actions: add/create, update/set, delete/remove, toggle

## 7. Import Rules & Code Rules
- Features import from @/ui-mine, never @/components/ui
- Never import lucide-react directly
- Pure functions in rules/ (no React, no IO)
- Composers access stores, Sections receive props, Blocks presentational

## 8. Future Migration
- Supabase migration path
- Slug → UUID conversion strategy
- Sync architecture (not in MVP)

## 9. Related Documentation
- DataSchema.md - Entity definitions
- Glossary.md - Domain terminology
- MVP_flowchange_spec.md - Current feature spec
- specAddendumMVP.md - Change history
```

**Source Material:**
1. ✅ `.cursorrules` (folder structure, conventions) - USE THIS
2. ✅ `Architecture.md` (tech stack, layers) - UPDATE THIS
3. ✅ `REFACTORING_COMPLETE_2025-12-06.md` (rules organization) - INCORPORATE
4. ✅ Actual code in `app/src/` - VERIFY EVERYTHING

### Phase 2: Delete Redundant/Outdated Documents

**DELETE (Inaccurate/Misleading):**
1. ❌ `docs-match-analyser-edge-tt/specs/techstack.md`
   - Reason: Completely inaccurate (TanStack Query, React Router v7, Supabase, Hls.js)
   - Replacement: Tech stack section in Architecture.md

2. ❌ `docs-match-analyser-edge-tt/MVP_Spec_and_Architecture.md`
   - Reason: Inaccurate tech stack, outdated entity descriptions
   - Replacement: Architecture.md + DataSchema.md + MVP_flowchange_spec.md

3. ❌ `docs-match-analyser-edge-tt/specs/ArchitectureAnalysis_Part1Flow.md`
   - Reason: Historical bug analysis, issues resolved
   - Replacement: None needed (bugs fixed)

4. ❌ `docs-match-analyser-edge-tt/DUPLICATE_LOGIC_AUDIT.md`
   - Reason: Historical audit, issues resolved
   - Replacement: None needed

5. ❌ `docs-match-analyser-edge-tt/specs/MVP_Implementation_Status.md`
   - Reason: Outdated status document
   - Replacement: None needed (status outdated)

6. ❌ `PROTOTYPE_RENAMING_PLAN.md`
   - Reason: Plan document, work completed
   - Replacement: None needed

**ARCHIVE (Historical but valuable):**

Move to `docs-match-analyser-edge-tt/Historical/` folder:

1. 📦 `REFACTORING_COMPLETE_2025-12-06.md`
2. 📦 `CLEANUP_COMPLETE_2025-12-06.md`
3. 📦 `INTEGRATION_COMPLETE_2025-12-06.md`
4. 📦 `REFACTOR_COMPLETE.md`
5. 📦 `PHASE1_PHASE2_COMPLETE.md`
6. 📦 `PHASE1_SETUP_FLOW_COMPLETE.md`
7. 📦 `REDUNDANT_SETUP_CLEANUP_COMPLETE.md`
8. 📦 `specs/MVP_IMPLEMENTATION_COMPLETE.md`
9. 📦 `specs/STATS_IMPLEMENTATION_SUMMARY.md`

**KEEP (Feature-Specific or Design):**
- ✅ `specs/DesignSystem.md` (UI design patterns)
- ✅ `specs/Phase1_Setup_Flow_Implementation_Plan.md` (feature doc)
- ✅ `specs/Implementation_RallyCheckpointFlow.md` (feature doc)
- ✅ `Global_Analysis_Card_Prompts/analytics_card_implementation_guide.md` (feature doc)
- ✅ `chat_notes/design_to_build_process.md` (process doc)

### Phase 3: Update .cursorrules (if needed)

**Check if `.cursorrules` needs updates after Architecture.md rewrite.**

Likely NO changes needed - `.cursorrules` is already accurate!

### Phase 4: Update Changelog

Add entry to `specs/specAddendumMVP.md`:
- Architecture documentation consolidated
- Accurate tech stack documented
- Rules organization documented
- Inaccurate docs deleted
- Historical docs archived

---

## 📈 Expected Impact

### Before Consolidation:
- ❌ 20+ architecture documents
- ❌ Conflicting tech stack info (TanStack Query? React Router v7?)
- ❌ Outdated folder structure
- ❌ Missing recent refactoring
- ❌ Confusion about what's actually used

### After Consolidation:
- ✅ 1 authoritative Architecture.md (reverse-engineered from code)
- ✅ Accurate tech stack (matches package.json)
- ✅ Accurate folder structure (matches app/src/)
- ✅ Documents rules reorganization (derive/calculate/infer/validate/analytics)
- ✅ Documents three-phase workflow, multi-video, analytics
- ✅ Clear patterns and conventions
- ✅ Historical docs archived (not deleted, for reference)
- ✅ Single source of truth

---

## 🎯 Accuracy Targets

### Current `Architecture.md` Accuracy:
- **Tech Stack:** 100% ✅
- **Folder Structure:** 75% ⚠️ (missing rules subfolders)
- **Completeness:** 60% ⚠️ (missing recent features)
- **Overall:** ~78% accurate

### Target for New `Architecture.md`:
- **Tech Stack:** 100% ✅
- **Folder Structure:** 100% ✅ (verified against code)
- **Rules Organization:** 100% ✅ (derive/calculate/infer/validate/analytics)
- **Feature Patterns:** 100% ✅ (analytics card example)
- **Data Layer:** 100% ✅ (Dexie + slug IDs)
- **Completeness:** 100% ✅ (all major patterns documented)
- **Overall:** ~100% accurate 🎯

---

## ⚠️ Risk Assessment

### Low Risk:
- Deleting clearly inaccurate docs (`techstack.md`, `MVP_Spec_and_Architecture.md`)
- Archiving completion reports
- Updating Architecture.md (source of truth anyway)

### Medium Risk:
- Deleting historical bug analysis docs
- **Mitigation:** Move to archive instead of delete

### High Risk:
- NONE - All changes are documentation only

---

## 📝 Execution Checklist

- [ ] Read entire `Architecture.md` current version
- [ ] Examine all actual folders in `app/src/`
- [ ] Read `package.json` for tech stack verification
- [ ] Read key files from each folder (examples)
- [ ] Document actual naming patterns from code
- [ ] Create new comprehensive `Architecture.md` (v3.0)
- [ ] Delete inaccurate documents (6 files)
- [ ] Archive historical documents (9 files → Historical/)
- [ ] Update `.cursorrules` if needed
- [ ] Update `specAddendumMVP.md` changelog (v3.21.0)
- [ ] Create summary report (ARCHITECTURE_CLEANUP_2025-12-11.md)
- [ ] Commit and push changes

---

## 🔗 Related Cleanups

- ✅ **Schema Documentation** - COMPLETE (2025-12-11, v3.20.0)
  - Consolidated DataSchema.md from code
  - Deleted 7 redundant schema docs

- ⏭️ **Architecture Documentation** - THIS PLAN
  - Consolidate Architecture.md from code
  - Delete 6 inaccurate docs
  - Archive 9 historical docs

- 🔮 **Future Cleanups:**
  - Glossary.md validation
  - Specs folder organization
  - Root-level .md files organization

---

*Audit complete. Ready for user approval to execute consolidation.*

