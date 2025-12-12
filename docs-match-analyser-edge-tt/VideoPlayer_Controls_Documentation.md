# Video Player Controls & Playback Behavior Documentation

## Video Player Location
- **Component**: `app/src/ui-mine/VideoPlayer/VideoPlayer.tsx`
- **Store**: `app/src/ui-mine/VideoPlayer/videoPlaybackStore.ts`
- **Usage**: Both Phase1 and Phase2 composers use the same VideoPlayer component

---

## Video Player State (Zustand Store)

### State Variables
- `currentTime`: Current playback position (seconds)
- `duration`: Total video duration (seconds)
- `isPlaying`: Boolean - whether video is currently playing
- `playbackSpeed`: Numeric speed multiplier (0.25x - 5x)
- `videoUrl`: Current video file URL (blob URL)
- `currentSpeedMode`: `'normal' | 'tag' | 'ff'` - current speed preset mode
- `speedPresets`: Object with `{ normal: 1.0, tag: 0.5, ff: 2.0 }`

### Actions
- `setCurrentTime(time)`: Seek to specific timestamp
- `setDuration(duration)`: Set video duration
- `setIsPlaying(playing)`: Play/pause state
- `setPlaybackSpeed(speed)`: Set numeric playback speed
- `setSpeedMode(mode)`: Set speed mode (updates both `currentSpeedMode` and `playbackSpeed`)
- `setVideoUrl(url)`: Change video file

---

## Phase 1: Timestamp Capture (`Phase1TimestampComposer`)

### Controls Available
**Tagging Mode Controls** (enabled via `taggingMode` prop):
- **Frame Step Back** (←): Step backward one frame (1/30s)
- **Shot Back** (◄): Navigate to previous shot/rally end in history
- **Shot Forward** (►): Navigate to next shot/rally end in history
- **Frame Step Forward** (→): Step forward one frame (1/30s)
- **Delete** (X): Delete last tag (shot or rally end)
- **Play/Pause** (▶/⏸): Toggle playback
- **Speed Indicator**: Shows current mode (`Tag 0.5x`, `FF 2x`, or `Normal`)

### Playback Flow & State Changes

#### Initial State
- Video starts paused
- Speed mode: `normal` (1x)
- No constrained playback

#### When User Presses "Serve/Shot" Button
1. **Capture timestamp** at current video time
2. **Set speed mode to `tag`** (0.5x) - `setSpeedMode('tag')`
3. **Video continues playing** at 0.5x speed
4. **Rally state changes**: `before-serve` → `after-serve` (after first shot)
5. **Shot added to history** for navigation

#### When User Presses End Condition Button (Fault/Win/In-Net/Long)
1. **Complete rally** - save all shots
2. **Set speed mode to `ff`** (2x) - `setSpeedMode('ff')`
3. **Video plays at 2x** for fast-forward between rallies
4. **Reset rally state**: `after-serve` → `before-serve`
5. **Clear current shots** array
6. **Rally added to history** for navigation

#### Navigation (Shot Back/Forward)
- **Shot Back**: 
  - Seeks to previous shot/rally end timestamp
  - Pauses video
  - Sets `isNavigating = true`
  - Sets speed mode to `tag` (0.5x)
  - Updates `currentHistoryIndex`
  
- **Shot Forward**:
  - Seeks to next shot/rally end timestamp
  - Pauses video
  - Updates `currentHistoryIndex`
  - If at end of history, resumes live playback

#### Resume from Navigation
- If paused on last tag and user presses "Serve/Shot":
  - Sets `isNavigating = false`
  - Resumes playback
  - Sets speed mode to `tag` (0.5x)

#### Delete Last Tag
- Removes last shot or rally end from history
- Seeks to previous timestamp
- Pauses video
- Reverts score if rally was deleted
- Sets speed mode based on context:
  - `tag` if navigating history
  - `normal` if back to start

#### Keyboard Shortcuts (Global)
- `Space` / `k`: Play/Pause
- `←` / `,`: Frame step backward
- `→` / `.`: Frame step forward
- `j`: Seek backward 10 seconds
- `l`: Seek forward 10 seconds
- `f`: Toggle fullscreen

### Speed Mode Transitions
```
normal (1x) 
  ↓ [Press Serve/Shot]
tag (0.5x) 
  ↓ [Press End Condition]
ff (2x)
  ↓ [Press Serve/Shot again]
tag (0.5x)
```

---

## Phase 2: Shot Detail Tagging (`Phase2DetailComposer`)

### Controls Available
**Default Controls** (no `taggingMode` prop):
- **Frame Step Back** (←): Step backward one frame
- **Frame Step Forward** (→): Step forward one frame
- **Loop Toggle** (⟲): Toggle loop for constrained playback (only visible when constrained mode active)
- **Play/Pause** (▶/⏸): Toggle playback
- **Speed Selector**: 9 buttons (0.25x, 0.5x, 0.75x, 1x, 1.5x, 2x, 3x, 4x, 5x)

### Constrained Playback (Loop Preview)
- **Enabled**: Yes (always active for current shot)
- **Range**: `shot.timestamp ± 0.3s` (300ms buffer before/after)
- **Loop**: Enabled by default (`loopOnEnd: true`)
- **Behavior**: 
  - Video auto-pauses at `endTime`
  - If loop enabled, automatically seeks to `startTime` and resumes
  - If loop disabled, pauses and calls `onConstrainedEnd` (not used in Phase2)

### Playback Flow & State Changes

#### Initial State
- Video starts paused
- **Speed set to 0.5x** on mount - `setPlaybackSpeed(0.5)` (hardcoded, not using speed mode)
- **Constrained playback active** for first shot
- Loop enabled by default

#### When User Answers a Question
1. **Answer saved** to current shot state
2. **Auto-advance** to next question step
3. **Video continues** in constrained loop (if still on same shot)
4. **No speed change** - stays at 0.5x

#### When Moving to Next Shot
1. **Current shot saved** to database (if last question answered)
2. **Shot index increments** - `setCurrentShotIndex(prev => prev + 1)`
3. **Constrained playback updates** to new shot's timestamp range
4. **Video seeks** to new shot's start time (via constrained playback bounds)
5. **Speed remains 0.5x** (no change)

#### Constrained Playback Loop Behavior
- **At start**: Video plays from `startTime` (shot.timestamp - 0.3s)
- **During playback**: Video plays normally within bounds
- **At endTime**: 
  - Video pauses automatically
  - If loop enabled: Seeks to `startTime` and auto-plays
  - If loop disabled: Stays paused at `endTime`
- **User can toggle loop** via Loop button (⟲) in controls

#### Frame Stepping
- **Respects constrained bounds** by default
- Frame step buttons move ±1/30s within constrained range
- Cannot step outside `startTime` - `endTime` range

#### Progress Bar
- Shows constrained region highlighted in blue
- Shows current progress within full video
- Clicking progress bar seeks within constrained bounds only

### Speed Control
- **No speed mode system** - uses direct `setPlaybackSpeed()` calls
- **Initial speed**: 0.5x (hardcoded on mount)
- **User can change**: Via speed selector buttons (0.25x - 5x)
- **Speed persists** across shots (not reset per shot)

### Keyboard Shortcuts (Same as Phase 1)
- `Space` / `k`: Play/Pause
- `←` / `,`: Frame step backward
- `→` / `.`: Frame step forward
- `j`: Seek backward 10 seconds (constrained to bounds)
- `l`: Seek forward 10 seconds (constrained to bounds)
- `f`: Toggle fullscreen

---

## Key Differences Between Phases

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| **Control Mode** | Tagging Mode (shot navigation) | Default Mode (frame stepping) |
| **Speed Control** | Speed modes (`tag`, `ff`, `normal`) | Direct speed selection (0.25x - 5x) |
| **Initial Speed** | `normal` (1x) | `0.5x` (hardcoded) |
| **Constrained Playback** | ❌ Disabled | ✅ Enabled (shot ± 0.3s) |
| **Loop** | ❌ Not available | ✅ Available (toggle button) |
| **Auto Speed Changes** | ✅ Yes (tag/ff modes) | ❌ No (user controls) |
| **Navigation** | ✅ Shot history navigation | ❌ No navigation |
| **Delete** | ✅ Delete last tag | ❌ Not available |
| **Playback Flow** | Manual tagging → fast-forward | Continuous loop preview |

---

## Constrained Playback Implementation

### How It Works
1. **Bounds Calculation** (Phase2 only):
   ```typescript
   startTime = shot.timestamp - 0.3s
   endTime = shot.timestamp + 0.3s
   ```

2. **Auto-Pause Logic**:
   - Monitors `currentTime` via `useEffect`
   - When `currentTime >= endTime` and `isPlaying === true`:
     - Pauses video
     - If `loopOnEnd === true`: Seeks to `startTime` and plays
     - If `loopOnEnd === false`: Stays paused

3. **Frame Stepping**:
   - Respects bounds: `Math.max(startTime, Math.min(endTime, newTime))`
   - Cannot step outside constrained range

4. **Progress Bar**:
   - Highlights constrained region in blue
   - Shows markers at start/end bounds
   - Clicking seeks within bounds only

---

## State Change Summary

### Phase 1 State Transitions
```
[Initial] 
  → normal speed, paused, no history

[Press Serve/Shot]
  → tag speed (0.5x), playing, shot added to history

[Press End Condition]
  → ff speed (2x), playing, rally saved, history updated

[Navigate Back]
  → tag speed (0.5x), paused, isNavigating=true

[Resume from Navigation]
  → tag speed (0.5x), playing, isNavigating=false
```

### Phase 2 State Transitions
```
[Initial]
  → 0.5x speed, paused, constrained playback active (first shot)

[Answer Question]
  → same speed, constrained playback continues, step advances

[Move to Next Shot]
  → same speed, constrained playback updates to new shot bounds

[Toggle Loop]
  → loopEnabled state toggles, affects auto-restart behavior
```

---

## Recommendations for Standardization

1. **Speed Control**: Phase 2 should use speed modes like Phase 1 for consistency
2. **Initial Speed**: Both phases should start at same speed (or make Phase 2 configurable)
3. **Constrained Playback**: Consider adding to Phase 1 for shot review
4. **Navigation**: Phase 2 could benefit from shot navigation like Phase 1
5. **Delete**: Phase 2 might need undo functionality
6. **Loop Control**: Phase 1 could benefit from loop toggle for shot review

