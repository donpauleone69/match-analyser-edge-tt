# 12 - Match Details Modal

## Screen Purpose
Pre-tagging setup modal to capture video start context, first serve timestamp, and first server. Opens after Match Setup when video is selected.

---

## Figma AI Prompt

```
Design a modal dialog for capturing match details before tagging begins.

Layout:
- Overlay: Dark semi-transparent backdrop (#000 at 70% opacity)
- Large modal card (560px width, rounded corners 12px)
- Modal is taller to accommodate video preview

Modal content (top to bottom):

1. Header:
- Title: "Match Details" centered, 20px bold
- Subtitle: "Set up the match before tagging" in muted text
- No close button (must complete to proceed)

2. Video Preview Section:
- Embedded video player (16:9, ~200px height)
- Playback controls: Play/Pause, frame step ◀◀ ▶▶
- Scrub bar with current time display
- Instructions: "Locate the first serve in the video"

3. First Serve Section:
- Label: "First Serve Timestamp"
- Display: Large monospace time "00:12.34" 
- Button: "Mark Current Time" (teal, captures video position)
- Helper: "This removes dead air before the match starts"

4. First Server Section:
- Label: "Who serves first?"
- Two large toggle buttons side by side:
  - "Player 1 — Marcus" (shows player name from setup)
  - "Player 2 — Chen"
- Selected button has teal background

5. Starting Scores Section (for partial videos):
- Label: "Score at video start"
- Two inputs side by side:
  - "Set Score" dropdown: 0-0, 1-0, 0-1, 1-1, 2-0, etc.
  - "Points Score" dropdown: 0-0 through 11-11
- Helper: "Leave as 0-0 if video starts at match beginning"

6. Action Buttons:
- Full-width primary button: "Start Tagging" (teal, disabled until first serve marked)
- Below: "Back to Setup" text link

Color scheme: 
- Modal background: #252525
- Video area: #0a0a0a
- Input fields: #333333 with subtle border
- Primary action: Teal #14b8a6
- Helper text: #737373

Typography: 
- Title: 20px semibold
- Labels: 14px medium
- Timestamp display: 24px monospace
- Helper text: 12px regular

Style: Focused flow. Video preview is central. Clear call-to-action for marking first serve. Can't proceed without marking timestamp.
```

---

## Interaction Flow

1. Modal opens with video paused at start
2. User scrubs/plays video to find first serve
3. User clicks "Mark Current Time" — timestamp captured and displayed
4. User selects first server
5. User adjusts starting scores if video doesn't start at 0-0
6. "Start Tagging" button enables
7. Click starts Part 1: Match Framework

---

## Validation

- First Serve Timestamp: Required
- First Server: Required
- Starting Scores: Optional (defaults to 0-0)


