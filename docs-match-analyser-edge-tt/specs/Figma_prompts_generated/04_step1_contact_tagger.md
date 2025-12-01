# 04 - Step 1: Contact Tagger

## Screen Purpose
Real-time contact capture while watching video

---

## Figma AI Prompt

```
Design the core real-time contact tagging screen for a Table Tennis Rally Tagger.

Layout (top to bottom):

1. Video Player (top 45% of screen):
- Large video area with dark background
- Overlay controls: Play/Pause center button, speed selector (0.5x, 0.75x, 1x), frame-step arrows (◀◀ ▶▶)
- Bottom scrub bar with timestamps

2. Timeline Strip (thin horizontal band, ~60px height):
- Light gray background strip
- Small vertical markers for each contact (cyan ticks)
- Larger markers for rally ends: green for scoring, orange for non-scoring
- Current position indicator line (white vertical)

3. Score & Server Display (compact row):
- Left: Current score large "7 - 5" with player names
- Right: Server indicator icon with current server name

4. Tagging Controls (bottom, ~180px):
- Large primary button: "CONTACT" (full-width, cyan/teal, prominent tap target)
- Two medium buttons side by side:
  - "END RALLY — SCORE" (green accent)
  - "END RALLY — NO SCORE" (gray)
- Small "UNDO LAST" button with icon (bottom corner)

Color scheme: Dark background (#0f0f0f), video player black, timeline strip medium gray (#333), contact markers cyan (#06b6d4), scoring end markers green (#22c55e), no-score markers orange (#f97316)

Typography: Score in large bold monospace, player names geometric sans

Style: Optimized for fast repeated tapping. CONTACT button should be the dominant visual element. Minimal distractions.
```

