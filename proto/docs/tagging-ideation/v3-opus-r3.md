# Tagging v3 (Opus) r3: Opening and Ending, one pass

Canvas: [Opening and Ending r3](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/3e5a21c8-7aea-43f9-b06c-2dd50eb26bcc). Replaces r2 (`v3-opus-r2.md`), whose canvas is left as it was.

## What changed and why
- **One pass, rally by rally.** I kept Paul's idea: tap contacts live, the video pauses after 2 s with no contact, and the questions come straight away. Paul's point is right: results set the serve order, so match order is the unit. Within a rally, order matters little, so the last ball goes first while the frozen frame still shows it. The r2 score pass and its second watch are gone. A tap in the first second of the pause still counts as a contact, as in the prototype.
- **Where it landed joins the last ball row:** Net, Out, then BH, Middle, FH under "landed". A winner no longer costs a second tap.
- **The shot row is four fixed buttons:** BH attack, BH, FH, FH attack. Pushes and blocks now have a wing, and the r2 third button, whose label changed, is gone. BH is always on the left. The app stores push or block from the ball before.
- **The opening is shots 2 to 4** (was 2 and 3). Shot 4 is the receiver's second ball, where club rallies often open. Every shot is tagged up to 7 shots.
- **The "which shot was the first attack" question is gone.** The fact we compare is now who opened first by shot 4, which is a fixed slot.
- **Contacts are counted,** so the totals compare with the live prototypes.

## Sequence
1. Once per match: first server, both players' hands, your end (4 taps).
2. Live: tap every contact at 0.75x. After 2 s with no contact the video pauses.
3. **Last ball** (label names who hit it): Net, Out, BH, Middle, FH. This gives the point, the score, the next server and the set ends.
4. **Serve:** Short or Long (would it bounce twice). Skipped after a service fault.
5. **Shot rows** for shots 2, 3, 4 and the last three (at most 6). Each shot replays from its contact.
6. The video resumes. Answers stay on the rally row, and tapping one changes it.

## Tap and time sum (tour mix, 80 rallies)
| Shots | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ | All |
|---|---|---|---|---|---|---|---|---|---|
| Rallies | 9.6 | 14.4 | 20.8 | 10.4 | 8.8 | 4.8 | 3.2 | 8 | 80 |
| Contacts each | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 317.6 |
| Answers each | 1.75 | 3 | 4 | 5 | 6 | 7 | 8 | 8 | 371.2 |
| Taps total | 26.4 | 72 | 145.6 | 93.6 | 96.8 | 62.4 | 48 | 144 | 688.8 |

Answers per rally are 1 last ball, plus 1 serve, plus one per tagged shot. On 1-shot rallies I assume a quarter are faults, which skip the serve, so 1.75. With 4 setup taps the total is **about 693 taps**.

**Time is 19.0 minutes.** Watching takes 9.7 minutes: 7.1 for contacts at 0.75x and 2.7 for the 2 s pauses. Answering takes 9.1 minutes: 80 last-ball taps at 1.0 s, and 291 other answers at 1.6 s while the shot replays. Setup takes 10 s. The time between points is left out, because it is the same in every flow. **Budget: 20 minutes.** That is the low end of Current (823 taps, 18 to 22 minutes), with 36% fewer taps than End first (1079). The generated sample match (lengths 10, 14, 21, 10, 9, 5, 3, 8) uses the same rules: 317 contacts, 370 answers, 691 taps, 18.9 minutes.

## Fixed-slot status
Every tag used to compare rallies holds the rule. There is no exception.
- **Holds, every rally:** last ball.
- **Holds, every rally that reaches the slot:** serve length (every serve that landed), shots 2, 3 and 4, and the last three shots.
- **Derived and fixed:** who opened first by shot 4 (every rally with a return), and the ball before every error.
- **Holds, but only describes winners:** where the last ball landed. It is asked on every winner and is never used as a rate across all rallies.
- **Not compared:** a first attack after shot 4. It is shown on the rally only, which is 1 of 80 in the sample.

## Data value
- **Last ball:** score, serve order, phase, and winners against errors. On errors, Net or Out points to the technical fix.
- **Where it landed:** where each player's winners go.
- **Serve length plus shot 2:** receive habits against short and long serves.
- **Serve length plus shot 3:** serve and third-ball patterns.
- **Ball before the last shot:** whether an error came under attack, and on which wing.
- **Shots 2 to 4:** who opens first, and the win rate that follows.

The sample match produces six cards and a match report: receive is the leak (7 of 22 against 23 of 33 on serve); the BH flick against short serves won 0 of 6, with 4 in the net; short serve plus FH third ball won 7 of 9; 9 of 18 errors came off their attack, 8 of them blocks; they opened first 30 times to 25, and you won 37% of those; their winners went to your FH 8 of 19 times.

## Pros
- The match is watched once, and the last ball is answered while the frame still shows it.
- Every compared tag is on a fixed slot.
- The same buttons sit in the same place on every shot.
- 693 taps and 19 minutes, contacts included.

## Cons
- Long rallies still cost 8 answers, and the middle of 8+ shot rallies stays blank.
- The shot row puts two facts, wing and attack, in one row of four. Paul may read that as a grid.
- One missed contact flips who hit last, and so the point. The label naming the last hitter catches it only if the player reads it.
- No stroke names: loop, flick and drive are all stored as "attack".
