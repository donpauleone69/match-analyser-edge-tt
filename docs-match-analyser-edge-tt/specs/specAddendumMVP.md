# MVP Spec Addendum

> This document tracks all changes, refinements, and additions to the original MVP specification made during development. Each entry includes the date, what changed, and the rationale.

---

## Change Log

### 2025-12-01: Step 1 Review Page - Enhanced Rally Timeline

**Context:** During implementation of the Step 1 Review page, we identified opportunities to make the review workflow more intuitive and complete.

#### UI/UX Changes

1. **Rally Pod Layout (Chronological Order)**
   - **Before:** Server and Winner at top of rally card
   - **After:** Server → Shots → Winner (top to bottom)
   - **Rationale:** Reads chronologically like the actual rally: who served, what shots happened, who won

2. **Winner Timestamp Added**
   - **Before:** Winner was just a player name
   - **After:** Winner includes timestamp of when rally ended
   - **Rationale:** Allows user to jump to the winning moment; useful for reviewing the end of rallies

3. **Keyboard-First Navigation**
   | Key | Action |
   |-----|--------|
   | ↑ / ↓ | Navigate through timeline items |
   | ← / → | Edit value (toggle server/winner) OR frame-step (on contacts/winner time) |
   | Space | Play/pause video at current selection |
   | W | Toggle winner (when winner row selected) |
   | Delete | Remove selected shot |

4. **In-Place Editing**
   - Server can be toggled with ←→ when selected
   - Winner can be toggled with W key when selected
   - Winner time can be frame-stepped with ←→
   - Contact times can be frame-stepped with ←→

5. **Add/Delete Shots**
   - Delete button and keyboard shortcut for removing erroneous shots
   - Add shot button inserts new contact at current video time
   - Shots auto-sort by time and re-index after add/delete

#### Data Model Changes

```typescript
// Rally type - ADDED winnerTime field
interface Rally {
  id: string
  gameId: string
  rallyIndex: number
  isScoring: boolean
  winnerId?: string
  winnerTime?: number  // NEW: Timestamp when rally ended
  player1ScoreAfter: number
  player2ScoreAfter: number
  serverId: string
  receiverId: string
  hasVideoData: boolean
  contacts: Contact[]
}
```

#### Store Actions Added

```typescript
// New actions for review page
updateWinnerTime: (rallyId: string, time: number) => void
deleteContact: (rallyId: string, contactId: string) => void
addContactToRally: (rallyId: string, time: number) => void
```

#### Behavior Changes

- `selectWinner()` now automatically sets `winnerTime` to the last contact's time
- Contacts are re-indexed after add/delete operations
- Contacts are sorted by time when added (allowing insertion at any point)

---

### 2025-12-01: Video Player State Management Fix

**Context:** Video player was stuck in play/pause loop due to state sync issues.

#### Technical Fix

- Removed `useEffect` that synced `isPlaying` state to `video.play()/pause()`
- `togglePlay()` now directly controls video element
- Event handlers only update Zustand state when actual change occurs
- Prevents infinite render loops from state ↔ DOM sync

---

### 2025-12-01: Video URL Persistence Decision

**Context:** Object URLs from `URL.createObjectURL()` are not persistent across page reloads.

#### Decision

- `videoUrl` is **NOT** persisted in Zustand store
- User must re-select video file when entering Step 1 or Review pages
- Each page handles its own video file input
- **Future:** May add video path storage with file system access API

---

### 2025-12-01: Step 1 Contact Tagger - Keyboard Shortcuts

**Context:** Implementing efficient tagging workflow for rapid contact marking.

#### Shortcuts Implemented

| Key | Action |
|-----|--------|
| Space | Add contact at current time |
| S | End rally (scoring) - opens winner dialog |
| N | End rally (no score) - let/interruption |
| K | Play/pause video |
| Ctrl+Z | Undo last contact |

---

---

### 2025-12-01: Contact Timing Conventions

**Context:** Established conventions for when to mark contacts during Step 1 tagging.

#### Official Conventions

| Shot Type | Tag At | Rationale |
|-----------|--------|-----------|
| **Serve** | Ball toss | Captures full service motion for video review |
| **All other shots** | Shot preparation (backswing) | Natural viewing start, easier to spot |
| **Winner** | Rally end point | Defines when rally concludes |

#### Why Preparation, Not Contact?

1. **Primary use case is video review** — prep timing is ideal for watching
2. **Ball speed from timestamps is imprecise anyway** — would need camera calibration, 120fps+
3. **Faster tagging workflow** — prep is easier to spot than exact contact frame
4. **Perceptually natural** — the "shot" includes the wind-up

#### Rally Time Boundaries

```
Rally Start:  First contact (serve ball toss)
Rally End:    winnerTime (moment point is decided)
```

Each shot's viewing window:
```
Shot N: contact[N].time → contact[N+1].time - 1 frame
Last Shot: contact[last].time → rally.winnerTime
```

---

### 2025-12-01: Constrained Playback Mode

**Context:** In Step 2, video should only play within the bounds of the selected shot.

#### Behavior

- Video plays from current contact timestamp
- Auto-pauses at next contact timestamp (or winnerTime for last shot)
- Optional loop mode: restart at shot start when reaching end
- User can toggle between constrained and free playback

#### Implementation

```typescript
interface ConstrainedPlayback {
  enabled: boolean
  startTime: number      // This shot's prep timestamp
  endTime: number        // Next shot's prep timestamp (or winnerTime)
  loopOnEnd?: boolean
}
```

---

### 2025-12-01: Video Export Feature

**Context:** Users want to export highlight reels from tagged matches.

#### Capabilities

- Export individual rally clips
- Export concatenated match/set highlights
- Optional score overlay (bottom-left corner)
- Configurable padding before/after rallies

#### Technical Approach

Using **FFmpeg.wasm** for client-side video processing:
- All processing stays local (no server upload)
- Frame-accurate cuts
- Score overlay burned into video
- MP4 output format

#### Score Overlay Format

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│                                    │
│  Marcus    3                       │
│  Anna      2                       │
└────────────────────────────────────┘
```

Position: Bottom-left, with semi-transparent background

---

### 2025-12-01: Video Export Quality Settings

**Context:** Initial export had poor quality (wrong frame rate, low CRF).

#### Quality Presets Added

| Preset | CRF | FFmpeg Preset | Audio Bitrate |
|--------|-----|---------------|---------------|
| Fast | 26 | veryfast | 128k |
| Balanced | 23 | fast | 192k |
| High | 18 | medium | 256k |

#### Frame Rate Options

- 25 fps (PAL)
- 30 fps (NTSC)  
- 50 fps (PAL high)
- 60 fps (NTSC high)

**Note:** Quality/frame rate options only appear when "Include score overlay" is ON (re-encoding). Stream copy preserves original quality.

---

### 2025-12-01: FFmpeg.wasm Loading Fix

**Context:** FFmpeg was failing to load with "failed to import ffmpeg-core.js" error.

#### Root Cause

The UMD version of `@ffmpeg/core` was incompatible with Vite's ESM module loading.

#### Solution

- Downloaded **ESM version** from `@ffmpeg/core@0.12.6/dist/esm/`
- Files stored in `public/ffmpeg/`:
  - `ffmpeg-core.js` (114KB)
  - `ffmpeg-core.wasm` (32MB)
- CORS headers configured in `vite.config.ts`

---

### 2025-12-01: Score Overlay Limitation

**Context:** Text score overlay fails in FFmpeg.wasm.

#### Issue

FFmpeg.wasm is compiled **without** `libfreetype`, so `drawtext` filter doesn't work.

#### Current Behavior

- When score overlay is enabled, video is re-encoded with quality settings
- No actual text appears (just a semi-transparent box indicator)
- If filter fails, falls back to encoding without any overlay

#### Future Options

1. Server-side FFmpeg for full text support
2. Canvas-based text burn-in before encoding
3. Accept visual box indicator only

---

### 2025-12-01: Insert Rally Feature

**Context:** Users sometimes forget to mark "End Rally - Score" during Step 1 tagging.

#### Implementation

- "Insert Rally Here" button at bottom of left sidebar
- Creates new rally at current video timestamp
- Auto-inserts in chronological position based on time
- Recalculates scores for subsequent rallies

#### Store Action Added

```typescript
insertRallyAtTime: (time: number) => string  // Returns new rally ID
```

---

### 2025-12-01: Highlight Rally Feature

**Context:** Users want to mark favorite rallies for highlight exports.

#### Implementation

- Press **H** key to toggle highlight on selected rally
- Highlighted rallies show star icon and gold border
- Export panel has "Highlights only" toggle
- `isHighlight` field added to Rally type

---

### 2025-12-01: Review Page - Playback Behavior

**Context:** Clarifying how video plays in review mode.

#### Behavior by Selection Type

| Selection | On Navigate/Click | Playback |
|-----------|-------------------|----------|
| Server | Pause | No constrained playback |
| Contact/Shot | **Auto-play** | **Loops** between this shot and next shot |
| Winner | Pause | **Still frame only** — just defines rally end point |

#### Keyboard Updates

| Key | Action |
|-----|--------|
| ↑↓ / **Enter** | Navigate to next timestamp |
| ←→ | Frame step / toggle server |
| Space | Play (loops within shot) |
| W | Toggle winner player |
| H | Toggle highlight |
| Del | Delete shot |

---

### 2025-12-01: Layout Fix - Independent Scroll

**Context:** Left rally panel would push video down when many rallies present.

#### Fix

- Root container: `h-screen overflow-hidden` (not `min-h-screen`)
- Left panel: `flex flex-col min-h-0` with `overflow-y-auto` inner div
- Video stays fixed while rally list scrolls

---

### 2025-12-01: Auto-Scroll to Selected Item

**Context:** When navigating through many rallies, the selected item would go off-screen.

#### Implementation

- Added `timelineScrollRef` to track scrollable container
- Added `data-` attributes to server/contact/winner elements
- `useEffect` triggers `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on selection change
- `block: 'nearest'` keeps item in view without jumping to top

---

### 2025-12-01: Step 1 Tagger Workflow Redesign

**Context:** Too much mental load during tagging. Winner selection interrupts flow.

#### New Workflow

1. Video plays at tagging speed (0.5x / 0.75x / 1x)
2. **Space** = Mark contact
3. **→** = End rally + fast forward (starts at FF speed, second press goes faster)
4. **←** = Slow down
5. **Space** during fast forward = Return to tagging speed + mark serve (new rally)

#### Settings Sidebar Added

| Setting | Options |
|---------|---------|
| Tagging Speed | 0.5x, 0.75x, 1x |
| Fast Forward Speed | 1x, 2x, 4x |

#### Layout Changes

- Video constrained to `50vh max-height 400px` (was full height)
- Settings sidebar on right (264px)
- Status display in center (shows current mode)

#### Store Action Added

```typescript
endRallyWithoutWinner: () => void
// Creates scoring rally with winnerId = undefined
// Winner selected in Review step
```

---

### 2025-12-01: Step 1 Review - Winner Selection via Arrows

**Context:** Need to set winner for rallies that were ended without winner in new workflow.

#### Changes

| Key | On Winner Row |
|-----|---------------|
| ← | Set winner = Player 1 |
| → | Set winner = Player 2 |
| Shift+←→ | Frame step winner time |

#### Removed

- W key toggle (replaced by ←→ direct selection)

---

### 2025-12-01: Step 1 Review - Enhanced Workflow

**Context:** Reduced mental load during tagging by deferring winner selection. Review page now handles more of the data entry.

#### Shot Labeling

| Shot Index | Label |
|------------|-------|
| 1 | Serve |
| 2 | Receive |
| 3+ | Shot N |

#### Rally Timeline Structure (Top to Bottom)

1. **Server** - Toggle with ←→
2. **Serve** - Shot 1, cyan highlight
3. **Receive** - Shot 2, orange highlight
4. **Shot 3, 4, ...** - Additional shots
5. **End of Point** - Movable timestamp with ←→ frame step (purple)
6. **Winner** - Player choice with ←→

#### Data Model Change

```typescript
// Rally type
interface Rally {
  // ... other fields
  endOfPointTime?: number  // Renamed from winnerTime - movable timestamp
  winnerId?: 'player1' | 'player2'  // Player choice only
}
```

#### First Server Selection

- Prompt shown at top of Review page when rallies exist
- Buttons for Player 1 / Player 2
- `setFirstServerAndRecalculate()` action recalculates all rally servers

#### Server Name Overlay

- When viewing Serve (Shot 1), large server name appears overlaid on video
- Semi-transparent, doesn't block video but makes server obvious

#### Timeline Bug Fix

- Video container now uses `h-[45vh] max-h-[350px] overflow-hidden`
- Added `compact={true}` prop to VideoPlayer
- Timeline bar now appears correctly below video

---

### 2025-12-01: Delete Rally & Server Auto-Alternate

**Context:** Need ability to delete entire rallies. Server assignment should follow table tennis rules (2 serves each) with manual override capability.

#### Delete Rally

- Added `deleteRally(rallyId)` action to store
- Keyboard shortcut: `Shift+Delete` deletes entire rally
- Delete button (trash icon) in rally header
- Automatically recalculates scores and rally indices

#### Server Auto-Alternate with Manual Override

- `setFirstServerAndRecalculate(player)` - sets first server, recalculates all rally servers
- `recalculateServersFromRally(rallyId)` - after manual server change, recalculates subsequent rallies
- Each player serves twice (2 serves each), then switches
- Manual change applies from that rally forward

---

### 2025-12-01: Video Export Optimization

**Context:** Video export was jittery and slow. User wants pure stream copy without re-encoding.

#### Changes

1. **Default Mode: Fast Export (Stream Copy)**
   - No re-encoding - frames copied exactly as-is
   - Original quality preserved
   - Uses `-c copy` for both video and audio
   - Output seeking (`-ss` after `-i`) for frame accuracy

2. **Re-encode Mode (Optional)**
   - Only when "Re-encode video" toggle is ON
   - Quality and frame rate settings available
   - Slower but allows customization

3. **Export Only Uses**:
   - Serve timestamp (first contact of rally)
   - End of Point timestamp
   - No other markers processed

#### UI Changes

- "Include score overlay" renamed to "Re-encode video"
- Default is OFF (fast stream copy)
- Shows "Fast, original quality" vs "Slower, customizable quality"

---

## Pending Considerations

### Not Yet Implemented (Backlog)

1. **Delete entire rally** - Currently can only delete individual shots
2. **Reorder rallies** - In case rallies were tagged out of order
3. **Merge rallies** - Combine two rallies that were mistakenly split
4. **Split rally** - Divide a rally that was mistakenly combined
5. **Bulk time offset** - Shift all contacts in a rally by N frames

### Open Questions

1. Should winner time default to last contact time, or a few frames after?
2. Should there be a "rally end" marker separate from winner time for no-score rallies?
3. Should contacts store which player made the shot (for Step 2 pre-population)?

---

## Version History

| Date | Version | Summary |
|------|---------|---------|
| 2025-12-01 | 0.1.0 | Initial implementation with Step 1 tagger and review |
| 2025-12-01 | 0.2.0 | Added timing conventions, constrained playback, video export |
| 2025-12-01 | 0.3.0 | FFmpeg.wasm fix, quality presets, frame rate options |
| 2025-12-01 | 0.4.0 | Insert rally, highlight feature, looping behavior, layout fixes |
| 2025-12-01 | 0.5.0 | Step 1 Tagger redesign: fast-forward workflow, settings sidebar, deferred winner |
| 2025-12-01 | 0.6.0 | Step 1 Review: shot labels, end-of-point, first server selection, server overlay |
| 2025-12-01 | 0.7.0 | Delete rally, server auto-alternate with manual override, video export optimization |

---

*Last updated: 2025-12-01 05:00 UTC*

