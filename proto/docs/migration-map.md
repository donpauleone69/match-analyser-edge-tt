# Migration map: prototype UX into the real app

Read of `proto/` and `app/` on `cursor/mvp-proto-shell-d372` at `bef6261` (16 Nov 2026). `git fetch` of that branch matched local HEAD. The tagging set screen rebuild in `internal/proto-tagging-pass-3-fit-brief.md` has not landed. The rules in `proto/src/features/tagging/rally.ts` already match that brief. The screen files (`TagSetScreen.tsx`, `ShotPanel.tsx`, `ShotRail.tsx`) are still the pre-rebuild chrome: Let is still there, the result still sits on the last shot, and Intent is still Safe / Aggressive with no Neutral.

Where the two apps disagree, the prototype's tagging behaviour wins. The app's storage wins: Dexie and OPFS, as in `persistence-next-sprint.md`. Do not copy the prototype's in-memory demo store, and do not copy the drawn table that stands in for video.

The prototype screen is about 2,600 lines (`proto/src/features/tagging/TagSetScreen.tsx`) plus a 430 line panel. Port the rules and a thin save first. Port the pixels after the five screen pushes are on the branch.

## 1. Screens and routes

Prototype routes are declared in `proto/src/App.tsx`. The shell is Home, Insights, Account (`proto/src/layout/AppShell.tsx`). A set being tagged hides that nav. The app shell is Home, Clips, Account (`app/src/components/layout/AppShell.tsx`), with a wider sidebar in `app/src/components/layout/Sidebar.tsx`.

| Prototype route | What it does | App code that does this job | Verdict |
|---|---|---|---|
| `/` `proto/src/pages/GatePage.tsx` | Three cards: cloud sign-in, register, continue on this device. Buttons are stubs. Fake sign-in jumps to Home. | `app/src/stores/cloudStore.ts` (real cloud session and local device session). Gate wrapper on the routes in `app/src/App.tsx`. Account UI in `app/src/pages/Settings.tsx`. | Rework the page into this layout. Keep `cloudStore`. The stub buttons and the fake sign-in go. |
| `/home` `proto/src/pages/HomePage.tsx` | Up next (resume the open set, else the match). Match list with phase. Insights tease. New match opens Details. | `app/src/features/home/composers/HomeComposer.tsx`, `app/src/features/home/derive/buildHome.ts`. | Rework. `buildHome` can keep feeding the list. The clip-shortcut block on Home has no place here. Phase labels (New, Ready to tag, Part tagged, Tagged) come from `derivePhase` in `proto/src/data/demoStore.tsx`. |
| `/find` `proto/src/pages/FindPage.tsx` | Opponent, event, and date filters, then match cards. The filter button is a stub. New match works. | `app/src/pages/Matches.tsx`, `app/src/features/match-management/composers/MatchListComposer.tsx`, `app/src/rules/matchList/filterSortMatches.ts`. | Rework the page. Keep `filterSortMatches`. Wire the three filters for real. Drop the stub button. |
| `/matches/:matchId` `proto/src/pages/MatchPage.tsx` | Header, three tabs (Insights, Details, Tag), and a one-line opponent prompt. Index sends a new match to Details, a ready or partial match to Tag, a finished match to Insights. | `app/src/features/match-review/composers/MatchReviewComposer.tsx` (tabs: Summary, Details, Work on, Clips, Rallies). | Rework into the three tabs. Work on, Clips, and Rallies stop being tabs. Their jobs move under Insights and the set screen. |
| `/matches/:matchId/insights/:section` `proto/src/features/insights/InsightsScreen.tsx` | Match scope. Sections: Summary, Serve, Receive. Stats and reel titles are written in the file as stand-in numbers, scaled to the point count. | `app/src/features/match-review/sections/SummarySection.tsx`, `ServeReceiveDataSection.tsx`, `app/src/features/match-review/derive/buildServeReceiveCards.ts`, `app/src/rules/analytics/calculateServePerformance.ts`, `calculateReceivePerformance.ts`. | Rework the layout to these three sections. Keep the calculators. Drop the stand-in numbers. |
| `/matches/:matchId/details` `proto/src/features/match/MatchDetails.tsx` | Opponent, event, date. Add, reorder, remove video. Entered set scores against the tagged score, with Use tagged score. Result. Delete match. | `app/src/features/match-review/sections/DetailsSection.tsx`, `MatchContextBlock.tsx`, `MatchStorageBlock.tsx`. Writes go through `app/src/data/entities/matches/match.store.ts` and `app/src/data/services/videoAssetService.ts`. | Rework the form to these fields. Keep the match store and `videoAssetService`. The create form in `app/src/features/match-management/sections/MatchFormSection.tsx` asks for a player and a tournament, then opens the old tagger. That form is replaced by New match plus this page. |
| `/matches/:matchId/tag` `proto/src/features/match/MatchTagChecklist.tsx` | One row per set: Start, Continue, Open, Mark not filmed, Finish match, Use tagged score when the entered result disagrees. | `app/src/features/match-review/sections/SetsPanelSection.tsx`, `app/src/features/match-review/blocks/SetPanelBlock.tsx`, `app/src/rules/derive/set/deriveSetTaggingStatus.ts`. | Rework into this checklist. Keep the set rows in Dexie. The app has no "not filmed", no user-pressed Finish set, and no spare set. Those are new. |
| `/matches/:matchId/tag/:setId` `proto/src/features/tagging/TagSetScreen.tsx` | The tagger. Watch, tap contacts, answer, save, edit a saved rally, review serves, finish the set. Rules live in `rally.ts`, `score.ts`, `continuity.ts`, `matchOps.ts`. | `app/src/pages/ShotTaggingEngine.tsx` to `TaggingUIComposer.tsx`, then `Pass1FocusComposer.tsx` or `SimpleTaggingComposer.tsx`. Save path: `persistPass1FocusRally.ts` and `app/src/rules/derive/shot/mapPass1FocusToDb.ts`. Video: `app/src/ui-mine/VideoPlayer/VideoPlayer.tsx`. | Rework. The stage order already matches. The questions per shot do not (section 2). Drop Simple tagging (`simpleTaggingModel.ts` and its composer). There is no mode switch in the prototype. |
| `/insights` and `/insights/:section` `proto/src/pages/InsightsPage.tsx` | All-match Summary, Serve, Receive, Improve. Filters are real against the demo list (opponent, event, date, last 3, this month). Numbers are the same stand-ins. | `app/src/pages/ScopeReview.tsx`, `app/src/features/match-review/composers/ScopeReviewComposer.tsx`, `app/src/rules/reviewScope/filterMatchesByScope.ts`, `app/src/pages/Clips.tsx`, `app/src/features/clips/`. | Rework. One Insights home replaces `/review` and the Clips tab. Keep `filterMatchesByScope` and the clip engine. Reel rows should open that player. Drop the stand-in counts. |
| `/account` `proto/src/pages/AccountPage.tsx` | Profile, focal player, theme, import / export / sync. Those buttons are stubs. A Prototype card switches empty and filled demo data. | `app/src/pages/Settings.tsx`, `app/src/stores/cloudStore.ts`, `app/src/data/cloud/bundleFile.ts`, `app/src/data/cloud/cloudSync.ts`. | Rework the page. Keep profile, device session, bundle import / export, and sync. Drop the demo-data switch and the dummy-data button on `Settings.tsx` from the product screen. |
| Redirects in `proto/src/App.tsx` | `/matches/:id/insights` to summary. `/insights/story`, `/insights/reels`, `/insights/scope` to summary or improve. Unknown paths to `/`. | Old app redirects in `app/src/App.tsx`: `/clubs`, `/tournaments`, `/players`, `/analytics`, `/data-viewer` go Home. `?tab=highlights` on a match opens Clips. | Keep a redirect layer so old bookmarks land on the new pages. Drop the dead admin routes when the nav is touched. |

`proto/src/features/match/archiveJobs.tsx` is not a page. It is a timer (about 1.1s a step) that pretends to cut an archive and then locks tagging (`proto/src/features/tagging/tagLock.ts`). The app's real archive is `archiveAssetLocally` in `videoAssetService.ts`: it removes the device bytes and keeps the row. Those are different features. See the questions.

## 2. Layers under the screens

### Rules

The prototype's live rules are `proto/src/features/tagging/rally.ts`, `score.ts`, `continuity.ts`, `matchOps.ts`, `timeline.ts`. `proto/src/data/demoStore.tsx` holds the match and set shape and the phase names. It is a React context of seed data. Do not port it.

The app's Pass 1 twin of `rally.ts` is `app/src/features/shot-tagging-engine/composers/pass1FocusModel.ts` (stages, strokes, capture constants) plus `app/src/rules/derive/shot/`. Stages already agree. `stageOf` in `rally.ts` is contacts, then result, then end shot wing and stroke, then pick first attack, then that shot's wing and stroke, then ready. `derivePass1Stage` in `pass1FocusModel.ts` is the same list, with the last step named `optional`. The prototype has no optional stage. Marks (High, Heavy, Review) show on a ready rally. They are not a stage.

Shared, and safe to keep calling:

| Job | App | Prototype | What to do |
|---|---|---|---|
| Who serves at a score | `calculateServer` in `app/src/rules/calculate/calculateServer.ts`. Two serves each, one each from 10-10. | `serverAt` in `score.ts`. Same arithmetic. | Keep `calculateServer`. |
| Who serves first in set 2, 4, 6 | `calculateSetFirstServer` in the same file. | `firstServerForSet` in `score.ts`. Same rule. | Keep the app function. |
| Set over at 11, win by 2 | `deriveSetEndConditions` in `app/src/rules/derive/set/deriveSetEndConditions.ts`. | `isSetWon` in `score.ts`. | Keep the app function. Finish is still a button press in the prototype, not an automatic save. |
| Winner from the ending | `deriveRally_winner_id` in `app/src/rules/derive/rally/deriveRally_winner_id.ts`. Winner or Lucky: last hitter. Anything else, including Air: the other player. | `winnerOf` in `rally.ts`. Same. | Keep the app function. |
| Hitter of shot n | `playerIdForShotIndex` in the same file. Shot 1 is the server. | `hitterOf` in `rally.ts`. Same. | Keep the app function. |
| Point totals | `deriveRally_scores` and `deriveRallyScoreChain`. | `countPoints` in `score.ts`. The prototype does not store the score on the rally. | Keep writing the stored before / after numbers as a cache. Recompute them from winners in video order. |
| Capture timing | `pass1FocusModel.ts`: speed 0.75, latency 0.3s, idle 2s, pad 1s, speeds 0.5 to 2. | The same constants in `rally.ts`, plus a minimum tap gap of 0.11s of video and a 2s lead before the serve. | Use the prototype constants with the new screen. |
| Two-shot auto first attack | `applyImpossibleFaAutoSkip`. Push, Block, Chop, Lob mean no attack. Flick, Loop, Drive, Smash mean shot 2 is the first attack. | `applyAutoSkip`. Same sets. Also clears No attack if the end shot is later given an attack stroke. | Use `applyAutoSkip`. |

Where they differ, the prototype wins:

| Topic | App today | Prototype (`rally.ts` at `bef6261`, and the screen brief) | Winner |
|---|---|---|---|
| Role names | `deriveShotPhase` is serve, pre-offensive, first offensive, the next shot, the one after, continuation. `derivePass1ShotTagRole` is different again: it has a ball-before role, only one reply, and it renames the last shot to `end_shot`, which hides reply. | `roleOf`: serve, before, first attack, reply (the two shots after the first attack), later. The last shot keeps that role. Wing and stroke are added on top. | `roleOf`. `deriveShotPhase` can stay as a label helper if the names are mapped. `derivePass1ShotTagRole` should leave the save path. |
| Which fields a shot stores | `derivePass1ShotTagAllowList` and `deriveShotTagRole`. Serve: spin, depth, high, heavy. Receive: wing, pivot, depth, high, heavy. First attack: wing, stroke, contact, Safe. Later shots: wing and stroke, and initiative on the two shots after the attack unless that shot is the end. | `fieldsFor`. Serve: depth, plus High and Heavy. Receive and any shot before the attack: High and Heavy only. Depth is off every receive, including a last-shot receive. First attack: stroke, wing, intent. Reply, both shots: stroke, wing, initiative, including when that reply is the last shot. Later shots: nothing, until the last shot adds stroke and wing. Spin, contact, and pivot are off. | `fieldsFor`. |
| Intent | `shot_is_safe` boolean. Aggressive is not stored. No Neutral. | String: Safe, Neutral, Aggressive. The screen still offers only Safe and Aggressive until the brief's push 2. The rule does not reject Neutral. | The three-way string. |
| Review | `shot_review_kind`: technical or tactical. `groupReviewShots.ts` splits on it. | One boolean. | Open. See the questions. Do not collapse old rows until Paul answers. |
| Miss reason | `technical`, `timing`, `footwork`, `positioning`, `misread`, `forced`. `mapPass1FocusToDb.ts` drops the reason on Air. | Forced, Position, Technical, Misread, on any error, including Air. | The four prototype words for new tags. Keep the old words readable. Store the reason on the rally, and store it for Air. |
| Depth word | Stored `short`, `half`, `long`. | The cell label is Deep (`ShotPanel.tsx`). | Show Deep. Keep storing `long`. |
| First attack the user may not pick | Spread across the composer. | `faRefusal`: the serve, a missing shot, or a visible Block / Lob / Push / Chop. A stroke on a shot that has no stroke row is not a reason. | `faRefusal` and `markFa`. |
| Serve mistakes | `validateServerSequence` flags every later rally, because it never adopts the server that was actually tagged. | `walkServes` in `continuity.ts` follows the tagged server. One mistake is one mark. Review serves (`serveBands`, `pressReview`) walks back and can swap that rally only. | The continuity module for the review UI. Keep `calculateServer` for "who is due". |
| Shot loop | `shotLoopWindow` in `pass1FocusModel.ts` plays from this contact to the next. | `shotWindow` in `rally.ts`: lead 1.2s to 2s, tail 1s to 2s, inside the rally. The serve starts at the rally start. The last shot runs to the rally end. | `shotWindow` once the new screen plays loops. |
| Let | `deriveRally_is_scoring.ts` can store a non-scoring rally. | `onLet` in `TagSetScreen.tsx` still drops the taps and saves nothing. The screen brief removes Let from live tagging. | No Let on the new screen. Old non-scoring rows must still add nothing to the score. |

`app/src/rules/derive/shot/derivePreviousPlacementFromWingPivot.ts` infers placement from wing and pivot. The prototype no longer asks pivot, and it strips pivot on save (`savedShots`). Stop calling that inference for new rallies.

`app/src/rules/analytics/` is real (serve, receive, third ball, review grouping, match story). Keep the files. They read the current columns. A card that counts spin, placement, contact, or a technical/tactical split will go quiet for new rallies once those stop being asked. I did not line-read every calculator. Serve rate in `calculateServePerformance.ts` uses the ending, the last shot index, and the first attack, which the new rally still has.

`app/src/rules/infer/` is an empty stub. Leave it unused.

`app/src/rules/derive/clips/` has no prototype screen of its own. Insights is where those lists should surface. Keep the derivation.

### Stores

| Store | Verdict | Why |
|---|---|---|
| Dexie, `app/src/data/db.ts` version 7, and the entity modules under `app/src/data/entities/` | Keep | Source of truth on the device. The prototype has nothing like it. |
| `app/src/stores/cloudStore.ts` | Keep | Real sign-in and the local device session. Do not lead this migration with more cloud work. That matches `persistence-next-sprint.md`. |
| `app/src/stores/taggingSessionStore.ts` | Drop | Legacy phase1 / phase2 session. Nothing else imports it. Pass 1 does not use it. |
| `proto/src/data/demoStore.tsx` | Drop | Seed matches in React state. Replace calls with the match, set, rally, and shot stores. |
| Draft storage `pass1FocusDraftStorage.ts` and `simpleTaggingDraftStorage.ts` | Rework | The prototype keeps the open rally on the set (`SetData.draft`). A localStorage draft is enough for the first slice. It will not be in a match bundle. Move it onto the set row when export must include an unfinished rally. Drop the simple-tagging draft with that composer. |

### Video

Keep `app/src/helpers/videoStorage.ts` and `app/src/data/services/videoAssetService.ts` (OPFS, fingerprint, resolve device then signed URL then missing, reel and trimmed files). The prototype's `AddVideoChoice.tsx` holds a blob URL in memory and forgets it on reload. That is the piece to leave behind.

The behaviour to take from the prototype is `proto/src/features/tagging/timeline.ts` and `usePlayer.ts`: a match has an ordered list of videos, no set owns a file, and a rally stores a video id plus seconds in that file. The app today stores a file against a set (`storeSetVideo`, `resolveSetVideo`, `set_number` on `DBVideoAsset`). Both have to work during the move. New uploads follow the prototype. Old per-set files keep opening.

`app/src/ui-mine/VideoPlayer/VideoPlayer.tsx` is the real player (file element, constrained loops, markers, mute, speeds). Keep it for the first slice. `proto/src/features/tagging/VideoStage.tsx` also draws a scripted table (`script.ts`) when the video is a demo. Do not port that stand-in. Do port the clock behaviour (fence after the last saved contact, shot loop, hold on the last frame) onto the real player when the full screen arrives.

### Helpers

| File | Verdict | Why |
|---|---|---|
| `app/src/helpers/generateSlugId.ts`, `generateId.ts` | Keep | The prototype's ids are demo strings. Real rows stay slugs. |
| `app/src/helpers/themSide.ts` | Keep for now | Unnamed opponent is stored as null and shown as "Villain". The prototype shows the typed name and asks "Who did you play?". The helper stays until that name has a home. |
| `app/src/helpers/utils.ts` | Keep | `cn` and time formatting. The prototype has its own small `helpers/utils.ts`. Use the app one. |
| `app/src/helpers/videoFileHelpers.ts`, `videoStorage.ts` | Keep | No prototype equivalent. |
| `createEntityDefaults.ts`, `debugDatabase.ts`, `devInspectDB.ts`, `testFixtures.ts` | Leave | Dev only. No screen uses them. |

### ui-mine

The app kit is `app/src/ui-mine/` (Button, Card, Icon, Input, Dialog, Badge, and the video player). Features already import it, which is the rule in `.cursorrules`. Keep that kit.

The prototype kit is only Button, Card, and Icon, drawn with Tailwind, plus button heights in `proto/src/ui-mine/buttonKinds.ts`. Do not fork a second kit. The tag cells in the new screen are plain buttons in the feature, which is what `ShotPanel.tsx` does.

These app components have no row in the prototype. Stop using them on the new tagger. Delete the folders only after nothing imports them:

- `app/src/ui-mine/SpinGrid/`, `PositionGrid/`, `LandingZoneGrid/`
- `app/src/ui-mine/TableTennisButtons/` (one file per old answer, including quality, spin, and landing)

The screen brief sets control height at 40 touch and 32 mouse for the tagging screen only, and leaves the rest of the app unset. Do not change every button in slice 1.

## 3. Data model

Dexie stays. New facts are extra fields on the existing types. Readers treat a missing field as empty. Do not ship a Dexie version that clears `shots` or `rallies`. That is the failure called out in `persistence-next-sprint.md` (the v4 and v5 upgrades did clear them). Extra properties do not need a new indexed version on day one.

### Match

Prototype shape: `MatchRecord` in `proto/src/data/demoStore.tsx`. App shape: `DBMatch` in `app/src/data/entities/matches/match.types.ts` and `DataSchema.md`.

| Prototype | App column | Change |
|---|---|---|
| `opponent` string | `player2_id`, name on the player. Empty shows as Villain via `themSide.ts`. | Keep `player1_id` as the hero. The Details box has to show a typed name. Where that string is stored is a question below. |
| `event` string | `tournament_id` | The box shows the tournament name when one is linked. A brand new event needs a home (the tournament name, or a new string on the match). |
| `date` | `match_date` | Keep. Keep `match_date_source` as well. The prototype does not show the source. |
| `result.me`, `result.them`, either may be null | `player1_sets_final`, `player2_sets_final` (numbers), `winner_id` | Keep the columns. The app cannot tell "not entered" from 0-0, because the numbers are always set. The prototype can. The form needs a way to remember that the user has not chosen a result yet. |
| `videos` in list order, no set id | `video_assets`, often with `set_number` | New files: `set_number` null, order is the match list. Rally keeps `video_id` plus seconds in that file. Old set files stay. |
| `tagDone` | `step1_complete`, `step2_complete`, and the set's phase1 / phase2 fields | Add a boolean. Do not reuse `step2_complete`. That flag meant the old detail pass. |
| No best of, no tagging mode, no round, no detail level on screen | `best_of`, `tagging_mode`, `round`, `match_detail_level` | Leave the columns. Take them off the form. Glossary already calls essential / full obsolete. |
| Sets grow from the result, or from tagging plus one spare set (`normalizeMatch`) | Create flow writes one set (`MatchFormSection.tsx`) | The checklist needs this grow rule. `best_of` no longer decides the list. |

### Set

Prototype: `SetData`. App: `DBSet` in `app/src/data/entities/sets/set.types.ts`.

| Prototype | App | Change |
|---|---|---|
| `setId` number | `set_number`, slug id | Keep. |
| `entered` score as strings, so a half-typed score survives | `player1_score_final`, `player2_score_final` numbers | The page can hold the strings. Write the numbers when both sides parse. |
| `skipped` (not filmed) | none | Add a boolean, default false. A not-filmed set can still have an entered score, and that score counts toward sets won (`matchSetsWon`). |
| `finished` is a button, not "tags look complete" | `is_tagged`, `tagging_completed_at`, `tagging_phase` | Add `finished`. Do not treat `is_tagged` as the same thing. |
| `firstServer` | `set_first_server_id` | Keep. Flipping it (`flipFirstServer` in `matchOps.ts`) changes that set only. |
| `draft` | localStorage draft | See stores. |
| `deleted` rallies stay until Finish set, and do not score | delete removes the row | Add `deleted_at` on the rally. Hide those rows from the score. Clear them when the set is finished (`finishSet` in `matchOps.ts` drops the deleted list). |
| Score is counted from rally winners | `player1_score_final` is also the entered score | Tagged score is derived. Entered score is what the user typed. `setScoresDiffer` compares them only after Finish. |

`tagging_phase`, `phase1_last_rally`, `phase2_*`, `inference_complete`, and `video_contexts` stay on old rows. The new checklist does not read them.

### Rally

Prototype: `RallyData` and `Draft` in `rally.ts`. App: `DBRally` in `app/src/data/entities/rallies/rally.types.ts`.

| Prototype | App | Change |
|---|---|---|
| `contacts: number[]` | one `timestamp_start` per shot | Keep times on the shots. The rally does not need a second copy. |
| `start`, `end` (default 2s before the first contact, 1s after the last, or a nudge) | `timestamp_start` / `timestamp_end`, documented as the first and last contact | For new rows, store the prototype window, so playback includes the lead-in. Do not rewrite old rows. I am not sure every clip preset assumes `timestamp_start` is the first contact. Check `app/src/rules/derive/clips/` before changing the meaning for old data. |
| `ending` Winner, Lucky, Net, Long, Wide, Air | `point_ending` winner, lucky, error_net, error_long, error_wide, error_air | Map the words. Same six endings. |
| `fa` number or null | `first_attack_index` | Keep. Null with more than one shot means no attack (`draftFromRally`). |
| `winner` side | `winner_id` | Keep storing the derived id. |
| `highlight` | `is_highlight` | Keep. |
| `point: true` (a score with no video and no contacts) | `is_stub_rally` | Do not reuse `is_stub_rally`. The schema uses that flag for pre-filled score rows. Add a separate flag for a point the user added with no video (`pointRally`). |
| `left`: serve or gap, left as-is | none | Add a small list or two booleans. |
| `serveChecked` | `server_corrected` means something else (a manual fix) | Add `serve_checked`. Do not overload `server_corrected`. |
| Score is not stored | `player1_score_before` / `_after` and the same for player 2 | Keep the columns as a cache. `deriveRallyScoreChain` already walks the set. |
| No let row | `is_scoring` false | New tagging writes scoring rallies only. A false value on an old row still must not add a point. |
| Server and winner of a saved rally change only when that rally is edited or swapped | A chain rewrite can move later servers if something recomputes them from the score | Follow `matchOps.ts`: save, delete, restore, and swap touch the rallies they name. They do not rewrite the neighbours' server or winner. |

### Shot

Prototype: `ShotTags` in `rally.ts`. App: `DBShot` in `app/src/data/entities/shots/shot.types.ts`.

| Prototype, when `fieldsFor` asks it | App column | Change |
|---|---|---|
| `wing` FH or BH | `shot_wing` | Keep. |
| `stroke` Flick, Loop, Drive, Smash, Block, Lob, Push, Chop | `shot_stroke` lowercase | Keep. Map case. |
| `depth` Short, Half, Deep, serve only | `shot_depth` short, half, long | Show Deep. Store `long`. |
| `intent` Safe, Neutral, Aggressive, first attack only | `shot_is_safe` boolean. Aggressive is not a column. | Add `shot_intent`. When it is empty, `shot_is_safe === true` still reads as Safe. Stop writing `shot_is_safe` for new tags. |
| `initiative` Behind, Level, Ahead | `shot_initiative` behind, level, ahead | Keep. The prototype also asks it when the reply is the last shot. The app allow-list turns it off on the end shot. Follow the prototype. |
| `high`, `heavy` | `shot_is_high`, `shot_is_heavy` | Keep. Serve and shots before the first attack only. |
| `review` boolean | `shot_review_kind` | Wait for the question below. Until then, do not delete the old values. |
| `missReason` on an error | `point_miss_reason` on the rally, not the shot | Keep it on the rally. Map Position to the existing `positioning`. Offer only the four prototype words. `timing` and `footwork` stay valid on old rows. Write the reason for Air. `mapMissReason` in `mapPass1FocusToDb.ts` currently refuses Air. |
| `pivot` | `shot_is_pivot` | Stop writing. `savedShots` already drops it. Leave the column. |
| `spin`, `contact` | `shot_spin`, `shot_contact` | Stop writing. `fieldsFor` forces both false. Leave the columns. |
| no placement | `shot_placement` | Stop inferring it for new saves. Leave old values. |
| no quality, no weak | `shot_quality`, `shot_is_weak` | Already off the Pass 1 allow-list. Leave them. |
| hitter | `player_id` | Keep deriving from the server and the index. |
| contact time | `timestamp_start` | Keep. One time per shot. |

`mapPass1FocusToDb.ts` is the current writer, and it applies the old allow-list. The new screen needs its own mapper from `Draft` to `DBRally` plus `DBShot`, using `fieldsFor` and `savedShots`. Leave the old mapper in place until Simple tagging and Pass 1 are no longer reachable, so the two writers are not both live on the same set.

## 4. Gaps

The prototype needs these. The app has no code for them:

- Match-level video list and a single clock across files (`timeline.ts`, `usePlayer.ts`). The app resolves a video per set.
- Set checklist: not filmed, Finish set, Finish match, spare set, result-sized set list (`normalizeMatch`, `MatchTagChecklist.tsx`, `matchOps.ts`).
- Entered score against tagged score, and Use tagged score (`setScoresDiffer`, `applyTaggedScore`).
- Continuity: serve bands, long gaps, review serves that swap one rally (`continuity.ts`).
- A point with no video (`pointRally`).
- Deleted rallies kept, unscored, until the set is finished.
- Insert a rally into a gap (`gapWindow` in `matchOps.ts`).
- Intent with Neutral.
- The tagging screen chrome in the pass 3 brief (End as its own cell, the serving toggle, Discard). Not in the repo yet.

The app does these. The prototype has no place for them:

- Training posts (`app/src/features/training/`, route `/training`, Dexie `training_posts`). No nav item in the prototype.
- Clubs, tournaments, and players as admin screens. The routes already redirect home. The player row and the focal-player scope (`app/src/rules/derive/account/deriveAccountScope.ts`) are still how the library is filtered.
- Simple tagging mode.
- A separate edit-rally route (`app/src/pages/RallyEdit.tsx`). The prototype edits inside the set screen.
- Work on, Clips, and Rallies as match tabs. The jobs move. The clip engine stays.
- Spin, contact, pivot, placement, quality, weak, and the technical / tactical split, as questions on the new tagger.
- Data viewer and the old analytics route. Already redirected.
- `taggingSessionStore`.
- The inference stub.
- Top-down stub rallies (`is_stub_rally` in the schema). I did not find them on a current screen. Do not build them into the new checklist.
- Match-duplicate warning on create (`app/src/rules/matchDuplicate/`). The prototype's New match does not warn. The check is small. Keep it on the new create if it does not block the one-button flow.

## 5. Migration order

Each slice ends with something you can do in the real app. Hours are rough. "Fast model" means an exact brief is enough. "Careful" means the field mapping or the video rules need a person who has read this file.

Do the work on a branch taken from `cursor/mvp-proto-shell-d372`, so `proto/` and `app/` stay together. Do not edit `proto/` while the screen rebuild is landing on that branch. Slice 1 does not need those pushes.

### Slice 1. One rally, real video, new rules. About 6 to 8 hours. Start here.

What moves: the save. Not the shell, and not the pass 3 pixels.

Files:

- Copy `proto/src/features/tagging/rally.ts` and `score.ts` into `app/src/rules/tagging/`. Fix imports. No React, no demo store.
- Add a mapper beside them: `Draft` to the existing rally and shot types, using the field table in section 3. Additive fields only: `shot_intent`, and the Air miss reason. Do not bump Dexie in a way that clears tables.
- A thin full-screen route, for example `/matches/:matchId/tag/:setId`, registered next to the current `/matches/:matchId/tag` in `app/src/App.tsx`. Play the set's existing file through `resolveSetVideo` and `VideoPlayer.tsx`.
- Buttons for the stages only: tap, result, wing and stroke on the last shot, first attack or no attack, save. Call `stageOf`, `fieldsFor`, `setEnding`, `markFa`, `toggleNoAttack`.
- Save with the new mapper, then the existing `rallyDb` / `shotDb` create used by `persistPass1FocusRally.ts`. Leave that old function in place.

Working at the end: open a match that already has a set video, tag one rally, reload, and see the rally on the current match review. The old tagger still opens from its own route.

Depends on nothing.

Careful for the mapper (morning). A fast model can build the thin screen in the afternoon from the stage list and the field table, if it is told not to add questions.

### Slice 2. The shell on real matches. About 6 hours. Fast model.

What moves: nav and the match frame. Home, Find, match tabs, Details for opponent / event / date / result, Tag checklist listing real sets. Start on a set opens the slice 1 route when that route exists, otherwise the old tagger.

Files: `app/src/App.tsx`, `app/src/components/layout/AppShell.tsx`, `Sidebar.tsx`, new composers next to `HomeComposer.tsx` and `MatchReviewComposer.tsx`. Read `match.store.ts` and `set.db.ts`. Do not change Dexie.

Working: the bottom nav is Home, Insights, Account. Home lists real matches. A match has three tabs. Details edits the name, the event, the date, and the result, and a reload keeps them. Insights can be the existing summary until slice 7.

Depends on slice 1 only for the Tag button's target. The rest can be built against the old tagger.

### Slice 3. Pass 3 screen, after it is on the branch. About 8 to 12 hours. Fast model for pixels, careful where it touches save.

What moves: `TagSetScreen.tsx`, `ShotPanel.tsx`, `ShotRail.tsx`, and the timeline button in `VideoStage.tsx`, onto the slice 1 route. Behaviour stays the rules already copied. Edit mode is not drawn in the brief. Bring the current edit actions across. Do not invent a new edit layout.

Working: the same rally as slice 1, on the new chrome, at a phone width and a desktop width. Save still reloads.

Depends on slice 1, and on the five pushes in the screen brief. Do not start from today's `TagSetScreen.tsx` and restyle it. That file is the one being replaced.

### Slice 4. Videos on the match. About 8 hours. Careful.

What moves: add and remove on Details, through `videoAssetService.ts` (OPFS, not a blob URL). Order comes from `timeline.ts`. New assets have no `set_number`. The tagger plays the list with the `usePlayer.ts` clock. `resolveSetVideo` still opens old files.

Working: add a file on Details, reload, the file is still there, and a rally tagged on it stores that asset id.

Depends on slice 2 for the Details page. The tagger change depends on slice 1.

### Slice 5. Set checklist. About 6 hours. Fast model for the rows, careful for the grow rule.

What moves: `MatchTagChecklist.tsx` behaviour onto real sets. Additive `skipped`, `finished`, and a `tag_done` on the match. Entered scores use the columns that already exist. `normalizeMatch` decides how many set rows exist.

Working: mark a set not filmed, finish a set, reload, the states stick, and the tagged score shows against the entered score.

Depends on slice 1 (a saved rally is the tagged score) and slice 2 (the page).

### Slice 6. Continuity. About 8 to 10 hours. Careful.

What moves: `continuity.ts` and the rally operations in `matchOps.ts` (save in video order, delete with restore, swap one rally, review serves). `deleted_at` and `serve_checked` are additive.

Working: two rallies with the wrong server show one band. Review serves can swap the one rally. A deleted rally stays listed and unscored until Finish set.

Depends on slices 1 and 5.

### Slice 7. Insights with real numbers. About 8 hours. Careful on which number, fast model on the layout.

What moves: `InsightsScreen.tsx` layout, fed by `calculateServePerformance.ts`, `calculateReceivePerformance.ts`, and the work-on grouping. Reel rows open the existing clip player (`app/src/features/clips/`). Filters use `filterMatchesByScope.ts`.

Working: Summary, Serve, Receive, and Improve change when the filter changes, and a reel plays tagged points. No stand-in percentages.

Depends on nothing for old tags. New tags only count once slice 1 has saved them. Can follow slice 2.

### Slice 8. Account. About 4 hours. Fast model.

What moves: the prototype account layout onto `Settings.tsx`, wired to the buttons that already work (device session, bundle export / import, sync). Theme can follow `proto/src/theme/` if it is still wanted. No new cloud behaviour.

Working: export a match file, reload a fresh profile, import, the match is back. This is the backup in `persistence-next-sprint.md`.

Depends on nothing. Best after slice 2 so the nav exists.

### Slice 9. Take the old doors off. About 4 hours. Careful.

What moves: Simple tagging, the mode switch, `taggingSessionStore.ts`, the Work on / Clips / Rallies tabs, `/clips` and `/review` and `/training` as primary nav, and the unused grids. Redirect old URLs. Do not delete `rules/analytics` or `rules/derive/clips`. Do not delete training rows.

Working: a bookmark to the old tag route lands on the new set screen. The clip player still opens from Insights.

Depends on slices 3, 6, and 7.

## 6. Risks

- The screen rebuild is in flight. Building the app chrome from today's `TagSetScreen.tsx` means doing it twice. Slice 3 waits.
- Two writers. If Pass 1 and the new mapper both save one set, the allow-lists will strip each other's fields. Slice 1 leaves the old route up, on purpose, and the new route is the only one that writes `shot_intent`. Retire the old route in slice 9, not before the new one saves.
- A Dexie upgrade that clears shots or rallies. Additive fields only.
- Video meaning. Old files are per set. New files are a match list. Mixing them on one match without a rule will attach a rally to the wrong file.
- `timestamp_start` on a rally. New rows use the prototype window (lead-in included). Old rows are the first contact. Clip code may assume one meaning.
- Insights cards that count spin, placement, contact, or technical versus tactical will under-count new rallies. The serve win rate path does not depend on those.
- The prototype archive timer is not the app archive. Wiring the timer to `archiveAssetLocally` would delete device bytes and lock tagging. Do not connect them until the question below is answered.
- Edit mode of the new screen has no drawing. Copy the current edit actions. Do not design a new one inside a slice.
- Let is still in the screen code and is removed by the brief. Do not port it.
- I did not run either app. This is a read of the files named above.

## Questions only Paul can answer

1. Review: one mark, or keep technical and tactical? `groupReviewShots.ts` splits on the pair today. The prototype has one boolean.
2. Opponent: a typed name on the match, or a player in the library? The library is still scoped by the focal player (`player1_id`). The empty name currently displays as Villain.
3. New uploads are one list on the match, and sets are not files. Old per-set files keep playing. Confirm that the set-by-set upload form can go.
4. Archive: the app already removes the device bytes and keeps the row and the tags. The prototype's archive is a different idea (a short file of the tagged rallies, then tagging locks). Which one is the product?
5. Control height. The screen brief sets 40 touch and 32 mouse on the tagging screen only, and leaves the rest of the app open. Should the rest wait?
6. Training posts, and a Clips page of its own: leave both out of this migration, with the data and the clip engine kept? That is the assumption in the slices above.
