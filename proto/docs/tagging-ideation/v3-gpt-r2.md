# Consistent closing-pair tagging

## What changed and why

This is a full redesign, not a patch. The old model wrongly inferred the point winner from a known score and collected prior-ball detail only after a miss. The new model first establishes the point result, builds the score and service order, then tags the same terminal and penultimate phases on every eligible rally. It uses about **366 taps and 11 to 13 minutes** for 80 rallies, about 99 taps and 3 minutes more than the old estimate. That extra effort buys a correct score and honest denominators.

## Sequence

Rallies must be tagged in order. From the first server and all earlier point results, the app derives the current server, receiver and hitter of every contact, including two serves each until 10-all and one each after.

1. **Terminal outcome, every point:** `Landed in`, `Net` or `Out`. Landed in means the last hitter won. Net or out means the other player won. A rare `Other` path asks which player won but is not used in comparisons. The answer updates the score and next server.
2. **Terminal wing, every point:** `Forehand` or `Backhand`.
3. **Terminal family, every point:** Serve is filled automatically on shot 1. Otherwise the user picks from a short phase-filtered strip such as push or touch, flick, topspin attack, block or counter, chop, smash or lob.
4. **Penultimate family, every point with at least two contacts:** Serve is filled automatically when the prior ball is shot 1. Otherwise use the same visible family list, filtered for that shot.
5. **Penultimate landing lane, every point with at least two contacts:** `Forehand side`, `Middle` or `Backhand side`, always from the receiver's view.

Each dimension gets its own short row. There is no two-axis button grid. The video loops only the contact being answered.

## Fields and what they unlock

| Field | Coverage | Use |
|---|---|---|
| `terminalOutcome` | Every point | Point winner, score, service order, winner versus error rates |
| `terminalWing` | Every point | Forehand and backhand closing strength |
| `terminalFamily` | Every point | Results by final stroke and opening phase |
| `priorFamily` | Every rally with a prior ball | What immediately preceded each ending |
| `priorLane` | Every rally with a prior ball | Which lane creates or absorbs pressure |

The app infers point winner, score, current and next server, receiver, every hitter, rally length, shot number, opening or rally phase, and which player each field belongs to. A comparison using terminal fields covers all points. A comparison using prior fields states its denominator as all points with at least two contacts.

## Effort budget

Assume an amateur 80-point match ends 8%, 20%, 23%, 15%, 11%, 7%, 5% and 11% on shots 1, 2, 3, 4, 5, 6, 7 and 8 plus. Six one-ball rallies need 2 taps each. Sixteen two-ball rallies need 4 each because both serve-family fields are inferred. The remaining 58 rallies need 5 each. Total: **366 taps**. Clear one-dimensional choices take about 9 minutes of active input and 11 to 13 minutes with replay and navigation.

Explicit `Same as last` is available when repeating a family. The app never silently defaults. Spin, speed, quality, intent, forced versus unforced, depth, footwork and complete middle-rally sequences are left out because they are costly, subjective or need another full-coverage pass.

## Five reasons

1. The first answer establishes the winner, so score and serving order are valid.
2. Every comparative tag is collected at a fixed phase with a stated denominator.
3. Two simple rows are easier to scan than one two-axis grid.
4. The closing pair captures both the outcome and its immediate context.
5. Every field supports a report card and a linked proof clip.

The main trade-off is coverage versus speed. This model gives up serve depth, full placement and whole-rally tactics, but the data it does collect can support fair comparisons rather than attractive claims built from selected misses.
