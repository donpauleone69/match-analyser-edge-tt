# 15 - End of Point Modal

## Screen Purpose
Rally completion modal that appears after the last shot is tagged. Shows derived winner and asks for forced/unforced classification when needed.

---

## Figma AI Prompt — Error Shot (Forced/Unforced Question)

```
Design an inline end-of-point panel for rally completion when the last shot was an error.

Layout:
- Inline panel below video (same position as Shot Question Modal)
- Card with purple accent border (matches End of Point row color)

Content:

1. Header:
- Icon: Checkered flag or finish icon
- Title: "End of Point"

2. Derived Information Display:
- Large text: "Marcus missed" (player who made error)
- Subtitle: "Shot went in the net" (derived from quality: inNet/missedLong/missedWide)
- Winner badge: "Chen wins the point" with green checkmark

3. Question — Error Type:
- Label: "Was this error:"
- Two large buttons side by side:
  - "Forced Error" — "Pressured into mistake"
  - "Unforced Error" — "Unpressured mistake"
- Keyboard hints: "F" | "U"

4. Action:
- "Confirm & Next Rally" button (teal, full width)
- Auto-confirms after selection if no other questions

Color scheme:
- Panel border: Purple #a855f7
- Winner badge: Green background #22c55e
- Error type buttons: Neutral until selected
- Selected: Teal #14b8a6

Typography:
- "Marcus missed": 20px bold
- Error description: 14px muted
- Winner badge: 14px semibold white on green

Style: Clear display of derived information. Single question when applicable. Quick confirmation flow.
```

---

## Figma AI Prompt — Winner Shot (No Question Needed)

```
Design an inline end-of-point panel for rally completion when the last shot was in-play (winner shot).

Layout:
- Same inline panel position
- Card with green accent border

Content:

1. Header:
- Icon: Trophy or star
- Title: "Winner Shot!"

2. Derived Information Display:
- Large text: "Marcus wins the point"
- Subtitle: "Chen couldn't return the shot"
- Animation: Subtle confetti or sparkle effect (optional)

3. No Question Needed:
- All information derived from shot quality
- Just confirmation

4. Action:
- "Next Rally →" button (teal, full width)
- Or auto-advance after brief delay (1s)

Color scheme:
- Panel border: Green #22c55e
- Winner text: Green #22c55e
- Celebratory feel

Style: Quick acknowledgment. Celebratory but not disruptive. Fast flow to next rally.
```

---

## Figma AI Prompt — Service Fault

```
Design an inline end-of-point panel for service fault (serve was an error).

Layout:
- Same inline panel position
- Card with red accent border

Content:

1. Header:
- Icon: X or fault indicator
- Title: "Service Fault"

2. Derived Information Display:
- Large text: "Marcus faulted"
- Subtitle: "Serve went in the net" (or long/wide)
- Winner badge: "Chen wins the point"

3. No Question Needed:
- Service faults are always unforced by definition
- pointEndType automatically set to 'serviceFault'

4. Action:
- "Next Rally →" button

Color scheme:
- Panel border: Red #ef4444
- Fault text: Red

Style: Clear fault indication. No additional questions. Quick flow.
```

---

## Figma AI Prompt — Full Mode (With Luck Question)

```
Design end-of-point panel additions for Full tagging mode.

Additional Question — Luck Type (appears in Full mode):
- Label: "Any luck involved?"
- Four buttons:
  - "None" (default, gray)
  - "Lucky Net" (ball hit net and went over)
  - "Lucky Edge (Table)" (ball hit table edge)
  - "Lucky Edge (Bat)" (ball hit bat edge)
- Appears after Forced/Unforced question if applicable

Conditional — Unforced Error Cause (if unforced + diagnostics enabled):
- Label: "What caused the error?"
- Four buttons:
  - "Technical Execution"
  - "Bad Decision"
  - "Too Aggressive"
  - "Too Passive"

Style: Additional questions flow naturally after core questions. Clear progression indicator.
```

---

## Derivation Logic Summary

| Last Shot Quality | Winner | pointEndType | Question Needed |
|-------------------|--------|--------------|-----------------|
| inNet/missedLong/missedWide (Shot 1) | Receiver | serviceFault | None |
| inNet/missedLong/missedWide (Shot 2) | Server | receiveError | None |
| inNet/missedLong/missedWide (Shot 3+) | Other player | — | Forced or Unforced? |
| good/average/weak | Shot player | winnerShot | None |


