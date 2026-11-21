# Changelog

Visible version: v0.17.28 in `app/src/version.ts`. The old reference app's v3.x log left with that app in phase 5. This file is the proto line that became `app/`, condensed from the version notes, the tags, and that removed log's proto entries.

## Unreleased: refactor phases 0 to 6

No tagging or scoring change. The version stays v0.17.28.

- Phase 0. Save point. Tag `pre-refactor-v0.17.28`. `main` is that commit.
- Phase 1. Vitest. Rules tests, invariants I-1 to I-57, golden JSON, page smoke. Tag `refactor-p1`.
- Phase 2. Layer rules and `.cursorrules`. Tag `refactor-p2`.
- Phase 3. Types, pure `app/src/rules/`, Zustand `app/src/stores/`, screens split into composers, sections, blocks, derive hooks, and `hooks/`, then `app/src/ui-mine/`. Tag `refactor-p3`.
- Phase 4. Shared filters, formatters, cards, badges, and the rules that keep them shared. Tag `refactor-p4`.
- Phase 5. Legacy values removed from types and readers. Stale scripts and root leftovers removed. The reference app deleted. The product folder renamed to `app/`. Tag `refactor-p5`.
- Phase 6. These docs. `AGENTS.md`, `.cursorrules`, and `docs/`. The old doc trees removed. `npm run check:docs`.

Run branch: `cursor/refactor-run-1886`.

## v0.17

| Version | What shipped |
|---|---|
| v0.17.28 | Global Insights: the five cards pooled across the filter (dates, opponent, event), Usual, demo reseed of 14 matches. Tag `pre-refactor-v0.17.28` |
| v0.17.27 | Set over follows the rule only. Overrun pad leads with Edit Rally, then Remove. Save at the mark or the video end is ended early when there is a leader. A level score stays incomplete until Details has a score |
| v0.17.26 | Match Insights from saved rallies: Phases, Serve, Receive, Attack, End. A card turns over for the definition. Reel download stays disabled |
| v0.17.25 | Matches rows: opponent, date, result, event, one status. Filter is opponent, event, status |
| v0.17.24 | After End, the rally head already shows the next rally, its server, and the new score. The 2 s bar sits on the rally zone's bottom edge |
| v0.17.23 | One card per video. A set row expands in place. Details can use the tagged result. Touching a card's bar plays that video |
| v0.17.19 to v0.17.22 | One top row. Matches is home. Nav is a bottom bar in portrait and a left rail in landscape, hidden inside a match. Save set is live when the set is won. Review chips and set pills jump to a part |
| v0.17.15 to v0.17.18 | Rally zone and set zone each have one layout. Rally zone is 64 px. The star opens review. Input area is two columns, and two wings in landscape. Rally 1 asks who served after the taps |
| v0.17.9 to v0.17.14 | Tag page is the videos and the set marks. A set can cross videos. Edit Rally is the pad that opens on shot 1. A gap under 1 s is not an insert. The first serve break outlines its pill |
| v0.17.0 to v0.17.8 | One mark per set. Edit Set steps rallies and gaps. Insert from a gap. A gap of 9 s or more takes a warning. Marks do not overlap. Set numbers stay in order |

## v0.13 to v0.16

| Version | What shipped |
|---|---|
| v0.16.6 to v0.16.12 | Sequential and Spine removed. Best + FA is the only flow. Seek bar on the picture. Edit Set stays on the pills. The open rally is a dashed pill |
| v0.16.0 to v0.16.5 | Serve landing quadrants. Phone landscape puts the video in the middle and the input in the wings. Version shown in video Settings |
| v0.15.0 to v0.15.1 | Questions go in contact order, End last. An untouched v0.15.0 Best timing save still migrates to the later defaults (`app/src/stores/settingsStore.ts`) |
| v0.13.1 | End was asked first, with Who attacked first. Later versions dropped that order. The question is not shown now |

Earlier than v0.13.1 the written notes do not name a v0.1. The git tags `proto-tagging-pass-1`, `proto-tagging-pass-2`, and `proto-tagging-pass-3` are that earlier tagging work. `pre-overnight-2026-11-12` and `pre-proto-main` bracket the reference app and the proto merge.
