# Table links and a shorter path to tagging

_Chat notes — 2026-11-11_

Brainstorm only. No schema change.

Diagrams: [TableMap.md](../TableMap.md). The follow-up on a focal player and messy real videos: [focal_player_and_loose_video.md](focal_player_and_loose_video.md).

## How the tables link

```
Club (optional)
  ├─ Player.club_id
  └─ Tournament.host club

Tournament (optional)
  └─ Match.tournament_id

Player  ──required──►  Match (player 1, player 2)
                         ├─ MatchVideo (also copies both player ids)
                         └─ Set (one per best-of, created empty)
                              └─ Rally
                                   └─ Shot
```

Player ids are copied downward: match, video, set winner / first server, rally server / receiver / winner, shot player.

`player_profiles` and `player_skill_metrics` exist as empty stubs. `shot_inferences` was removed in Dexie v4.

## What you must do today before Rally Focus

1. Create two players (first name, last name, handedness). Club and playstyle are already optional.
2. Create a match (both players, date, best of). That auto-creates that many empty sets at 0–0. Tournament and round are optional.
3. Open a set. Pick the video inside the tagger. Set the starting score and who serves next there.

Set final scores are not required to start. They are an optional edit in the set picker, and tagging overwrites the running score as each rally saves.

`Match.first_server_id` is stored as the placeholder `'player1'`, not a real player id. The real server is chosen per set during setup.

## Required to tag one rally vs nice to have

A saved rally only needs a set id, two player ids, who served, the score before (0–0 is fine), contact times, and the pills. `video_id` on the rally can be null.

| Needed to tag | Nice to have, any time |
|---|---|
| Two sides | Real player records, handedness, club, playstyle |
| Who served this rally | Tournament, round, date, best of |
| Contact times and the pills you fill | Set scores and match result |
| A place to hang the rally (today: a set) | A `match_videos` row (playback can be a local file) |
| | Score before / after, once endings are known |
| | Highlight, corrections, tagging-phase flags |

## Ways to loosen it

- Let a clip be video + rallies first. Promote it to a set and a match later.
- Allow the two sides to stay labels until you attach player records.
- Stop copying both player ids onto `match_videos`. The match already has them.
- Create a set when tagging starts, instead of pre-creating every set from best of.
- Treat scores as derived. Never a step before tagging.
