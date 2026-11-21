# Architecture

Vite app in `app/`. Entry `app/src/main.tsx`, routes in `app/src/App.tsx`, version in `app/src/version.ts`. Folder law is `.cursorrules`. This file is the shape of the code that is here.

## Layers

| Layer | Path | May do |
|---|---|---|
| Pages | `app/src/pages/` | Read route params, render one composer |
| Features | `app/src/features/` | Composers read stores and pass props. Sections and blocks do not import stores or `app/src/data/` |
| Derive | `derive/` inside a feature | `useDerive*` view models |
| Hooks | `hooks/` inside a feature | Stateful UI (player, guards). Tagging handlers: `app/src/features/tagging/hooks/useTagSetFlow.ts` |
| Rules | `app/src/rules/` | Pure functions. No React, no storage, no clock except a `today` argument |
| Types | `app/src/types/` | Types and fixed vocabularies. No functions |
| Stores | `app/src/stores/` | Zustand actions. The only writers of match state and of device preferences |
| Data | `app/src/data/seed/` | Deterministic demo matches (`buildSeed.ts`, `script.ts`) |
| UI kit | `app/src/ui-mine/` | Visual components. The only importer of `lucide-react` |
| Layout | `app/src/layout/` | Shell, header, sticky chrome |

Features: `tagging`, `match`, `matches`, `insights`, `account`. The file list is the file map in `.cursorrules`.

## Stores

`app/src/stores/matchStore.ts` holds the 14 seed matches plus edits made this visit. Actions call pure ops in `app/src/rules/matchOps.ts` and `app/src/rules/match.ts` through `mutateMatch`. A reload drops those edits. `setDemoMode` switches filled and empty and is also stored by settings.

`app/src/stores/settingsStore.ts` owns theme, demo mode, Best timing, the Matches filter, the Insights filter, and test speed. `myHandedness` is there too, null with no writer and no storage key until phase 10. It reads `localStorage` or `sessionStorage` at start and writes in the action. There is no persist middleware.

## Data flow

A page renders a composer. The composer selects store state, calls a derive hook, and passes view models and callbacks down. A callback calls a store action. The action runs a rules function and replaces the match. Derived facts (score, server, parts, insights, reels) are computed when read, not written back onto the rally, except `winner`, `server`, and `idea`, which the user set. `fa` is derived on save (`bestOpener` in `app/src/rules/bestFa.ts`).

Video time is seconds inside one video. A match clock is the videos laid end to end in list order (`segmentsOf` in `app/src/rules/timeline.ts`). Reordering videos does not rewrite rally times.

## Tests and the gate

From `app/`, in order: `npm run build`, `npm test`, `npm run check:rules`, `npm run check:docs`, `npm run smoke`.

- `app/tests/lib/app.ts` is the only test module that imports `app/src`. Other tests import the shim.
- `app/tests/rules/` is one file per rules module.
- `app/tests/invariants/catalog.ts` is I-1 to I-57 over the seed and over the seed read back from rows (plus the unnumbered `set-states` check). `app/tests/invariants/rows.ts` is I-58 to I-61 over the rows.
- `app/tests/golden/` is the derived JSON the suite must match, from the seed and from rows.
- `app/tests/smoke/smoke.mjs` builds, serves, screenshots, and compares. Baseline and `SMOKE_BASELINE` are in `AGENTS.md`.
- `app/scripts/check-rules.mjs` enforces the layer table. `app/scripts/rules-allowlist.json` may only shrink.
- `app/scripts/check-docs.mjs` checks paths cited from `AGENTS.md`, `.cursorrules`, `docs/`, and `app/README.md`, and the 200 line cap.

Do not loosen a test or rewrite a golden or a smoke baseline unless the change is named.

## Not in this tree

Phase 7 designed the database: schema v1 in `app/src/types/db.ts`, mapping and checks in `app/src/rules/`, columns in `docs/data-fields.md`. Phase 8 adds Dexie, repositories, and on-device video. Phase 9 adds a file reference beside these docs, and a check that every source file is listed. None of that code is here. Match rows still reset on reload.
