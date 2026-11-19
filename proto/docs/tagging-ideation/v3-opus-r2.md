# Tagging v3 (Opus) r2: Opening and Ending, score first

Canvas: [Rally tagging v3 r2: Opening and Ending, score first](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/fb73e5f9-8657-40cd-a15f-abf10c7b6829)

## What changed and why
- **Choice: kept the frame, rebuilt the questions.** Tagging the opening and the ending of each rally still holds, because the correction does not change where the coaching value sits. The questions and passes are new.
- **The outcome is now tagged.** A new score pass asks one question per rally: did the last ball go into the Net, Miss the table, or Land? Who hit last comes from the serve order, so this gives the point winner and builds the score. In round 1 the outcome was read from a score we thought was given.
- **The 2 by 3 pad is gone.** Every question is now a single row of two or three buttons. The shot question is "FH attack, BH attack, or the third button". The third button's label (Push or Block) follows from the ball before.
- **The serve swipe pass is folded into the detail pass**, because the opening clip already starts with the serve.
- **Effect:** taps go from 353 to 395 (up 42) and time from 13.9 to 15.4 minutes (up 1.5). The cost is the score pass covering every rally, including serve points, plus a zone tap after each winner. Single-row taps are quicker (1.4 s instead of 1.8 s), which pays some of it back. The budget goes from 15 to 16 minutes.

## Sequence
1. **Setup, once per match:** first server, handedness of both players, camera end.
2. **Score pass, mandatory:** the clip of the last contact plays and the player taps Net, Missed table or Landed. If it landed, a second tap gives the zone: Wide FH, Elbow or Wide BH.
3. **Detail pass:** the clip loops the opening and ending contacts.
   - Serve length: Short or Long.
   - Then one attack question for each tagged shot: shots 2 and 3, plus the last three.
   - In 7+ shot rallies only, "Which shot was the first attack?" when it falls in the untagged middle.

Answers auto-advance, and tapping any earlier answer changes it.

## Fields and what each unlocks
- **Last ball:** point winner, score, serve order, phase, and winners against errors. On errors, Net or Missed table points to the technical fix.
- **Winner landed:** where points are won, the tactical lever.
- **Serve length:** serve and third-ball patterns, and receive against short or long serves.
- **Attack question per shot:** receive habits, third ball, and the ball before every error (under attack or self-made).
- **First attack:** initiative win rate.

## Inferred, never asked
- Point winner, score, next server and set ends.
- Phase, the ball before the last shot, error context, and the time gap before the last shot (from timestamps).
- Push or Block on non-attacks, from the ball before.
- First attack in almost every rally.

## Tricks
- **Score first:** the score pass alone gives a complete match and the phase card.
- **Serve order rarely depends on results:** serve changes every two points whatever happens, so a mis-tap moves a point but rarely the serve order, which only depends on results at deuce and set ends.
- **Free score check:** set breaks show as long timestamp gaps, so a score that ends a set where the video does not gets flagged.
- **Self-labelling third button:** its label follows from the ball before.
- **Looped clips:** only the tagged contacts play.

## Contact delete (added 2026-11-17)
A Check toggle on the contact strip works like the prototype Rally Row: the rally plays at 0.5x, every chip gets a minus, and a short Undo follows. It is available during tapping, after commit and on the last-ball screen.
- Tags belong to contacts, so a removal recomputes the shot count, every later hitter, the winner, the score and later serve order.
- A delete at one end prompts a glance at the other end.
- Clean rallies cost nothing extra.

Full plan: [effort-budget-contact-delete-plan.md](effort-budget-contact-delete-plan.md).

## Left out
Serve spin, wing of pushes and blocks, placement of every ball, quality ratings, forced against unforced, footwork, middle shots of 7+ rallies, free-text notes.

## Effort budget
**16 minutes per 80-rally match.** The score pass takes about 5 minutes and is the fixed price of an unknown score; the detail pass fits in the other 11.

Assumed amateur mix by shots per rally:

| Shots | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ |
|---|---|---|---|---|---|---|---|---|
| Share | 13% | 19% | 24% | 13% | 10% | 7% | 5% | 9% |
| Taps | 2.4 | 3.4 | 4.4 | 5.4 | 6.4 | 7.4 | 7.7 | 7.7 |
| Seconds | 6 | 9 | 10 | 12 | 14 | 16 | 17 | 17 |

Total: about **395 taps and 15.4 minutes**.

## Five reasons
1. The outcome is one look at the last ball, a fact anyone sees the same way.
2. Score first: the match is complete after 5 minutes, and the timestamps check it.
3. One single-row attack question per shot. Who attacks first is the strongest sign of who wins the point.
4. Opening and ending carry the coaching, and up to 6 shots they cover the whole rally.
5. Effort follows how points end: about 2 taps for a serve point, about 8 for a long rally.

## Main trade-off
We give up the wing of pushes and blocks, the middle of long rallies, spin and every quality judgment. The score now rests on one tap per rally, protected by the set-break check. In return, every tag is a repeatable fact and no screen is a grid.
