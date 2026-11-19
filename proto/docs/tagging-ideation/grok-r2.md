# What changed and why

Same sequence. The score was the wrong way round.

The old model took the server from the score and let you switch it on one rally. The score is not known at the start. It is built from the tags. The only serve fact set by hand is who served first in the match. Who serves this point, and who hit each contact, follows from that and from the points already tagged. Two serves each, then the other player. Once both have 10, one serve each.

The last contact can be the shot that won the point or the shot that lost it. The first question says which. Who won is that answer plus who hit the ball. Those winners are the score. The score is never where the server comes from.

Answer buttons stay in one row. Stroke and wing are two questions. There is no two-axis grid of buttons.

# End, then the opener

Ask whether the last contact won the point or missed, then which shot attacked first, then only the serve and the shots those answers leave open. An ace, and a receive you already named with a stroke, are not separate questions. Spin, intent, and the middle of the rally stay uncollected, because a blank is safer than a guess.

## Sequence

Contacts are already marked. Nothing is lit in advance. One tap answers and the next question appears. Tap a saved line to change it. A new opener clears a stroke that no longer fits. Changing the first server of the match recalculates every server, every hitter, and every winner. The ball tags stay.

1. Last ball. The last hitter is already known. If Me hit it, the row is Me won, Net, Long, Wide. A miss means Opp won. If Opp hit it, the row names Opp instead.
2. Which shot attacked first, from shot 2 on, plus None. One shot skips this. A longer rally keeps one row by offering 2, 3, 4, 5, Later, and None. Later is not saved.
3. Serve length: Short, Half, or Long.
4. My receive, only when they served, the rally has three or more shots, and shot 2 was not the attack: Short or Long.
5. If a shot was named: Flick, Loop, Drive, or Smash, then forehand or backhand. Two rows, never one grid.
6. If the last shot is a different contact: its stroke, then its wing. No attack uses Push, Block, Chop, Lob. An earlier attack uses Block, Loop, Drive, Smash.

A five-shot rally with your third ball is seven taps. The end tap is the one that writes the winner. On their serve, if you did not attack the receive, it is eight. An ace is two.

The model walks three points, with 5, then 4, then 5 contacts. Me serves the first two. Opp serves the third. Who won changes the score at once and does not change the server until two points are tagged.

## What is stored, and why

- **Last ball.** Won, net, long, or wide, for the player who hit it. This is the point, and it is visible.
- **Winner.** The last hitter, if that shot was good. The other player, if it missed. This is the score.
- **First server of the match.** The one serve fact you set. Every later server is calculated.
- **Serve length.** Serves that won, and the ball the third ball came from. Half stays, because a half long serve is a real serve.
- **First attack, or none.** This places the receive and the third ball. None is a tap, so a skip cannot look like a push rally.
- **Opening stroke and wing.** A missed first attack is this shot being last, plus a miss.
- **Receive length, sometimes.** Short or long, only for your receive, and only when a stroke did not already describe it.
- **Last stroke and wing**, when the finish is not the opener.

Every other contact is a time only.

## Inferred or filtered

Who hit each shot follows from the calculated server. Who won follows from the last ball and the last hitter. One shot has no first attack. If you attacked the receive, or it ended the point, the stroke is the receive. The opener filters the last stroke, so an attack and None cannot both be saved.

## Dropped

A per-rally server switch. A per-shot offensive or defensive toggle. Forced and unforced, and a second miss reason. Intent, spin, high, heavy, initiative, placement, and pivot. Strokes on the middle shots. Their receive. Any grid of buttons.

## The trade-off

Once someone has attacked, a chop or a lob finish is saved as a block. You also skip receive length when the stroke already says flick, push, or chop. In return a rally stays at eight taps or fewer, the winner is a tag rather than a guess, and serve, receive, the opener, and the ending are enough for those reels.
