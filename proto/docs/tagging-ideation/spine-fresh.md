# Spine Fresh: tap spine and single-question sweeps

Canvas: [Spine Fresh](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/d2853c06-8ef6-4ea7-948b-0c5a5f397882)

## Approach and why

I changed R3 heavily. I kept its best idea: one result token (Winner, Net, Long or Wide, relative to the last hitter). Together with the known first server, that token builds the score, the server and every hitter. I replaced two things:

- **R3 assumed contact times were already marked.** The brief says nothing is known, so contact times must come from tagging. Here the user marks them in one live pass with one big button. Each contact tap is a beat, not a decision. The taps give four outputs at once: contact count, every hitter (from count parity and the server), a time stamp for every contact, and rally start and end.
- **R3 asked different questions on different rallies.** It asked about the first pressure shot from shot 4, and about the shot before an error only on long error points. That gives rates with uneven bases. Here every rally is asked about the same contacts: 1, 2, 3 and the last one, whenever they exist. Contacts in the middle of long rallies are only counted.

Detail is collected in sweeps rather than rally by rally. A sweep asks one question with one row across every rally, and loops the exact contact using its time stamp. The user answers what is on screen, not what they remember.

## Sequence

0. **Setup, once.** Pick which player is You. The first server is given.
1. **Live spine, in order.** Between points the video scans at 4x. Tap Ready when the server is set: the app rewinds 1 s and plays at 1x. Tap the big button on every contact. After 1.2 s with no tap, the video pauses on the last contact. Answer **Result**: Winner, Net, Long or Wide. The app then updates the score, the next server and the game end, and skips the game breaks.
2. **Sweeps, in any order.** Each sweep has one row:
   - **Serve length** (contact 1): Short, Half-long or Long. Skipped on serve faults.
   - **Receive stroke** (contact 2) and **third-ball stroke** (contact 3): Short, Push, Flick, Loop, Hit, Block or Defend.
   - **Finish** (last contact): FH or BH. From 4 contacts, a second tap on the same loop adds the stroke. On 2- and 3-contact rallies the stroke is reused from the receive or third-ball answer.
3. **Checks cost no taps.** The pause frame is labelled with the derived last hitter, and the Ready frame shows the derived server. A missed tap shows up as a wrong name, and Fix adds or removes a contact.

## Effort sum

The model uses the brief's mix of 10, 14, 21, 10, 9, 5, 3 and 8 rallies of 1 to 8+ contacts. The 8+ group averages 10.25 contacts.

| Contacts | Watch taps / s | Answer taps / s | Total s |
|---|---|---|---|
| 1 | 2 / 7.5 | 1.6 / 2.4 | 9.9 |
| 2 | 3 / 8.3 | 4 / 6.0 | 14.3 |
| 3 | 4 / 9.1 | 5 / 7.5 | 16.6 |
| 4–7 | 5–8 / 9.9–12.3 | 6 / 8.3 | 18.2–20.6 |
| 8+ | 11.25 / 14.9 | 6 / 8.3 | 23.2 |
| **Match** | **399 / 13.4 min** | **401 / 10.5 min** | **23.9 min** |

- **Total:** 800 taps, of which only 387 are decisions, and 17.9 s per rally.
- **What one minute buys:** stopping after the live pass takes 16.3 minutes and already gives the score and the main live-pass cards. Adding the serve and receive sweeps brings it to 20.1 minutes, and all sweeps to 23.9 minutes.
- **Assumptions:** about 16 s of dead time per point, 0.8 s between contacts, 1.5 s per answer item, and 1 rally in 20 needing a count fix.
- **Against R3:** R3 claimed about 390 touches and 13 minutes, but it left out marking contacts and watching. My answer side is similar, at 401 taps and 10.5 minutes.

## Data value

The worked 80-rally sample is synthetic, made from a fixed seed with the exact length mix. You win 3-1 (9-11, 11-7, 12-10, 11-9) and 43-37 on points. Every card is computed from tagged fields and states its base:

- serve versus receive: 64% versus 44%;
- against half-long and long serves you won 27%, against short serves 44%;
- third-ball loop on your serve: 10 of 15 won, against 4 of 10 with any other third ball;
- attacking first: 59% when you did, 40% when the opponent did;
- your forehand finishes: 5 winners and 15 errors, 8 of them into the net, against 9 winners and 6 errors on the backhand;
- rally length: 56% at 1–3 contacts, 45% at 7+;
- close points at 9-9 or later: 3 of 5.

Every card opens clips, because every contact has a time stamp. Spin, placement, speed, forced or unforced and shot quality are left out, because they are opinions rather than visible facts.

## Pros and cons

**Pros**
- Works from an untagged video.
- Nothing needs deciding while the video plays.
- Every question is a single one-axis row with a frame-locked loop.
- Each rate has a uniform base.
- Reports grow with each sweep.
- The score and hitters are checked for free.

**Cons**
- About 400 beat taps.
- A missed tap flips a point winner until it is caught.
- The live pass must be done in order.
- Watching (13.4 minutes) is dominated by the Ready and scan cycle.
- The middle of long rallies gets no detail.
- Serve spin and placement are not captured.

## Five reasons for this choice

- It is the only option that honestly starts from nothing: one beat button marks contacts, hitters, time stamps and rally boundaries.
- One result token after each rally builds the whole score and server chain, and it is checked on the next serve.
- Sweeps turn recall into recognition. One question, one row, the same thumb position, and the exact contact looping.
- A fixed window of contacts 1, 2, 3 and the last makes every rate comparable across rallies.
- Every control is a short one-axis row. There is no grid to hunt across.
