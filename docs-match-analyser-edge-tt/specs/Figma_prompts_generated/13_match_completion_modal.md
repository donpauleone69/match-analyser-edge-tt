# 13 - Match Completion Modal

## Screen Purpose
Post-tagging modal to capture final match result, scores, and video coverage status. Opens after completing Part 1: Match Framework.

---

## Figma AI Prompt

```
Design a modal dialog for capturing match completion details after tagging.

Layout:
- Overlay: Dark semi-transparent backdrop (#000 at 70% opacity)
- Centered modal card (480px width, rounded corners 12px)

Modal content (top to bottom):

1. Header:
- Title: "Match Complete" centered, 20px bold
- Subtitle: "Enter the final match details" in muted text
- Checkmark icon above title (large, green)

2. Match Result Section:
- Label: "Who won the match?"
- Three toggle buttons in a row:
  - "Player 1 — Marcus" 
  - "Player 2 — Chen"
  - "Incomplete" (for partial recordings)
- Selected button has teal background
- "Incomplete" button is gray when selected

3. Final Scores Section:
- Label: "Final Score"
- Two inputs side by side:
  - "Set Score" text input with placeholder "3-2"
  - "Points Score" text input with placeholder "11-9" (last set)
- Helper: "Enter the final set score and last set points"

4. Video Coverage Section:
- Label: "Video Coverage"
- Dropdown with options:
  - "Full match recorded"
  - "Truncated at start (missed beginning)"
  - "Truncated at end (missed ending)"
  - "Truncated at both ends"
- Helper: "Select if the video doesn't cover the complete match"

5. Summary Card:
- Gray card showing:
  - "12 rallies tagged"
  - "47 shots recorded"
  - "Ready for shot detail tagging"

6. Action Buttons:
- Full-width primary button: "Continue to Part 2" (teal)
- Below: "Go Back" text link

Color scheme: 
- Modal background: #252525
- Success icon: Green #22c55e
- Input fields: #333333 with subtle border
- Primary action: Teal #14b8a6
- Summary card: #1f1f1f

Typography: 
- Title: 20px semibold
- Labels: 14px medium
- Summary stats: 16px bold
- Helper text: 12px regular

Style: Celebratory completion feel. Summary reinforces progress. Clear path to Part 2.
```

---

## Interaction Flow

1. Modal opens after user clicks "Review & Complete" in Part 1
2. User selects match winner (or "Incomplete")
3. User enters final set score (e.g., "3-2")
4. User enters final points of last set (e.g., "11-9")
5. User selects video coverage status
6. Click "Continue to Part 2" proceeds to Rally Detail

---

## Validation

- Match Result: Required (can be "Incomplete")
- Final Set Score: Required
- Final Points Score: Required
- Video Coverage: Required (defaults to "Full match recorded")


