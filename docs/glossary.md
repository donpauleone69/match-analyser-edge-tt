# Glossary

Terms the app uses now. Screen boxes are in `docs/layouts.md`. Tagging behaviour is in `docs/tagging-rules.md`.

| Term | Meaning |
|---|---|
| You, Them | The two sides. Stored as `me` and `them`. Screens show the player names |
| Match, Set, Rally, Shot | A match has sets, a set has rallies, a rally has shots. A shot is one contact |
| Contact | A tap at the moment a player hits the ball. Stored as seconds in one video |
| Set mark | Start and end of one set on the match videos. One mark per set. It may run onto the next video. `complete` means the whole set is on video |
| Part filmed | The mark exists and `complete` is false |
| Gap | Video between two rallies. Under 1 s is not an insert slot. 9 s or more is a continuity mark |
| Serve order break | A rally served by the side the score did not expect. One break, one mark. The walk then follows the new server |
| Left mark | A serve or gap mark the user chose to leave (`left` on the rally) |
| Best + FA | The tagging flow. FA is first attack. One question per screen, in contact order |
| Serve | Where the serve lands: Short or Long, BH or FH |
| Stroke | From shot 2: wing BH or FH, and Attack or Control |
| End | How the last shot finished. The pad offers Winner, Long, and In net (`Net`). `Wide` is a stored ending the pad does not offer |
| Not a shot | Drops a contact that was not a shot, such as a toss |
| Point to | Who won. Asked only when the winner does not follow from the server, the count, and End. Never on rally 1 |
| Check the point | Stored when Point to was kept and it disagrees with End |
| First attack | The first Attack from shot 2. Null when there is none. Never the serve |
| Parts | Opening, Attack, Rally, End. Derived. Review marks use the same ids |
| Winner | Stored on the rally. The score is the count of these. It is not a separate score field |
| Derived | Worked out when read: hitter, expected server, score, parts, set state, insights, reels |
| Idle close | Two seconds with no tap closes the rally. There is no let |
| Set Tagger | `/matches/:matchId/tag/:setId`. One set, one rally at a time |
| Edit Set | Steps a set's rallies, or its gaps, to edit, delete, or insert |
| Edit Rally | Fixes one saved rally. Opens on shot 1. End is its own stop |
| Review mode | The star. Part chips replace shot cells. Back and Forward move inside the rally |
| Save set | Ends a won set and returns to Tag. Does not change the typed Details score |
| Ended early | Save at a score that has a leader but is not a win, at the mark or the video end |
| Differs | A finished set's typed score, or the match result, disagrees with tagging |
| Draft | The open rally on the set. Not in the score |
| Reel | The rallies behind an insight card, played from the card. The word "clip" is not used on Tag |
| Insights | The same cards for one match and for all filtered matches |
| Demo stand-in | The scripted picture used when the video is `kind: 'demo'` |
| Archive | Rallies joined, lower size, one way. Offered once the match is fully tagged |
| Gate | `/`. A login stub. It does not check a password |
| Matches | The home list at `/matches` |

Retired names, not used for this app: Essential and Full modes, Pass 2, Match Review, a Clips hub, Work on, inference, let as a saved result.
