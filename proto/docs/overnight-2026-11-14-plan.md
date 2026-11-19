# Overnight plan — 14→15 Nov 2026 (Europe/London)

**Goal:** Cohesive, refined product by morning — video chrome unified, clutter cut, playlist UX reinvented, Serve/Receive example pages, tagging contacts polished. Continuous iterate/test; coordinator unblocks stalls. Do not wait on Paul.

**Sprint framing (Paul addendum):** This is a **usability + refinement + UX** overnight — not six disconnected features. Every track must **tie the product together**: same video language, quieter surfaces, playlists that connect stats↔shots↔video, tagging that feels continuous. Prefer cohesion over novelty.

## North stars
1. **One video control language** — tagging overlay is canonical; score + transport consistent everywhere.
2. **Less noise** — Clips / Work on / Rallies / History feel like one product.
3. **Playlist navigation** — kill click-scroll-up hell; Spotify/YouTube-class browse (History-style disclosure / stacked pickers).
4. **Serve + Receive as proof** — stats page + supporting playlist + curated shot cards (streamlined, not card spam).
5. **Tagging contacts** — giant button refined; timeline marks for rallies (winner/server colour) better than the removed version.

## Ambition tracks (parallel)

| Track | Outcome | Owner style |
|-------|---------|-------------|
| **A Video chrome** | Shared overlay player + score HUD; migrate Clips/Work-on/Rallies/Review | Cloud PR slice(s) |
| **B Surfaces declutter** | IA pass: drop redundant chrome, tighten lists, theme tokens | Cloud + UX |
| **C Playlist shell** | New browse pattern (dropdown/stack); wire tags↔videos↔lists | Cloud feature |
| **D Serve / Receive** | Stats + playlist pages; curated dashboards | Cloud feature |
| **E Tagging contacts** | Button refine + rally timeline on video | Cloud Pass1 |
| **F Iterate loop** | Smoke, screenshots, fix→retry until morning | Coordinator + workers |

## Morning surprise checklist
- [x] Overlay controls + score on main video surfaces
- [x] Clips / Work on / Rallies visibly quieter
- [x] Playlist nav without constant scroll-up
- [x] Serve page + Receive page with stats + playlists
- [x] Contacts UI refined + timeline marks
- [x] Theme tokens consistent
- [x] Surface on latest main + notes — [morning walkthrough](overnight-2026-11-14-morning.md) · [sprint board](overnight-sprint-board.md) · [smoke checklist](overnight-2026-11-14-smoke.md)


## Constraints
- Pass 1 tagging rules doc remains SoT for tagging logic.
- Merge gate: `npm install --legacy-peer-deps` + `npm run build`.
- Prefer thin stacked PRs; keep iterating overnight.