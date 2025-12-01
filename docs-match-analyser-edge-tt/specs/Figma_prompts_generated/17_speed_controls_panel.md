# 17 - Speed Controls Panel

## Component Purpose
Right sidebar panel for controlling playback speeds during tagging. Shows different controls based on current mode (Part 1 vs Part 2).

---

## Figma AI Prompt — Part 1: Match Framework

```
Design a speed controls sidebar panel for the Match Framework tagging screen.

Layout:
- Width: 240px
- Height: Full sidebar height
- Background: #1f1f1f
- Padding: 16px

Sections (top to bottom):

1. Header:
- Icon: Settings gear
- Title: "Tagging Settings"
- Subtitle: "Adjust playback speeds"

2. Tagging Speed Card:
- Label: "Tagging Speed"
- Button group (horizontal, wrap if needed):
  "0.125x" | "0.25x" | "0.5x" | "0.75x" | "1x"
- Default: 0.25x selected (teal background)
- Helper: "Speed during shot marking"

3. Fast Forward Speed Card:
- Label: "Fast Forward Speed"
- Button group:
  "0.5x" | "1x" | "2x" | "3x" | "4x" | "5x"
- Default: 1x selected (orange/warning background)
- Helper: "Speed between rallies"

4. Current Speed Display:
- Large card with prominent display
- Number: "0.25x" in 32px bold monospace
- Label below: "Tagging mode" or "Fast forwarding"
- Background color indicates mode:
  - Teal #14b8a6 for tagging
  - Orange #f97316 for fast forward
- Animated transition between modes

5. Mode Indicator:
- Visual badge showing current state:
  - "TAGGING" badge (teal)
  - "FAST FORWARD" badge (orange)
  - "PAUSED" badge (gray)

Color scheme:
- Panel background: #1f1f1f
- Card backgrounds: #252525
- Tagging accent: Teal #14b8a6
- Fast forward accent: Orange #f97316
- Button default: #333333
- Button hover: #444444

Typography:
- Section labels: 12px semibold uppercase, muted
- Speed buttons: 14px medium
- Current speed: 32px bold monospace
- Mode label: 14px medium

Style: Clear mode distinction. Easy to scan current state. Touch-friendly button sizes.
```

---

## Figma AI Prompt — Part 2: Rally Detail

```
Design a speed controls sidebar panel for the Rally Detail tagging screen.

Layout:
- Same dimensions as Part 1 (240px width)
- Different controls for review/loop mode

Sections (top to bottom):

1. Header:
- Icon: Settings gear
- Title: "Review Settings"

2. Loop Speed Card:
- Label: "Preview Loop Speed"
- Button group:
  "0.25x" | "0.5x" | "0.75x" | "1x"
- Default: 0.5x selected
- Helper: "Speed for shot preview loops"

3. Preview Buffer Card:
- Label: "Preview Buffer"
- Slider: 0.1s to 0.5s
- Current value display: "0.2s"
- Helper: "Extra time shown after shot"
- Visual: Slider with teal track

4. Tagging Mode Card:
- Label: "Tagging Mode"
- Toggle switch or segmented control:
  "Essential" | "Full"
- Description below toggle:
  - Essential: "4 questions per shot"
  - Full: "5+ questions with diagnostics"
- Current mode highlighted

5. Divider

6. Export Section:
- "Export Highlights" button (secondary style)
- Helper: "Create highlight reel from marked rallies"

Color scheme:
- Same as Part 1 panel
- Essential mode: Teal
- Full mode: Purple #a855f7 (to distinguish)

Typography:
- Same as Part 1

Style: Review-focused controls. Clear mode toggle. Export action accessible.
```

---

## Speed Button States

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | #333333 | #a3a3a3 | none |
| Hover | #444444 | #e5e5e5 | none |
| Selected (Tagging) | #14b8a6 | white | none |
| Selected (FF) | #f97316 | white | none |
| Disabled | #252525 | #525252 | none |

---

## Animation Notes

- Speed change: Smooth 200ms transition
- Mode change (Tagging ↔ FF): Color pulse animation
- Current speed display: Number animates/scales briefly on change


