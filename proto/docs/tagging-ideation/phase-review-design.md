# Middle question, rally parts and review marks

Answers Paul's notes of 2026-11-17, redone around his contextual parts principle. It builds on the phase model in `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/rally-phase-scenarios.md` and on Best v0.11.2, where chips show shot numbers only and keep the contact check. Best tags the serve, shots 2 and 3, and the last shot. Every rule here uses only those tags.

## Short answer
- **Parts are contextual:** Serve, Pre-attack, Attack, Middle and End, with Start in place of Serve and Pre-attack when they are too small to split. Each shot sits in exactly one part.
- **Attack is the first attack plus 2.** It grows to the end of the rally when there is no room for a full End. **End is the last 3.** Middle appears only between them.
- **End stays at 3** (reasons in section 2).
- **Rule: what the row shows is exactly what can be marked.** The Rally Row groups and the Mark for review choices are the same set, with the same names, the same order and the same shots. Both come from one calculation.
- **The middle question asks who was attacking, by name.** It is asked on any rally that has a Middle part.

## Verdict on the principle
It holds. It is a clean partition, and it lines up with the stats model: when the opening and end windows do not overlap, Attack is the opening and End is the end; when they do overlap, they become one Attack part. The names are also words a club player already uses. It has two limits. In Best, Attack can only be drawn when the first attack is on shot 2 or 3, or on a rally of 4 shots or fewer. Pre-attack is rare in Best.

## 1. Rally parts

### The parts, in plain words
- **Serve:** the serve.
- **Pre-attack:** the control balls after the serve and before the first attack, when there are 2 or more of them.
- **Start:** the serve and the balls before anything is known to happen. Used instead of Serve and Pre-attack when those would be too small to split, or when no attack is known.
- **Attack:** the first attack and the 2 balls after it, or to the end of the rally if it ends within 4 balls of the first attack.
- **Middle:** whatever is left between Attack (or Start) and End.
- **End:** the last 3 balls, never the serve.

### The rule
n is the number of shots. A shot counts as known when Best asks it (shots 2 and 3, and the last shot) and it has been answered. Shots 4 to n-1 are never asked in Best.

**First attack (o).** Go through shots 2 to n in order. The first attack found is o. If you reach a shot that is not known before finding an attack, the first attack is **unknown**. If every shot is known and none is an attack, there is **no attack**.

**When o is known:**
- **Attack:** if n is o+4 or less, Attack is o to n and there is no End. Otherwise Attack is o to o+2, End is n-2 to n, and Middle is o+3 to n-3 when that is not empty.
- **Before the attack (shots 1 to o-1):** 1 shot is Serve, 2 shots are Start, and 3 or more are Serve (shot 1) plus Pre-attack (2 to o-1).

**When there is no attack, or the first attack is unknown:**
- **End:** from max(2, n-2) to n.
- **Before the End:** with no attack, every shot before End. With the first attack unknown, shots 1 to the smaller of 3 and n-3, but at least shot 1. Shots between that and End are Middle.
- **Name of that first group:** 1 shot is Serve, 2 or more is Start. Pre-attack is never used here, because no attack is known to follow.

**Serve point (n = 1):** Serve.

**The Start rule, and why.** Start replaces Serve plus Pre-attack when Pre-attack would be a single shot (the first attack on shot 3). That single shot is just the receive. Its name is wider than one chip, and two 1-chip groups side by side read as noise. Serve and receive is one coaching unit anyway. The cost is that a Serve review mark is not offered on those rallies, because the serve sits inside Start.

### Examples (Best tags)
| Rally | Parts and shots |
|---|---|
| 1 shot, ace or fault | Serve 1 |
| 2 shots, receive error, no attack | Serve 1, End 2 |
| 2 shots, receive attack | Serve 1, Attack 2 |
| 3 shots, third ball attack | Start 1 to 2, Attack 3 |
| 3 shots, no attack | Serve 1, End 2 to 3 |
| 4 shots, receive attack | Serve 1, Attack 2 to 4 |
| 4 shots, first attack on shot 4 | Serve 1, Pre-attack 2 to 3, Attack 4 |
| 4 shots, no attack | Serve 1, End 2 to 4 |
| 5 shots, 2 and 3 control (first attack unknown) | Start 1 to 2, End 3 to 5 |
| 6 shots, receive attack | Serve 1, Attack 2 to 6 |
| 6 shots, first attack unknown | Start 1 to 3, End 4 to 6 |
| 7 shots, receive attack | Serve 1, Attack 2 to 4, End 5 to 7 |
| 7 shots, third ball attack | Start 1 to 2, Attack 3 to 7 |
| 8 shots, receive attack | Serve 1, Attack 2 to 4, Middle 5, End 6 to 8 |
| 8 shots, third ball attack | Start 1 to 2, Attack 3 to 5, End 6 to 8 |
| 9 shots, first attack unknown | Start 1 to 3, Middle 4 to 6, End 7 to 9 |
| 10 shots, third ball attack | Start 1 to 2, Attack 3 to 5, Middle 6 to 7, End 8 to 10 |

Parts settle as shots 2 and 3 are tagged. Until then the first attack is unknown, so an 8 shot rally first reads Start 1 to 3, Middle 4 to 5, End 6 to 8.

### End: 3 or 2
The two only differ on rallies that end exactly 4 balls after the first attack (6 shots with a receive attack, 7 with a third ball attack). That is about 3 or 4 rallies a match. With End 3 those show one Attack of 5 shots. With an End minimum of 2 they show Attack 3 and End 2.

**Recommend 3.**
- One End length everywhere, so every End clip in a review reel is the same shape.
- It is the same as the stats End window and the r4 end slots, so a part on screen means the same shots as the stats phase whenever both exist.
- The rule stays one sentence: Attack takes everything until there is room for 3 and 3.
- **Against it:** those 3 or 4 rallies a match offer no separate End to mark, so the player marks Attack, which holds the finish. Switch to 2 if Paul finds 5 shot Attack clips too long.

### The row and review rule (Paul, 2026-11-17)
- The Rally Row groups and the Mark for review choices are **one set**: the same parts, the same names, the same order and the same shots.
- Both are drawn from the same `bestParts` result for the rally as it stands. Neither has its own rule, and neither may hide, merge, rename or add a part.
- A review mark plays exactly the shots of its group on the row, no more and no less.
- When the parts change (shot 2 or 3 tagged, a contact added or deleted), the row and the review choices change together. A mark belongs to the part name, so it follows that part to its new shots. It is dropped only if the part is gone, for example Serve becoming part of Start.
- The review row is the only place this set is hidden, while a mismatch is showing. It returns unchanged once the mismatch clears.

### What the row looks like
Chips show the shot number only and keep the contact check (v0.11.2). The grouping sits under the chips and never touches them.
- **Gap:** chips in a part sit 2px apart, and parts sit 8px apart.
- **Bar:** a 2px neutral bar under each part, the full width of its chips.
- **Name:** the part name under the bar in 8px muted text, left aligned, on one line. Pre-attack always has 2 or more chips, so its name fits.
- **Review mark:** a marked part has its bar and name in the accent colour.
- **When:** parts show once the rally closes. While contacts are tapped the row is flat.
- **Check on a closed rally:** chips grow to the Check size and the groups stay. A deleted contact redraws the parts at once.
- **Wrapping:** a long part wraps its chips inside its own group. A part never splits from its name.
- **Height:** about 14px more on a closed rally. The names are required by the row and review rule, so they cannot be dropped to save height.

**Alternative: coloured bars with names.** The same gaps and names, with each part's bar in its own colour, and a 4px bar for a review mark. It reads faster once learned. But it adds up to six colours to a screen that already uses player tints, green and red ends, amber Check and the accent.

## 2. The middle question
- **Asked on:** any rally with a Middle part, in Best and Best + FA. In Best that is 8 or more shots with a receive attack, 9 or more with a third ball attack, and 7 or more when the first attack is unknown. That is about 8 rallies a match, close to the old 8+ rule. It is tied to the part because the question loops the Middle group, and without one there is nothing to show.
- **Step:** Middle, between Third and Finish. Optional, and it never blocks Finish. The loop plays the Middle group at 0.75x and ends where End begins.
- **Label:** "End of middle: who was attacking?"
- **Answers:** [your name], [their name], Nobody.
  - **A name:** that player attacked, and the other player has only blocked since.
  - **Nobody:** the last two balls of the loop were both non-attacks (push, chop, control). This includes a middle with no attack.

| Answer | First attack known | Stored event | Card wording |
|---|---|---|---|
| Opener's name | yes | kept | Kept the attack |
| Other name | yes | turned | Lost the attack |
| Nobody | yes | reset | Back to control |
| A name | no | opened in middle | Opened late |
| Nobody | no | still control | No attack yet |

- The opener's side is known when o is known, or in Best + FA when "Who attacked first?" was answered with a name.
- **Why the old answers changed:** "Nothing" could mean "no change" or "no attack". All three old answers needed the tagger to remember who opened. Names need no memory.
- **Gives up:** a reset followed by the same player attacking again reads as kept, and so does a turn and a turn back.
- **Cost:** about 8 taps and 30 s a match.

## 3. The review question
- **Where:** a row on Finish labelled "Mark for review", above Point to. Point to saves the rally, so it stays last.
- **Options:** exactly the groups on the Rally Row, by the row and review rule. Each is a toggle. More than one can be marked. At most 4 appear on a Best rally, because Pre-attack only appears on 4 shot rallies.
- **Clip:** from just before the part's first shot to just before the next part begins. A part holding shot 1 starts at the rally start, and the last part ends at the rally end.
- **Tap cost:** 0 when skipped, 1 per mark. Marking 1 rally in 5 is about 16 taps and 20 s a match.
- **Where marks go:** a "Marked for review" reel per part name, across matches. The Highlight star stays the show reel.

## Build spec, Best v0.12

For a Grok builder in `proto/`. Best and Best + FA only. The other flows are unchanged. Build on v0.11.2 (number-only chips and the contact check), branching from its tip.

**Hard rule, row and review are one set.** `TagSetScreen` calls `bestParts(live.contacts.length, live.shots)` once per render and passes that same array to `BestRallyRow` and `BestPanel` (prop `parts`). Neither component calls `bestParts` itself, filters, reorders or relabels it. Both use `PART_LABEL`. `partWindow` uses the same `from` and `to`.

### Data (`proto/src/features/tagging/rally.ts`)
- `BestMark.step` gains `'middle'`.
- Add `BestMark.middle?: 'me' | 'them' | 'none'` and `BestMark.review?: BestPart[]`.
- Add `IdeaTag.middle?: 'me' | 'them' | 'none'` and `IdeaTag.review?: BestPart[]`.

### Rules (`proto/src/features/tagging/bestFlow.ts`, pure)
- `export type BestPart = 'serve' | 'start' | 'pre' | 'attack' | 'middle' | 'end'`
- `export const PART_LABEL`: Serve, Start, Pre-attack, Attack, Middle, End.
- `export const BEST_END_LEN = 3` and `BEST_ATTACK_LEN = 3`. The Attack grows while n is under o + BEST_ATTACK_LEN + BEST_END_LEN - 1.
- `bestAsked(n, shot)`: true for shots 2 and 3, and for shot n when n is 4 or more.
- `bestOpener(n, shots): number | 'none' | 'unknown'`. Walk shots 2 to n. A shot that is not asked, or asked with no stroke yet, gives `'unknown'`. The first Attack gives its shot number. No Attack after all of them gives `'none'`.
- `bestParts(n, shots): { part: BestPart; from: number; to: number }[]`, in rally order, empty parts left out, exactly per section 1. n = 0 gives none, and n = 1 gives Serve 1 to 1.
- Unit check in the build: for n from 1 to 13 and every mix of attack, control and blank on the asked shots, the parts cover 1 to n once each, in order.
- `stepsFor(d)`: takes the draft. Insert `'middle'` before `'finish'` when `bestParts` has a Middle. Update every caller (`nextStep`, `keepStep`, `restoreStep`, the close, the contact removal and the tab test) to pass the draft. `STEP_LABEL.middle = 'Middle'`.
- `stepAnswered(d, 'middle')`: true when `d.best?.middle` is set. Add `stepPassable(d, step)`, true for `'middle'`, otherwise `stepAnswered`. Use it for the `restoreStep` fallback, the tab `disabled` test and the `onStep` guard.
- `bestLoop(d, 'middle', ...)`: `shotLoop(contacts[from-1], contacts[to], timing, rate)` over the Middle part.
- `partWindow(d, part)`: the part holding shot 1 starts at `rallyStart(d)`, others start the lead before their first contact. A part ends the end offset before the next part's first contact, and the last part ends at `rallyEnd(d)`.
- `openerSide(d)`: `hitterOf(server, o)` when o is a number, otherwise in Best + FA the side named in `best.first`, otherwise null.
- `middleEvent(d)`: `'kept' | 'turned' | 'reset' | 'opened' | 'control' | null`, per the table in section 2.
- `keepBestMarks(d)`: after any stroke or contact change, drop `middle` when there is no Middle part, and drop review parts that `bestParts` no longer returns.
- `bestRally`: copy `best.middle` and `best.review` (when not empty) into `idea`.
- `middleLine(r, names)` and `reviewLine(r)`: "Middle Kim" or "Middle Nobody", and "Review Attack, End". Empty when not set.

### Panel (`proto/src/features/tagging/BestPanel.tsx`)
- **Middle step:** caption "End of middle: who was attacking?" over `Choice` cells `names.me`, `names.them`, Nobody. On is `draft.best?.middle`. New prop `onMiddle(side: 'me' | 'them' | 'none')`.
- **Finish:** `Row label="Mark for review"` after the End row, the Who attacked first row and the end note, and before Point to. One `Choice` per entry of `parts`, in order, labelled from `PART_LABEL`, with `data-best-review={part}`, `data-from` and `data-to`. On when in `draft.best?.review`. New prop `onReview(part: BestPart)`. Hidden while `mismatch` is true.
- **`BestRallyRow`:** when `draft.closed`, group the chips by `parts`. Each group is a column with `data-best-part={part}`, `data-from` and `data-to`: its chips (flex-wrap, `gap-0.5`), a 2px rounded bar the group's width with 2px above it, and the name at 8px, semibold, muted, no wrap, left aligned. `gap-2` between groups. The bar is `var(--tag-cell-rest-line)`. A marked part has its bar and name in `var(--color-brand-primary)`. While contacts are tapped, keep the flat chips. The chips stay exactly as v0.11.2 draws them.

### Wiring (`proto/src/features/tagging/TagSetScreen.tsx`)
- Work out `parts` once per render from `live` and pass it to both components.
- `putBest`, the close (about line 1079) and the contact removal (about line 1757) rebuild `best` field by field. Carry `middle` and `review` like `first` and `end`.
- `onMiddle`: write `best.middle`, then `putBest(next, 'middle', true)`, which moves to Finish.
- `onReview`: toggle the part in `best.review` with `writeDraft`. The loop does not change.
- `onStroke` and every contact removal: pass the draft through `keepBestMarks` before writing.
- `playBest` for `'middle'` uses `bestLoop(d, 'middle')`.

### Rally list (`proto/src/features/tagging/RallyList.tsx`)
- Append `middleLine` and `reviewLine` after `faLine`, in the same " · " style.

### Version
- `proto/src/version.ts` becomes `v0.12`.

### Checks, at 393×660 and 1440×912, Best and Best + FA
1. 1 shot ace: Serve. Mark for review offers Serve only.
2. 3 shots, shot 2 control, shot 3 FH attack: Start 1 to 2, Attack 3. No Middle step.
3. 4 shots, 2 and 3 control, 4 FH attack: Serve 1, Pre-attack 2 to 3, Attack 4. The Pre-attack name fits under its chips.
4. 6 shots, shot 2 BH attack: Serve 1, Attack 2 to 6, no End.
5. 8 shots: before Receive is answered, Start 1 to 3, Middle 4 to 5, End 6 to 8. Tag shot 2 FH control and shot 3 FH attack: Start 1 to 2, Attack 3 to 5, End 6 to 8, and the Middle tab is gone.
6. 8 shots, shot 2 FH attack: Serve 1, Attack 2 to 4, Middle 5, End 6 to 8. Third advances to Middle, the loop plays shot 5, and Finish is open without an answer.
7. 10 shots, shot 3 attack, answer Kim, mark Middle and End: the saved rally has `idea.middle` and `idea.review`, the list shows "Middle Kim · Review Middle, End", and those bars are in the accent colour.
8. 10 shots in Best + FA with only the last shot an attack: Who attacked first and Mark for review are both on Finish, and nothing scrolls, including with Check minuses on.
9. Delete a contact on a rally with Middle answered so the Middle part goes: the step and its answer go, and a mark on a part that is gone is dropped.
10. While contacts are tapped, with and without Check, the row is flat. With Check on a closed 10 shot rally, the groups stay and every minus works.
11. Row and review match on every Finish above: the `[data-best-part]` groups and the `[data-best-review]` cells have the same parts, order, `data-from`, `data-to` and visible names. On check 5, with End marked before shot 3 is tagged, the End mark stays on End 6 to 8 after the change.

No scroll on `.tag-set`, `[data-tag-body]` or `.tag-entry` in any state. No page errors. `tsc -b` is clean.

**Stop rule:** if Finish scrolls in check 8 or 10, or check 11 finds any difference, stop and report with a screenshot. Do not drop the part names, shrink cells or change sizes to make it fit.

**Out of scope:** reels and playlists in Insights, any change to the stats phase windows, other flows, new keys, restyling.
