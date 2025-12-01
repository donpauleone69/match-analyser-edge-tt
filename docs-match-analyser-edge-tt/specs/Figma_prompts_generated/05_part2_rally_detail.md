# 05 - Part 2: Rally Detail

## Screen Purpose
Sequential per-rally review and shot annotation. Combines previous Step 1 Review and Step 2 Shot Detail into unified workflow.

---

## Figma AI Prompt

```
Design the Rally Detail tagging screen for a Table Tennis Rally Tagger. This is Part 2 of a two-part workflow, where users review timestamps and answer shot questions for each rally sequentially.

Layout (three-column, same as Part 1):

1. LEFT PANEL — Match Panel (280px width, dark #1a1a1a):

Top section — Match Details (collapsed):
- Shows players, set score, match date
- Collapsed card, click to expand

Middle section — Rally List (scrollable):
- Each rally as collapsible tree:
  
  COLLAPSED RALLY (not active):
  - Single row: "Rally 3" | "2-1" score | ✓ checkmark if complete
  - Gray/muted appearance
  
  EXPANDED RALLY (active, only one at a time):
  - Header: "Rally 5 of 12" with highlight border
  - Tree items (top to bottom):
    1. Server row: "Server" label | "Marcus" name | ←→ hint
    2. Serve row: "Serve" label (cyan) | "00:23.45" timestamp
    3. Receive row: "Receive" label (orange) | "00:24.12" timestamp
    4. Shot 3 row: "Shot 3" label | "00:24.89" timestamp
    5. ... more shots
    6. End of Point row: "End of Point" (purple) | "00:25.67" timestamp
    7. Winner row: "Winner" label (green) | "Marcus" or "← / → to select"
  - Selected item has accent highlight bar
  - Items show ←→ hint when selected

Bottom section — Actions:
- "Insert Rally Here" button (secondary)

2. CENTRE PANEL — Video + Shot Questions (flex):

Top — Video Player (constrained height ~45vh):
- Video with shot preview loop
- Shows server name overlay when on Serve row (large semi-transparent text)
- Preview buffer: plays 0.2s past next timestamp

Middle — Action Bar:
- Left: "Delete Shot" button (when shot selected), "Add Shot" button
- Right: Context hint "←→ adjust time" or "← Player1 | → Player2"

Bottom — Shot Question Modal (inline, appears after timestamp confirmed):
- Sequential question flow
- See Shot Question Modal spec for details

3. RIGHT PANEL — Settings (240px width):

Loop Settings card:
- Label: "Preview Loop Speed"
- Button group: 0.25x | 0.5x | 0.75x | 1x
- Default 0.5x highlighted

Preview Buffer card:
- Label: "Preview Buffer"
- Slider: 0.1s to 0.5s
- Default 0.2s

Tagging Mode card:
- Toggle: "Essential" / "Full"
- Description text below explaining difference

Export button:
- "Export Highlights" secondary button

Header:
- Left: Back arrow + "Part 2: Rally Detail"
- Center: Progress "Rally 5 of 12"
- Right: "Complete Match" button (enabled when all rallies done)

Keyboard Hints bar (below header):
- "↑↓ Navigate" | "←→ Edit" | "Space Play" | "H Highlight" | "Del Shot"

Color scheme:
- Active rally: Teal border #14b8a6
- Serve: Cyan #06b6d4
- Receive: Orange #f97316
- End of Point: Purple #a855f7
- Winner: Green #22c55e
- Needs attention: Yellow/warning

Typography:
- Shot labels: 14px medium
- Timestamps: 12px monospace
- Server overlay: 64px bold, 30% opacity white

Style: Sequential focus. Only active rally expanded. Clear visual hierarchy for shot types. Keyboard-optimized navigation.
```

---

## Rally Tree Item States

### Server Row
- Click/Enter: Select
- ←→: Toggle between Player 1 / Player 2
- Recalculates subsequent rally servers

### Shot Rows (Serve, Receive, Shot N)
- Click/Enter: Select + video seeks + auto-play loop
- ←→: Frame step timestamp
- After timestamp confirmed: Shot Question Modal appears

### End of Point Row
- Click/Enter: Select + video shows still frame
- ←→: Frame step timestamp
- Purple accent color

### Winner Row
- Click/Enter: Select
- ←: Set winner = Player 1
- →: Set winner = Player 2
- Shows "needs winner" warning if not set

---

## Workflow Per Rally

1. Rally expands, first item (Server) selected
2. User confirms/adjusts server with ←→
3. Navigate down to Serve
4. Video loops serve segment
5. Adjust timestamp if needed
6. Shot Question Modal appears inline
7. Answer questions (Type → Spin → Landing Zone → Quality)
8. Auto-advance to next shot
9. Repeat for all shots
10. End of Point: adjust timestamp, still frame
11. Winner: select with ←→
12. If error shot: End of Point Modal asks Forced/Unforced
13. Rally folds, next rally opens


