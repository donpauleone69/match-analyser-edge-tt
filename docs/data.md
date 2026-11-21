# Data model

Two shapes. In memory, one nested `MatchRecord` per match in `app/src/stores/matchStore.ts`; it resets on reload. In the database, schema v1: eight tables in `app/src/types/db.ts`, mapped from memory and back by `app/src/rules/dbRows.ts`, checked before every write by `app/src/rules/dbValidate.ts`, and stored in the browser by `app/src/data/` (Dexie). Until phase 8.2 wires the stores to it, nothing on screen reads or writes the database. Every column with its type, allowed values, writer and reader, plus the gaps, is in `docs/data-fields.md`. "You" is `me`. Invariants are `app/tests/invariants/catalog.ts` and `app/tests/invariants/rows.ts`.

## In memory

```
MatchRecord
  videos: VideoAsset[]     play order
  sets: SetData[]          setId 1..N, no gaps
    mark: SetMark | null
    rallies: RallyData[]
      shots: ShotTags[]    one per contact
    draft: Draft | null
```

Times are seconds in one video. The match clock lays videos end to end.

- **MatchRecord**: `id`, `opponent` and `event` (text), `date` (`YYYY-MM-DD` or empty), `result` (`{ me, them }`, both numbers or both null, a real best of 3, 5 or 7 from `REAL_RESULTS` in `app/src/rules/matchStatus.ts`), `videos`, `sets`. Optional, no writer until phase 10: `category`, `stage`, `round`, `outcome` (only when picked with no result). Seed ids are `m-new`, `m-ready`, `m-partial`, `m-complete`, `m-h1` to `m-h10`; created ids are `m-new-<ms>-<8 hex>` (`createRowId`).
- **VideoAsset**: `id`, `fileName`, `sizeMb`, `archived`, `kind` (`demo` or `file`), `durationS`, optional `script` (demo only), `src` (blob URL, memory only), `myEnd` (phase 10). Archive keeps rallies joined at lower size and cannot be undone. A removed video stays in the store's `removedVideos` while rallies name it; the next video added takes its id and place (second I-52).
- **SetData**: `setId`, `entered` (score strings as typed), `finished`, `firstServer`, `rallies`, `draft`, `mark`. `SetMark` is `from`, `to` (`{ videoId, t }`) and `complete` (the whole set is on video). Null mark: not on video. At most 7 sets (`MAX_SETS`). Delete keeps a rally on a `deleted` array cast onto the set until `finishSet` clears it; the score never counts it.
- **RallyData**: `id`, `videoId`, `server`, `contacts`, `start`, `end`, `ending`, `fa`, `shots`, `winner`. Optional: `point` (no video), `left` (`serve` or `gap` marks left), `serveChecked`, `idea`. `ending` is `Winner`, `Net`, `Long` or `Wide`, null only on a point. The pad writes Winner, Long and Net (In net); Wide is legal and in the seed.
- **idea** (`IdeaTag`): `flow: 'bestfa'`, `serve` (copy of serve depth), `result` (`Ace`, `Serve fault` or the ending), `review` (parts in row order), `check` (`Check the point`).
- **Draft**: the open rally: rally fields plus `closed`, `noAttack`, `serveChecked` (decides whether rally 1 still asks who served) and `best` (`BestMark`: `flow`, `step`, `endPage`, `end`, `point`, `kept`, `first`, `review`, `cut`). Not in the score.
- A point with no video has empty contacts, `start === end`, null ending, null `fa`, no shots. Default rally start is 2 s before the first contact (`RALLY_LEAD_S`), end 1 s after the last (`RALLY_PAD_S`); `nudgeMark` moves them and they still hold the contacts.

| Shot | Keys | Values |
|---|---|---|
| 1, when n is 1 | none | End alone: ace or serve fault |
| 1, when n is at least 2 | `depth`, `wing` | `Short` or `Long`; `BH` or `FH` (landing) |
| 2..n | `wing`, `stroke` | `BH` or `FH`; `Attack` or `Control` (`Defence` from phase 10) |

## Database schema v1

`SCHEMA_VERSION` is 1. Additive upgrades only. Ids are text. `...At` columns are whole ms since 1970; `...T` and `durationS` are seconds in one video. Null means not entered.

| Table | Key | Links to | One row per |
|---|---|---|---|
| `opponents` | `id` | | opponent name, unique ignoring case |
| `events` | `id` | | event name, unique ignoring case |
| `matches` | `id` | `opponentId` to `opponents`, `eventId` to `events` (both optional) | match |
| `videos` | `id` | `matchId` | video, listed or removed |
| `sets` | `id` = `<matchId>:<setNumber>` | `matchId`; mark ends to `videos` of the same match | listed set |
| `rallies` | `id` | `setId`; `videoId` to a video of the same match | saved or deleted rally, or point |
| `shots` | `id` = `<rallyId>:<shotNumber>` | `rallyId` | contact |
| `drafts` | `setId` | `setId`; `rally.videoId` to a video of the match | open rally |

Plan columns, decision 19 columns (null, writer in phase 10), and four added in phase 7 for gaps G1 to G4 in `docs/data-fields.md`: `rallies.position`, `rallies.pointKept`, `videos.removedAt`, `videos.demoScript`.

Dropped (not in rows, worked out again on load): `serveChecked` on saved rallies, `idea.flow`, `idea.serve`, `idea.result`, `fa`, the `deleted` cast (now `deletedAt`), `src` blob URLs, `kind` (from `demoScript`), `sizeMb` (from `sizeBytes`), `archived` and `finished` (from their times). Seed to rows to memory gives the seed back exactly (`app/tests/rules/db-rows.test.ts`), and every golden output matches from rows.

## Browser database

`app/src/data/db.ts`: two IndexedDB databases with the same tables, `edge-tt-matches` (yours) and `edge-tt-matches-demo` (demo mode, G7). Dexie version 1 is IndexedDB version 10. Indexes: names on `opponents` and `events`; `createdAt`, `opponentId`, `eventId` on `matches`; the parent id on each child table. The same tables in Postgres, for a later mirror, are in the migration under `supabase/migrations/`; nothing uses it yet.

The repositories are the only writers. Each checks its rows with the validators, returns a `RepoResult` and never throws; a refused or failed call writes nothing.

| Call | Does |
|---|---|
| `loadAll` | Every match in `createdAt` order, ties by id (G15), with removed videos and the name rows |
| `saveMatch` | One match and its rows in one transaction, only rows that changed. Links typed names; drops a name row the edit unlinked that no match uses and that has no details |
| `saveRally` | One rally and its shots in one transaction; shots no longer listed are deleted. Saves in place or at the end: places stay 0 to k-1 |
| `saveDraft` | The one draft of a set, or clears it |
| `deleteMatch` | The match and its rows; name rows stay |
| `renameOpponent`, `renameEvent`, `removeOpponent`, `removeEvent` | By id; a rename shows in every linked match; remove is refused while a match links it |
| `reseedDemo` | Clears the demo database and writes the seed; refused on yours |
| `exportMatchFile`, `importMatchFile` | One match as JSON (`format` `edge-tt-match`, `schemaVersion`). Import checks every row, links names to stored rows ignoring case, and replaces a match with the same id |

Set ids are `<matchId>:<setNumber>` and shot ids `<rallyId>:<shotNumber>`, checked by the validators. A save or import whose video, set, rally or shot id is stored under another parent is refused (`conflict`), so a write never moves another match's rows.

`app/src/data/storage.ts` asks for persistent storage and reads usage and quota. `cleanupOldStorage` in `app/src/data/cleanupOldStorage.ts` deletes the reference app's databases (`EdgeTTMatchAnalyser`, `tt-match-videos`), its `videos` folder in the origin private file system and its storage keys, by exact name or prefix. It keeps the settings keys and every name it does not know. New code must not reuse those names. Tests: `npm run check:db` in Chrome, `app/tests/db/data-layer.test.ts` in `npm test`.

## Derived, and when

On render means every time a screen or selector reads it; nothing is cached in the data.

| Value | From | When | Code |
|---|---|---|---|
| Contact time | Video time minus reaction | On tap | `captureContactTime` |
| Hitter of shot k | Server, odd shots | On render | `hitterOf` |
| Winner from tags | Last hitter; Net, Long, Wide give the other side | On tap (End), stored as `winner` on save | `winnerOf`, `settlePoint` |
| Server offered | First server and the score | On render, when a rally opens | `serverAt` |
| First attack `fa` | First `Attack` from shot 2 | On save in memory; on load from shot rows | `bestOpener` |
| Rally start and end | Contacts and pads | On save; nudged on tap | `rallyStart`, `rallyEnd`, `nudgeMark` |
| Parts | Count and strokes | On render | `bestParts` |
| Score, set won, legal end | Stored winners | On render | `countPoints`, `isSetWon`, `isLegalEnd` |
| Set end rally, tagged score | Winners | On render | `setEndIndex`, `calculateTaggedScore` |
| Phase of a rally | Server, count, ending | On render | `phaseOf` |
| Set state, mark state, video status | See the two tables below | On render | `app/src/rules/match.ts`, `app/src/rules/marks.ts` |
| Sets won, tagged result, Differs | Leaders and entered scores | On render | `app/src/rules/match.ts` |
| Match phase, Tagged | Sets and result | On render | `derivePhase`, `isMatchTagged` |
| Set list | Result count, or used sets plus a spare | Every store write and catalog build (`mergeMatches`) | `normalizeMatch` |
| Mark from rallies | First and last contact | Every store write and catalog build | `migrateSetMark` |
| Continuity marks | Serve order, gaps of 9 s | On render | `app/src/rules/continuity.ts` |
| Insight cards and reels | Saved rallies of the filtered matches | On render | `app/src/rules/insights.ts` |
| `serveChecked` on a saved rally | Kind `rally` (every save writes true) | On load | `deriveRallyData` |
| `idea.flow`, `serve`, `result` | Kind, serve depth, ending and count | On load | `deriveRallyData` |
| Check the point | `pointKept` | On load | `deriveRallyData` |
| `outcome` | `resultMe` greater than `resultThem` | On row write | `deriveOutcome` |
| Opponent and event ids | Typed name, ignoring case and outer spaces | On row write | `deriveDbRows` |
| Row times | `createdAt`, `updatedAt`, `finishedAt`, `archivedAt`, `deletedAt`, `removedAt` | On row write; a stored time is kept | `deriveDbRows` |
| Video kind, size in MB | `demoScript`, `sizeBytes` | On load | `deriveMatchRecords` |
| Event start date | Earliest `playedOn` of its matches | Phase 10 reader; no code yet | |
| Your end at a rally | `myEnd`, swap per set and at 5 in the deciding set | Phase 10, `deriveMyEnd`; no code yet | |

## Set states

Exactly one applies. `isSettled` and `isSpareSet` are in `app/src/rules/match.ts`; `isIncomplete` and `endedEarly` in `app/src/rules/marks.ts`.

| State | When | Score that counts | Settled |
|---|---|---|---|
| Not on video | No mark, no rallies, no draft, not finished, not the spare | Details | Only with a Details score |
| Spare | No result. The last listed set, unmarked, no rallies, no draft, no Details score | none | No. Tagged result skips it |
| Ready | Marked, not finished, no rallies, no draft | none | No |
| Under way | Not finished, with rallies or a draft | none | No |
| Saved, won | Finished, and the last rally is the first win (`setOverOnRule`) | Tagged | Yes |
| Ended early | Finished, one side ahead, and the score is not a legal end | Tagged | Yes |
| Incomplete | Finished, with rallies, and the score is level | Details | Only with a Details score |

## Marks and video status

`deriveMarkState`: `off` with no mark, then `saved` when finished, then `tagging` with rallies, else `ready`. `deriveVideoStatus`, first line that fits: Archived, No sets yet, Tagging, Ready to tag, Done. `migrateSetMark`: a set with rallies and no mark gets one from 5 s before the first contact (`MARK_PAD_S`) to 5 s after the last when finished, else to the end of that video; `complete` equals `finished`. A set with a mark is unchanged.

## Invariants

I-1 to I-57 run over the seed and again over the matches read back from rows built from the seed. I-58 to I-61 run over those rows. `npm run check:db` runs them all again, with every golden output, over the rows read back from the browser database.

- I-1 `shots.length` equals `contacts.length`.
- I-2 Contacts strictly increase, stay inside the video, and are at least 0.05 s apart.
- I-3 Start and end hold the contacts. Unedited pads are 2 s before and 1 s after.
- I-4 Ending is Winner, Net, Long, or Wide, and null exactly on a point.
- I-5 Winner follows the server, the count, and the ending, unless the point was kept.
- I-6 Shots follow the Best + FA key sets; a stroke is `Attack`, `Control` or `Defence`.
- I-7 `fa` is the first Attack from shot 2, else null, and never 1.
- I-8 `serveChecked` is true on a tagged rally.
- I-9 `idea` is a Best + FA save.
- I-10 `idea.review` lists parts this rally has, in row order, once each.
- I-11 A point with no video has the point shape, and its server is the one due.
- I-12 Rallies are in video order by first contact, or by start for a point.
- I-20 Rally, set, and match keep their key sets, and no score field is stored.
- I-21 Rally 1 is served by the set's first server. A 3 - 2 start writes points served by `serverAt`.
- I-22 Each rally is served by `serverAt` of the score before it. The seed has no serve break.
- I-23 First servers alternate from you in set 1.
- I-24 Parts cover shots 1 to n once, in order, and match the formula (`Defence` counts as not an attack).
- I-30 A finished set that is not early and not level was won on the rule.
- I-31 A finished set has no rally after the one that won it.
- I-32 An ended-early line reads Set N, Saved, the score, ended early.
- I-33 Finishing a set leaves the Details score unchanged.
- I-34 `hasDifferingScores` is a finished set whose Details score and tagged score disagree.
- I-40 The set list is the result count, or the used sets plus a spare, with no gaps.
- I-41 Sets won count a leader from the score column of the set-state table. Ready, under way, and the spare count for nobody.
- I-42 Tagged result is null until every listed non-spare set has a leader.
- I-43 Complete means no set under way, one set finished, and every set the result lists is settled.
- I-44 An entered result is a real best of 3, 5, or 7, and a complete match agrees with the tagged result.
- I-50 A mark runs forward and sits on one video or the next one.
- I-51 Marks do not overlap by more than 0.05 s, and set numbers rise with the clock.
- I-52 Two checks share this id: every saved rally lies inside its set mark; a re-added video takes the missing id and position.
- I-53 A new mark that fits is at least 60 s and starts in free time.
- I-54 Won sets are complete, under-way sets are not, deleting tags sets complete, and finishing keeps it.
- I-55 A video a set spans is locked, and moving it breaks.
- I-56 Mark state and video status follow the lists above.
- I-57 A set with rallies and no mark gets the `migrateSetMark` pads; a set that has a mark is left as it is.
- I-58 When `resultMe` and `resultThem` are set, `outcome` is `Win` if `resultMe > resultThem`, else `Loss`.
- I-59 Every row passes its validator, and keys, links and numbering hold across rows (`validateDbRows`).
- I-60 Rows read back give the same matches, and rows built from those are the same rows.
- I-61 Today's writers fill no decision 19 column, no `Defence`, no `myEnd`; `outcome` comes only from the result.

The catalog also runs `set-states`: exactly one set state applies. It has no I-number.
