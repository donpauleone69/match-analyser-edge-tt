# Shot by shot: what we can infer to make it faster

Draft update for Paul, 16 Nov. Follows `sequential-tagging-logic.md`.

Shot by shot feels more natural because you answer in the order you watch. The current mode is faster for one reason: it only asks what Save needs (result, last shot, one press to place the first attack, its stroke and wing) and leaves everything else optional. Shot by shot stops on every shot up to the attack, on both replies, and on the serve, so a 6 shot rally takes about 12 presses against 7. The aim is to keep the order and win back most of those presses. We do it by working out what the rally already tells us, and by asking for a press only to confirm or correct.

What we already know before any question: how many shots there were and their timing, and who was due to serve. Once End is answered we also know who won and whether the last shot was a winner or an error. That fixes who hit every shot, so the server no longer needs its own step. That change is now built: End asks who won first, then the result, and the server follows from those two answers. That is why End first is worth testing. Asking End straight after the taps gives the walk the most to work with before the serve.

Proposed inferences, most presses saved first:

| Inference | What it saves | Risk |
|---|---|---|
| Stop only where Save needs an answer: the shots up to the attack, the attack, the last shot. Replies and serve depth are kept for a Detail pass | 2 to 3 presses a rally | Less optional data unless Detail is used |
| Move on once the required rows are in (stroke and wing), without waiting for Intent or Initiative | 1 press on the attack | Optional rows answered less often |
| No attack from End: if the last shot was Defensive and nothing was marked Offensive, offer "No attack" on End so the Defensive presses are skipped | 1 press per shot before the last on long push rallies | None, it is the existing rule |
| A one shot rally that is a serve error skips the serve stop: depth means nothing on a serve in the net | 1 press | None |
| On the last shot, light Offensive when the result is a Winner, as the current mode already guesses | 1 press when right, 1 extra when wrong | A wrong guess costs a flip |
| Timing hint: a much shorter gap after a shot usually means it was hit hard. Light Offensive on that shot as a suggestion | 1 press when right | Needs testing on real video before trusting it |
| After the first attack, light Block on the next shot (the most common reply) | 1 press when right | Same as above |

The first four are safe: they use rules we already have or skip rows nobody needs. The last three are guesses, so they only pre-light a choice that one press accepts. They should be counted in the side log, so we can see how often each guess was overturned. With the first four alone, a 6 shot rally drops from about 12 presses to about 9, against 8 in the current mode now that it asks who won.

Suggested next step: build the first four into End first only. Run the timing comparison across all three modes on the same match with your own video (it can now be swapped in from the tag page), then decide whether the guesses are worth adding.
