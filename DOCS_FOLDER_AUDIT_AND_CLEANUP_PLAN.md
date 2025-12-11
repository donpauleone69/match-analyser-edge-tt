# docs-match-analyser-edge-tt Folder Audit & Cleanup Plan

**Date:** 2025-12-11  
**Status:** 📋 Comprehensive Analysis - Ready for Cleanup

---

## Executive Summary

The `docs-match-analyser-edge-tt` folder contains **100+ files** across multiple subfolders with significant redundancy:
- **Multiple outdated specs** from different project phases
- **Duplicate gesture/inference docs** (4+ versions)
- **Historical HTML prototypes** (29 files)
- **Chat notes** that should be archived or deleted
- **Figma prompts** that are outdated (UI already built)
- **Test data CSVs** scattered across folders

**Recommendation:** Consolidate to ~15 essential documents, archive/delete the rest.

---

## Current Structure

```
docs-match-analyser-edge-tt/
├── Architecture.md ✅ KEEP (v3.0, updated today)
├── DataSchema.md ✅ KEEP (v3.0, updated today)
├── Glossary.md ✅ KEEP (current)
├── iOS_Video_Quick_Guide.md ❓ REVIEW
├── LocalVideoHandling.md ❓ REVIEW
├── Tagger2StepUserFlow.md ❓ OUTDATED
├── v2_AItraining.md ❌ DELETE (placeholder)
├── specs/ (39 files) 🔴 MAJOR CLEANUP
├── chat_notes/ (20+ files) 🔴 MAJOR CLEANUP
├── Global_Analysis_Card_Prompts/ (3 files) ✅ KEEP
├── Historical/ (29 HTML files) ❌ DELETE ALL
├── PlayerData/ (1 CSV) ❌ DELETE
├── videos/ (5 CSVs) ❌ DELETE
└── designs/ (2 HTML) ❌ DELETE
```

---

## Detailed Analysis by Folder

### 📁 ROOT LEVEL (7 files)

#### ✅ KEEP (3 files)
1. **Architecture.md** ✅
   - Status: v3.0, updated today, source of truth
   - Keep: YES

2. **DataSchema.md** ✅
   - Status: v3.0, updated today, source of truth
   - Keep: YES

3. **Glossary.md** ✅
   - Status: Current terminology reference
   - Keep: YES

#### ❓ REVIEW (2 files)
4. **iOS_Video_Quick_Guide.md**
   - Purpose: Guide for capturing video on iOS devices
   - Status: Still relevant for users
   - Recommendation: KEEP if users need iOS guidance, otherwise DELETE

5. **LocalVideoHandling.md**
   - Purpose: Technical guide for local video file handling
   - Status: May overlap with Architecture.md
   - Recommendation: REVIEW and possibly merge into Architecture.md

#### ❌ DELETE (2 files)
6. **Tagger2StepUserFlow.md**
   - Date: Unknown, pre-MVP flowchange
   - Status: OUTDATED - superseded by MVP_flowchange_spec.md and Architecture.md
   - Delete: YES

7. **v2_AItraining.md**
   - Content: "Full content placeholder" (3 lines, empty)
   - Delete: YES

---

### 📁 specs/ FOLDER (39 files)

#### ✅ KEEP - Core Specs (3 files)

1. **specAddendumMVP.md** ✅ SOURCE OF TRUTH
   - Purpose: Official changelog with v3.22.0 entry
   - Keep: YES - This is the master changelog

2. **MVP_flowchange_spec.md** ✅ CURRENT SPEC
   - Purpose: Current workflow specification
   - Status: v0.8.0, referenced by .cursorrules
   - Keep: YES

3. **MVP_flowchange_tasks.md** ✅ TASK LIST
   - Purpose: Task tracking for MVP
   - Keep: YES (or merge into consolidated roadmap)

#### ✅ KEEP - Design System (1 file)

4. **DesignSystem.md**
   - Purpose: UI design guidelines
   - Keep: YES

#### ❌ DELETE - Outdated/Completed Specs (19 files)

5. **FINAL_MVP_COMPLETE.md**
   - Status: Completion report (Dec 5, 2025)
   - Delete: YES - historical, work complete

6. **GapAnalysis_v0.9.5.md**
   - Status: Gap analysis report from Dec 1, 2025
   - Delete: YES - outdated, gaps closed

7. **GapResolution_Tasks.md**
   - Status: Tasks for gap resolution
   - Delete: YES - tasks complete

8. **Phase1_Setup_Flow_Implementation_Plan.md**
   - Status: Implementation plan - work complete
   - Delete: YES

9. **Phase1_Setup_Flow_OVERVIEW.md**
   - Status: Overview - work complete
   - Delete: YES

10. **Phase1_Setup_Flow_Phase1_Database.md**
    - Status: Database phase - work complete
    - Delete: YES

11. **Phase1_Setup_Flow_Phase2_Rules.md**
    - Status: Rules phase - work complete
    - Delete: YES

12. **Phase1_Setup_Flow_Phase3_Components.md**
    - Status: Components phase - work complete
    - Delete: YES

13. **Implementation_RallyCheckpointFlow.md**
    - Status: Implementation doc - feature complete
    - Delete: YES

14. **Remove_Database_Saves_From_TaggingUIComposer.md**
    - Status: Refactoring task - complete
    - Delete: YES

15. **PERSISTENCE_TESTING_GUIDE.md**
    - Status: Testing guide for old architecture
    - Delete: YES - testing approach documented in Architecture.md

16. **STATS_TESTING_GUIDE.md**
    - Status: Stats feature testing (stats replaced by analytics)
    - Delete: YES

17. **NotesTestingMVPPaul.md**
    - Status: Personal testing notes
    - Delete: YES

18. **MVP_flowchange.md**
    - Status: Partial spec (redundant with MVP_flowchange_spec.md)
    - Delete: YES

19. **shots_table.md**
    - Status: Shot table spec (redundant with DataSchema.md)
    - Delete: YES

20. **logicanddiagrams.md**
    - Status: Logic diagrams (check if useful first)
    - Delete: LIKELY

21. **Analysis Engine.md**
    - Status: Analysis engine spec (check against current analytics)
    - Delete: LIKELY (analytics is live)

22. **figma_prompts** (empty file?)
    - Delete: YES

#### ❌ DELETE - Figma Generated Prompts Folder (22 files)

**Figma_prompts_generated/** — All 22 files
- Status: Generated prompts for UI screens
- Problem: UI is ALREADY BUILT and different from these specs
- Screens listed: home_dashboard, match_setup, game_score_entry, part1_match_framework, etc.
- Delete: YES - ALL 22 FILES (outdated, UI already implemented)

Files to delete:
23-44. All Figma_prompts_generated/*.md (22 files)
  - 01_home_dashboard.md through 17_speed_controls_panel.md
  - DS_01_core_components.md through DS_04_video_tagging_components.md
  - Screens.md

---

### 📁 chat_notes/ FOLDER (20+ files)

#### ❓ KEEP - Potentially Useful (3 files)

1. **design_to_build_process.md**
   - Purpose: Process documentation
   - Keep: MAYBE - if process is still followed

2. **button_layout_flexible_width.md**
   - Purpose: Button layout design notes
   - Keep: MAYBE - if design principles still relevant

3. **video_export_and_constrained_playback.md**
   - Purpose: Video feature design
   - Keep: MAYBE - if feature not yet implemented

#### ❌ DELETE - Gesture/Inference Duplicates (4+ files)

4. **gestures_Intents_Inference_Engine.md**
5. **gestures_Intents_Inference_Engine (1).md**
6. **FOR_MVP_gestures_Intents_Inference_Engine.md**
7. **Final/gestures_Intents_Inference_Engine (2).md**
8. **Final/Final/gestures_Intents_Inference_Engine.md**
   - Status: MULTIPLE VERSIONS of same doc (Final/Final nesting!)
   - Delete: YES - Keep only the NEWEST one if any info is useful, otherwise delete all

#### ❌ DELETE - Outdated Specs (6 files)

9. **Spec_RallyCheckpointFlow.md**
   - Status: Superseded by Implementation_RallyCheckpointFlow.md
   - Delete: YES

10. **MVP_Descope_FullSetsOnly.md**
    - Status: Old descoping decision
    - Delete: YES

11. **PlayerProfileClaudePrompt.md**
    - Status: AI prompt for player profiles
    - Delete: YES - feature built

12. **Final/FastTrack_TaggingV2_Plan.md**
    - Status: Old plan
    - Delete: YES

13. **Final/Final/PlayerProfile_Spec.md**
    - Status: Old spec (nested in Final/Final!)
    - Delete: YES

14. **Final/Final/PlayerProfile_UserGuide.md**
    - Status: Old user guide
    - Delete: YES

#### ❌ DELETE - Outdated Technical Docs (4 files)

15. **Final/Final/serve_input_spec.md**
    - Status: Serve input spec (feature built)
    - Delete: YES

16. **Final/Final/player_skill_metrics.md**
    - Status: Player skill metrics (if built, delete)
    - Delete: YES

17. **Final/Final/UIcodesnip.md**
    - Status: UI code snippets
    - Delete: YES

18. **contact_point_timing_convention.md**
    - Status: Timing convention notes
    - Delete: LIKELY (covered in Architecture.md)

#### ❌ DELETE - Data Files (2 files)

19. **match-data-2025-12-02.csv**
    - Status: Test data
    - Delete: YES

20. **Final/Final/project_decisions.xlsx**
    - Status: Project decisions spreadsheet
    - Delete: MAYBE - check if useful, otherwise delete

#### ❌ DELETE - My Notes Folder (4+ files)

**MY NOTES/** folder - Personal notes
21-24. All files in MY NOTES/
  - Shot Sequence Objective Properties.md
  - ShotModelTables.xlsx
  - Table Structure IDeas/shots.md
  - Table Structure IDeas/shots.yaml
  - Temp_Plan_Notes.md
  - Delete: YES - Personal temp notes, superseded by DataSchema.md

---

### 📁 Global_Analysis_Card_Prompts/ FOLDER (3 files)

#### ✅ KEEP ALL (3 files)

1. **analytics_card_implementation_guide.md** ✅
   - Purpose: Analytics card patterns (360 lines)
   - Status: Current feature documentation
   - Keep: YES

2. **context_prompt.md** ✅
   - Purpose: Context for analytics
   - Keep: YES

3. **phase1dataavailable.md** ✅
   - Purpose: Phase 1 data reference
   - Keep: YES

---

### 📁 Historical/ FOLDER (29 HTML files)

#### ❌ DELETE ALL (29 files)

All historical HTML prototypes:
- tt_layout_*.html (multiple versions)
- tt_rally_tagger_prototype*.html
- Delete: YES - ALL 29 FILES (prototypes, app is built)

---

### 📁 PlayerData/ FOLDER (1 file)

#### ❌ DELETE (1 file)

1. **PlayerData for database.csv**
   - Status: Test data
   - Delete: YES

---

### 📁 videos/ FOLDER (5 files)

#### ❌ DELETE ALL (5 files)

1-5. **match-data-2025-12-02*.csv** (5 duplicate CSVs)
   - Status: Test data exports
   - Delete: YES - ALL 5 FILES

---

### 📁 designs/ FOLDER (2 files)

#### ❌ DELETE ALL (2 files)

1-2. **tt-buttons-complete-v*.html** (2 HTML files)
   - Status: Button design prototypes
   - Delete: YES - Buttons are built

---

## Cleanup Summary

### Files to DELETE (95+ files)

**Root Level (2):**
- Tagger2StepUserFlow.md
- v2_AItraining.md

**specs/ Folder (41):**
- 19 outdated/completed spec files
- 22 Figma_prompts_generated files

**chat_notes/ Folder (20+):**
- 5 gesture/inference duplicates
- 6 outdated specs
- 4 outdated technical docs
- 2 data files
- 5+ MY NOTES files

**Historical/ Folder (29):**
- All 29 HTML prototype files

**PlayerData/ Folder (1):**
- PlayerData for database.csv

**videos/ Folder (5):**
- All 5 match-data CSV files

**designs/ Folder (2):**
- All 2 HTML design files

**TOTAL TO DELETE: ~100 files**

---

### Files to KEEP (15-20 files)

**Root Level (3):**
- ✅ Architecture.md (v3.0)
- ✅ DataSchema.md (v3.0)
- ✅ Glossary.md
- ❓ iOS_Video_Quick_Guide.md (optional)
- ❓ LocalVideoHandling.md (review/merge)

**specs/ Folder (4):**
- ✅ specAddendumMVP.md (changelog)
- ✅ MVP_flowchange_spec.md (current spec)
- ✅ MVP_flowchange_tasks.md (tasks)
- ✅ DesignSystem.md

**Global_Analysis_Card_Prompts/ (3):**
- ✅ analytics_card_implementation_guide.md
- ✅ context_prompt.md
- ✅ phase1dataavailable.md

**chat_notes/ (2-3):**
- ❓ design_to_build_process.md (if still relevant)
- ❓ button_layout_flexible_width.md (if design principles useful)
- ❓ video_export_and_constrained_playback.md (if feature not implemented)

---

## Proposed Consolidated Structure

After cleanup:

```
docs-match-analyser-edge-tt/
├── Architecture.md ✅ System architecture
├── DataSchema.md ✅ Entity definitions
├── Glossary.md ✅ Terminology
├── iOS_Video_Quick_Guide.md (optional user guide)
├── specs/
│   ├── specAddendumMVP.md ✅ Official changelog
│   ├── MVP_Current_And_Roadmap.md ✨ NEW: Consolidated spec
│   └── DesignSystem.md ✅ UI design guidelines
└── analytics/
    ├── analytics_card_implementation_guide.md
    ├── context_prompt.md
    └── phase1dataavailable.md
```

---

## Recommended New File: MVP_Current_And_Roadmap.md

**Purpose:** Single source of truth for:
- ✅ What's implemented (current state)
- 🚧 What's in progress
- 📋 What's planned (roadmap)

**Contents:**
1. **Current State** (v3.0)
   - Three-phase tagging workflow (LIVE)
   - Match/player/tournament management (LIVE)
   - Analytics cards (LIVE)
   - Multi-video support (LIVE)

2. **In Progress**
   - Phase 3 inference optimization
   - Additional analytics cards

3. **Roadmap**
   - Supabase migration (Q1 2026)
   - ML/AI shot classification
   - Video export features
   - Mobile app

**Supersedes:**
- MVP_flowchange_spec.md (integrate)
- MVP_flowchange_tasks.md (integrate)
- All Phase1_Setup_Flow_*.md (work complete)
- GapAnalysis_v0.9.5.md (gaps closed)

---

## Action Plan

### Phase 1: Delete Obvious Clutter (70 files)
1. ❌ Delete Historical/ folder (29 HTML files)
2. ❌ Delete Figma_prompts_generated/ (22 files)
3. ❌ Delete videos/ folder (5 CSVs)
4. ❌ Delete PlayerData/ folder (1 CSV)
5. ❌ Delete designs/ folder (2 HTML files)
6. ❌ Delete chat_notes/MY NOTES/ (5+ files)
7. ❌ Delete chat_notes/Final/Final/ (6 files)
8. ❌ Delete gesture duplicates in chat_notes/ (4 files)

### Phase 2: Delete Completed/Outdated Specs (20 files)
1. ❌ Delete all Phase1_Setup_Flow_*.md (5 files)
2. ❌ Delete FINAL_MVP_COMPLETE.md, GapAnalysis, GapResolution
3. ❌ Delete Implementation_RallyCheckpointFlow.md, shots_table.md
4. ❌ Delete PERSISTENCE_TESTING_GUIDE.md, STATS_TESTING_GUIDE.md
5. ❌ Delete Tagger2StepUserFlow.md, v2_AItraining.md

### Phase 3: Consolidate Specs
1. ✅ Create MVP_Current_And_Roadmap.md
2. ✅ Integrate MVP_flowchange_spec.md content
3. ✅ Integrate MVP_flowchange_tasks.md content
4. ❌ Delete original files after consolidation

### Phase 4: Reorganize
1. ✅ Move Global_Analysis_Card_Prompts/ to analytics/
2. ✅ Review chat_notes/ remaining files (keep 2-3 max)
3. ✅ Update .cursorrules to point to new structure

---

## Final Structure (After Cleanup)

**~12 essential files:**

```
docs-match-analyser-edge-tt/
├── Architecture.md (1,320 lines)
├── DataSchema.md (661 lines)
├── Glossary.md (244 lines)
├── iOS_Video_Quick_Guide.md (optional, 240 lines)
├── specs/
│   ├── specAddendumMVP.md (~4,000 lines - changelog)
│   ├── MVP_Current_And_Roadmap.md (NEW - consolidated spec)
│   └── DesignSystem.md (~400 lines)
└── analytics/
    ├── analytics_card_implementation_guide.md (360 lines)
    ├── context_prompt.md (35 lines)
    └── phase1dataavailable.md (133 lines)
```

**Total: ~7,500 lines of essential documentation**  
**Deleted: ~100 files of historical/redundant docs**

---

## Benefits

1. **Clarity** — Single source for current state + roadmap
2. **Maintainability** — Update ONE spec file, not 20+
3. **Onboarding** — New developers have clear entry points
4. **Professional** — No clutter, no duplicates, no outdated docs
5. **Search** — Easier to find what you need

---

*Analysis complete. Ready for user approval to execute cleanup.*

