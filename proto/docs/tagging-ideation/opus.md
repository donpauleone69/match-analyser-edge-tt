# Opening, then the end (Opus take)

Model: [Tagging sequence model (Opus)](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/ace569b9-4470-48f2-992b-d54002110882)

## The idea

Walk the rally shot by shot only while it is still in the opening, stop the walk at the first attack, then jump to the last shot. The middle of a long rally is left blank by design. A club player wins and loses most points in the serve, the receive, the first attack and the ending, so that is all this asks. Every stop is one tap on a wing by stroke grid: two rows (FH, BH) of cells, so one tap gives both the wing and the stroke.

## The sequence

| Stop | What shows | Taps |
|---|---|---|
| Serve | Grid: FH or BH by Short, Half, Long | 1 |
| Each shot before an attack (receive, 3rd ball...) | Grid: FH or BH by Push, Flick, Loop, Drive, Smash. Push moves on. Any attack stroke marks this shot as the first attack and the walk jumps to the end | 1 |
| Last shot | Result row: Winner, Net, Long, Wide. Then: if no attack yet, the same opening grid; if the attack already happened, an Attack or Defend switch, then FH or BH by the four strokes of that side | 2 or 3 |
| Ready | One-line summary, Flag for review toggle, Save | 1 |

A 6 shot rally with an attack on 3 takes 6 taps (current mode about 8, shot by shot about 12). A 6 shot push rally takes 7. A 2 shot rally takes 3. An ace takes 2, a serve error 1 (length is not asked on a serve in the net).

## Fields and why each earns its place

| Field | Asked or inferred | Value to a player or coach |
|---|---|---|
| Serve wing and length | Asked | Which serves win points, and which ones get attacked. Feeds the Serve section and "serves that won the point" |
| Receive wing and stroke | Asked | Push or attack on receive, from which wing, and receive errors. Feeds Receive |
| First attack: shot, who, wing, stroke | Asked in one tap | The single most useful pattern: who opens first, on which ball (3rd, 4th...), with what. Feeds "my missed first attacks" |
| First attack outcome | Inferred | Winner, missed, forced the miss, countered, or won or lost later. Comes from where the rally ended relative to the attack |
| Result and miss type | Asked | How points end (winner, net, long, wide) |
| Winner | Inferred | Last hitter plus result: a Winner means the last hitter won, an error means they lost |
| Serve error, receive error, ace | Inferred | From shot count and result |
| When the error came | Inferred | Before any attack, missing the first attack, replying to it, or open play. A deterministic stand-in for forced or unforced |
| Last shot wing and stroke | Asked | What wins and loses points, for example BH block errors |
| Flag for review | Toggle | Makes a reel of rallies the player wants to rewatch |

## What is filtered or inferred so it is never asked

- Phase is never stored. It follows from the stroke. Before an attack the grid shows only Push and the attacks; after one, the switch picks which four strokes show.
- The first attack is the first attack stroke tapped. No separate "pick the first attack" step, no No attack button: if every shot is Push, it is a no attack rally.
- Winner, server, ace, serve error, receive error, attack outcome and when the error came are all worked out.
- The walk never stops on middle shots, so they cannot be filled in badly.

## What I dropped

- Spin on the serve: it is hard to read from a phone video, especially on the opponent's serve.
- Intent (Safe or Aggressive): a guess about the hitter's mind, often the opponent's. The attack outcome says more and is not a guess.
- Forced or unforced: replaced by "when the error came", which is a fact.
- High and Heavy marks, Initiative, middle shot strokes: low reliability or rarely acted on.
- Lucky (edge or net cord) as a result: rare; it is filed as a Winner.
- Defensive strokes before an attack other than Push: Block, Chop and Lob before anyone attacks are rare at club level, so the Push cell stands for any non-attacking shot there.

## The main trade-off

Speed and reliability are bought with a blind middle. Long rallies lose everything between the reply to the attack and the last shot, so there is no "who took the initiative back" data. I think that is the right trade for a club player, because the opening and the ending explain most points and are the parts a person can answer surely from a looping video. A second cost: Push before an attack can hide a chop or block on receive, which is a small accuracy loss to keep the grid on one row.
