# Tagging v3 (Opus): Opening and Ending

Canvas: [Rally tagging v3: Opening and Ending](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/a3642fbb-2fa6-4ffa-b66b-be0da10a8135)

**Idea.** Tag the opening (shots 2 and 3) and the ending (last three shots) of every rally with one fixed pad. Never ask about outcome; the score already gives it.

## Sequence
1. **Setup, once per match:** handedness of both players, camera end (3 taps).
2. **Serve pass, batched:** one serve clip per point, swipe left for Short, right for Long. Faults are skipped.
3. **Rally pass:** the clip loops only the tagged contacts. For each tagged shot, in order, one tap on the pad: left column backhand, right column forehand; rows Attack (forward and up), Push (under the ball), Block (returns an attack, includes chop and lob). Impossible rows go dark.
4. **End detail, one tap:** an error went into the Net or Missed table; a winner landed Wide FH, Elbow or Wide BH (tap the zone on a drawn half table).
5. **First attack, rare:** only in 7+ shot rallies where it falls in the untagged middle; tap the shot number.

Auto-advance after the last answer; tap any earlier answer to change it; long-press flags an edge or net-cord ball.

## Fields and what they unlock
- **Serve length:** serve and third-ball patterns, receive success against short or long serves.
- **Wing and stroke per tagged shot:** where points are won and lost by technique; receive habits; third-ball patterns; incoming ball for every finish.
- **Error went (Net / Missed table):** the technical fix (net against backspin means not enough lift; long against topspin means the bat is too open).
- **Winner landed:** where your winners and theirs land, the main tactical lever.
- **First attack:** initiative win rate, one of the strongest predictors of who wins the point.

## Inferred, never asked
Point winner, last hitter, winner or error, ace or fault, phase (your serve, your receive, rally), gap before the last shot from timestamps (pressure), ball before the last shot, error context (under attack or self-made), and first attack in almost every rally. Filters: after a short serve no Block; after a Push no Block; after an Attack or Block no Push; a Push at shot N-2 means the untagged shots before it were pushes; a Block with one candidate attacker fills it in.

## Tricks
Outcome from score parity; a batched swipe pass for one repeated judgment; a body-side pad whose layout never moves; physics filtering of rows; looped clip of only the tagged contacts; timestamp gap instead of forced or unforced.

## Left out
Serve spin (not readable on phone video), placement of every ball, quality ratings, forced versus unforced, footwork, middle shots of 7+ rallies, free-text notes.

## Effort budget
Budget: **15 minutes per 80-rally match** (about 11 s a rally), under half the playing time. Assumed amateur mix: 1 shot 13%, 2: 19%, 3: 24%, 4: 13%, 5: 10%, 6: 7%, 7: 5%, 8+: 9%. Cost per rally: 1 shot 0.7 taps (1 s), 2 shots 3 (8 s), 3 shots 4 (9 s), 4 shots 5 (11 s), 5 shots 6 (14 s), 6 shots 7 (16 s), 7+ shots about 7.3 (17 to 18 s). Total about **353 taps and 14 minutes**, 1.8 s per pad tap with two to four live targets.

## Five reasons
1. The score decides the outcome, so the player only describes what they saw.
2. Opening and ending carry the coaching: serve and receive habits plus the cause of the point. Up to 6 shots that is the whole rally.
3. Only visible facts, so the same rally is tagged the same way twice.
4. One fixed pad that shrinks itself: muscle memory, not hunting.
5. Effort follows how points end: serve points cost one swipe, long rallies earn up to seven taps.

## Main trade-off
We give up the middle of long rallies, spin and any judgment of quality. Rally-phase findings rest on the ending only, and a weak shot that happens to land counts the same as a good one. In return, every tag is a repeatable fact.
