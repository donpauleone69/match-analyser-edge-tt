# Tagging, third pass: plan

For Paul, 15 Nov 2026. Based on your notes of 3:44 PM on `proto-tagging-pass-2`, your answers of 3:54 PM and 4:16 PM, a read of the code at the head of `cursor/mvp-proto-shell-d372`, and a few measurements in the browser at phone sizes. Nothing has been changed in the proto.

## Decided

From your answers at 4:16 PM:

1. First attack is on the big button (item 5).
2. On short screens the big button is 64 high and rows stay 44 (item 7). Sizes are set once and used on every screen, not only Tag (item 14).
3. Miss reason is four words: Forced, Position, Technical, Misread. Strokes get a two way switch so only four or five show at a time (item 6). Where a row does not fit, options are cut or filtered, never shrunk or wrapped.

From your rulings at 4:36 PM: the switch reads Offensive and Defensive if that fits, otherwise Attack and Defend. Result keeps its six choices. Block is on both sides of the switch and is never the first attack (item 6).

From your answer at 4:19 PM: shots before the first attack are Defensive, the first attack is Offensive, each shot after starts the same as the one before (item 6).

From your answers at 3:54 PM: the serve review works backwards (item 9), a long gap is a hint only (item 9), Re-tap is a button again (item 4).

Open, not blocking:

- Which iPhone, and Safari or a home screen icon? It sets the height we build for (item 7).

## Not changed, you chose these

One bottom slot where the big button relabels in place. The 2 second idle close and its guard. 0.75x while tapping. Backspace is Back 5s between rallies and Undo during one. Finish at any score. The scoreboard shows the score before a saved rally while it is open. Lets are dropped. A rally starts 2 seconds before the serve contact. Each rally keeps the server and winner it was tagged with.

## Your notes, one by one

### 1. Rally simulator as its own thing

- You said: pull it out so it can grow into a tactics simulator and a replayer for tagged points.
- Today: it is one function that draws a scripted rally. It lives inside the video file of the tagger and reads the demo script, not tagged rallies.
- View: agree, and agree it is later. See Later for the first step.
- Change: none in this pass.

### 2. Shot timeline

- You said: no change. None planned.

### 3. Shot row

- You said: drop the "first tap was late" button. Move the star so the row is shots only and can scroll itself.
- Today: the row has a fixed Serve cell in front and the star behind. The star is Highlight rally (the show reel), nothing to do with the first attack. The row already scrolls itself to the shot you picked and to the next tap. It does not follow the shot on screen while a rally loops. At 390 wide it shows 5 whole shots.
- View: agree.
- Change: both end cells go. The row is shots only, shows 7 whole shots at 390 wide, and also follows the shot on screen when no shot is picked. The star moves onto the picture, top right under the clock, so it costs no height. What the Serve cell did moves to Add contact (item 4).

### 4. Action row

- You said: Undo really deletes the last contact, so name it that. Add contact could sit beside it.
- Today: Undo removes the last tap, while tapping and after the rally closes. After the close the tap before becomes the end shot and its result is asked again. The only way to add a contact is the Serve cell, which puts one 0.9 seconds before the first tap.
- View: agree. Add contact should cover a missed serve and a missed contact anywhere in the rally.
- Change:
  - The row reads: status, then two pairs of buttons. Let and Re-tap act on the whole rally. Delete last and Add contact act on one contact. Backspace still does Delete last.
  - Re-tap is back as a button, as you asked. It drops the taps, goes to 2.5 seconds before the serve and lets you tap the rally again, with Undo. It sits beside Let because both throw the taps away: Let carries on, Re-tap goes back. The Let message keeps Undo only.
  - To fit four buttons each is 56 wide with its label on two lines where needed. The status keeps about 125 at 390 wide. While tapping, Add contact is not offered and its place stays empty so nothing shifts.
  - Add contact works like tapping. Press it and the whole rally loops, starting 4 seconds before the first tap. The big button reads "Tap the missed contact". One press adds a contact at that moment (less 0.3 seconds for reaction, as taps do), then you are back where you were. Press Add contact again to cancel.
  - Where it lands: in time order among the taps. In front of shot 1 it becomes the serve. Shots after it move up one number and keep their wing and stroke. The first attack moves up with its shot. The hitters after it swap, so the winner may change, and a short message says so with Undo. If it lands after the old end shot, the result is asked again. It can then be nudged by 0.1 seconds like any shot.
  - Limit: a serve more than 4 seconds before the first tap is out of reach. Use Re-tap.
  - When editing a saved rally the same two buttons show. Delete rally moves down to the Trim line so it cannot be confused with Delete last.

### 5. First attack

- You said: it can be picked in two places, and it pushes the shot details down. Maybe the "Pick the first attack" label is the button, then that shot loops so you can confirm it or move it.
- Today: it can be picked in the First attack row inside the details area, by tapping a shot on the shot row during that step, and by keys 1 to 9 (0 is No attack). On a two shot rally the stroke decides it and nothing is asked. The First attack row also stays above the shot's wing and stroke, which is the push down you saw.
- View: agree with your idea, with one change. The label is 220 wide today and would be about 125 once the row has its four buttons, which is a poor target. The big button is free at this step (Save is not lit yet), is where your thumb is, and pressing when you see it is the gesture you already use for contacts. Your extra press also goes away: answering wing and stroke is the confirm.
- Change:
  - The First attack row is removed from the details area.
  - At the pick step the whole rally loops and the big button reads "First attack". Press it when you see the attack. The shot on screen at that moment is picked (never the serve).
  - That shot then loops and its wing and stroke are asked. The shot row shows where it landed. Tap the shot before or after to move it.
  - The details area at the pick step holds one row: No attack.
  - Once a rally is ready, its summary line reads "First attack: shot 3" with Change, which goes back to the same pick step. One way in, one way to change.
- Decided: the big button.

### 6. Shot details box

- You said: wing on its own row. Stroke on one row at iPhone width with no wrapping. Shot time should not be at the top. Then at 4:16 PM: if it does not fit there are too many options, so cut or filter. Miss reason down to four. Strokes split into attacking and defensive with a switch at the start of the row, picked for you, in two colours.
- Today, measured at 390 wide on an end shot: Result wraps to two lines, wing and stroke share a row that wraps to three, and the box is 626 high in a space of 315, so it scrolls. Shot time is the first row. An end shot offers eight strokes, a reply seven, a first attack four.
- View: agree. The switch fits the code well: a first attack can only be an attacking stroke, and on a two shot rally the stroke already decides whether there was an attack. One thing does not hold up as written: the order of the steps, which makes the app guess on the end shot (below).
- Rows, in this order, one line each: Result (end shot only), Wing (BH, FH, Pivot), Stroke, the extras for that kind of shot, Miss reason when asked, and last a row with Review and the shot time. Rows are equal cells across the width. The small headings go.
- The stroke row: the switch, then the strokes. Offensive: Block, Flick, Loop, Drive, Smash. Defensive: Block, Lob, Push, Chop. Block is on both sides, as you ruled, and sits in the same cell on both so it does not move when the switch flips. The switch is always filled, one colour for Offensive and another for Defensive, so it reads as a switch and not as on or off.
- The words on the switch: Offensive and Defensive if both fit at 375 wide with no wrapping and no smaller text. Otherwise Attack and Defend. The builder measures.
- Block is never the first attack. On the first attack shot it is not offered (four strokes, switch fixed). A shot tagged Block cannot be picked as the first attack. On a two shot rally a Block means No attack, as today, whichever side the switch is on.
- Block has no side of its own. A shot tagged Block shows the side the rule gives it, and the shot after it follows the same. Nothing new is stored.
- What the switch starts on. Your rule of 4:19 PM: every shot before the first attack is Defensive, the first attack is Offensive, and each shot after it starts the same as the shot before.
  - Serve: no stroke row, no switch.
  - Before the first attack: Defensive, fixed. No stroke is asked on these today and none is added.
  - First attack: Offensive, fixed. Block is not offered.
  - After the first attack: the same side as the shot before it. With nothing else tagged that is Offensive, right through to the end shot. Lob, Push or Chop on the way turns the shots after it to Defensive. Flick, Loop, Drive or Smash turns them back. Block changes nothing.
  - A rally with No attack: every shot is Defensive, the end shot included.
  - Once a stroke other than Block is in, the switch shows the side that stroke is on.
- Where the code gets in the way of the rule, two places:
  - The end shot's stroke is asked before the first attack, so at that step the app does not yet know if there was one. On that step only it has to guess which way your rule will fall: Offensive when the result is Winner or the rally has three shots or more, Defensive otherwise (shot 2 that is not a winner). You flip it when wrong. Opened again later, with the first attack known, the rule is exact. Asking the first attack first would remove the guess, but that changes the order of your steps, so it is not in this pass.
  - Stroke is not only asked on the first attack and the end shot. Shots after the first attack already offer it as an optional detail, so "same as the shot before" is in use from the start.
- Two filters keep what is entered in line with your rule. Today the code allows both contradictions.
  - If the end shot is tagged Flick, Loop, Drive or Smash, No attack is not offered at the pick step.
  - If the end shot is tagged Block, Lob, Push or Chop, it cannot be picked as the first attack.
- The shot straight after a first attack is most often a block. With Block on both sides, "same as the shot before" no longer costs a press there.
- Flipping the switch clears the stroke on that shot, because it cannot belong to the other side. Block is the exception: it is on both sides, so it stays. If a cleared stroke was needed for Save, Save goes dark until one is picked. On a two shot rally the first attack answer is cleared with it and decided again by the new stroke.
- Keys follow the row, left to right: Z flips the switch, X is Block, C V B N are the other strokes on that side. M and comma are freed.
- Miss reason: Forced, Position, Technical, Misread. Timing and Footwork go.
- Cell widths at 375, all 44 high and at full text size: Result six of 53, Miss reason four of 81, serve spin and depth six of 53, first attack contact and intent four of 81. The stroke row is the switch plus five strokes. As six equal cells each is 53, which holds Attack or Defend but not Offensive (nine letters). With the switch at about 76 the five strokes get about 48 each, which is the tightest cell in the box. The Defensive side uses the same cells and leaves the last one empty, and the first attack leaves the Block cell empty, so nothing moves under the thumb.
- Rows still at the limit, said plainly: the stroke row with the long words (above), Result (six, kept as you ruled, "Winner" is the widest word) and the first attack row ("Aggressive" in 81). If the stroke row fails its check the words become Attack and Defend. If either of the other two fails, the fix is a shorter word, not smaller text.
- The most rows a shot ever needs is still six (an end shot that is an error marked Review). Any other shot needs four at most, a serve three. Miss reason cannot share the Review row: "Technical" does not fit a cell of 64.

### 7. No scrolling, picture size, two columns

- You said: everything down to shot entry should fit one iPhone screen with no scrolling. Work out the space and the most rows. The picture is 16:9 at phone width. On a wide screen it should snap to picture left, entry right, not keep growing.
- Today, measured. The picture is already 16:9 at full width. Fixed parts at 390 wide: header 44, picture 219, timeline 44, shot row and action row 125, big button and its padding 97. Total 529. That leaves the details 315 at 390 x 844 and 146 at 375 x 667. Two columns already exist but only from 1024 wide. Below that the picture is full width with no limit. In a 1000 x 700 window it is 563 high and the big button is off the bottom of the screen.
- View: agree. One catch: 844 is the whole glass. Inside Safari with its bars showing the page gets about 664 on that phone, close to the small phone. From a home screen icon it gets about 763. These two figures need checking on your phone.
- Change:
  - Six rows need 310. At 390 x 844 that fits in 315 with the big button at 80. Nothing scrolls.
  - Decided: on a screen under 700 high the big button is 64 and rows stay 44.
  - On short screens six rows cannot fit at any sensible button height. Three rows fit: at 375 x 667 with the button at 64 the space is 162 and three rows need 160. So the rule is: the box shows six rows when it has 310 of height, otherwise three. Result, Wing and Stroke are always the first three, so the normal path never needs more. The other rows sit behind a More button in the box. A press, not a scroll.
  - Inside Safari with its bars showing (about 664) the space is 151 with the button at 64, 9 short of three rows. Rows stay 44 as decided, so the 9 comes off the gaps and padding of the box there. This is why the iPhone question matters.
  - At Ready the list of one line per shot (which scrolls on a long rally) becomes one summary line. The shot row is how you open a shot.
  - Two columns start when the screen is wider than it is tall and at least 700 wide, so an iPad or a window in landscape gets picture left, entry right. At 1000 x 700 that leaves the entry side room for all six rows. In one column the picture is never more than 45% of the screen height.
  - A phone on its side gets two columns as well. That is better than today, where the picture alone is taller than the screen, but it is not a target of this pass.

### 8. Greying of the details box

- You said: is the grey while a shot loads lag or design? If design, it should not do that.
- Today: design, not lag. Every time the box changes what it asks, it dims and ignores presses for 0.6 seconds. Measured: dim at 0.06 and 0.36 seconds after opening a shot, clear by 0.86. Nothing is loading.
- View: agree it should go. It was there so a late press could not land on a chip that had just appeared. With fixed rows chips no longer move under the thumb.
- Change: no dimming and no ignored presses when you open a shot or move between steps. The guard after the 2 second close stays, as you chose.

### 9. Serve order, Review serves, and Add in the Rallies list

- You said: the mark points at one rally, but the order could have gone wrong earlier. The Add button is unclear and you cannot know where to add without the video. Then at 3:54 PM: a review of servers that works backwards until it finds the error, where you see a serve and it moves on as soon as you press who served.
- Today: the app proposes the server and follows what was tagged. A rally is marked only when its server differs from the one proposed, which means you pressed Switch there (or an add or delete moved the order under it). So the mark sits where you noticed, not where it went wrong. Example: skip a rally, tag three more on the app's word, switch on the fourth. The mark is on the fourth, the hole is three rallies before it, and one of the rallies between has the wrong hitters and winner. Add shows an empty place in every gap of the list with no video.
- View: agree, and your backwards review is better than what this plan had first, which stepped forwards through every gap and serve. Tested against the serve rule it holds. Three things came out of the test:
  - A press on who served can only correct a rally tagged with the wrong server. It cannot put back a missing rally, and a missing rally is the usual cause. What the presses do is pin the missing rally down to two gaps.
  - One serve that fits is not proof. After a missing rally the app's proposals are right every other rally by luck. Two in a row that fit is proof.
  - So the review shows serves only. A serve takes about 1.5 seconds and a gap can be 20. Gaps come at the end, two at most.
- The rule, exactly:
  1. The order is known good at: the start of the set, any rally whose server you chose or confirmed (Switch, or a press in Review serves), and any band you chose to leave.
  2. A break is a rally whose server is not the one due (as today).
  3. The stretch for a break runs from the rally after the last known good one before it, up to and including the break. One new thing is stored per rally for this: that its server was checked.
  4. The Rallies list shows the stretch as one band with one line: "Serve order out between rally 4 and rally 9", with Review serves and Leave it. No single rally is blamed. A stretch of one rally reads "Serve order changed at rally 7".
  5. Review serves starts at the break and steps backwards, one rally at a time. Each step plays that rally's serve, from 1 second before the contact to half a second after, and asks who served. The big button names the server as tagged ("Sam served"). The button beside it, where Switch server sits, says the other player ("No, You"). The next serve plays as soon as you press.
  6. What a press does. Same as tagged: nothing changes, and the rally is noted as checked. The other player: that rally's players are swapped (server, hitters, winner). Only that rally changes. No other rally is rewritten. The score is counted again from the winners, as always.
  7. After each press the set is checked again. The review stops when no break is left (it was a wrong server and is now right), or when the last two serves you were shown both fit the order (it has passed the place it went wrong), or when it reaches a known good rally or the start of the set.
  8. If a break is left, it now sits just after a rally that is the only serve of its turn. The missing rally is in the gap before that rally or the gap after it. The review plays those two gaps at 2x, the longer first, with Add rally, Add point and Next. If neither holds a rally the players served out of order in the match: Leave it.
- The example above under this rule: five presses, one rally swapped, and the first gap shown holds the missing rally. A switch pressed by mistake is put right in one press.
- Add in the Rallies list is replaced by Check gaps. It plays the gaps between saved rallies at 2x, longest first, with Add rally, Add point and Next. Stop when you like.
- Long gaps, from your answer: a gap is a hint, never an error. It shows as a quiet line in the list ("14s before this rally") with Check, which plays that one gap. It is not in warning colour and not in the count on the Rallies button. Next clears it. The line stays at 9 seconds, held as one number in one place so it is easy to change once you have used it.
- Of the fixes at a mark today, Add rally and Add point move into the gap step, Swap players becomes the press in Review serves, and Leave it stays on the band.

### 10. Switch does not show the change when editing

- You said: changing the server on a saved rally works, but the Switch button does not toggle.
- Today: a real bug. The press does change the rally. The scoreboard on the picture went from "You serve" to "Sam serves" in my check, while the Switch button kept showing the server of the next live rally. It was wrong before the press too.
- Change: when a saved rally is open the button shows that rally's server.

### 11. Loop while answering

- You said: keep replaying the shot until it is tagged. It goes back to the whole rally after a bit. Start earlier and run longer, maybe shot before to shot after, but it must be clear which shot is being tagged. A set length might be better.
- Today: while the result is asked the loop is the whole rally. It starts 1 second before the last contact, plays to the end, then wraps to the start of the rally, which is what you saw. Measured on a four shot rally: the last second, then all 5.5 seconds of the rally, about 7 seconds on the clock. Once the result is in, the end shot loops from 0.2 seconds before its contact to 1 second after: 1.2 seconds. The first attack shot loops from 0.2 before to the next contact, about 1.0 to 1.3 seconds in the demo. The pick step and Ready loop the whole rally. All at 0.75x.
- View: agree. Both of your instincts, combined: neighbours as the window, with a floor.
- Change:
  - While a shot is being asked about, only that shot loops, from the result until its wing and stroke are in.
  - Window: from the contact before to the contact after, never less than 1.2 seconds before the shot and 1.0 after, never more than 2.0 either side, never outside the rally. The serve starts at the rally start. The end shot runs to the rally end. A 0.3 second hold on the last frame before it repeats.
  - That gives 2.2 to 4 seconds of video per loop, against about 1.2 today.
  - The tagged shot is marked three ways: its cell is ringed on the shot row, the moving marker passes through its neighbours, and at its contact a badge with the shot number in the hitter's colour shows on the picture for 0.4 seconds. The other contacts in the window get no badge.
  - The whole rally loops only at the pick first attack step, where you have to see the rally to find it, and at Ready as the look before Save.

### 12. Big button: Switch server, and a warning

- You said: say "Switch server", not "You Switch". Maybe warn when a switch puts the order out. You like the colours.
- Today: the button shows the server's name with "Switch" under it. The app's proposal is the serve order, so every switch after the first rally of a set makes the server differ from the one due.
- View: agree on the label. The warning cannot be for some switches only. It is a line that shows whenever the chosen server is not the one due.
- Change: the button reads the name, then "Switch server". Colours stay. While the chosen server is not the one due, the line above the big button reads "Sam was due to serve. Rallies since rally 4 will be marked to check." It does not block, and it goes when you switch back.

### 13. Saved status on the Tag page

- You said: back on the Tag page it is not clear your work was saved. A status under Continue set would help.
- Today: the button says only "Continue set 2". The set's own card further down does show score and rally count, without the word saved and without where you stopped.
- View: agree.
- Change: one line under the button: "Saved · Set 2 · 7 rallies · 4 - 3 · stopped at 12:40", plus "1 rally open" when one is.

### 14. Sizes set once, for the whole proto

- You said: when a size changes, such as button height, keep it consistent across the app. A change to one is a change to all that share the principle.
- Today: sizes are written by hand on each screen. The main button is 80 in the Tag set screen, 48 for Finish set, 44 for Continue set and 36 on sign in. Small buttons are 26 on Home and in lists, which is too small for a thumb. The back button is 44 on the set screen and 32 on other pages. Phone sizes switch to mouse sizes at 1024 wide in Tag and at 768 elsewhere, so an iPad in landscape gets mouse sized chips (32) under a finger.
- View: agree, and it matters more once two columns start at 700 wide.
- Change: three kinds of button, set in one place, and screens stop setting heights themselves.

| Kind | What it covers | Finger, screen 700 high or more | Finger, under 700 | Mouse |
|---|---|---|---|---|
| Tap pad | The Tag slot: the big button and Switch server beside it | 80 | 64 | 80 |
| Main button | The one main action of a page: Continue set, Start set, Finish set, Finish match, sign in | 48 | 48 | 44 |
| Everything else | Chips, row buttons, shot cells, back, tabs, list buttons | 44 | 44 | 36 |

- Finger or mouse is decided by the device (touch or pointer), not by screen width. Layout is decided by screen shape (item 7).
- Screens this touches: Sign in, Home, Find, Match header and tabs, Match Details, the Tag page, the Tag set screen (slot, action row, shot row, details box, Rallies list, picture controls, answer key), Insights (both scopes, filter), Account, the bottom bar and the back button.

## Your answers to the three open questions

1. Serve order mark. You said: review servers backwards until the error is found, moving on as soon as you press who served. That is now item 9.
2. The 9 second line. You said: gaps are not reliable, mark them anyway, tweak once built. So a long gap is a hint only, at 9 seconds, easy to change (item 9). This plan first proposed a line worked out from each set's usual gap. Dropped.
3. Re-tap. You said: yes, bring it back. It is a button beside Let (item 4). This plan first said no. Overturned.

## Later

- Rally simulator as its own module. Smallest first step: one function that turns saved rallies into the script the picture already plays. Times, hitters, result and first attack come straight from the tags. Where the ball is hit and where it lands are not tagged, and wing and stroke are only tagged on two shots, so those are filled in from wing and result with a plain default. That gives replay of tagged points. Then: move it out of the tagger's video file, the audit screen with real video above and the generated one below, and the live side by side view.
- Lets and serve faults in the demo video (carried over).
- Keep lets in the list as rows with no score (carried over).

## How it will be built

The daytime loop from the pass 2 process report.

1. Slices are built side by side. Each is bounded to 45 minutes, reports at a checkpoint part way, and is proven by its fast checks below.
2. Each slice goes to you with its own tag as it lands. You do not wait for the rest.
3. While you look: an independent review, a naive user pass and targeted proof run at the same time.
4. One sorted list, one fix round of at most 30 minutes, then the whole match is run once and tagged.

Before: tag `proto-tagging-pass-2` at `28babd5`. The branch head is one commit past it (`fa3f2db`, captions).

First, two small mechanical items the slices lean on:

- Speed switch, for tests only. The browser suites play the demo video in real time, which is where pass 2 lost over an hour. The switch runs the video clock, and the timers measured against it, at 4x. It is off unless a test turns it on. Suites that must stay at normal speed: anything that proves the 2 second close, the guards after it, the late tap, how close a tap lands to its contact, and 0.75x while tapping. The whole match run at the end is also at normal speed.
- The three button kinds of item 14, defined in one place. No screen changes yet.

Slices, side by side:

| Slice | Items | Kind | Where |
|---|---|---|---|
| A | 9: serve order, Review serves, Check gaps, gap hints | Hard logic | Serve order rules, Rallies list, the review |
| B | 4: Delete last, Add contact, Re-tap | Hard logic | Rally rules, action row |
| C | 11, 5, 3: loop, first attack on the big button, shot row | Well specified build | Step and loop code, shot row |
| D | 6: details rows, Offensive and Defensive switch, Miss reason, keys | Well specified build | Details box, stroke lists, keys |
| E | 10, 12, 13, 8, star on the picture | Mechanical | Small edits in several files |
| G | 14 on every screen outside Tag | Mechanical | Sign in, Home, Find, Match, Insights, Account, nav |

Then, once A to E are in:

| Slice | Items | Kind | Where |
|---|---|---|---|
| F | 7 and 14 inside Tag: heights, three or six rows, two columns | Well specified build | The set screen layout |

A and B are built by a different model from the one that wrote this plan. Their rules are written out as exact cases (the rallies going in, the press, the result expected) with the team, ready to become script checks. B, C and E all edit the set screen file, in different parts, so they merge in the order they land. F goes last because the layout sits in that same file.

Fast check for each:

| Item | Proves it |
|---|---|
| 3 | At 390 wide the row holds only shot cells, 7 whole ones, and the picked shot is in view on a 12 shot rally. |
| 4 | Six cases on the rule alone: add in front, in the middle, after the end; first attack moves; winner flips; Undo puts it back. Then one late first tap fixed in the browser in two presses. At 375 wide the four buttons show whole labels, and Re-tap lands 2.5 seconds before the serve. |
| 5 | Press when shot 4 is on screen: first attack is 4. Tap cell 3: it is 3. The top of the details box is at the same pixel before and after. |
| 6 | At 375 wide no row is taller than 44, no cell is narrower than 44 and no label is cut off, for a serve, a first attack and an end shot error marked Review. The switch starts on the side the rule says for each kind of shot, is fixed before and on the first attack, flipping it clears any stroke but Block, and Z X C V B N work. Block is missing on the first attack shot and a Block shot cannot be picked as the first attack. No attack is not offered after Flick, Loop, Drive or Smash on the end shot. The switch words and all five strokes show whole at 375, or the words are Attack and Defend. |
| 7 | The details box content height equals its own height at 390 x 844, 375 x 667, 390 x 664, 768 x 1024 and 1000 x 700, on the worst case shot. Two columns at 1000 x 700, with the big button on screen. |
| 8 | 0.1 seconds after opening a shot the box is not dimmed and a press lands. |
| 9 | The rule run on six cases: a skipped first serve and a skipped second serve, each noticed at once and noticed three rallies late, a switch pressed by mistake, a real out of order serve. For each: the presses needed, the one rally that changed if any, and the two gaps named. Then in the browser: skip a rally, tag three, switch. One band, five presses, one rally swapped, the first gap shown holds the rally, the score ends true. A long gap shows as a hint and is not counted. |
| 10 | Open a saved rally, press Switch server: the button and the scoreboard name the same server. |
| 11 | Read the video time for 10 seconds at each step: it never leaves the window. Window ends match the rule for one sample rally. |
| 12 | Switch away: the line shows. Switch back: it goes. |
| 13 | Save two rallies, go back: the line shows set, rallies, score and time. |
| 14 | One script visits every screen at 390 x 844, 375 x 667 and with a mouse, and lists every button with its height. Each height is one from the table. An iPad in landscape gets finger sizes. |
| Speed switch | The same suite passes at 1x and at 4x, and the 4x run takes under a third of the time. With the switch off nothing in the app differs. |

Measurements and the code references behind each "Today" line are with the team.
