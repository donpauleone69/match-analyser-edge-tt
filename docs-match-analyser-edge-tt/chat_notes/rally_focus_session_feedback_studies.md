# Rally Focus session feedback → studies + contextual shots

Date: 2026-11-11  
Mode: brainstorm (`/chat`) — no product code changes from this note.

## Digest (what felt wrong / missing in use)

### Strokes missing
- Need **push** and **chop** in the shot list.
- Real example: opponent pushed a dead ball (anti rubber) → next shot looped.

### Player-type context
- Shot options / toggles should be **contextual**, not one giant always-on palette.
- Player types worth modelling: **attacker**, **defender**, **disruptor** (antispin / weird rubber).
- Disruptors need an explicit **anti** (or antispin) tag on the relevant shot.

### Initial-offense quality is the wrong language
- **Good / Normal / Poor** does not fit first attack well.
- Better direction: **Safe / Agro** (and similar intent attributes) — e.g. a safe offensive opener that was high, then finished with a step-around drive.
- Related feel: **ups** (high + slow) = not really taking initiative.

### Initiative
- Initiative (standing / ahead-level-behind) needs a **quality** of its own, not only a position label.
- “Over the table” observation in session: last shot missed (table-contact vs ending interaction needs care when redesigning).

### End-point edits (bugs / data rules)
- Moving the **end** onto a shot in **Initial offense** drops **initiative** tags that were already set.
- Moving end **backwards** must not keep (or persist) shots **after** the new end.
  - Use case: you tapped an extra contact, but the **previous** shot was actually the winner — re-mark end earlier; later contacts are discarded, not stored.

### First pass vs later “studies”
- Appetite to **strip the first pass** later and put detail into **studies** (second passes): footwork, tactics, positioning, decisions, etc.
- Anything that slows live watching should leave the first pass.

### Placement & wing (first-pass friction)
- **BH / Middle / FH placement** (except on **serve**) feels optional and too slow → candidate for a **study**, not first pass.
- **Wing** stays; consider a **pivot** (or crossover) toggle:
  - FH from BH side → pivot FH
  - BH from FH side → pivot BH
  - Naming TBD (“pivot” may be wrong; idea is crossed-over contact).

### Keep
- **Serve spin** — often skipped in practice, but should remain available.
- **Short / Half / Long** — good; keep on first pass.

### Agreed direction
- Go with **contextual shot options** (phase + player type), not more always-visible pills.
- Studies are the outlet for depth without bloating pass 1.

---

## Studies — suggested first two

### 1. Placement study (highest ROI for stripping pass 1)
**Why first:** Already felt too slow live; serve can keep length/placement; rally placement is the main drag.

**Pass 1 keeps:** wing (+ future pivot toggle), length where it already helps, serve spin/placement as today.

**Study tags (sketch):** BH / Middle / FH to (and maybe from), only on selected shots or rallies; optional “wide / body / crossover”.

**Trigger:** After a set is tagged, open “Placement study” on that set’s video with existing contacts; fill placement without re-tapping.

### 2. Initiative & first-attack intent study (or fold into pass-1 lite)
**Why:** Safe/Agro, ups, initiative quality are coaching-heavy and slow the contact loop; they also fit “why did this point die” better than Good/Normal/Poor.

**Tags (sketch):**
- First attack: Safe | Agro (+ keep/replace high/weak/heavy as binary attributes)
- Ups (high+slow) as attribute or derived
- Initiative: behind | level | ahead **plus** initiative quality (or Safe/Agro on the reply)

**Alternative:** Keep a **very small** Safe/Agro on first attack in pass 1, and put initiative *quality* + deep placement into studies.

---

## Contextual shot options (next conversation)

Principles to design against:
1. **Phase** decides the stroke menu (serve / pre-attack / first attack / reply / continuation / ending).
2. **Player type** (attacker / defender / disruptor) adds or highlights strokes (push, chop, block, anti).
3. **Binary attributes** stay toggles (`shot_is_*`), not mutually exclusive strength scales where possible.
4. **End move backwards** = truncate timeline to new end; clear tags that no longer apply to the new phase of that shot; do not persist post-end contacts.
5. **Pivot × wing** is first-pass if cheap; placement study is second pass.

Open for next chat:
- Exact stroke lists per phase × player type
- Whether Safe/Agro is pass 1 or study 2
- Pivot naming and whether both directions are in scope for MVP

---

## Mandatory vs optional — dashboard-first approach (2026-11-11)

**Problem:** Pass 1 feels overloaded, but we do not yet know what is mandatory vs optional.

**Proposed method (agreed direction):**
1. Sketch **match** and **player** dashboards first (cards / questions they answer).
2. For each metric, list the **minimum fields** it needs (rally/shot columns, derived vs tagged).
3. Union of those fields = **pass-1 mandatory** (or “required to unlock this card”).
4. Everything else = **optional on pass 1**, or a **study** / later pass.
5. UI should show mandatory vs optional clearly once that list exists — but do not invent “mandatory” until a dashboard owns the requirement.

**Why this works:** Tagging cost is justified by a visible insight. Studies fill dashboards that need depth without blocking the contact loop.

**Starting point we already have:** the five analytics cards (serve, receive, first attack, rally/continuation, error profile). Those already imply a thin mandatory core: contacts, server, ending, first-attack index, winner — mostly what Rally Focus already forces. Stroke/placement/Safe-Agro/initiative quality only become mandatory when a *named* dashboard card needs them.

**Next step when we continue:** pick 1 match dashboard + 1 player dashboard wireframe, list cards, map each card → required fields → mark pass-1 vs study.
