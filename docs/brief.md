# Product brief

Edge TT Match Analyser lets a table tennis player tag their own match video quickly, then read the tags as insights and short reels. Players come first, then coaches. Input and review are phone first. Tagging has to be fast and accurate. A blank is not an answer: leave a fact out rather than collect it badly.

The visible version is v0.18.0 (`app/src/version.ts`). The app is local. Nothing is uploaded. Matches stay in the browser database.

## Two jobs

1. Tag a match: videos, set marks, then Best + FA on one set at a time.
2. Read the tags: insights and reels for one match, or for all matches the filter keeps.

Account exports and imports match files. Sync and a real login are not built. The gate is still a stub.

## What a session is

A match has sets, a set has rallies, a rally has shots. A shot is one contact. Sides are You (`me`) and Them. Videos play in list order. Each set has one mark on those videos and may run onto the next video. There is no map from a set to one video.

Opponent, event, date, result, and set scores are optional and can be typed any time on Details. A score that disagrees with tagging is flagged Differs. The result picks the match length: best of 3, 5, or 7 (3 - 2 means five sets).

Captured: the video (or the demo stand-in), contact times, set marks, and those optional fields. Tagged: the same few answers on every rally, plus optional review marks on parts. Derived, and never stored as answers: hitter, winner from the ending, score, server, parts, stats, reels.

## How tagging feels

Eyes stay on the video. Tap each contact. Two seconds with no tap closes the rally. Then one question per screen, in contact order, on large regions. The last answer saves. When the set is won on the rule, Save set returns to the Tag page. Edit Set steps rallies and gaps. Score and server follow the edit. Mistakes are marked, not silently repaired. There is no let.

Insights are built: the same cards on a match and on `/insights`, each with a reel. Home is the Matches list. A new match opens on Tag until it is fully tagged, then on Insights.

## Rules that do not change

- Tags stay on their contacts. Derived values are recomputed.
- A rally that is still a draft is not in the score.
- A comparable tag is asked the same way on every rally, or not at all.
- The word "clip" is not used on Tag. You nudge a rally's start and end, and its shots.
