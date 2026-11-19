# Simple tagging mode — plan (MA-53)

Updated: 2026-11-13. **§9 confirmed by Paul** — Phase 1 build unlocked.  
Sources: [internal/simple-tagging-brief.md](../internal/simple-tagging-brief.md), [review-notes.md](./review-notes.md) open #10, [product-goals.md](./product-goals.md).  
Code reference: current Pass 1 Focus (`pass1FocusModel` / `mapPass1FocusToDb`) + clips (`deriveClips` / `DEFAULT_CLIP_WINDOW`).

### Phase 2 UX (Paul review, 2026-11-13) — shipped (MA-55)

- Matrix = CNT column layout + playhead underline; rows **Offensive · End · Review** only.
- ★ on Save-point row (not a matrix row). Flatten **More** onto that row (everywhere).
- Detail = Pass 1 look/logic for **FOS + End** only; column select drives highlight + detail.

### Phase 2.1 UX (Paul, 2026-11-13) — shipped (MA-56 / #41)

- **No attack** on Offensive row; remove redundant Simple Pass 1 bar.
- Detail = Pass 1 design/logic; required fields only for active FOS/End column; End includes **wing + shot**.
- **End auto-selected** (last contact); End detail opens immediately.
- Explicit **Rally | Shot** loop; End-reasoning → previous+end until End fully tagged → full rally.
- Matrix **pinned**; Offensive+End grouped; Review apart; lighter cells / ghost End; no heavy row frames.
- Highlight Rally **gold, left, standalone** on save row; consistent button heights on Redo / in-progress rows.
- Score HUD **bottom-left**; controls right; both lower near progress bar (clear central players).
- Opponent **lucky** ending when forced error (Pass 1 ending set).

### Phase 2.2 polish (Paul screenshots, 2026-11-13) — shipped (MA-57 / #42)

- Shot frames + underline playhead (no digit swell); Rally|Shot toggle beside shot numbers.
- Drop FA? chip, Simple|Pass1 bar (mode overlay on video), Mark Offensive hint.
- Transport align/fit with score; Pass1 detail look; action row above matrix under Serve·Hero.

### Phase 2.9 Pass 1 overlay + chrome on Simple (Paul, 2026-11-13) — shipped (MA-66)

- Simple video = Pass 1 full `Pass1SetHudBlock` + transport overlay layout; form chrome = `Pass1SetContextBlock` + Let/Discard/Save trailing. Matrix IA kept.

### Phase 2.8 Pass 1 detail-card retheme (Paul, 2026-11-13) — shipped (MA-65 / #48)

- Selected-shot detail = Pass 1 `ShotRow` card (pastel wash, 3px left stripe, role/FOS/Flagged badges, summary, contact-selected ring). Matrix IA unchanged.

### Phase 2.7 mute + matrix spacing (Paul, 2026-11-13) — shipped (MA-64 / #47)

- Mute on shared `TransportCluster` / `VideoPlayer` store; Offensive/End/Review + detail ChoiceRow vertical gaps = `--control-gap` (DetailPill token).

### Phase 2.6 matrix density (Paul screenshots, 2026-11-13) — shipped (MA-63 / #46)

- Shot # = number + colour/underline only (no FA/End captions); tighter section/row gaps; HUD `!bottom-4` clear of progress bar.

### Phase 2.5 Pass1 visual parity (Paul agreed, 2026-11-13) — shipped (MA-60)

- Let before Discard; idle = shot1 Offensive; Pass1 shot# + pressed colours; Rally/Shot on video; detail+grid Pass1 colour/function; row labels above sections (L→R scroll); UX review MA-61.

### Phase 2.4 consistency (Paul, 2026-11-13) — shipped (MA-59 / #44)

- Matrix cells = standard square `.tag-control`/DetailPill; drop outer frame.
- RALLY: no title; same size; **None** + cycle Rally/Shot + ★; HUD baseline fix.

### Phase 2.3 layout (Paul, 2026-11-13) — shipped (MA-58)

- Smaller score HUD (H+W); transport bottoms align with score box.
- Matrix **grid/frame**; selected cells subtle outline (not dots-only).
- Final column = **RALLY** (unnumbered): **No Attack** under it; **Rally|Shot** toggle in column; **Highlight** on Review row of that column.
- Drop **Redo contacts** (keep Discard); combine Serve·Hero + Discard/Save into **one** row; remove **Leave**.
- Shot detail under matrix = Pass 1 shot-entry look.

### §9 locked (Paul, 2026-11-13)

| # | Choice | Note |
|---|--------|------|
| 1 | **B** | Remember last mode per device |
| 2 | **B** (+ explore) | Sticky/current row → matrix area; UX may try variants for best phone fit |
| 3 | **B-ish** | Offensive **shot row** (multi); **first selected = FOS** |
| 4 | **A** | Full Pass 1 ending set |
| 5 | **B** | Require miss-reason on errors (same chips as Pass 1) |
| 6 | **A** | Rally-level ★ only |
| 7 | **A** | Binary review → technical; detail below optional/overkill for MVP |
| 8 | **A** | Loop; pause only on review focus |
| 9 | **A** | Re-open in save mode; switch needs confirm |
| 10 | **A** | Clip windows after tagging MVP |

---

## 1. Interpreted brief

### Intent

Add an **alternative** phone-first tagging mode beside existing Pass 1 Focus. Keep both so Paul can A/B **speed vs richness**. Do **not** replace Pass 1 or Full/detail tagging.

### Product fit (goals)

| Want | How simple mode helps |
|------|------------------------|
| #1 Tag fast & accurately | Fewer questions; binary matrix; one screen |
| #3 Stats + playlists | Mandatory triad locks cards/stats seeds |
| #4 Intuitive nav | One composition; no menu diving mid-point |
| #8 Resume | Same mid-draft persist pattern as Pass 1 |
| #9 Incomplete out of stats | Same completeness gate as Pass 1 minimum |
| #11 Edit later | Shared rally/shot rows; re-open in either mode later (phase TBD) |

### Mandatory data (locks stats/cards)

1. **Server contacts / rally length** — ordered contact taps → shot count + timestamps.  
2. **End** — which contact ends the point + **basic reason** (winner / lucky / error family) so winner is derivable.  
3. **First offensive shot (FOS)** — shot index **or** explicit no-attack (same semantics as Pass 1: undecided ≠ no attack; serve-only End=1 skips FA).

Nearly all of this is **binary on/off on a shot column**, with FA + point-end questions in a detail strip below.

### UI vision (two maturity levels)

**MVP screen:** one shot row of contact dots; sticky FA / End / No attack; ending chips below; optional highlight + review flags.  
**Evolve:** step-sequencer **matrix** — columns = shots; rows = Offensive · End · Highlight · Review. Selecting a Review cell opens reason/detail under that shot. Rally video **loops** the contact window; pause/break loop only while entering a review reason.

### Recommendations (default unless Paul overrides in §9)

| Topic | Recommendation |
|-------|----------------|
| Storage | Write the **same** `DBRally` / `DBShot` shape as Pass 1 via a thin mapper; omit optional stroke/wing/standing/high/safe/pivot unless later filled |
| Completeness | Same gate as Pass 1: End + ending + FOS decided (+ derived winner) |
| Ending set | Reuse Pass 1 `PointEnding` set (Winner / Lucky / In-Net / Long / Wide / Air); miss-reason **optional** in simple mode |
| Review | Binary Review flag → default `shot_review_kind: 'technical'`; kind/wing/stroke deferred to detail strip or Work on later |
| Highlight | Rally-level `is_highlight` (same as Pass 1 ★), not per-shot |
| Entry | Mode picker when starting/resuming tagging for a set (“Simple” vs “Pass 1”) |
| Switch mid-match | Allowed per rally; one mode per saved rally (no hybrid UI mid-save) |
| Clip windows | **After** tagging MVP; adjust `deriveClips` windows only then |

### Ambiguities → §9

- Exact ending vocabulary vs “basic reason”  
- Whether miss-reason is required for errors  
- Matrix MVP vs row-first MVP  
- How “offensive” row differs from single FOS stamp  
- Review reason taxonomy  
- Mode switch / edit across modes  

---

## 2. One-screen phone IA (text wire)

Viewport ≈ **390×844**. One composition — video + sequencer + tools. No secondary panels, no cards-as-chrome.

```
┌─────────────────────────────────────┐
│ ← Set 2 · 4–3          Leave · Done │  ← set context (thin)
├─────────────────────────────────────┤
│                                     │
│         LOOPING RALLY VIDEO         │  ← ~38–42dvh; loop pad ±1s
│         [ ⏮  ▶/⏸  ⏭ ]  0.75×        │     contacts as overlays
│                                     │
├─────────────────────────────────────┤
│ Contacts  ● ● ● ● ● ○ ○             │  ← tap = add/select contact
│           1 2 3 4 5                 │     (rally length)
├─────────────────────────────────────┤
│ MVP: single binary row              │
│  FA · End · ★ · Rev   under active  │
│                                     │
│ Later matrix:                       │
│         1   2   3   4   5           │
│ Off     ·   ·   ■   ·   ·           │  ← FOS column (one on)
│ End     ·   ·   ·   ·   ■           │  ← end column (one on)
│ ★       ·   ·   ·   ·   ·           │  ← highlight (rally ★ or
│ Rev     ·   ■   ·   ·   ·           │     per-shot — see §9)
├─────────────────────────────────────┤
│ Detail (selected column)            │
│  First attack | No attack           │
│  Ending: Winner Lucky Net Long …    │
│  [Review reason when Rev on]        │
│  Hint: FA? · End?                   │
├─────────────────────────────────────┤
│              [ Save point ]         │
└─────────────────────────────────────┘
```

**IA rules**

- First viewport = brand-neutral work surface: video + contacts + binary marks + one CTA.  
- No stroke/wing pill clusters in MVP (that’s Pass 1’s job).  
- Selecting a matrix cell scrolls/focuses the detail strip for that shot.  
- Loop breaks only when Review detail is focused/editing; resume loop on blur/save of reason.

---

## 3. Data model delta vs current Pass 1

### Current Pass 1 (Focus) — stored shape

**Rally-level (`RallyTimelineState` → `DBRally`):**

| Field | Role |
|-------|------|
| `shotCount` / shots 1..n | Contacts + `timestamp_start` |
| `fos` / `noFirstAttack` | First attack decided |
| `end` | End shot index |
| `ending` (`PointEnding`) | Basic end reason |
| `missReason` | Optional error subtype |
| `is_highlight` | Rally ★ |
| `framework_confirmed` | Completeness / stats gate |

**Per-shot (`ShotTags` → `DBShot`) when role allows:** wing, stroke, isHigh, isSafe, isPivot, standing, `reviewKind`, contactTime.

**Save gate (`canSaveRallyTimeline`):** End set + ending set + FOS decided (`fos` number **or** `noFirstAttack` **or** End=1) + winner name derivable.

### Simple mode — same persistence, thinner capture

| Concern | Pass 1 today | Simple mode |
|---------|--------------|-------------|
| Contacts / length | Tap contacts | **Same** (mandatory) |
| FOS | Sticky FA / No attack | **Same semantics**; UI = Offensive row / FA tools |
| End + ending | Sticky End + ending chips | **Same**; End row + chips below |
| Winner | Derived from end + ending | **Same** |
| Miss reason | Available on errors | **Optional** (recommend off for MVP speed) |
| Wing / stroke / pivot / high / safe / standing | Core of Pass 1 speed path | **Out of MVP capture** (null/false in DB) |
| Review | Flag → kind; technical wants wing+stroke | Binary flag → default kind; rich reason in detail later |
| Highlight | Rally ★ | **Same** rally `is_highlight` (unless Paul picks per-shot ★) |
| Completeness / stats | `isCompleteScoringRally` | **Reuse** — incomplete stays out of stats |
| Mapper | `mapPass1FocusToDb` | New `mapSimpleTaggingToDb` **or** call Pass 1 mapper with empty optional tags |

### Matrix → fields

| Matrix row | Maps to |
|------------|---------|
| Offensive | At most one column → `first_attack_index`; empty + No attack → `null` + decided |
| End | Exactly one column when saved → end index; ending chips → `point_ending` |
| Highlight | Rally `is_highlight` **or** deferred per-shot (decision) |
| Review | `shot_review_kind` on that shot; detail strip holds reason text / kind |

No new Dexie tables for MVP. Optional later: `tagging_mode: 'simple' | 'pass1'` on rally or match for analytics of A/B speed.

---

## 4. Workflow

1. **Enter** — From set tagging entry: choose **Simple** (or remember last mode). Load video; server already known from set flow.  
2. **Play / loop** — Video loops around current contacts (± pad, reuse Pass 1 `LOOP_PAD_SECONDS`).  
3. **Tap contacts** — Each tap adds a shot column + timestamp (rally length). Undo last contact supported.  
4. **Mark FOS** — Tap Offensive cell / FA on selected shot, or **No attack**. Re-tap → undecided (same as MA-35).  
5. **Mark End** — Tap End cell on last meaningful contact; choose ending below. Winner derives.  
6. **Optional ★ / Review** — Toggle highlight; toggle Review on a shot → detail opens; loop pauses while reason focused.  
7. **Save** — Enabled only when completeness gate passes; clears mid-draft; advances score / next point.  
8. **Resume** — Mid-draft localStorage (mirror Pass 1 draft storage); Incomplete badge if legacy/partial.  
9. **Leave / Done** — Same Leave (keep draft / discard) and Done semantics as current Pass 1 chrome.  
10. **Edit** — Re-open rally: prefer mode it was saved with; switching modes is a confirm (decision).

---

## 5. Phased build + acceptance

### Phase 0 — Confirm (§9) — **blocker**

- Paul answers multi-choice in §9.  
- **AC:** Answers recorded in `decisions-log.md`; this plan’s recommendations marked Confirmed/Overridden.

### Phase 1 — Simple tagging screen MVP

- Feature slice under `features/` (composer + sections/blocks); pure rules for completeness / winner / matrix toggles; ui-mine only.  
- One-screen phone layout; contact taps; FA / No attack / End; ending chips; Save gate; loop video; Leave/Done/resume draft.  
- Persist via shared rally/shot entities (empty optional Pass 1 tags).  
- **AC:** On 390 width, tag a 5-contact point (FA + End + Winner) in one screen without scrolling away from video+matrix; reload restores draft; incomplete excluded from stats; existing Pass 1 path untouched.

### Phase 2 — Completeness + matrix polish

- Full Offensive / End / Highlight / Review matrix rows.  
- Review cell → detail+reason; loop pause/resume behavior.  
- Status chips `FA n` / `No attack` / `FA?` · `End n` / `End?`.  
- **AC:** Matrix-only marking works; Review reason round-trips; save blocked with clear hint when FA/End missing.

### Phase 3 — Clip windows (see §6)

- Adjust playlist windows for Serve / Receive / Attack / Technical review.  
- **AC:** Playlist clips match agreed windows; download/reel still work; incomplete still excluded.

### Phase 4 — Iterate from Paul’s review

- Speed A/B notes; ending vocabulary tweaks; optional miss-reason; cross-mode edit.  
- **AC:** Written follow-ups in review-notes; only confirmed items shipped.

---

## 6. Clip windows phase (after tagging MVP)

Today (`DEFAULT_CLIP_WINDOW`): rally lead/tail 1s; shot lead 1.5s / tail 1s; shot clip = contact−lead → next contact (or rally end)+tail. Opening/review playlists are shot-based with Whole rally ↔ Shot toggle.

**Target windows (brief):**

| Playlist | Window | Implementation note |
|----------|--------|---------------------|
| Serve | Serve + receive | Shot window spanning indices 1–2 (not single-shot lead/tail) |
| Receive | Serve + receive | Same span; filter by receiver side |
| Attack | Shot before + attack + shot after | Span `fos-1 .. fos+1` (clamp to rally) |
| Technical review | Shot before + shot | Span `n-1 .. n` for flagged technical shots |

Phase 3 work: extend `deriveClips` / presets with multi-shot span helpers; keep rally padded window for “Whole rally” toggle. Do **not** block Phase 1–2 on this.

---

## 7. Test plan

### Manual (phone 390)

1. Enter Simple mode; load fixture video; tag serve-only winner (End=1, no FA).  
2. Tag 5-shot rally: contacts → FOS → End → Winner → Save; score advances.  
3. No-attack path: 3 contacts, No attack, error ending, Save.  
4. Mid-draft reload restores contacts + FA/End.  
5. Leave → Keep draft / Discard.  
6. Incomplete rally hidden from stats / playlists; visible with Incomplete in Review.  
7. Pass 1 path still opens and saves on same match (A/B).  
8. Review flag → detail; loop pauses while typing/choosing reason; resumes after.  
9. After Phase 3: Serve/Receive/Attack/Technical playlists show expected span lengths.

### Automated / smoke

- Unit: completeness + FOS decided + winner derive (mirror `pass1FocusModel.timeline` cases).  
- Unit: simple → DB mapper leaves optional tags null/false.  
- Extend `@390` Playwright smoke: one Simple save happy path (add, don’t replace Pass 1 smoke).  
- `npm run build` clean.

---

## 8. Out of scope / non-goals

- Replacing or deleting Pass 1 Focus / Full detail tagging  
- Stroke / wing / pivot / high / safe / standing capture in Simple MVP  
- New pattern cards or scout/benchmarks  
- Cloud sync as primary; schema rewrite  
- Changing existing clip presets before Phase 3  
- Desktop-first layout work (desktop must not break; phone is the design target)  
- Inference engine / dead-end dashboards  

---

## 9. Multi-choice decisions — Paul must confirm before build

Reply with letter per question (e.g. `1B, 2A, 3C…`).

### 1. Mode entry
- **A.** Ask Simple vs Pass 1 each time you start/resume a set  
- **B.** Remember last choice per device (default Simple after first pick)  
- **C.** Match-level default in setup; override per session  

### 2. MVP UI shape
- **A.** Ship **matrix** (Offensive / End / ★ / Review rows) in Phase 1  
- **B.** Ship **single contact row + sticky FA/End/★/Rev** first; matrix in Phase 2 *(recommended)*  
- **C.** Matrix without Highlight/Review rows until Phase 2  

### 3. “Offensive” row meaning
- **A.** Exactly one FOS column (same as today’s FA stamp) *(recommended)*  
- **B.** Multi-select “attack-ish” shots; FOS = first selected  
- **C.** Multi-select attacks; separate explicit FOS control  

### 4. Ending / basic reason
- **A.** Full Pass 1 set: Winner, Lucky, In-Net, Long, Wide, Air *(recommended)*  
- **B.** Coarser: Winner vs Error only (lose luck/air granularity)  
- **C.** Winner / Error-net / Error-long / Error-other  

### 5. Miss reason on errors
- **A.** Skip in Simple MVP *(recommended)*  
- **B.** Require same miss-reason chips as Pass 1  
- **C.** Optional single “Forced?” toggle only  

### 6. Highlight
- **A.** Rally-level ★ only *(recommended)*  
- **B.** Per-shot Highlight row (new semantics; clips need update)  
- **C.** Both rally ★ and per-shot  

### 7. Review flag
- **A.** Binary on → store `technical`; refine kind/wing/stroke later *(recommended)*  
- **B.** Choosing Review forces kind (technical/tactical) before save  
- **C.** Free-text reason required before save  

### 8. Video loop behavior
- **A.** Always loop contact window; pause only while Review detail focused *(recommended)*  
- **B.** Loop only after ≥1 contact; otherwise normal play  
- **C.** No auto-loop; manual loop toggle  

### 9. Cross-mode editing
- **A.** Re-open in the mode that saved the rally; switching needs confirm *(recommended)*  
- **B.** Always re-open in Pass 1 (richer editor)  
- **C.** Freely switch; Simple save may strip unused Pass 1 tags  

### 10. Clip windows timing
- **A.** After Simple tagging MVP (Phase 3) *(recommended)*  
- **B.** Parallel spike during Phase 2  
- **C.** Defer indefinitely; keep today’s lead/tail  

---

## 10. Build notes (for implementers, post-confirm)

- Follow `.cursorrules`: composers/sections/blocks; domain in `rules/`; no `lucide-react` in features; no `@/components/ui` in features.  
- Prefer shared `DBRally`/`DBShot` + completeness helpers already used by stats/clips.  
- Thin slices per phase; update `specAddendumMVP.md` when code ships.  
- Status scratch: [internal/ma53-simple-tagging-plan-status.md](../internal/ma53-simple-tagging-plan-status.md).
