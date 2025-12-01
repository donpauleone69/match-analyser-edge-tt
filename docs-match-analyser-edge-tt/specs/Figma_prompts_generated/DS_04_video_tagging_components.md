# DS-04 - Video Tagging Components

## Purpose
Generate specialized video player, timeline, and tagging control components.

---

## Figma AI Prompt

```
Create specialized video tagging UI components for a Table Tennis Rally Tagger.

VIDEO PLAYER SECTION:
- 16:9 aspect ratio video area, black background #0a0a0a
- Overlay controls at bottom (gradient from transparent to #000 at 60%):
  - Play/Pause button center (48px circle, white icon)
  - Speed selector: "0.5x" "0.75x" "1x" buttons, current highlighted
  - Frame step buttons: "<<" ">>" small icons
- Progress bar: thin 4px track, white playhead, buffered in gray

TIMELINE STRIP:
- Height: 60px
- Background: #333333
- Horizontal track: 4px height, #525252
- Playhead: 2px white vertical line, full height
- Contact markers: 2px wide, 20px height, cyan #06b6d4
- Rally end (scoring): 4px wide, 30px height, green #22c55e
- Rally end (no score): 4px wide, 30px height, orange #f97316
- Show approximately 15 markers distributed across timeline
- Current time label: monospace, left side "02:34"

SCORE & SERVER DISPLAY:
- Height: 48px
- Background: #252525
- Left: Large score "7 - 5" in 24px bold monospace, player names smaller above each number
- Right: Server indicator icon (small ping pong paddle) + "Marcus serving" text
- Subtle divider between sections

TAGGING CONTROLS PANEL:
- Height: 180px
- Background: #252525
- Top shadow (inverted, glows upward)
- Primary button: "CONTACT" - Full width, 56px height, teal #14b8a6, bold white text, prominent
- Two buttons below, side by side with 8px gap:
  - "END RALLY — SCORE" - 48px height, green #22c55e background
  - "END RALLY — NO SCORE" - 48px height, gray #525252 background
- Bottom right corner: Small "UNDO" ghost button with undo icon

WINNER DIALOG (shown as overlay):
- Dark overlay #000 at 60%
- Centered card 400px wide, #333333 background, 12px radius
- Title: "Who won the point?" in 17px semibold centered
- Two large buttons stacked vertically, 60px height each, teal, full width:
  - "Player 1 — Marcus"
  - "Player 2 — Chen"

Stack all these components vertically to show complete tagging interface.
```

