# Match Review feedback & next-session build plan

**Date:** 2026-11-12  
**Context:** After the overnight Match Review + Clips ship, the user tagged a set and reviewed the result. This note captures what to keep, what to change, and a phased plan for the next overnight-style session.

This plan **supersedes / organizes** the raw tagging feedback in [`tagging_review_notes_2026-11-12.md`](./tagging_review_notes_2026-11-12.md) into build order. Overnight shipping context stays in [`forward_plan_overnight.md`](./forward_plan_overnight.md).

---

## 1. Verdict — what landed / keep

- **Match Review is gold** — especially **Work on** plus clips/highlights of the rallies behind a problem. Better than a dashboard of number blocks: more intuitive and visual.
- **Clip playlists are the product payoff.** Example: every FH loop error in a row. Tagging was underestimated; reviews generated from tags are the output.
- **Left-to-right shot strip** beats the timeline as a scoreboard: colour by who won the point + score in the cell.
- Overnight already shipped (do not rebuild): video assets / OPFS, clips / reels, cloud sync foundation, real Home / nav, re-tag from rally, Serve / Receive cards from Pass 1. See `forward_plan_overnight.md` § What shipped.

---

## 2. Feedback grouped

### Tagging / Pass 1

From `tagging_review_notes_2026-11-12.md` + this review session:

| Ask | Detail |
|-----|--------|
| **Air** result | New miss/result: swung and missed the ball. |
| **Review** flag | Collapse Technical / Tactical crowding on shot boxes into a single **Review** mark. |
| First-attack row pattern | Default-off quick toggles (tap on). Put a second row under first attack for “tag to view”; **remove Review from shot boxes**. |
| First attack only on its row | Selectable only from the dedicated first-attack row — not by tapping a contact. Live contact should **outline** the relevant box like the shot list already does. |
| Optional tags on select | Bring optional tags back; show when that shot is selected. Discuss / notes on a shot. |
| Miss reasons / capture | Defining moment (lucky previous shot caused the miss — mark on earlier shot); risk; wrong shot / overplaying. |
| Momentum / aura | Passive play when confidence drops — derive from the strip or a light rally mark, **not** per-shot spam. |
| Future audit page | Tag → DB diff → which dashboards / playlists change (desktop test harness). |

### Clips

- **Shot vs whole rally** toggle for playlists where the tagged thing is a shot (Work on, opening attacks, similar). **Whole rally is the default.** Shot mode shows just the shot window.
- **Slow motion** option in clip / video playback.

### Overview / Match Story

- Current comparison cards (`CompareCardBlock` wall under Overview — sections A Match story, B/C Serve/Receive, D First attack, F Misses) feel like one big list — not useful enough.
- Recategorize Match Story into **navigable categories**, e.g. Match Story, Serve, Receive, Receive Summary, First attack, Misses, …
- Each category should show **stats and playlist-like lists of the points** (like Clips), with player (hero / player1) stats — more navigation than a wall of cards.
- Later refinement: **stats identify problems → create clips** (stats as problem detectors that feed playlists, not just numbers). Evidence already opens rally lists; push further toward clip playlists.

### Match Review chrome / IA

- Matches / Review should **not** keep the heavy top block above every tab (result, tagging status, archive, sets, storage).
- Move that into Overview renamed toward **Details** (or split):
  - **Summary** = narrative / what the match says / category navigation into story areas
  - **Details** = result, tagging progress, archive, set management, storage
- Cleaner tab chrome overall. Today tabs: Overview · Work on · Clips · Highlights · Rallies (`MatchReviewComposer`).

### Visual consistency

- Apply the overnight Match Review / app visual scheme to the **tagging UI** so Pass 1 feels consistent with what was built last night.

---

## 3. Product direction (short)

Insights + playlists beat dashboards. Pass 1 exists to feed **Work on** and **Clips**; Match Review should get the player to “what should I work on?” and “show me the rallies” in few clicks. Numbers earn their place only when they open playable evidence. Aligns with the product loop in `forward_plan_overnight.md`: Record → tag (Pass 1) → Review → Work on → Clips → (optional) fix tags → Review again.

### Player’s shoes / first-person review (principle)

The app should feel like standing in the user’s (hero / player1) shoes while reviewing a match — **you / your serve / your errors / what you should work on** — not a detached scout report about “Player A.”

Already in this voice (keep and extend):
- Takeaways use “You…”
- Work on is hero-first
- Scouting folded into the hero story rather than a separate scout brief

Extend the same voice into:
- **Summary** category labels and copy (“Your serve”, “Points you lost”, …)
- **Clips** preset / playlist labels where they describe the hero’s shots or points
- **Details** framing (still factual, but “your match / your sets” not generic admin chrome)
- **Pass 1** prompts and flags where first-person helps (“tag to view” / review for later)

When both sides appear for comparison, lead with the hero; villain is the foil, not the co-protagonist.

---

## 4. Build plan — next overnight-style session

MVP-first, same shape as overnight: ship visible slices, respect architecture (composers / sections / blocks / derive / models; pure `rules/`; features use `@/ui-mine` not lucide / `@/components/ui`; update `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` when significant).

### Phase 1 — Quick wins / Clips playback

| | |
|--|--|
| **Goal** | Shot↔rally playback control + slow-mo on clip stage. |
| **User-visible** | On shot-based playlists (Work on / opening attacks / similar): toggle **Whole rally** (default) vs **Shot**; playback window follows. Slow-mo control on clip/video player (rates TBD). |
| **Touch areas** | `features/clips/` (`ClipStageBlock`, composer / actions); clip window derivation in `rules/derive/clips/` (or nearby); possibly shared video player controls if used from Match Review evidence too. |
| **Dependencies** | Existing clip presets + EDL / per-clip windows. |
| **Out of scope** | New presets, reel export changes, cloud. |

### Phase 2 — Match Review IA (chrome)

| | |
|--|--|
| **Goal** | Strip heavy chrome above every tab; split Overview into Summary vs Details. |
| **User-visible** | Lighter tabs; match result / set panels / storage / archive live under **Details** (or similar); **Summary** is the narrative entry (takeaways + category nav — can be a thin shell until Phase 3). Confirm final tab set (Work on / Clips / Highlights / Rallies stay unless decided otherwise). |
| **Touch areas** | `features/match-review/composers/MatchReviewComposer.tsx`, `TabBarBlock`, `SetsPanelSection`, `MatchStorageBlock`, new or renamed sections; route query `tab=` params. |
| **Dependencies** | Naming decision (open questions). |
| **Out of scope** | Reworking card content itself (Phase 3); Pass 1 UI. |

### Phase 3 — Overview → category navigation + evidence playlists

| | |
|--|--|
| **Goal** | Replace the wall of comparison cards with navigable story categories that mix stats and point/playlist lists. |
| **User-visible** | Categories (Match Story, Serve, Receive, …); each shows hero/villain stats **and** playable lists of points (Clips-like). Direction: stats → problems → clips (problem detectors feed playlists). |
| **Touch areas** | `OverviewSection` / new category sections & blocks; `buildMatchReview.ts`, `buildServeReceiveCards.ts`, models; reuse Clips embed or evidence → `encodeClipFilter` patterns already in composer; `rules/analytics/*` as needed for grouping. |
| **Dependencies** | Phase 2 IA shell preferred so Summary owns this surface. |
| **Out of scope** | Full Pass 2 cards; every locked section unlocked; cross-match Work on (still “next” in overnight forward plan). |

### Phase 4 — Pass 1 tagging UX

| | |
|--|--|
| **Goal** | Review row, Air, first-attack-only selection, live outline, optional tags on select, visual restyle to Match Review scheme. |
| **User-visible** | First-attack row remains the only place to mark first attack; second row for Review (“tag to view”); Air in results; outline on live contact; optional tags + discuss appear on shot select; tagging UI looks like overnight Review. |
| **Touch areas** | Tagging feature composers/sections/blocks; Pass 1 models/store actions; pure validation/calculate in `rules/` for Air / Review; styles aligned with Review tokens. |
| **Dependencies** | Decide fate of Technical/Tactical (open questions). Visual tokens from Review. |
| **Out of scope** | Full miss-reason taxonomy UI (Phase 5); momentum UI. |

### Phase 2b — Match Details context (player-centric)

| | |
|--|--|
| **Goal** | Make **Details** the place to record / edit match context from the hero’s shoes: date, opponent (player entity), tournament + round — so later “all matches vs X / tournament reviews / over time” views are honest. |
| **Principle** | You (hero / `player1_id`) are the focal player on most matches. Opponent is `player2_id` (player entity, not a free-text name). Date + tournament/round are reviewable context, editable in Details. Prefer existing Dexie tables; strip recording ceremony / dead modals that fight the Review hub. |
| **User-visible** | Details: edit match date (with honest source: video file lastModified vs manual — **no fake EXIF**); pick or create opponent; optional tournament + round. Pre-fill date from video when the browser exposes `File.lastModified` and the user hasn’t locked a manual date. First-person copy (“Your match”, opponent name clear). |
| **Touch areas** | `DBMatch` (+ optional `match_date_source`); `DBVideoAsset.file_last_modified_ms`; `DetailsSection` / new context block; `MatchReviewComposer` + actions; `storeSetVideo` date apply; pure helpers in `rules/`; simplify Matches list “Details” modal → Review `?tab=details`. |
| **Dependencies** | Phase 2 Details tab (shipped). |
| **Out of scope** | Global analytics suite (all matches vs player dashboards, tournament review pages). Structure only. |

### Phase 5 — Capture model extensions

| | |
|--|--|
| **Goal** | Miss reasons, defining moment, discuss notes — after UX skeleton so tags earn place. |
| **User-visible** | Can mark defining moment on the earlier shot; risk / wrong-shot-or-overplaying on misses; short discuss note on a shot. Feeds later Work on / Misses story. |
| **Touch areas** | Data schema / store fields (`DataSchema.md`); `rules/` validate + derive; tagging blocks; Match Review miss cards / Work on when useful. |
| **Dependencies** | Phase 4 UX places for optional-on-select tags. Prefer Phase 2b if time-constrained. |
| **Out of scope** | Momentum bands; audit page. |

### Phase 6 — Later: momentum / audit

| | |
|--|--|
| **Goal** | Aura / passive stretch from strip or light rally mark; desktop audit: tag → DB diff → which cards/playlists change. |
| **User-visible** | Optional rally-level momentum mark or derived band under the point strip; live audit page for proving a tag (e.g. Air, Review) earns its place. |
| **Touch areas** | Strip / rally mark UI; derive rules; new Tools-style page (desktop). |
| **Dependencies** | Stable Pass 1 + Review playlist mapping. |
| **Out of scope** | For this next overnight — schedule after Phases 1–5 unless time remains. |

### Conventions to respect while building

- Folder roles: composers → sections → blocks; derive hooks + `models.ts`; pure logic in `rules/` only.
- Features: `@/ui-mine` / `@/ui-mine/Icon` — never lucide or `@/components/ui` from features.
- Significant behaviour / schema / UX: update `specAddendumMVP.md` (+ version history).
- Do not contradict overnight architecture (Dexie source of truth, OPFS assets, clip rules derived not stored) unless explicitly revising that plan.

---

## 5. Decisions locked (2026-11-12 session)

1. **Tabs:** **Summary** + **Details** as tabs; keep **Work on**, **Clips**, **Highlights**, **Rallies**. Overview chrome (result / tagging / archive / sets / storage) moves under Details.
2. **Shot / rally toggle:** On **all shot-based presets** (Work on, opening attacks, similar). Default = **whole rally**. Shot mode uses the existing shot window.
3. **Review flag:** Single **Review** = on/off “tag to view” on the row under first attack. **Technical / Tactical** optional when a shot is selected (so Work on grouping still works when set) — not always-visible pills on every box.
4. **Slow-mo:** Cycle **1× → 0.5× → 0.25× → 1×** (or compact select with those rates).
5. **Summary categories (first cut):** Match Story, Serve, Receive, First attack, Misses (Receive Summary can fold into Receive if thin).
6. **Defining moment:** Explicit mark on the earlier shot when Phase 5 allows — not auto-attached to previous contact.
7. **Match context (Phase 2b):** Hero remains `player1_id`. Opponent is `player2_id` (player entity; pick or create from Details). Tournament optional FK + existing `MatchRound` enum. Date = ISO `YYYY-MM-DD` on match; `match_date_source` optional (`manual` \| `video`); video date = browser `File.lastModified` only (honest fallback to manual). Clubs/tournament entities kept; list-page Details modal routes into Review Details instead.

---

## 7. What shipped this session

| Phase | Status |
|-------|--------|
| Principle: player’s shoes / first-person | Done (§3 + copy across Summary / Clips / Details / Pass 1) |
| Phase 1 — Clips shot/rally + slow-mo | **Shipped** — Whole rally default; 1×/0.5×/0.25× cycle |
| Phase 2 — Summary + Details IA | **Shipped** — tabs Summary/Details/Work on/Clips/Highlights/Rallies; chrome under Details |
| Phase 3 — Category nav + playlists | **Shipped** — category tiles + hero stats + Points for you playlist |
| Phase 4 — Pass 1 UX | **Shipped** — Review row, Air, FOS-only-from-row, dark strip, optional kind on select |
| Phase 2b — Match Details context | **Shipped** — date + opponent player + tournament/round in Details; video lastModified prefill; list Details → Review tab |
| Phase 5 — Capture extensions | **Deferred** — defining moment / risk / wrong-shot / discuss notes (after 2b) |
| Phase 6 — Momentum / audit | **Deferred** |
| `specAddendumMVP.md` | **Updated** — v3.40.0 |

**Decisions locked this session:** see §5; Phase 2b decisions: hero = `player1_id`, opponent = `player2_id` entity, ISO `match_date` + optional `match_date_source` (`manual` \| `video`), no invented EXIF.

---

## 6. Links to related notes

| Note | Role |
|------|------|
| [`tagging_review_notes_2026-11-12.md`](./tagging_review_notes_2026-11-12.md) | Raw Pass 1 / strip / miss / momentum / audit notes from the tagging session; this plan organizes them for build order. |
| [`forward_plan_overnight.md`](./forward_plan_overnight.md) | Product loop, architecture (assets/OPFS/sync), what shipped overnight, longer “next/later” backlog. |
| `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` | Changelog to update when phases land. |
| Code anchors | `app/src/features/match-review/` (esp. `derive/buildMatchReview.ts`, `OverviewSection`, `MatchReviewComposer`); `app/src/features/clips/` |
