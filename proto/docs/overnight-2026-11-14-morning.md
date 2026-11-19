# Morning surprise — overnight refine (14 Nov 2026)

**Tip of main:** `a42a43d` (through #123 / MA-147 + #121 / MA-145) · [Plan](overnight-2026-11-14-plan.md) · [Sprint board](overnight-sprint-board.md) · [Smoke checklist (MA-146)](overnight-2026-11-14-smoke.md) · [Serve/Receive notes (MA-150)](overnight-2026-11-14-serve-receive.md)

Paul — overnight was a **usability + cohesion** pass across six tracks. Same video language, quieter chrome, playlist browse that sticks with you, Serve/Receive as proof pages, Pass 1 contacts/timeline polish, and theme tokens as SoT. Track C closed through **#121** (MA-145) — browse notes in Track C below (MA-151); Track D closed through **#122** (MA-143); Track E closed through **#123** (MA-147) — Pass 1 notes below (MA-152). Prefer [smoke](overnight-2026-11-14-smoke.md) over more polish.

---

## What you’ll notice

1. **One video control language** — overlay + score HUD on Clips, Work-on, Rallies, Rally edit, Review; empty/load states on shared VideoPlayer tokens.
2. **Quieter surfaces** — Home → Match Review → Settings/Training denser and calmer.
3. **Playlist browse without scroll-up hell** — shared `BrowseDisclosure` (keyboard too); sticky under the review header; Work-on / Summary / Rallies → Clips trails + Fix round-trip; phone trail one dense icon row (MA-151 notes in Track C below).
4. **Serve + Receive Data** — curated stats → focus playlist → shot cards; evidence ↔ playlist sync; quieter empty/loading; denser glance cards. Details: [Serve/Receive notes](overnight-2026-11-14-serve-receive.md).
5. **Pass 1 tagging** — contacts pad + scrub; History sheet; Viewing/Live; Leave Keep/Discard; Ready—tap Save row (MA-152 notes below).
6. **Theme glue** — callout / video-scrim / modal-scrim in `index.css`, gated by `themeTokens.test.ts`, documented in `DesignSystem.md`.

---

## By track (key late PRs)

### A — Video overlay & stage cohesion
| Slice | PR |
|-------|----|
| Overlay → stages / mute / scrub | [#64](https://github.com/donpauleone69/match-analyser-edge-tt/pull/64) [#69](https://github.com/donpauleone69/match-analyser-edge-tt/pull/69) [#73](https://github.com/donpauleone69/match-analyser-edge-tt/pull/73) [#77](https://github.com/donpauleone69/match-analyser-edge-tt/pull/77) |
| Stage + playlist leftover chrome | [#83](https://github.com/donpauleone69/match-analyser-edge-tt/pull/83) [#89](https://github.com/donpauleone69/match-analyser-edge-tt/pull/89) |
| Evidence → Clips + Work-on deep-link | [#103](https://github.com/donpauleone69/match-analyser-edge-tt/pull/103) [#109](https://github.com/donpauleone69/match-analyser-edge-tt/pull/109) |
| VideoPlayer empty/loading | [#116](https://github.com/donpauleone69/match-analyser-edge-tt/pull/116) |
| Focus picker none-tone token | [#120](https://github.com/donpauleone69/match-analyser-edge-tt/pull/120) |

### B — Surfaces declutter
Through Match Review quiet + Home/Find + Settings/Training residuals: [#98](https://github.com/donpauleone69/match-analyser-edge-tt/pull/98) [#104](https://github.com/donpauleone69/match-analyser-edge-tt/pull/104) [#115](https://github.com/donpauleone69/match-analyser-edge-tt/pull/115) [#118](https://github.com/donpauleone69/match-analyser-edge-tt/pull/118).

### C — Playlist browse shell

**Done** through MA-145 (#121). One continuous browse pattern — History-style disclosure, sticky shell under Match Review chrome, arrival trails, Fix round-trip, keyboard a11y, phone density. Morning notes: **MA-151** (this section).

| Slice | PR | MA |
|-------|----|----|
| Shell on shared `BrowseDisclosure` | [#82](https://github.com/donpauleone69/match-analyser-edge-tt/pull/82) | MA-81 |
| Density + Work-on trail refine | [#85](https://github.com/donpauleone69/match-analyser-edge-tt/pull/85) | MA-107 |
| Mobile disclosure + shell polish | [#95](https://github.com/donpauleone69/match-analyser-edge-tt/pull/95) | MA-118 |
| Work-on trail + Fix return continuity | [#99](https://github.com/donpauleone69/match-analyser-edge-tt/pull/99) | MA-121 |
| Sticky offset tracks review header | [#106](https://github.com/donpauleone69/match-analyser-edge-tt/pull/106) | MA-127 |
| Summary / Evidence / Rallies → Clips trail | [#107](https://github.com/donpauleone69/match-analyser-edge-tt/pull/107) | MA-131 |
| Fix/Edit lands on edited clip + Clips back label | [#112](https://github.com/donpauleone69/match-analyser-edge-tt/pull/112) | MA-137 |
| BrowseDisclosure Arrow / Home / End / Escape | [#117](https://github.com/donpauleone69/match-analyser-edge-tt/pull/117) | MA-140 |
| Phone trail one-row icon-first density | [#121](https://github.com/donpauleone69/match-analyser-edge-tt/pull/121) | MA-145 |

**How to poke browse (2–3 min):**
1. Match Review → **Work on** → pattern Clips — sticky Playlists chip sits **under** title+tabs (no slide-under).
2. Open disclosure — Arrow keys move options; Escape restores focus to the chip.
3. Phone (~390px) — chip + trail on **one row**; Work / Stay / Fix as icons; chip still readable.
4. **Summary** / Evidence Play all / **Rallies** → Clips — same trail pattern (return + Stay + Fix).
5. **Fix tags** → Done — back pill says **Clips**; queue lands on the rally you edited with the arrival trail intact.
6. Serve/Receive Focus disclosure — sticky under review chrome; no scroll-jump on focus change.

**Key files:** `BrowseDisclosure.tsx`, `PlaylistBrowseShellBlock.tsx`, `ClipsComposer.tsx`, `RallyEditComposer.tsx`, `ClipPresetListBlock.tsx`, `ServeReceiveDataSection.tsx`.

**Mode after #121:** smoke / notes only unless a clear UX gap — no more browse chrome by default. Scratch: `/cursor/stores/self/internal/overnight-track-c-status.md`.

### D — Serve / Receive Data
**Done** through MA-143. Stats → shell → evidence sync → empties → glance: [#94](https://github.com/donpauleone69/match-analyser-edge-tt/pull/94) [#100](https://github.com/donpauleone69/match-analyser-edge-tt/pull/100) [#113](https://github.com/donpauleone69/match-analyser-edge-tt/pull/113) [#122](https://github.com/donpauleone69/match-analyser-edge-tt/pull/122). Full Track D morning notes: [overnight-2026-11-14-serve-receive.md](overnight-2026-11-14-serve-receive.md) (MA-150).

### E — Pass 1 contacts + timeline
**Done** through MA-147 / #123. Full Pass 1 morning notes: **Pass 1 (MA-152)** below. Late polish: [#101](https://github.com/donpauleone69/match-analyser-edge-tt/pull/101) [#111](https://github.com/donpauleone69/match-analyser-edge-tt/pull/111) [#114](https://github.com/donpauleone69/match-analyser-edge-tt/pull/114) [#119](https://github.com/donpauleone69/match-analyser-edge-tt/pull/119) [#123](https://github.com/donpauleone69/match-analyser-edge-tt/pull/123).

### F — Theme tokens + addendum hygiene
Residual paint + DesignSystem SoT + tip cleanup: [#102](https://github.com/donpauleone69/match-analyser-edge-tt/pull/102) [#105](https://github.com/donpauleone69/match-analyser-edge-tt/pull/105) [#110](https://github.com/donpauleone69/match-analyser-edge-tt/pull/110).

SoT: `app/src/index.css` `@theme` · gate: `themeTokens.test.ts` · docs: `DesignSystem.md` §2.0

---

## Pass 1 morning notes (MA-152 / Track E)

**North star:** Tagging feels continuous — contacts → End/FA → Save, with History and Leave as deliberate overlays. Winner/server colour on the scrub; pad reads as the next step, not a giant dead button.

### Shipped overnight

| Card | PR | What landed |
|------|-----|-------------|
| MA-83 | [#63](https://github.com/donpauleone69/match-analyser-edge-tt/pull/63) | Contacts pad + colour-coded scrub marks |
| MA-92 | [#70](https://github.com/donpauleone69/match-analyser-edge-tt/pull/70) | Flush pad, caret playhead, open-draft range |
| MA-96 | [#74](https://github.com/donpauleone69/match-analyser-edge-tt/pull/74) | Serve-edge on pad; draft stripe/pastel; drop duplicate banner |
| MA-99 | [#76](https://github.com/donpauleone69/match-analyser-edge-tt/pull/76) | Dialog callouts, rail polish, scrub → History |
| MA-102 | [#80](https://github.com/donpauleone69/match-analyser-edge-tt/pull/80) | Set bar through form; slim Let/Discard/Save; Simple Leave |
| MA-108 | [#87](https://github.com/donpauleone69/match-analyser-edge-tt/pull/87) | Gap/1st in History; Live→; confirm Let/Discard |
| MA-112 | [#90](https://github.com/donpauleone69/match-analyser-edge-tt/pull/90) | End rail lock; Ready—tap Save dialog; No/★ HL |
| MA-116 | [#93](https://github.com/donpauleone69/match-analyser-edge-tt/pull/93) | Done mid-point; Hist · N / Del density |
| MA-124 | [#101](https://github.com/donpauleone69/match-analyser-edge-tt/pull/101) | History sheet (dialog, Escape, ordinals, ★) |
| MA-132 | [#111](https://github.com/donpauleone69/match-analyser-edge-tt/pull/111) | Viewing / Live set-bar recovery |
| MA-138 | [#114](https://github.com/donpauleone69/match-analyser-edge-tt/pull/114) | Leave Keep draft / Discard point dialog |
| MA-142 | [#119](https://github.com/donpauleone69/match-analyser-edge-tt/pull/119) | Save/Let/Discard form row — Ready + filled Save |
| MA-147 | [#123](https://github.com/donpauleone69/match-analyser-edge-tt/pull/123) | Contacts pad shorter; viewing-past Live→ hint |

### How it should feel (poke)

1. **Contacts** — Tap serve / Tap contact under the rail; server colour edge; count + Undo; idle 2s → End/FA. Viewing past: secondary pad + “Return live — Live → in the set bar”.
2. **History** — `Hist · N` capped sheet; Escape / X; ordinals + ★; Gap/1st; Del last with confirm.
3. **Viewing past** — set-bar: winner dot + Viewing a–b + **Live →**; Serve chip says Served.
4. **Leave mid-rally** — Keep draft vs Discard point vs Stay; Escape/scrim = Stay; does not finish the set.
5. **Form row** — incomplete: hint + muted Let; ready: **Ready — tap Save** + filled Save. Done finishes set (discard confirm mid-point); Leave soft-exits.

Tagging rules SoT unchanged. Scratch: `/cursor/stores/self/internal/overnight-track-e-status.md`.

### Leftovers

No clear Track E code leftover. Optional later: Done mid-point confirm copy if discard wording still confuses. Prefer smoke first.

---

## Still open

Tracks C + D + E: **none** — smoke only unless a real leftover. Next energy: **[smoke poke order](overnight-2026-11-14-smoke.md)**.

---

## Quick poke order

1. **Pass 1** — contacts, History sheet, Leave Keep/Discard, Viewing/Live, Save/Let/Discard row (MA-152 detail above).
2. **Match Review → Clips** — quieter header; Work on / Summary / Evidence → Clips trail + Stay + Fix round-trip; phone one-row icon trail; empty video state looks like the rest of the app (Track C poke list above).
3. **Serve / Receive** — number → evidence → playlist; quiet empty/loading; denser glance; focus dots quiet for “none” ([notes](overnight-2026-11-14-serve-receive.md)).
4. **BrowseDisclosure** — Arrow keys / Escape (keyboard a11y).

Full checklist: [overnight-2026-11-14-smoke.md](overnight-2026-11-14-smoke.md).
