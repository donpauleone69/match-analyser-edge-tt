# Best + FA as the main flow, v0.13.1

The plan, updated to match the build: v0.13.1 on PR #133 (branch `cursor/best-v012-parts-8c84`, commit `8d1307c`). Use it as the reference for the insights study. Canvas (phone demo, scenarios, board, insights): [Best + FA main flow plan](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/9027bc66-7334-4f4f-8288-502d23cb74e6). Build notes: `internal/best-flow-v013.md`. Sources: Paul's decisions in `decisions-log.md`, his answers on the plan canvas (2026-11-17 and 18), `phase-review-design.md`, `v3-opus-r4.md`, `v3-opus-r3.md`.

## Short answer
- Best + FA is the default and main flow. The picker keeps Best + FA, Shot by shot and Spine. Current, End first, Open end and plain Best went with their code.
- **No step row, no End switch, no Review page, no Save tap, no timer.** The Rally Row is the guide. Each question belongs to a cell, the cells show what is asked now, what is done and what is still to ask, and tapping a cell goes back to its question.
- **Order:** the last shot first (End, Point to with the contact check, the last stroke), then Serve, Receive, Third, shot 4 from 7 shots, then the other End shots in rally order. On 10 shots: 10, 1, 2, 3, 4, then 8 and 9.
- **Who attacked first?** is optional, from 8 shots, and covers the never asked shots 5 to n-3. It sits on the first End shot page. Nobody is always offered.
- **When the point does not add up:** one plain line says why ("Point to Kim, but shot 10, the winner, is yours."). The chosen Point to stays pressed. Delete last is the main fix, Delete first second, Check third. Add missed, Switch server and Keep as is sit under a small More.
- Stroke buttons are a 2x2 grid, BH left, FH right. The top row reads Attack, or Counter after an asked attack. The bottom row is Control.
- Review: a part button under each part of cells; one tap marks, one clears. ★ sits in the row header beside Check.
- The last answer is always required, so it saves the rally and plays the video on at 1x from the last contact. The saved row stays until the next contact, so marks and ★ still work and a cell tap reopens a question. Check is hidden on the saved row.
- Nothing scrolls at 393x660 on any question. No gestures anywhere: plain taps on visible buttons.
- Taps per rally: 3, 6, 8, 10, 12, 14, 16 at 1 to 7 shots, 17 at 8, 19 at 10. 9.5 a rally on the tour mix.

## 1. Questions and the Rally Row
One rally at a time: contacts are tapped live, the video pauses 2 s after the last one, then the questions run.

| Question | Order | Asked on | Cell |
|---|---|---|---|
| End | 1st | every rally | the last cell: End, Point to, check, then the last stroke |
| Serve | 2nd | 2+ shots | cell 1: server switch (not rally one), Short or Long |
| Receive | 3rd | 3+ shots | cell 2 (on 2 shots shot 2 is the last stroke, on End) |
| Third | 4th | 4+ shots | cell 3 (on 3 shots it is the last stroke, on End) |
| Shot 4 | 5th | 7+ shots | cell 4 (on 5 and 6 shots shot 4 is an End shot; on 4 it is the last stroke) |
| Who attacked first? | optional, on the first End shot page | 8+ shots, no attack on 2, 3 or 4 | cells 5 to n-3 |
| End shots | last | 5+ shots | n-2 and n-1 when not asked already (4 on 5 shots, 4 and 5 on 6), one page each, rally order |

- **Asked shots:** 2, 3, 4 from 7 shots, and the last 3. On 7 shots every shot is asked. From 8 shots, shots 5 to n-3 are never asked.
- **End first.** The last ball is freshest when the video pauses, and End plus Point to settles the winner, score, server and every hitter. The check runs here, so no shot is asked under the wrong hitter. Once the check agrees, the last stroke grid shows on the same page.
- **Then the rally from the start.** Serve, Receive, Third, shot 4 on 7+, then the other End shots in rally order. Each page loops its shot at 0.75x.
- **Cell marks.** Solid: the question open now. ✓: done. Dashed: still to ask. Faint: not asked, or Who attacked first? skipped. On the first End shot page with Who attacked first?, cells 5 to n-3 are solid too. After a skip they go faint. The marks stay while Check is on.
- **Going back.** Tapping a cell opens its question. Only the last cell works until the check agrees, and while it disagrees. Cells that cannot open keep their marks.
- **Moving on.** After an answer, the first question not done opens, in the order of the table. The last answer saves.
- **Saving.** The last question is always required: an End shot on 5+ shots, Third on 4, Receive on 3, Serve on 2, Point to on 1. So there is no timer and no Save tap. On a reopened rally a fix that completes the last answer saves too. Check off, Delete first instead and the server switch on Serve never save.
- **Tap guard.** Each time the question area changes (a new question or page, a mismatch or agreement, the last stroke grid, a contact added or deleted, More, the toss offer) it ignores taps for 450 ms, so a double tap cannot answer the next question.
- **Who attacked first?** Covers the never asked shots 5 to n-3. It sits above the stroke grid on the first End shot page, and that page loops from shot 5 to that shot.
  - Asked when there is an unasked shot (8+ shots) and none of shots 2, 3 and 4 is an attack (a blank counts as not).
  - Optional: answer it, or tap the stroke and move on (0 taps to skip). Tapping the chosen answer again clears it.
  - Answers: your name, their name, Nobody. All three are always offered.
  - Nobody means no attack in shots 5 to n-3. The first attack walk passes them and goes on into the End shots, so the first End shot tagged Attack becomes the first attack. Naming a player leaves the parts alone.
- **Stroke buttons** on every stroke question. The rule: anything can be controlled, a control can be attacked, an attack can be countered.
  - 2x2: "BH Attack | FH Attack" or "BH Counter | FH Counter" on top, "BH Control | FH Control" below.
  - Counter shows when the shot before is asked and tagged attack. Shot 2 always shows Attack. A shot after an unasked shot shows Attack. From 7 shots, shot 5 reads Counter after an attack on shot 4.
  - Data: Counter saves as `stroke: 'Attack'` and is read from the shot before. Retagging that shot relabels it.
  - Parts: a Counter is never the first attack, so `bestOpener` is unchanged.
  - The last stroke is asked before the shots before it, so it reads Attack until shot n-1 is tagged an attack, then Counter. The data is the same either way.
- **End buttons:** Winner, Net, Long, Wide. Winner saves as `ending: 'Winner'`. The winning hand is the last stroke's hand, asked on End for 2+ shots. Only an ace has no hand.

## 2. Review, star and save
**Review marking, 3 standard options** (A is built):
- **A. Part buttons.** The part name under each group of cells becomes a button, full group width, 28 px tall. Tap to mark, tap to clear. A marked part fills and reads "⚑ End".
  - One tap, always in view, and clearly not a cell (different shape, named).
  - Works on the saved row while the video plays.
  - Costs 12 px of row height.
  - A narrow button picks the longest label that fits: full at 10px, then 9px, then 8px, then Open, Att, Rally, End, then one letter. The ⚑ goes first, as the fill already shows the mark.
- **B. Review mode.** A Review button in the row header, like Check. While it is on, tapping a part marks it. This costs 2 more taps per rally, leaves a mode on by mistake, and competes with Check.
- **C. Review row.** A row of part toggles in the question area on every question. It repeats the part names and takes 65 px, so End no longer fits.

**Star:** a ★ toggle in the Rally Row header, left of Check.

**Save:** the last answer saves the rally, moves the score, and plays the video on at the watch speed (1x unless changed) from the last contact. A point that wins the set holds as today. The saved row stays, marked Saved, until the next rally's first contact. On it:
- part buttons and ★ work without stopping the video;
- Check is hidden;
- a cell tap reopens its question and pauses, and the next answer saves again and plays on.

There is no separate Undo: the saved row is the undo. While a saved rally is reopened it leaves the rally list, and it comes back when it saves again.

## 3. Contact check and the fixes
- **Point to hint:** from End, the server and the contact count. Winner means the last hitter won; Net, Long or Wide means the last hitter lost. Shown as a dashed brand edge on the resting button. Point to is disabled until End is set. No hint and no check on rally one.
- **Point to is stored** (`best.point`) and kept through every contact edit. End is kept too, except when Add missed puts a contact after the last shot: then End clears ("New last shot. End again.") and Point to waits for it.
- **Mismatch** (derived): Point to set, End set, not rally one, not kept, and Point to differs from the hint. The last stroke hides, the chosen Point to stays pressed with the dashed hint on the other name, and one plain line in amber says what does not add up:
  - Winner: "Point to Kim, but shot 10, the winner, is yours."
  - Error: "Point to Kim, but shot 9, the long error, is Kim's."
- **Fixes**, one row, in this order:

| Fix | Where | For |
|---|---|---|
| Delete last | main button (filled) | an extra tap at the end: a bounce, a catch, the last shot tapped twice |
| Delete first | second | the ball toss tapped as contact 1 |
| Check | third | an extra tap in the middle: half speed, a minus on every cell, the marks kept |
| More | small, end of the row | shows a second row: Add missed, Switch server, Keep as is |

  - On a 1 shot rally there is nothing to delete, so the row is Add missed, Switch server, Keep as is.
  - The video loops the last two contacts at 0.75x, so an extra end tap is easy to see.
  - Any one delete or add changes who hit last, so after one fix it agrees and the last stroke shows.
  - Keep as is saves the rally flagged "Check the point".
- **Toss offer:** after Delete last (or a minus on the last cell in Check) and before the serve is answered, Serve, which comes next anyway, shows "Shot 1 the toss?" with a small "Delete first instead". That puts the last contact back, moves the last stroke tag onto it, and deletes contact 1. It goes when the serve is answered.
- **Later changes:** any delete, add or server switch drops Keep and reruns the check. A disagreement reopens End.
- **Contact delete** recomputes shot count, hitters, serve order, winner, score, parts, End shots and Counter labels. Tags stay with their contacts. Contact 1 with a serve length takes the length ("Serve length left with that contact."). The Who attacked first? answer and review marks drop when they no longer apply.
- **Rally one:** Point to sets the draft server (`serverForWinner`). The set's first server flips at save as today.

## 4. Parts
Shot 1 is the serve. Asked shots: 2, 3, 4 from 7 shots, and n-2 to n. First attack o: the first asked shot tagged Attack, walking from shot 2. An unasked or unanswered shot first means not known, unless Who attacked first? is Nobody, which lets the walk pass the unasked shots.
- o known: Opening 1 to o-1. If n < o+5, Attack o to n. Otherwise Attack o to o+2, Rally o+3 to n-3, End n-2 to n.
- None: End max(2, n-2) to n, Opening before it.
- Not known: End max(2, n-2) to n, Opening 1 to 4 from 7 shots (1 to min(3, n-3) below), Rally between. From 8 shots this Rally part is exactly the unasked shots 5 to n-3.
- 1 shot: Opening. On 4 to 7 shots every shot is asked, so o is always known or none.

Examples: 8 shots, nothing tagged: Opening 1 to 4, Rally 5, End 6 to 8. 7 shots, all control: Opening 1 to 4, End 5 to 7. 10 shots, not known: Opening 1 to 4, Rally 5 to 7, End 8 to 10. 9 shots, Nobody, shot 8 an attack: Opening 1 to 7, Attack 8 to 9. 10 shots, Nobody, only the winner 10 an attack: Opening 1 to 9, Attack 10.

A Who attacked first? answer naming a player does not move the parts. Cell groups and part buttons come from one `bestParts` call.

## 5. Taps per rally
Counted: one tap per contact and one per required answer. The last answer saves (as Point to did in v0.12), so there is no Save tap, and no Next taps. Not counted: fixes, Check, server switch, cell taps back, review marks, ★, and the optional Who attacked first? (+1 when answered, 0 when skipped).

| Shots | v0.12 | v0.13.1 if End asked only the last | v0.13.1 built (End all 3) |
|---|---|---|---|
| 1 | 3 | 3 | 3 |
| 2 | 6 | 6 | 6 |
| 3 | 8 | 8 | 8 |
| 4 | 10 | 10 | 10 |
| 5 | 11 | 11 | 12 |
| 6 | 12 | 12 | 14 |
| 7 | 13 | 14 | 16 |
| 8 | 14 | 15 | 17 |
| 10 | 16 | 17 | 19 |

How they add up (`bestTaps`):
- **v0.12:** contacts, then Serve, Receive, Third as the rally has them, then the last stroke (4+), End, and Point to, which saved.
- **Built:** contacts, End, Point to, the last stroke (2+), Serve (2+), Receive (3+), Third (4+), shot 4 (7+), and the other End shots: 1 on 5 shots, 2 on 6+.
- **Last only:** the built count without the other End shots.

Tour mix of 80 rallies (10, 14, 21, 10, 9, 5, 3, 8 at 1, 2, 3, 4, 5, 6, 7 and 10 shots): 760 taps, 9.5 a rally. An extra end tap costs 1 fix tap (Delete last).

## 6. Insights from the data collected
Collected:
- **Per contact:** time and hitter.
- **Serve:** server, Short or Long.
- **Shots 2, 3, shot 4 from 7 shots, and the last 3:** BH or FH, and Attack, Counter or Control.
- **Per rally:** End, Point to (winner, score), parts, first attack (shot, or the player from Who attacked first?), review marks, star, Check the point.

The canvas Insights tab computes these from the board rallies:
- who attacked first and who won
- serve and receive points
- third ball attack
- receive attack
- counters
- how points end, by hand
- where you lose points
- last shot type
- rally length
- short or long serve
- the review list

Example numbers from the 12 demo rallies (You won 3, Kim 9):
- **You attacked first:** you won 1 of 4. **Kim first:** you won 1 of 7. **Nobody:** 1 of 1.
- **Your serve:** you won 3 of 7. **Kim's serve:** 0 of 5.
- **Kim's third ball:** won 3 of 3.
- **Kim's winners:** FH 6, BH 1. **Your errors:** BH 2.
- **Last shot attacks:** 7 winners, 1 error. **Counters:** 1 winner.

**One field worth asking about, not in v0.13.1:** forced or unforced error. It costs +1 tap on error rallies only (3 of 12 here), and needs its own question after End. No other new fields.

## 7. Checked against r3
**Holds:** last ball first while the frame is fresh. Serve second, then shots in order, each looped from its contact. The last three shots are asked, and shot 4 on long rallies. No "which shot was the first attack" question. Tapping the rally row to change an answer is back.

**Wrong or out of date:** the first server asked at setup; the point taken from the last ball alone; Net, Out, landed BH, Middle, FH.

## 8. Flows removed
Current, End first, Open end, Best. Kept: Best + FA (default, first in the picker), Shot by shot, Spine. Old flow values in the address fall back to Best + FA. Code that Shot by shot or rally edit still uses stays. The flow picker shows the open rally's flow and is off until that rally saves.

## 9. Design taken from Shot by shot
- **Buttons:** `Answer`, `Name`, `Cells` and `AnswerRow` moved from `ShotPanel.tsx` to `AnswerCells.tsx`, with `StrokeGrid`, used by `ShotPanel.tsx`, `BestPanel.tsx` and `IdeaPanel.tsx`.
- **Rally Row:** `railCell` and `shotPaint` from `ShotRail.tsx`: player tint cells at control height, solid open cell, `border-2` first attack line, one grid, equal widths, 8px between parts. The caption line becomes the part buttons.
- **Labels:** "End · shot 10 · Kim", "Point to", "Serve · You", "Receive · Kim", "Third · You", "Shot 4 · Kim", "Shot 8 · Kim", "Who attacked first?".
- **Header:** below 480 px wide the match name under "Set 1" is hidden, so the set, the picker and the buttons fit.
- **Kept from Best + FA:** parts, Check minus, Check amber. Spine and Shot by shot keep `ShotRail` as is.

## 10. Fit at 393x660 (touch)
Measured in v0.12: header 40, picture 221, strip 28, so 289 above and 371 below. Worked out from measured rows: a one line row is 47 to 55 (label, control 32 to 40), a 2x2 grid 101, a plain line 16, a small row 26, a gap 10.
- **Rally Row:** at most 108 (header 30, cells 40, part buttons 28, gaps), Check on or off.
- **Room for questions:** 263.
- **End with the last stroke:** about 231, the tallest.
- **End not adding up, More open:** about 208.
- **End not adding up:** about 172.
- **First End shot with Who attacked first?:** about 166.
- **Serve with Shot 1 the toss?:** about 140.
- **Shot 4, an End shot, Receive or Third:** about 101.
- **Fix row width:** Delete last, Delete first, Check, More fit one line at 393.

The build's walk measured every state of R1 to R26 at 393x660 and 1440x912: nothing scrolls.

## 11. Build spec (as built)
Built in `proto/` on `cursor/best-v012-parts-8c84`, one commit per slice, then the v0.13.1 fix round (`8d1307c`).

### Slice 1. Remove flows
- `tagLog.ts`: `FlowName = 'bestfa' | 'sequential' | 'spine'`, `FLOW_LABEL` in that order, `flowFromParam` falls back to `'bestfa'`. `isWalkFlow` is `sequential` only, `isIdeaFlow` `spine` only, `isBestFlow` `bestfa` only.
- `TagSetScreen.tsx`: End first, Open end, the Current only live path and the `'best'` fallbacks went.
- `sequence.ts`, `ideaFlow.ts`, `IdeaPanel.tsx`, `bestFlow.ts`, `rally.ts`: the removed flows' parts went.
- `HomePage.tsx`, `MatchTagChecklist.tsx`: no `?flow=` append.

### Slice 2. Rename and data shape
- `bestFlow.ts`: `BEST_ENDS = ['Winner', 'Net', 'Long', 'Wide']`; `bestEndOf` reads an old BH or FH `best.end` as Winner. Strokes stay `'Attack' | 'Control'`.
- `rally.ts` `BestMark`: `flow: 'bestfa'`, `step?`, `endPage?`, `end?`, `point?`, `kept?`, `first?: 'me' | 'them' | 'none'`, `review?`, `cut?`, `star`. `middle` went.
- `BEST_STEPS = ['end','serve','receive','third','fourth','shots']`. `BEST_FOURTH_FROM = 7`. One `carryBest(d, patch)`.

### Slice 3. Question logic, pure, `bestFlow.ts`
- `bestAsked(n, k)`: k ≤ 3, k ≥ n-2, or k = 4 when n ≥ 7. `unaskedShots(n)`. `bestOpener` walks with it and passes unasked shots when `first === 'none'`.
- `endShots(n)`: max(5 from 7 shots, else 4; n-2) to n-1. `nextEndShot`. `endDone`: End and Point to set, no mismatch, and the last stroke set when n ≥ 2.
- `counterAt` and `strokeRole`: Counter for an attack after an asked attack.
- `stepsFor`: end; serve 2+; receive 3+; third 4+; fourth 7+; shots when `endShots` is not empty. `asksWhoFirst`: an unasked shot exists and shots 2, 3 and 4 are not Attack. `rallyPage`: the first End shot.
- `cellTarget`, `cellMark`, `canOpenCell`, `bestHint`, `bestMismatch`, `mismatchLine`, `routeAfter` (save when null), `bestTaps`.
- `bestLoop`: End the last shot, or the last two contacts while mismatched; a stroke question its shot; the Who page from the first unasked shot to it.
- `keepBestMarks`, `bestRally`, `faLine`, `reviewLine`.
- **Checks:** `npm run check:best-steps` (164 checks, 16,401 cases for 1 to 13 shots) and `npm run check:best-parts`.

### Slice 4. Shot by shot look
- `AnswerCells.tsx` with `StrokeGrid`. End: Winner tone chosen; Net, Long, Wide tone error.
- Rally Row: header (Rally N, Saved, ★, Check until saved), cells with marks and `aria-disabled` when they cannot open, part buttons with fitted labels, the Check minus.

### Slice 5. New flow on screen
- End, Point to (disabled until End), then the mismatch line and fix row, or the last stroke grid. Serve with the toss offer. Receive, Third, Shot 4. End shot pages, the first with Who attacked first?.
- Save calls `saveBest`, plays on at the watch speed from the last contact, and keeps the saved row.
- `RallyList.tsx`: "FA 8", or "FA You", "FA Kim" or "FA Nobody", plus "Review Rally, End" and "Check the point".

### Slice 6. Fit, version, PR
- `proto/src/version.ts` reads v0.13.1. `tsc -b` clean, `npm run build` passes.

### v0.13.1 fix round
- 450 ms tap guard on every change of the question area.
- Play on at the watch speed, not 0.75x.
- Nobody always offered.
- Point to pressed during a mismatch, the hint a dashed brand edge.
- Fitted part labels. Flow picker off on an open rally. Header fit at 393.

## 12. Test cycle
1. **Builder self test** after each slice, at 393x660 (touch) and 1440x912 (mouse).
2. **Independent review** by another model family, in a real browser on the dev server with the demo clock.
3. **One fix round** (v0.13.1).
4. **Re-check:** R1 to R26 and R9b pass at both sizes, plus real speed double tap checks (`best-v0131-taps.mjs`).

**Scripted cases** (rally 2+ unless named; You serve unless named):
- R1 Ace, 1 shot: End only. Point to saves and plays on at 1x. Parts Opening 1.
- R2 Service fault Net, 1 shot: the hint lights the receiver.
- R3 2 shots, receive error: End asks shot 2 after Point to, then Serve, which saves.
- R4 3 shots, third ball winner: End asks shot 3, then Serve, Receive, which saves. FA 3.
- R5 4 shots, 2 and 3 control, shot 4 attack into the net: shot 4 on End, then Serve, Receive, Third, which saves. No Who attacked first?. Opening 1 to 3, Attack 4.
- R6 5 shots, 2 and 3 control: End with shot 5, Serve, Receive, Third, then shot 4, which saves.
- R7 6 shots, shot 2 attack: 6, then 1, 2, 3, then 4 and 5. Third reads Counter. Opening 1, Attack 2 to 6.
- R8 8 shots, shot 2 attack: 8, then 1, 2, 3, 4, then 6 and 7. No Who attacked first?. Opening 1, Attack 2 to 4, Rally 5, End 6 to 8.
- R9 10 shots, 2, 3 and 4 control (Paul's test): 10, then 1, 2, 3, 4, then the shot 8 page with Who attacked first? (loops 5 to 8, You, Kim and Nobody all offered), then 9, which saves. With 8 an attack 9 reads Counter; with 9 an attack 10 relabels to Counter. Check on: one line row, every minus works.
- R9b Winner tagged Attack, Nobody: 10 shots, 2 to 4 and 8 and 9 control, 10 an attack, Nobody: FA 10, Opening 1 to 9, Attack 10. With a named player instead: Opening 1 to 4, Rally 5 to 7, End 8 to 10.
- R10 Counter relabel: shot 3 Counter after shot 2 Attack, then change shot 2 to Control through cell 2. Shot 3 reads Attack and is the first attack.
- R11 Cell marks: on R9 after End, cell 10 ✓, cell 1 solid, cells 2, 3, 4, 8, 9 dashed, cells 5 to 7 dashed. Tapping cell 5 before the check agrees does nothing.
- R12 Who skip and Nobody: on R9 tap the shot 8 stroke without answering; cells 5, 6 and 7 go faint and the flow goes to 9. Then a 9 shot rally, Nobody, shot 8 attack: FA 8, Opening 1 to 7, Attack 8 to 9.
- R13 Saved row: mark Rally and ★ while the video plays at 1x; both are on the saved rally; Check is hidden. Tap cell 2: the rally reopens, paused, on Receive; the answer saves and plays on.
- R14 The row is replaced by the next rally's first contact.
- R15 Extra end tap (6 contacts, 5 shots, Winner, Point to You): the line reads "Point to You, but shot 6, the winner, is Kim's." You stays pressed, Kim shows the dashed hint. Delete last is filled and first. One tap: 5 shots, it agrees, End and Point to kept, the last stroke grid shows. More open: Add missed, Switch server, Keep as is in a second row, no scroll.
- R16 Toss tapped (Kim serves): Delete first: 5 shots, it agrees. Again with Delete last: Serve shows "Shot 1 the toss?"; Delete first instead puts the last contact back with its stroke tag and deletes contact 1. Answering the serve hides the offer.
- R17 Double tap in the middle: Check (marks kept), minus on the double; agrees; tags stay; parts, End shots and Counter labels redraw.
- R18 Missed contact: More, Add missed, tap; agrees. A missed contact after the last shot: "New last shot. End again."
- R19 Keep as is: saved with "Check the point".
- R20 Switch server under More: every hitter flips, it agrees.
- R21 1 shot mismatch (ace, Point to the receiver): the line shows and the row is Add missed, Switch server, Keep as is.
- R22 Rally one: no hint, no line, Point to sets the server, no server switch on Serve, the first server flips at save.
- R23 Server switch on Serve after End is done: End reopens with the line and fix row.
- R24 Error line: Long error, last shot by the player given the point: "Point to Kim, but shot 9, the long error, is Kim's."
- R25 Shot by shot and Spine: 2 rallies each, same button look, no page errors.
- R26 Copy: no Middle, no forward arrows, no long dashes, no gestures, no "Does not match". 1440x912: R9 and R15 again.
- Taps at real speed: a double tap on Receive does not tag Third; a double tap on Delete last does not tag the new last stroke.

## 13. Decisions
**Built with the recommended choice** (Paul can still change these):
1. End asks all 3 End shots, not only the last. Last only would make the optional Who attacked first? the last question on long rallies, which brings back a timed save or makes it required (+1 tap). Cost in section 5.
2. Review marking: part buttons under the cells (A), not B or C from section 2.
3. Who attacked first? on the first End shot page (0 taps to skip), not its own page with a Skip (+1 tap when skipped).
4. Switch server under More, kept. The server follows the score, so it is only wrong when an earlier rally is.
5. The last stroke on End with the point, so the last cell is one question. Its label reads Attack until shot n-1 is tagged, then may change to Counter. The data is unchanged.

**Closed (Paul):**
- Order: the last shot with End, then Serve, Receive, Third, shot 4 from 7 shots, then the other End shots in rally order. No timer: the last answer is always required.
- Shot 4 asked from 7 shots. Who attacked first? from 8 shots, covering 5 to n-3.
- Mismatch: a plain line saying what does not add up. Delete last first, Delete first second, Check third, the rest under More.
- No step row, no End switch, no Review page, no Save tap. The Rally Row shows progress and goes back.
- No gestures: plain taps on visible buttons.
- No new fields. Insights come from what is collected; forced or unforced is the one field noted for later.
- Who attacked first? is the optional Rally question. The old Rally question is dropped.
- Stroke buttons: 2x2, Attack or Counter on top, Control below, BH left, FH right. Counter saves as an attack.
- End buttons: Winner, Net, Long, Wide.
- End buttons lose their resting tints.

**Build decisions (v0.13.1, builder; review fix round):**
- Nobody is always offered on Who attacked first?. It means no attack in the unasked shots 5 to n-3, as section 4 says, so an End shot already tagged an attack doesn't contradict it. The walk then goes on into the End shots, and the first End shot tagged Attack becomes the first attack. Example: 10 shots, 2 to 4 control, 8 and 9 control, the winner 10 an attack, Nobody: FA 10, Opening 1 to 9, Attack 10. Naming a player still leaves the parts alone. This replaces "Nobody is hidden when an End shot is already tagged an attack" in section 1, "(it hides Nobody)" in the Counter line, and "Nobody hidden once an End shot is an attack" in R9. Hiding it left a winner whose last shot is Attack with no answer that could move the parts. Details: `internal/best-flow-v013.md`.
- Folded into sections 1, 4 and 12 above (R9 and R9b).
