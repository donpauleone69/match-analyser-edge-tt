# Data model

What the app stores today. Types live in `app/src/types/`. Rules that read them live in `app/src/rules/`. Invariants are `app/tests/invariants/catalog.ts`. There is one nested record per match, in memory. "You" is `me`. Opponent and event are text, not rows.

```
MatchRecord
  videos: VideoAsset[]     play order
  sets: SetData[]          setId 1..N, no gaps
    mark: SetMark | null
    rallies: RallyData[]
      shots: ShotTags[]    one per contact
    draft: Draft | null
```

Times are seconds in one video. The match clock is derived by laying videos end to end.

## MatchRecord

`id`, `opponent`, `date` (`YYYY-MM-DD` or empty), `event`, `result` (`{ me, them }`, both numbers or both null), `videos`, `sets`. No stored status, no best-of field, no created time. Seed ids are `m-new`, `m-ready`, `m-partial`, `m-complete`, `m-h1` to `m-h10`. Created ids look like `m-new-<ms>`.

`result` on Details is a real best of 3, 5, or 7 (`REAL_RESULTS` in `app/src/rules/matchStatus.ts`). Phase (`new`, `ready`, `partial`, `complete`) is `derivePhase`.

## VideoAsset

`id`, `fileName`, `sizeMb`, `archived`, `kind` (`demo` or `file`), `durationS`, optional `script` (demo only), optional `src` (blob URL, memory only). Order is play order. Archive keeps rallies joined, at lower size, and cannot be undone. A re-added video takes the missing id and position (second I-52).

## SetData and SetMark

`setId`, `entered` (score strings as typed), `finished` (the user saved the set), `firstServer`, `rallies`, `draft`, `mark`. `SetMark` is `from` and `to` (`{ videoId, t }`) and `complete` (the whole set is on video from the first serve). Null mark means the set is not on video. At most 7 sets (`MAX_SETS` in `app/src/rules/matchOps.ts`), or the count the result implies.

Delete keeps the rally on a `deleted` array cast onto the set until `finishSet` clears it. It is not a field of `SetData`, and the score never counts it.

## RallyData, shots, idea

`id`, `videoId`, `server`, `contacts`, `start`, `end`, `ending`, `fa`, `shots`, `winner`. Optional: `point` (a point with no video), `left` (`serve` or `gap` marks the user left), `serveChecked`, `idea`.

`ending` is `Winner`, `Net`, `Long`, or `Wide`, and null only when `point` is set. The live End pad writes Winner, Long, and Net (labelled In net). Wide is still a legal value and appears in the seed.

Best + FA shot keys, for `n` contacts:

| Shot | Keys | Values |
|---|---|---|
| 1, when n is 1 | none | End alone: ace or serve fault |
| 1, when n is at least 2 | `depth`, `wing` | `Short` or `Long`; `BH` or `FH` (landing) |
| 2..n | `wing`, `stroke` | `BH` or `FH`; `Attack` or `Control` |

`idea` (`IdeaTag`): `flow: 'bestfa'`, optional `serve` (copy of serve depth), `result` (`Ace`, `Serve fault`, or the ending), `review` (parts in row order), `check` (`Check the point` when Point to was kept against End).

`Draft` is the open rally: the rally fields plus `closed`, `noAttack`, and `best` (`BestMark`: step, page, end, point, kept, review, cut). A draft is not in the score. Default start is 2 s before the first contact (`RALLY_LEAD_S`), default end is 1 s after the last (`RALLY_PAD_S`). `nudgeMark` can move them. They still have to contain the contacts.

A point with no video has empty contacts, `start === end`, null ending, null `fa`, no shots.

## Derived, never stored as its own field

| Value | Rule | Code |
|---|---|---|
| Hitter of shot k | Server hits odd shots | `hitterOf` |
| Winner from tags | Winner: last hitter. Net, Long, Wide: the other side | `winnerOf` |
| Score | Count of stored `winner` | `countPoints` |
| Server at a score | Two each, then one each from 10-all | `serverAt` |
| Set won | 11 or more, two clear | `isSetWon` |
| Legal end | 11 with the other on 9 or less, or both at least 10 and exactly two apart | `isLegalEnd` |
| Set end rally | First rally whose running score is a win | `setEndIndex` |
| Tagged set score | Score at that rally, else the plain count | `calculateScoreAtSetEnd`, `calculateTaggedScore` |
| First attack | First `Attack` from shot 2, else null, never 1 | `bestOpener` |
| Parts | Opening, Attack, Rally, End. Cover 1..n once | `bestParts` |
| Phase | Serve to 5th, Receive to 4th, Rally | `phaseOf` |
| Sets won, tagged result, Differs | From leaders and entered scores | `app/src/rules/match.ts` |
| Continuity | Serve-order breaks; gaps of at least 9 s | `app/src/rules/continuity.ts` |

`fa` and `winner` are stored when the rally is saved, from those rules. The running score is not a field.

## Invariants

Checked over the seed. Ids and the catalog text:

- I-1 `shots.length` equals `contacts.length`.
- I-2 Contacts strictly increase, stay inside the video, and are at least 0.05 s apart.
- I-3 Start and end hold the contacts. Unedited pads are 2 s before and 1 s after.
- I-4 Ending is Winner, Net, Long, or Wide, and null exactly on a point.
- I-5 Winner follows the server, the count, and the ending, unless the point was kept.
- I-6 Shots follow the Best + FA key sets.
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
- I-24 Parts cover shots 1 to n once, in order, and match the formula.
- I-30 A finished set that is not early and not level was won on the rule.
- I-31 A finished set has no rally after the one that won it.
- I-32 An ended-early line reads Set N, Saved, the score, ended early.
- I-33 Finishing a set leaves the Details score unchanged.
- I-34 `hasDifferingScores` is a finished set whose Details score and tagged score disagree.
- I-40 The set list is the result count, or the used sets plus a spare, with no gaps.
- I-41 Sets won count a leader from the score that state uses. A set still to tag counts for nobody.
- I-42 Tagged result is null until every listed non-spare set has a leader.
- I-43 Complete means no set under way, one set finished, and every set the result lists is settled.
- I-44 An entered result is a real best of 3, 5, or 7, and a complete match agrees with the tagged result.
- I-50 A mark runs forward and sits on one video or the next one.
- I-51 Marks do not overlap by more than 0.05 s, and set numbers rise with the clock.
- I-52 Two checks share this id: every saved rally lies inside its set mark; a re-added video takes the missing id and position.
- I-53 A new mark that fits is at least 60 s and starts in free time.
- I-54 Won sets are complete, under-way sets are not, deleting tags sets complete, and finishing keeps it.
- I-55 A video a set spans is locked, and moving it breaks.
- I-56 Mark state follows the table, and video status is the first line that fits.
- I-57 Every set with rallies has a mark, and migrating the mark changes nothing.

The catalog also runs `set-states`: exactly one set state applies. It has no I-number.

## Database (phase 7)

Not built. The table design is not in this file. Phase 8 will add a field map here when the database exists.
