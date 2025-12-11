# Phase 3: UI Components

**Status:** 🔴 Not Started  
**Estimated Time:** 4-5 hours  
**Dependencies:** Phase 1 (Database), Phase 2 (Rules)  
**Next Phase:** Phase 4 (Composer Integration)

---

## Objective

Create three new UI components for the setup flow:
1. **SetupControlsBlock** - Captures server and score before tagging
2. **SetEndWarningBlock** - Shows warning when set end is detected
3. **CompletionModal** - Shows options after set is saved

**Important:** Follow component conventions - Blocks are presentational (props in, JSX out).

---

## Tasks

### Task 3.1: Create SetupControlsBlock

**File:** `app/src/features/shot-tagging-engine/blocks/SetupControlsBlock.tsx`

**Create new file:** *(See full implementation plan for complete code)*

**Component Requirements:**
- Accept player names as props
- Capture "Who serves next?" (2 buttons)
- Capture "Current score" (increment/decrement for each player, 0-20 range)
- Validate score before completing
- Call `onComplete` with setup data

**Props:**
```typescript
export interface SetupData {
  nextServerId: 'player1' | 'player2'
  p1Score: number
  p2Score: number
}

export interface SetupControlsBlockProps {
  player1Name: string
  player2Name: string
  onComplete: (setup: SetupData) => void
  className?: string
}
```

**UI Layout:**
```
┌──────────────────────────────────┐
│ Set Setup                        │
│ Configure starting conditions... │
├──────────────────────────────────┤
│ Who serves next?                 │
│ [Alice Button] [Bob Button]      │
├──────────────────────────────────┤
│ Current Score                    │
│ Alice  [−] 2 [+]                 │
│ Bob    [−] 3 [+]                 │
├──────────────────────────────────┤
│ [Start Tagging]                  │
└──────────────────────────────────┘
```

**Key Features:**
- Selected server button shows primary variant
- Score can't go below 0 or above 20
- "Start Tagging" validates score before calling onComplete
- Uses existing Button component from `@/ui-mine`

**Verification:**
- [ ] Component renders correctly
- [ ] Server selection works (toggles between players)
- [ ] Score increment/decrement works
- [ ] Score limits enforced (0-20)
- [ ] Validation called before completing
- [ ] onComplete called with correct data
- [ ] Styling matches existing blocks (bg-bg-card, etc.)

---

### Task 3.2: Create SetEndWarningBlock

**File:** `app/src/features/shot-tagging-engine/blocks/SetEndWarningBlock.tsx`

**Create new file:** *(See full implementation plan for complete code)*

**Component Requirements:**
- Show warning banner when set end detected
- Display set end score and current score (if continued)
- Provide [Save Set] and [Continue Tagging] buttons
- Yellow/warning color scheme

**Props:**
```typescript
export interface SetEndWarningBlockProps {
  currentScore: { player1: number; player2: number }
  setEndScore: { player1: number; player2: number }
  onSaveSet: () => void
  onContinueTagging: () => void
  className?: string
}
```

**UI Layout:**
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Set end detected at 11-8, now at 12-8       │
│ [Save Set] [Continue Tagging]                   │
└─────────────────────────────────────────────────┘
```

**Key Features:**
- Warning color: `bg-warning/10 border-warning/30`
- Show both scores if user continued past end
- Buttons aligned to right
- Warning icon (⚠️) on left

**Verification:**
- [ ] Component renders correctly
- [ ] Shows correct scores
- [ ] Buttons call correct handlers
- [ ] Warning styling applied
- [ ] Responsive layout

---

### Task 3.3: Create CompletionModal

**File:** `app/src/features/shot-tagging-engine/blocks/CompletionModal.tsx`

**Create new file:** *(See full implementation plan for complete code)*

**Component Requirements:**
- Full-screen modal overlay
- Show set number and final score
- Three action buttons: Tag Next Set, View Data, Back to Matches
- Success/completion styling

**Props:**
```typescript
export interface CompletionModalProps {
  setNumber: number
  finalScore: { player1: number; player2: number }
  player1Name: string
  player2Name: string
  onTagNextSet: () => void
  onBackToMatches: () => void
  onViewData: () => void
  className?: string
}
```

**UI Layout:**
```
┌─────────────────────────────────┐
│ Set 1 Complete!                 │
│ Final: Alice 11 - 8 Bob         │
│                                 │
│ [Tag Next Set]    (primary)     │
│ [View Data]       (secondary)   │
│ [Back to Matches] (secondary)   │
└─────────────────────────────────┘
```

**Key Features:**
- Fixed overlay: `fixed inset-0 bg-black/50`
- Centered modal: `flex items-center justify-center`
- Success color for final score
- Primary button for "Tag Next Set"
- Secondary buttons for other options

**Verification:**
- [ ] Component renders as modal overlay
- [ ] Shows correct set number and scores
- [ ] All three buttons work
- [ ] Modal is centered and responsive
- [ ] Overlay blocks interaction with background

---

### Task 3.4: Export New Components

**File:** `app/src/features/shot-tagging-engine/blocks/index.ts`

**Add exports:**

```typescript
// ... existing exports ...

export * from './SetupControlsBlock'
export * from './SetEndWarningBlock'
export * from './CompletionModal'
```

**Verification:**
- [ ] Components can be imported from blocks index
- [ ] No circular dependency issues

---

### Task 3.5: Test Components in Isolation (Optional)

**Create Storybook stories or test page:**

```typescript
// Test page for components
import { SetupControlsBlock, SetEndWarningBlock, CompletionModal } from '../blocks'

function TestPage() {
  return (
    <div className="p-8 space-y-8">
      <div className="border border-neutral-700 rounded">
        <SetupControlsBlock
          player1Name="Alice"
          player2Name="Bob"
          onComplete={(data) => console.log('Setup:', data)}
        />
      </div>
      
      <div className="border border-neutral-700 rounded">
        <SetEndWarningBlock
          currentScore={{ player1: 12, player2: 8 }}
          setEndScore={{ player1: 11, player2: 8 }}
          onSaveSet={() => console.log('Save Set')}
          onContinueTagging={() => console.log('Continue')}
        />
      </div>
      
      <CompletionModal
        setNumber={1}
        finalScore={{ player1: 11, player2: 8 }}
        player1Name="Alice"
        player2Name="Bob"
        onTagNextSet={() => console.log('Tag Next')}
        onBackToMatches={() => console.log('Back')}
        onViewData={() => console.log('View Data')}
      />
    </div>
  )
}
```

**Manual Testing:**
1. Render test page
2. Interact with each component
3. Verify all callbacks work
4. Check styling matches design
5. Test responsive behavior

**Verification:**
- [ ] SetupControlsBlock interactive and functional
- [ ] SetEndWarningBlock displays correctly
- [ ] CompletionModal blocks background interaction
- [ ] All components styled consistently

---

## Completion Checklist

- [ ] Task 3.1: SetupControlsBlock created and tested
- [ ] Task 3.2: SetEndWarningBlock created and tested
- [ ] Task 3.3: CompletionModal created and tested
- [ ] Task 3.4: Components exported from blocks index
- [ ] Task 3.5: Components tested in isolation (optional)
- [ ] All components follow Block conventions (presentational)
- [ ] No business logic in components (only UI)
- [ ] Styling consistent with existing blocks
- [ ] TypeScript compiles without errors

---

## Common Issues & Solutions

### Issue: Button component not found
**Solution:** Import from `@/ui-mine` not `@/components/ui`. Check existing blocks for pattern.

### Issue: Styling not applied
**Solution:** Ensure Tailwind classes are correct. Check `className` props are passed through with `cn()` helper.

### Issue: Modal not blocking background
**Solution:** Use `fixed inset-0 z-50` for overlay and ensure it's rendered last in DOM.

---

## Style Reference

Use these existing styles for consistency:

```typescript
// Backgrounds
bg-bg-surface  // Main surface
bg-bg-card     // Card/block background
bg-neutral-800 // Darker elements

// Text
text-neutral-50   // Primary text
text-neutral-300  // Secondary text
text-neutral-500  // Tertiary text

// Borders
border-neutral-700

// Colors
text-success      // Green (success/win)
text-warning      // Yellow (warning)
text-danger       // Red (error)
text-brand-primary // Blue (primary actions)
```

---

## Next Steps

After completing this phase:
1. Commit changes: "feat: Add setup flow UI components"
2. Verify components render correctly
3. Move to **Phase 4: Phase1TimestampComposer Updates**
4. Open task file: `Phase1_Setup_Flow_Phase4_Composer.md`

---

**Phase 3 Complete?** ✅ Move to Phase 4


