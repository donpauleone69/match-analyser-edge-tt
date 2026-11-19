# Tagging, next pass: plan

For Paul, 15 Nov 2026. Based on your seven notes, a check of each one on desktop and phone size, two full sets tagged on phone size with mistakes made on purpose, and your answers of 15 Nov. Nothing has been changed in the proto yet.

Sizes: small is one part of the screen. Medium is a few parts or one rule. Large touches how rallies are stored and how the video is fenced.

## Where you were right

- Extra tap (note 1). Undo works while you tap, then disappears the moment the rally closes, which is when you notice. A full re-tap cost about 9 seconds each time.
- Active shot (note 2). Nothing on the shot row follows the video while the rally loops.
- Lost after Save (note 5). On the phone nothing says what was just saved, who won it, or how much video is left.
- Add a rally (note 6). This is the biggest gap. I skipped one rally on purpose: the next three were saved with the wrong server and the wrong winner, and the set reached 11 - 3 when the truth was 9 - 6. Repair meant deleting three good rallies and tagging four again.
- Missed serve and lets (note 7). A late first tap gives the point to the wrong player with no warning. A let has no button.

## Where the proto already does it

- The shot row does auto scroll (note 3). The thing you disliked is the browser's own scrollbar, which we can hide.
- Start and End do work (note 4). They trim where the rally starts and ends for looping and reels. They just look like labels.
- Going back for a missed serve (note 7). Back 10 on the video does it, and the big button starts a rally at any moment. Both are easy to miss.
- Picking up later (note 5). Home and the match page both offer "Continue set". The demo forgets on reload, the real app will not.

## Decided

- Lets are dropped, not counted.
- A rally starts 2 seconds before the serve contact (the contact does not include the ball toss or the routine before it).
- Everything below is built in one pass once the plan is set.

## Server and continuity

Real matches have mistakes: a point given to the wrong player, a score called wrong, four serves in a row. The app does not try to handle each case. It keeps what was tagged, checks it, and marks what does not add up.

- What you tagged stays. Each rally keeps its own server and winner. Adding or deleting a rally never changes another rally.
- The score is always added up from the winners, in video order.
- While tagging, the big button names the server ("Tap serve · Sam") with a Switch beside it. One press swaps the server for that rally.
- After a switch the app follows what you tagged, not the score. The next expected server carries on from the switched one as a new turn of two (one each from 10 - 10). One switch puts you back in step.
- Continuity check. The set is walked in order and marked where:
  - the serve order stops matching the score (only the first break in a run is marked),
  - there is a long gap between two rallies,
  - the tagged score differs from the set score entered in Details.
- At a mark, four fixes: Add rally here, Add point (no video, just who won), Swap players on this rally (flips server, hitters and winner), Leave it.
- No general server switching in the Rallies list. Swap players is offered only on a marked rally.

## Must

1. Undo tap after the rally closes. Same button, same place as while tapping. The tap before becomes the end shot. Small.
2. Add rally. From the Rallies list, between two saved rallies, or from a continuity mark. The video goes to that gap and you tag as normal. No other rally is changed; the score is added up again and the continuity check runs. Large.
3. Restore a deleted rally. It stays in the list crossed out, with Restore, until the set is finished. Small.
4. Where am I. One line above the big button after every Save and on resume: set, score, who serves next, rallies saved, video left. Plus a card for the rally just saved (who won, how) with Edit. Small to medium.
5. Let. One press while tapping or after. Drops the taps, no point, the video carries on. Small.
6. Back 5s between rallies, in the same place as Undo, so that spot always means "go back". Small.

## Should

7. Add serve. When the first tap was late, one press puts the serve in front so the count and the winner come right without a re-tap. Small to medium.
8. Active shot marker. The shot on screen is marked on the shot row while the rally loops and when reviewing a saved rally. Small.
9. Tidy the shot row. Hide the scrollbar, stop the row changing width when the rally closes, move Start and End off the row into a Trim line when editing a saved rally. Small.
10. Switch server while tagging, as described under Server and continuity. Small to medium.
12. Demo video shows more. Ball turns red on an attack, a dot where it bounces, clearer net, long and wide, a winner that bounces before it passes the bat. Medium.
13. Answer key. A switch that compares what was tagged with what the demo really played, per rally: taps, result, wing, stroke, first attack, timing. Gives you and the agents a score. Medium.
14. Add a point with no video, for a point the camera missed or one you do not want to go back for. Medium. (Moved up: a continuity fix.)
15. Continuity marks in the Rallies list: serve order breaks and long gaps. Small to medium. (Moved up.)
17. Mark when the tagged score differs from the set score entered in Details. Small. (Moved up.)

## Later

16. Lets and serve faults in the demo video, so 5 and 7 can be practised. Small.
18. Keep lets in the list as rows with no score. Medium.

## Out

11. Pick the result without waiting. Paul tried it in an earlier build: the game is too fast to have the headspace for it while tapping. The 2 second close stays as it is.

Plan agreed by Paul on 15 Nov 2026, including Swap players on marked rallies.

## How it will be built

- Before: tag `proto-tagging-pass-1` at `11b00d2`. After: the head of `cursor/mvp-proto-shell-d372`.
- Two builders in parallel on separate files: the set view and rally data (items 1 to 10, 14, 15, 17), and the demo video with the answer key (items 12 and 13).
- One independent review that includes a naive user pass, at most two fix rounds, then one summary.

Full findings, measurements and screenshots are with the team if you want the detail.
