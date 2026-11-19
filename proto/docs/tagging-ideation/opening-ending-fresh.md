# Opening and Ending, from a bare video

Canvas: [Opening and Ending, from a bare video](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/65db0ce3-e044-4632-96ae-a19264563db4)

## Starting point: changed heavily, not replaced
The earlier model (v3 r2) assumed contact times were given. Under this brief they are not, and nothing else is known except the first server, so the old model has no foundation. I kept what still holds: detail only on each rally's opening and ending, the single-row attack question with its self-labelling third button, and getting the score first. I replaced the rest:
- **Rallies, contacts and the score come from a live pass.**
- **The score comes from a swipe toward the point winner**, not from the last ball. The last-ball question now also works as a free check.
- **"Who attacked first"** asks who, not which shot.
- **Serve length has a visible rule.**
- **The ending window is the last two shots**, not three.

## Approach and why
Every rally has to be watched at least once, so that one real-time watch should do as much as it can. While the match plays, you tap one big pad on every bat contact and swipe toward the winner when the point ends. That gives the rally boundaries, the shot counts, the clip times, the score, the serve order and the set ends. It takes no reading and no hunting for buttons. A second pass then loops short clips of each rally's opening and ending and asks one row of two or three buttons per question. Each question has a rule you can check on the clip.

## Sequence
1. **Setup (30 s):** first server, which side of the screen they start on, handedness of both players, scrub to the first serve.
2. **Live pass:**
   - **Gestures:** tap on every hit, serve included. Swipe left or right toward the winner. Swipe down for a let.
   - **Playback:** 2x between points, dropping to 1x on the serve tap. After about five rallies the app learns the gap between points and jumps to just before the next serve.
   - **Result:** the score is complete when this pass ends.
3. **Detail pass:** questions come in clip order and auto-advance.
   - **Serve length: Short or Long.** Short means the receiver hits it over the table; Long means behind the end line.
   - **Shot 2, then shot 3: FH attack, BH attack, or a third button.** The third button reads Push, Block or No attack, from the ball before.
   - **Who attacked first? You, Them or Nobody.** Asked only in rallies of 6+ shots with no attack in shots 2 and 3: 5 of 80 rallies in the sample match.
   - **The last two shots** that were not already asked, with the same three buttons.
   - **Last ball: Net, Off table or Landed.** If Landed, one more tap for where: Wide FH, Middle or Wide BH.
4. **Three free checks:**
   - **Count check:** who hit last (from the shot count) plus the last ball must agree with the swipe.
   - **Rhythm check:** contact gaps under 0.35 s or over 2.2 s are flagged.
   - **Set check:** each set end in the score must line up with a long break in the video.

**Inferred, never asked:** shot count, who hit each shot, score, server, phase, winner or error, the ball before the last shot, error context (under attack or self-made), and first attack in all but a few rallies.

## Effort sum (pro mix, 80 rallies, 8+ costed at 10 shots)

| Shots | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ |
|---|---|---|---|---|---|---|---|---|
| Rallies | 9.6 | 14.4 | 20.8 | 10.4 | 8.8 | 4.8 | 3.2 | 8.0 |
| Taps each | 3.8 | 6.3 | 8.3 | 10.3 | 12.3 | 13.8 | 14.8 | 17.8 |
| Watch s each | 7.7 | 10.5 | 12.6 | 14.7 | 16.8 | 18.9 | 19.8 | 22.5 |
| Answer s each | 1.8 | 3.4 | 4.3 | 5.3 | 6.3 | 6.8 | 6.8 | 6.8 |

**Total: about 783 taps and 26.9 minutes per match. That is 19.5 minutes watching and 7.4 minutes answering, about 20 s per rally.**
- **Live pass:** 12.2 minutes and 398 taps. It is nearly all watching, because you tap while the video plays.
- **Detail pass:** 14.7 minutes and 382 taps.
- **Overheads:** the totals include setup, set breaks, learning the skip, and about 36 s fixing flagged rallies.

**Timing assumptions:**
- 0.9 s between contacts.
- 4 s between points, using the learned skip and then 2x.
- 1.2 s to watch each looped contact.
- 1.0 s per one-row answer.

**Against the starting point:** the earlier model's 15.4 minutes assumed free contact times. Its equivalent here is the 14.7-minute detail pass. The 12.2-minute live pass is the price of starting from a bare video.

## Data value
The sample match is a generated 3-1 win, 41-39 on points. The cards are computed from the same 80 rallies:
- **After the live pass alone:**
  - **Points by phase:** you won 11 of 25 points decided by shot 4 on their serve, against 17 of 30 on your own serve.
  - **Win rate by rally length:** you won 9 of 24 rallies of one or two shots.
  - **Free points:** service faults and receive errors.
- **After the detail pass:**
  - **Receive against their short serve:** you won 1 of 8 points after a backhand flick, against 8 of 18 after a push.
  - **Third ball:** short serve, then forehand third ball, won 10 of 15.
  - **Errors:** 15 of your 22 errors came off a ball that was not an attack, and 5 of your 7 receive errors went into the net.
  - **First attack:** you won 64% when you attacked first and 45% when they did.
  - **Winner zones:** 11 of their 12 winners landed wide on your forehand or in your middle.

Every rate is per slot (receive, third ball, last shot, ball before last), so each rally that reaches a slot counts once and rates compare fairly. Every number links to its clips.

## Pros and cons
**Pros:**
- Works from a bare video.
- The score is complete after 12 minutes.
- The live pass is one pad and two gestures.
- No grids: every question is one row of two or three buttons, each with a fact rule.
- Three free checks.
- Rates have fixed denominators.

**Cons:**
- About 27 minutes in total, and the live pass cannot run faster than the rallies.
- Tapping along slips in fast exchanges, and two missed taps cancel out and pass the count check.
- Each rally is seen twice.
- The middle of 6+ shot rallies is untagged apart from who attacked first.
- No spin, no placement except for winners, and no quality ratings.

## Five reasons for this choice
- **One watch does the most it can.** Watching is unavoidable from a bare video, so a single real-time watch with a single pad yields rally boundaries, shot counts and clip times.
- **The score comes from the plainest fact on screen:** who won the point, swiped toward them. The match is complete before any question is asked.
- **The questions sit where the coaching is.** The opening and the ending hold the practisable habits and the cause of each point, and up to 5 shots, which is 80% of rallies, they cover every shot.
- **One row of two or three buttons per question,** each with a visible rule. No grids, no ratings, no hunting.
- **The last-ball question earns its place twice.** It carries the coaching (net or off, winner zone) and checks the tap count and the swipe for free.

## Not checked
- **The timing constants are estimates, not measurements:** tap-along accuracy at 1x, the 4 s learned skip, and 1.2 s per clip. Nobody has tried tapping along with a real phone video.
- **The sample match is generated from hand-set probabilities** and chosen for a clear story. The card insights show what the data can say, not real player patterns.
- **The fact rules were not tested for agreement between two taggers.** These are serve length by where it is received, attack versus no attack, and the zone thirds.
- **The canvas compiled, but I did not click through it in a browser.**
