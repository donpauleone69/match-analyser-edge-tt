# 06 - Step 2: Shot Detail

## Screen Purpose
Annotate each shot with Q1–Q5 and conditionals

---

## Figma AI Prompt

```
Design the shot-by-shot annotation screen for detailed shot tagging.

Layout (3 zones):

1. Top Zone (35% height) - Video + Navigation:
- Compact video player with auto-positioned playhead
- Below: Progress bar "Shot 23 of 147" with Previous/Next shot arrows

2. Left Sidebar (200px):
- Rally navigator tree
- Rally headings: "Rally 1 (7-5)" expandable
- Shot items: "Shot 1 • Serve" / "Shot 2 • BH Push" with completion checkmarks
- Current shot highlighted with accent bar

3. Right Main Panel - Shot Detail Form:
- Section: "Q1: Wing" — Two large toggle buttons "FH" / "BH"
- Section: "Q2: Position" — 3×3 clickable grid showing table zones (Close/Mid/Far × Left/Mid/Right)
- Section: "Q3: Shot Type" — Button palette in 3 rows:
  - Defensive: lob, chop, chopBlock, dropShot, shortTouch, push
  - Neutral: block, drive, flick, slowSpinLoop
  - Aggressive: loop, fastLoop, smash
  - (Invalid options for selected distance are grayed out)
- Section: "Q4: Landing" — 3×3 grid for in-play zones + 3 error buttons "NET" "OFF" "WIDE"
- Section: "Q5: Quality" — Three buttons "Good" (green) / "Average" (gray) / "Weak" (red)
- Conditional section (collapsible): Serve fields (serve type dropdown, spin primary, spin strength)
- Conditional section: Issue cause fields when applicable

Bottom: Sticky bar with "Complete Step 2" button (disabled until all shots done)

Color scheme: Dark theme, form sections as card groups, shot types color-coded by category (defensive=blue, neutral=gray, aggressive=orange)

Typography: Compact labels, clear button text, tab-stop friendly

Style: Optimized for rapid sequential entry. Q1-Q5 flows top-to-bottom naturally. Minimal clicks per shot.
```

