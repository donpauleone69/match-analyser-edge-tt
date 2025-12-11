# Shot Tagging Engine — Specification Document

> **Version:** 1.0  
> **Last Updated:** 2025-01-11  
> **Status:** Reverse Engineered from Codebase

This document provides a comprehensive specification of the Shot Tagging Engine feature, including functionality, user flows, and identified issues.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tagging Phases](#tagging-phases)
4. [Video Player Functionality](#video-player-functionality)
5. [User Flows & Journeys](#user-flows--journeys)
6. [Issues & Areas for Improvement](#issues--areas-for-improvement)

---

## Overview

The Shot Tagging Engine is a sequential, question-based interface for tagging table tennis match videos. It uses a two-phase approach:

- **Phase 1:** Timestamp capture (rally framework) — mark contacts and rally boundaries
- **Phase 2:** Shot detail tagging — answer questions about each shot
- **Phase 3:** Optional inference engine — probabilistic shot analysis

The system is local-first, using IndexedDB for video storage and Dexie.js for data persistence. Sessions can be resumed after page refresh.

---

## Architecture

### Component Structure

```
shot-tagging-engine/
├── composers/          # Phase orchestrators (route-level)
│   ├── TaggingUIComposer.tsx      # Main orchestrator
│   ├── Phase1TimestampComposer.tsx # Phase 1 logic
│   ├── Phase2DetailComposer.tsx    # Phase 2 logic
│   └── Phase3InferenceComposer.tsx # Phase 3 logic
├── sections/           # Page sections (larger UI regions)
│   ├── VideoPlayerSection.tsx
│   ├── StatusBarSection.tsx
│   ├── RallyListSection.tsx
│   └── UserInputSection.tsx
├── blocks/             # Presentational components
│   ├── Phase1ControlsBlock.tsx
│   ├── SetupControlsBlock.tsx
│   └── ...
└── layouts/            # Layout templates
    └── PhaseLayoutTemplate.tsx
```

### Data Flow

1. **Phase 1 → Database:** Rallies and shots saved immediately on rally completion
2. **Phase 2 → Database:** Shot details saved incrementally as questions are answered
3. **Video Storage:** Video files stored in IndexedDB keyed by `{matchId}-{setNumber}`
4. **Session Persistence:** Progress stored in database; video loaded from IndexedDB on resume

### State Management

- **Zustand Store:** `taggingSessionStore` (mostly deprecated, localStorage-based)
- **Primary State:** React state in composers + database records
- **Video State:** `useVideoPlaybackStore` (Zustand) for playback control

---

## Tagging Phases

### Phase 0: Setup

**Purpose:** Configure match starting conditions before tagging begins.

**Functionality:**
- User selects next server (Player 1 or Player 2)
- User sets starting score (0-20 for each player)
- Score validation ensures valid set scores (max difference of 2 at end, etc.)
- Creates "stub rallies" for points played before video starts

**User Interface:**
- Three-column layout: Player 1 controls | Player 2 controls | Start button
- Score increment/decrement buttons
- Next server selection (highlighted button)

**Data Saved:**
- Setup data saved to `sets` table: `setup_starting_score_p1`, `setup_starting_score_p2`, `setup_next_server_id`
- Stub rallies created (marked with `is_stub_rally: true`)

**Issues:**
- ⚠️ No validation UI feedback (only alerts)
- ⚠️ Stub rally creation happens silently (user doesn't see them)

---

### Phase 1: Timestamp Capture

**Purpose:** Mark shot contacts and rally boundaries in the video timeline.

**Functionality:**

1. **Rally State Machine:**
   - `before-serve`: No shots yet, only "Serve" button active
   - `after-serve`: First serve recorded, end-condition buttons activate

2. **Button Layout (1×5):**
   - **Shot Missed** (Long/Missed) — rally ends with ball out of bounds
   - **In Net** — rally ends with ball hitting net
   - **Forced Error** — rally ends with forced error (disabled until shot 2+)
   - **Winning Shot** (Winner) — rally ends with winning shot
   - **Serve/Shot** — dynamic button to mark shot contacts

3. **Auto Speed Control:**
   - Normal speed for watching
   - **Tag speed** (0.5x) when Serve/Shot pressed
   - **FF speed** (2x) after rally ends (fast-forward to next rally)

4. **Rally Completion:**
   - Calculates server for rally (based on score + first server)
   - Determines winner based on end condition
   - Updates score automatically
   - Saves rally + shots to database immediately
   - Checks for set end (11 points with 2-point lead)

5. **History & Navigation:**
   - Maintains shot history for undo/navigation
   - Can navigate backward/forward through tagged shots
   - Delete button removes last tag and reverts score
   - Video seeks to historical tags when navigating

**User Interface:**
- **Left Sidebar:** Rally list (newest first), shows current rally in progress
- **Video Player:** With tagging mode controls (shot back/forward, delete, frame step)
- **Status Bar:** Rally count, shot count, player scores, speed indicator, "Save Set" button
- **User Input:** Phase 1 control buttons (5-button grid)

**Data Saved:**
- Rallies saved with: timestamps, server, winner, scores before/after, end condition
- Shots saved with: timestamps, shot index, player, initial `shot_result` based on end condition

**Issues:**
- ⚠️ Score reversion on delete can be confusing if user doesn't understand rally scoring
- ⚠️ Set end detection shows warning banner but allows continuing (no enforcement)
- ⚠️ No visual feedback for save state (saving happens async, no spinner)

---

### Phase 2: Shot Detail Tagging

**Purpose:** Answer questions about each shot's characteristics.

**Functionality:**

1. **Sequential Question Flow:**
   - One question at a time, auto-advances on answer
   - Different flows based on shot type (serve, receive, regular, error)

2. **Question Sequences:**

   **Serves (Shot #1):**
   - Direction (6 options: left-left, left-mid, left-right, right-left, right-mid, right-right)
   - Length (3 options: short, half-long, deep)
   - Spin (3 options: underspin, no-spin, topspin)

   **Receives (Shot #2, if not error):**
   - Stroke + Quality (backhand/forehand + average/high toggle)
   - Direction (dynamic 3×3 grid based on serve target)
   - Length (short, half-long, deep)
   - Intent (defensive, neutral, aggressive)

   **Regular Shots (Shot #3+):**
   - Stroke + Quality (backhand/forehand + average/high toggle)
   - Direction (dynamic 3×3 grid based on previous shot target)
   - Intent (defensive, neutral, aggressive)

   **Error Shots (last shot in error rallies):**
   - Stroke + Quality
   - Direction (target of error)
   - Intent
   - Error Placement (net or long) — only for forced errors
   - Error Type (forced or unforced)

3. **Constrained Playback:**
   - Video loops current shot preview (±300ms buffer)
   - Auto-pause at loop end
   - Playback speed set to 0.5x for review

4. **Progress Tracking:**
   - Shows current rally, shot number, progress (X of Y)
   - Highlights current shot in rally list
   - Marks completed shots visually

5. **Data Saving:**
   - Shot saved to database when last question answered
   - Set progress updated incrementally
   - Phase 2 completion triggers match finalization

**User Interface:**
- **Left Sidebar:** Rally list with shot details, highlights current shot
- **Video Player:** Constrained playback loop for current shot
- **Status Bar:** Rally/Shot counters, current question label, progress, player indicator
- **User Input:** Dynamic button grids based on current question

**Data Saved:**
- Shot details: direction (origin/target), length, spin, stroke, intent, quality, error type
- Resolves Phase 1 "fault" shots to specific error types (in_net/missed_long)
- Updates `rally_end_role` for error shots

**Issues:**
- ⚠️ Dynamic direction grid logic may fail if previous shot direction not set (shows mid-only)
- ⚠️ Shot quality toggle must be set before stroke selection (UX not intuitive)
- ⚠️ No way to go back and change previous shot answers
- ⚠️ Constrained playback loop can be jarring if shot boundaries are tight

---

### Phase 3: Inference Engine

**Purpose:** Optional probabilistic analysis of tagged shots.

**Functionality:**
- Runs inference algorithms on tagged shots
- Generates predictions: shot types, spin, player position, pressure levels, patterns
- User can skip and run later from data viewer
- Updates `shot_inferences` table

**User Interface:**
- Simple modal: Run Analysis | Skip for Now
- Progress indicator during execution
- Auto-advances to completion screen on success

**Issues:**
- ⚠️ No progress details (just "Running inference on X shots...")
- ⚠️ Error handling is basic (retry button)

---

## Video Player Functionality

### Core Features

1. **Video Loading:**
   - File selection from local disk
   - Saved to IndexedDB (`{matchId}-{setNumber}`)
   - Blob URL created for playback
   - Auto-loads from IndexedDB on session resume

2. **Playback Controls:**
   - Play/Pause toggle
   - Frame-by-frame stepping (forward/backward)
   - Seek to specific time
   - Playback speed control (0.25x - 4x)

3. **Tagging Mode:**
   - Special controls for Phase 1:
     - Shot Back/Forward (navigate history)
     - Delete (remove last tag)
     - Frame Step (precise positioning)
   - Speed presets: "tag" (0.5x) and "ff" (2x)
   - Auto speed switching based on tagging actions

4. **Constrained Playback (Phase 2):**
   - Loops between `startTime` and `endTime`
   - Auto-pauses at end, seeks to start if loop enabled
   - Used for shot preview loops

5. **Time Overlay:**
   - Shows current time / duration
   - Compact mode for space-constrained layouts

### Playback Store

- Zustand store managing: `currentTime`, `duration`, `isPlaying`, `playbackSpeed`, `videoUrl`
- Synced with HTML5 video element
- Speed presets: `tag: 0.5`, `ff: 2.0` (configurable)

**Issues:**
- ⚠️ Known performance issues (see Next_MVP_Steps.md)
- ⚠️ Seek accuracy may not be frame-perfect
- ⚠️ Speed switching can have delay/lag
- ⚠️ Constrained playback loop can stutter

---

## User Flows & Journeys

### Flow 1: Fresh Tagging Session

1. User navigates to `/matches/:matchId/tag?set=1`
2. **Setup Phase:**
   - Select next server
   - Set starting score
   - Click "Start"
3. **Video Selection:**
   - Video file picker appears (if no video loaded)
   - User selects video file
   - Video loads, saved to IndexedDB
4. **Phase 1 Tagging:**
   - Video plays at normal speed
   - User presses "Serve" when serve occurs
   - Video slows to tag speed (0.5x)
   - User presses "Shot" for each subsequent contact
   - When rally ends, user presses end condition button (Long/Net/Winner/Forced Error)
   - Video speeds up to FF (2x) to next rally
   - Repeat until set complete
   - Click "Save Set" to finish Phase 1
5. **Phase 2 Tagging:**
   - For each shot in sequence:
     - Video loops shot preview
     - User answers questions (direction, length, spin, etc.)
     - Auto-advances to next question/shot
   - When complete, proceeds to Phase 3
6. **Phase 3 (Optional):**
   - User chooses to run inference or skip
   - If run, shows progress, then completion
7. **Completion:**
   - Shows success screen
   - Options: Back to Matches, View Data, Tag Next Set

**Issues in Flow:**
- ⚠️ No clear indication when video is loading/processing
- ⚠️ Phase 1 → Phase 2 transition could be smoother
- ⚠️ "Save Set" button may be confusing (Phase 1 data already auto-saved)

---

### Flow 2: Resume Incomplete Session

1. User navigates to `/matches/:matchId/tag?set=1` (with existing data)
2. **Resume Detection:**
   - Checks database for existing rallies
   - Loads video from IndexedDB
   - Determines current phase from set status
3. **Resume Phase 1:**
   - Loads existing rallies into state
   - Calculates current score from last rally
   - User continues from last tagged rally
4. **Resume Phase 2:**
   - Loads existing shot details
   - Resumes from last answered question
   - Shows progress indicator

**Issues in Flow:**
- ⚠️ Resume logic is complex and may fail silently
- ⚠️ If video missing from IndexedDB, user must re-select (no graceful fallback)
- ⚠️ Phase 1 resume doesn't fully restore state (some derived data lost)

---

### Flow 3: Redo Tagging

1. User navigates with `?redo=true` or `?redo=phase2`
2. **Redo Logic:**
   - `redo=true`: Deletes all tagging data, starts Phase 1 fresh
   - `redo=phase2`: Keeps Phase 1 data, restarts Phase 2
3. **Data Deletion:**
   - Removes rallies/shots from database
   - Clears localStorage session
4. **Fresh Start:**
   - User goes through setup (if Phase 1 redo)
   - Or jumps to Phase 2 (if Phase 2 only)

**Issues in Flow:**
- ⚠️ No confirmation dialog (destructive action)
- ⚠️ Redo doesn't restore original video if it was changed

---

### Flow 4: Navigation & Undo

**Phase 1 Navigation:**
- User can press "Shot Back" to review previous tags
- Video seeks to historical timestamp
- User can press "Shot Forward" to advance
- User can press "Delete" to remove last tag and revert score
- Pressing Serve/Shot while navigating resumes live tagging

**Issues in Flow:**
- ⚠️ Navigation state can be confusing (paused on history vs. live tagging)
- ⚠️ Delete behavior may not match user expectation (score reversion)

---

## Issues & Areas for Improvement

### Critical Issues

1. **Video Player Performance** ⚠️ CRITICAL
   - Lag/stutter during playback
   - Seek accuracy issues
   - Speed switching delays
   - Constrained playback loop stutters
   - **Impact:** Slows down entire tagging workflow
   - **Priority:** P0 (see Next_MVP_Steps.md)

2. **Data Validation** ⚠️ CRITICAL
   - No validation of match scores vs. tagged rallies
   - Possible inconsistencies in server rotation
   - Shot timestamps may fall outside rally bounds
   - **Impact:** Analytics may be inaccurate
   - **Priority:** P0

3. **Resume Reliability**
   - Complex resume logic may fail silently
   - Video loading from IndexedDB can fail without clear error
   - Phase 1 resume doesn't fully restore all state
   - **Impact:** User may lose work or get confused

### UX Issues

4. **Phase 2 Navigation**
   - No way to go back and change previous shot answers
   - Quality toggle must be set before stroke (counterintuitive)
   - Dynamic direction grid may show wrong options

5. **Feedback & Loading States**
   - No visual feedback during database saves
   - Video processing state not clearly indicated
   - Set end warning doesn't enforce stopping

6. **Setup Phase**
   - No validation UI (only alerts)
   - Stub rallies created silently (user doesn't see them)

7. **Redo Flow**
   - No confirmation dialog for destructive action
   - Redo doesn't handle video file restoration

### Design Issues

8. **Status Bar Information**
   - "Save Set" button confusing (Phase 1 already auto-saves)
   - Speed indicator could be more prominent
   - Missing save state indicator

9. **Layout & Responsiveness**
   - Video player max-height constraints may cut off content
   - Mobile layout may need refinement
   - Shot log scroll behavior could be improved

10. **Error Handling**
    - Basic error messages (alerts)
    - No recovery options for failed saves
    - Inference errors only show retry button

### Functional Gaps

11. **Missing Features**
    - No bulk operations (tag multiple sets)
    - No export functionality
    - No keyboard shortcuts documentation
    - No undo beyond last tag (Phase 1 only)

12. **Data Completeness**
    - Some derived fields may be missing
    - Rally end reasons may not align with shot data
    - Player assignments may be incorrect in edge cases

---

## Recommendations

### Immediate (P0)
1. Fix video player performance issues
2. Add data validation layer
3. Improve resume reliability with error handling

### Short-term (P1)
4. Add Phase 2 navigation (go back to previous shots)
5. Improve loading/feedback states
6. Add confirmation dialogs for destructive actions
7. Better error messages and recovery

### Medium-term (P2)
8. Keyboard shortcuts documentation
9. Bulk operations
10. Export functionality
11. Enhanced analytics validation

---

## Notes

- The system uses a "save as you go" approach — data is persisted incrementally
- Video files are stored in IndexedDB, not uploaded to server (local-first)
- Phase 3 inference is optional and can be run later
- The system supports multi-set matches (navigate between sets)

---

**Document Status:** This specification was reverse-engineered from the codebase as of 2025-01-11. Some functionality may have been inferred and should be verified against actual behavior.

