# 07 - Player Stats

## Screen Purpose
Aggregate stats across matches for a player

---

## Figma AI Prompt

```
Design an aggregate player statistics screen showing performance across multiple matches.

Layout:

1. Header: Back arrow, player name large "Marcus Chen", player rating badge "7"

2. Filter bar:
- Time range dropdown: "Last 30 days" / "Last 90 days" / "All time"
- Opponent filter dropdown (optional)
- Tagging mode filter: "All" / "Essential only" / "Full only"

3. Stats cards grid (2 columns):

Card 1: Serve Performance
- Fault rate % (in net / long / wide breakdown)
- Serve quality distribution chart (stacked bar: good/avg/weak)
- Most used serve types
- Spin distribution (if Full mode data)

Card 2: Receive Performance
- Return error rate (in net / long / wide)
- Issue cause breakdown (misread spin, execution, decision) — Full mode only

Card 3: Rally Patterns
- Average rally length
- Points won by rally phase (serve+1, receive+1, open rally)
- Shot type distribution

Card 4: Shot Distribution
- Most used shots (bar chart)
- Wing preference (FH/BH split)
- Quality by shot type
- Landing zone heatmap

4. Recent Matches section:
- List of 5 recent matches with opponent, score, date
- Tagging mode badge per match
- "View All" link

Color scheme: Dark theme, cards with subtle borders, data visualizations in consistent accent colors

Typography: Player name prominent, numbers large and scannable

Style: Performance dashboard feel, coach-friendly layout, exportable data appearance
```

---

## Notes (v0.8.0)

- Added tagging mode filter
- Error breakdown now uses quality-derived types (inNet, missedLong, missedWide)
- Some stats only available from Full mode matches


