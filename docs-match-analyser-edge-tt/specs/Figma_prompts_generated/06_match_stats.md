# 06 - Match Stats

## Screen Purpose
Show stats for a single match after tagging is complete

---

## Figma AI Prompt

```
Design a post-match statistics screen showing player comparison.

Layout:

1. Header: Back arrow, "Match Stats", Export icon

2. Match Summary Banner:
- Center: "Marcus vs Chen"
- Large score: "3 - 2"
- Date and tournament context below
- Tagging mode badge: "Essential" or "Full"

3. Two-column comparison layout (Player 1 left, Player 2 right):

Stats sections (mirrored left/right):

A. Points Overview:
- Points Won: "54" vs "48"
- Horizontal bar visualization comparing both
- Rally win rate percentage

B. Serve Stats:
- Total serves
- Service faults (in net / long / wide breakdown)
- Serve type distribution (pie or bar)
- Serve spin distribution (if Full mode)
- Serve quality breakdown (good/avg/weak)

C. Receive Stats:
- Return errors (in net / long / wide breakdown)
- Weak receives count
- Issue causes (if Full mode data available)

D. Shot Distribution:
- Shot type breakdown (loop, push, drive, etc.)
- Wing preference (FH vs BH percentage)
- Landing zone heatmap (if data available)

E. Point Endings:
- Winners: X
- Forced Errors: Y
- Unforced Errors: Z
- Service Faults: W
- Receive Errors: V
- Bar chart or icon representation

F. Luck Stats:
- Lucky nets, edges (Full mode only)

Color scheme: Dark theme, stat cards in #252525, player columns subtly color-coded (Player 1: cyan tint, Player 2: amber tint), data visualizations clean and minimal

Typography: Large numbers for key stats, small labels

Style: Scannable at a glance, clear player comparison, professional data visualization aesthetic
```

---

## Notes (v0.8.0)

- Shows tagging mode badge (Essential/Full)
- Error types now derived from shot quality (inNet, missedLong, missedWide)
- Some stats only available in Full mode (spin distribution, luck, diagnostics)
- Landing zone heatmap available in both modes


