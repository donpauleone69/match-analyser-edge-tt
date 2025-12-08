# Plan: Remove "Prototype" from Naming

## Overview
Remove "prototype" terminology from codebase to reflect that this is now the production tagging system, not a prototype.

## Code Sections That Need Renaming

### 1. Component Names

#### `TaggingUIPrototypeComposer.tsx` → `TaggingUIComposer.tsx`
- **File:** `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx`
- **Current name:** `TaggingUIPrototypeComposer`
- **New name:** `TaggingUIComposer`
- **Current header comment:**
  ```typescript
  /**
   * TaggingUIPrototypeComposer — V2 main orchestrator
   * 
   * Phase 1: Timestamp capture with 1x4 button layout
   * Phase 2: Sequential question-based shot tagging
   */
  ```
- **New header comment:**
  ```typescript
  /**
   * TaggingUIComposer — Main orchestrator for two-phase tagging
   * 
   * Phase 1: Timestamp capture with 1x4 button layout
   * Phase 2: Sequential question-based shot tagging
   */
  ```

### 2. Interface/Type Names

#### `TaggingUIPrototypeComposerProps` → `TaggingUIComposerProps`
- **Location:** `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx:43`
- **Current:**
  ```typescript
  export interface TaggingUIPrototypeComposerProps {
    className?: string
  }
  ```
- **New:**
  ```typescript
  export interface TaggingUIComposerProps {
    className?: string
  }
  ```

### 3. Export Statements

#### `app/src/features/shot-tagging-engine/composers/index.ts`
- **Current:**
  ```typescript
  /**
   * Composers — Orchestration components for V2 prototype
   */
  
  export { TaggingUIPrototypeComposer } from './TaggingUIPrototypeComposer'
  ```
- **New:**
  ```typescript
  /**
   * Composers — Orchestration components for two-phase tagging
   */
  
  export { TaggingUIComposer } from './TaggingUIComposer'
  ```

#### `app/src/features/shot-tagging-engine/index.ts`
- **Current:**
  ```typescript
  /**
   * Tagging UI Prototype V2
   * 
   * Sequential question-based interface for shot tagging.
   * One question at a time with auto-advance flow.
   */
  
  export { TaggingUIPrototypeComposer } from './composers/TaggingUIPrototypeComposer'
  ```
- **New:**
  ```typescript
  /**
   * Shot Tagging Engine
   * 
   * Sequential question-based interface for shot tagging.
   * One question at a time with auto-advance flow.
   */
  
  export { TaggingUIComposer } from './composers/TaggingUIComposer'
  ```

#### `app/src/features/shot-tagging-engine/blocks/index.ts`
- **Current:**
  ```typescript
  /**
   * Blocks — Presentational components for V2 prototype
   */
  ```
- **New:**
  ```typescript
  /**
   * Blocks — Presentational components for shot tagging
   */
  ```

### 4. Import Statements

#### `app/src/pages/ShotTaggingEngine.tsx`
- **Current:**
  ```typescript
  /**
   * TaggingUIPrototypeV2 — Version 2 of tagging UI prototype
   * 
   * Sequential question-based interface with auto-advance.
   * Route: /tagging-ui-prototype/v2
   */
  
  import { TaggingUIPrototypeComposer } from '@/features/shot-tagging-engine'
  
  export function ShotTaggingEngine() {
    return <TaggingUIPrototypeComposer />
  }
  ```
- **New:**
  ```typescript
  /**
   * ShotTaggingEngine — Two-phase tagging interface
   * 
   * Sequential question-based interface with auto-advance.
   * Route: /matches/:matchId/tag
   */
  
  import { TaggingUIComposer } from '@/features/shot-tagging-engine'
  
  export function ShotTaggingEngine() {
    return <TaggingUIComposer />
  }
  ```

### 5. Comments in Code Files

#### `app/src/features/shot-tagging-engine/composers/dataMapping.ts`
- **Current header:**
  ```typescript
  /**
   * Mapping Service - Convert Prototype V2 data structures to database schema
   * 
   * This bridges the gap between the tagging UI and the database
   */
  ```
- **New header:**
  ```typescript
  /**
   * Mapping Service - Convert tagging UI data structures to database schema
   * 
   * This bridges the gap between the tagging UI and the database
   */
  ```

### 6. Documentation References (Optional - Can Leave)

These are in documentation files and can be left as-is for historical context:
- `docs-match-analyser-edge-tt/specs/DatabaseSchema_PrototypeV2.md`
- `docs-match-analyser-edge-tt/specs/TaggingPrototypeV2_FlowAndSchemaMapping.md`
- Various migration and historical documentation files

## Implementation Steps

1. ✅ Remove non-existent prototype links from Dashboard.tsx
2. Rename `TaggingUIPrototypeComposer.tsx` → `TaggingUIComposer.tsx`
3. Update all imports and exports
4. Update comments and documentation strings
5. Update interface/type names
6. Test that everything still works

## Files to Modify

1. `app/src/pages/Dashboard.tsx` - ✅ Already done (removed links)
2. `app/src/features/shot-tagging-engine/composers/TaggingUIPrototypeComposer.tsx` - Rename file and component
3. `app/src/features/shot-tagging-engine/composers/index.ts` - Update export
4. `app/src/features/shot-tagging-engine/index.ts` - Update export
5. `app/src/features/shot-tagging-engine/blocks/index.ts` - Update comment
6. `app/src/pages/ShotTaggingEngine.tsx` - Update import and comment
7. `app/src/features/shot-tagging-engine/composers/dataMapping.ts` - Update comment

## Notes

- The route `/matches/:matchId/tag` is already correct and doesn't need changing
- Documentation files can keep "prototype" references for historical context
- All functional code should use the new naming

