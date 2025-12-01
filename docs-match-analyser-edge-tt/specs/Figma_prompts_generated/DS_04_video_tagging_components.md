# DS-04 - Video Tagging Components

## Purpose
Generate specialized video player, Match Panel, and tagging control components for the unified two-part workflow.

> **Updated:** v0.8.0 — Unified layout for Part 1 (Match Framework) and Part 2 (Rally Detail)

---

## Figma AI Prompt — Match Panel Component

```
Create the Match Panel sidebar component for a Table Tennis Rally Tagger.

MATCH PANEL STRUCTURE (280px width, full height):

Background: #1a1a1a

1. MATCH DETAILS SECTION (collapsible):
- Header row: "Match Details" label + chevron icon
- Collapsed state: Single line showing "Marcus vs Chen • 0-0"
- Expanded state: Card with:
  - Player 1: "Marcus" with serve indicator if first server
  - Player 2: "Chen"
  - Set Score: "0 - 0" large
  - Points Score: "0 - 0" 
  - Match Date: "Dec 1, 2025"
  - First Server badge

2. RALLY LIST SECTION (scrollable, flex-grow):

Rally Card — Collapsed:
- Height: 44px
- Left: "Rally 3" badge
- Center: Score "2-1"
- Right: Checkmark if complete, warning if needs attention
- Background: #252525, border: #333333
- Hover: #2a2a2a

Rally Card — Expanded (active rally):
- Highlighted border: Teal #14b8a6 (2px left border)
- Header: "Rally 5 of 12" with highlight
- Tree structure below:

  Server Row:
  - Icon: Paddle icon
  - Label: "Server"
  - Value: "Marcus"
  - Hint: "←→" when selected
  - Height: 36px
  
  Shot Rows:
  - Serve (Shot 1): Cyan #06b6d4 accent
    - Label: "Serve"
    - Timestamp: "00:23.45" monospace
  - Receive (Shot 2): Orange #f97316 accent
    - Label: "Receive"  
    - Timestamp: "00:24.12"
  - Shot N: Default color
    - Label: "Shot 3", "Shot 4", etc.
    - Timestamp
  
  End of Point Row:
  - Purple #a855f7 accent
  - Label: "End of Point"
  - Timestamp or "--:--" if not set
  
  Winner Row:
  - Green #22c55e accent
  - Label: "Winner"
  - Value: Player name or "← / → to select"
  - Warning state if not set: Yellow border

Selected Item State:
- Background: Accent color at 20% opacity
- Left border: 2px solid accent color
- Shows "←→" hint

3. MATCH RESULT SECTION (bottom, after completion):
- Header: "Match Result"
- Winner: "Marcus wins 3-2"
- Final score display
- Video coverage badge

4. ACTION BUTTON (sticky bottom):
- "Insert Rally Here" button (secondary style)
- Full width with + icon

Spacing: 8px between rally cards, 16px section padding
```

---

## Figma AI Prompt — Video Player (Unified)

```
Create a video player component optimized for tagging workflows.

VIDEO PLAYER CONTAINER:
- Aspect ratio: 16:9
- Max height: 45vh or 350px
- Background: #0a0a0a

OVERLAY CONTROLS (bottom gradient):
- Gradient: transparent to #000 at 60%
- Height: 80px

Controls row:
- Left: Current time "02:34.56" monospace
- Center: Play/Pause button (48px circle)
- Right: Frame step buttons "◀◀" "|◀" "▶|" "▶▶"

Progress bar:
- Track: 4px height, #333333
- Progress: Teal #14b8a6
- Playhead: 12px circle, white
- Hover: Show timestamp tooltip

SERVER NAME OVERLAY (for Part 2, serve shots):
- Large text: "MARCUS" 
- Position: Center of video
- Style: 64px bold, white at 30% opacity
- Only visible when viewing serve shot

NO TIMELINE BAR:
- Timeline removed for Part 1 (Match Framework)
- Optional thin timeline for Part 2 if needed

CONSTRAINED PLAYBACK INDICATOR (Part 2):
- Small badge: "Looping shot 3"
- Position: Top-right corner
- Shows loop boundaries
```

---

## Figma AI Prompt — Speed Controls (Part 1)

```
Create speed control cards for Match Framework tagging.

TAGGING SPEED CARD:
- Background: #252525
- Padding: 12px
- Label: "Tagging Speed" in 12px muted
- Button row: 0.125x | 0.25x | 0.5x | 0.75x | 1x
- Button style: 
  - Default: #333333 bg, #a3a3a3 text
  - Selected: #14b8a6 bg, white text
  - Size: 48px × 32px each
- Helper: "Speed during shot marking" in 11px muted

FAST FORWARD SPEED CARD:
- Same structure
- Button row: 0.5x | 1x | 2x | 3x | 4x | 5x
- Selected state: #f97316 (orange) bg

CURRENT SPEED DISPLAY:
- Large card, centered content
- Number: "0.25x" in 32px bold monospace
- Color: Teal for tagging, Orange for FF
- Label: "Tagging mode" / "Fast forwarding"
- Mode badge below
```

---

## Figma AI Prompt — Speed Controls (Part 2)

```
Create speed control cards for Rally Detail review.

LOOP SPEED CARD:
- Label: "Preview Loop Speed"
- Buttons: 0.25x | 0.5x | 0.75x | 1x
- Default: 0.5x selected

PREVIEW BUFFER CARD:
- Label: "Preview Buffer"
- Slider component: 0.1s — 0.5s range
- Current value: "0.2s" display
- Teal track color

TAGGING MODE TOGGLE:
- Label: "Tagging Mode"
- Segmented control: "Essential" | "Full"
- Essential: Teal when selected
- Full: Purple #a855f7 when selected
- Description text below each option
```

---

## Figma AI Prompt — Shot Question Flow

```
Create shot question UI components for inline display.

QUESTION CONTAINER:
- Background: #252525
- Border: 1px solid #333333
- Border-radius: 8px
- Padding: 16px

PROGRESS INDICATOR:
- Position: Top-right
- Format: "2 of 4"
- Style: 12px muted text

QUESTION LABEL:
- Style: 16px semibold
- Color: White

BUTTON GRID (for shot types, grids):
- Gap: 8px
- Button size: Flexible, min 64px height
- States: Default #333, Hover #444, Selected teal

KEYBOARD HINT:
- Position: Below buttons
- Style: 11px monospace, muted
- Format: "Press 1-9" or "F / B"

NAVIGATION:
- Back arrow: Left side
- Skip link: Right side (optional)

QUALITY BUTTONS (special):
- In-play row: Good (green), Average (gray), Weak (yellow)
- Error row: In Net (red), Missed Long (red), Missed Wide (red)
- Larger buttons: 80px × 48px
```

---

## Figma AI Prompt — End of Point Panel

```
Create end-of-point confirmation panels.

ERROR SHOT PANEL:
- Border: 2px solid purple #a855f7
- Header: Flag icon + "End of Point"
- Content:
  - "Marcus missed" (20px bold)
  - "Shot went in the net" (14px muted)
  - Winner badge: Green pill "Chen wins"
- Question: "Was this error:"
  - "Forced Error" button
  - "Unforced Error" button
- Action: "Confirm & Next Rally"

WINNER SHOT PANEL:
- Border: 2px solid green #22c55e
- Header: Trophy icon + "Winner Shot!"
- Content:
  - "Marcus wins the point" (20px bold, green)
  - Subtle celebration effect
- Action: "Next Rally →"
- Auto-advance option

SERVICE FAULT PANEL:
- Border: 2px solid red #ef4444
- Header: X icon + "Service Fault"
- Content:
  - "Marcus faulted" (20px bold)
  - "Serve went in the net"
  - Winner badge: "Chen wins"
- No question needed
- Action: "Next Rally →"
```

---

## Figma AI Prompt — Spin Grid

```
Create 3×3 spin selector grid component.

GRID CONTAINER:
- Size: 240px × 240px
- Gap: 4px between cells
- Background: #252525

CELL DESIGN:
- Size: ~76px × 76px
- Border-radius: 6px
- Default: #333333 bg
- Hover: #444444 bg
- Selected: #14b8a6 bg

CELL CONTENT:
- Label: "Top-L", "Top", "Top-R", etc. (12px)
- Arrow icon: Showing spin direction
- Number: Numpad position in corner (10px)

GRID LAYOUT:
Row 1 (top): 7-TopLeft | 8-Topspin | 9-TopRight
Row 2 (mid): 4-SideLeft | 5-NoSpin | 6-SideRight  
Row 3 (bot): 1-BackLeft | 2-Backspin | 3-BackRight

VISUAL HINTS:
- Top row: Subtle upward gradient
- Bottom row: Subtle downward gradient
- Indicates ball contact point concept
```

---

## Component Summary

| Component | Used In | Purpose |
|-----------|---------|---------|
| Match Panel | Part 1, Part 2 | Rally tree, match details |
| Video Player | Part 1, Part 2 | Playback with overlays |
| Speed Controls (P1) | Part 1 | Tagging/FF speeds |
| Speed Controls (P2) | Part 2 | Loop speed, buffer, mode |
| Shot Question Flow | Part 2 | Inline shot annotation |
| End of Point Panel | Part 2 | Rally completion |
| Spin Grid | Part 2 | Serve spin selection |
| Landing Zone Grid | Part 2 | Ball placement selection |
| Position Grid | Part 2 (Full) | Player position selection |

