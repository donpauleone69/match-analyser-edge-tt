# Rally Spine Adaptive

## What changed from the first version

I would refine Rally Spine, not replace it. The opening, first pressure, reply and finish are still the smallest useful story of a rally. I changed the work order and effort model: start from the known ending, spend almost nothing on one-shot points, add fields as rallies get longer, move serves into a batch pass, and replace the 3 by 4 opening grid with quick one-axis rows. This uses more touches but less searching and less thought per touch.

## Sequence and fields

1. **Close the point.** Score and last hitter determine winner or error. A one-shot point needs no question. A two-shot point asks only receive family and finish shape. From shot 3, quick rows record final stroke side, family and either target zone or net, long or wide. This unlocks finish and error maps.
2. **Name the opening.** The serve profile is already loaded from a serve-only batch pass. The player taps touch, push, flick or drive for the receive. This unlocks serve and receive patterns. A flick or drive also sets contact 2 as the first pressure shot.
3. **Keep the first pressure pair.** Only from shot 4, tap the first topspin, flick, hit or punch contact, then its side and family. Tag the immediate reply as block, counter, push, or chop or lob. If the first pressure shot or reply is already the finish, stored finish fields are reused.
4. **Keep the final cause pair.** On longer error rallies, the app highlights the penultimate contact automatically. Two quick rows store its side and family. This links the miss to the shot that created it without asking whether the error was forced.

## Inference and tricks

Contact count, hitter order, server, score, point winner, last hitter, timestamps and rally length are never asked. Rally length removes whole sections. Earlier answers filter later rows. One-shot points are complete from the serve batch. An attacking receive removes first-attack selection. Finish fields are reused when the same contact is also the attack or reply.

Serve clips are tagged together. Named personal serves store the player’s normal spin and intent; opponent serves use visible length only. Batch selection and exception correction cost about 50 touches across the match. No silent defaults are saved.

## Effort budget

For 80 rallies, I assume the supplied tour distribution: 10 end on shot 1, 14 on shot 2, 21 on shot 3, 10 on shot 4, 9 on shot 5, 5 on shot 6, 3 on shot 7 and 8 later. Club play may be a little shorter, so this is conservative. The budget is about 380 touches and 12.5 minutes, or 9.4 seconds per rally including the serve batch. One-shot points average 0.6 touches, two-shot points 2.6, three-shot points 4.4, and points beyond shot 7 about 8.6. The extra work on long rallies buys the first pressure relation and the shot before the miss.

## What is left out

Neutral-shot placement, detailed opponent spin, speed ratings, tactical intent, good or bad labels and forced or unforced errors are omitted. They are slower or less repeatable than the reports they would support.

## Five reasons

- It keeps the proven Rally Spine data graph but makes effort follow rally value.
- Simple rows are faster and easier than one dense grid.
- Short points close quickly while long points preserve cause.
- The next ball measures attack effect without a quality rating.
- Batch serve tagging removes repeated questions from the rally flow.

## Main trade-off

This model spends more touches than the first version. In return, each choice is clearer, the match can still be completed in one focused sitting, and long-rally weaknesses become specific practice pairs rather than broad error counts.
