# Pass 1 complete logic plan (for Paul approval)

**Date:** 2026-11-13  
**Tracker:** MA-72 (research + plan only — no code this turn)  
**Code base:** `main` @ `350fe57` (merged [#54](https://github.com/donpauleone69/match-analyser-edge-tt/pull/54) / MA-71)  
**Research notes:** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma72-pass1-plan-research-status.md`

---

## 1. Executive summary

MA-71 shipped the staged Pass 1 flow: Result → locked End Wing/Stroke → FA / No Attack → FA details → optional. Three gaps remain vs your latest intent:

1. **FA undo stuck** — after marking FA, before Wing/Stroke, you cannot clear the wrong FA via the FA indicator; you are forced to fill attrs (or Save without them — see §2) before optional “Change first attack” appears.
2. **Impossible FA not auto-skipped** — serve-only (`end === 1`) already skips FA. Defensive end on shot 2 (e.g. net BH push) still asks for first attack even though no attack was possible.
3. **Additional details by phase** — High / Safe / Initiative / Review / ★ / miss-reason (Forced = pressure) already follow the Pass 1 allow-list. Serve depth / spin / placement / Weak / Heavy are **Rally Focus only** and stay out unless you reopen schema.

Approve §5–6 and the three asks in §8 before the next implementation sprint.

---

## 2. Current gaps vs Paul intent

| Intent | Source | Today (`main` #54) | Gap |
|--------|--------|--------------------|-----|
| Undo FA by tapping FA pill/indicator **before** Wing/Stroke | MA-72 brief | Clear UI only in **optional** (“Change first attack”); `fa_details` rail tap only selects + loops | **Stuck path** |
| End shot 2 defensive → do not ask FA | MA-72 brief | Only `end === 1` auto-decides FOS | Still shows `select_fa` |
| Serve / service winner → FA impossible | MA-72 + MA-35 / MA-71 | `end === 1` → `isFosDecided`, skip FA stages | **OK** |
| FA details required before advancing | MA-71 bug #7 | Stage stays `fa_details` until wing+stroke, **but** `canSaveRallyTimeline` is true once `fos` is set | Save can fire without FA attrs |
| Additional details by phase (serve options, pressure, High/Safe/…) | MA-71 bugs #9–10; locked answers 5/7 | Allow-list High/Safe/Initiative + Review/★; “pressure” → miss **Forced** | Serve options / depth **not** in Pass 1 (locked “do not invent”) |
| Reassign FA by tapping another rail shot | MA-71 bug #6 | Works in `select_fa` only | Missing in `fa_details` |
| Undo No Attack in optional → choose again | MA-71 | `setFos(null)` toggle + rail No Atk | **OK** |

---

## 3. Stage machine (keep; extend edges)

Already shipping (`pass1-flow-refine.md`, `derivePass1Stage`):

| Stage | Info | Gate |
|-------|------|------|
| `contacts` | Click rally contacts | ≥1 contact → form |
| `end_details` | Enter end reason (Result) | Ending set; shot locked to End |
| `end_shot` | Enter End shot Wing and Stroke | Result + Wing + Stroke (`end===1`: Result only) |
| `select_fa` | Tap a shot for first attack, or No Attack | `fos` or `noFirstAttack` (**new auto-skips** §5) |
| `fa_details` | Enter First attack Wing and Stroke | FA wing+stroke (skip if No / serve-only / auto No) |
| `optional` | Add additional details if you want (green) | Save when gates met |

**Save gates today:** End · Ending · FOS decided · winner (`canSaveRallyTimeline`). Miss reason optional (Review + error).  
**Propose:** also require FA Wing+Stroke when a FA shot is marked (align save with stage).

---

## 4. Phase → fields matrix (source-backed)

### 4a. Pass 1 Focus — what may show (canonical)

Sources:

- `app/src/rules/derive/shot/derivePass1ShotTagRole.ts` — `derivePass1ShotTagAllowList`
- `app/src/features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx` — `ShotTagging` show flags
- MA-71 locked answers 5/7 (`pass1-stage-logic-sprint.md`, `internal/ma71-pass1-logic-layout-sprint-status.md`)
- Mapper: `mapPass1FocusToDb.ts` — spin/depth/contact/quality/weak/heavy **never stored**

| Phase / role | Compulsory (stage) | Optional (`optional`) |
|--------------|--------------------|------------------------|
| **Serve** (`shot 1`, not ball-before) | — (serve-only end: Result only) | Review / ★ if selected; **no** wing/stroke/High |
| **Serve as ball-before** (`fos === 2`) | — | **High** |
| **Pre-offensive / before_attack** (`2..fos-2`) | — | — (nothing on allow-list) |
| **Ball before attack** (`fos-1`) | — | **High** |
| **First attack** (`fos`) | Wing + Stroke (+ Pivot) in `fa_details` | **Safe**; Review / ★ |
| **Reply** (`fos+1`) | — (unless also end → End compulsory earlier) | Wing + Stroke + Pivot + **Initiative** (Behind/Level/Ahead); Review / ★ |
| **Later** (not end) | — | — |
| **End shot** (any non-serve) | Result; Wing + Stroke in end stages | Review / ★; miss reason if Review + error ending |
| **End = FA** | End Result + wing/stroke; if same shot is FA, End attrs already satisfy FA wing/stroke → `fa_details` may skip | Safe; Review / ★; miss… |
| **End = reply** | End Result + wing/stroke | Initiative kept on allow-list; Review / ★; miss… |
| **No attack rally** | End Result + wing/stroke; FOS = No Attack | Review / ★; miss…; no High/Safe/Initiative |

**UI phase labels** (expanded shot list only): SERVE · PRE OFFENSIVE SHOT · INITIAL OFFENSE · CONTINUATION — `PHASE_GROUP` in `Pass1FocusBlock.tsx` via `phaseAt` (`opening`/`ball`/`fos`/`reply`/`next`/`after`).

**“Pressure”:** not a separate Pass 1 control. Maps to miss-reason **Forced** when Review is on + error ending (`MISS_REASON_OPTIONS`: Forced / Misread / Technical / Timing / Footwork / Positioning). Glossary: Forced = error under pressure.

**★:** rally highlight (`isHighlight`). **Review:** per-shot flag (stores `technical` by default).

### 4b. Rally Focus only — do **not** restore into Pass 1 without reopening

Sources: `deriveShotTagRole.ts` / `allowListForRole`; `docs-match-analyser-edge-tt/chat_notes/shot_fields_and_attributes.md`; `deriveShotPhase.ts` (serve · pre_offensive · first_offensive · fos_plus_1 · fos_plus_2 · continuation).

| Phase | Fields |
|-------|--------|
| Serve | spin, placement, **depth**, Weak/High/Heavy |
| Pre-offensive | wing, placement, **depth**, Weak/High/Heavy |
| First attack | wing, stroke, contact (over/off table), quality |
| Later | wing, stroke, initiative (reply/next while continuing) |

These are the “serve options / shot depth” named in the MA-71 bug list. Locked answer: **do not invent**; Pass 1 mapper never stores them.

---

## 5. Auto-skip / impossible-FA rules

| Case | Rule | Status |
|------|------|--------|
| **Serve-only / service winner or fault** (`end === 1`) | FOS decided automatically; skip `select_fa` + `fa_details` → `optional` | **Shipped** (`isFosDecided`, `derivePass1Stage`) |
| **End on shot 2, defensive end stroke** (Push / Block / Chop — e.g. net BH push) | Auto `noFirstAttack`; skip `select_fa` + `fa_details` | **Missing — propose ship** |
| **End on shot 2, attack end stroke** (Flick / Loop / Drive / Smash / Lob) | Auto mark `fos = 2`; if End already has wing+stroke, `isFaAttrsComplete` → skip straight to `optional` | **Propose — needs Paul confirm (§8)** |
| Push rally / no attack, end ≥ 3 | User must choose **No Attack** (or mark a real FA) | Keep explicit |

Domain notes:

- DataSchema: shot 2 + error → receive error (derived); shot 1 + error → service fault.
- Glossary: First attack = first aggressive opening after serve/receive; Forced = under pressure.
- FA index must be ≥ 2 (`normaliseFirstAttack` in `derivePass1ShotTagRole.ts`).
- Stroke sets: `ATTACK_STROKE_OPTIONS` vs end/reply including Push/Block/Chop (`pass1FocusModel.ts`).

---

## 6. FA reassign / undo rules

| When | Action | Expected |
|------|--------|----------|
| `select_fa` | Tap rail shot ≥ 2 | Mark FA → `fa_details` (or `optional` if wing+stroke already on that shot) |
| `select_fa` | Tap **No Attack** (last rail cell, strong red) | `noFirstAttack` → skip FA details → optional |
| `select_fa` | Tap another shot | Reassign FA |
| **`fa_details` (attrs incomplete)** | Tap **FA indicator on the marked shot** (rail FA caption or selected-shot FA chrome) | **Clear FA → back to `select_fa`** (**new**) |
| `fa_details` | Tap a **different** rail shot ≥ 2 | **Reassign FA** (propose: same as select_fa) |
| `optional` | “Change first attack” | `clearFosDecision` → `select_fa` |
| `optional` | Undo No Attack | Toggle → `select_fa` |

### Stuck path today (verified)

1. Complete End Result + Wing/Stroke → `select_fa`.
2. Tap wrong rail shot ≥ 2 → `markFos` → stage `fa_details` (“Enter First attack Wing and Stroke”).
3. **No clear UI:**
   - `Pass1FocusComposer.handleSelectShot`: only marks/reassigns when `stage === 'select_fa'`; in `fa_details` only `setSelectedShot` + shot loop.
   - `ShotTagging.showFosCorrection` only when `stage === 'optional'`.
   - Rail “FA” under the mark is a non-clickable `<span>` (`Pass1ShotMarkRail`), not an action.
4. `pass1SaveHint` says enter FA Wing/Stroke — but `canSaveRallyTimeline` is already **true** once `fos` is set (timeline test asserts this), so Save can bypass the prompt.
5. Optional “Change first attack” only appears after FA attrs complete (or if user Saves early).

**Model already supports clear:** `markFos` same-shot re-tap clears; `clearFosDecision` sets `fos: null, noFirstAttack: false`. Timeline test covers model clear → `select_fa`. UI does not expose it in `fa_details`.

**Fix:** In `fa_details`, tap FA indicator (or re-tap marked rail shot) → `clearFosDecision` / `markFos` clear → `select_fa`. Optionally reassign by tapping another rail cell ≥ 2. Tighten save to require `isFaAttrsComplete` when FA is marked.

---

## 7. Implementation checklist (ordered)

1. **FA undo in `fa_details`** — tap FA rail caption / marked shot → clear → `select_fa`; info copy may say “or tap FA to undo”.
2. **FA reassign in `fa_details`** — tap other shot ≥ 2 reassigns (pairs with #1).
3. **Tighten save gate** — `canSaveRallyTimeline` requires FA wing+stroke when `fos` is set (not No Attack / serve-only).
4. **Auto No Attack when `end === 2` + defensive end stroke** after End Wing/Stroke complete.
5. **Auto FA = 2 when `end === 2` + attack end stroke** (Paul confirm §8).
6. Audit optional detail: only allow-list attrs + Review/★/miss; no fake End/FA checklist (already #54).
7. Confirm serve depth/spin stay **out** of Pass 1 (or reopen as separate epic).
8. Unit tests: stage derive for end=2 defensive/attack; FA clear in `fa_details`; save blocked until FA attrs; serve-only unchanged.
9. Spec addendum + `pass1-flow-refine.md` + test-snapshots when shipping.

---

## 8. Open asks for Paul (minimize)

1. **End = 2 + attack stroke:** auto-mark FA on shot 2 and skip `select_fa`? Or still show select with FA pre-painted?
2. **When end === fos:** End Wing/Stroke already fill FA attrs today (`isFaAttrsComplete`) so `fa_details` skips — keep that, or always re-prompt FA attrs?
3. **Serve options / depth:** confirm they stay Rally Focus–only (**recommended**), vs reopen Pass 1 schema.

Everything else in §4–6 is locked from MA-71 answers + code allow-list unless you override.

---

## 9. Pre-Simple attribute UI map (where it lived)

| Concern | Path |
|---------|------|
| Stage / gates / `markFos` / `clearFosDecision` / `isFosDecided` / `canSaveRallyTimeline` | `app/src/features/shot-tagging-engine/composers/pass1FocusModel.ts` |
| Composer rail/select/FA handlers | `app/src/features/shot-tagging-engine/composers/Pass1FocusComposer.tsx` |
| Pills: Wing/Stroke/Pivot, High, Safe, Initiative, Result, Miss, Review/★, Change FA; rail FA/End captions | `app/src/features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx` |
| Allow-list (UI + save) | `app/src/rules/derive/shot/derivePass1ShotTagRole.ts` |
| Save strip (forces spin/depth/… null) | `app/src/rules/derive/shot/mapPass1FocusToDb.ts` |
| Spec origin of allow-list UI (v3.35.0) | `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` |
| Pre-Simple layout commit cited by MA-71 | `d2c14ba` — same allow-list-driven `Pass1FocusBlock` |
| Rally Focus fuller phase fields (not Pass 1 UI) | `deriveShotTagRole.ts`, `deriveShotPhase.ts`, `chat_notes/shot_fields_and_attributes.md` |
| Domain | `docs-match-analyser-edge-tt/Glossary.md`, `DataSchema.md` |

### Chrome evolution (attrs unchanged)

| Epic | What changed | PR |
|------|--------------|-----|
| MA-35 | Sticky FA / No attack / End; save gate | #21 |
| MA-36 | Draft persist; rail FA/End text | #22 |
| MA-68 | Quick-mark End/FA; FA 2nd=No | #51 |
| MA-70 | Staged info box; drop sticky QUICK TAGS | #53 |
| MA-71 | End Result→Wing/Stroke; No Attack red rail; phase optional | #54 |
| MA-60/65–67 | Simple↔Pass1 visual / chrome | **not** attribute logic |

---

## Paul approval (2026-11-13 late)

1. **End=2 + attack stroke:** YES — auto-mark FA=2 and skip select (logical).
2. **End === FA:** SKIP fa_details if Wing/Stroke already filled — smoothest path.
3. **Pass 1 absorbs Rally Focus:** former Rally Focus fields that are not compulsory here become **optional** in this flow (serve depth/spin/placement, shot depth, Weak/Heavy, contact/quality, etc.). Review marks stay important for later queries.

### Completeness flags (new product)
Persisted rally-level (or match-point) markers:
- **Basic data** — complete | incomplete (compulsory Pass 1 gates)
- **Advanced data** — complete | incomplete (optional/phase Rally-Focus-class fields)

So rallies can be saved with Basic done and Advanced filled later.

## Next
Implement FA undo + auto-skip rules + save tighten first; then optional field merge + Basic/Advanced completeness in schema/store (may be 1–2 PRs).
