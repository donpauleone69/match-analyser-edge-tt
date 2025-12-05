# Video Playback State Extraction & Architecture Cleanup

## Summary

Successfully extracted video playback state from the monolithic `taggingStore` into a dedicated `videoPlaybackStore`, deleted legacy code, and renamed features for clarity.

## What Was Done

### 1. Created New Video Playback Store ✅
- **File:** `app/src/ui-mine/VideoPlayer/videoPlaybackStore.ts`
- **Purpose:** Shared video state (currentTime, duration, isPlaying, playbackSpeed, videoUrl)
- **Why:** Separates video UI concerns from domain data, makes VideoPlayer truly reusable

### 2. Updated Video Player & Composers ✅
- **VideoPlayer** now uses `useVideoPlaybackStore` instead of `useTaggingStore`
- **Phase1TimestampComposer** uses new store + added FF mode toggle (2x vs 0.5x speed)
- **Phase2DetailComposer** uses new store + added constrained playback for shot review (loops 300ms around shot at 0.5x)

### 3. Deleted Legacy Code ✅
Removed:
- `app/src/features/tagging-ui-prototype-v2/archived/` — Old gesture-based prototypes
- `app/src/features/tagging-ui-prototype-v2/legacy-components/` — Old VideoPlayer, TaggingControls, Timeline, ScoreDisplay, WinnerDialog
- `app/src/features/tagging-ui-prototype-v2/legacy/` — Empty folder
- `app/src/stores/taggingStore.ts` — 1,719-line monolithic store
- `app/src/stores/` folder (now empty)
- `app/src/features/data-viewer/` — Will be rebuilt from scratch
- `app/src/features/video-exporter/` — Not needed yet, will rebuild later
- `app/src/pages/MatchSetup.tsx` — Legacy page
- `app/src/pages/MatchAnalysis.tsx` — Legacy page
- `app/src/pages/DataViewer.tsx` — Legacy page

### 4. Renamed Features ✅
- `features/export` → `features/video-exporter`
- `features/tagging-ui-prototype-v2` → `features/shot-tagging-engine`
- `pages/TaggingUIPrototypeV2.tsx` → `pages/ShotTaggingEngine.tsx`
- Updated all imports and route references

### 5. Updated Routes ✅
- Removed `/data-viewer`, `/matches/analysis` routes (legacy pages deleted)
- Updated `/matches/:matchId/tag` to use `ShotTaggingEngine`

## New Video Features

### Phase 1 (Timestamp Capture)
- **FF Mode Toggle:** Users can switch between 2x (fast-forward) and 0.5x (tagging) speed
- **UI:** Button in status bar shows current mode (⏩ FF 2x vs 🎯 Tag 0.5x)

### Phase 2 (Detail Tagging)
- **Constrained Playback:** Video loops 300ms around each shot at 0.5x speed
- **Auto-loop:** Allows reviewers to watch shot repeatedly while answering questions

## Architecture After Cleanup

```
app/src/
  features/
    shot-tagging-engine/        # Renamed from tagging-ui-prototype-v2
      composers/                # Orchestration + data mapping
      blocks/                   # UI components
  pages/
    ShotTaggingEngine.tsx       # Renamed from TaggingUIPrototypeV2.tsx
  ui-mine/
    VideoPlayer/
      VideoPlayer.tsx           # Now uses videoPlaybackStore
      videoPlaybackStore.ts     # NEW - shared video state
      index.ts
```

## What's Left to Do (Future)

1. **Rebuild data-viewer** — Fresh implementation using new data layer
2. **Rebuild video-exporter** — When video export feature is needed
3. **Fix pre-existing linter errors** — Some unrelated errors in matchVideo.db.ts, Dashboard.tsx, rules/, etc.

## Testing Notes

- ✅ VideoPlayer imports updated
- ✅ Phase1 & Phase2 composers use new store
- ✅ All routes updated
- ✅ Build runs (with pre-existing errors unrelated to this refactor)
- ⚠️ **Manual testing needed:** Test video playback, FF mode, shot looping in browser

## Breaking Changes

None for active features. All deleted code was:
- Old prototypes (archived/)
- Unused legacy components (legacy-components/)
- Replaced by new data layer (data-viewer, export, MatchSetup, MatchAnalysis)

---

**Date:** December 5, 2025  
**Branch:** refactor/terminology-standardization (or create new branch)

