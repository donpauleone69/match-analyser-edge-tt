# Edge TT Match Analyser

Table tennis match video tagging and insights. This is not the club session app called Edge TT.

The product is `app/` (Vite 7, React 19, React Router 7, Tailwind 4, TypeScript 5.9, Zustand, Vitest). The visible version is v0.17.29 in `app/src/version.ts`. Match data lives in memory and resets on reload. Device preferences persist through `app/src/stores/settingsStore.ts`. There is no database yet.

## Run and test

From the repo root:

```bash
cd app && npm install --legacy-peer-deps
npm run dev
```

Every command after that `cd` runs from `app/`. Dev server: http://localhost:5174

| Command | What it does |
|---|---|
| `npm run build` | Typecheck and production build |
| `npm test` | Vitest: rules, invariants I-1 to I-57, golden outputs. Under two minutes |
| `npm run check:rules` | Layer rules in `app/scripts/check-rules.mjs` |
| `npm run check:docs` | Cited repo paths exist, and each scanned doc is at most 200 lines |
| `npm run smoke` | Every route at 393x660 and 1440x912, plus a six-rally tagging run. Pass is 0 differing pixels |

`npm run smoke` builds and serves its own copy. No dev server is needed. It compares shots to a baseline. The default folder is `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/refactor/baseline-v0.17.29` (see `app/tests/smoke/smoke.mjs`). Point at another folder with `SMOKE_BASELINE=/path/to/shots npm run smoke`. If that folder has no `manifest.json`, smoke throws `baseline manifest missing`. Agents outside this setup run build, test, and the two checks, and skip smoke or pass their own baseline. Smoke needs Chrome at `/usr/local/bin/google-chrome`. Do not pass `--write-baseline` unless a visible change is named and agreed.

## Gate before merge

From `app/`:

```bash
npm run build && npm test && npm run check:rules && npm run check:docs && npm run smoke
```

Smoke must be 0 differing pixels. Also look at changed surfaces in a browser. Lint is not a gate.

## Where code lives

`app/src/pages/` is one thin file per route. Features (`tagging`, `match`, `matches`, `insights`, `account`) split into composers, sections, blocks, derive hooks, and `hooks/` for stateful UI hooks. The tagging handlers live in `app/src/features/tagging/hooks/useTagSetFlow.ts`. Pure domain logic is `app/src/rules/`. Shared types are `app/src/types/`. Zustand stores are `app/src/stores/`. The demo seed is `app/src/data/seed/`. Shared UI is `app/src/ui-mine/`, the only home of shadcn and lucide. Naming, layers, and the file map are in `.cursorrules`.

Routes are in `app/src/App.tsx`: `/` gate, `/matches`, `/matches/:matchId` (Insights, Details, Tag), `/matches/:matchId/tag/:setId` set tagger, `/insights`, `/account`. Any other path goes to `/`.

## Docs

| Topic | File |
|---|---|
| Product | `docs/brief.md` |
| Layers, stores, tests | `docs/architecture.md` |
| Stored data and invariants | `docs/data.md` |
| Best + FA tagging | `docs/tagging-rules.md` |
| Routes and jobs | `docs/flows.md` |
| Screen zones | `docs/layouts.md` |
| UI kit | `docs/components.md` |
| Terms | `docs/glossary.md` |
| Version history | `docs/CHANGELOG.md` |

## Old app, branches, tags

The reference app that used to live in this repo is tag `pre-refactor-v0.17.28`. Restore it beside this checkout:

```bash
git worktree add ../old-app pre-refactor-v0.17.28
```

Do not run `git checkout pre-refactor-v0.17.28 -- app`. That tag's `app/` and this tree's `app/` share 21 paths, and the checkout collides. This tree's `app/` is the product (the former proto folder, renamed in phase 5).

Run branch: `cursor/refactor-run-1886`, cut from `pre-refactor-v0.17.28`. Phase tags are `refactor-p1`, `refactor-p2`, and so on (`refactor-p5` is the last one on this branch until the next phase merges). `main` stays at `pre-refactor-v0.17.28` until that run is accepted. Do step work on a `cursor/` branch cut from the run branch. Do not push `main`, the run branch, or tags from a step.
