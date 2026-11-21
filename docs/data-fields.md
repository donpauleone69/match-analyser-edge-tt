# Data fields

Every column of schema v1 (`app/src/types/db.ts`): its allowed values, what writes it today, and what reads it. The shape, the links and what is derived are in `docs/data.md`. This is a second file because one would pass 200 lines.

Rows are built from memory by `deriveDbRows` in `app/src/rules/dbRows.ts`, so "written by" names the memory field and the code that changes it. Store actions are in `app/src/stores/matchStore.ts`; set and rally changes are in `app/src/rules/matchOps.ts` and are called from `app/src/features/tagging/hooks/useTagSetFlow.ts`, `app/src/features/match/sections/TagVideoSection.tsx` and `app/src/features/match/composers/MatchTagComposer.tsx`. From phase 8.2 the stores save those rows through the repositories in `app/src/data/` (`saveMatch`, `saveRally`, `saveDraft`; see `docs/data.md`). "Phase 8" and "phase 10" mean nothing writes it before that phase. Null is allowed wherever a value says "or null"; every other column is required.

Each row is checked before a write by `validateOpponentRow`, `validateEventRow`, `validateMatchRow`, `validateVideoRow`, `validateSetRow`, `validateRallyRow` (with its shots, through `validateShotRow`) or `validateDraftRow`, in `app/src/rules/dbValidate.ts`. `validateDbRows` adds the rules across rows: unique keys, every link names a row that is there, names unique ignoring case (`validateUniqueNames`), and numbering with no gaps. They return a list of `{ table, id, field, problem }` and never throw. Tests: `app/tests/rules/db-validate.test.ts`.

## opponents

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | text, unique | `deriveDbRows`, for a typed name with no row (`o-<ms>-<k>`); import gives a new id only when the file's is taken | `matches.opponentId` |
| `name` | trimmed text, unique ignoring case | Opponent box in Details, `updateMatch` from `MatchFieldsSection`; `renameOpponent` (no screen yet) | Matches rows, header, filters (`app/src/rules/filters.ts`), status (`app/src/rules/matchStatus.ts`) |
| `club`, `notes` | trimmed text (notes: any text), or null | phase 10 | nothing yet |
| `handedness` | `Right`, `Left`, or null | phase 10 | nothing yet |
| `style` | `Attacker`, `Defender`, `Disrupter`, or null | phase 10 | nothing yet |
| `birthYear` | whole year from 1900 to this year, or null | phase 10 | nothing yet |
| `createdAt`, `updatedAt` | whole ms at or after 0; updated not before created | `deriveDbRows` when the row is made | nothing yet |

## events

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | text, unique | `deriveDbRows` (`e-<ms>-<k>`) | `matches.eventId` |
| `name` | trimmed text, unique ignoring case | Event box in Details, `updateMatch`; `renameEvent` (no screen yet) | Matches rows, filters, Insights filter |
| `location` | trimmed text or null | phase 10 | nothing yet |
| `rankingStatus` | `Ranking`, `NonRanking`, or null | phase 10 | nothing yet |
| `importance` | `National`, `Regional`, `Social`, or null | phase 10 | nothing yet |
| `createdAt`, `updatedAt` | as for opponents | `deriveDbRows` | nothing yet |

## matches

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | text, unique | `createMatch` from `MatchesComposer` (`m-new-<ms>-<8 hex>`); the seed; a match file | every child row |
| `opponentId`, `eventId` | an id of a row that is there, or null (empty name) | the typed name, linked ignoring case and outer spaces | the name, through the link |
| `playedOn` | a real `YYYY-MM-DD` date, or null (empty) | Date box in Details, `updateMatch` | Matches rows and order (`sortNewestFirst`), Insights date filter |
| `category` | `U13`, `U15`, `Senior`, `Vets`, or null | phase 10 | nothing yet |
| `stage` | `Group`, `Knockout`, or null | phase 10 | nothing yet |
| `round` | `R64`, `R32`, `R16`, `QF`, `SF`, `F`, or null; only when `stage` is `Knockout` | phase 10 | nothing yet |
| `outcome` | `Win`, `Loss`, or null; with a result, `Win` exactly when `resultMe > resultThem` (I-58) | `deriveOutcome` from the result; a free pick with no result is phase 10 | nothing yet |
| `resultMe`, `resultThem` | both null, or a real best of 3, 5 or 7 (`REAL_RESULTS`) | `setResult` from `ResultSection` | set list (`normalizeMatch`), status, Complete, Differs |
| `createdAt` | whole ms at or after 0 | first row write, then kept | load order in `deriveMatchRecords` |
| `updatedAt` | whole ms, not before `createdAt` | a row write that changes one of the match's rows | nothing yet |

## videos

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | text, unique | `addVideo` (`v-<matchId>-<ms>-<8 hex>`, or the id of a removed video still named); the seed | marks, rallies, drafts |
| `matchId` | a match id | `addVideo` | |
| `position` | listed videos 0 to k-1 with no gap; a removed video keeps its place | `addVideo`, `updateVideoPosition` from `MatchTagComposer` | play order and the match clock (`app/src/rules/timeline.ts`) |
| `fileName` | text, not empty | `addVideo`: the picked file's name in `AddVideoSection`, or `demo-video-<n>.mp4` | no screen shows it |
| `sizeBytes` | whole bytes at or after 0 | `sizeMb` times 1,000,000; archive keeps 12% | no screen shows it |
| `durationS` | seconds at or after 0 | `addVideo`, from the loaded file or the demo script | timeline, marks, player, `TagVideoSection` |
| `lastModifiedMs` | whole ms, or null | phase 8 (`File.lastModified`) | phase 8, finding the file again |
| `fingerprint` | text or null | phase 8 | phase 8 |
| `storedOnDevice` | true or false | false today; phase 8 | phase 8 |
| `archivedAt` | whole ms, or null | `setVideosArchived` at the end of `addArchiveJob` (no screen starts one today); seed history videos | `isArchived`, video status, tag lock |
| `myEnd` | `Near`, `Far`, or null | phase 10 | phase 10 (`deriveMyEnd`) |
| `removedAt` | whole ms, or null | `removeVideo` (no screen calls it today) | `addVideo` takes the id and place back |
| `demoScript` | a demo script, or null on a file | `addVideo` with no file, the seed | `VideoSection`, `StandInBlock`; kind `demo` on load |

## sets

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | `<matchId>:<setNumber>`, unique | `deriveDbRows` | rallies, drafts |
| `matchId` | a match id | `normalizeMatch` lists the set | |
| `setNumber` | 1 to 7 (`MAX_SETS`); 1 to N with no gap in a match | `normalizeMatch`, `moveSet` | everything per set |
| `enteredMe`, `enteredThem` | whole 0 to 99, or null (box empty) | `setEnteredScore` from `ResultSection`; `applyTaggedScore` and `applyTaggedScores` (Use tagged) | set states, Differs, sets won |
| `firstServer` | `me` or `them` | `emptySet` (alternates), `flipFirstServer`, `startSet`, `moveSet` | `serverAt`, rally 1 server |
| `finishedAt` | whole ms, or null | `finishSet`, `settleFinished`, `reopenSet`, `saveMark`, `deleteTags`, `moveSet` | set state, mark state, video status |
| `markFromVideoId`, `markFromT`, `markToVideoId`, `markToT`, `markComplete` | all five set or all null; videos of this match; on one video, from not after to | `saveMark`, `migrateSetMark`, `deleteTags`, `unmarkSet`, `moveSet` | `app/src/rules/marks.ts`, timeline, video lock |

## rallies

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | text, unique | `bestRally` on save (`r-<ms>-<8 hex>`, `createRowId`); `pointRally` in `startSet` (points) | shots |
| `setId` | a set id | the set saved into | |
| `videoId` | a video of the same match | the draft's video (`emptyDraft`), the open video | timeline, reels, continuity |
| `kind` | `rally` or `point` | `point` on a point | load, validation |
| `position` | 0 to k-1 in a set, live and deleted rallies each numbered | list order: `saveRally` (video order), `replaceRally`, `dropAfter`, `deleteRally`, `restoreSet` | score order, set end, rally numbers |
| `server` | `me` or `them` | rally 1 asks; later rallies `serverAt` | `serverAt`, hitters, Insights |
| `startT`, `endT` | seconds, start not after end, holding the contacts; equal on a point | `rallyStart`, `rallyEnd`, `nudgeMark` | reels, marks, continuity |
| `ending` | `Winner`, `Net`, `Long`, `Wide`; null exactly on a point | End on the pad | `winnerOf`, phases, Insights |
| `winner` | `me` or `them`; equals `winnerOf` unless `pointKept` (I-5) | the draft's `best.point` (set by `settlePoint` or Point to), else `winnerOf` | score, sets, Insights |
| `pointKept` | true or false; false on a point | Check the point (`idea.check`) | `draftFromRally` (Edit Rally) |
| `reviewParts` | `opening`, `attack`, `rally`, `end`, this rally's own, in row order, once each; empty on a point | the star review (`idea.review`) | Insights, `draftFromRally` |
| `leftMarks` | `serve`, `gap`, once each | `leaveMark` | `app/src/rules/continuity.ts` |
| `createdAt` | whole ms | first row write, then kept | nothing yet |
| `deletedAt` | whole ms, or null | `deleteRally` (the hidden `deleted` list, cleared by `finishSet`) | `moveSet` carries them; not in the score |

## shots

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `id` | `<rallyId>:<shotNumber>` | `deriveDbRows` | |
| `rallyId` | a rally id | the rally | |
| `shotNumber` | 1 to n with no gap; none on a point | contact order | `hitterOf`, parts |
| `contactT` | seconds, at least 0.05 s after the shot before; inside start and end | `captureContactTime` on tap; `undoContact` takes the last off | timeline, gaps, reels |
| `wing` | `BH`, `FH`, or null | pad | Insights, parts |
| `depth` | `Short`, `Long`, or null; only on shot 1 | pad | Serve card, parts |
| `stroke` | `Attack`, `Control`, `Defence`, or null; null on shot 1 | pad (`Defence` is phase 10) | `fa` (`bestOpener`), parts, Insights |

## drafts

| Column | Allowed | Written by | Read by |
|---|---|---|---|
| `setId` | a set id, one draft per set | `setDraft` from `useTagSetFlow` on every tap (phase 8.2: `saveDraft`); `saveRally` and `finishSet` clear it | |
| `rally` | the open `Draft`: video id, server, ascending contacts, `closed`, `noAttack`, start, end, ending, `fa` from 2, shot tags, `serveChecked`, `best` with flow `bestfa` | `setDraft` | `useTagSetFlow` reopening the set |

## Gaps

Columns nothing writes today: `lastModifiedMs`, `fingerprint`, `storedOnDevice` (phase 8); `club`, `handedness`, `style`, `birthYear`, `notes`, `location`, `rankingStatus`, `importance`, `category`, `stage`, `round`, `myEnd`, `Defence`, and `outcome` with no result (phase 10, decision 19). `archivedAt` and `removedAt` are written only by store actions no screen calls; the seed writes `archivedAt`.

Data the app keeps that the plan's columns did not store. G1 to G4 are fixed in v1 with an added column; the rest are for phase 8 or a call.

- G1. Rally order. Points from a 3 - 2 start share one time, and a rally on a removed video holds its place, so order cannot be worked out. Fix: `rallies.position`.
- G2. Check the point. The saved winner can differ from the tags, and Edit Rally needs to know. Fix: `rallies.pointKept`.
- G3. Demo video script. `demoScriptFor` seeds from the clock, so it cannot be made again. Fix: `videos.demoScript`; `kind` is derived from it.
- G4. Removed videos (`removedVideos` in the store). Fix: the row stays with `removedAt` and its place.
- G5. File size is rounded to whole MB on add (`AddVideoSection`). Fix in phase 8: write `File.size` into `sizeBytes`.
- G6. Entered scores are kept as typed strings; the row keeps a whole number, so a typed `07` reads back as `7`. Call for Paul. Recommended: keep numbers (the box takes digits only, and the score reads the same). Reverse: make both columns text.
- G7. Demo mode (`mode`, `extra`, the deleted seed ids) is a layer over the seed. Fix: a separate demo database, `edge-tt-matches-demo`, reseeded by `reseedDemo` (built); the Account switch is phase 8.2.
- G8. Archive jobs (`archiveSteps`) run in memory. Fix: none; a reload mid job leaves the videos as they were.
- G9. A new match nobody filled in is dropped (`removeUntouchedMatches`). Fix in phase 8.2: `createMatch` writes no row; the first `saveMatch` comes when it is touched.
- G10. Opponent and event link on every keystroke, so typing makes a row for each prefix. Call for Paul. Recommended: link on leaving the box, and drop rows that edit made and no match names. Reverse: keep text on the match. Built for the recommendation: `saveMatch` links the typed names and drops a name row the save unlinked that no match uses and that has no details; phase 8.2 calls it for names on leaving the box.
- G11. Renaming an opponent everywhere has no screen; typing links or makes a row. Phase 10.
- G12. Name case and outer spaces read back from the row, so `bob` typed after `Bob` shows `Bob`. Phase 8 accepts this.
- G13. Undo, toasts, Edit and review state, and Watching speed per match (`watchRates` in `useTagSetFlow`, kept while the app is open) are not stored. Fix: none; they are screen state.
- G14. Filters save names in session storage (`app/src/stores/settingsStore.ts`). Fix in phase 8.2: save ids.
- G15. Matches with the same date keep list order (`sortNewestFirst`). Rows hold it through `createdAt` and a stable sort in `deriveMatchRecords`; `loadAll` reads in `createdAt` order, ties by id, and the seed is written one ms apart in list order.
- G16. Your handedness is `myHandedness` in the settings store: null, no writer, no storage key. Phase 10 adds the writer.
