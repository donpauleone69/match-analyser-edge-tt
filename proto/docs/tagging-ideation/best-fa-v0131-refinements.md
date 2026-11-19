# Best + FA v0.13.1 refinements

Tagged v0.13.1 (commit 8d1307c) in the proto, as a tagger, at 393x660 touch and 1440x912 mouse. No code was changed.

On the phone: an ace, a 3-shot winner, a 6-contact mismatch (More open, then Delete last, then the toss offer), a 10-shot rally with Who attacked first? and a trip back to change Receive, a 2-shot, and an 8-shot where Third read Counter. Then short points through 11-7, Finish set, and the first rally of set 2. One part was marked for review, one rally was starred, and one 1-shot mismatch was kept as is.

On the desktop: the same mismatch with More open. Tapping the other Point to name cleared the line and showed the last stroke. Nothing scrolled at either size, and there were no page errors.

The last review's fixes held. After the last answer the video plays on at 1x. Nobody is offered on a winner. During a mismatch the chosen name stays filled and the hint is a dashed edge. A second tap 300ms later does not answer the question that just appeared.

Screenshots: [Tap serve](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/best-v0131-refine/01-tap-serve-phone.png), [set finished](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/best-v0131-refine/02-set-finished-phone.png), [toss offer](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/best-v0131-refine/03-toss-offer-phone.png), [desktop mismatch](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/best-v0131-refine/04-mismatch-desktop.png).

## 1. A quick next answer does nothing, with no sign

**Clear, low-risk win:** dim the new question for the wait. Shortening the wait is the follow-up.

**Problem.** On a 4-shot rally at real speed, Receive was answered and Third was on screen. A tap on Third at 180ms did nothing, and so did one at 300ms. Shot 3 stayed blank. The same tap at 450ms tagged Third and saved the rally. The buttons look ready the whole time. Best is the one flow that skips the dim the rest of the screen already uses while a tap is being ignored, so a miss feels like a broken button. A 10-shot rally has about eight of these waits.

**Change.** Dim the question area for the wait, the same way the screen already dims anywhere else. Then try 250ms. That is over a double tap and under a deliberate next answer. 300ms is a normal next tap once the answer is obvious, such as BH Control after BH Control.

**Gain.** The rallies that feel sticky start to flow, and a tap that is too soon looks too soon.

**Effort.** Small. The dim is one condition. The shorter wait is the same constant.

**Risk.** The dim has almost none. A shorter wait can let a slow double tap answer the next question. Keep 450ms if a real double tap still gets through at 250ms, and ship the dim either way.

## 2. The next serve is ignored for a full second

**Clear, low-risk win.**

**Problem.** The last answer saves and the video plays on at 1x, with Tap serve up. At real speed a tap on it at 200ms, 400ms and 700ms added no contact. A tap at 1000ms started the next rally, and so did one at 1300ms. The serve you are watching can be inside that second. The contact is then late, or missing, and the later questions are about the wrong ball.

**Change.** Take a serve tap after about 250ms, the same window as a double tap. The saving answer and Tap serve share the white area, so a guard stays. A full second is the gap that loses the serve.

**Gain.** The next rally starts when the serve does. One less missed contact on every rally that follows quickly.

**Effort.** Small. One wait.

**Risk.** A slow second tap on the answer that just saved can become the first contact of the next rally. 250ms still covers the double tap this guard was added for. A contact that does land early is an ordinary 1-shot rally and can be deleted.

## 3. Tap serve never says who is serving

**Clear, low-risk win.**

**Problem.** Between rallies the big button reads Tap serve, and under it only Rally 2, live. The line under that is the score and the time left, such as 1-0 and 7:40 left. The server is a small dot on the picture. Every two points the server changes, and at 2-0 that was the moment Kim started. You find the name on the Serve question, which is after End and Point to, so a wrong server is already in the last shot.

**Change.** Put the name on the button: Tap serve, Kim. The other flows already do this. Best dropped the name.

**Gain.** The server change is in the control under the thumb. A wrong server gets switched before End is answered.

**Effort.** Small. One label.

**Risk.** A long player name can wrap inside the button. The button is tall, and the names in use are short.

## 4. Finish set stays after the set is finished

**Clear, low-risk win.**

**Problem.** At 11-7 the set-over line and Finish set / Not yet are right. Pressing Finish set leaves them there and adds a second row: Start set 2, Finish match, Sets. Finish set is still the large green button. Not yet is still beside it. Reopen set is the real way back, in the line above. The same stack is what a set change looks like on the phone. Set 2 itself was fine: 0-0, no point hint, no server switch, Kim serving.

**Change.** When the set is finished, clear the set-over line and the Finish set / Not yet row. Leave Start set 2 as the main button, with Sets beside it, and Reopen set where it is.

**Gain.** One obvious next step. A second tap cannot finish the set again or dismiss the score you just confirmed.

**Effort.** Small. Clear the set-over state inside Finish set.

**Risk.** Low. Not yet is how you refuse the set-over prompt before you finish. After you have finished, Reopen set does that job.

## 5. Shot 1 the toss? appears after a correct Delete last

**Clear, low-risk win** for the colour and the button size. Showing it only for a close pair is the follow-up.

**Problem.** An extra contact at the end, Winner, the wrong Point to, then Delete last. The point agreed and the last stroke was asked. On Serve, under Short and Long, an amber line says Shot 1 the toss? with Delete first instead. That delete was an extra bounce at the end. Shot 1 was the serve. The amber line reads as the next thing to deal with, and Delete first instead is a smaller answer button (28px beside the 32px Short and Long). One tap there puts the extra contact back and deletes the real serve.

**Change.** Keep Short and Long as the only full answers. Draw the toss line in the ordinary text colour, and make Delete first instead the same height as the other answers if it stays a button. Then show the offer only when contact 1 and contact 2 are close enough to be a toss and a serve.

**Gain.** The common fix, an extra tap at the end, stops inviting a second delete. A real toss still has a way through.

**Effort.** Small for the colour and the height. Small again for the closeness check, once the gap is chosen.

**Risk.** The colour change has little risk. A closeness check can hide a real toss whose two taps were spaced like a normal receive. Pick the gap from a few real tosses before relying on it. Until then, the quieter line is enough.

## 6. On Who attacked first? four cells look like the open shot

**Problem.** On the 10-shot rally the shot 8 page offers You, Kim and Nobody, and the grid is labelled Shot 8. Cells 5, 6, 7 and 8 are all filled solid, the same mark as the question that is open. Cell 9 is dashed and 10 is done. The label carries the meaning the cells used to carry.

**Change.** Keep shot 8 solid. Leave 5, 6 and 7 dashed, and let the Rally part button show that the optional question covers them.

**Gain.** The grid is obviously about one shot. The part button still says which shots the optional question is about.

**Effort.** Small. One mark in the cell rule.

**Risk.** The solid rally cells were there so the coverage was visible. The part button has to stay obvious, which it is: it is the full width of those cells.

## 7. Check is on the row twice during a mismatch

**Problem.** The header has Check, and the fix row has Check again, between Delete first and More. Both are on screen together on the phone and on the desktop. The header one toggles and turns amber. The row one only turns the mode on, and it stays drawn as a resting button, so you cannot see that Check is on.

**Change.** Keep the header Check. Drop Check from the fix row, which becomes Delete last, Delete first, More.

**Gain.** One Check, and it shows when it is on. The fix row is three words and is easier to hit.

**Effort.** Small.

**Risk.** Check was placed third because a double tap in the middle is fixed from that row. The header Check does the same job and is on screen whenever the row is. Worth a look on the phone to be sure the header one is in thumb reach. It sits at the right of the rally header, above the cells.

## 8. The rally list can finish a set that is not over

**Problem.** The phone list at 3-1 shows Finish at 3-1 next to Check gaps. The handler finishes the set whenever the score is not level. It does not wait for 11 with two clear. The set-over buttons, which do wait, are a different path. I saw the button. The click I sent landed on a hidden copy of it, so I did not watch a short set actually end.

**Change.** Show Finish in the list only once the score is a finished set, the same rule as Finish set on the set-over row.

**Gain.** Opening the list to mark a part for review cannot end the set.

**Effort.** Small. One check on the button.

**Risk.** If a short practice set is meant to finish at 3-1, this removes that. The set-over path can grow a separate End set early control later, in words that say the score is short.

## 9. A one-cell part keeps the long word and shrinks it

**Problem.** On the 8-shot rally, shot 2 was the first attack, so Opening was cell 1 only, 40px wide. Marking it turned the button green and the word stayed Opening. The fitter tries the full word at 10px, then 9px, then 8px, and only then the short word. The full word wins by becoming the smallest type on the screen.

**Change.** If the full word does not fit at 10px, use the short word at 10px: Open, Att, Rally, End. Go smaller only after that.

**Gain.** The part name stays readable on a single shot. The green fill still shows the mark.

**Effort.** Small. Reorder the tries the fitter already has.

**Risk.** Open is less obvious than Opening the first time. It is the same short word the fitter already falls back to, used while it is still large enough to read.

## Left as they are

- Tapping the other Point to name fixes a wrong name in one tap, on the phone and on the desktop. Delete last stays the filled button for an extra contact at the end, which is the right shape for that mistake.
- Going back to a cell, changing the stroke, and landing on the next open question worked on the 10-shot rally.
- The review mark reached the list as Review End, and the star stayed pressed on the saved row.
- Third read Counter after an attack on shot 2. Shot 9 stayed Attack while shot 8 was a control.
- At 1440 the questions sit at the top of the right column, phone sized, with room below. The rally list is under the video. Nothing there needs a new size.
- The picture still has Timing, and the stand-in captions name the stroke (BH Lob, FH Chop). Both are for this proto. A filmed match has neither.
