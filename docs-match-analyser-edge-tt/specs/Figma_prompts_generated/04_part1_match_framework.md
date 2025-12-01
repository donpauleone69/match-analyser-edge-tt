# 04 - Part 1: Match Framework

## Screen Purpose
Mark all contacts and rally boundaries in a single pass through the video. Creates the structural skeleton of the match.

---

## Figma AI Prompt

```
Design the Match Framework tagging screen for a Table Tennis Rally Tagger. This is Part 1 of a two-part workflow.

Layout (three-column):

1. LEFT PANEL — Match Panel (280px width, dark #1a1a1a):

Top section — Match Details (collapsible card):
- Header: "Match Details" with collapse chevron
- Content: Player names, set score "0-0", points score "0-0", first server indicator
- Collapsed by default after setup

Middle section — Rally List (scrollable):
- Each rally as expandable card:
  - Header: "Rally 1" badge + score "0-0" + server icon
  - Expand to show: Serve timestamp, shot count indicator
  - Active rally highlighted with accent border
  - Progress: "Rally X of Y" shown in header
- Rallies added dynamically as user tags

Bottom section — Match Result (appears after completion):
- Final set score
- Match winner
- Video coverage indicator

2. CENTRE PANEL — Video Player (flex, fills remaining space):

Video area (top 60%):
- 16:9 video with dark background
- No timeline bar (removed for Part 1)
- Minimal overlay: current time only

Status Display (middle):
- Large centered status indicator:
  - "Press Space to mark serve" (idle state)
  - "Rally in progress: 3 shots" (during rally)
  - "2x Fast Forward" with FF icon (between rallies)
- Clear visual distinction between tagging and FF modes

Keyboard Hints (bottom):
- Compact row: "Space Contact" | "→ End Rally" | "← Slow Down" | "E End Set" | "K Play/Pause"

3. RIGHT PANEL — Speed Controls (240px width, dark #1f1f1f):

Tagging Settings card:
- Label: "Tagging Speed"
- Button group: 0.125x | 0.25x | 0.5x | 0.75x | 1x
- Default 0.25x highlighted

Fast Forward Settings card:
- Label: "Fast Forward Speed"  
- Button group: 0.5x | 1x | 2x | 3x | 4x | 5x
- Default 1x highlighted

Current Speed Display card:
- Large "0.25x" number display
- Label below: "Tagging mode" or "Fast forwarding"
- Color: Teal for tagging, orange/warning for FF

Header:
- Left: Back arrow + "Part 1: Match Framework"
- Right: "Review & Complete" button (enabled when rallies exist and no open rally)

Color scheme: 
- Background: #0f0f0f (app), #1a1a1a (panels)
- Tagging mode: Teal #14b8a6
- Fast forward mode: Orange/warning #f97316
- Rally cards: #252525 with #333 borders

Typography: 
- Status text: Large 24px bold
- Speed display: 32px bold monospace
- Rally labels: 14px semibold

Style: Optimized for keyboard-driven workflow. Clear mode distinction. Minimal visual clutter during tagging.
```

---

## Interaction States

### Idle (No Rally Open)
- Status: "Press Space to mark serve"
- Video paused or playing at tagging speed
- Space key starts new rally with serve contact

### Rally In Progress
- Status: "Rally in progress: X shots"
- Teal accent color
- Space adds contact, → ends rally

### Fast Forward Mode
- Status: "Xx Fast Forward" with icon
- Orange/warning accent color
- → increases speed, ← decreases speed
- Space exits FF and marks serve (new rally)

### End of Set Available
- E key only enabled when no open rally
- Creates end-of-set timestamp marker


