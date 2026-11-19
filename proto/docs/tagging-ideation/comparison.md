# Tagging approaches compared

Six rebuilt models, then Paul's three live prototype flows from `proto-effort.md`. Each record uses the same fields. The prototype totals include one tap per contact. The six models start after the contacts are already marked, so their tap counts are question taps only.

Tour mix used for the tap check, from the brief, for 80 rallies: 9.6 end on the serve, 14.4 on the 2nd ball, 20.8 on the 3rd, 10.4 on the 4th, 8.8 on the 5th, 4.8 on the 6th, 3.2 on the 7th, and 8 on the 8th or later.

A two-axis grid means a block of buttons with rows and columns, such as a 3 by 2 pad. Paul dislikes that. A fixed-slot tag is one you can compare across rallies, so it has to be asked at the same shot or phase on every rally, or not at all.

None of the nine uses a two-axis button grid. All nine ask who won the point, or how the last ball ended, and build the score from that.

## Scan

| Approach | Model | Taps (claimed) | Time | Grid | Fixed slot | Rating |
|---|---|---|---|---|---|---|
| Rally Spine R3 | GPT | about 390 | 13 min | No | Breaks | 6 |
| Bookend r2 | GPT | 366 | 11 to 13 min | No | Holds | 8 |
| Opening and Ending r2 | Opus | about 395 | 15.4 min | No | Breaks in one place | 7 |
| Four taps r3 | Opus | 380 | 15.2 min | No | Breaks | 6 |
| Four Beats r2 | Fable | 272 | 10 min 22 sec | No | Breaks | 6 |
| Tag the point r2 | Grok | not stated | not stated | No | Breaks | 5 |
| Current | Live prototype | 823 | 18 to 22 min | No | Breaks | 5 |
| Shot by shot | Live prototype | 1079 | 22 to 28 min | No | Breaks | 4 |
| End first | Live prototype | 1079 | 22 to 28 min | No | Breaks | 4 |

## Rally Spine R3

**Name and model.** Rally Spine R3, GPT. Write-up: `clean-v2-gpt-r3.md`.

**Description.** A fast pass marks every point Winner, Net, Long or Wide. That tap sets the winner, the score and the next server. A second pass batches the serves. A third pass tags the receive, the last stroke, and, on longer points, the first pressure shot and the reply.

**User effort and mental load.** The result row is one easy choice. The later passes add a contact pick, a side and a stroke family, and on some errors the shot before the end. Short points stay light. Longer points ask you to find a contact in the rally. Three passes means you hold a mode in your head.

**Tap check.** Does not add up from the page. They use the tour mix and state about 390 touches: 80 for the result pass, about 50 for serves, and the rest in detail. They only publish averages for 1-shot (1.6), 2-shot (2.6), 3-shot (4.4) and past shot 7 (8.6). Shots 4, 5, 6 and 7 are missing, so 390 cannot be rebuilt. A 3-shot path that always asks result, receive, wing and family is 4 taps before the serve share. Their 4.4 is a little light for that path plus a share of 50 serve taps.

**How intuitive.** Medium. Winner, net, long or wide is obvious. The rules for what appears from shot 4 are not.

**Time.** 13 minutes claimed, about 9.8 seconds a rally. That is about 2 seconds a touch, which leaves little time to watch.

**Data value.** Strong on paper: serve profile, receive type, finishing stroke and wing, first pressure and the reply. The first-pressure tag sits on a different shot each rally, so those rows are hard to compare. Cause is only kept on longer errors.

**Canvas.** [Rally Spine R3](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/0a98b30e-3bd3-4d6f-af80-c77669020ddd)

**Rating.** 6. The score pass is sound, but the match total cannot be rebuilt and the first-pressure tag moves.

**Pros.**
- One tap builds the winner, the score and the server.
- One-shot points stay near two touches.
- Every control is a single row.

**Cons.**
- The 390 touches are not a sum you can check.
- First pressure, and the cause on long errors, are not on a fixed shot.
- The result pass has to stay in match order, then two more passes follow.

**Two-axis grid.** No.

**Fixed-slot rule.** Breaks. The receive and the finish are fixed phases. The first pressure contact is whichever shot it was, and the penultimate side and family are asked only on longer errors.

## Bookend r2

**Name and model.** Bookend r2, GPT. Write-up title: Consistent closing-pair tagging. File: `v3-gpt-r2.md`.

**Description.** Every rally, in order, you tag the last shot and the shot before it. The last shot gives landed, net or out, then wing, then stroke family. The shot before gives family and landing lane. The serve family is filled in when that shot is the serve.

**User effort and mental load.** Low. The same short rows every rally, and the video loops the contact you are answering. The family list is the longest row. A "same as last" tap is there when a family repeats. Nothing is pre-selected.

**Tap check.** Adds up on their mix. They assume an amateur split (8, 20, 23, 15, 11, 7, 5 and 11 percent). Six 1-shot rallies at 2 taps, sixteen 2-shot at 4, and 58 longer rallies at 5: 12 + 64 + 290 = 366. The sequence matches those rates: a 1-shot rally skips the serve family, a 2-shot rally skips the prior family because it is the serve, and both still ask the prior lane. On the tour mix the same rates give about 357 taps (9.6 x 2, plus 14.4 x 4, plus 56 x 5).

**How intuitive.** High. Every rally is the end, then the ball before it.

**Time.** 11 to 13 minutes with replay, about 9 minutes of tapping. About 1.5 seconds a tap while tapping, about 2 seconds once replay is included.

**Data value.** High for the last shot and the one before it, and the set of rallies behind each rate is stated. Weak on the serve and the receive once the rally is longer than two shots. No first-attack label and no serve length.

**Canvas.** [Bookend r2](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/9d99ad68-32ea-426b-b0fc-960bc49b3bc0)

**Rating.** 8. Same closing questions every rally, a total that adds up, and the lowest mental load.

**Pros.**
- Every compared tag sits on a fixed phase, and the write-up says which rallies are in the rate.
- The 366 taps match the sequence.
- Two or three short rows, no hunting.

**Cons.**
- After the opening you only know the last two contacts.
- About 360 taps is a lot for that narrow slice.
- The stroke-family row can still be a long strip.

**Two-axis grid.** No.

**Fixed-slot rule.** Holds. Outcome, wing and family are on every point. The prior ball is on every rally that has one.

## Opening and Ending r2

**Name and model.** Opening and Ending r2, Opus. File: `v3-opus-r2.md`.

**Description.** A score pass plays the last contact: Net, Missed table, or Landed, and a zone if it landed. A detail pass then asks serve length, and one attack row on shots 2 and 3 and on the last three shots. The row is forehand attack, backhand attack, or a third button whose label is Push or Block.

**User effort and mental load.** Low on each tap, because the attack row is always the same three buttons. You do watch the match twice. The changing third label takes a little trust. Long rallies add one extra "which shot" question when the attack sits in the untagged middle.

**Tap check.** Adds up. Their amateur table (13, 19, 24, 13, 10, 7, 5 and 9 percent, with 2.4 taps on a 1-shot rally and one more tap per extra shot until 7.7) sums to about 396 taps and 15.1 minutes. They state about 395 taps and 15.4 minutes. The extra 0.4 tap is the winner zone on about 40 percent of rallies. The +1 per shot matches shots 2 and 3 plus the last three, and the cap at 7.7 matches the long-rally rule. The tour mix with those same rates is about 398 taps and 15.2 minutes.

**How intuitive.** High. One look for the result, then the same attack question on a set of shots the app chooses.

**Time.** 15.4 minutes claimed, budget 16. The score pass is about 5 minutes. Tour mix is about 15.2 minutes using their seconds per length.

**Data value.** Good on serve length, who attacked the opening and the ending, and where winners land. Pushes and blocks have no wing. The first attack is inferred until the rally is long.

**Canvas.** [Opening and Ending r2](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/fb73e5f9-8657-40cd-a15f-abf10c7b6829)

**Rating.** 7. Fixed shots and a clean score pass, at about 16 minutes, with no wing on pushes and blocks.

**Pros.**
- The score pass alone can finish the match.
- The attack row stays on shots 2 and 3 and the last three.
- The length table matches the sequence.

**Cons.**
- About 16 minutes, at the slow end of this set.
- A push or a block does not record forehand or backhand.
- Rallies of 7 or more still ask which middle shot was the attack.

**Two-axis grid.** No. The old 2 by 3 pad is gone.

**Fixed-slot rule.** Breaks in one place. The attack row is on fixed shots. The extra first-attack pick is only there when that shot falls in the untagged middle of a long rally.

## Four taps r3

**Name and model.** Four taps r3, Opus. Write-up title: the last ball decides the point. File: `clean-v2-opus-r3.md`.

**Description.** Each rally plays once. You tap the screen when someone attacks, then point at where the last ball went, then choose backhand or forehand. If the rally continues after the attack, you say who was on top. A serve reel and a receive reel each take one point on a table picture. The end tap sets the winner.

**User effort and mental load.** Aiming at a picture is quick. The live attack tap is the hard part: you have to spot the attack while the rally plays. "Who was on top" (you, both, or the opponent) is a judgement. Wing is a simple pair.

**Tap check.** The headline does not match the table. Their amateur rows (8, 14, 19, 12, 9, 6, 4 and 8 rallies) sum to about 374 inputs and 14.4 minutes. They state 380 inputs and 15.2 minutes. Game checks, one server fix and rare exceptions can explain a handful of the extra inputs. They do not explain the full 48 seconds. The shape of the rows does match the sequence: 1.0 on a 1-shot rally (the end tap only), then a rise through the receive reel, then a flat line once the on-top tap is the only extra. On the tour mix those rates give about 365 inputs before match-level checks.

**How intuitive.** High for the last ball, because you point at where it went. Medium for the live attack tap, which you have to learn.

**Time.** 15.2 minutes claimed, budget 16, of which they say 6.4 minutes is watching. The seconds column itself sums to 14.4 minutes.

**Data value.** High on placement: the end, the serve and the receive are real spots, and length and lane are derived. Receive spots are missing when the point ends on the receive, so that rate leans toward receives that stayed in. Stroke names are inferred. "On top" is softer than a fact you can point at.

**Canvas.** [Four taps r3](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/d6d192ba-4e8a-4536-9d04-f394b337d2fe)

**Rating.** 6. The picture is fast to aim, but the headline sits above the table, and the receive is missing when the point ends there.

**Pros.**
- One end tap gives the winner and the miss type.
- A spot on the table stores more than a short or long button.
- Long rallies do not add a tap per shot.

**Cons.**
- 380 taps and 15.2 minutes are higher than the rows that are supposed to produce them.
- The receive reel starts at 3 shots, so receive errors and receive winners are left out.
- The live attack tap, and who was on top, take more judgement than a paused row.

**Two-axis grid.** No. You point at a plain table picture. The write-up says the picture has no lane lines, and the other buttons are single rows.

**Fixed-slot rule.** Breaks. The attack tap lands on whichever contact you touch. Who was on top is asked only after an attack the rally survived. The receive spot is skipped when the rally ends on the receive.

## Four Beats r2

**Name and model.** Four Beats r2, Fable. File: `v3-fable-r2.md`.

**Description.** Question 1 is always the result (In, Net, Off, or Ace and Fault on one shot). After that the app only asks about your serve, the first attack shot, the lane of their last good ball when you lose, and your wing when you hit last. Strokes are not asked. A rule fills them in: push before the attack, block just after, topspin from then on.

**User effort and mental load.** Low. Two or three buttons, and the result removes some of the later questions. The one search is picking which shot was the first attack. A 14-shot rally costs the same as a 4-shot one.

**Tap check.** The cases match the questions. Fault or their ace is 1 tap, they missed is 2, a clean winner is 3, you missed the receive is 3, you missed later is 4, and your serve adds 1. They state 272 taps on the tour mix, 265 on an amateur mix, and 266 on a generated match. An even win rate and an even serve split, using those same cases on the tour mix, comes to about 255 (result on all 80, first attack on the 70 rallies with a return, your serve length on about 37, your wing on about 35, their lane on about 30). 272 is above that, and a little above their own generated match. The 272 is not shown as a weighted sum.

**How intuitive.** High. The questions are in plain language. The inferred strokes are invisible, so the screen feels simpler than the data it stores.

**Time.** 10 minutes 22 seconds on the tour mix, of which 4 minutes 21 seconds is answering and 6 minutes 1 second is watching. Answering at that pace is about 1 second a tap. They call the step times estimates. Amateur mix: 9 minutes 43 seconds.

**Data value.** The score and the timing of the first attack are useful. Wing and lane exist only on some rallies. Serve length is only yours, and only when it landed. The stroke rule fails against a chopper, and there is no placement for the points you win.

**Canvas.** [Four Beats r2](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/6a90ecdf-a565-4314-ac3c-75d6668c88b1)

**Rating.** 6. The fastest pass, with tags that skip rallies and strokes that come from a rule.

**Pros.**
- One result tap already builds a score and a report.
- The buttons stay on one short row.
- A long rally costs the same as a 4-shot rally.

**Cons.**
- Serve length, wing and lane are missing on many rallies, so those rates have no full set behind them.
- The stored strokes are a push-then-topspin rule.
- 272 taps is higher than an even-match count of the same questions, and the weighting is not shown.

**Two-axis grid.** No.

**Fixed-slot rule.** Breaks. Detail is only asked about your balls and about points you lose. The first attack is a different shot on each rally.

## Tag the point r2

**Name and model.** Tag the point r2, Grok. File: `grok-r2.md`.

**Description.** The first row says whether the last hitter won the point or missed (net, long or wide). Then you pick which shot attacked first, tag serve length, sometimes your receive length, then the opener's stroke and wing, then the last shot's stroke and wing when it is a different contact. The only server you type is the first server of the match.

**User effort and mental load.** Medium to high, from branching rather than from a grid. Each row is short, but the path changes: receive length appears only in some cases, and the last stroke is skipped when it is the opener. A long rally can add a "Later" tap before the shot list. You can face eight taps, and you have to see why a question showed up.

**Tap check.** Does not add up, because no match total is stated. The worked examples do match the sequence: an ace is 2, a five-shot rally with your third ball is 7, and the same rally on their serve with a quiet receive is 8. Extending that pattern across the tour mix (aces at 2, every 2-shot rally at 5, a 3-shot rally at 5 or 6, and a longer rally at 7 or 8 when the third ball is the attack) comes to about 470 taps. Faults that skip serve length would take a few off. The write-up's "eight or fewer" cap is real for a single rally and still leaves the match total high, because many short rallies already cost 5 to 7.

**How intuitive.** Medium. The first question is plain. Later questions appear and disappear, so the rally does not feel the same twice.

**Time.** Not stated. About 470 taps is roughly 18 to 22 minutes if each tap takes about as long as in the models that published a time.

**Data value.** Useful core: serve length (including half-long), opener stroke and wing, last stroke and wing, and the score. Your receive length is missing when a stroke already described it. Their receive is never asked. After an attack, a chop or a lob is stored as a block.

**Canvas.** [Tag the point r2](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/7132457c-284c-4566-891b-34fd5666340a)

**Rating.** 5. The winner tap is right and the examples check out, but there is no match time and the later questions change by rally.

**Pros.**
- The first tap says whether the last ball won the point or missed.
- The ace and five-shot examples match the written steps.
- Stroke and wing are separate rows, not a grid.

**Cons.**
- No 80-rally tap total and no time.
- Receive length, the opener and the last stroke are not on a fixed shot every rally.
- The tour-mix extension is about 470 taps, the heaviest in this set.

**Two-axis grid.** No.

**Fixed-slot rule.** Breaks. The opener is whichever shot you pick. Receive length is skipped when the stroke already covers it, and only on your receive. The last stroke is skipped when that shot is the opener.

## Current

**Name and model.** Current, live prototype (`?flow=current`).

**Description.** You tap each contact on the pad, then say who won and pick the result (Winner, Lucky, Net, Long, Wide or Air). From 2 shots you add the last shot's stroke and wing. From 3 shots you watch the rally again and tap the first attack. If that shot is not the last one, you add its stroke and wing, then Save.

**User effort and mental load.** Medium. The pad is one tap a shot while the video plays. Who won is two buttons. The result row is six, the widest must-answer row. Stroke is four or five buttons, wing is two. Placing the first attack means a second look at the whole rally. Depth, intent and the other extras stay hidden, so they add no tap.

**Tap check.** Adds up. Whole-rally counts for the tour mix are 10, 14, 21, 10, 9, 5, 3 and 8 rallies, with the long ones counted as 10 shots. Contacts are 317. Later taps are 3, 5, 6, 8, 8, 8, 8 and 8, which sum to 506. Total 823. The steps match: a 1-shot rally is who won, result and Save; a 2-shot rally adds stroke and wing; from 3 shots the attack tap and, when the attack is not the last ball, its stroke and wing. If the last shot is the attack, the later taps stay at 6 from 3 shots up, which is 70 fewer than this mix. That 70 checks out.

**How intuitive.** Fairly high. Who won, how the ball ended, the finishing stroke, then point at the attack. The second full watch is the odd step.

**Time.** About 18 to 22 minutes. Contact time is about 5.3 minutes at 1 second a shot (317 shots). The 506 later taps take 8.4 to 12.7 minutes at 1 to 1.5 seconds. The 2 second pause before the first answer, plus the following second that still counts as a contact, is the 3 second wait: 4 minutes across 80 rallies. Watching the pad at 0.75 speed makes the contact pass about 7 minutes instead of 5.3.

**Data value.** Who won, a six-way result, the last stroke and wing, and the first attack shot with its stroke and wing when it is not the end. Nothing on depth, intent or the balls in between. The attack stroke is only as comparable as the shot you happened to tap.

**Canvas.** live prototype

**Rating.** 5. The totals add up, and it is still about 20 minutes, with a second watch to place the attack.

**Pros.**
- Who won and the result are on every rally.
- 823 taps match the length table and the steps.
- A one-shot rally stays at 4 taps, and later questions stop growing once the attack is placed.

**Cons.**
- About 18 to 22 minutes, and 4 of those are waiting before the first answer.
- From 3 shots you watch the rally again to place the attack.
- The attack stroke sits on whatever shot you pick.

**Two-axis grid.** No. Each question is one row. Wing is its own pair of buttons.

**Fixed-slot rule.** Breaks. The last shot's stroke and wing are a fixed phase from 2 shots up. The first attack, and its stroke, are whichever shot you tap.

## Shot by shot

**Name and model.** Shot by shot, live prototype (`?flow=sequential`).

**Description.** Same contact pad, then a walk: the serve, each shot until the attack is marked, then who won and the result, then the last shot. The two shots after the attack are stops. Anything later is skipped, apart from the last shot. Optional depth, intent and initiative are passed with Next and are not stored on this path.

**User effort and mental load.** High. You decide side, stroke and wing on the way to the attack, and you press Next through rows you are not filling. A reply can put side, stroke, wing and initiative on screen together, about 12 buttons, even when the tap is only Next. That is the heaviest glance in the three flows.

**Tap check.** Adds up, and it matches End first. Contacts 317. Later taps are 3, 7, 9, 12, 13, 13, 13 and 13, which sum to 762. Total 1079. The written steps match those later taps: a 2-shot rally is 7, a 3-shot rally is 9, a 4-shot rally adds the reply's stroke, wing and Next, and from 5 shots one extra Next passes the first reply while the rest stay flat. If the attack is the last shot, they say a 10-shot rally rises from 13 later taps to 16.

**How intuitive.** Medium. Walking shot by shot is clear. The Next buttons on rows you skip are easy to learn and easy to resent.

**Time.** About 22 to 28 minutes. Same 5.3 minutes of contacts and the same 4 minutes of waiting. The 762 later taps take 12.7 to 19.1 minutes. The clip holds 0.3 seconds at each stop, which fits inside the tap. Slowed playback adds about 2 minutes on the contacts.

**Data value.** Richer through the opening than Current: each shot up to the attack can keep a side, a stroke and a wing, and the last shot is always there. The counted path does not keep depth, intent or initiative. The middle of a long rally is still blank. On an error, miss reason is on screen while Save is already lit, so it is not in the 1079 unless you stop for it.

**Canvas.** live prototype

**Rating.** 4. The longest path: 1079 taps, and many of them only skip a row.

**Pros.**
- The receive and the third ball are real strokes, not a guess from one attack tap.
- After two replies, a longer rally adds no more questions.
- 1079 matches the length table and the step list.

**Cons.**
- About 22 to 28 minutes, the slowest of the nine.
- A large share of the taps are Next on depth, intent or initiative, and those answers are not kept.
- The reply screen can show about 12 buttons at once.

**Two-axis grid.** No. Side, stroke and wing are separate taps. On a reply they sit on screen together, which is a crowd, not a row-and-column grid.

**Fixed-slot rule.** Breaks. You tag shots only until the attack, then two replies, then the last shot. A stroke is not on the same shot in every rally.

## End first

**Name and model.** End first, live prototype (`?flow=endfirst`).

**Description.** The same questions as Shot by shot, in the same order: serve, shots until the attack, who won, result, last shot. The difference is the picture. Each clip holds for 1 second at the end before you answer. Shot by shot holds for 0.3 seconds.

**User effort and mental load.** High, and the same decisions as Shot by shot. The 1 second hold lets you see where the ball went. It fits inside a 1 to 1.5 second tap on most stops, and it adds time when you wait for the picture before you tap. The crowded reply screen is unchanged.

**Tap check.** Same as Shot by shot, and it adds up: 317 contacts, 762 later taps, 1079 in the match. Use that length table. The hold does not add a tap.

**How intuitive.** Medium. The hold shows the end of the shot you are tagging. The questions still start at the serve and walk forward, so the name is about the picture, not a result-first pass.

**Time.** About 22 to 28 minutes, the same band as Shot by shot. The 1 second hold adds time only when you wait it out. Slowed playback adds about 2 minutes on the contacts, same as the other two.

**Data value.** The same stored facts as Shot by shot. The opening up to the attack, the last shot, who won and the result. Passed rows stay empty. The middle of a long rally stays empty.

**Canvas.** live prototype

**Rating.** 4. The same 1079 taps as Shot by shot. The longer look at the end of each clip does not remove the Next taps.

**Pros.**
- You see where the ball finished before you answer that shot.
- The stored opening and the last shot match Shot by shot.
- A long rally still caps the questions after two replies.

**Cons.**
- Same 1079 taps and the same 22 to 28 minutes.
- The walk still starts at the serve. This is not a result-first pass.
- The attack is still a moving shot, and the reply screen is just as crowded.

**Two-axis grid.** No. Same rows as Shot by shot.

**Fixed-slot rule.** Breaks. Same pattern as Shot by shot: shots are tagged until the attack, not at a fixed shot on every rally.
