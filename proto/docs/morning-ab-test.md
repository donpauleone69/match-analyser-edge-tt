# Morning sheet, 16 Nov

On your Surface (http://localhost:5174/) and phone (http://192.168.3.175:5174/), at git tag `proto-tagging-sequential` (32cd1d3). The previous approved version is tag `proto-milestone-2026-11-16`.

## What changed overnight

1. **Tap page is one big touch zone.** Tap the white band every time the ball is hit. The same band picks the first attack after the pause. Back 5s is gone from the page.
2. **Foot strip.** Serving button on the left. On the right: Edit last rally between points, Delete last while tapping, Discard and No attack at the pick.
3. **First attack straight after the pause**, then the result and the other questions (your order).
4. **No attack was hidden, not lost.** The rules hid it after an attacking last shot. It is now always there at the pick.
5. **Shot by shot mode** (the B of the A/B). Press Shot by shot in the header, or add `?flow=sequential`. It walks shot by shot: Defensive is lit before the first attack; Offensive opens stroke, wing and intent below and moves on once answered; Next skips optional rows; one-shot rallies open on End; the loop plays 3 shots at a time. Both modes save exactly the same data.
6. **Button and text standard**, proposal only: [button-and-text-standard.md](button-and-text-standard.md). Five choices at the top.

## How to A/B

- Alternate blocks of 10 rallies: current, shot by shot, shot by shot, current.
- Every rally logs time, presses and changes. Press **Copy timings** on the Rallies list to copy the table. The log survives closing the tab, but tagged rallies do not survive a reload, so copy before you close.

## Calls I made against your notes

- **Undo after Discard kept.** Discard now sits just under the big zone, so a stray press would lose the whole rally.
- **First attack asks Intent, not Initiative**, in both modes, because the current mode stores Intent there. Changing it means changing both together.

## Quick questions

1. Two-shot rallies have no pick (shot 2's stroke decides). Give them the pick too?
2. Change first attack is only at Ready. Fine?
3. Status line "Pick the first attack or No attack"?
4. Backspace still steps the video back 5 s. Keep?
