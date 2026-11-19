# Track D — Serve / Receive morning notes (MA-150)

**Status:** Shipped through **#122** (MA-143) · tip includes later thin polish from other tracks.  
**Worker:** [Serve Receive](https://cursor.com/agents/bc-7de518ca-6813-508b-b03e-8b34f2837ec3) · parent morning: [overnight-2026-11-14-morning.md](overnight-2026-11-14-morning.md)

## What landed (proof pages)

Curated **Serve Data** + **Receive Data** under Match Review Summary: headlines → glance/detail cards → sticky Focus playlist → watch / Clips.

| Slice | PR | What |
|-------|----|------|
| Pages + playlist | [#66](https://github.com/donpauleone69/match-analyser-edge-tt/pull/66) [#72](https://github.com/donpauleone69/match-analyser-edge-tt/pull/72) [#78](https://github.com/donpauleone69/match-analyser-edge-tt/pull/78) | Curated stats→playlist; `?focus=` deep-link; sticky chrome |
| Browse shell | [#86](https://github.com/donpauleone69/match-analyser-edge-tt/pull/86) | Adopt `PlaylistBrowseShell` (Track C) |
| Stats cards | [#94](https://github.com/donpauleone69/match-analyser-edge-tt/pull/94) | Denser cards + headline detail/focus |
| Evidence ↔ playlist | [#100](https://github.com/donpauleone69/match-analyser-edge-tt/pull/100) | Clear/sync/soft-highlight/cover-match (+ [#108](https://github.com/donpauleone69/match-analyser-edge-tt/pull/108) tip markers) |
| Empty / loading | [#113](https://github.com/donpauleone69/match-analyser-edge-tt/pull/113) | Dashed empties, focus-aware copy, load/not-found tokens |
| Glance cards | [#122](https://github.com/donpauleone69/match-analyser-edge-tt/pull/122) | B0/C0 denser glance, short labels, lead tint, full-width above detail |

Related (not Track D-owned): focus-dot token [#120](https://github.com/donpauleone69/match-analyser-edge-tt/pull/120); sticky under review chrome / trails from Track C.

## How to poke (30–60s)

1. Summary → **Serve** (or Receive).
2. Tap a headline / % → evidence opens; Focus playlist syncs; linked rows soft-highlight.
3. Switch Focus → evidence clears; close drawer → synthetic “from evidence” focus drops.
4. Glance card scans first (short labels); detail card under it on large screens.
5. Empty focus / empty detail: quiet dashed shells, not loud neutrals.

Full checklist: [overnight-2026-11-14-smoke.md](overnight-2026-11-14-smoke.md) §5.

## Leftovers (smoke-only unless loud)

- **B1/C1 detail** row labels still longer than glance — OK; only thin PR if they feel noisy next to glance.
- **Third-ball / leak** story copy — leave unless wrong with real tagged data.
- No further Track D chrome unless smoke finds a real leftover.
