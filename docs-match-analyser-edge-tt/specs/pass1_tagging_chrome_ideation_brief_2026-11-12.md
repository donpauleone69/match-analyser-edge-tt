# Pass 1 Tagging Chrome Ideation Brief — 2026-11-12

## Status

Coordinator brief, multi-model ideation record, decision record, implementation plan, and prototype outcome. The brief sections below are the fixed input; later sections will record convergence and delivery.

## Product context

Edge TT Match Analyser is a local-first table tennis match video tagging tool. Pass 1 Focus currently behaves like two modes on one page:

- **Tapping / contact capture:** tap bat contacts; idle finalizes them into a rally.
- **Form / shot tagging:** answer shot questions while the video loops the rally.

The product direction is to unify awareness between a set's points and a rally's contacts, eventually on one surface. Video overlay, transport, and under-video chrome are all available design space.

## Problem

- The rally strip and shot rail both look like numbered coloured boxes, creating a cognitive clash at 15–30 points per set.
- Encoding server, winner, score, selection, and next-point state in one strip overcrowds it.
- Written serve labels above point cubes make the busiest row busier.
- The on-video chrome has oscillated between a timebox, large contact counter, and score at different edges.
- The prior proposal—unnumbered blobs only under the video—may be too cramped and underuses the video overlay.

## Non-negotiables

- Prioritize ease of use, understandability, and consistency.
- Sets can exceed 30 points at deuce.
- Server is a set/point concern, alternating every two serves and every point at deuce; it is not a per-shot control.
- Numbers `1..n` mean contacts within the current rally.
- Score remains glanceable during tagging.
- Keep a reachable escape hatch for the prior Pass 1 chrome while evaluating the preferred composition as the primary path.
- Follow the project architecture: composers orchestrate, blocks present, pure domain logic stays in rules, feature code imports UI through `@/ui-mine`, and theme tokens live in `index.css`.
- Manual browser judgment is sufficient for this MVP prototype.

## Goals

1. Establish one mental model: the user always knows whether an action targets SET/POINT or RALLY/SHOT.
2. Create a credible path to one page for contact capture and shot tagging.
3. Remain readable beyond 30 points without horizontal chaos.
4. Keep serve, score, winner history, and current contacts available without duplicating the shot rail's visual language.
5. Design video, overlay, and under-video chrome as one composition.
6. Support recovery: select a past point, seek, delete the latest contact, and continue to the next point without persistent clutter.

## Questions every concept must challenge

- Do we need a persistent point strip at all?
- Can the video overlay own set state?
- Should numbers only ever mean shots?
- Is tap versus form still the right split?

## Required ideation output

Each independent exploration must provide:

- Assumptions being made and which assumptions should be questioned.
- Three to five distinct concepts, with compact sketches where useful.
- A clear allocation of what lives on video, under video, and in sticky chrome.
- How serve, score, point history, current contacts, and shot tagging cohere.
- Failure modes at 30 points and at approximately 384 px phone width.
- A migration path from the current tap/form split to a unified surface.
- The smallest prototype that can prove the direction.

## Current technical snapshot

- `Pass1FocusComposer` phases: `setup | tapping | form | complete`.
- `RallyCubesStrip`: serve-grouped, numbered, winner-coloured point cubes.
- `Pass1ShotMarkRail`: shot numbers `1..n`; its server toggle has already been removed.
- Shared `VideoStageChrome` and `TransportCluster` render bottom overlay controls and a thin progress bar.
- The score badge recently moved to the bottom of the video; time overlay is off by default while tagging.
- Source area: `app/src/features/shot-tagging-engine/`, especially `composers/Pass1FocusComposer.tsx`, `blocks/Pass1FocusBlock.tsx`, and `app/src/ui-mine/VideoPlayer/`.
- Change log: `docs-match-analyser-edge-tt/specs/specAddendumMVP.md` through approximately v3.59.

## Prior direction to challenge

An earlier soft plan proposed unnumbered winner blobs under the video, serve on the score badge, and numbers only on the shot rail. That separation may be sound, but this exercise must explore a broader composition using video-overlay real estate and the intended convergence of contact capture and shot tagging.

## Process

1. Run four independent model explorations in parallel.
2. Compare concepts against the goals; reject directions that fail scale, mobile clarity, or mental-model consistency.
3. Run one critique round against the leading direction and its weak assumptions.
4. Record the chosen direction, rejected alternatives, concrete interaction map, files, and prototype entry point.
5. Implement at least one clickable alternative without replacing the current default.
6. Manually verify the prototype at desktop and narrow phone width; record significant work in the spec addendum.

## Decision record

### Inputs and convergence

Four independent explorations ran with Claude Opus 5.5, Gemini 4 Hydrogen, Grok 4.7, and Muse Wonder. They were given the same goals and told to challenge the need for a persistent point strip, the tap/form split, and the assumption that set context must live under the video.

Across the explorations, five concept families emerged:

1. **A denser or compressed point strip.** Preserve direct point access but simplify each point to winner colour, score, or an unnumbered mark.
2. **Overlay-owned set state.** Put score, server, and current task in a broadcast-style video scorebug; move point history behind deliberate disclosure.
3. **A slim set command bar outside the picture.** Keep the video clear and place score/server immediately above or below it.
4. **History on the video scrub.** Mark rally ends as winner-coloured ticks and use a drawer only for exact score lookup.
5. **A contextual unified workspace.** Keep one video and one shot rail while the lower workspace changes from capture pad to shot questions.

The strongest shared conclusions were:

- A permanent 30-point row is the wrong primary navigation at phone width.
- `1..n` boxes should consistently mean contacts/shots in the current rally.
- Score and server need one glanceable home; server correction must not masquerade as a shot action.
- Removing the point strip cannot also remove fast recovery. The latest point and a route to older points must remain one tap away.
- A history drawer must overlay the workspace rather than resize the capture target or shot form.
- Selecting history while an unsaved point is being tagged risks a video/form mismatch and should be locked or made an explicit read-only preview.
- A fixed-width, horizontally scrolling shot rail scales more honestly than crushing 15–20 contacts into one phone row.

### Critique of the leading direction

The first leading direction was a large top-video set HUD plus a ledger-only history model. The critique round rejected that exact form:

- On a 384 px phone, a two-row HUD plus bottom transport can cover too much of a roughly 216 px-tall video.
- A hidden ledger alone makes save confirmation, last-point recovery, and deuce review too expensive.
- An in-flow ledger steals height from the `Tap contact` target and shot form.
- A permanent one-tap server toggle is too dangerous once a rally has contacts.
- Seeking a past point while the open form still edits another point is a data-corruption risk.
- The prototype-only chrome switch competes with `Change`; it is acceptable for evaluation but not part of a production direction.

The critique preserved the core idea but required a smaller scorebug, a one-tap latest-point context, an overlay ledger, safe preview state, and a scalable shot rail.

### Chosen direction: Scorebug + set context + precision ledger

Choose a layered composition rather than another all-purpose strip:

1. **On video — glance layer.** A compact, non-interactive scorebug shows set, score, players, and server colour. It does not own correction actions. Existing transport remains at the bottom.
2. **Immediately under video — set context layer.** A single row states server, latest winner/score, and `History · n`. When previewing a past point it becomes `Viewing a–b · Live →`. During an unsaved/open point, history navigation is locked.
3. **On demand — precision history.** `History` opens an overlay ledger with score-first rows, winner colour, server, and highlights. It scales vertically past 30 points and closes after selection.
4. **Sticky rally layer.** Numbered cells belong only to contacts/shots. In the prototype they keep a minimum width and scroll horizontally rather than shrinking indefinitely.
5. **Workspace layer.** Capture uses the large contact target; tagging uses the existing shot list. The set context and shot-number language remain consistent across both, creating a path to one surface without pretending the two tasks have identical controls.

**Decision update (2026-11-13):** After prototype trial, the scorebug + set-context + ledger composition is the **default** Pass 1 chrome. The prior cube-strip chrome remains reachable via `?chrome=legacy` / **Classic chrome**. The next design iteration should still test winner ticks on the video scrub as a zero-row recent-history glance layer; it may reduce how often the ledger is opened without reviving the competing numbered strip.

### Rejected alternatives

- **Keep the full numbered point strip:** direct access is good, but it continues the competing-number language and does not scale cleanly through deuce.
- **Unnumbered blobs as the entire history:** visually quieter, but weak for exact recovery and still becomes a long horizontal sequence.
- **Large interactive overlay panel:** overuses playable pixels and creates small, risky server/history targets.
- **Ledger-only history:** scales, but hides too much routine feedback.
- **Separate tap and form pages:** preserves implementation simplicity at the cost of the unified mental model.

## Implementation plan

### Entry point

- Default: normal Pass 1 URL, no `chrome` parameter → scorebug / set-context / ledger chrome.
- Classic escape hatch: append `&chrome=legacy` (or use **Classic chrome**).
- A discreet `Classic chrome` / `Default chrome` switch updates the query parameter so the prior path is not stranded.

### Files

- `app/src/features/shot-tagging-engine/composers/TaggingUIComposer.tsx`
  - Default to proto unless `chrome=legacy`; provide the switch callback.
- `app/src/features/shot-tagging-engine/composers/Pass1FocusComposer.tsx`
  - Select proto versus classic composition without changing persistence or domain behavior.
  - Keep the `RallyCubesStrip` path as the legacy escape hatch.
  - Wire scorebug, set context, history preview, and safe capture lock.
- `app/src/features/shot-tagging-engine/blocks/Pass1ChromeProtoBlock.tsx`
  - Presentational scorebug, set context row, and scalable point ledger.
- `app/src/features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx`
  - Horizontally scrolling shot rail used by the default (proto) path.
- `app/src/features/shot-tagging-engine/blocks/index.ts`
  - Export prototype blocks.
- `docs-match-analyser-edge-tt/specs/specAddendumMVP.md`
  - Record the alternative and rationale; later note the default switch.

### Interaction map

- `Classic chrome` → add `chrome=legacy`; `Default chrome` → remove it.
- Scorebug → display only; set/server state is not changed by tapping the overlay.
- `Last · winner · a–b` → seek to the latest completed point.
- `History · n` → open score-first ledger over the workspace.
- Ledger row → seek, close ledger, enter preview; capture is disabled.
- `Viewing a–b · Live →` → return to next/open point and re-enable capture.
- Open rally/form → history is locked to prevent video/form mismatch.
- Shot cell → existing seek/select behavior; prototype cells scroll at fixed width beyond the phone viewport.

## Prototype outcome

Implemented as an additive variant, then promoted to the default Pass 1 chrome (2026-11-13). The prior cube-strip chrome remains reachable via `chrome=legacy` / **Classic chrome**.

Manual browser checks used an existing 13-point set and a narrow phone-style viewport:

- The compact scorebug keeps `5–8` and server visible without the old point strip.
- The set context row remained readable with `Last · P · 5–8` and `History · 13`.
- The ledger showed winner, score-after, server, and highlight state without resizing the capture target.
- Selecting `5–8` closed the ledger, exposed `Viewing 5–8 · Live →`, and disabled contact capture until returning live.
- Past-point preview renders that saved rally's actual contacts and server in the rail; live mutation controls (`Tap`, `Let`, `Undo`, `Redo`, `Last`, `Del`, `End`) are inert until returning live.
- The classic path restores its serve-labelled numbered cube strip when `chrome=legacy` is set.
- Prototype files lint with no errors. The full build remains blocked by two pre-existing TypeScript errors in `ScopeReviewComposer.tsx` and `pass1FocusModel.ts`; neither is introduced by this prototype.

### Open risks and next tests

- Test whether a tiny winner-tick layer on the video scrub provides enough recent-run awareness to reduce ledger opens.
- Decide whether the Classic chrome escape hatch can be removed once the default composition is stable; it currently sits below `Change` as a temporary bridge.
- Test actual 18–25 contact rallies; horizontal scrolling preserves hit size but may need auto-scroll to the live contact.
- Add an explicit visual treatment for the read-only preview rail; its data is now correct and live mutations are locked, but the read-only state is conveyed mainly by the `Viewing…` context.
- Validate scorebug placement against footage where the far player or venue scoreboard occupies the top-left.
