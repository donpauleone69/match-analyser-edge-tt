# Overnight session paused — 2026-11-12

- **Branch:** `overnight/player-dashboard` (pushed)
- **Rollback point:** tag `pre-overnight-2026-11-12` (= `d2c14ba`, on remote)

## Commits

| Hash | What |
|------|------|
| `e80d64f` | Pure rules + tests: evidence rally ids in match story, attack story (D1/D2/A3/A4), compare tones, review-shot grouping, highlights, rally score chain, set tagging status. Two nullable `player2_id` tsc fixes. |
| `d84ba67` | Match Review rebuilt (`/matches/:id`): tabs Overview / Work on / Highlights / Rallies (`?tab=`), clickable % (count) cells → evidence drawer → play as playlist, clip player using the stored set video, star toggle, sets panel (continue/start tagging, start over, add set). New `/matches/:id/edit-rally?set=N&rally=R` saves a single rally and re-chains later scores. |

Browser-tested on `poverton-vs-villain-20261111-75ur`: all tabs, evidence drawer, player prev/next with video, edit → save → notice → Work on update (test edit reverted).

## Not done

- Navigation cleanup: sidebar order/labels, mock Dashboard → real Home, match-list status CTAs, removing `SetSelectionModal`, making "Review match" the main action on the tagger's completion screen.
- Serve (B) / Receive (C) cards (shown as "Coming").
- `specAddendumMVP.md` entry + version history.
- Pre-existing failing test: `calculateServer.test.ts` "score 9-9" (file untouched).
- Untracked `tmp_patch_phase*.py` and `app/vite.config.js` left as found.

## Suggested next step

Once direction is clarified: do the navigation cleanup (Matches list → Match Review as the single hub), then the spec addendum.
