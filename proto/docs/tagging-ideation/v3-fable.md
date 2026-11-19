# Four Beats: rally tagging model, round 3 (Fable)

Canvas: [Four Beats](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/3f150124-2347-4b88-bbfa-9ba9f67548cf)

**Idea.** Tag the two ends of every rally and let the timestamps and the score explain the rest. 0 to 4 taps a rally, and every answer is a fact you can see.

## Sequence (in order of play)

1. **Serve spot.** Tap the table picture where the serve bounced. 6 zones: short or deep, backhand side, middle, forehand side.
2. **First attack.** Tap the first shot that was not a push, or "No attack".
3. **Last good ball.** Tap where the last ball that landed bounced.
4. **Finish.** If the last shot missed: one tap on a 2 by 2, forehand or backhand, into the net or off the table. If it was a clean winner: forehand or backhand.

Filtering: a service fault costs 0 taps. An ace costs 1. A missed receive costs 3, because the serve is the last good ball. Every other rally costs 4, whatever its length.

## Fields and what each unlocks

| Field | Unlocks |
|---|---|
| `serveSpot` | Serve map: points won and how often the receiver attacks, per zone. Receive trouble by serve zone. |
| `firstAttack` | Who attacks first and what that is worth. Third ball and receive habits. The stroke class of every shot. |
| `lastGoodSpot` | Where you get beaten, where your pressure works, and the cause of each error. |
| `finishWing`, `finishFault` | Error fingerprint: which wing, net or off, in which situation. Winners per wing. |

## Inferred, never asked

Winner or error, by whom and on which shot (shot count plus score). The last good shot. The phase: serve, receive, third ball, fourth ball, open rally. The stroke class of every shot: push before the first attack, then first attack, block or counter, topspin. Receive type: flick if the serve was short, loop if it was deep. The shot that caused each error and where it landed. Step around footwork (forehand from the backhand side). Rally length profile.

## Tricks

- **Tap position:** one touch gives side and depth.
- **One clip per question:** timestamps let each question show its own half second (the bounce, or the frozen last contact), so you read the answer instead of remembering it.
- **Jump cut:** after the first attack is tapped, playback skips to the last two shots.
- **Live taps:** questions follow the order of play, so the first two can be tapped while the clip runs.
- **Silent saves** for faults, and a **second look queue** for odd records at the end.

## Left out

Forced or unforced, shot quality, serve spin, stroke names, wing and placement of middle shots, net and edge luck. Each is a judgement call or costs a tap on every shot.

## Effort budget

About **300 taps and 6 minutes of answering** per 80 rally match, about 12 minutes with watching, never more than 4 taps a rally. With the brief's mix (read as the last ball that landed): 306 taps, 6:12 answering, 12:13 total. My amateur assumption (24, 21, 21, 13, 8, 5, 3, 5 percent, fewer clean winners): 293 taps, 11:30 total. Step times are estimates, not measured: 1.2 s per table tap, 1.0 to 1.6 s for first attack, 1.5 s for a miss, 0.8 s for a winner. Defence: it is under half the playing time, and each tap feeds a different report card, so cutting one removes a card.

## Five reasons

1. You only tap what you can see, so two people save the same record.
2. The score and the shot count answer the big questions for free.
3. The lesson sits at the ends of a rally: serve, first attack, then cause and effect in the last two shots.
4. One tap, the first attack, labels every shot.
5. Effort follows how points end: 0 to 3 taps when the serve decides it, capped at 4 otherwise.

## Main trade-off

The wing is known only for the last shot and nothing is saved from the middle of long rallies. You get error and winner counts per wing, not success rates per stroke, and matches against choppers are described less well.
