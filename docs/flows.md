# Flows

Two jobs: tag a match, and read insights and reels from the tags. Routes are only what `app/src/App.tsx` declares. Anything else, including an unknown path, renders the gate at `/`.

| Path | Page | Job |
|---|---|---|
| `/` | `app/src/pages/GatePage.tsx` | Enter. Login, register, and device session are stubs. Each button that works opens `/matches` |
| `/matches` | `app/src/pages/MatchesPage.tsx` | Home. Filter by opponent, event, status. Open a match or start one |
| `/matches/:matchId` | `app/src/pages/MatchIndexPage.tsx` | Sends you to the tab for this match's phase |
| `/matches/:matchId/insights` | `app/src/pages/MatchInsightsPage.tsx` | Insights for this match |
| `/matches/:matchId/details` | `app/src/pages/MatchDetailsPage.tsx` | Opponent, event, date, result, set scores, delete |
| `/matches/:matchId/tag` | `app/src/pages/MatchTagPage.tsx` | Videos, set marks, per-set Tag / Continue / Open |
| `/matches/:matchId/tag/:setId` | `app/src/pages/TagSetPage.tsx` | Set Tagger. Fills the screen. The hub tabs hide |
| `/insights` | `app/src/pages/InsightsPage.tsx` | The same cards, pooled across filtered matches |
| `/account` | `app/src/pages/AccountPage.tsx` | Profile, theme, demo data, backup stubs, version |

There is no Create page, no Find route, no Clips hub, and no `/home`. A new match is created from Matches and opens in the hub.

## Opening a match

`derivePhase` then `deriveDefaultMatchTab` in `app/src/rules/match.ts`:

- `new`: no video and nothing tagged. Opens Tag.
- `ready`: video, nothing tagged. Opens Tag.
- `partial`: tagging started, match not finished. Opens Tag.
- `complete`: a result is in, no set is in progress, and every set that result lists is settled. Opens Insights.

A missing id on the index goes to `/matches`. A missing id on a tab shows "Match not found" with Back to Matches.

The hub header (`app/src/features/match/composers/MatchHubComposer.tsx`) is Back, then Insights, Details, Tag, then the match name. Details carries a Differs mark when `matchDiffers` is set. Back goes to `/matches`. Main nav (Matches, Insights, Account) is hidden on every match path, including a missing match.

## Tag a match

Details can be filled any time. Nothing there blocks tagging. The result dictates how many sets count. Set scores are typed. A finished set whose typed score disagrees with the tagged score is Differs. "Use tagged" copies the tagged score into the typed one.

Tag holds the videos in play order and one row per set. A set mark is a start and end on that list, and may cross onto the next video. Each set has one action: Tag, Continue, or Open (`lineAction` in `app/src/rules/marks.ts`). Adding a video stays on Tag.

The Set Tagger tags one rally at a time. The question order is `docs/tagging-rules.md`. Save set returns to Tag. Edit Set steps saved rallies, and gaps, to edit, delete, or insert. Undo is on the picture.

## Read the tags

Match Insights and global Insights use the same five cards plus a marked-parts card: Phases, Serve, Receive, Attack, End, Marked (`app/src/rules/insights.ts`). Global Insights adds a filter (opponent, event, dates) stored in `settingsStore`. Chips show only while a filter is set. The filter persists across visits because settings do. An empty global page says to tag a rally. Each card can play its reel. Download on a reel stays disabled. Match Insights has no Improve section and no second row of tabs.

## Account and demo

The gate does not check a password. Fake sign-in, fake register, and "Continue on this device" all call `navigate('/matches')`. Account can switch demo data between the filled seed (14 matches) and empty. That switch is the one preference that also changes `matchStore`. Import, export, sync, and profile save are disabled stubs.
