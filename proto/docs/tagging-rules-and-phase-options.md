# Tagging rules + phase options (Paul agreement)

**Date:** 2026-11-14  
**Tracker:** MA-75 (docs only — no product code)  
**Audience:** Paul approval  
**Code base checked:** `main` @ `157ae3a` (merged [#56](https://github.com/donpauleone69/match-analyser-edge-tt/pull/56) / MA-74)  
**Sources:** Glossary · DataSchema · `pass1-complete-logic-plan.md` · `derivePass1ShotTagRole` · `deriveShotTagRole` · `deriveShotPhase` · `pass1FocusModel` · `Pass1FocusBlock` · chat `/chat` 2026-11-14  

**Brainstorm note (repo):** `docs-match-analyser-edge-tt/chat_notes/pass1-phase-tags-and-rally-markers.md`

Approve this doc to lock stroke legality, per-phase optional L/R layouts, and UI flow rules before the next Pass 1 implement sprint.

---

## 1. Verdict for Paul

| Area | Propose (this agreement) | Current `main` #56 | Action if approved |
|------|--------------------------|--------------------|--------------------|
| Attack vs defensive strokes | Keep code sets; illegal to treat defensive end-2 as FA; Loop/etc. only legal as FA or after FA | Shipped (MA-73) | Keep |
| Phase optionals L/R | Standardise Paul’s layouts below (drop placement; ★ off shot box; Safe/Aggressive on FA) | RF merge: spin+**placement**+depth+Weak; FA **quality**; ★ on shot Review row; Change FA | **Change** |
| UI chrome | Phase markers on rally row; ★ on rail; drop Change FA; close panel on select-FA; dialog **below** rail amber→green; mute default; **No Attack** = normal on/off toggle (not always-loud) | Info **above** rail; ★ in shot box; Change FA still there; select_fa already hides panel; mute on shot loops; No Attack strong-red cell | **Change** (partial already; No Attack restyle → **MA-76**) |

---

## 2. Stroke / shot classes

### 2a. Canonical sets (code)

From `pass1FocusModel.ts`:

| Class | Strokes | Used when |
|-------|---------|-----------|
| **Attacking** | Flick · Loop · Drive · Smash | First-attack menu; end=2 attack auto-FA; “is this an opening attack?” |
| **Defensive / non-attacking** | Push · Block · Chop · **Lob** | End / reply menus; end=2 → auto **No Attack** |
| **Reply menu** | Block · Push · Chop · Lob · Loop · Drive · Smash | After FA (no Flick in reply set) |
| **End menu** | All attack + defensive | Non-serve end Wing/Stroke |

**Paul 2026-11-14:** Lob is **defensive** (same class as Chop), not an opening attack. Code today may still list Lob in the attack set — **gap: move Lob to defensive** (end=2 Lob → auto No Attack; remove from FA-only attack menu).

**Not every stroke needs a menu slot.** Attack/defence classes define legality and auto-skip; UI menus can be a smaller curated set. Prefer fewer options for speed — only include strokes Paul tags in practice.

Glossary: **First attack** = first aggressive opening after serve/receive; **Loop** = aggressive topspin; **Push** = controlled backspin keep-ball; **Block** = compact return of an attack; **Lob** / **Chop** = defensive; Forced = error under pressure (miss reason, not a stroke).

### 2b. Why “Loop on shot 2 with no opening attack” is illegal

1. Shot 1 is always **Serve** — never FA (`fos ≥ 2`).
2. FA is the **first** aggressive opening. If nobody opened with an attack stroke, the rally is **No Attack** (push/chop/lob exchange, receive error on a push, etc.).
3. Tagging **Loop** (or Flick/Drive/Smash) on shot 2 **is** declaring the opening attack → that shot **is** FA (`fos = 2`). You cannot have “Loop on 2” and “no first attack” together. **Lob on 2 is defensive** — does **not** declare FA.
4. Conversely: end on shot 2 with **Push / Block / Chop / Lob** means no opening attack was possible → auto **No Attack**. Asking “which shot was FA?” would be nonsense.

### 2c. Exhaustive FA / end / serve scenarios

| # | Scenario | FA decision | Stages |
|---|----------|-------------|--------|
| A | **Serve-only** (`end === 1`) — ace / service fault | FA impossible; FOS decided automatically | Skip `select_fa` + `fa_details` → optional |
| B | **End = 2, defensive stroke** (Push/Block/Chop/Lob) e.g. net BH push | Auto **No Attack** | Skip select + FA details → optional |
| C | **End = 2, attack stroke** (Flick/Loop/Drive/Smash) | Auto **FA = 2**; End Wing/Stroke already satisfy FA attrs | Skip select (+ skip `fa_details`) → optional |
| D | **End ≥ 3, real FA** on shot k (2 ≤ k ≤ end) | User marks FA on rail (or reassign) | `select_fa` → `fa_details` unless wing+stroke already on that shot |
| E | **End === FA** (same shot) | End Wing/Stroke fill FA attrs | Skip `fa_details` |
| F | **Push rally / no attack**, end ≥ 3 | User must choose **No Attack** (or mark a real FA) | Explicit |
| G | User picks Loop/Drive/… on a shot **before** any FA stamp | That shot **becomes** FA; earlier shots stay pre-offensive | Illegal to leave `noFirstAttack` |
| H | FA index &lt; 2 or &gt; end | Invalid — `normaliseFirstAttack` treats as no attack | Code invariant |
| I | Reply (fos+1) uses Block/Push/Chop **or** counter Loop/Drive/… | Allowed on reply/end menus; does **not** move FA | FA stays on first aggressive opener |
| J | Continuation after fos+2 | Wing/Stroke as needed; no Initiative (RF: initiative only fos+1/+2 while not end) | Optional only |

DataSchema: shot 1 + error → service fault (derived); shot 2 + error → receive error (derived).

### 2d. Stroke allow-lists by role (compulsory menus)

| Role | Wing / Pivot | Stroke menu |
|------|--------------|-------------|
| Serve | — | — (serve-only end: Result only) |
| Pre-offensive / ball-before | Optional wing only (see §3) — **no** Push/Touch/Dig stroke picker | — |
| First attack | Required in `fa_details` | **Attack** set only |
| Reply | Optional / end if also end | **Reply** set |
| End (non-serve) | Required in end stages | **End** set |
| Later / continuation | Optional | Attack+defensive as UI allows for that role |

---

## 3. Phase optional matrix (standard — Paul’s L/R)

Layout convention for the **selected-shot optional panel** (two columns):

- **Left (L)** = primary phase facts  
- **Right (R)** = Ball / intent attrs + **Tag = Review** (per-shot)  
- **★** is **not** in the shot box — it lives on the **rally rail** (§4)

Compulsory stage fields (Result, End Wing/Stroke, FA Wing/Stroke) stay outside this matrix.

### 3a. Serve (shot 1)

| L | R |
|---|---|
| **Spin** (under / top / side) | **Ball** (High / Heavy) |
| **Depth** (short / half / long) | **Tag = Review** |

**Remove vs #56:** Placement · Weak (unless Paul re-asks) · Change first attack / any FA chrome on serve · ★ in shot Review row.

### 3b. Pre-offensive (shots after serve, before FA; includes ball-before)

| L | R |
|---|---|
| **Wing** (BH / FH / Pivot) | **Ball** (High / Heavy) |
| **Depth** (short / half / long) | **Tag = Review** |

**Not offered:** shot type Push/Touch/Dig · Spin · Placement · FA button · ★ in shot box.

Ball-before-attack may still emphasise **High** (Pass 1 historical allow-list); same Ball row.

### 3c. FOS shot (first attack = `fos`)

| L | R |
|---|---|
| **Contact** (over-table / off-table) | **Tag = Review** |
| **Attributes:** Safe / **Aggressive** | |

Compulsory Wing + Stroke already entered in `fa_details` (or End if End=FA).

**Change vs #56:** Replace RF **Quality** (good/normal/poor) with **Safe / Aggressive** toggles (or exclusive pair). Drop Change FA. Keep Contact.

### 3d. FOS phase / reply (`fos+1`, and `fos+2` while still “initial offense”)

Clarify naming:

| Term | Meaning |
|------|---------|
| **FOS shot** | The first-attack contact itself (`shot_index === fos`) |
| **FOS phase / reply** | Shots in the opening-offense group after FA — primarily **reply** (`fos+1`); UI phase group today also labels `fos+2` under INITIAL OFFENSE |

| L | R |
|---|---|
| **Initiative** (Behind / Level / Ahead) | **Tag = Review** |

Wing/Stroke: already on allow-list for reply; show when editing that shot in optional (same as continuation if needed). **Remove Change first attack.**

Initiative only while point continues (not when that shot is End) — matches `allowInitiativeForLaterShot`.

### 3e. Continuation (after fos+2, not end)

| L | R |
|---|---|
| Wing · Stroke (as today) | Tag = Review; other right-side attrs only if already on allow-list |

**Looks good** except **drop FA button** / Change first attack everywhere.

### 3f. End point / Review / miss (separate)

| Concern | Rule |
|---------|------|
| **End Result** | Compulsory earlier (winner / error / air / …) |
| **End Wing + Stroke** | Compulsory for non-serve end |
| **Review** (per shot) | Optional Tag on that shot’s R column; stores review flag (technical default) |
| **Miss reason** | Only when **Review** on **and** error ending — options include **Forced** (= pressure). Not a separate “pressure” pill |
| **★ Highlight** | Rally-level on **rail**, not per-shot Tag |
| **Basic vs Advanced** | Basic = compulsory gates (`framework_confirmed`). Advanced = phase optionals filled (`detail_complete`). Save with Basic done + Advanced incomplete stays valid |

---

## 4. UI / flow rules (document now → implement later)

| # | Rule | Prefer |
|---|------|--------|
| 1 | **Rally row** shows **markers / groups for each phase** (Serve · Pre-offensive · Initial offense · Continuation) | Keep/extend `PHASE_GROUP` style labels on the rail / expanded list |
| 2 | **★ on rally rail**, not inside shot optional box | Move Highlight control to rail; Review stays per-shot Tag |
| 3 | **Remove “Change first attack”** everywhere (broken + clutter) | Clear FA via rail FA caption / re-tap (already in `fa_details`); optional stage loses the button |
| 4 | Entering **select FA**: **close shot panel** (no shot selected) until FA / No Attack chosen | **Preferred** (already largely true: `select_fa` returns null detail). Alt rejected unless Paul insists: keep panel open |
| 5 | After FA details done → optional: **close panel and wait for shot tap** for optionals (**prefer**) vs auto-open serve vs full list | Prefer: no shot selected until user picks one |
| 6 | Guiding **dialog below** the Rally row (not above) | Always visible; **amber** while incomplete / not saveable; **green** when can save |
| 7 | **Mute video by default** in Pass 1 tagging | Start muted; user may unmute; keep mute on shot/rally loops |
| 8 | **No Attack** on the rally row | Treat as a **normal rally-row option**, same on/off toggle pattern as other toggles: off = idle/unselected look; on = selected; **tap again clears** back to undecided. Must **not** look selected when off, and must **not** use an always-on / too-strong emphasis (e.g. permanent strong red). Restyle is **MA-76** (separate); this doc locks the behaviour |
| 9 | **Video loop** | **Rally loop** whenever **no shot is selected**. That is the state after End data is entered (panel closed → choose FA) and again after FA / No Attack is entered (panel closed → choose a shot for optionals). **Shot loop** (or from-selected-shot-to-end) only while a shot is selected for detail entry. |

### 4a. No Attack rail behaviour (Paul addendum 2026-11-14)

- **Off / undecided** (`fos === null` and `noFirstAttack === false`): No Attack control looks like any other idle rail option — not pressed, not “selected”, not permanently loud.
- **On** (`noFirstAttack === true`): selected state only; same visual language as other toggles when on.
- **Toggle:** tap No Attack → on; tap again → clears to undecided (model already supports this via `setFos(null)` toggle). Choosing a FA shot also clears No Attack.
- **Implement restyle:** MA-76 (not this docs task).

---

## 5. Proposed vs current (#56) — gaps

| Topic | Current #56 | Proposed | Gap |
|-------|-------------|----------|-----|
| Serve optionals | Spin, **Placement**, Depth, Weak/High/Heavy, Review, ★ | Spin, Depth, Ball High/Heavy, Review | Drop placement (+ Weak); move ★ |
| Pre-offensive | Wing, **Placement**, Depth, Weak/High/Heavy | Wing+Pivot, Depth, Ball High/Heavy, Review | Drop placement; no stroke types |
| FA optionals | Contact, **Quality**, Safe, Review, ★ | Contact, **Safe/Aggressive**, Review | Replace quality; move ★ |
| Reply | Wing/Stroke, Initiative, Review, ★, **Change FA** | Initiative + Review (+ wing/stroke as needed) | Drop Change FA; move ★ |
| Stage dialog | Above rail; green when optional | **Below** rail; amber→green | Move + amber incomplete |
| ★ | In shot Review row | On **rally rail** | Relocate |
| Mute | On shot loops; unmutes in some stage exits | **Default muted** for tagging session | Broaden |
| Loop switch | Tied to stage / FA forced shot loop | **Rally when no shot selected** (after End done → pick FA; after FA done → pick optional shot); shot loop only with a selection | Change |
| **No Attack chrome** | Strong / always-loud red rail cell (reads selected even when off) | Normal toggle: idle off, selected on, re-tap clears | **MA-76 restyle** |
| select_fa panel | Already closed | Keep closed until FA chosen | OK |
| Illegal FA / end=2 | MA-73 shipped | Keep | OK |
| **Lob class** | Code: Lob in **attack** set | **Defensive** with Chop (Paul) | Move Lob → defensive; end=2 Lob → No Attack; out of FA attack menu |
| Completeness | Basic/Advanced flags | Keep | OK |

---

## 6. Open asks

None blocking — layouts and UI rules above are the proposed lock. If Paul wants **Weak** back on Serve Ball, or **Quality** kept beside Safe/Aggressive, say so in chat; otherwise implement as written.

---

## 7. Cross-check index

| Source | Path / symbol |
|--------|----------------|
| Plan | `pass1-complete-logic-plan.md` |
| Flow | `pass1-flow-refine.md` |
| Glossary | `docs-match-analyser-edge-tt/Glossary.md` — First attack, Loop, Push, Block, Forced, Highlight, Review flag |
| DataSchema | `docs-match-analyser-edge-tt/DataSchema.md` — shots allow-list, Basic/Advanced, derived fault/receive |
| Pass 1 allow-list | `app/src/rules/derive/shot/derivePass1ShotTagRole.ts` |
| RF allow-list | `app/src/rules/derive/shot/deriveShotTagRole.ts` |
| Phase enum | `app/src/rules/derive/shot/deriveShotPhase.ts` |
| Stroke sets + auto-skip | `app/src/features/shot-tagging-engine/composers/pass1FocusModel.ts` |
| UI pills / Change FA / PHASE_GROUP | `app/src/features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx` |
| Prior RF field notes | `docs-match-analyser-edge-tt/chat_notes/shot_fields_and_attributes.md` |

---

## Paul sign-off

- [ ] Stroke legality + scenarios (§2)  
- [ ] Phase optional L/R matrix (§3)  
- [ ] UI / flow rules (§4), including No Attack toggle (§4a)  
- [ ] Gaps vs #56 accepted (§5)  
