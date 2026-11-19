# Opening and Ending, r4

## What changed and why
- **The server is never asked.** The first-server setup tap is gone. The app cannot know the server while contacts are tapped, so it works it out from the result of each rally.
- **The point is two taps.** First "You won" or "They won", two big buttons. Then the ending: Net, Out, then BH, Middle, FH under "landed". A single row of ten buttons read like a grid. Two short rows are each one plain choice.
- **The server comes from the result.** Net or Out means the loser hit last. A landed ball means the winner hit last. The contact count then gives who served: an odd count means the last hitter served.
- **A serve order check replaces the label check.** The app compares each rally's server with the serve order (2 serves each, 1 each from 10-10, swap each set). A rally that disagrees is flagged. A missed contact no longer flips the point. It only trips the flag.
- **First attack is split into two fixed facts.** "Opener" is who attacked first in shots 2 to 4. "Attack at the end" is who attacked last in the two shots before the last ball, on rallies of 5 or more shots. Neither costs a tap. Together they show when a rally went back to control and the other player took over.
- **The first attack after shot 4 is dropped.** It was not on a fixed slot and was never compared.
- **Push and block are named more simply.** A non-attack is a block when the ball before was an attack. It is a push when it answers a short serve. Otherwise it is a control ball. The old rule carried "block" forward through a reset, which was wrong.
- **Effort rises a little.** The second point tap adds 80 taps and 40 s. Total time goes from 19.0 (r3) to 19.9 minutes, inside the 20-minute budget.

## Sequence
1. Once per match: both players' hands and your end in set 1 (3 taps).
2. Live: tap every contact at 0.75x. The strip shows contact numbers only. Who hit them is not known yet.
3. After 2 s with no contact the video pauses. A tap in the first second of the pause still counts as a contact.
4. **Who won:** You won or They won. This gives the score and the set ends.
5. **Ending:** Net, Out, or where the winner landed (BH, Middle, FH). The row is labelled "How you won" or "How they won". Net and Out are the loser's error.
6. **Server:** worked out from the point, the ending and the contact count. Now every shot is labelled with who hit it. If the server disagrees with the serve order, the rally is flagged (see below).
7. **Serve:** Short or Long (would it bounce twice). Skipped after a service fault.
8. **Shot rows** for shots 2, 3, 4 and the last three (at most 6). Each row is BH attack, BH, FH, FH attack. Each shot replays from its contact.
9. The video resumes. Answers stay on the rally row, and tapping one changes it.

### The serve order check
- Each set has one first server. The app picks the one that fits most rallies in the set so far. The next set starts with the other player.
- From then on, every rally is checked as soon as the ending is tapped. Only the first rally of the match waits for the rallies after it.
- A flagged rally shows "Contacts say you served. The order says they did." The fix row offers Add a contact, Remove a contact, or Keep as is. Add or Remove replays the rally so the player can tap it. Keep as is is for videos that skip points.
- A wrong point tap trips the same flag. Tapping the point chip changes it.

## Tap and time sum (tour mix, 80 rallies)
| Shots | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8+ | All |
|---|---|---|---|---|---|---|---|---|---|
| Rallies | 9.6 | 14.4 | 20.8 | 10.4 | 8.8 | 4.8 | 3.2 | 8 | 80 |
| Contacts each | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 317.6 |
| Answers each | 2.75 | 4 | 5 | 6 | 7 | 8 | 9 | 9 | 451.2 |
| Taps total | 36 | 86.4 | 166.4 | 104 | 105.6 | 67.2 | 51.2 | 152 | 768.8 |
| Answer s each | 2.9 | 4.9 | 6.5 | 8.1 | 9.7 | 11.3 | 12.9 | 12.9 | 601.9 |

Answers per rally are 2 for the point, plus 1 serve, plus one per tagged shot. On 1-shot rallies a quarter are faults, which skip the serve, so 2.75. With 3 setup taps the total is **about 772 taps**.

**Time is 19.9 minutes.** Watching takes 9.7 minutes: 7.1 for contacts at 0.75x and 2.7 for the 2 s pauses. Answering takes 10.0 minutes. That is 80 winner taps at 0.7 s (two big buttons, and the answer is already known), 80 ending taps at 1.0 s, and 291 other answers at 1.6 s while the shot replays. Setup takes 8 s. Flag fixes are left out, and so is the time between points. **Budget: 20 minutes.** The sample match (lengths 10, 14, 21, 10, 9, 5, 3, 8) uses the same rules: 317 contacts, 450 answers, 770 taps, 19.8 minutes.

## Fixed-slot status
Every tag used to compare rallies holds the rule. There is no exception, and nothing is shown that is not compared.
- **Holds, every rally:** point and ending, and the server they give.
- **Holds, every rally that reaches the slot:** serve length (every serve that landed), shots 2, 3 and 4, and the last three shots.
- **Derived and fixed:** opener (every rally with a return), attack at the end (every rally of 5 or more shots), and the ball before every error.
- **Holds, but only describes winners:** where the last ball landed. It is never used as a rate across all rallies.

## First attack: what it is worth
- **Worth:** who takes the attack first is the main tactical question at club level. Split by serve, it shows a passive receive. It costs no answer, because it reads the attack half of the shot row, and other cards use that half anyway.
- **The problem:** in a long rally one player can attack, the other blocks or pushes, and the rally goes back to control. Then the other player attacks. "Opened first" still credits the first player, and the card cannot see the turn.
- **The fix:** keep the opener on shots 2 to 4, and add "attack at the end" from shots n-2 and n-1. Both slots are tagged on every rally of 5 or more shots, so both facts hold the rule. The last ball is left out, because a winner is nearly always an attack and would restate the result.
- **The fact the two give together:** whether the opener kept the attack. A rally is "turned" when the attack at the end belongs to the other player.
- **Dropped:** the first attack after shot 4. In long rallies it says little, and it was never on a fixed slot.

## Middle of long rallies and review marks (added 2026-11-17)
- **Middle question, 8+ shot rallies only, optional.** The untagged middle loops once, and the row reads "End of middle: who was attacking?" with your name, their name and Nobody. A name means that player attacked and has only been blocked since. Nobody means the last two balls of the loop were both non-attacks. The app stores held (the opener), turned (the other player) or reset (Nobody). About 8 taps a match.
- **Rally parts on screen (Paul's principle).** Serve, Pre-attack, Attack, Middle and End, with Start in place of Serve and Pre-attack when they are too small to split. Attack is the first attack plus 2, and it covers the rest of the rally when the rally ends within 4 balls of the first attack. End is the last 3. Middle appears only between them. Each shot has one part.
- **"Mark for review"**, an optional row before the point is saved, offers only the parts this rally has.
- Details and the build spec: `phase-review-design.md`.

## Point first or serve first
The design asks the point first: who won, the ending, then the serve and the shots. The other order asks the serve and the shots first, and the point last. The questions are the same. Only the place of the two point taps moves.

### What is known at each step
**Point first:**
1. After the contacts: the count, the times, and which slots to ask. The server is not known.
2. After who won: the score and any set end.
3. After the ending: who hit last, the server, the hitter of every shot, and the order check. A flag is fixed here, before any shot is asked.
4. Serve row: serve length, by a named player. Skipped after a fault, because the ending already said so.
5. Shots 2 to 4: push, block or control on each non-attack, and the opener by name.
6. Last three: the attack at the end by name, and the ball before the last shot.

**Serve first:**
1. After the contacts: the same as above.
2. Serve row: serve length. The server is a guess from the serve order, or blank. A 1-contact rally cannot be skipped, because a fault is not known yet. The row needs a Fault button there.
3. Shots 2 to 4: push, block or control, as before. The opener is known only as a side, server or receiver, not as a player.
4. Last three: the attack at the end, also only as a side.
5. After who won: the score.
6. After the ending: who hit last, the server, and the order check. Only now do the opener and attack at the end get names. A flag found here comes after every shot was answered.

### Server and serve order check
- Point first: the server is settled on tap 2. Every shot row shows the right player, and a missed contact is fixed before the slots are used.
- Serve first: the server is settled on the last tap. The shot rows run on the order guess. If a contact was missed, every shot after it was asked under the wrong number and the wrong name. Answers are kept on their contacts, so they survive the fix. But a slot that moves into the asked set must be asked again, usually 1 to 2 answers.

### Opener and attack at the end
Both orders store the same facts from the same slots. Point first names them as soon as the slot is answered. Serve first knows the side at once and the name at the end. Nothing is lost either way, so this does not decide the order.

### Effort
| | Point first | Serve first |
|---|---|---|
| Answers, tour mix | 451.2 | 453.6 (faults get the serve row) |
| Taps, tour mix | 772 | 774 |
| Time, tour mix | 19.9 min | 20.0 min |
| One missed-contact fix | 2 taps and a replay | 2 taps, a replay, and 1 to 2 re-asks |
| Two fixes a match | 4 taps, about 14 s | about 7 taps, about 19 s |

### Recommendation: point first
- The point is the freshest fact at the pause. The two point taps are the fastest of the rally while the frame still shows the last ball.
- The server is known before any shot question, so every row names the right player.
- The order check fires before the shot rows, so a missed contact costs no re-asks.
- Service faults skip the serve row with no Fault button.
- Serve first only gains a natural forward order, and the ending comes right after the last shot replays. That is not worth late names, late checks and re-asks.

## Data model
**Match:** both players' hands, your end in set 1. There is no first server.

**Rally, tagged:** contact times (one per contact), point to (you or them), ending (Net, Out, landed BH, Middle, FH), serve length (Short, Long, or none after a fault), and one shot code per tagged shot (BH attack, BH, FH, FH attack). Each shot code is stored on its contact time, not its number. A flag is stored if the player chose Keep as is.

**Rally, worked out:** last hitter, server, the hitter of every shot, score, set, ends, serve order check, phase, winner or error, the ball before every error, push or block or control on non-attacks, opener, attack at the end, turned.

## Data value
- **Point and ending:** score, serve order, phase, and winners against errors. On errors, Net or Out points to the technical fix.
- **Where it landed:** where each player's winners go.
- **Serve length plus shot 2:** receive habits against short and long serves.
- **Serve length plus shot 3:** serve and third-ball patterns.
- **Ball before the last shot:** whether an error came under attack, and on which wing.
- **Opener:** who opens first, and the win rate that follows.
- **Opener plus attack at the end:** who keeps the attack in long rallies.

The sample match produces seven cards and a match report. Receive is the leak (7 of 22 against 23 of 33 on serve). The BH flick against short serves won 0 of 6, with 4 in the net. Short serve plus FH third ball won 7 of 9. 9 of 18 errors came off their attack, 8 of them blocks. They opened first 30 times to 25, and you won 37% of those. In the 25 rallies of 5 or more shots, you opened 10 and kept the attack 3 times, winning all 3. You lost it to them 6 times and won 2. They opened 12 and kept it 8 times, and you won 2 of those. Their winners went to your FH 8 of 19 times.

## Pros
- The match is watched once, and the point is answered while the frame still shows it.
- Every compared tag is on a fixed slot, and nothing off a slot is shown.
- The server is never asked, and a missed contact is caught instead of flipping the point.
- Long rallies show who kept the attack, with no new tap.
- Each answer row is one plain choice.
- 772 taps and 19.9 minutes, contacts included.

## Cons
- The point costs two taps, so the sum sits just under the 20-minute budget.
- Long rallies still cost 9 answers. The middle of 8+ shot rallies is covered only by the optional middle question.
- The shot row puts two facts, wing and attack, in one row of four.
- One missed and one extra contact in the same rally cancel out and pass the check.
- A video that skips points breaks the serve order, so the flag needs Keep as is.
- No stroke names: loop, flick and drive are all stored as "attack".
