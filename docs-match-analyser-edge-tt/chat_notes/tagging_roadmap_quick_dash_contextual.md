# Tagging roadmap: quick → dashboards → contextual

Date: 2026-11-11  
Mode: brainstorm (`/chat`)

## Succinct summary

- Pass 1 is too heavy; placement (except serve) and rich quality language slow live tagging.
- Need **push / chop**, player-type context (attacker / defender / disruptor + **anti**), **Safe/Agro** instead of Good/Normal/Poor on first attack, initiative **quality**, keep serve spin + short/half/long + wing (pivot toggle later).
- End moved earlier must drop later contacts; end into initial offense must not wipe useful initiative state without clear rules.
- **Mandatory = what dashboards need.** Optional / studies for the rest.
- Studies candidates: **placement**, **first-attack intent / initiative**.

---

## Phase A — Quick changes (tagging UX / data hygiene)

Ship soon, no dashboard redesign required.

1. **Strokes:** add **push** and **chop** to the shot menu where phase allows.
2. **End edit rules:**
   - Moving end **back** → truncate open timeline to new end; do not keep/save shots after end.
   - Moving end into a phase that hides initiative → define keep vs clear (prefer keep stored values even if pill hidden).
3. **Pass-1 trim (soft):** stop treating rally **placement** (BH/Middle/FH) as first-class live tagging except **serve**; hide or de-emphasize for later study.
4. **First-attack language:** replace Good/Normal/Poor with **Safe / Agro** (or binary `shot_is_safe` / `shot_is_agro` — pick one shape when implementing).
5. **Bug/feel polish** from session: initiative tags when end changes; table-contact vs missed last shot if still broken.

Out of scope for A: full player-type menus, studies UI, dashboard redesign.

---

## Phase B — Dashboards first (define mandatory)

Own iterative loop (C stays out).

1. Sketch match + player card lists.
2. Annotate: question → metric → fields; mark missed / overkill.
3. Union → pass-1 mandatory / optional / study.
4. Update [`dashboard_field_matrix.md`](dashboard_field_matrix.md) + plan B outcomes; review; repeat.

**Iter 1 done:** Match Review annotated in `dashboard_field_matrix.md`. Spine is mostly derived (contacts, server, FOS, ending, winner). Shot success rates deferred; receive mirror + who initiates proposed as free adds.

---

## Phase C — Contextual shots (+ studies shell)

1. **Stroke menus by phase × player type** (attacker / defender / disruptor), including **anti** for disruptors.
2. Wire binary attributes that stay on pass 1; park the rest.
3. **Studies (thin shell):** at least Placement study consuming existing contacts; optional First-attack/initiative study if Phase B cards need it.
4. Pivot/crossover wing toggle if still cheap after B.

---

## Order of work

```
A ship quick fixes
B own iterative loop (dashboards → matrix → update plan → review) until mandatory set stable
C separate phase after B (contextual + studies) — not inside the B loop
```

Do not expand pass-1 mandatory in A beyond push/chop + Safe/Agro + end truncate. C waits on B exit.

Full plan: `.cursor/plans/tagging_a_b_c_roadmap.plan.md`
