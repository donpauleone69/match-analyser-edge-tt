# Pass 1 — phase tags + rally markers (brainstorm)

_Chat notes — 2026-11-14. Session brainstorm for Paul agreement. **Docs only**; implement later._

**Approval doc (store):** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/docs/tagging-rules-and-phase-options.md`  
**Status:** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/ma75-tagging-rules-doc-status.md`  
**Code checked:** `main` @ `157ae3a` (#56)

---

## Why this note

Paul `/chat` 2026-11-14: lock stroke legality, per-phase optional L/R layouts, and UI chrome (phase markers, ★ on rail, drop Change FA, select-FA closes panel, dialog below rail amber→green, mute default). Later addendum: **No Attack** must not look selected when off — normal toggle; restyle in **MA-76**.

---

## Stroke classes (from code)

- **Attack:** Flick · Loop · Drive · Smash · Lob (`ATTACK_STROKE_OPTIONS`)
- **Defensive:** Push · Block · Chop (`DEFENSIVE_END_STROKES`)
- Loop on shot 2 **without** opening attack is illegal: that Loop *is* the FA, or the rally is No Attack. End=2 defensive → auto No Attack; end=2 attack → auto FA=2 (MA-73).

## Phase optional L/R (Paul)

| Phase | Left | Right | Drop |
|-------|------|-------|------|
| Serve | spin \| depth | Ball \| Tag=Review | placement; FA chrome; ★ in shot box |
| Pre-offensive | Wing (+Pivot) \| Depth | Ball (high/heavy) \| Review | push/touch/dig type; spin; FA button |
| FOS shot | Contact \| Safe/Aggressive | Review | Quality good/normal/poor; Change FA |
| FOS phase / reply | Initiative | Review | Change FA |
| Continuation | as today | Review; no FA button | Change FA |
| End / miss | separate: Result + wing/stroke compulsory; miss when Review+error; Forced=pressure | | |

★ = rally highlight on **rail**, not shot Tag.

## UI / rail

1. Phase markers/groups on rally row  
2. ★ on rally rail  
3. Remove Change first attack  
4. select FA → close shot panel until FA/No Attack  
5. After FA details → prefer close panel; user picks shot for optionals  
6. Guiding dialog **below** rail; amber incomplete → green can-save  
7. Mute default  
8. **No Attack** = normal rally-row toggle (idle when off; selected when on; re-tap clears). Today: strong red (`NO_ATTACK_RED`) even when visually loud off — **MA-76** restyles; model toggle already exists (`setFos(null)`).

## FOS naming

- **FOS shot** = first-attack contact (`fos`)  
- **FOS phase / reply** = opening-offense after FA (`fos+1`, UI also groups `fos+2` under INITIAL OFFENSE)

## Next

Paul signs store agreement → implement phase matrix + UI rules in a later sprint; **MA-76** = No Attack restyle only.
