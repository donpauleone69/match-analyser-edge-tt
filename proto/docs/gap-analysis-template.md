# Gap analysis template — ideal ↔ tip

**Gate 5** of [route-planning.md](./route-planning.md) — map good code onto agreed UX.  
**Fill in after** Gates 1–4 (functionality → flows → `proto/` wireframe → theme).  
**Updated:** 2026-11-14  

Tips are **evidence only**. Ideal comes from signed functionality + signed flows — not from poke ports.

---

## How to fill

| Column | Meaning |
|--------|---------|
| Ideal capability | From signed Must/Should (or explicit non-goal) |
| Present on tip? | Yes / Partial / No / Noise-only (cite tip or poke port if useful) |
| Excess / noise | Code or chrome that ideal doesn’t need |
| Missing | Ideal needs it; tip weak or absent |
| Decision | **keep** · **cut** · **build** · **defer** |

Paul: ☐ Sign filled table before transplanting keepers into product / proto

---

## Working table

| Ideal capability | Present on tip? | Excess / noise | Missing | Decision |
|------------------|-----------------|----------------|---------|----------|
| | | | | |
| | | | | |
| | | | | |

Copy rows from Gate 1 Must/Should as you fill. Add excess-only rows (ideal = “—”) when tip has stuff ideal rejects.

---

## DRAFT seed rows (pending Paul — not decisions)

Seeded from overnight mess + known IA noise. **Do not treat as signed.**

| # | Ideal capability | Present on tip? | Excess / noise | Missing | Decision |
|---|------------------|-----------------|----------------|---------|----------|
| 1 | Clean phone-first Review / lists | Partial (de-frame #126–128) | Nested borders / boxed density overnight; still tighter than yesterday | Layout principles (Gate 4) | DRAFT — cut excess frames; defer full layout pass |
| 2 | Clips opens reliably → playlist watch | Yes after hooks fix (#124 / poke 5201–5207) | Crash class = ship-without-browser-smoke | Broader smoke gate (process) | DRAFT — keep fix; keep smoke rule |
| 3 | Serve / Receive insight → playlist | Partial (Track D / poke 5205) | Glance + detail + sticky browse chrome may be heavy | Prove value vs Summary/Work on alone | DRAFT — keep if earns playlist; else cut/simplify |
| 4 | Playlist browse without chrome stack | Partial (BrowseDisclosure / trails 5202–5205) | Sticky chip + trails + nested shells | Ideal one-job browse | DRAFT — keep trail idea; cut stacked chrome |
| 5 | Pass 1 preferred tagging | Yes (primary path) | Simple mode still in codebase / history | Pass 1 rules gaps (Lob defensive, ★ on rail, No Attack chrome) | DRAFT — keep Pass 1; defer Simple; build rules gaps after Gate 3 |
| 6 | Training as product surface | Stub `/training` | Nav/route noise for non-core loop | — | DRAFT — cut from nav / defer |
| 7 | Dead routes (clubs, tournaments, players, analytics, data-viewer) | Redirect → Home | Legacy pages on disk | — | DRAFT — cut from IA; delete when touching nav |
| 8 | Home outstanding + resume | Partial | — | Crystal-clear continue jobs | DRAFT — build/polish after Gate 3 |
| 9 | Find by opponent / tournament / dates | Partial | — | Practical filter MVP | DRAFT — build |
| 10 | Cross-match insights → playlist | Partial (`/review`, `/clips`) | Scope UX unclear vs Find | Same F3 payoff across matches | DRAFT — keep machinery; clarify IA |
| 11 | Edit rally / re-tag | Partial | — | Edit polish after flow sign-off | DRAFT — keep path; defer polish epic |
| 12 | Theme tokens + ui-mine Icon set | Partial / drifted | Overnight token churn; DesignSystem prose vs CSS | Single theme pass | DRAFT — defer to Gate 5 |

---

## Excess-only checklist (scan tip for more)

Add rows when spotted; ideal cell can be “— / not wanted”.

- [ ] Nested decorative borders / double cards  
- [ ] Dual tagging entry points that compete with Pass 1  
- [ ] Numbers without playlist exit  
- [ ] Training / club / tournament management chrome  
- [ ] Inference / analytics leftovers  
- [ ] Overlay/HUD duplicated inconsistently  
- [ ] “Density” padding that hurts thumb targets  

---

## Missing-only checklist (from goals)

- [ ] Resume outstanding obvious on Home  
- [ ] Match find filters (practical set)  
- [ ] Incomplete excluded from stats  
- [ ] No-dupe tagging guard  
- [ ] Trim / archive video path  
- [ ] Download reel for coach  
- [ ] Tagging-rules UI gaps (after Paul approves tagging doc)  

---

## After fill-in

1. Paul signs Decision column.  
2. Transplant **keep** into agreed proto/product shell; **build** missing; **cut** excess; **defer** Later.  
3. Update [project-context.md](./project-context.md) when product `app/` freeze lifts.
