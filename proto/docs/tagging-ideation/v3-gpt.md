# Two-ball bookend tagging

## Sequence

Each rally opens on a short loop around the last contact. The app already knows the hitter, server, score, shot number and point winner. It therefore states, rather than asks, whether the last contact was a clean finish or a miss.

1. **Last ball:** Pick its visible stroke family. Shot 1 is already known as a serve, so this question disappears. The menu is filtered by phase: receive shows push or touch, flick and topspin attack; later balls add block or counter, chop, smash and lob.
2. **Result detail:** For a clean finish, tap its landing zone on a six-zone table. For a miss, tap net, long, left, right or other fault.
3. **Ball before a miss:** Replay the prior ball. Pick its stroke family and landing zone. If it was shot 1, its family is already serve, so only the zone is asked. This is recorded as the preceding ball, not labelled as the cause.
4. **Own-serve pass:** At each game break, run through the player's serves whose zones are still missing. Each needs one table tap. Previously tagged serves are skipped.

The six zones are short or deep, crossed with forehand, middle or backhand. A zone means the first bounce on the receiver's side. Stroke families have short video examples and visible definitions based on racket path and contact position.

## Fields and value

| Field | What it unlocks |
|---|---|
| `lastFamily` | Winners and misses by stroke, phase and player |
| `finishZone` | Where clean winners land and which lanes are exposed |
| `missExit` | Net, long and directional technique patterns |
| `priorFamily`, `priorZone` | The ball immediately before a miss, including pressure patterns |
| `ownServeZone` | Honest serve-location win rates across every own serve |

Inferred fields are rally length, shot number, hitter, receiver, server, point winner, opening or rally phase, clean finish or miss, and whether the event belongs to the player or opponent. No user answer duplicates them.

## Effort budget

Assume amateur play ends 8%, 20%, 23%, 15%, 11%, 7%, 5% and 11% on shots 1, 2, 3, 4, 5, 6, 7 and 8 plus. That is 66% through shot 4. Assume 65% of points end with a miss.

For 80 rallies, the ending pass costs about 238 taps. About 29 own serves still need a zone in the batch pass, for **about 267 taps and 8 to 10 minutes** including replay and switching. Shot 1 averages 1 tap, shot 2 about 2.7, and later rallies about 3.1 to 3.3. Long rallies cost no more unless they end in a miss because their middle contacts add little to the first report.

## Tricks

The app replays only the contact being answered, keeps the table in the same orientation as the video, removes impossible choices, skips known serve families, reuses any serve zone already tagged, and offers an explicit repeat-last gesture in the serve batch. Nothing defaults silently.

## Left out

Spin, speed, quality, forced versus unforced, intent, footwork and full shot-by-shot routes are omitted. They are hard to judge consistently or expensive to collect. Serve spin could be an optional later layer for a player tagging their own known intentions, but it should not contaminate the core data.

## Five reasons

1. It asks about visible facts, so two passes through the same rally agree.
2. It spends effort on the ending pair, where outcome and pressure meet.
3. Short points are genuinely short to tag.
4. Own-serve coverage stays complete through a fast batch pass.
5. Every field supports a player-facing finding with linked video proof.

The main trade-off is deliberate: this model cannot reconstruct whole-rally tactics. It gives up complete sequences to deliver reliable finish, mistake, pressure and serve-location evidence in one short post-match session.
