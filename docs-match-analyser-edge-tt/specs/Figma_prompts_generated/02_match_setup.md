# 02 - Match Setup

## Screen Purpose
Configure players, match structure, video source — triggers Match Details Modal for video matches

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
- Match Date: Date picker input, pre-filled with today
- Game Structure: Dropdown showing "Best of 5 to 11"
- Tournament/Context: Optional dropdown (Friendly, Minor Tournament, Tournament, National)

3. Video section:
- "Select Video" file picker button with selected filename display and duration
- Checkbox: "No video available (results only)"
- Helper text: "Match should be a single video file"

4. Action:
- Bottom: Full-width primary button "Continue to Tagging" (disabled state if form incomplete)
- Note: This opens Match Details Modal for video matches, or Game Score Entry for no-video

Color scheme: Dark theme (#1a1a1a background), form sections in darker cards (#252525), teal accent (#14b8a6) for primary actions, input fields with subtle borders

Typography: Geometric sans-serif, clear labels above inputs

Style: Clean form layout, clear visual hierarchy, obvious primary action at bottom
```

---

## Notes (v0.8.0)

- Match Date moved here from Match Details Modal for better flow
- When user clicks "Continue to Tagging" with video selected:
  - Opens Match Details Modal to capture first serve timestamp, starting scores, first server
- When user clicks "Continue to Tagging" with "No video" checked:
  - Goes directly to Game Score Entry screen

