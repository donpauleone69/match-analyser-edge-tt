# Four Beats, round 2 (v3, Fable)

Canvas: https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/6a90ecdf-a565-4314-ac3c-75d6668c88b1

## What changed and why

- **Choice: rebuilt.** I kept the core idea (tag the two ends of the rally plus the first attack) and replaced every input. Not a patch, not a new idea.
- **The result is now question 1 of every rally.** Round 1 read the winner from the score. The score is not known, so one tap now names the winner, and the score, the server and the hitter of every shot are built from it.
- **No grids.** The 6 zone table and the 2 by 2 miss pad are gone. Every input is one row of two or three buttons.
- **New filter, "detail follows you".** The app asks only about your serve, your wing and your half of the table.
- **Effect, 80 rallies, tour mix:** 272 taps and 4:21 of answering, against 306 taps and 6:12 in round 1. With watching, 10:22 against 12:13. Patching round 1 with a result tap would have cost about 386 taps. A rally took 0 to 4 taps and now takes 1 to 5.
- **Price:** serve direction, depth, and placement on the points you win.

## Sequence, fields and what each unlocks

| # | Question, buttons in one row | Asked when | Unlocks |
|---|---|---|---|
| 1 | Result: In, Net, Off (1 shot: Ace, Fault) | Always | Winner, score, next server, winner or error, net or off, win rate by length |
| 2 | Your serve: Short, Long | Your serve landed | Short against long serve results, how often each gets attacked |
| 3 | First attack: tap the shot, or None | 2 or more shots | Who gets in first and what it is worth, a label for every shot |
| 4 | Their last ball: Backhand side, Middle, Forehand side | Their rally ball was the last good ball, so you lost | The lane where you get beaten |
| 5 | Your wing: Backhand, Forehand | The last contact was yours | Error fingerprint, winners by wing |

## Inferred, never asked

Server and hitter of each shot (first server plus points played). Winner, score, game scores. Phase (serve, receive, third ball, fourth ball, open rally). Stroke labels: push before the first attack, block or counter right after it, topspin from then on. Receive type. Step around. Cause and effect at the end.

## Tricks

Result first, so one tap filters the other four. Stop anywhere: results alone give a score and a report. Each question shows its own frozen frame or half second clip. Jump cut to the last two shots. Two free checks: the serve order depends on points played, not on who won them, so one wrong result does not scramble the hitters, and each game score is shown as it closes. A small Let button, used only when it happens.

## Left out

Forced or unforced, quality, spin, serve direction, depth, stroke names, the opponent's wing and serve, the middle of long rallies.

## Effort budget

Fault or their ace 1 tap. They missed 2. Clean winner by either player 3. You missed the receive 3. You missed after a rally ball 4. Add 1 on your serve. Tour mix: 272 taps, 4:21 answering, 6:01 watching, 10:22 total. Amateur mix (my assumption): 265 taps, 9:43. The generated match needed 266 taps, and its score, rebuilt from the tags alone, matched the simulation point for point. Step times are estimates, not measurements.

## Five reasons

1. The first tap builds the match, and alone it already gives a report.
2. Every question is one row of two or three things you can see. No grids, no judgement.
3. Detail follows you: a point you lose earns up to three detail taps, a point the opponent gives away costs two in all.
4. One tap, the first attack, labels every shot.
5. The lesson sits at the two ends of a rally, so a 14 shot rally costs the same as a 4 shot one.

## Main trade-off

Speed and certainty over detail. No serve direction, no depth, nothing on the opponent's technique, no placement for your winners. A chopper breaks the push then topspin rule. The whole score rests on the result tap being right.
