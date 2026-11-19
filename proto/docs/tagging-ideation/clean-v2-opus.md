# Four taps per rally: the first attack and the last ball

**Idea in one line.** Tag only the shots that decide a rally (serve, receive, first attack and last ball) and let the score do the rest. Quality is never rated. It is read from what the next shot did.

## Sequence

1. **Rally pass, 2 taps per rally.** Video plays the rally, then:
   - **Q1, the first attack.** Tap a chip on the contact strip (S, R, 3, 4 and so on), or tap "No attack". An attack is a forward topspin or drive stroke: flick, loop, drive or smash. Pushes, chops, blocks and lobs are not attacks.
   - **Q2, the last ball.** One 2 by 3 grid. Rows are the wing (FH, BH). Columns are Net / Long / Wide for an error, or to BH / middle / to FH for a winner. The score decides which set of columns you see. In open play (the last ball comes after the first attack), each cell splits into a top half for attack and a bottom half for block. It is still one tap.
2. **Serve reel, 1 tap per rally.** All serves play back to back. Tap a 2 by 3 grid: Short or Long (would the ball bounce twice?) by lane (their BH, middle, their FH). The reel auto advances, and a swipe back undoes.
3. **Receive reel, 1 tap per rally.** The same grid for the receive. It is skipped when the rally ended on the receive.

## Fields and what each one unlocks

| Field | Unlocks |
|---|---|
| `firstAttack` | Who took the initiative and on which shot. Serve quality (did the receiver attack it?), third-ball rate, and a stroke class for every earlier shot (all of them were control). |
| `end` (wing, result, attack or block) | Where points leak, by wing and error type. Winners by placement. Errors while attacking versus errors while blocking. |
| `serveZone` | Win rate and "got attacked" rate per serve. The opponent's serves you struggle against. |
| `receiveZone` | Short push versus long push. Combined with `firstAttack`, it splits flick from loop (a short ball attacked is a flick). |

**Inferred, never asked:** the point winner, server and receiver, who hit each shot, winner or error, ace or fault, receive error, the phase the rally ended in, flick or loop, short or long push, pressure points (8-all and later), streaks, and a proof clip for every rally.

## Tricks

- **Score inference.** The last hitter plus the point winner tells winner from error at zero taps.
- **Timeline tap.** One chip encodes who attacked, when, and that every earlier shot was control.
- **Two facts per tap.** Length by lane, or wing by result. Every grid has the same shape and BH is always on the left, which builds muscle memory.
- **Tap position.** Where you tap inside an open-play cell encodes attack or block.
- **Filtering.** Options shrink live. Serve faults need only Net / Long / Wide. Aces need only the serve grid. The receive zone is dropped when the receive ended the rally.
- **Batch reels and layered passes.** The same question 80 times in a row keeps the eye calibrated. The rally pass alone already powers the initiative and error cards.
- **Echo checks.** Four random clips per match are shown again blind. Agreement gives each field a reliability badge.

## Left out

Spin type, speed, shot quality ratings, forced or unforced labels, footwork, and every shot between the first attack and the last ball. Spin is replaced by its consequence. Forced or unforced is replaced by the stroke you missed with. Edge and net balls count as normal winners.

## Taps per rally

- Typical rally (3 or more contacts): 4 taps. That covers 72 of 80 rallies in the sample match.
- Ended on the receive: 3 taps. Ace or serve fault: 1 tap.
- Worst case: 4 taps. The sample match averages 3.9 per rally (310 taps in total).
- **Why a 4th tap:** the receive zone is what separates a short push from a long push. The long push is the most common club leak: in the sample match it won 1 of 11 points. It is also the cheapest tap in the model, because it is batched.

## Five reasons

1. Consequence beats judgement. Quality is shown by the next shot, not rated by the player.
2. The score does the hard part, so the ending tap only adds wing and direction.
3. One tap, two facts, one fixed shape, so taps become automatic.
4. Only the shots that decide club rallies are tagged. The middle of the rally is skipped.
5. Batching what repeats makes tagging fast and consistent, and layered passes mean that a partial tagging session still produces reports.

## Main trade-off

The data is coarse but repeatable, where other designs are fine but noisy. "Attack" lumps four strokes together, depth has only two levels, and long rallies are reduced to who opened and how it ended. In return, the same player tags the same rally the same way, at about 300 taps per match.

Canvas: [Rally tagging model: 4 taps per rally](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/cbe0f5ba-fcaa-4614-83b0-d36bb659e511)
