# Tagging session notes — 2026-11-12

Notes taken while tagging a set, then grouped. These are observations from use, not a build list.

## What landed

- **Match Review is the page.** Work-on, clips, highlights, and rallies together are the product. A dashboard of number blocks is the wrong shape: this is more intuitive and more visual. Seeing the rallies behind a number is what makes the number useful.
- **Clip playlists are the payoff.** Every forehand loop error in a row is the reason the tags exist. Tagging was underestimated; the reviews it generates are the output.
- **The left-to-right shot strip is a better scoreboard than the timeline.** One colour for a point won by one player, one colour for the other, with the score in the cell.

## Shot grid

- Add an **Air** result: the player swung and missed the ball.
- The review flag should be a single **Review** mark. Technical and tactical are crowding the shot boxes.
- Use the first-attack row as the pattern for flags that default off and turn on with one tap. Review is the example.
- Put a second row under First attack, one cell per shot, for “tag to view.” Take Review off the shot boxes.
- First attack is chosen only on that dedicated row. Tapping a contact does not set it.
- While tagging, outline the live contact’s box the same way the shot list below already does.
- Bring optional tags back, and show them only when that shot is selected.
- A shot can carry a short **discuss** note.

## Why the point died

- A miss caused by a lucky ball on the previous shot needs its own mark. Working name: **defining moment**. It belongs to the earlier shot, and it explains the miss.
- Add **risk** as a miss reason.
- Add **wrong shot / overplaying** (looped when the ball called for a drive).

## Momentum

Set 2 showed a visible drop: more pushing once confidence went. A tracker for aura, positive vs negative play, confident vs not, is worth thinking about.

A per-shot confidence tag will get skipped. The point strip above can show it: a run of passive strokes (push, block, chop) after errors, or a score swing, drawn as a band under those points. One optional rally mark (“passive stretch” / “aura down”) is enough when the video says something the strokes do not.

## Proof that a tag earns its place

A later audit page, on desktop, for one rally: what was tagged, what that writes in the database, and which review cards and clip playlists change.

Make it live. Tag a real or fake video, press update, and see the database diff, then the same for the dashboards. That is how a new tag such as Air or Review is checked for usefulness.

## Build session note (same day)

Organised into the Match Review plan (`match_review_feedback_and_plan_2026-11-12.md`). Product principle added there: review in the **player’s shoes** (you / your serve / your errors). Decisions locked in that plan §5; Pass 1 / clips / IA work ships against that plan.

## Where a reel is saved

**Save as reel** keeps the MP4 inside this site’s private browser storage (OPFS, a folder named `videos`, keyed by the reel’s asset id). The label, clip count, and segment map sit in the local `video_assets` table with kind `reel`. If that private store cannot take the file, it falls back to the older IndexedDB database `tt-match-videos`.

Nothing lands in Downloads or a folder that opens in Explorer. **Save to device** on a cloud-only reel copies that cloud file into the same private store. Choosing a normal folder for the MP4 is still a later step.
