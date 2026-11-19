# Point, tap, done: the revised tagging model

## What changed from the first version, and why

This is a refinement, not a new approach. The core still holds: tag the first attack and the last ball, let the score and the contact marks infer the rest, and read quality from what the next shot did. What changed is how each answer is entered and where the effort goes.

- **The 2 by 3 grids are gone.** Every location is now one tap on a picture of the table, drawn the way the camera sees it. You point at what you just saw, so there are no rows and columns to search. The exact spot is stored, and short or long and the lane are worked out from it.
- **The wing is its own step:** two half-screen buttons. Two obvious taps are faster than one hard tap.
- **The first attack is tapped live while the rally plays.** The tap snaps to the nearest contact. No tap means no attack, which is the default.
- **"Attack or block" on the last ball became "who was on top at the end".** It is still one tap, but it gives both of the last strokes and a forced or own label for the error. Only rallies that reach open play are asked it.

## Sequence

1. **Rally pass.** Each rally plays once, at full speed.
   - Tap the pad when someone attacks first (a flick, loop, drive or smash).
   - The video freezes on the last ball. Tap where it went: the net, the floor, or the spot it bounced for a winner. The score decides which zones are live.
   - Tap the wing: FH or BH.
   - If the rally carried on after the first attack, tap who was on top at the end: You, Both, or Opp.
   - Tap "edge or net cord" only if it happened.
   - Rallies of 1 shot skip this pass completely.
2. **Serve reel.** Every serve plays back to back. Tap where it bounced, or for a fault, where it went. The reel moves on by itself.
3. **Receive reel.** The same tap for the receive, for rallies of 3 shots or more.

## Fields and what each one unlocks

| Field | Unlocks |
|---|---|
| `firstAttack` | Who took the initiative and when. Serve quality, the third-ball rate, and the class of every earlier shot (all control). |
| `end` (kind plus x, y) | Error type (net, long, wide) and where winners land. |
| `wing` | Backhand or forehand leaks. |
| `onTop` | Rallies that got turned around, both of the last strokes, and forced versus own errors. |
| `serve`, `receive` (x, y) | Short or long and the lane. Combined with `firstAttack`, short push versus long push, and flick versus loop. |
| `edge` | Takes luck out of the stats. |

**Inferred, never asked:** the point winner, winner or error, ace or fault, the shot the rally ended on and who hit it, the serve and receive types, pressure points, and a proof clip for every rally.

## Tricks

- The table picture mirrors the camera view, and the app handles handedness.
- The default for the first attack is no tap.
- Live zones shrink with the score: an error never offers the table, and a winner never offers the floor.
- Reels repeat one question, so the eye stays calibrated.
- One card, "Where your points end", costs zero taps.
- Four echo clips per match are re-tagged blind, which measures how consistent each field is.

## Left out

Spin, speed, quality ratings, footwork, and the shots between the first attack and the end. Forced versus unforced is not asked directly: it comes from "who was on top".

## Effort budget

The budget is **15 minutes for an 80-rally match**. The expected effort is about **14.4 minutes and 371 inputs** (4.6 per rally), and about 6 of those minutes are simply watching each rally once.

The match is assumed to be amateur. Compared with tour play, more points end on the serve and receive, and there are more long push rallies.

Expected cost by where the rally ends:

| Rally ends on | Share of points | Cost per rally |
|---|---|---|
| Shot 1 | 10% | 2 s |
| Shot 2 | 18% | 7 s |
| Shot 3 | 24% | 10 s |
| Shot 5 or later | 34% | 13 to 17 s |

Rallies that end by the 3rd ball are half the points and take about a third of the time (36%). Rallies of 5 shots or more take 44%, because they earn the "on top" tap.

## Five reasons

1. Point, do not look up: a location tap on a picture beats a grid.
2. Consequence beats judgement: every label is something you can see.
3. The score and the contacts do the hard part.
4. Effort follows value: short rallies are cheap, and open play earns one extra tap.
5. Fast inputs beat few inputs: live taps, big binary buttons, and repeating reels.

## Main trade-off

There are more inputs (4.6 per rally, against 3.9 in the first version), but each one takes far less thinking. The live tap depends on snapping to the right contact, so about one rally in ten will need a quick fix on the strip.

Canvas: [Rally tagging model, revised: point, tap, done](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/5391f828-ae04-4a7b-8c3e-bc68bb64707a)
