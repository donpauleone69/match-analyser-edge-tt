# Rally tagging model, round 3: the last ball decides the point

Canvas: https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/d6d192ba-4e8a-4536-9d04-f394b337d2fe

## What changed and why

**Choice: refine, not replace.** The round 2 model already asked where the last ball went. That tap tells a winner (it landed on the table) from an error (net or out). The last hitter follows from the server and the shot count. So the corrected givens need no new question: the end tap now decides the point.

- **Winner from the end tap.** If the last ball lands on the table, the last hitter wins the point. If it goes into the net or out, the other player wins. The score, the next server, game ends and pressure points are all built from these taps. Only the first server is entered.
- **Match order.** The rally pass now runs in order and includes 1-shot rallies, because each point sets the next server. On an ace, the end tap is also the serve spot.
- **All end zones are live.** The target half, the net and the floor beyond the target half can all be tapped. The hitter's own half is greyed out.
- **Exceptions.** Small chips under the end tap: edge or net cord (flag), let (the rally is void), and other ruling (Point to You or Point to Opp).
- **Score checks.** Each rally shows the expected server, so a wrong earlier tap shows up within two rallies (about 1 fix per match). Each game ends with a one-tap check: "Game 4 to You 11-9? Correct / Fix".
- **No grids.** The input picture has no lane or short lines; you point at a picture. Every button set is a single row of 2 or 3.
- **Effect:** 9 more inputs and 47 more seconds per match. Inputs go from 371 to 380 (4.75 per rally); time goes from 14.4 to 15.2 minutes. The budget is now 16 minutes. Where the extra time goes: 1-shot rallies 2.0 s to 3.7 s; end tap 1.2 s to 1.4 s; game checks 8 s; server fix 8 s; exceptions 3 s.

## Sequence

1. **Rally pass, in match order.** Each rally plays once at full speed. Tap the pad when someone attacks; the tap snaps to that contact, and no tap means no attack. The video freezes on the last ball: tap where it went. Then Backhand or Forehand. If the rally went on after the first attack, add who was on top at the end: You, Both or Opp. At a game end, confirm the score.
2. **Serve reel.** Every serve back to back, one tap on where it bounced. Aces and faults are skipped.
3. **Receive reel.** Same tap for the receive, in rallies of 3 or more shots.

## Fields and what they unlock

| Field | Input | Unlocks |
|---|---|---|
| First attack | live tap or nothing | initiative, serve and receive quality, opening stroke |
| End spot | point tap | **point winner**, winner or error, net or long or wide, winner placement |
| Wing | 2 buttons | backhand or forehand errors and winners |
| On top at the end | 3 buttons, open play only | forced or own error, turned-around rallies, last two strokes |
| Serve spot | reel tap | short or long, lane, serve patterns |
| Receive spot | reel tap | short push, long push or attack |
| Flags | edge, let, ruling | luck left out of patterns; void rallies |

## Inferred facts

Server and last hitter; point winner and how we know it; the running score, game scores, next server and pressure points (from 8-all); shot type for control shots; flick or loop for the opening stroke; serve quality (could the receiver attack it?); turned around; forced error (made while the other player was on top); proof clip times.

## Tricks

The end tap does two jobs. Leaving out the live tap means "no attack". The live pad is the whole screen. Only the useful part of the table can be tapped. Reels keep the same question for 80 taps in a row. Consequence replaces judgement. The score checks itself, so one slip cannot spread across the rest of the match.

## Left out

Spin type, speed, footwork, stroke names for every shot, shot-by-shot placement, quality ratings, tactical intent. Each costs a tap on every shot and is hard to judge from phone video. The consequence fields above cover most of what they would show.

## Effort budget (80 rallies, amateur mix)

| Ends on shot | Rallies | Inputs | Seconds each |
|---|---|---|---|
| 1 | 8 | 1.0 | 3.7 |
| 2 | 14 | 3.4 | 7.4 |
| 3 | 19 | 5.1 | 10.6 |
| 4 | 12 | 5.5 | 11.8 |
| 5 | 9 | 5.7 | 12.7 |
| 6 | 6 | 5.8 | 13.6 |
| 7 | 4 | 5.8 | 14.4 |
| 8+ | 8 | 5.8 | 16.8 |

Total 380 inputs and 15.2 minutes, against a 16-minute budget. 6.4 minutes of it is watching. Rallies that end by the 3rd ball are 51% of points and 37% of the time. Rallies of 5 shots or more are 34% of points and 43% of the time: that is where the on-top tap earns its cost.

## Five reasons

1. One tap says how the point ended and who won it.
2. Point, do not hunt: a plain picture, no grid lines, single rows of big buttons.
3. Consequence beats judgement: every field is something you can see.
4. Effort follows value: short rallies are cheap; open play earns one extra tap.
5. The score checks itself: the server badge and game checks catch a bad tap within a few rallies.

## Main trade-off

The score now depends on every end tap, so one slip can shift every later server. The checks cost about 16 seconds a match and catch the slip within a game. In return there is no "who won?" question. The sample match rebuilds its score from end taps alone with no mismatch across 79 rallies.
