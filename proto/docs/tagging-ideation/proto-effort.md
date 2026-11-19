# Proto tagging effort

Counted at `6af8474` in `proto/` (TagSetScreen, sequence, tagLog, rally, ShotPanel). Taps to reach Save on a clean rally. Optional rows are passed. No undo, no discard, no server switch.

Shape used: the first attack is the 3rd ball once the rally gets there. A 2 shot rally is a defensive receive, so the lit Defensive side is right. An attacking receive adds one tap in the walks. Accepting a wrong lit side adds one flip anywhere.

Contacts are the same in all three flows: one pad tap per shot. After Save the video keeps playing, so the next serve is that tap. The pad plays at 0.75 times. Questions start after a 2 second pause, and the next second still treats a tap as another contact.

The number after the contacts is every later tap: each answer, each Next that passes an optional row, and Save.

## What each flow asks

**Current** (`?flow=current`). Who won (2 buttons), then the result (6). From 2 shots, stroke and wing of the last shot. From 3 shots, one tap on the large first attack target while the whole rally loops. If that shot is not the last, its stroke and wing too. Then Save.

One shot asks no stroke, wing, or first attack. Two shots never show a pick: an attacking end stroke sets the first attack to shot 2, and Block, Push, Lob or Chop sets no attack. From 3 shots, picking the last shot as the attack does not ask its stroke and wing again. Depth, intent, initiative, marks and miss reason stay hidden until you reopen a shot after it is ready, so they add no tap.

**Shot by shot** (`?flow=sequential`) and **End first** (`?flow=endfirst`) ask the same things in the same order. End first only holds 1 second at the end of each clip. Shot by shot holds 0.3 seconds.

Order: the serve, each shot until the attack is marked, End (who won, then the result), then the last shot. The two replies after the attack are stops. Later shots are skipped, apart from the last shot.

- 1 shot opens on End. Who won, result, Save. The serve is skipped for you.
- 2 shots: Next past depth, who won, result, Defensive, stroke, wing, Save. 7 taps.
- 3 shots: Next, Defensive on shot 2, who won, result, Offensive, stroke, wing, Next past intent, Save. 9 taps.
- 4 shots: 12. The last shot is the reply, so it needs stroke, wing, and Next past initiative.
- 5 shots: 13. One Next passes the first reply.
- 6, 7 and about 10 shots: still 13. Shots after the second reply get no question and no Next. The last shot still needs stroke and wing.

A reply Save does not need still costs that Next. Answering its stroke, wing and initiative costs more and keeps the data. On an error, End first and Shot by shot show miss reason (4 buttons) while Save is already lit.

## Defaults

The due server is shown on the pad. Who won and the result set the server, so a right call needs no Switch.

The stroke side is lit. Current lights Offensive when the result is Winner or the rally has 3 or more shots, and Defensive otherwise. Take the light and you skip the flip. In the walks, Defensive is lit before the attack, and you still press it (or Next). After the attack the lit side follows the shot before it, and pressing that lit side does nothing, so you skip it.

## 80 rallies

Nearest whole counts for the given mix: 10, 14, 21, 10, 9, 5, 3, and 8 rallies at 10 shots.

### Current

| Ends on | Rallies | Contacts | Then | Taps |
|---|---:|---:|---:|---:|
| 1 | 10 | 1 | 3 | 4 |
| 2 | 14 | 2 | 5 | 7 |
| 3 | 21 | 3 | 6 | 9 |
| 4 | 10 | 4 | 8 | 12 |
| 5 | 9 | 5 | 8 | 13 |
| 6 | 5 | 6 | 8 | 14 |
| 7 | 3 | 7 | 8 | 15 |
| 10 | 8 | 10 | 8 | 18 |
| Match | 80 | 317 | 506 | 823 |

### Shot by shot

| Ends on | Rallies | Contacts | Then | Taps |
|---|---:|---:|---:|---:|
| 1 | 10 | 1 | 3 | 4 |
| 2 | 14 | 2 | 7 | 9 |
| 3 | 21 | 3 | 9 | 12 |
| 4 | 10 | 4 | 12 | 16 |
| 5 | 9 | 5 | 13 | 18 |
| 6 | 5 | 6 | 13 | 19 |
| 7 | 3 | 7 | 13 | 20 |
| 10 | 8 | 10 | 13 | 23 |
| Match | 80 | 317 | 762 | 1079 |

### End first

Same taps as Shot by shot: 317 contacts, 762 later taps, 1079 in the match. Per rally, use that table.

## Time and load

Contact time is the rally itself, about 1 second a shot: 5.3 minutes. Later taps at 1 to 1.5 seconds: current 8.4 to 12.7 minutes, both walks 12.7 to 19.1 minutes. The 3 second wait before the first answer adds 4 minutes in every flow. Rough total: current about 18 to 22 minutes, both walks about 22 to 28 minutes. Following the slowed picture makes the contact pass about 7 minutes. End first's 1 second hold fits inside a 1 to 1.5 second tap on most stops. It adds time when you wait for the picture first.

If the last shot is the first attack on the longer rallies, current stays at 6 later taps from 3 shots up (about 70 fewer here). The walks then take a Defensive press on every earlier shot, and a 10 shot rally rises from 13 later taps to 16.

No grids. Each question is one row. Who won is 2 buttons, the result is 6 (Winner, Lucky, Net, Long, Wide, Air), wing is 2 (BH, FH). Stroke is 5 when Offensive is lit (Block, Flick, Loop, Drive, Smash), 4 when Defensive is lit (Block, Lob, Push, Chop), and 4 on the first attack (Flick, Loop, Drive, Smash), with the 2 side buttons above the row. Depth, intent and initiative are 3 each. The first attack in current is one large target plus No attack: you watch the rally. The heaviest glance is a reply in the walks, where side, stroke, wing and initiative are on screen together (about 12 buttons) and the tap may only be Next. The shot rail shows one chip per shot plus End. The must path does not tap it.
