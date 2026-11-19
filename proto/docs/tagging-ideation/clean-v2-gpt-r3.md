# Rally Spine R3

## What changed and why

I changed the approach, rather than patching the old flow. Point winner is now the first dependency: it creates the score, score determines the server, and server plus contact order determines every hitter. The new model starts with a fast chronological result pass, then makes a separate adaptive detail pass. It adds about 10 touches and 30 to 40 seconds versus Rally Spine Adaptive, moving the 80-rally budget from about 380 touches and 12.5 minutes to about 390 touches and 13 minutes. There is no two-axis button grid.

## Sequence and fields

1. **Resolve every point in order.** Watch the last contact and tap one fixed row: Winner, Net, Long or Wide. Winner means the last hitter won. The other three mean the last hitter lost. This single token records the finish, awards the point, updates the score, determines the next server and fixes every hitter in the rally.
2. **Batch the serves.** Once result tokens establish all servers, tag serve-only clips together. Named personal serves can carry known spin and intent. Opponent serves keep only visible length. The rally flow then loads the serve profile without asking again.
3. **Name the opening.** If a receive exists, tap Touch, Push, Flick or Drive. This unlocks serve and receive patterns. Flick or Drive also sets contact 2 as the first pressure shot.
4. **Name the final stroke.** From shot 3, use separate one-axis rows for FH or BH, then Topspin, Hit, Push, Block or Chop. Result shape is already known, so it is not asked twice.
5. **Keep useful relations on longer points.** From shot 4, tap the first topspin, flick, hit or punch contact, then its side and family. Record the immediate reply. On longer error points, the app highlights the penultimate contact and asks its side and family. This preserves both the first pressure pair and the shot that caused the final problem.

## What is inferred and the tricks

The first server is known. The result pass builds game score and match score in order, including two-point service turns, one-point service turns at deuce and the first-server change between games. Current server, receiver, every hitter, last hitter, point winner and next server are then derived. Contact count and timestamps are already known.

The four-choice result row is the main trick: one easy fact replaces separate winner, finish and scoring questions. Two passes prevent score mistakes from contaminating actor labels. Rally length removes whole sections. Stored finish fields are reused when the same contact is also the first pressure shot or reply. All controls are short rows in a stable order.

## Effort budget

Using the supplied 80-rally length distribution, the result pass costs 80 fast touches and about 2.5 minutes. The serve batch costs about 50 touches. Adaptive detail brings the full budget to about 390 touches and 13 minutes, or 9.8 seconds per rally. One-shot points average 1.6 touches, two-shot points 2.6, three-shot points 4.4, and points beyond shot 7 about 8.6. The corrected givens add only the result touch on the 10 serve-only points because the same token replaces the old finish-shape touch elsewhere.

## What is left out

Winner target zone, neutral-shot placement, detailed opponent spin, speed ratings, tactical intent, good or bad labels and forced or unforced errors are omitted. They cost more attention than the reports justify.

## Five reasons

- The result pass protects the score, server and hitter dependency chain.
- One factual token does four useful jobs.
- Every control is a one-axis row, never a button grid.
- Short points stay cheap while long points earn more detail.
- Reply and cause pairs describe what to practise without quality ratings.

## Main trade-off

The result pass must stay chronological. That constraint prevents free jumping between rallies, but it makes the score and every actor label deterministic, while the later detail pass can be completed in any order.
