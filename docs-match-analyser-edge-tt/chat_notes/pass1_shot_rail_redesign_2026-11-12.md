# Pass 1 shot rail redesign — 2026-11-12

## Problem
FA / Rv / No FA are cryptic and tiny. Fixed 12 grey slots after End are noise. The rail should read as the rally left-to-right and as the place to mark First attack, End, Review, and Server.

## Solution
1. **Server** — two player-coloured pills in this section (shot 1 = server). Tap to choose.
2. **Mark modes** — full words: **First attack** | **End** | **Review**. No "No FA": First attack unselected means none; tap the FOS cell again to clear.
3. **One shot strip** — only real contacts (`visibleShotNumbers`). When End is set, strip ends there (no grey ghosts).
4. **Colour** — cell fill = player; cell frame = phase; FOS / End / Review accents on the marked cells.
5. **Outline** — same as the shot list: live = `outline-contact-live`, selected = `border-contact-selected`.
6. **Scroll** — marking First attack or End (and selecting) scrolls that shot row into view.

## Shipped (pass 1)
- Replaced FA / Rv / No FA with **First attack | End | Review** (full words).
- No First attack = nothing selected; tap the FOS cell again to clear.
- Marking FOS/End selects that shot and scrolls the detail row into view.

## Shipped (pass 2 — agreed package)
- Board width = `max(10, contacts + 2)`; unused and after-End stay visible and grey.
- End mode can move End onto after-end contacts; unused slots not tappable.
- One tools row: **server toggle** (cycle) above slot 1 + quiet **Mark** First attack / End / Review.
- Live = underline; selected = top dot; fixed cell size (no box outline/ring).
- Detail list still clipped to End; video-chrome server left as duplicate for now.
- Helpers + tests: `railSlotCount`, `railSlotKind`.
