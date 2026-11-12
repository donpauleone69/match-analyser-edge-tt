# Bottom-up tagging plan

_Chat notes — 2026-11-11. Agreed direction. Not built._

Diagrams: [TableMap.md](../TableMap.md).

The three open choices are now decided: a mid-set server tap applies from that point forward, a clip is assumed to start at 0–0 until an ending score disagrees, and a finished set offers the next set.

## Decided

Put a video in and tag immediately. The only requirement before the first rally is the focal player.

Most clips are a full set, or a full match made of full sets, starting at 0–0. The app assumes that. The server is a pill. It starts on the focal player. One tap switches it to the other side, and the rotation from that point is then known, including deuce. The score counts itself from the point winners. You do not type serves for the rest of the set, and you do not type the score.

A clip that starts in the middle stays possible. It is the exception, not a second workflow you have to set up.

## Order of a session

1. Add a video and choose the focal player.
2. Tag the first rally. The server pill shows the focal player. Tap the other side if they are serving.
3. Tag contacts, pills, and the point ending, as now. The next server pill follows from the score.
4. If a later pill is wrong, tap the other side once. Servers from that rally onward update.
5. Name the opponent, or attach a match, whenever you know it. Neither is required.
6. The running score is the score. At a finished set it is already 11–7, or 12–10, or whatever the points made.

## Server pill

Two sides. The active one is highlighted. The other side has no name until you add one: the pill is the focal player and "Villain".

The first pill defaults to the focal player, treated as the first server of a set that started at 0–0. Tap the other side and that side becomes the first server. Every later serve follows:

- Two serves each, while either score is under 10.
- One serve each from 10–10.
- The set is over when one side reaches 11 or more and leads by 2.

The point ending you already tag says who won the point, once the last contact's side is known. That side follows from the server and the shot count. So the score, and the moment deuce starts, come from tagging the rally. No separate score entry on this path.

One switch is enough. The tapped rally becomes the anchor: this side is serving here, the score at this rally is whatever the points so far have made, and later pills are calculated from that. Earlier rallies stay as they were. Fixing the first rally updates the whole set, because nothing is earlier than it. If the whole set was the wrong way around, tap the first serve.

## Score

On a 0–0 set the score is derived, then shown. You confirm it by seeing it. You type it only when it disagrees with the scoreboard.

That disagreement means a missed rally, a wrong point winner, or a clip that did not start at 0–0. The first rally that cannot be true is shown. Nothing is overwritten.

Walking the score backward remains the tool for a fragment, once you enter the score you can see at the end of the set. It is not something you do on a normal set.

## Full set, full match, fragment

No choice between "full set" and "full match" at the start. A match is one set after another, each from 0–0.

When the counted score first becomes a finished set, offer "set done". The next set starts at 0–0, and the server pill proposes the side that received first in the set just finished. One tap fixes it if that is wrong.

Clips that start in the middle stay. The app assumes 0–0, and asks only when an ending score you trust does not match the counted score. There is no switch to set at the start, and partial videos are not refused.

On a fragment the server pill still alternates in pairs from the last tap, and deuce waits until the end score is walked backward. The same one-tap anchor applies.

## Checks, still quiet

Used when the derived score or a server tap cannot be true. The rally is named. The tagged values stay.

- The score would go negative, or a finished score appears before the last point.
- A typed end score does not match the points.
- The same side would be serving twice in a row at 10–10.
- The server changes in the middle of a pair while either score is under 10.

Expedite, one serve each before 10–10, is a manual override later.

## Still optional

Opponent name, club, tournament, round, date, best of, set number, and a match to attach the video to. Full pills on the other side's shots.

## When this leaves the chat

1. Video plus focal player opens tagging.
2. Server pill on each rally, defaulting to the focal player on the first point, two-and-two from 0–0, one-and-one from 10–10.
3. One tap on the other side re-anchors the rotation from that rally.
4. Score is shown from the point winners. No score field on the normal path.
5. A mismatch, or a fragment whose end score you type, walks the points and lists the first rally that does not fit.
