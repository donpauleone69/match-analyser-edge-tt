# Overnight sprint plan — 2026-11-13

## Goal

Club-ready usable loop: tag across matches → work-on / error playlists → highlight show-reel; strip redundant screens; optional match/opponent/tournament metadata.

## Workstreams

| # | Stream | Outcome |
|---|--------|---------|
| 1 | Foundation | Build green; `main` = review-ready tip; stale branches deleted; dead docs gone; Architecture/Glossary rewritten |
| 2 | Pass 1 UX | User-POV friction on tagging; remove redundant check/confirm screens or fold into chrome |
| 3 | Playlists & export | Error/pattern playlists + highlight show-reel clarity; export/download path; cross-match filters |
| 4 | Metadata | Optional opponent/match/tournament entry; schema check/adapt; filters “vs player / tournament” without forcing forms |
| 5 | Persistence advisory | Next-sprint note only: OPFS + Dexie vs cloud backup; recommend approach — no implementation |

## Agent rules

- Branch from updated `main` after foundation lands.
- Merge autonomously when `cd app && npm install --legacy-peer-deps && npm run build` passes.
- Do not gate on lint.
- Follow `.cursorrules` conventions.
- Prefer user-flow fixes over visual polish (light theme keep as-is unless broken).
- Demo: Prefer computer-use / screenshots of Home → tag → Review Work on → Clips.

## Sources of truth tonight

- `project-context.md`
- `preferences.md`
- `/cursor/stores/self/internal/review-ready-scan.md`
- Repo: recent chat notes + `specAddendumMVP.md` (until Architecture rewrite)
