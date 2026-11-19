# Review notes (Paul)

Add here or paste in chat — I'll append. Address after current autonomy batch, or sooner if blocking.

## Open

### Tagging test flows (v0.6, 2026-11-17)

Paul is reviewing each test flow in turn; hold changes until his reviews are finished. Options he gave are listed as choices to settle then.

**General (any tagging flow)**
- G1. Pause in bite size chunks is essential, with progress very visible so you know where to pick up.
- G2. A whole set is too long as one contact and score run. Choose a pause point: (a) towel break every 6 points, (b) set end only, (c) user pauses whenever.
- G3. Editing throughout needs real thought: Paul made many mistakes tapping contacts and when reviewing.
- G4. A review button to check contacts are accurate.
- G5. Finish set lets the video play on a little, to confirm it really is the set end.
- G6. Highlight a rally. Where: (a) at point end, (b) in the rally row, (c) both.
- G7. "Point to" belongs with the last shot options (for example BH attack, Net, point to opponent); it feels natural and gives a natural save and quick audit point. It can be worked out and auto selected; when that disagrees, the likely cause is an extra contact (offer a button to correct it) or the wrong server (the first question). Where: (a) in the first pass, (b) rally by rally (Paul leans this way).

**Open end**
- O1. Paul really likes this method.
- O2. Add the rally end reason during point end.

**Spine**
- S1. Paul really likes the Serve, Receive, Third and Finish buttons. They should move on by themselves as answers are made, and they are a solid reference for where you are in the rally.
- S2. They do not replace the Rally Row, but they let that row be for information only.

**More general**
- G8. Name: the row that holds the shots is the Rally Row, labelled "Rally".
- G9. The Videos section belongs in Tag, not Details; it is part of that process.
- G10. In the protos the video should loop the shot being tagged. Needs general video rules: play, pause, resume, loop shot, loop rally, and so on. First step: just loop the shot being tagged.
- G11. Drop the Offensive and Defensive toggle (a mental leap) and intent (an opinion). Strokes as two rows, BH and FH, each with Touch, Push, Flick and Loop: one click.
- G12. Last shot and end are one thing, in the order you think it: "I hit a BH loop into the net and my opponent won the point". That is the order of choices.
- G13. The Rally section needs a way to delete or add contacts.
- G14. No global "who serves" toggle: the server is picked up in the rally, from the contacts and the end marking, or from the serve tag.
- G15. The flows are converging on shared ideas. Next: pull all notes into one global set, then pick and build one best of all prototype.

**End first**
- E1. Notes G10, G11 and G12 came from this flow.

**Current**
- C1. On the first point, tag the end with the same order as G12. From the end it can count back and work out the server.
- C2. Like the other flows, it needs delete and add contacts in the Rally section (G13).

10. **Tagging** — Paul prefers Pass 1. Clip windows Phase 3. MA-70 staged Pass 1 flow shipped — try path in status.

## Done

27. **Pass 1 sync to tagging-rules** (MA-77) — Lob defensive; phase L/R optionals; ★ on rail; dialog below amber→green; drop Change FA/placement/Weak/Quality; Safe/Aggressive; mute default; rally loop when no shot selected. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma77-pass1-rules-implement-status.md`
26. **No Attack rail toggle restyle** (MA-76) — idle when off; red only when on. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma76-no-attack-toggle-status.md`
25. **Pass 1 optional Rally Focus + Basic/Advanced** (MA-74) — optional stage merges RF phase fields; mapper persists them; `framework_confirmed`=Basic, `detail_complete`=Advanced (`derivePass1AdvancedDataComplete`). Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma74-pass1-optional-rf-status.md`
24. **Pass 1 FA undo + impossible-FA auto-skip** (MA-73) — fa_details: tap FA / re-tap clears → select_fa; reassign other ≥2; save requires FA wing+stroke; end=2 defensive → No Attack; end=2 attack → FA=2 skip; End=FA skips fa_details. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma73-pass1-fa-undo-status.md`

23. **Pass 1 staged explicit flow** (MA-70) — Info-box stages: contacts → end details → select FA / No attack → FA details → optional/save. Sticky = info + RALLY only; optional tags in shot detail; End colour not grey; FA rail paint only after chosen. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma70-pass1-staged-flow-status.md`
22. **Pass 1 labels polish** (MA-69) — Checklist above shot rail (green when compulsory done); RALLY + QUICK TAGS labels; Show all below detail; Result no longer spawns SHOTS. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma69-pass1-labels-polish-status.md`
21. **Pass 1 flow refine** (MA-68) — Always-select End; quick-mark End/FA/Review/★; FA 2nd tap = No; selected-only detail; End→Result→rally+FA; no flag-kind; miss optional+Review; Rally|Shot in transport; no Simple|Pass1 overlay. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma68-pass1-flow-refine-status.md`
20. **Simple chrome onto Pass 1** (MA-67) — Pass 1 gets Simple compact HUD + Let/Discard/Save bar; Pass 1 tagging kept; #49 inverted Simple←Pass1 chrome **reverted**. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma66-pass1-simple-chrome-status.md`
19. **Pass 1 chrome on Simple** (MA-66 / #49) — **WRONG DIRECTION** (inverted). Superseded/reverted by MA-67. Status was: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma66-simple-pass1-chrome-status.md`
18. **Simple Pass 1 detail retheme** (MA-65 / #48) — Selected-shot card matches Pass 1 ShotRow (pastel wash, 3px stripe, role badges); matrix IA kept. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma65-simple-pass1-retheme-status.md`
17. **Mute + matrix spacing** (MA-64 / #47) — Mute on shared TransportCluster; Off/End/Rev + detail ChoiceRows use `--control-gap`. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma64-mute-matrix-spacing-status.md`
16. **Simple matrix density** (MA-63 / #46) — Drop FA/End captions under shot#; tighten matrix gaps; lift score+transport off progress bar. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma63-simple-matrix-density-status.md`
15. **Simple ↔ Pass 1 visual parity Phase 2.5** (MA-60) — Let before Discard; Pass1 idle/pressed/shot#/detail colours; Rally|Shot on video; row labels above sections. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma60-simple-pass1-visual-parity-status.md`
14. **Simple matrix consistency Phase 2.4** (MA-59 / #44) — Square `.tag-control` cells; no outer grid; RALLY None + cycle Rally/Shot + ★; score/transport shared h-7 baseline. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma59-simple-matrix-consistency-status.md`
13. **Simple tagging layout Phase 2.3** (MA-58 / #43) — Smaller score HUD; transport align; matrix grid + selected outlines; RALLY column (No Atk + Rally|Shot + Highlight); drop Redo+Leave; combined Serve·Hero/Discard/Save row; Pass1 shot detail. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma58-simple-tagging-layout-status.md`
12. **Simple tagging polish Phase 2.2** (MA-57 / #42) — Framed shots + green underline; drop FA? chip + mode bar + Mark Offensive hint; mode overlay on video; transport fit/align; Pass1 detail; action row above matrix; Rally|Shot by shot numbers. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma57-simple-tagging-polish-status.md`
11. **Simple tagging UX Phase 2.1** (MA-56 / #41) — No-attack on Offensive row; End auto + wing/shot; Rally|Shot loop; pinned matrix; HUD bottom-left; gold ★ left; Offensive+End grouped. Status: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma56-simple-tagging-ux2-status.md`
10b. **Simple tagging UX Phase 2** (MA-55 / #40) — CNT matrix Off/End/Rev; ★ on Save; More flattened; FOS/End detail.
1. **Pass 1 mandatory fields** (MA-35) — Save requires End + ending/winner + First attack decided (`fos` shot **or** explicit `noFirstAttack`; serve-only End=1 skips FA). Undecided `fos === null` is distinct from No attack.
2. **FOS + end buttons** (MA-35) — Sticky tools: separate **First attack** / **No attack** (✓ when set; re-tap → undecided); End ✓; status line `FA n` / `No attack` / `FA?` + `End n` / `End?`; save hint when blocked.
3. **Shots list on phone** (MA-35) — ChoiceRow / ShotTypeRow use `flex-wrap` (no horizontal truncate).
4. **Mid-draft persist** (MA-36) — Reload recovers in-progress Pass 1 point (tapping contacts or open form) via localStorage; cleared on save / discard / redo / Done.
5. **Legacy incomplete badges** (MA-36) — Rallies that fail Pass 1 completeness show **Incomplete** in Review; Incomplete filter; still out of stats.
6. **Phone stroke density** (MA-36) — Compact stroke sets under 640px.
7. **Rail FA/End text** (MA-36) — Shot rail shows FA / End / FA·E labels under marked slots.
8. **MA-37 flow smoke nits** — Empty-video score HUD no longer covers “Click to load”; Training “Back to Home”; hide compare-card F-codes; “1 rally” plural; remove empty Account settings stub; committed `app/public/fixtures/smoke-set.mp4`.
9. **MA-38 Clips path polish** — Work on→Clips→Download smoke; phone Rallies intro shortened; Work on/Clips copy + density nits (Save as reel, Rally/Shot, Flagged shot label).
