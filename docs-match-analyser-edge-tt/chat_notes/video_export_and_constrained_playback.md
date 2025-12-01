# Video Export & Constrained Playback

> Brainstorming session: 2025-12-01

---

## 1. Video Export / Highlight Reel Feature

### User Request
Ability to export a "highlights" video from a match — cutting from serve start (ball toss) to winner timestamp for each rally, concatenated into one video.

### Current Video Player Capabilities

Our current implementation uses a **basic HTML5 `<video>` element**. This provides:
- ✅ Playback, pause, seek
- ✅ Playback speed control
- ✅ Time tracking
- ❌ **No native video editing/export**

### Options for Video Export

#### Option A: FFmpeg.wasm (Browser-based) ⭐ Recommended for MVP

[FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) is a WebAssembly port of FFmpeg that runs entirely in the browser.

**Pros:**
- No server required — all processing is local
- Full FFmpeg capabilities (cut, concatenate, transcode)
- Precise frame-accurate cuts
- Works offline
- User's video never leaves their device

**Cons:**
- Large WASM bundle (~25MB)
- Processing time depends on client hardware
- Memory limitations for very long videos

**Example usage:**
```javascript
import { FFmpeg } from '@ffmpeg/ffmpeg'

const ffmpeg = new FFmpeg()
await ffmpeg.load()

// Cut a clip from 10.5s to 15.2s
await ffmpeg.exec([
  '-i', 'match.mp4',
  '-ss', '10.5',
  '-to', '15.2',
  '-c', 'copy',  // Fast copy without re-encoding
  'rally1.mp4'
])

// Concatenate multiple clips
await ffmpeg.exec([
  '-f', 'concat',
  '-i', 'clips.txt',
  '-c', 'copy',
  'highlights.mp4'
])
```

#### Option B: Server-side FFmpeg (Supabase Edge Function)

**Pros:**
- Consistent performance
- Can handle longer videos
- More processing power

**Cons:**
- Requires video upload (bandwidth, privacy)
- Server costs
- More complex architecture

#### Option C: MediaRecorder API

**Pros:**
- Native browser API
- No additional libraries

**Cons:**
- Records playback in real-time (slow)
- Quality loss
- Not precise for cuts

### Recommended Approach

**Phase 1 (MVP):** FFmpeg.wasm for client-side export
- Export individual rally clips
- Export highlight reel (all rallies concatenated)
- Add fade transitions between rallies (optional)

**Phase 2:** Advanced features
- Custom intro/outro overlays
- Score graphics burned into video
- Multiple export formats (MP4, WebM)
- Quality/size options

### Data We Already Have for Export

```typescript
interface RallyExportData {
  startTime: number    // First contact (ball toss for serve)
  endTime: number      // winnerTime
  serverId: string
  winnerId: string
  score: string        // "3-2"
}
```

### UI Concept for Export

In Step 2 or Match Stats page:
```
┌─────────────────────────────────────┐
│  Export Highlights                   │
├─────────────────────────────────────┤
│  ☑ Include all scoring rallies      │
│  ☐ Include lets/no-score rallies    │
│                                      │
│  Padding: [0.5s] before serve       │
│           [1.0s] after winner       │
│                                      │
│  [ ] Add score overlay              │
│  [ ] Add transitions                │
│                                      │
│  [Export Match Highlights]          │
│  [Export Individual Rallies]        │
└─────────────────────────────────────┘
```

---

## 2. Constrained Playback in Step 2

### User Request
When tagging shot details in Step 2, video should only play from one contact timestamp to the frame before the next contact.

### Rationale
- Keeps focus on the specific shot being tagged
- Prevents accidentally watching into the next shot
- Natural "loop" behavior for reviewing a single shot

### Implementation Approach

```typescript
interface ConstrainedPlaybackProps {
  startTime: number      // This contact's timestamp
  endTime: number        // Next contact's timestamp (or winnerTime for last shot)
  loopOnEnd?: boolean    // Auto-restart at startTime when reaching endTime
}

// In VideoPlayer component
const handleTimeUpdate = () => {
  if (constrainedMode && video.currentTime >= endTime) {
    video.pause()
    if (loopOnEnd) {
      video.currentTime = startTime
    }
  }
}
```

### Behavior Table

| Shot Position | startTime | endTime |
|--------------|-----------|---------|
| Shot 1 (serve) | contact[0].time | contact[1].time - 1 frame |
| Shot 2 | contact[1].time | contact[2].time - 1 frame |
| Shot N (last) | contact[N].time | rally.winnerTime |

### Additional Considerations

1. **Buffer/Padding**: Maybe add a few frames before `startTime` to see approach
2. **Toggle Mode**: Allow user to switch between constrained and free playback
3. **Visual Indicator**: Show playback bounds on timeline scrubber

---

## 3. Clarification: Serve Timing

### User Note
> "I am actually logging the serve at the ball toss point as opposed to the contact point"

### Implications

This means the first contact in each rally represents:
- **Ball toss** (beginning of serve motion)
- NOT the racket-ball contact

This is actually **better for video export** because:
- Captures the full serve motion
- More natural starting point for highlights
- Viewer sees the serve wind-up

### Suggestion for Data Model

Consider adding a `contactType` field to distinguish:

```typescript
interface Contact {
  id: string
  rallyId: string
  time: number
  shotIndex: number
  contactType?: 'ball-toss' | 'racket-contact' | 'bounce'  // Optional refinement
}
```

Or document this as a convention:
> **Convention:** Shot 1 of each rally is logged at ball-toss, all subsequent shots at racket contact.

---

## Summary

| Feature | Approach | Priority |
|---------|----------|----------|
| Video Export | FFmpeg.wasm (browser) | Future (post-MVP) |
| Constrained Playback | TimeUpdate listener with bounds | Step 2 implementation |
| Serve Timing | Document convention (ball toss) | Spec clarification |

---

## Next Steps

1. Add constrained playback mode to VideoPlayer component
2. Document serve timing convention in specs
3. Plan FFmpeg.wasm integration for future release
4. Design export UI for Step 2 / Match Stats

---

*Last updated: 2025-12-01*

