# Fast-Track Implementation Plan — Tagging V2
## Minimal Path to New Tagging UI (Phase 5 Priority)

**Date:** 2025-12-03  
**Status:** Ready to Start  
**Priority:** Phase 5 (Tagging V2 UI)  
**Testing Devices:** iPhone 15, iPad Pro, Samsung Galaxy Z Flip 5  
**Data Available:** Player/club data only (no match results yet)

---

## Executive Summary

You want to **start with Phase 5** (Tagging V2 UI). Smart choice — this is the biggest UX improvement and most critical for daily use.

**Challenge:** Phase 5 depends on:
- **Phase 1 (partial):** Database schema updates for new `shots` columns
- **Phase 4:** Inference engine logic

**Solution:** Build a **streamlined path** that includes only the essential parts of Phase 1 + 4 to enable Phase 5.

**Timeline:** ~3-4 weeks to fully functional Tagging V2 on all 3 devices

---

## Fast-Track Phases (Reordered)

### Phase 0: Minimal Foundation (Week 1, Days 1-2)

**Goal:** Database schema + types only (no UI, no players yet)

**Tasks:**
1. Update `shots` table schema (add 18 new columns)
2. Update `Shot` type in `rules/types.ts`
3. Update `taggingStore.ts` to support new fields
4. Test localStorage migration (old data → new schema)

**Deliverables:**
- ✅ `shots` table ready for inferred data
- ✅ Types updated
- ✅ Store accepts new fields
- ✅ Existing matches still load (backwards compatible)

**Time:** 1-2 days

---

### Phase 4-Lite: Inference Engine Core (Week 1, Days 3-7)

**Goal:** Build inference logic (pure functions only, no UI yet)

**Tasks:**
1. Create `rules/inferShotData.ts`
   - `deriveFromGesture()` — Gesture → landing_zone + shot_result
   - `inferPressureLevel()` — Intent + result → pressure
   - `inferShotType()` — Context → shot type (simplified)
   - `determineRallyEndRole()` — Pressure + result → winner/error
2. **Skip for now:**
   - `inferIntentQuality()` (requires player profiles — do later)
   - `deriveExpectedIntent()` (requires player profiles — do later)
3. Write unit tests (gesture mappings, pressure logic)
4. Test with mock data

**Deliverables:**
- ✅ Inference functions working (80% complete, no intent quality yet)
- ✅ Unit tests passing
- ✅ Tested with sample data

**Time:** 4-5 days

---

### Phase 5: Tagging V2 UI (Week 2-3)

**Goal:** Build new tagging UI (mobile-first, responsive)

#### Week 2: Core Components

**Day 1-2: Wing × Intent Grid**
- Create `ui-mine/WingIntentGrid/` component
- 6 buttons (FH/BH × Agg/Neut/Def)
- Large touch targets (min 60px)
- Visual feedback (selected state, ripple on tap)
- Keyboard shortcuts (F/B for wing, A/N/D for intent)
- Test on all 3 devices

**Day 3-4: Gesture Touch Zone**
- Create `ui-mine/GestureTouchZone/` component
- Detect: tap, hold, swipe (8 directions), holdLeft/holdRight
- Visual feedback (ripple, direction arrows)
- Haptic feedback (iOS/Android)
- Thresholds:
  - Hold: 500ms
  - Swipe: 40px minimum
  - Angle detection for 8 directions
- Test gesture accuracy on all devices

**Day 5: Integration Test**
- Connect Wing × Intent Grid + Gesture Zone
- Test full flow: tap grid → gesture → see result
- Verify all 6×8 = 48 combinations work
- Test on iPhone 15 (touch), iPad Pro (touch + Apple Pencil), Samsung Flip (folded + unfolded)

#### Week 3: Serve UI + Full Integration

**Day 1-2: Serve Length Bar**
- Create `ui-mine/ServeLengthBar/` component
- 3 horizontal zones (SHORT | HALF-LONG | LONG)
- Tap zone → highlight → gesture in zone
- Horizontal gesture → direction (left/right)
- Vertical gesture → result (up = missed_long, down = in_net)
- Duration → quality (hold = good, tap = average)

**Day 2-3: Serve Spin Ball**
- Create `ui-mine/ServeSpinBall/` component
- Circular touch zone (250px diameter)
- Swipe direction → spin family
  - Up → top
  - Down → under
  - Left/Right → side
  - Tap → no_spin
- Visual feedback (arrows glow in swipe direction)

**Day 4-5: Integrate into TaggingScreenComposer**
- Add Tagging V2 mode (initially behind feature flag)
- Replace Part 2 shot questions with new UI
- Wire up to inference engine
- Display inferred data (grayed out labels)
- Allow manual override (tap shot → edit modal)

**Day 6-7: Responsive Design**
- **Mobile (iPhone 15, Samsung Flip):**
  - Single-column layout
  - Bottom sheet for controls
  - Video at top (50vh)
  - Controls at bottom (50vh)
  - FAB for primary actions
  - Swipe gestures (left = delete, right = edit)
- **Tablet (iPad Pro):**
  - Two-column layout
  - Video on left (60%)
  - Controls on right (40%)
  - Landscape-optimized
- **Desktop (fallback):**
  - Three-column layout
  - Keyboard shortcuts work

---

### Phase 5+: Testing & Polish (Week 4)

**Day 1-3: Device-Specific Testing**

**iPhone 15:**
- Test gesture detection (all 8 gestures)
- Test haptic feedback (UIImpactFeedbackGenerator)
- Test video playback (H.264, playsinline)
- Test portrait/landscape
- Test with one hand (reachability)
- Performance: <100ms gesture latency

**iPad Pro:**
- Test two-column layout
- Test touch vs Apple Pencil input
- Test landscape/portrait
- Test split-screen mode (if relevant)
- Test video sizing

**Samsung Galaxy Z Flip 5:**
- Test folded mode (small screen)
- Test unfolded mode (6.7" screen)
- Test fold/unfold transitions
- Test haptic feedback
- Test video playback
- Special: Test outer cover screen (if app supports it)

**Day 4-5: Bug Fixes**
- Fix any gesture detection issues
- Fix layout issues on specific devices
- Optimize performance (reduce re-renders)
- Add loading states

**Day 6-7: Documentation**
- Create Tagging V2 user guide (video + text)
- Document gesture shortcuts
- Update `specAddendumMVP.md`
- Record demo video (all 3 devices)

---

## Technical Implementation Details

### Device-Specific Considerations

#### iPhone 15 (iOS 17+, Safari)

**Touch Events:**
```typescript
// Use native touch events, not pointer events (better iOS support)
const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault() // Prevent default iOS behaviors (zoom, scroll)
  const touch = e.touches[0]
  setState({
    startX: touch.clientX,
    startY: touch.clientY,
    startTime: Date.now()
  })
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  const gesture = detectGesture({
    startX: state.startX,
    startY: state.startY,
    startTime: state.startTime,
    endX: touch.clientX,
    endY: touch.clientY,
    endTime: Date.now()
  })
  onGesture(gesture)
}
```

**Haptic Feedback:**
```typescript
// Use Haptic Feedback API (iOS 10+)
if ('vibrate' in navigator) {
  // Light tap
  navigator.vibrate(10)
  
  // Medium impact
  navigator.vibrate(20)
  
  // Heavy impact
  navigator.vibrate(30)
}

// Or use Web Haptics API (if available)
if ('Taptic Engine' in window) {
  // iOS-specific, requires user gesture first
  window.TapticEngine.impact('light')
}
```

**Video Playback:**
```html
<video 
  playsInline  // Critical: Prevent fullscreen takeover
  controls={false}  // Use custom controls
  preload="auto"
  src={videoUrl}
/>
```

**Safe Area (Notch):**
```css
.tagging-controls {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

#### iPad Pro (iPadOS 17+, Safari)

**Two-Column Layout:**
```css
@media (min-width: 768px) and (max-width: 1024px) {
  .tagging-container {
    display: grid;
    grid-template-columns: 3fr 2fr;
    grid-template-rows: auto 1fr;
  }
  
  .video-player {
    grid-column: 1;
    grid-row: 1 / -1;
  }
  
  .controls {
    grid-column: 2;
    grid-row: 1 / -1;
    overflow-y: auto;
  }
}
```

**Apple Pencil Support:**
```typescript
// Detect Apple Pencil vs finger
const handlePointerDown = (e: PointerEvent) => {
  if (e.pointerType === 'pen') {
    // Apple Pencil: More precise, use smaller thresholds
    setGestureThresholds({
      swipe: 30, // px (vs 40 for finger)
      hold: 400  // ms (vs 500 for finger)
    })
  } else {
    // Finger: Larger thresholds
    setGestureThresholds({
      swipe: 40,
      hold: 500
    })
  }
}
```

**Landscape Mode:**
```css
@media (orientation: landscape) and (max-width: 1024px) {
  .video-player {
    height: 100vh;
  }
  
  .controls {
    max-height: 100vh;
    overflow-y: scroll;
  }
}
```

---

#### Samsung Galaxy Z Flip 5 (Android 13+, Chrome)

**Fold Detection:**
```typescript
// Use Screen Fold API (experimental)
if ('getWindowSegments' in window) {
  const segments = window.getWindowSegments()
  if (segments.length > 1) {
    // Device is unfolded
    setLayout('unfolded')
  } else {
    // Device is folded
    setLayout('folded')
  }
}

// Or use viewport size as proxy
const detectFoldState = () => {
  const vh = window.innerHeight
  if (vh < 400) {
    return 'folded' // Cover screen (1.9")
  } else if (vh < 700) {
    return 'folded-main' // Folded main screen
  } else {
    return 'unfolded' // Full 6.7"
  }
}
```

**Folded Mode Layout:**
```css
/* Cover screen (260x512px) */
@media (max-width: 300px) and (max-height: 600px) {
  .tagging-container {
    display: none; /* Cover screen too small for tagging */
  }
  
  .cover-screen-message {
    display: block;
    padding: 20px;
    text-align: center;
  }
}

/* Folded main screen */
@media (max-width: 768px) and (max-height: 700px) {
  .video-player {
    height: 40vh; /* Smaller video */
  }
  
  .controls {
    height: 60vh;
    font-size: 14px; /* Slightly smaller text */
  }
}

/* Unfolded (6.7" full screen) */
@media (min-width: 375px) and (min-height: 700px) {
  /* Normal mobile layout */
}
```

**Haptic Feedback:**
```typescript
// Android vibration API
if ('vibrate' in navigator) {
  // Pattern: vibrate, pause, vibrate
  navigator.vibrate([10, 50, 10]) // Success pattern
  navigator.vibrate(30) // Single impact
}
```

**Video Playback:**
```html
<video 
  playsInline
  webkit-playsinline  // For older Android WebView
  controls={false}
  preload="metadata"  // Save battery
  src={videoUrl}
/>
```

---

### Gesture Detection Algorithm (Cross-Platform)

```typescript
interface TouchState {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
  currentTime: number
  pointerType: 'touch' | 'pen' | 'mouse'
}

function detectGesture(state: TouchState): GestureType {
  const dx = state.currentX - state.startX
  const dy = state.currentY - state.startY
  const dt = state.currentTime - state.startTime
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // Adjust thresholds based on pointer type
  const swipeThreshold = state.pointerType === 'pen' ? 30 : 40
  const holdThreshold = state.pointerType === 'pen' ? 400 : 500
  
  // Hold detection (long press)
  if (dt > holdThreshold && distance < 10) {
    // Check if there was a delayed swipe (holdLeft/holdRight)
    if (Math.abs(dx) > swipeThreshold) {
      return dx < 0 ? 'holdLeft' : 'holdRight'
    }
    return 'hold'
  }
  
  // Swipe detection
  if (distance > swipeThreshold) {
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    // Determine primary direction (8-way)
    // Right: -22.5 to 22.5
    // Up-Right: 22.5 to 67.5
    // Up: 67.5 to 112.5 OR -112.5 to -67.5
    // ... etc
    
    if (Math.abs(dx) > Math.abs(dy) * 2) {
      // Primarily horizontal
      return dx < 0 ? 'swipeLeft' : 'swipeRight'
    } else if (Math.abs(dy) > Math.abs(dx) * 2) {
      // Primarily vertical
      return dy < 0 ? 'swipeUp' : 'swipeDown'
    } else {
      // Diagonal — simplify to primary axis for MVP
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx < 0 ? 'swipeLeft' : 'swipeRight'
      } else {
        return dy < 0 ? 'swipeUp' : 'swipeDown'
      }
    }
  }
  
  // Tap (quick, minimal movement)
  if (dt < 200 && distance < 10) {
    return 'none'
  }
  
  // Default: none (ambiguous gesture)
  return 'none'
}
```

---

### Performance Optimization

**Gesture Detection:**
```typescript
// Debounce visual feedback updates
const updateVisualFeedback = useMemo(
  () => debounce((gesture: GestureType) => {
    setVisualState(gesture)
  }, 16), // 16ms = 60fps
  []
)

// Use requestAnimationFrame for smooth animations
const animateRipple = (x: number, y: number) => {
  let frame = 0
  const animate = () => {
    frame++
    if (frame < 30) {
      // Update ripple radius
      setRippleRadius(frame * 2)
      requestAnimationFrame(animate)
    } else {
      // Reset
      setRippleRadius(0)
    }
  }
  requestAnimationFrame(animate)
}
```

**Video Playback:**
```typescript
// Use lower resolution on mobile to save bandwidth
const getVideoSrc = () => {
  if (isMobile && videoUrl) {
    // Check if lower-res version available
    return videoUrl.replace('.mp4', '-mobile.mp4')
  }
  return videoUrl
}

// Pause video during gesture input (reduce CPU load)
const handleGestureStart = () => {
  if (isPlaying) {
    videoRef.current?.pause()
    wasPlayingBeforeGesture.current = true
  }
}

const handleGestureEnd = () => {
  if (wasPlayingBeforeGesture.current) {
    videoRef.current?.play()
    wasPlayingBeforeGesture.current = false
  }
}
```

---

## Testing Checklist

### iPhone 15 Testing

**Gesture Detection:**
- [ ] Tap → 'none'
- [ ] Hold (500ms) → 'hold'
- [ ] Swipe left → 'swipeLeft'
- [ ] Swipe right → 'swipeRight'
- [ ] Swipe up → 'swipeUp'
- [ ] Swipe down → 'swipeDown'
- [ ] Hold + swipe left → 'holdLeft'
- [ ] Hold + swipe right → 'holdRight'
- [ ] Diagonal swipes work correctly
- [ ] No accidental gestures on scroll

**Haptic Feedback:**
- [ ] Vibrates on tap (Wing × Intent grid)
- [ ] Different vibration on gesture complete
- [ ] No vibration lag (< 50ms)

**Video Playback:**
- [ ] Video plays inline (no fullscreen takeover)
- [ ] Playback controls work
- [ ] Seeking works
- [ ] Video doesn't pause on gesture input

**Layout:**
- [ ] Video at top (50vh)
- [ ] Controls at bottom (50vh)
- [ ] No scrolling required
- [ ] Safe area insets respected (notch, home indicator)
- [ ] Portrait mode works
- [ ] Landscape mode works

**Performance:**
- [ ] Gesture detection < 100ms latency
- [ ] No dropped frames during video playback
- [ ] Battery drain < 5% per rally tagged

---

### iPad Pro Testing

**Two-Column Layout:**
- [ ] Video on left (60%)
- [ ] Controls on right (40%)
- [ ] No horizontal scrolling
- [ ] Vertical scrolling only in controls area

**Apple Pencil:**
- [ ] Pencil gestures detected accurately
- [ ] Smaller gesture thresholds work
- [ ] No palm rejection issues
- [ ] Pencil hover states work (if implemented)

**Gestures (Touch):**
- [ ] All 8 gestures work with finger
- [ ] Touch targets comfortable (60px+)

**Gestures (Pencil):**
- [ ] All 8 gestures work with pencil
- [ ] More precise detection

**Landscape/Portrait:**
- [ ] Layout adapts correctly
- [ ] No content cut off
- [ ] Controls always accessible

**Performance:**
- [ ] 60fps during video playback
- [ ] No lag on gesture detection
- [ ] Smooth animations

---

### Samsung Galaxy Z Flip 5 Testing

**Fold States:**
- [ ] Detect folded vs unfolded
- [ ] Layout adapts to fold state
- [ ] Cover screen shows message (can't tag on cover screen)

**Folded Mode:**
- [ ] Video player smaller (40vh)
- [ ] Controls still accessible (60vh)
- [ ] Text readable (font-size adjusted)
- [ ] Touch targets still large enough

**Unfolded Mode:**
- [ ] Normal mobile layout
- [ ] Video at top (50vh)
- [ ] Controls at bottom (50vh)

**Gestures:**
- [ ] All 8 gestures work
- [ ] No issues with crease area (if touch zone crosses crease)

**Haptic Feedback:**
- [ ] Vibrations work
- [ ] Intensity appropriate

**Video Playback:**
- [ ] Plays inline
- [ ] No fullscreen issues
- [ ] Smooth playback

**Performance:**
- [ ] No lag when folding/unfolding
- [ ] Video continues playing during fold transition
- [ ] Gesture detection still < 100ms

---

## UI Mockups (Simplified)

### Mobile Layout (iPhone 15, Samsung Flip Unfolded)

```
┌─────────────────────────────┐
│                             │
│       Video Player          │  ← 50vh
│       (16:9 ratio)          │
│                             │
├─────────────────────────────┤
│                             │
│   Wing × Intent Grid        │
│   ┌─────┬─────┬─────┐      │
│   │ FH  │ FH  │ FH  │      │  ← 6 buttons
│   │ Agg │Neut │ Def │      │     60px height each
│   ├─────┼─────┼─────┤      │
│   │ BH  │ BH  │ BH  │      │
│   │ Agg │Neut │ Def │      │
│   └─────┴─────┴─────┘      │
│                             │
│   Gesture Touch Zone        │  ← Swipe area
│   ┌───────────────────┐    │     200px height
│   │                   │    │
│   │   Swipe here →    │    │
│   │                   │    │
│   └───────────────────┘    │
│                             │
│   Shot List (scrollable)    │  ← Previous shots
│   • Shot 1: FH Agg → to_fh  │
│   • Shot 2: BH Def → to_mid │
│                             │
└─────────────────────────────┘
```

---

### Tablet Layout (iPad Pro Landscape)

```
┌────────────────────────────────────────────────┐
│                       │                        │
│                       │  Wing × Intent Grid    │
│                       │  ┌─────┬─────┬─────┐ │
│                       │  │ FH  │ FH  │ FH  │ │
│      Video Player     │  │ Agg │Neut │ Def │ │
│      (60% width)      │  ├─────┼─────┼─────┤ │
│                       │  │ BH  │ BH  │ BH  │ │
│                       │  │ Agg │Neut │ Def │ │
│                       │  └─────┴─────┴─────┘ │
│                       │                        │
│                       │  Gesture Touch Zone    │
│                       │  ┌──────────────────┐ │
│                       │  │                  │ │
│                       │  │  Swipe here →    │ │
│                       │  │                  │ │
│                       │  └──────────────────┘ │
│                       │                        │
│                       │  Shot List             │
│                       │  • Shot 1: FH Agg      │
│                       │  • Shot 2: BH Def      │
│                       │  (scrollable)          │
│                       │                        │
└────────────────────────────────────────────────┘
```

---

## Timeline Summary

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 (Days 1-2) | Phase 0 | Database schema + types |
| 1 (Days 3-7) | Phase 4-Lite | Inference engine core |
| 2 (Days 1-5) | Phase 5 Part 1 | Wing × Intent Grid + Gesture Zone |
| 3 (Days 1-5) | Phase 5 Part 2 | Serve UI + Full integration |
| 3 (Days 6-7) | Phase 5 Part 3 | Responsive design (3 devices) |
| 4 (Days 1-3) | Testing | Device-specific testing |
| 4 (Days 4-5) | Polish | Bug fixes |
| 4 (Days 6-7) | Docs | User guide + demo video |

**Total:** ~3-4 weeks to production-ready Tagging V2

---

## Success Criteria

**Functional:**
- ✅ All 8 gestures detected accurately (>95% accuracy)
- ✅ Wing × Intent grid responds < 100ms
- ✅ Inference engine populates all fields
- ✅ Can tag a full rally (10 shots) in < 60 seconds
- ✅ Works on all 3 devices without crashes

**Performance:**
- ✅ Gesture detection latency < 100ms
- ✅ Video playback 30fps+ on all devices
- ✅ No UI jank during scrolling
- ✅ Battery drain < 10% per hour of tagging

**UX:**
- ✅ Touch targets comfortable (min 44px iOS, 48px Android)
- ✅ Haptic feedback feels natural
- ✅ Visual feedback clear (ripples, highlights)
- ✅ Layout adapts to orientation changes
- ✅ No accidental gestures

---

## What's NOT Included (Do Later)

**Deferred to future phases:**
- ❌ Player profiles (Phase 2)
- ❌ Intent quality inference (requires profiles)
- ❌ Tournaments & match results (Phase 3)
- ❌ Player skill metrics (Phase 6)
- ❌ Coaching insights (Phase 6)
- ❌ CSV import for players (Phase 1)

**Why defer?**
- These features don't block Tagging V2
- You can add them incrementally later
- Priority is testing the new UX ASAP

---

## Next Steps (This Week)

### Monday-Tuesday: Phase 0 (Foundation)

1. **Update `shots` schema** (`rules/types.ts`)
```typescript
export interface Shot {
  id: string
  rallyId: string
  time: number
  shotIndex: number
  playerId: PlayerId
  
  // Serve-only (NEW)
  serveType?: string
  serveSpinFamily?: 'under' | 'top' | 'no_spin' | 'side'
  serveLength?: 'short' | 'half_long' | 'long'
  
  // Tagging inputs (NEW)
  wing?: 'FH' | 'BH'
  intent?: 'defensive' | 'neutral' | 'aggressive'
  
  // Derived from gestures (NEW)
  landingZone?: 'to_bh' | 'to_mid' | 'to_fh' | null
  shotResult?: 'good' | 'average' | 'in_net' | 'missed_long'
  pressureLevel?: 'low' | 'medium' | 'high'
  
  // Per-shot inference (NEW)
  intentQuality?: 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
  isRallyEnd?: boolean
  rallyEndRole?: 'winner' | 'forced_error' | 'unforced_error' | 'none'
  inferredShotType?: string
  inferredShotConfidence?: 'low' | 'medium' | 'high'
  
  isTagged?: boolean
}
```

2. **Test localStorage migration**
   - Load existing match with old `shots` format
   - Verify no crashes
   - New fields default to `undefined`

3. **Update `taggingStore.ts`**
   - Add action: `addShotWithInference(shot: Shot)`
   - Add action: `updateShotInference(shotId: string, inferred: InferredData)`

### Wednesday-Sunday: Phase 4-Lite (Inference Core)

4. **Build inference engine** (`rules/inferShotData.ts`)
5. **Write unit tests**
6. **Test with mock data**

---

## Questions?

1. **Do you want to keep the old tagging UI available?** (As fallback, or completely replace?)
2. **Feature flag for Tagging V2?** (Enable via settings toggle, or default on?)
3. **Keyboard shortcuts priority?** (Focus on touch first, or equal priority?)
4. **Video codec requirements?** (Any specific format for mobile compatibility?)

Ready to start? I can begin with Phase 0 (schema updates) whenever you give the green light! 🚀

---

**Status:** ✅ Ready to Implement  
**Priority:** High  
**Timeline:** 3-4 weeks  
**Risk:** Low (incremental, backwards compatible)














