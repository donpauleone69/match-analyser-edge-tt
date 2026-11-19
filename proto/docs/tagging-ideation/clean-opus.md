# Rally tagging sequence (clean opus)

Interactive model: [Rally tagging model](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/fbab5fe0-02dc-49c8-a082-dcaa3eed82f1)

**Principle:** ask only what a player can see reliably on a phone replay, ask it once, and let every answer narrow the next one. Contacts are marked, so shot count, hitter and rally phase are free.

## Sequence (one tap per question, auto advance)

1. **Ending of the last shot:** Not returned / Net / Out. Gives the point winner, winner versus error, the score and the phase (serve, receive, 3rd, 4th, open) with no extra question. Asked first so the rally is useful even if the user stops here.
2. **Miss type** (errors only): Forced / Unforced / Not sure. The single most coachable stat. Skipped on winners, inferred as unforced on serve faults.
3. **Serve:** one grid tap of spin (Back, Side, Top or none, Not sure) by length (Short, Long). Then **placement**: receiver's FH / Middle / BH.
4. **Receive (shot 2):** stroke, then placement to the server's FH / Middle / BH.
5. **Shots 3 and 4:** stroke only.
6. **Last shot** if the rally is longer than 4: stroke. Shots 5 up to the one before the last are counted, not tagged.

For your own shots the stroke is a 2 row grid (FH, BH) by stroke, so wing and stroke cost one tap. Opponent shots are a single row of strokes plus Not sure.

## Why each field earns its place

| Field | Feeds |
|---|---|
| Ending | Win rate by phase, winners versus errors, clip of every lost point |
| Miss type | Unforced errors by stroke and wing: the clearest "what to practise" |
| Serve spin and length | Which of your serves win points or get attacked; which opponent serves hurt you |
| Serve and receive placement | Middle and wide patterns, the most common tactical gap at club level |
| Stroke and your wing | Third ball conversion, receive choice versus serve type, FH versus BH reliability |

## Inferred or filtered, never asked

- Point winner, error or winner, score, server rotation, rally phase.
- Serve stroke (shot 1 is always a serve) and serve faults as unforced.
- Length of every stroke except serve and push: Drop is short, all others long. Push asks Short / Long.
- **Incoming length filters strokes:** after a short ball only Push, Drop, Flick show; after a long ball Loop, Block, Smash, Push, Chop, Lob. Layouts are fixed per set so positions never move and muscle memory builds over hundreds of rallies.

## Component choices

- Big one-tap button rows, no Next button, chips at the top to go back and change an answer (later answers re-filter and invalid ones clear).
- Grids merge two linked choices into one tap where both axes are short.
- **No defaults on judgement fields.** A pre-selected answer gets accepted on tired rally 200 and silently corrupts stats. Defaults only appear as inferred values.
- **Not sure on every judgement call**, stored as null. A gap is better than a guess.

## Left out

Spin on rally shots (implied by stroke), shot quality ratings, exact 9-zone landing, placement after shot 2, opponent wing, footwork, speed, intent, and the middle of long rallies. Each is either hard to judge from video, too slow, or rarely changes advice.

## Main trade-off

Depth versus reliable volume. Concentrating detail on shots 1 to 4 and the last shot (about 6 to 10 taps per rally) means long rallies lose their middle, and opponent shots lose wing. In return the data that decides most points is collected fast enough that players actually tag every rally, and every stored value is one they could see.
