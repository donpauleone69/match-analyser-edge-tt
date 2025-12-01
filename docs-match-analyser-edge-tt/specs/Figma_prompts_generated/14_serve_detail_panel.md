# 14 - Serve Detail Panel

## Screen Purpose
Conditional serve fields within Step 2

---

## Figma AI Prompt

```
Design a serve-specific panel that appears within the Step 2 Shot Detail screen when tagging a serve.

Layout (appears in place of standard Q3):
- Section heading: "Serve Details"

Fields:
1. Serve Type (button palette, single select):
- pendulum, reversePendulum, tomahawk, backhand, hook, shovel, other

2. Primary Spin (button group):
- under, top, sideLeft, sideRight, none

3. Spin Strength (button group):
- low, medium, heavy

4. Service Fault toggle:
- "This serve was a fault" checkbox
- If checked: Fault type selector appears (net, long, wide, other)

Conditional (if serve quality = weak AND diagnostics enabled):
5. Serve Issue Cause (button palette):
- technicalExecution, badDecision, tooHigh, tooLong, notEnoughSpin, easyToRead

Color scheme: Same dark theme as parent screen, serve-specific section with subtle border or background tint to distinguish

Typography: Compact labels, buttons readable

Style: Flows naturally after standard Q1-Q2, before Q4-Q5
```

