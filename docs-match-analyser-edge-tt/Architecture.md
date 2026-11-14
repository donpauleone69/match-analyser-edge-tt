# Edge TT Match Analyser — Architecture

> **Version:** 4.0  
> **Last Updated:** 2026-11-13  
> **Status:** Source of Truth for structure

Separate from the Edge TT club session app. Same sport domain; independent codebase.

---

## Product loop

**Home → Pass 1 tag a set → Match Review (Summary / Work on) → Clips playlists → optional fix tags → Review again.**

- Playlists of tagged shots/rallies (errors, patterns, work-on) are the coaching payoff.
- **Highlight** = show-reel / enjoyment path (same clip machinery).
- Numbers on Review are problem detectors that open playable evidence — not a dashboard product.
- Inference engine is **retired** (`rules/infer` is an empty stub).

Optional future: a Pass 2 *detail* run to unlock richer cards. Not required for the core loop.

---

## Stack

| Layer | Choice |
|-------|--------|
| UI | Vite, React 19, TypeScript, Tailwind 4, React Router |
| Feature state | Zustand (`cloudStore`; legacy `taggingSessionStore` unused by Pass 1) |
| Domain data | Dexie → IndexedDB (source of truth on device) |
| Video bytes | OPFS via `video_assets` (+ optional cloud mirror later) |
| Pure logic | `app/src/rules/` (no React, no IO) |
| UI kit | `app/src/ui-mine` (features never import `@/components/ui` or lucide) |

Install / build gate (agents):

```bash
cd app && npm install --legacy-peer-deps && npm run build
```

Lint is not a merge gate.

---

## Folder roles

```
app/src/
  pages/           # Thin routes → composers
  features/        # composers / sections / blocks / derive / models
  rules/           # Pure calculate / derive / validate / analytics helpers
  data/            # Dexie schema, entity CRUD, cloud helpers
  stores/          # Zustand UI/session
  ui-mine/         # Shared visual components
  components/ui/   # shadcn primitives (ui-mine only)
  components/layout/
```

See `.cursorrules` for naming and import rules.

### Active features

| Feature | Job |
|---------|-----|
| `home` | Continue tagging, recent matches, clip shortcuts |
| `shot-tagging-engine` | Pass 1 Focus (and Rally Focus / single-rally edit) |
| `match-review` | Per-match hub + multi-match `/review` scopes |
| `clips` | Preset playlists, reel export UI |
| `match-management` | Match list / create |
| `account` | Gate + Hero / focal player |
| `training` | Training posts stub |

Off-path / legacy UI may still exist under `analytics`, club/player/tournament management, `data-audit` — routes redirect home. Prefer deleting when touching nav. Keep `rules/analytics/*` used by Match Review.

---

## Routes

| Path | Screen |
|------|--------|
| `/` | Library home |
| `/matches`, `/matches/create` | Matches |
| `/matches/:id` | Match Review (`summary` · `details` · `workon` · `clips` · `highlights` · `rallies`) |
| `/matches/:matchId/tag` | Pass 1 full-screen |
| `/matches/:matchId/edit-rally` | Edit one rally |
| `/clips` | Cross-match clips |
| `/review` | Scoped multi-match review |
| `/training` | Training |
| `/settings` | Account & data |

---

## Data & video

1. **Dexie** holds matches, sets, rallies, shots, players, tournaments, `video_assets`, training posts.
2. **Video:** stable asset id + fingerprint; device copy in OPFS; resolve local → missing (honest). Times are **source-video seconds**.
3. **Clips** are derived (`rules/derive/clips`), not stored rows. EDL merges intervals; optional gameplay reel via ffmpeg.wasm stream copy.
4. Cloud/Supabase sync exists as foundation code but is **out of overnight scope** — local-only is enough for the usable loop.

IDs are human-readable slugs. Schema detail: `DataSchema.md`.

---

## Pass 1 tagging

- One chrome: WTT-style scorebug + set context + shot rails (classic dual chrome removed).
- User taps contacts, marks first attack / end / review flags, saves rallies.
- Contact click-latency buffer applied at capture (~300 ms); playback uses stored times.
- Entry from Match Review set panel (not a separate set-selection modal).

---

## Review & clips

- **Summary:** category nav + playable point lists. **Serve Data** / **Receive Data** are curated example pages (headlines → few cards → playlist focus → shots).
- **Work on:** hero-first patterns → evidence → playlist.
- **Clips:** presets (errors, opening attacks, highlights, …); Whole rally (default) ↔ Shot; slow-mo rates.
- Cross-match: `/clips` and `/review?scope=…`.

---

## Sources of truth

| Doc | Use |
|-----|-----|
| This file | Structure & product loop |
| `DataSchema.md` | Entities / Dexie |
| `Glossary.md` | Terms |
| `specs/specAddendumMVP.md` | Changelog of decisions |
| Recent `chat_notes/` (forward plan, match review plan, team brief) | Session intent |

CSS tokens in `app/src/index.css` win over older design-system prose.
