# Pending feedback (waiting for Paul's go)

Sent to build as v0.11 on 2026-11-17:

- Check button toggles delete mode: on plays the rally at 0.5x and shows a minus on every Rally Row chip (short Undo); off is display only. Reason: a toss tapped as the first contact. (Paul, 2026-11-17)
- Shot loops play at 0.75x. The 300 ms reaction adjustment is in video time, whatever the speed. The loop lead, end offset and minimum length are in playback time, so they scale with speed (at 0.75x, 200 ms of playback is 150 ms of video). (Paul, 2026-11-17)
- End row: winners first (BH, FH), then errors (Net, Long, Wide). Button colours could show winner against error. (Paul, 2026-11-17)
- Point to: don't auto-select who won. Calculate it and only hint at who it thinks won. (Paul, 2026-11-17)
- Server toggle pill on the Serve step sits above the serve buttons. (Paul, 2026-11-17)
- Best and Best + FA stay identical apart from first attack. Every item here applies to both, and any other drift between them gets fixed. (Paul, 2026-11-17)

## From the v0.11 review (Opus, 2026-11-17), sent to build as v0.11.1 on 2026-11-17

- Rally 1 hints a guessed name again: picking an End marks the default server as checked, so the hint shows "You" and the overlay reads 1-0. Undoes the v0.8 fix. Saved data is right.
- The video score overlay shows the hinted point before Point to is tapped.
- During live Check the pad still says "Tap shot N" but ignores taps.
- The mismatch screen has two delete controls (chip minuses and the Delete shot number row). Keep one.
- End then serve contact check (Paul, 2026-11-17): Point to checks the end contact first (already built: "Does not match" with delete). After an end fix, the Serve step flags the first contact ("Toss? shot 1 may be extra", loop the serve) before the next question, as in Opus's contact-delete plan. Flag only where needed.
- Low: resume after Check seeks exactly to the last contact; faint hint outline; a control chip can show two minuses; deleting the toss drops the serve tick without a prompt.

## From the v0.11.1 review (Opus, 2026-11-17), first three sent to build as v0.11.2 on 2026-11-17; chip marks held for the next fix round (Paul: Fc/Bc unclear)

- Medium: the "toss?" flag can't be acted on. The jump to Serve turns Check off, so chip 1 has no minus; turning Check on leaves the serve loop. Keep Check on (or show the minus on the flagged chip) during the serve loop.
- Low: the "Shot removed / Undo" toast covers the step tabs after the jump.
- Low: the new shot 1 keeps the stroke tag of the shot that moved into it, so a serve saves with a stroke.
- Low: chip marks mix styles (Fc and Bc next to F+ and B+). Replaced (Paul, 2026-11-17): Rally Row chips go back to shot numbers only, contact check kept; sent to v0.11.2. Next Rally Row addition is phase grouping, by colour or something else, once decided.

## Effort-budget tagging Opus build (worker bc-69472c03), sent as a plan on 2026-11-17, and to the proto v0.11 build on 2026-11-17

- Delete an extra contact in the logic, not just the UI: shot count, who hit each shot, serve order and score from outcome tags all recompute. Covers an accidental extra tap and a toss plus contact on the serve. The remove control is available wherever the extra tap happens, including after contacts are committed and on the end-of-rally winner screen. Mirror the proto Rally Row delete pattern (v0.11 Check toggle) and follow wherever it settles. (Paul, 2026-11-17)

## For the next proto update after v0.15.0 (Paul, 2026-11-18)

- Serve becomes a quadrant pad for where the serve lands: bottom half Short, top half Long, left BH side, right FH side. The landing corner is the serve placement, and it also gives the receiver's wing (BH or FH) for receive.
