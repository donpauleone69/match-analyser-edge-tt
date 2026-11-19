# MA-61 / MA-60 UX review — Simple ↔ Pass 1 visual parity

**Repo:** `donpauleone69/match-analyser-edge-tt`  
**Base:** `main` @ `3adffcc` (merge of [#45](https://github.com/donpauleone69/match-analyser-edge-tt/pull/45) / `1b00912`)  
**Compared:** `SimpleTaggingMatrixBlock` + `SimpleTaggingComposer` vs `Pass1FocusBlock` (`Pass1ShotMarkRail` / `TimelinePill`) + `Pass1FocusComposer`  
**Brief:** `internal/ma60-simple-pass1-visual-parity-brief.md`  
**Implement status:** `internal/ma60-simple-pass1-visual-parity-status.md`  
**Verdict:** **All reviewed checklist items PASS. No fix PR.**

---

## Summary

Code on main after #45 matches the Paul checklist for Simple tagging. Colour tokens, chrome order, Rally|Shot placement, detail sticky-tool function, and above-row labels with horizontal scroll all align with Pass 1 protocol. Item 7 is this review.

---

## Checklist

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | **Let before Discard** | **PASS** | `SimpleTaggingComposer` `formChromeRow`: Serve · … → **Let** → **Discard** → Save. `handleLetRally` clears taps, seeks serve−pad, returns to tapping, no score (Pass 1 redo-contacts path). |
| 2 | **Idle = Shot 1 Offensive non-pressed** | **PASS** | Matrix cells use `.tag-control` → `--color-pill-idle` / `--color-pill-idle-border` when not pressed (`style` only applied when `on`). Idle ★ no longer amber; None idle same. Matches Pass 1 `TimelinePill` idle styles. |
| 3 | **Shot # colours = Pass 1** | **PASS** | Simple headers mirror `Pass1ShotMarkRail`: player pastel (`bg-player-1-bg` / `bg-player-2-bg`), FOS `bg-shot-first-attack-bg`, end result washes / `bg-shot-end-bg`, review wash + `bg-review` dot, `border-contact-selected`, FA/End/`FA·E` captions, live `bg-contact-live` underline. |
| 4 | **Pressed = Pass 1 protocol** | **PASS** | Shared `PILL_COLOR`: Offensive/None → `--color-shot-first-attack`; End → `--color-shot-end`; Review → `--color-review`. ★ pressed → amber (Pass 1 highlight). Same CSS vars as Pass 1 `TimelinePill`. |
| 5 | **Rally\|Shot on video only** | **PASS** | Removed from matrix RALLY header (spacer only). `VideoStageChrome` `topLeft` in `SimpleTaggingComposer` + `RallyEditComposer` (simple edit mode). |
| 6 | **Detail = Pass 1 colour + function; scheme on grid** | **PASS** | On shot select: First attack / No attack (when ≥2 & end≠1), End point, Flag for review — same labels/kinds as Pass 1 sticky tools. End column: wing / Pivot / strokes / Result / miss reason via same `PILL_COLOR`. Pressed grid cells reuse that map. |
| 7 | **UX bot review** | **PASS** (this doc) | Brief item 7 / MA-61. |
| 8 | **Labels above sections; H-scroll** | **PASS** | Sticky-left label column gone. `SectionLabel` above Offensive / End / Review. Wrapper `overflow-x-auto` + `min-w-max` enables L→R shot-column scroll. |

---

## Token parity (pressed / detail)

| Role | Token | Simple | Pass 1 |
|------|-------|--------|--------|
| FOS / Offensive pressed | `--color-shot-first-attack` (`#7ed9bf`) | Yes | Yes |
| End pressed | `--color-shot-end` (`#b7c4d4`) | Yes | Yes |
| Review pressed | `--color-review` (`#f0c66a`) | Yes | Yes |
| Idle | `--color-pill-idle` + border | `.tag-control` / DetailPill idle | TimelinePill idle |
| Winner / error / air / wing / stroke / standing | Same `PILL_COLOR` keys | Detail strip | Sticky + row pills |

---

## Notes (not fails)

- **Scrollbar chrome hidden** (`scrollbar-width: none`) — scroll still works via trackpad/touch; brief asked for enablement, not visible bars.
- **Review kind picker** — Pass 1 row exposes Flag kind; Simple detail shows flagged → technical copy only. Status/implement scope treated sticky tools + End fields as the required function parity; not a brief miss.
- **Shot 1 Offensive** is disabled (`opacity` via disabled) so that cell reads dimmer than other idle cells; shared idle *token* is still pill-idle as specified.

---

## Fix PRs

**None.** No clear misses against the brief checklist.
