# Sequential tagging: logic for the A/B test

For Paul. No code here. Based on `cursor/mvp-proto-shell-d372` at `84a8bc5` (the third tagging pass as built), `rally.ts`, `shotKeys.ts` and the approved screen brief. Proto only.

## In short

- Contacts are tapped exactly as now. When the 2 second pause ends the taps, the rally plays back in loops of three shots and you answer each shot in order, serve first, End last.
- On each shot before the first attack the one question is Offensive or Defensive. Defensive is lit by default (your rule: every shot before the first attack is Defensive). The first shot you mark Offensive becomes the first attack. Replies and later shots follow from it, as now.
- Nothing new is stored. Offensive on a shot sets the first attack. Defensive on every shot through to the last one sets No attack. Save needs exactly what it needs today.
- It is a second mode on the same screen, turned on by the page address. Both modes use the same data, so a rally tagged in one opens fine in the other.
- A side log times every rally in both modes, so we can compare them on real rallies.

## 1. What stays the same

| Part | Same as now |
|---|---|
| Tapping | Touch zone or tap button, 0.75x speed, Delete last, the 2 second pause, the late second |
| Stored rally | Server, contacts, result, first attack shot, shot tags, winner. No new field |
| Save gate | Save lights only when the rules say the rally is ready (`canSave`): result, last shot stroke and wing, first attack decided, first attack stroke and wing |
| Questions per role | From `fieldsFor`: Serve Depth with High, Heavy, Review. Receive and other shots before the attack: marks only. First attack: Stroke, Wing, Intent. Reply: Stroke, Wing, Initiative. Later: Review only. Last shot adds Stroke and Wing. End: Result, then Miss reason on an error |
| Offensive and Defensive after the first attack | Starts on the side of the shot before (`switchOf`). Flipping clears the stroke, except Block |
| Discard, Undo, Edit, the foot, the server toggle | As built, with the changes in sections 7 and 10 |

Only the order of asking changes.

## 2. The walk (stage machine)

The rally's own stage (`stageOf`) still decides Save. The walk is a screen layer on top that only chooses which shot is open next.

| State | What shows | What moves it on |
|---|---|---|
| Between points | Tap button or touch zone, server toggle | First tap: Tapping |
| Tapping | Shot row fills as you tap | 2 second pause, or end of video: Walk at the serve |
| Walk, on a shot | That shot open on the band, its block of three looping | Last section answered (goes on by itself), or Next, or Defensive on a shot before the attack |
| Walk, on End | End open: Result, then Miss reason on an error | Winner or Lucky: Ready. An error: Miss reason shows, a reason or Save finishes |
| Going back | A shot already passed, open again | Answered: back to where you were (section 5) |
| Ready | Words line "6 shots · First attack shot 3", whole rally loops, Save lit | Save: Between points. A press on a shot or End reopens it |
| Discarded | "Taps cleared" with Undo for 6 s | Undo: back to the same shot in the walk with every answer |

Which shots the walk stops on, in shot order:

| Shot | Stop? |
|---|---|
| Serve | Always |
| Any shot while no first attack has been marked | Yes: it is asked Offensive or Defensive |
| The first attack | Yes |
| The two replies after it | Yes (see question 1) |
| Later shots | No: they play in the loop but are passed by |
| The last shot | Always |
| End | Always, after the last shot |

What moves on: the walk goes to the next stop when every section on the open shot has an answer (marks do not count, they are optional and pressed before the last answer). Next goes on without the optional sections. Next is dark while something Save needs is missing on that shot (first attack or last shot stroke and wing, End result). After each move the band ignores presses for 600 ms, the same guard as the result swap today, so a double tap cannot land on the next shot.

## 3. What each shot asks, in order

| Stop | Offensive or Defensive | Then | Required for Save |
|---|---|---|---|
| Serve | Not asked | Depth (Short, Half, Deep); marks High, Heavy, Review | Nothing |
| Shot before the attack, not last | Defensive lit. Defensive goes on. Offensive makes it the first attack | Marks High, Heavy, Review. No stroke cells (not stored before the attack today) | The choice |
| First attack | Offensive (just pressed) | Stroke from Flick, Loop, Drive, Smash; Wing; Intent (Safe, Neutral, Aggressive); Review | Stroke, Wing |
| Reply 1 and 2 | Side of the shot before, can flip | Stroke, Wing, Initiative (Behind, Level, Ahead); Review | Nothing, unless it is the last shot |
| Last shot, no attack yet | Defensive lit. Offensive makes it the first attack. Defensive means No attack | First attack: as the first attack row. No attack: Stroke from Block, Lob, Push, Chop; Wing; marks High, Heavy, Review | The choice, Stroke, Wing |
| Last shot, attack already found | Side of the shot before, can flip | Stroke, Wing, plus Initiative if it is a reply; Review | Stroke, Wing |
| End | | Result (Winner, Lucky, Net, Long, Wide, Air); Miss reason on an error | Result |

The heading carries the shot's real role tag, as built (Serve, Receive, Before attack, First attack, Reply, Ball). It changes the moment Offensive is pressed, and the shot row gets the first attack outline at once.

## 4. How the first attack falls out

The first shot marked Offensive is the first attack. A Defensive press on a shot before it is not stored: the first attack being later says it. If every shot to the last one is Defensive, the rally is No attack. The serve is never asked and can never be the first attack.

| Rally | Walk | Stored |
|---|---|---|
| Ace (1 shot, Winner) | Serve, End Winner | First attack none. Winner the server |
| Serve error (1 shot, Net) | Serve (Next past Depth, see question 2), End Net, Miss reason optional | First attack none. Winner the receiver |
| 2 shots, receive is an attack | Serve, shot 2 Offensive, Flick, FH, Intent or Next, End | First attack 2 |
| 2 shots, receive pushed long | Serve, shot 2 Defensive, Push, BH, End Long | No attack |
| 6 shots, attack on 3 | Serve, 2 Defensive, 3 Offensive with its rows, 4 and 5 replies, 6 last, End | First attack 3 |
| 6 shots, no attack | Serve, 2 to 5 Defensive, 6 Defensive with stroke and wing, End | No attack |
| Attack on the last shot, missed | Serve, 2 Defensive, 3 Offensive, Loop, FH, End Net | First attack 3 |

Behind the scenes these are the existing rules: Offensive is `markFa`, Defensive on the last shot is `toggleNoAttack`, and on a 2 shot rally it reaches the same answer the stroke reaches today.

Key 0 on a shot before the attack is a shortcut for "Defensive to the end": No attack, and the walk jumps to the last shot.

## 5. Going back and changing an answer

Any shot already passed can be opened again by pressing its cell or its number key. That includes later shots, which is how Review is set on them. Shots not reached yet are not pressable. Its block of three loops while it is open.

| Change | What happens | Where the walk goes next |
|---|---|---|
| A Defensive shot before the attack marked Offensive | It becomes the first attack. The old one becomes a reply or a later shot, its strokes kept | Stays on it for Stroke and Wing, then back to the furthest point |
| The first attack marked Defensive | No first attack any more. Every shot after it is asked again | The next shot, asked Offensive or Defensive. The furthest point drops back to it |
| A reply flipped | Only changes the stroke list, as now. Not the first attack | Back to the furthest point |
| The last shot changed from Defensive to Offensive on a No attack rally | It becomes the first attack | Stays for its rows, then Ready |
| An earlier shot marked Offensive on a No attack rally | First attack there, No attack off | Stays for its rows, then Ready |
| Result changed at Ready | Press End, pick another, as now | Ready |

Rule for "back": after a reopened shot is answered, the walk opens the first shot that is missing something Save needs. If there is none it goes back to the furthest point reached, or to Ready if End was already answered. A second press on the open shot closes it, as now.

Strokes and tags on a shot that lost its row stay in the draft and come back with the row. Save drops a stroke with no row, as now. Intent or Initiative left on a shot that is no longer the first attack or a reply is still saved: that is audit flag 18, open in both modes.

## 6. Video loop

| Point | Rule |
|---|---|
| Blocks | Shots 1 to 3, 4 to 6, 7 to 9 and so on. The last block is always the last three shots, so a 7 shot rally has 1 to 3, 4 to 6 and 5 to 7 |
| A block's loop | From the first shot's usual lead (the serve: rally start, 2 s before the contact) to the last shot's usual tail (the last shot of the rally: rally end). Same lead, tail and 0.3 s hold as today's shot loop |
| Which block plays | The block holding the open shot. End plays the last block |
| When it moves | Only when the open shot is in another block. Inside a block the loop keeps running and is not restarted, so the rhythm is not broken |
| Which shot is asked | The open cell in the shot row, the line under the cell the video is on, and the shot number on the clock, all as built |
| Ready | The whole rally loops, as now |
| Speed | Whatever the video speed control is set to, as now |

## 7. End, Save, Discard, Edit

- **End** comes last, after the last shot, never by itself after tapping. Pressing a result finishes the rally (Ready). On an error Miss reason shows under it and is optional.
- **Save** sits where it is in the foot. During the walk that place reads **Next**. It turns into Save when the rally is ready, which can only happen on a result press on the band, so a run of Next presses cannot save by accident. The usual 600 ms guard applies to the swap. Enter is Save, as now.
- **Discard** is in the foot at every stop and clears the whole rally, as built (`onRetap`), with Undo for 6 s. Undo puts back the taps, the answers and the shot the walk was on.
- **Edit** (a saved rally, or Edit last rally) is the same in both modes: it opens at Ready with the built edit controls. Edits are counted in the comparison, not changed by it.
- **Server toggle**: works as now during the walk. The hitters and colours swap and the answers stay.

## 8. Keys

| Key | Sequential mode |
|---|---|
| N | Next. On a shot before the attack it means Defensive |
| A | Flips Offensive and Defensive. On a shot before the attack, flipping to Offensive makes it the first attack and flipping to Defensive goes on, the same as the presses |
| S D F G H | Stroke cells, as now. They work before the result is in |
| Z X | BH, FH, as now. They work before the result is in |
| Q to Y | Result, on End only |
| 0 | Defensive to the end (No attack), on a shot before the attack |
| 1 to 9 | Open a shot already passed |
| Enter | Save when lit |
| P, K, arrows, Backspace while tapping | As now |

Depth, Intent and Initiative have no keys in either mode today. See question 5.

## 9. The address switch

- Add `?flow=sequential` to the tagging set screen's address. With no `flow`, or `flow=current`, the screen is exactly as now. It sits beside `?cells=outlined` and the two can be used together.
- Same screen, same store, same rallies. A rally saved in one mode opens and edits in the other.
- The mode is read when tapping ends and kept until that rally is saved or discarded. A change of address mid-rally applies from the next rally.
- The screen root gets `data-flow="sequential"` so the check scripts can tell the modes apart.

## 10. What it reuses from the approved answer area

Reused as built: shot row cells, open look, first attack outline and the End cell; the white band; heading with bar, name, role tag and marks; name lines; answer cells; the joined Offensive and Defensive pair; stroke cells; Depth, Intent and Initiative rows; End with Result and Miss reason; the foot with server toggle, Discard and Save; the words line at Ready; toasts; guards 1 to 5.

Differences in sequential mode only:

| Approved area | Sequential |
|---|---|
| Before Ready only the required sections show | Every section of the open shot shows |
| Marks only once Ready | Marks from the first stop |
| Status words in the heading before Ready | None: the open shot and its rows say what to do |
| End opens by itself after tapping | The serve opens by itself, End comes last |
| Pick the first attack step, Change, No attack row | Not used: the first attack comes from the Offensive and Defensive presses |
| Offensive and Defensive pair fixed on shots up to the first attack | Both halves live on those shots: the press is the first attack answer |
| A shot before the attack has no stroke row | It shows the pair alone, with no stroke cells |
| Shot cells not pressable before Ready | Shots already passed are pressable |
| Save at the right of the foot | Reads Next until Ready |

## 11. Comparing the two fairly

**Side log.** One line per rally, in both modes, kept in the browser and not on the rally: mode, shots, server, first attack shot, answer time (end of taps to Save), total time (first tap to Save), presses, Next presses, times the loop came round, shots reopened, answers changed after they were first given (first attack moved, result changed, stroke or wing changed), Discards, optional answers filled. Later Edits of that rally are logged with what changed. A "Copy timings" press on the Rallies list, shown only when the address has `flow=`, copies the log as a table.

**Running it.**

- The same tagger, the same match, different rallies in each mode. Never the same rallies twice: the second pass is faster from memory.
- Blocks of 10 rallies in the order current, sequential, sequential, current, after 5 warm-up rallies in each mode that are not counted. This evens out tiredness and learning.
- Compare by rally length: 1 shot, 2 shots, 3 to 4, 5 to 7, 8 or more. Sequential costs more on long rallies, and the average hides it.
- Sequential asks the optional rows on the way, so it will collect more data. Report answer time and optional answers filled side by side, not time alone.
- Accuracy, if wanted: Paul tags 20 rallies slowly as the reference, then the first attack shot, result and last stroke and wing from each mode are checked against it.

**Least presses per rally**, every optional row skipped with Next (answering the rows instead costs more presses and collects more data):

| Rally | Current | Sequential |
|---|---|---|
| 1 shot | 2 | 3 |
| 2 shots | 4 | 6 to 7 |
| 6 shots, attack on 3 | 7 | 12 |
| 6 shots, attack on 3, replies not stops (question 1) | 7 | 10 |

The counts are a reason to measure, not a verdict. The test is whether looping three shots in order makes each answer quicker and surer.

## 12. Build steps for the builder

Rules: work only in `proto/`. Branch `cursor/mvp-proto-shell-d372`, `git pull --rebase` before each push. No new dependency. Do not change `rally.ts` or `shotKeys.ts`. With no `flow` in the address, nothing may change: the existing checks must pass as before. One push per step. Report the hash and stop after each. If the code at the start is not as this document says, stop and report.

1. **Walk rules, pure.** A new file beside `rally.ts` (for example `sequence.ts`), with no React, using only what `rally.ts` exports: which shots are stops, the next stop, when a stop is complete, when Next is allowed, the Offensive and Defensive press (built on `markFa`, `toggleNoAttack`, `flipSwitch`), where the walk goes after going back, the block and loop window for a shot, and the keys in section 8. Add a check script that runs every case in sections 4 and 5 and confirms the saved rally is the same as the current mode would save for the same answers.
2. **Address switch and side log.** Read `flow`, set `data-flow`, lock the mode per rally, write the log lines. Nothing visible yet.
3. **Answer area in sequential mode.** `ShotPanel` takes the mode: all sections, marks from the start, no status words, the pair alone on shots before the attack, both halves live up to the first attack, stroke and wing live before the result.
4. **The walk on the screen.** After tapping, open the serve. Open stops in order, go on by itself, the 600 ms guard, Next in Save's place, passed shots pressable, End last, Ready, Discard with Undo back to the same shot.
5. **Video.** Block windows in place of the single shot loop, moving only when the block changes.
6. **Keys** as in section 8, sequential mode only.
7. **Copy timings** on the Rallies list.
8. **Checks.** Both modes at 393 x 660 touch and 1440 x 912 mouse: the six `rend` rallies in current mode unchanged, and the section 4 cases walked in sequential mode, with pictures of the serve, a shot before the attack, the first attack, a reply, the last shot, End and Ready.

## 13. Questions only Paul can answer

1. **Replies.** They ask only optional rows. Should the walk stop on the two replies after the first attack, or pass them like later shots (about 2 fewer presses a rally, Initiative only set by going back)?
2. **Serve on a one shot rally.** On a serve error Depth means little. Ask the serve first anyway (Next skips it), or open End first when the rally has one shot?
3. **Loop blocks.** Fixed blocks of three (1 to 3, 4 to 6, last three), or sliding around the open shot (the one before, this one, the one after)? And keep the loop running inside a block, or restart it on every new shot?
4. **Defensive lit by default** on shots before the attack, so one press accepts it? Or nothing lit, so every shot is a deliberate choice?
5. **Go on by itself** when a shot's last row is answered, or always wait for Next? And should Depth, Intent and Initiative get keys (C V B, the row under Z X) in both modes?
6. **The test.** Who tags, which match, how many rallies, and what result would make you choose sequential (for example no more than 15% slower with fewer corrections, or simply your preference)?
