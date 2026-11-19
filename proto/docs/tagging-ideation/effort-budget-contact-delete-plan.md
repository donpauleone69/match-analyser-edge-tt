# Contact delete for Opening and Ending (effort-budget, Opus)

Plan only: no prototype or app code. The design canvas is updated to show the behaviour: [Rally tagging v3 r2](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/fb73e5f9-8657-40cd-a15f-abf10c7b6829). On the Tag tab, try the "Toss tapped" and "Double tap at end" rallies.

## 1. The control: the same as the prototype Rally Row (v0.11)
- **Check toggle** on the contact strip. When on, the rally plays at 0.5x and every chip shows a minus. When off, the strip is display only.
- Tapping a minus removes that contact and turns Check off. A **short Undo** then appears.
- No new screens and no new questions. A clean rally never shows any of it, so the happy-path budget (about 395 taps, 15.4 minutes) is unchanged. A fix costs 2 taps plus a 0.5x replay.
- If the prototype pattern changes (for example the Undo length, or a restore list), we follow it. The logic below does not depend on the screen.

## 2. Where the control appears
The strip is the same component everywhere, so Check is available in all three places:

| Place | Screen in this model | Typical error caught |
|---|---|---|
| During tapping | Contact marking (Part 1) rally row | Accidental extra tap, seen straight away |
| After commit | Score pass and detail pass strips | Toss tapped as contact 1, seen when the serve loops |
| End-of-rally winner screen | Score pass "Last ball (shot N, hit by X)" | Wrong hitter on the last ball, or a double tap at the end |

On the last-ball screen the hitter is always shown. The hint under the question reads "If the hitter is wrong, a contact is extra: tap Check."

## 3. What recomputes, and how this model handles each
The rule: tags belong to **contact ids, not shot numbers**. A removal keeps the contact's timestamp as a removed record, so Undo is exact. Everything else is derived again from the contacts that remain.

| Recomputed | How |
|---|---|
| Shot count | N becomes N minus 1. The rally length bucket, the phase (serve, receive or rally) and the tag window (shots 2 and 3 plus the last three) are rebuilt. Shots that newly enter the window join the detail pass. Tags on shots that leave it are kept but not used. |
| Hitter of every later shot | Worked out again from the server, so every later shot flips. Stroke tags stay on their physical contact, so "FH attack" still describes the same hit, now credited to the right player. If a stored Push, Block or Control is no longer possible after the new previous ball, it is asked again with "Re-check: the ball before changed". |
| Serve order | Unchanged inside the rally, because the server comes from the order of play, not the taps. It changes for later rallies only if this rally's winner flips at 10-10 or later. Set ends are anchored to the long gaps between sets in the timestamps, so a flip cannot silently move a set end. A clash with a set break raises the existing score check. |
| Winner | Worked out again from the last-ball tag (Net, Missed table or Landed) and the new last hitter. **Every removal flips who hit the last ball**, so with an unchanged last-ball tag the point always changes hands. That is correct when the removal fixes a real error. The winner's landing zone is cleared and asked again, because the half it landed on has changed. |
| Score | Recomputed from this rally onwards, including later rallies' score before, deuce serving, and the cards. |
| First attack | Stored by contact id and worked out again. If the removed contact was the first attack, it is derived or asked again. |

The Undo bar always states the consequence, for example: "Removed contact 1. Now 3 shots, last ball by you, point to you, 5-3. Undo."

## 4. Toss plus serve double tap
**What it looks like:** contacts 1 and 2 are both by the server, but the labels say contact 2 was hit by the receiver. Every later label is flipped.
- **1-shot ace:** the app thinks the receiver hit a winner, so the point goes the wrong way.
- **Longer rallies:** the last-ball hitter is wrong, so the point flips.

**How it is caught:**
- **At the start:** the detail pass loops the serve, so the marker on the toss is visible. Check, then remove contact 1. The next contact becomes the serve and the server stays the same.
- **At the end:** the last-ball label names the wrong player. Opening Check from that screen marks chip 1 "toss?", because a toss is the most common single extra tap. It is a suggestion only.

Timing cannot tell a toss apart. The gap from toss to contact looks like the gap from serve to receive.

## 5. Double tap anywhere
Two contacts closer than 0.2 s cannot both be hits, because no ball crosses the table that fast at club level. In Check mode that chip is pre-marked "0.12 s, too fast". It is still never removed automatically.

## 6. The alternating-error hint: sound, with two corrections
**Validation.** One extra tap anywhere flips the hitter of every later shot. So a single extra shows up at the end (wrong last hitter) wherever it sits. At the start it shows directly if it is a toss. Deleting at one end and checking the other is the right pairing, and the check is nearly free here because the detail pass already plays the serve.

**Rules built:**
1. **Delete at the end, check the start.** After a delete in the last two contacts, the opening shows a check line: "You removed a contact at the end. As the serve plays, check contact 1 is the serve and not the ball toss."
2. **Delete earlier, re-check the end.** After a delete before the last contact, once the last ball is tagged, the end shows: "The last ball is now by X and the point goes to Y (score). Glance at the last ball once."
3. **Hints suggest; they never delete.** One glance, no tap needed when the rally is fine.

**Disagreement 1: two extra taps do not fully cancel.** One at each end keeps the last hitter right, so the winner, score and serve order are safe. But the shot count is 2 too high and every shot between them has the wrong hitter. In this model that corrupts the opening tags (shots 2 and 3 would describe the serve and the receive) and the phase. They still need fixing. The score can't flag them, but rule 1 does, and so does the toss being visible in the serve loop.

**Disagreement 2: why rule 1 fires on every end delete.** If the end delete removed a genuinely spurious tap and the last hitter now matches the video, a single remaining extra at the start is impossible: it would flip the end again. So the start hint can be a false alarm. It is kept anyway for two reasons:
- The app can't tell a genuine fix from a user who removed a real contact to force the hitter to match while the toss is still there. That pair also keeps the end looking right.
- The check costs only a glance.

**Open point, not built:** a wrong hitter can also come from a **missing** contact (a hit not tapped). Delete cannot fix that, so the end hint says "check", not "delete". Adding a contact belongs to the prototype's Rally Row work, if it is wanted at all.

## 7. Undo
- **Short Undo, as in the prototype.** It restores the contact, its tags, the cleared zone, and every recomputed value (winner, score and later rallies) in one step.
- **After the Undo bar goes:** the removal stands. To reverse it, open Check again and re-tag. Add a restore control only if the prototype adds one.
- **Reset this rally** (already in the design) clears all removals and tags for that rally.

## 8. What stays out
No new passes, no "who won" question, no automatic deletes. Timing is used only for the 0.2 s check. No change to budgets, cards or questions beyond the asks again listed in section 3.
