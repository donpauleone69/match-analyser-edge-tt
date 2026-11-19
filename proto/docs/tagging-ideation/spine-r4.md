# Rally Spine r4

Canvas: [Rally Spine r4](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/4ea94881-9d48-46d3-b7c3-e6d57d013b21). Refines [Rally Spine R3](clean-v2-gpt-r3.md).

## What changed and why

The spine idea stays: the result of each point builds the score, the score gives the server, and the server gives every hitter. What changed is how the questions are laid out. The spine is now seven fixed slots, asked at the same place on every rally.

- **A total you can rebuild.** Every rally length has a fixed tap count, so the match total is a plain weighted sum (table below). A generated 80-rally match lands on the same number.
- **No moving pressure shot.** R3 asked you to pick the first pressure contact, which fell on a different shot in each rally. r4 never asks for it. First attack is read from the answers on shots 2, 3 and 4, which are asked on every rally that reaches them.
- **One pass, not three.** The separate result pass and serve batch are gone. Contacts, result and detail all happen in one stop per rally, in match order. Match order is what keeps the server chain correct, and you watch in that order anyway. Paul's idle-close idea is kept because the 2 s wait is when you see the ball land, which is exactly what the result needs.

## Sequence (one stop per rally)

1. **Contacts.** The rally plays from 2 s before the serve, and you tap on each contact.
2. **Idle pause.** After 2 s with no contact the video pauses on the landing. A tap in the next second still counts as a contact.
3. **Result:** Winner, Net, Long or Wide. Winner means the last hitter won the point; the other three mean they lost it. This one tap gives the point winner, the score and the next server.
4. **Serve length:** Short or Long. Skipped on a serve fault.
5. **Shot rows:** shots 2, 3 and 4, then the shot before last and the last shot. The video loops the contact being asked, and the last answer saves the rally.

A shot row has two or three plain strokes, then an Attack group with BH and FH. It is one row, not a grid. The ball before decides which plain strokes show:

| Ball before | Row |
|---|---|
| Short serve or Touch | Touch, Push, Attack BH or FH |
| Long serve or Push | Push, Block, Attack BH or FH |
| Block, Lob or any attack | Block, Lob, Attack BH or FH |
| Not tagged (shot before last in 7+) | Push, Block, Lob, Attack BH or FH |

Chop counts as Push, since both are backspin strokes. Attack means flick, topspin, counter, drive or smash. The report names the attack from the ball before: flick, topspin or counter. Up to 6 shots, every shot is tagged; that covers 86% of the tour mix. On 7+ shots, shots 5 to n-2 are never asked.

## Tap and time sum (tour mix, 80 rallies)

| Ends on | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ | Match |
|---|---|---|---|---|---|---|---|---|---|
| Rallies | 9.6 | 14.4 | 20.8 | 10.4 | 8.8 | 4.8 | 3.2 | 8 | 80 |
| Taps each | 1.67 | 3 | 4 | 5 | 6 | 7 | 7 | 7 | |
| Subtotal | 16.0 | 43.2 | 83.2 | 52.0 | 52.8 | 33.6 | 22.4 | 56.0 | **359.2** |

Taps per rally are 1 for the result, plus 1 for serve length, plus one per shot row, where rows = min(n, 6) minus 1. For 1-shot rallies the table assumes two thirds are aces (2 taps) and one third are faults (1 tap). Split by question: 80 result taps, 76.8 serve taps and 202.4 shot-row taps. The sample match rounds to 10, 14, 21, 10, 9, 5, 3 and 8 rallies, and its taps by length are 17, 42, 84, 50, 54, 35, 21 and 56, which is **359**. Contacts add 317.6 taps if tapped live, treating 8+ as 10 shots.

**Time with live contacts: 18.6 min a match, 13.9 s a rally.**
- Watching is 10.6 min: a 2 s lead-in ×80 (160 s), 1 s per contact (318 s) and the 2 s idle pause ×80 (160 s).
- Answering is 7.9 min: result at 1.0 s (80 s), serve length at 1.2 s (92 s) and shot rows at 1.5 s with the contact looped (304 s).

If contacts are given, watching is a 3 s look at each last contact (4.0 min), so the match takes about 11.9 min. All seconds-per-tap figures are estimates.

## Fixed-slot status

- **Hold:** result (every rally); serve length (every serve that landed); shots 2, 3 and 4 (every rally that reaches them); the shot before last and the last shot (every rally, with short rallies reusing an opening slot instead of asking twice); middle shots of 7+ rallies (never asked).
- **First attack:** worked out over a fixed window (shots 2 to 4), so its rate always covers the same shots. In a 7+ rally with no attack by shot 4, it is stored as "after shot 4" and not located.
- **Exception, wing:** wing is stored only on attacks. Asking BH or FH on every push, touch, block and lob would add 202 taps, about 5 min, for low coaching value. Wing comparisons count attacks only and say so on the card.

## Data value (sample match: 3-1, games 13-11, 11-7, 7-11, 11-9, points 42-38)

The cards are counted live in the canvas from the 80 tagged rallies:

- When you attacked first by shot 4 you won 21 of 31. When the opponent did, you won 7 of 20 (out of 56 rallies of 3+ shots).
- Your forehand first attack won 13 of 17; your backhand first attack won 8 of 14.
- On the opponent's long serve you won 8 of 20, against 12 of 19 on the short serve. Your FH topspin receive missed 4 times out of 7.
- On your serve, a forehand third ball won 6 of 10 and a backhand third ball won 2 of 7.
- 17 of your 23 errors came when the ball before was not an attack. 6 came straight after an attack, and 5 of those were blocks.
- By rally length you won 24 of 45 at 1 to 3 shots, 13 of 24 at 4 to 6, and 5 of 11 at 7+.

## Pros and cons

**Pros**
- One stop per rally, with no modes to hold in your head.
- Every compared tag sits on a fixed shot.
- Whole rallies are tagged up to 6 shots.
- Each answer sets the next row.
- 359 is a sum you can check.

**Cons**
- No wing on control strokes.
- The middle of 7+ rallies is blank, about 14% of rallies.
- Live contacts cost about 10.6 min of watching.
- Serve length has no half-long, dropped because it can't be told apart reliably.
- A slow lob can trip the 2 s idle pause; the one-second grace covers most cases.
- No placement or lane data at all.

**Left out:** serve spin, named serves, placement, quality or intent ratings, forced against unforced errors, and edge or net-cord marks (these count as Winner).
