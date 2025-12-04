# Archived Implementations

This folder contains previous prototype implementations that were replaced during development.

## Gesture-Based Implementation (Archived Dec 3, 2025)

### Files
- **GesturePadBlock.tsx** — Complex gesture detection using `@use-gesture/react`
- **TaggingUIPrototypeComposer_Gesture.tsx** — Original gesture-based composer

### Why Archived
- Hold-then-swipe gestures were not intuitive
- Detection thresholds difficult to tune
- User feedback indicated standard controls more effective

## Single-Phase Form Implementation (Replaced Dec 3, 2025)

The first iteration of standard form controls used a single-phase approach where all shot attributes were collected immediately per shot:
- Intent, Wing, Quality, Direction all in one screen
- Quality auto-submitted when InNet/OffEnd selected
- Direction shown conditionally for Good/Average quality

### Why Replaced
Transitioned to **two-phase workflow** for better UX:
- **Phase 1**: Fast timestamp capture (SERVE/SHOT button + rally end conditions)
- **Phase 2**: Detailed shot tagging after all timestamps collected

This separation allows faster real-time tagging while watching video, with detailed annotation done in review mode.

### Current Implementation
Phase 1 blocks:
- `Phase1ServeButtonBlock` — Large SERVE/SHOT button
- `Phase1EndConditionStack` — Let/Winner/InNet/Long buttons

Phase 2 blocks:
- `ServeDetailBlock` — Contact, Direction, Length, Spin
- `StandardShotBlock` — Intent, Wing, Quality, Direction
- `ErrorShotBlock` — Intent, Wing, Error Type, Direction
- `ProgressIndicatorBlock` — Shows progress through shots

**Note**: `IntentTabBlock`, `WingToggleBlock`, `DirectionButtonBlock` are still in use (shared across Phase 2 screens) and should not be archived.
