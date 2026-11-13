# Pass 1 Tagging UX Pass — 2026-11-13

## Goals

- Make displayed slow-motion speed equal the real HTML video playback rate.
- Focus playback on the selected shot: stored `contact[n]` through `contact[n+1]`, clamped to the rally bounds; the last shot ends at the rally loop end. (v3.65.0: the 300 ms click-latency buffer is applied at tap capture, not again at playback.)
- Simplify the shot-form action chrome and give First attack / End / Review a consistent, low-friction home.
- Restore a clear rally-level server correction.
- Use a compact WTT-style two-row scorebug: `Name | Sets | Points`, with a visually distinct Sets column and integrated serve affordance.
- Replace user-facing focal-player “Local” copy/defaults with “Hero” without changing durable IDs or technical local-device/session concepts.
- Keep default proto chrome and preserve the shared/classic `?chrome=legacy` path.

## Working decisions

- Playback truth is the `<video>` element; the store and TransportCluster must drive and reflect the same rate.
- Selected-shot focus temporarily narrows constrained playback. Clearing selection, saving/advancing, or returning to contact capture restores the whole-rally loop.
- Set score remains in the scorebug; numbered cells remain shots only.
- Server correction belongs to rally/set context, never to an individual shot.
- First attack / End / Review will be evaluated as sticky contextual tools, row-inline actions, long-press actions, and rail badges. The implementation will favor discoverability, one-tap use, mobile consistency, and minimal duplication; long-press alone is not acceptable for primary actions.
- “Hero” is presentation terminology. Database IDs, enum values, local-device auth/session keys, storage keys, and unrelated tournament type `local` remain unchanged.

## Agent split

- **Playback specialist — Claude Opus 5.5:** inspect VideoPlayer, playback store, TransportCluster, Pass 1 constrained playback, and pass1FocusModel loop helpers; implement and verify speed fidelity plus selected-shot loop ownership.
- **Chrome/UX specialist — Muse Wonder:** audit redundant top-row actions, compare placement options for First attack / End / Review, choose and implement the clearest composition across proto and shared classic surfaces.
- **Scoreboard/identity specialist — Gemini 4 Hydrogen:** implement WTT scorebug, explicit rally-level server correction, and a scoped user-facing Local → Hero rename.
- **Coordinator:** inspect all changes, resolve overlaps in shared Pass 1 files, run type/build checks, manually test the default browser surface and spot-check `?chrome=legacy`, then update the spec addendum from v3.63.0.

## Verification

- Browser at `http://127.0.0.1:5173/`: select first/middle/last shots and inspect loop bounds; compare displayed speed with `video.playbackRate`.
- Verify clearing focus restores whole-rally behavior and FA flow does not leave stale bounds.
- Verify scorebug rows/columns, Sets background, serve correction, Hero copy, and the chosen FA/End/Review placement at desktop and narrow width.
- Run the repository’s available lint/type/build checks and distinguish newly introduced failures from pre-existing ones.

## Delivered decision

- Chose **sticky contextual selected-shot tools**: `First attack | End point | Flag for review`. Row-inline duplication, long-press, and actionable rail badges were rejected.
- Clarified the separate rally/session row as `Redo contacts | Discard rally | Highlight | Save rally | Delete last point | End set | Match review`; removed the duplicate Let and row-inline End controls.
- Delivered as spec addendum **v3.64.0** with focused tests and manual proto / 384 px / classic-browser checks.
