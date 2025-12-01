# 14 - Shot Question Modal

## Screen Purpose
Quick-entry modal for annotating individual shots. Appears inline in Part 2: Rally Detail after timestamp is confirmed. Supports Essential and Full tagging modes.

---

## Figma AI Prompt — Essential Mode (Serve)

```
Design an inline shot question panel for serve annotation in Essential mode.

Layout:
- Inline panel below video (not overlay modal)
- Card with subtle border, 100% width of center column
- Sequential question flow, one question visible at a time

Question 1 — Serve Type:
- Label: "Serve Type" with "1 of 4" progress indicator
- 7 buttons in 2 rows:
  Row 1: "Pendulum" | "Reverse Pendulum" | "Tomahawk" | "Backhand"
  Row 2: "Hook" | "Lollipop" | "Other"
- Keyboard hints: "1-7" below buttons
- Selected button has teal background

Question 2 — Spin (3×3 Grid):
- Label: "Serve Spin" with "2 of 4" progress
- 3×3 grid of buttons:
  Top row: "Top-Left" | "Topspin" | "Top-Right"
  Mid row: "Side-Left" | "No Spin" | "Side-Right"
  Bot row: "Back-Left" | "Backspin" | "Back-Right"
- Keyboard hint: "Numpad 1-9"
- Grid visually represents ball contact point

Question 3 — Landing Zone (3×3 Grid):
- Label: "Landing Zone" with "3 of 4" progress
- 3×3 grid representing opponent's table half:
  "BH Short" | "Mid Short" | "FH Short"
  "BH Mid"   | "Mid Mid"   | "FH Mid"
  "BH Long"  | "Mid Long"  | "FH Long"
- Keyboard hint: "Numpad 1-9"
- Skip this question if previous answer was error quality

Question 4 — Quality:
- Label: "Shot Quality" with "4 of 4" progress
- 6 buttons in 2 rows:
  Row 1 (in-play): "Good" (green) | "Average" (gray) | "Weak" (yellow)
  Row 2 (errors): "In Net" (red) | "Missed Long" (red) | "Missed Wide" (red)
- Keyboard hints: "G A W N L D"

Navigation:
- Back arrow to go to previous question
- Auto-advance on selection
- "Skip" option (marks as incomplete)

Color scheme:
- Panel background: #252525
- Selected: Teal #14b8a6
- Good: Green #22c55e
- Average: Gray #525252
- Weak: Yellow #eab308
- Errors: Red #ef4444

Typography:
- Question label: 16px semibold
- Button text: 14px medium
- Progress: 12px muted

Style: Rapid sequential entry. Large tap targets. Clear keyboard shortcuts.
```

---

## Figma AI Prompt — Essential Mode (Rally Shot)

```
Design an inline shot question panel for rally shot annotation in Essential mode.

Layout: Same as serve, but different questions

Question 1 — Wing:
- Label: "Wing" with "1 of 4" progress
- 2 large buttons: "Forehand" | "Backhand"
- Keyboard hints: "F" | "B"

Question 2 — Shot Type:
- Label: "Shot Type" with "2 of 4" progress
- 9 buttons in 3 rows:
  Defensive: "Push" | "Chop" | "Block" | "Lob"
  Neutral: "Drive" | "Flick"
  Aggressive: "Loop" | "Smash" | "Other"
- Keyboard hints: "1-9"
- Buttons color-coded: Blue (defensive), Gray (neutral), Orange (aggressive)

Question 3 — Landing Zone:
- Same as serve (3×3 grid)
- Skipped if error quality selected in Q4

Question 4 — Quality:
- Same as serve (6 options including errors)

Style: Same rapid entry flow as serve.
```

---

## Figma AI Prompt — Full Mode Additions

```
Design additional question panels for Full tagging mode.

Additional Question — Position Sector (after Wing, before Shot Type):
- Label: "Position" with progress indicator
- 3×3 grid representing player's court position:
  "Close Left" | "Close Mid" | "Close Right"
  "Mid Left"   | "Mid Mid"   | "Mid Right"
  "Far Left"   | "Far Mid"   | "Far Right"
- Keyboard hint: "Numpad 1-9"

For Serves — Full Mode includes all Essential questions plus:
- Position Sector (where player stood to serve)

For Rally Shots — Full Mode includes all Essential questions plus:
- Position Sector (where player was when hitting)
- Shot Type uses full 14-option list instead of 9

Conditional Questions (appear when applicable):
- Serve Issue Cause: "Technical" | "Bad Decision" | "Too High" | "Too Long" | "Not Enough Spin" | "Easy to Read"
- Receive Issue Cause: "Misread Spin Type" | "Misread Spin Amount" | "Technical" | "Bad Decision"
- Third Ball Issue Cause: "Incorrect Prep" | "Unexpected Return" | "Technical" | "Bad Decision" | "Too Aggressive" | "Too Passive"

Style: Same flow, just more questions. Clear indication of mode in header.
```

---

## Keyboard Shortcuts Summary

| Question | Keys |
|----------|------|
| Serve Type | 1-7 |
| Wing | F, B |
| Shot Type (Essential) | 1-9 |
| Shot Type (Full) | 1-9, 0, -, = |
| Spin Grid | Numpad 1-9 |
| Position Grid | Numpad 1-9 |
| Landing Zone | Numpad 1-9 |
| Quality | G, A, W, N, L, D |
| Back | Backspace |
| Skip | Escape |


