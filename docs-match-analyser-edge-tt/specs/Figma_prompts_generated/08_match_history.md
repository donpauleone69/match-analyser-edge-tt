# 08 - Match History

## Screen Purpose
Browse all matches

---

## Figma AI Prompt

```
Design a match history browser screen.

Layout:

1. Header: "Match History", right: filter icon

2. Filter bar (collapsible):
- Player dropdown (filter matches involving specific player)
- Date range picker
- Status filter: "All" / "Complete" / "In Progress"
- Tagging mode: "All" / "Essential" / "Full"
- Sort: "Newest" / "Oldest"

3. Match list (vertical cards):
- Each match card shows:
  - Player names: "Marcus vs Chen"
  - Score: "3-2" (or "In Progress")
  - Date: "Nov 28, 2025"
  - Tagging mode badge: "Essential" or "Full"
  - Status badges: "Part 1 ✓" "Part 2 ✓" (or pending indicators)
  - Highlight count: "★ 3" if has highlighted rallies
  - Small menu icon (three dots) for actions
- Cards are clickable to open match detail

4. Empty state (when no matches):
- Illustration placeholder
- "No matches yet. Create your first match to get started."
- "New Match" button

Color scheme: Dark theme, cards hover state with subtle lift, complete matches have green accent, in-progress have amber, Essential badge teal, Full badge purple

Typography: Player names bold, dates muted, status badges small caps

Style: Clean list view, scannable, clear status at a glance
```

---

## Notes (v0.8.0)

- Updated status badges from "Step 1/2" to "Part 1/2"
- Added tagging mode badge and filter
- Added highlight count indicator


