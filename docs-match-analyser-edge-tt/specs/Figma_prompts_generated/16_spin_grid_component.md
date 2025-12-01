# 16 - Spin Grid Component

## Component Purpose
3×3 grid selector for serve spin. Represents ball contact point perspective — topspin at top (contact top of ball), backspin at bottom (contact bottom of ball).

---

## Figma AI Prompt

```
Design a 3×3 spin selector grid component for serve annotation.

Layout:
- Square grid, 240px × 240px total
- 9 equal cells with 4px gaps
- Each cell ~76px × 76px

Grid Labels (ball contact point perspective):

Top Row (topspin family):
- Cell 7: "Top-Left" — topspin with left sidespin
- Cell 8: "Topspin" — pure topspin
- Cell 9: "Top-Right" — topspin with right sidespin

Middle Row (sidespin / no spin):
- Cell 4: "Side-Left" — pure left sidespin
- Cell 5: "No Spin" — flat/dead ball
- Cell 6: "Side-Right" — pure right sidespin

Bottom Row (backspin family):
- Cell 1: "Back-Left" — backspin with left sidespin
- Cell 2: "Backspin" — pure backspin
- Cell 3: "Back-Right" — backspin with right sidespin

Visual Design:

Each cell contains:
- Spin type label (abbreviated): "Top-L", "Top", "Top-R", etc.
- Small directional arrow icon showing spin direction
- Keyboard number in corner (1-9 matching numpad layout)

Cell States:
- Default: Dark gray #333333 background, light text
- Hover: Lighter gray #444444
- Selected: Teal #14b8a6 background, white text
- Disabled: #252525 background, muted text (if ever needed)

Visual Cues:
- Top row cells have subtle upward gradient (topspin visual)
- Bottom row cells have subtle downward gradient (backspin visual)
- Side cells have horizontal gradient hints

Header:
- Label above grid: "Serve Spin"
- Subtitle: "Select ball contact point"

Footer:
- Keyboard hint: "Use numpad 1-9"

Color scheme:
- Grid background: #252525
- Cell default: #333333
- Cell selected: Teal #14b8a6
- Arrows/icons: #737373 default, white when selected

Typography:
- Cell labels: 12px semibold
- Keyboard numbers: 10px monospace, corner positioned
- Header: 14px medium

Style: Clear spatial relationship. Numpad layout is intuitive. Visual hints reinforce spin direction concept.
```

---

## Numpad Mapping

```
┌─────┬─────┬─────┐
│  7  │  8  │  9  │   ← Topspin row
├─────┼─────┼─────┤
│  4  │  5  │  6  │   ← Sidespin row
├─────┼─────┼─────┤
│  1  │  2  │  3  │   ← Backspin row
└─────┴─────┴─────┘
```

This matches standard numpad layout, making keyboard entry intuitive.

---

## Spin Direction Icons

| Cell | Icon Description |
|------|------------------|
| Top-Left | Curved arrow: up + left rotation |
| Topspin | Curved arrow: forward/up rotation |
| Top-Right | Curved arrow: up + right rotation |
| Side-Left | Curved arrow: left rotation |
| No Spin | Flat line or circle (no rotation) |
| Side-Right | Curved arrow: right rotation |
| Back-Left | Curved arrow: down + left rotation |
| Backspin | Curved arrow: backward/down rotation |
| Back-Right | Curved arrow: down + right rotation |

---

## Usage Context

- Appears in Shot Question Modal for serves
- Used in both Essential and Full tagging modes
- Same component used in Part 2: Rally Detail


