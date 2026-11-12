# Focal player and a loose video

_Chat notes — 2026-11-11. Brainstorm. Not built._

Diagrams live in [TableMap.md](../TableMap.md).

## What real videos look like

- The opponent is often unknown.
- The score is often unknown. The clip can start in the middle of a set.
- One file can hold several sets, one set, or a fragment of a set.
- Those clips are still worth tagging.
- You are analysing one player. The other person is whoever was across the table.

## Keep the rally two-sided. Analyse one player.

Every contact stays, including the opponent's. Shot index, first attack, who served, and the point ending are positions in that sequence. Drop the opponent's contacts and those facts move.

The opponent does not need a player record, and their shots do not need the full pills. Their contact time keeps the sequence. Placement and wing are worth tagging when you saw them, because they describe the ball the focal player received. Stroke, spin, and strength on the opponent's shots can be filled or left empty.

The focal player's shots keep the full tags. That is the analysis.

## Where the focal player lives

On the video, as `focal_player_id`. There is no login yet. When an account exists, default this to that person's player, and let a coach switch it to the student. The logged-in person is not always the person in the point.

Shots store a side: `focal` or `opponent`. Focal shots carry the player id. Opponent shots leave `player_id` empty until you learn who it was. An optional `opponent_label` ("red shirt") is enough to tag.

## What can stay unknown

- **Score.** Empty while tagging. At the end of a set, enter the scoreboard and walk it backward through the point winners. The plan is [bottom_up_tagging_plan.md](bottom_up_tagging_plan.md). Serve patterns, first-attack conversion, and errors by phase work before any score exists.
- **Set.** A boundary you mark when you see one. A video can contain several sets, half a set, or none.
- **Match, tournament, date, best of.** Attach after tagging, when the clip turns out to be a match.

## What this replaces in today's path

Today you create two players and a match before a video will open, and the match pre-creates every set. The video row already allows a full match, one set, or many sets, and a set's video context can store a null start score. The rigid parts are the required player ids on the match, the required scores on each rally, and the order of the screens.
