# 02 - Match Setup

## Screen Purpose
Configure players, match structure, video source

---

## Figma AI Prompt

```
Design a match setup form screen for a Table Tennis Rally Tagger SPA.

Layout:
- Top: Header bar with back arrow and title "New Match"
- Main content: Centered card container (max-width 640px) with generous padding

Form sections from top to bottom:

1. Players section:
- Two side-by-side input cards labeled "Player 1" and "Player 2"
- Each has: text input for name with autocomplete dropdown hint
- Below each: checkbox "Extended diagnostics for this player"

2. Match config section:
- First Server toggle: Two large radio-style buttons "P1 Serves First" / "P2 Serves First"
- Match Date: Date picker input, pre-filled with today
- Game Structure: Dropdown showing "Best of 5 to 11"

3. Video section:
- "Select Video" file picker button with selected filename display and duration
- Checkbox: "No video available (results only)"

4. Action:
- Bottom: Full-width primary button "Start Step 1 Tagging" (disabled state if form incomplete)

Color scheme: Dark theme (#1a1a1a background), form sections in darker cards (#252525), teal accent (#14b8a6) for primary actions, input fields with subtle borders

Typography: Geometric sans-serif, clear labels above inputs

Style: Clean form layout, clear visual hierarchy, obvious primary action at bottom
```

