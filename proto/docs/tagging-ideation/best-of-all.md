# Best of all tagging flow

Sources: Paul's notes in `review-notes.md` (Tagging test flows v0.6), `preferences.md`, and `comparison.md`, `opening-ending-fresh.md`, `spine-fresh.md`, `proto-effort.md`. Proto checked at `36c80a9` on `cursor/mvp-proto-shell-d372`.

## Paul's decisions (2026-11-17, override the sections below)

### v0.11

- **Check is a toggle.** On plays the rally at 0.5x and every Rally Row chip deletes that contact (a small minus, no confirm, Undo for a few seconds). Off, the row is display only. The same toggle is there while the rally is still being tapped, after the contacts are committed, and on Point to.
- **Delete changes the rally.** Removing a contact drops that time from the rally. Shot count, who hits each later shot, the server on rally 1, the hinted winner and the score that winner would make are all worked out again. It covers an extra tap and a toss tapped as well as the serve.
- **Shot loops play at 0.75x.** The 300 ms reaction is video time at any speed. Lead, end offset and minimum are playback time, so they scale with speed. At 0.75x, 200 ms of playback is 150 ms of video.
- **End row.** Winners first (BH, FH), then errors (Net, Long, Wide). Winner buttons are green. Error buttons are red.
- **Point to hints.** The worked out name is outlined. It is not selected. A tap still saves. From rally 2, the other name opens the mismatch. Rally 1 saves either name, because that rally's server is counted back from the winner.
- **Server pill.** On the Serve step it sits above Short and Long. Rally 1 still has no pill.
- **Best and Best + FA** stay the same apart from first attack: the ring and FA mark, the "Who attacked first?" question, and the saved first attack.

### v0.11.1

- **Rally 1 does not hint.** Choosing an end does not mark a guessed server as checked, and Point to stays blank until it is tapped. Either name still saves, and the server is counted back from that tap.
- **The score overlay stays on saved points.** A hinted point does not move the score before Point to.
- **Check says delete mode.** While Check is on during the live rally, the pad reads "Delete mode" and "Tap a minus to remove a contact", and a tap there does nothing.
- **One delete control.** The chip minus is the only delete. The mismatch no longer has a Delete button or a row of shot numbers. Check still turns the minuses on.
- **After an end fix, check the serve.** Removing one of the last two contacts (not the serve) on a closed rally opens the Serve step, loops that serve, and flags shot 1 "toss?" with "Toss? shot 1 may be extra". A middle contact does not. The steps stay open so the next question is one tap away.
- **Serve length.** If that answer was on the contact just removed, the Serve step asks for it again. With only one contact left, the same line shows on Finish.
- **Resume.** Leaving Check during a live rally starts a reaction earlier than the last contact, unless the playhead is already past that.
- **Hint.** The outlined name uses a stronger tint and a 2px ring. It is still not selected.
- **Chips.** Control reads Fc and Bc, so the red delete badge is the only minus.
- **Both Best flows.** None of this is first-attack-only.

### v0.11.2

- **The toss flag deletes.** During the serve loop, shot 1 shows its minus. The serve loop keeps playing at 0.75x. The other chips stay display only until Check is on.
- **The undo toast sits at the bottom** after that jump, so the step tabs stay visible and tappable.
- **A new serve drops the stroke** of the shot that moved into it. A serve does not save with a wing or a stroke.
- **Chips show the shot number.** No stroke or serve-length marks on the chip. The toss? flag, the minus, and the first-attack ring stay. The saved shot is unchanged.

- **One rally at a time, not chunks of 6.** Tap the rally's contacts, idle close pauses, detail that rally, then play on to the next. Choices 1, 3 and 8 are settled by this: no chunk pause, Point to rally by rally, fixes in that rally's details.
- **Step buttons (Serve, Receive, Third, Finish) are the navigation and sequence checkpoints**, inspired by Spine.
- **The Rally Row is a visual representation**, so it can show more. It stays display only until Check is on (v0.11).
- **Fewer choices, worded like the narrative voice** ("FH attack, net, point to Kim"). Serve is Short or Long. A shot is FH attack, BH attack, FH control or BH control. The end is BH, FH, Net, Long or Wide (v0.11).
- "Narrative" means button labels in the observer's head voice (FH attack, not Offensive), still buttons, never sentences.
- Highlight: test both places (star beside Point to and in the Rally Row); keep one later.
- Two data variants to compare by trying them: **Best** captures no first attack; **Best + FA** takes the first attack button as the first attack. If the only attack is the last shot of a rally of 5 or more, ask "Who attacked first?" (you, the opponent, Nobody). FA must not break the flow or be mandated.
- **Contact edits** stay in the Point to mismatch: delete any contact or add one. Check, while it is on, also deletes from the Rally Row (v0.11).
- **Videos** live on the Tag tab for every flow, not on Details. Archive, reorder, remove and undo stay, in a compact card.
- **Reaction buffer.** Every tapped contact is stored as the tap time minus 300 ms, on every shot.
- **Shot loop.** It plays at 0.75x. Lead, end offset and minimum are playback time and scale with that speed. At 0.75x the loop starts 150 ms of video before the stored contact and ends 150 ms of video before the next, or 750 ms of video after the start, whichever is later. The last shot uses the rally end in place of the next contact. No hold. The Rally label still loops the whole rally. Pause and Play keep the loop that is playing.
- **Timing controls.** Reaction 300, lead 200, end offset 200 and minimum 1000, in ms, sit on the video. They persist on this device so they can be tuned on a real video.

## 1. Global rules

| # | Rule | Notes |
|---|---|---|
| R1 | Tag in bite size chunks. Progress and the pick up point are always visible. | G1, G2, G15 |
| R2 | The live pass is contacts only. Nothing else to press while the rally plays. Details come after, rally by rally. | O1, S1, G7 |
| R3 | The end is one thing, said in the order you think it: last shot stroke, end reason, point to. | G12, G7, O2, C1, E1 |
| R4 | Point to is worked out and lit. Tapping it saves the rally and is the audit. If you tap the other name, offer the two likely fixes: an extra contact, or the wrong server. | G7, C1, G14 |
| R5 | No global server toggle. Rally 1 of a set counts back from its end. Later rallies take the server from the score. The switch lives on the Serve step. | G14, C1, G7 |
| R6 | A stroke is one tap: two rows, BH and FH, each Touch, Push, Flick, Loop. No Offensive and Defensive toggle, no intent. | G11, E1 |
| R7 | Each rally walks fixed steps Serve, Receive, Third, Finish. They move on by themselves and show where you are. | S1, S2 |
| R8 | The shot row is the Rally Row, labelled "Rally". It is information only, plus contact editing. | G8, S2, G13 |
| R9 | Contacts can be deleted or added in the Rally Row on any rally, and a Check contacts button replays the rally to check them. | G3, G4, G13, C2 |
| R10 | The video loops the shot being tagged. Play, pause, resume and loop follow one written rule set. | G10, E1 |
| R11 | Finish set plays the video on a few seconds to confirm the set end. | G5 |
| R12 | Highlight sits in one natural place. | G6 |
| R13 | The Videos section lives in Tag, not Details. | G9 |

## 2. Per flow: keep and drop

**Current.** Keep: pad, Space, idle close, who won and result building the score, server counted back from the end (C1), Delete last, Add contact and nudge logic, continuity marks. Drop: the first attack pick over a whole rally loop, the 6 result buttons, Offensive and Defensive, server text and Switch on the pad, the 3 s wait on every rally.

**Shot by shot.** Keep: the shot loop window and its 0.3 s hold, answers moving on by themselves. Drop: tagging until the attack (a moving slot), Next on optional rows, depth, intent and initiative, the 12 button reply screen.

**End first.** Keep: the end in thinking order (G12), the 1 s hold, but only on the Finish loop so you see where the last ball went. Drop: the walk from the serve, the hold on every stop.

**Open end.** Keep: the live pass apart from details (O1), the opening and ending window (shots 2, 3 and last), "Who attacked first?" on long rallies, the "Point to" label, the point agrees check. Drop: one detail pass over the whole set (G2), point to in the live pass (moves to Finish, G7), the landed zone (later).

**Spine.** Keep: Serve, Receive, Third, Finish as an in rally stepper (S1), fixed slots 1, 2, 3 and last, the 4 token end row. Drop: sweeps across the whole set, the result token in the live pass, the 7 stroke row, Half-long.

## 3. Open choices

1. **Pause point (G2).** (a) towel break every 6 points (b) set end only (c) whenever the user pauses (d) a, with c always on. **Rec: d.** Six rallies is the chunk; the Pause button works any time.
2. **Highlight placement (G6).** (a) at point end (b) in the Rally Row (c) both. **Rec: a.** A star beside Point to, the moment you judge the point. The rally list shows the star and can toggle it later.
3. **Point to placement (G7).** (a) in the live pass (b) rally by rally. **Rec: b.** It keeps the live pass pure, sits after the end reason (G12) and is the save.
4. **Stroke row (G11).** (a) Touch, Push, Flick, Loop (b) those plus Block (c) Block only after an attack. **Rec: b.** Blocks are common after an attack; a fixed fifth cell keeps every cell in one place and fits an iPhone row.
5. **End reason row.** (a) Winner, Net, Long, Wide (b) Net, Off table, Landed, then zone (c) Current's six. **Rec: a.** Four facts, one row.
6. **Serve row.** (a) Short, Long (b) Short, Half-long, Long. **Rec: a.** Each has a fact rule (over the table, behind the end line); Half-long is a judgement.
7. **Middle of long rallies.** (a) untagged (b) "Who attacked first?" when shots 2 and 3 were not Flick or Loop and the rally has 6+ shots (c) every shot. **Rec: b.** About 5 taps a match.
8. **Fixes during the live pass.** (a) none, every fix in details where the rally loops (b) an Undo last rally button. **Rec: a.** The game is too fast for buttons; the point to check catches most tap slips.

## 4. The proposed flow

**One chunk of 6 rallies.**
1. Live. The video plays at 0.75x from where you left off. Tap the pad (or Space) on every contact. 2 s with no tap closes the rally and the video plays on into the next one. Chunk dots fill: "Point 3 of 6".
2. Pause. After the 6th rally closes the video pauses and details open on rally 1 of the chunk.
3. Serve step. "Serve, Paul" with the name as a small switch, then Short or Long. Rally 1 of a set shows "Serve" only; the name fills in after Point to. Skipped on a 1 shot rally.
4. Receive step (2+ shots), Third step (3+ shots). One tap on the BH or FH row.
5. Who attacked first, only per choice 7.
6. Finish step, in thinking order: last shot stroke (4+ shots only; shorter rallies already have it), end reason, Point to with the worked out name lit, star beside it. Tapping Point to saves and the next rally opens.
7. Mismatch. Tapping the unlit name shows one line, "Does not match", with Check contacts, Delete a contact, Add contact, Switch server, Keep. Keep saves it and marks the rally.
8. After rally 6 of the chunk the video sits at the end of that rally, paused. "Play next 6" starts the next live chunk.

**A set.** Chunks repeat. When a Point to makes the set won, the video plays 6 s past that rally, then "Set over at 11-8" with Finish set or Not yet. Live rallies after the set end in that chunk carry to the next set (or, for the proto, are dropped with a toast and the live pass resumes there). The set checklist shows where to pick up: "Rally 19, live" or "Rally 15, details".

**Editing contacts.** Tap a Rally Row chip: Delete shot, Add contact before (tap the pad while the loop plays), nudge. Check contacts plays the rally at 0.5x and flashes each chip on its contact. Steps re-derive after any change; answers stay with their shots.

**Video rules.**
- Live: play at 0.75x, never loop, pause only at the idle close, the set end or the Pause button.
- While a shot is being tagged, loop that shot. Start 200 ms before its stored contact. End 200 ms before the next stored contact, or 1 s after the start, whichever is later. The last shot uses the rally end in place of the next contact. No hold.
- A tapped contact is stored as the tap time minus 300 ms. Reaction, lead, end offset and minimum are editable on the video and remembered on this device.
- Serve, Receive and Third tag shots 1, 2 and 3. Finish tags the last shot. There is no separate Finish window.
- Tap "Rally": loop the whole rally until a step is chosen.
- Pause stops any loop; Play restarts the same loop.
- Finish set: play on 6 s, then hold.

**Effort, 80 rallies** (proto-effort method and mix; Then is every tap after the contacts, Point to included).

| Ends on | Rallies | Contacts | Then | Taps |
|---|---:|---:|---:|---:|
| 1 | 10 | 1 | 2 | 3 |
| 2 | 14 | 2 | 4 | 6 |
| 3 | 21 | 3 | 5 | 8 |
| 4 to 7 | 27 | 4 to 7 | 6 | 10 to 13 |
| 10 | 8 | 10 | 6 | 16 |
| Rallies | 80 | 317 | 391 | 708 |
| Plus | | | 25 | 25 |
| Match | | 317 | 416 | 733 |

Plus is about 5 "Who attacked first?", 16 "Play next 6" and 4 Finish set. Time: contacts 5.3 min (about 7 at 0.75x), 416 taps at 1 to 1.5 s is 6.9 to 10.4 min, one 3 s wait per chunk instead of per rally is 0.8 min, set play on 0.4 min. **About 14 to 19 minutes and 733 taps**, against Current at 18 to 22 min and 823 taps, and the walks at 22 to 28 min and 1079. Not counted, as in proto-effort: video between points, fixes, Check contacts, highlights. It also adds serve length, receive and third ball strokes on every rally, which Current lacks.

## 5. Build steps (`?flow=best`)

Rules for the builder: branch from `cursor/mvp-proto-shell-d372`, work in `proto/` only, never touch `app/`. The other five flows must behave exactly as now. One small push per step, checked by eye at 393 x 660 and 1440 x 912. Stop and report if a step needs a change in another flow's code path. Thin copy, no arrows, no long dashes.

1. **Flow name.** In `tagLog.ts` add `best` to `FlowName`, `flowFromParam` and `FLOW_LABEL` ("Best"), plus `isBestFlow`. Add it to the header flow picker.
2. **Rules file.** New pure `features/tagging/bestFlow.ts`: `BEST_SHOTS` (FH attack, BH attack, FH control, BH control), `BEST_SERVE` (Short, Long), `BEST_ENDS` (Winner, Net, Long, Wide); `stepsFor(n)` (Serve unless n is 1, Receive from 2, Third from 3, Finish); last stroke only from 4 shots; `impliedWinner` via `winnerOf`; rally 1 server via `serverForWinner`. In Best + FA, `firstAttack` is the first attack button. `asksWhoFirst` only when that attack is the last shot of a rally of 5 or more. Store into existing `RallyData`: `shots[i].wing` and `stroke`, `shots[0].depth`, `ending`, `winner`, `server`, `highlight`, `fa`. Add `best` and `bestfa` to `IdeaTag.flow` for `first`.
3. **Live pass.** Pad only, no server text or Switch on the pad. Idle close saves a contacts only rally and playback continues. Chunk dots and "Point 3 of 6" in the status line. After the 6th close: pause, seek to chunk rally 1, open details.
4. **Stepper and rows.** New `BestPanel.tsx`: stepper Serve, Receive, Third, Finish above the answer rows (current step marked, done ticked, tap to go back), auto advance on each answer. One Shot row: FH attack, BH attack, FH control, BH control. One tap stores wing and stroke.
5. **Finish and Point to.** End row, then Point to with the worked out name lit and a star cell. Tap saves, opens the next rally. Unlit tap shows the mismatch line with Check, Delete, Add, Switch, Keep. Delete opens a shot number for any contact. Add takes one more contact and stays on that line. The Rally Row is display only. Keep sets the existing check mark.
6. **Video rules.** A Best tap is stored as the tap time minus the reaction (300 ms). The shot loop starts the lead (200 ms) before that contact and ends the end offset (200 ms) before the next contact, or the minimum (1000 ms) after the start, whichever is later. The last shot uses the rally end in place of the next contact. No hold. "Rally" label loops the rally. Pause and Play keep that loop. The four values are editable on the video and stored on this device.
7. **Edit contacts.** Done from the Point to mismatch (step 5), not from the Rally Row. Delete any contact, or add one. Check plays the contacts. Re-derive steps after each change.
8. **Progress and resume.** Set checklist line "Rally 19, live" or "Rally 15, details". Reload resumes the same place.
9. **Finish set.** When Point to makes the set won: play on 6 s, then "Set over at 11-8" with Finish set and Not yet. Rallies after the end in that chunk: drop with a toast, resume live there.
10. **Version and check.** Bump `version.ts` to v0.7. Smoke about six rallies crossing a set change and a finish, including one mismatch and one added contact. Open each of the other five flows once to confirm no change.
11. **Videos into Tag (G9).** The Videos card is on the Tag tab, not Details. Archive, reorder, remove and undo stay.
