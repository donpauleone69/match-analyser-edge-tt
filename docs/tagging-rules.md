# Tagging rules

Best + FA is the only flow. Code: `app/src/rules/bestFa.ts`, `app/src/rules/rally.ts`, `app/src/rules/score.ts`, `app/src/rules/continuity.ts`, handlers in `app/src/features/tagging/hooks/useTagSetFlow.ts`. FA means first attack.

## Server, from the score

`serverAt`: two serves each from the set's first server, then one each once both sides are on 10 or more. Set 1 defaults to you. Later sets alternate (`firstServerForSet`).

Rally 1 asks who served, after the taps. If that side is not the set default, `flipFirstServer` updates the set. Later rallies are offered the server the score expects. Switch is explicit (`bestSwitchServer`, `bestSetServer`). A saved rally keeps the server it was given. Editing another rally does not rewrite it.

Every Best + FA save writes `serveChecked: true` (`bestRally`, I-8). The chosen-or-confirmed meaning applies only on the draft, where it decides whether rally 1 still asks who served (`serverKnown`).

## Contacts and the idle close

The pad plays, then each press is a contact. Capture speed is 0.75 (`CAPTURE_SPEED`). The stored time is the video time minus reaction (`captureContactTime`). The live pad passes Best timing's reaction, whose default is 0 (`DEFAULT_BEST_TIMING`). `TAP_LATENCY_S` (0.3 s) is only the fallback when a caller omits latency.

A second tap is ignored when the stored time is under 0.11 s of video after the last contact (`MIN_TAP_GAP_S`, `tapIgnored`). At 0.75x that is about 150 ms on the clock. Contacts are never stored closer than 0.05 s.

Two seconds with no tap closes the rally (`CONTACT_IDLE_MS` is 2000, a wall-clock timeout in `useTagSetFlow`). There is no let and no result button during the rally.

A rally's default window is 2 s before the serve contact (`RALLY_LEAD_S`) and 1 s after the last contact (`RALLY_PAD_S`), clamped at 0. `nudgeMark` moves a start, an end, or a contact. Start stays at or before the first contact. End stays at or after the last.

One contact is a serve only: End is an ace (Winner) or a serve fault (any error). `idea.result` stores `Ace` or `Serve fault`.

## Questions, in contact order

`routeAfter` asks the first question that is still open. The last answer saves.

1. Rally 1 only, until the server is confirmed: who served.
2. When there are two or more contacts: Serve, then shot 2, shot 3, and so on through the last.
3. End.

Serve is four regions: BH Long, FH Long, BH Short, FH Short (`depth` plus landing `wing`). Each later shot is BH or FH by Attack or Control (`STROKE_GRID`). Every shot from 2 to n is asked. "Who attacked first?" is not shown (`asksWhoFirst` stays false).

End regions: Winner (the last hitter won), Long, In net (stored as `Net`). Not a shot drops a contact that was not a shot. `Wide` is a legal ending and is in the seed. The pad does not offer it.

Point to is never on rally 1 (`padFocus` stays on End). On a later rally it is asked only when the winner does not follow from the server, the contact count, and End. Winner means the last hitter. Net, Long, and Wide mean the other side (`winnerOf`). Keeping a Point to that disagrees sets `idea.check` to `Check the point`.

## First attack and parts

`fa` is the first shot from 2 whose stroke is `Attack`, else null, and never 1 (`bestOpener`).

Parts (`bestParts`) cover shots 1..n once, in order: Opening, then Attack (three shots when there is room), then Rally, then End (the last three, and End never takes the serve). A one-contact rally is Opening only. Empty parts are omitted. Review marks are those part ids, stored on `idea.review`, in row order.

## Set end and save early

A set is won at 11 or more and two clear (`isSetWon`). That score is always a legal end (`isLegalEnd`). Set over fires only when the last saved rally is the first winning score (`setOverOnRule`). The Details score is not consulted. Rallies after that win are an overrun: the pad leads with Edit and Remove.

Save set is live as soon as the winning rally is saved, and it leaves for the Tag page. Finishing sets `finished` and does not change the typed Details score (`finishSet`).

At the end of the mark or the video, if the score has a leader but is not a win, the button is Save at that score (`canSaveEarly`) and the set line says ended early. A level score is Save set and stays incomplete until Details has a score (`isIncomplete`).

## Continuity marks

`checkSet` walks the set in video order and marks it. It does not change a rally.

- Serve: the tagged server is not the one the walk expected. After a break the walk follows the new server, so one mistake is one mark, not a mark on every rally after it.
- Gap: at least 9 s between the last contact of one rally and the first of the next, same video (`LONG_GAP_S`). A point with no video is not an edge of a gap.

The user can leave a mark (`left` on the rally, kinds `serve` and `gap`). Left marks drop out of the open list. A gap under 1 s is not a slot to insert a rally (`MIN_GAP_S` in `app/src/rules/matchOps.ts`). Swap players is offered from the serve-order review (`openReview`, `pressReview`) on a rally the check has marked, not as a fix that rewrites the list by itself.

Score marks (`past`, `differs`) compare the tagged score with the score typed on Details. They are separate from serve and gap marks.
