# Pass 1 flow refine (Paul, 2026-11-13)

Source of truth for MA-68+. Prefer Pass 1; Simple chrome already on Pass 1 (#50).
**MA-71** supersedes MA-70 stage/loop details. **MA-77** syncs UI/optionals to living tagging-rules.

Living rules: `tagging-rules-and-phase-options.md`

## Stage machine (MA-71 + MA-77)

Sticky top = **RALLY rail** (phase markers + ★ + No Attack) then guiding **dialog below** the rail. Amber while incomplete; **green when can save**. No sticky QUICK TAGS. No Change FA.

| Stage | Dialog | UI | Gate |
|-------|--------|-----|------|
| 1 Contacts | `Click rally contacts` | Big mark-contacts control | ≥1 contact → form |
| 2 End reason | `Enter end reason (Result)` | Last contact = End + selected (**locked**); Result | Ending (Result) |
| 3 End shot | `Enter End shot Wing and Stroke` | Still locked to End; Result durable + Wing/Stroke | Result + Wing + Stroke (serve-only: Result alone) |
| 4 Select FA | `Tap a shot for first attack, or No Attack` | Rail selectable; **no shot panel** until FA / No Attack; No Attack = normal toggle (MA-76). **Skipped** when end=1 or end=2 auto (MA-73/77) | FA shot **or** No Attack (or auto) |
| 5 FA details | `Enter First attack Wing and Stroke — or tap FA to undo` | Detail for FA shot; **FA shot loop** + mute; tap FA caption / re-tap → clear → select FA | FA wing+stroke **or** No Attack |
| 6 Optional | `Add additional details…` (green when can save) | **No shot selected** until rail tap; phase L/R optionals + Review; ★ on rail; undo No Attack via rail | — |

**Save** = `canSaveRallyTimeline`: End · Ending · FOS decided · **FA wing+stroke when FA marked** · winner. Miss reason optional (Review + error ending).

### Impossible FA auto-skip (MA-73 / MA-77 Lob)

| Case | Behavior |
|------|----------|
| Serve-only (`end === 1`) | Skip select_fa + fa_details → optional |
| End = 2 + defensive (Push / Block / Chop / **Lob**) | Auto **No Attack** → optional |
| End = 2 + attack (Flick / Loop / Drive / Smash) | Auto **FA = 2** → optional (Lob is **not** attack) |
| End === FA (attrs filled) | Skip fa_details |

## Defaults / selection (MA-77)

- End stages (2–3): selection **locked** to End shot.
- select_fa + optional after FA/No Attack: **no shot selected** until user taps (rally loop).
- FA details: FA shot selected (shot loop).
- After contacts → form: last contact selected (End).

## Phase optionals (MA-77 L/R)

| Phase | Left | Right |
|-------|------|-------|
| Serve | Spin · Depth | Ball High/Heavy · Review |
| Pre-offensive | Wing+Pivot · Depth | Ball High/Heavy · Review |
| FOS shot | Contact · Safe/Aggressive | Review |
| Reply / FOS phase | Initiative (+ wing/stroke as needed) | Review |
| Continuation | Wing · Stroke | Review |

Dropped vs #56: Placement · Weak · Quality · Change FA · ★ in shot box.

## Chrome

- Sticky: **RALLY rail** (phase group markers SERVE/PRE/INIT/CONT) + ★ Highlight + No Attack; dialog **below**.
- **No Attack**: idle when off; selected red when on (MA-76).
- Do **not** paint FA on rail until chosen.

## Video (MA-77)

- **Mute by default** for Pass 1 tagging (user may unmute; stay muted on loops).
- **Rally loop** whenever **no shot selected** (after End → pick FA; after FA → pick optional shot).
- **Shot loop** only while a shot is selected (End lock, FA details, optional shot tap).

## Completeness (save)

**Basic** (`framework_confirmed`): Contacts · End · Ending · FOS decided · FA wing+stroke when FA marked.

**Advanced** (`detail_complete`): every allow-listed nullable choice filled for shots 1..end. Toggles (High/Heavy/Safe/Aggressive/Pivot) never gate. Placement/quality/Weak no longer on allow-list.
