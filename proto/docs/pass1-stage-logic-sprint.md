# Pass 1 stage logic + layout sprint

**Status:** Done — merged [#54](https://github.com/donpauleone69/match-analyser-edge-tt/pull/54)  
**Opened:** 2026-11-13 (Europe/London)  
**Repo:** donpauleone69/match-analyser-edge-tt  
**Brief:** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma71-pass1-logic-layout-sprint-brief.md`  
**Status notes:** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma71-pass1-logic-layout-sprint-status.md`

## Goal

Correct Pass 1 staged flow so compulsory steps, info copy, rail controls, and post-compulsory optional tagging follow real domain logic (pre-offensive / first offensive / continuation), not invented UI chrome.

## Paul bugs / intent (2026-11-13)

1. **End reason missing** on End point — must be present with end shot details.
2. **All direction text** lives in the **same info area just above the Rally row**.
3. After entering end reason (e.g. net), flow must **prompt to choose/confirm the end shot** with explicit text — must **not** skip straight to first attack.
4. **"Tap a shot"** (and similar) belongs in that **same info/dialog area**, not a stray box.
5. **No Attack** sits at the **end of the Rally list**, same shot-button style, **strong red**.
6. After first-attack stage starts: tapping a **different** rally shot **reassigns** first attack to that shot.
7. Must **prompt for first-attack details** and require them before advancing (no silent skip).
8. When compulsory is complete: video **rally loop** (not stuck on shot loop). Selecting a shot loops from **that shot onward** in the rally.
9. Optional phase must **not** show bogus chrome like “End point / first attack / no attack / review / star” as a fake checklist. Optional = real additional details only.
10. Additional-details phase should surface things like **serve options, pressure**, and other attrs — framed by phases: **pre-offensive**, **first offensive**, **continuation**.

## Paul answers (locked)

1. After Result: info box prompts Wing/Stroke (+ end fields); **shot locked** to End — cannot change shot.
2. Move on when **Result + Wing + Stroke** (B). Serve-only (`end===1`): Result only (wing/stroke not on Pass 1 serve allow-list).
3. No Attack = no FA, skip FA details; **undoable** in optional → must choose FA or No Attack again. Save gate: FOS decided (`fos` or `noFirstAttack`).
4. (A) Post-compulsory: rally loop; shot tap = from-shot-to-end; **hide** Rally|Shot. **Mute by default when shot looping.**
5/7. Optional attrs **by phase** from Pass 1 allow-list (`derivePass1ShotTagAllowList`): High (ball-before) · Safe (FA) · Initiative (reply) · wing/stroke where allowed · Review/★/miss-reason. Not inventing Rally Focus spin/placement/Weak/Heavy (Pass 1 mapper strips them). “Pressure” → miss-reason Forced when Review + error.
6. Review/★ only in selected-shot optional detail; ★ = rally highlight; never fake End/FA checklist.
8. FA details stage: **FA shot loop only.**

## Stage machine (shipping)

`contacts` → `end_details` (Result) → `end_shot` (Wing+Stroke, locked) → `select_fa` (No Attack on rail, red) → `fa_details` → `optional`

## Out of scope

Persistence sprint (MA-16). Matrix/Simple mode revival. Restoring full Rally Focus schema fields into Pass 1.
