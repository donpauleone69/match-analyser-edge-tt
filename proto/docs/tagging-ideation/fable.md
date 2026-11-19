# Tagging sequence: Fable's take

Model to tap through: [Tagging sequence: Fable's take](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/eb82fb85-998e-4b75-aaac-8aa4b391605a)

## The sequence

1. **End.** One row about the last shot: Winner, Lucky, Net, Off. It is asked first because it is the freshest thing in your head when the taps stop, and it is the one fact every rally must have.
2. **Serve.** Length: Short or Long (Long means it could be looped). Skipped on a service fault.
3. **Each shot in order, one tap.** Two rows, FH and BH, holding the same stroke cells. One tap gives wing and stroke together.
4. **The first Flick, Loop or Hit is the first attack.** Nobody is asked which shot it was. The walk then asks the reply, jumps to the last shot, and finishes. Shots in between are left blank on purpose (they can be filled by tapping them).

Nothing is lit by default and there is no Next. Every stored answer is a tap, each tap moves on, and any shot can be tapped again to change it.

## Fields and why each earns its place

| Field | Asked | What a player or coach gets |
|---|---|---|
| End (Winner, Lucky, Net, Off) | Every rally | Who won and how. Net against Off is the coaching split (not enough lift against too much). Lucky keeps flukes out of the stroke numbers and reels |
| Serve length | Every serve that landed | Serve section: what short and long serves lead to |
| Stroke with wing | Receive, shots up to the first attack, its reply, the last shot | Receive habits, first attack by wing and stroke, how the other player deals with it, and what stroke ends points |

## Worked out, never asked

- Winner of the point, ace, service fault, receive error: from End and the shot count.
- First attack (which shot, whose, third or fourth ball) and No attack: from the strokes.
- First attack result: missed, won outright, forced an error on the reply, or came back.
- Offensive or Defensive: from the stroke, so the toggle goes.
- Error made under attack or not: from the stroke before it. This replaces Forced and Unforced, which is a judgement.
- Length of the push before the attack: a Flick means short, a Loop means long.

## Filtering

The ball coming at you decides the strokes offered, so a row never holds more than five cells.

| Ball coming | Offered |
|---|---|
| Short serve | Push, Flick |
| Long serve | Push, Loop, Hit |
| Push | Push, Flick, Loop, Hit |
| Flick, Loop or Hit | Block, Loop, Hit, Chop, Lob |
| Block or Lob | Block, Loop, Hit |
| Chop | Push, Loop, Hit |

One rule covers every correction: an answer that no longer fits its row is dropped and asked again.

## Dropped or merged

- Offensive and Defensive toggle, the first attack picker and No attack: all worked out.
- Forced and Unforced, Intent, Initiative: judgements, so not collected.
- Serve spin and half long: hard to see on a phone video.
- Long and Wide become Off. Drive and Smash become Hit. Air goes (a missed swing is not a contact, so the shot before it is a Winner).
- High, Heavy and Review are left out of the walk. If kept they stay optional marks that never block it.

## Taps and the trade-off

| Rally | Taps |
|---|---|
| Service fault | 1 |
| Ace | 2 |
| 2 shots | 3 |
| 6 shots, attack on 3 | 6 |
| 9 shots, attack on the receive | 5 |
| 6 shots, all pushes | 7 |

Main trade-off: the filters are strict so the data stays clean, which means an odd shot (a push against a loop) has to go in as the nearest cell, and a long push rally costs one tap a shot because that is how the first attack is found without asking. The data cost is that the middle of long rallies, intent, spin and Drive against Smash are not recorded at all.
