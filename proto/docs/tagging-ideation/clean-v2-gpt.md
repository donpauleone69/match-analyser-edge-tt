# Rally Spine

The model records four connected moments, not every shot: the opening, the first attack, its immediate reply, and the finish. The order follows the rally but removes questions as soon as an answer makes them unnecessary.

## Sequence and fields

1. **Opening fingerprint, one tap.** A fixed 3 by 4 grid combines serve length, short, half-long or long, with receive action, touch, push, flick or attack. This unlocks serve and receive patterns without asking spin, intent or quality.
2. **First attack contact, one tap when needed.** Tap its existing contact marker. The tap stores shot number and timestamp. Hitter, server phase, third ball, fourth ball or later, and shots before attack are inferred. If the receive was flick or attack, contact 2 is selected automatically and this question disappears.
3. **Attack shape, one tap.** Choose FH topspin, BH topspin, FH hit or BH punch. The choices narrow for an attacking receive. This unlocks attack conversion by side, stroke family and phase.
4. **Immediate reply, one tap when one exists.** Choose block, counter, chop or lob, or push. If the attack ended the point, this question disappears. The reply is an observable measure of attack effect and avoids a weak good or bad rating.
5. **Finish signature, one tap.** Score and last hitter decide which controls appear. A winning shot asks only BH corner, body or FH corner. An error uses one combined cell for side plus net, long or wide. This unlocks finish and error maps without asking winner, loser, forced or unforced.

## Inference and tricks

Score supplies the point winner. Alternation supplies every hitter. Contacts supply shot count and time. Server plus first attack contact supplies the phase. The last hitter plus point winner identifies whether the finish was a winner or an error. One opening cell stores two fields, one contact tap stores four facts, and one error cell stores side plus miss shape.

Own serves use a small personal serve deck in a batch pass. Each named serve already carries its usual spin and intent. The player labels repeated serves together, then corrects exceptions. This keeps uncertain spin recognition out of the rally flow. Fixed layouts, filtered options and no default answer build muscle memory without silently adding bad data.

## Tap budget

A short point needs 3 taps when the receive is the attack and the attack ends the rally. A typical rally needs 4 taps. A rally where the first attack is returned needs 5. The worst case is 6 when a batch serve label needs an exception correction. Every tap above 3 adds a relationship that cannot be inferred: attack identity, the next-shot response, or a factual finish shape.

## What this produces

The app can report serve outcomes by receive, return choice by serve length, first-attack conversion by phase and stroke, attack results by the next reply, and finish or error maps. Each result links to the stored timestamps for proof clips. A useful example is: “You lose 62% of points when your short serve is flicked.” It uses only serve length, receive action and point winner.

## Five reasons

- It tags the rally spine instead of every stroke.
- It asks visible facts, never quality ratings or forced-error opinions.
- Each tap stores more than one useful fact.
- Earlier answers remove later questions.
- It judges an attack through the next reply, which is more honest and more coachable.

## Main trade-off

The model gives up detailed spin, neutral-shot placement and tactical intent. In return, it produces a complete and repeatable match record that a player can finish, trust and turn into a small set of drills.
