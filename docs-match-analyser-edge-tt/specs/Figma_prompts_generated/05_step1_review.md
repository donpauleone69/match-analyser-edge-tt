# 05 - Step 1: Review

## Screen Purpose
Review and adjust contacts before Step 2

---

## Figma AI Prompt

```
Design a review screen for adjusting contacts and rally boundaries after initial tagging.

Layout:

1. Header: Back arrow, title "Review Step 1", right side: "Complete Step 1 ✓" button (teal)

2. Split panel layout (sidebar + main):

Left sidebar (280px width, dark panel):
- Scrollable rally list
- Each rally item shows: "Rally 12" badge, score after "7-5", server icon
- Expandable: Click to show contacts as sub-items with timestamps
- Currently selected contact highlighted with accent border
- Status icons: ✓ for complete rallies, ⚠ for issues

Right main panel:
- Top: Compact video player with contact frame displayed
- Below video: Nudge controls "−frame [timestamp] +frame" with small buttons
- Correction section (card):
  - "Server Override" dropdown
  - "Score Correction" checkbox with note input
  - "Correction Notes" text area
- Bottom: Previous/Next contact navigation buttons

Color scheme: Dark theme, sidebar slightly darker than main panel, accent highlights on selection, warning yellow for flags

Typography: Monospace for timestamps, geometric sans for labels

Style: Efficient review workflow. Easy to scan rallies, quick to nudge contacts. Clear correction UI.
```

