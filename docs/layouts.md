# Layouts

Sizes come from `app/src/index.css` and the composers. Smoke pins 393x660 (phone page area) and 1440x912 (desktop). Orientation chooses the shell, not the width.

## Shell

`app/src/layout/AppShell.tsx`. Outside a match, portrait uses a fixed bottom bar (`.shell-bar`). Landscape uses a left rail (`.shell-rail`, about 4.5 rem plus the safe area). Inside a match both are hidden. The set tagger's main does not scroll (`overflow-hidden`); other pages scroll. Safe area sits on the bar, the rail, and the top row, not on the shell itself.

The match top row is Back, the three tabs, and the name. The name ellipsizes first. In landscape the name can use its own width. Phone landscape (landscape and `max-height: 500px`) lets that top row scroll away.

## Set Tagger zones

`app/src/features/tagging/composers/TagSetComposer.tsx`. Four zones. A mode changes what fills a zone, not the zone's box. Class `.tag-set`: set row `--tag-set` is 2.5 rem (40 px), rally `--tag-rally` is 4 rem (64 px).

Portrait stacks, top to bottom: Video, Set, Rally, Input Area (the rest of the height).

Landscape, from `useLandscape` in `app/src/features/tagging/hooks/useLandscape.ts` (`orientation: landscape`, or a square via `min-aspect-ratio: 1/1`), sets `data-pad-split`. The grid is left wing, middle, right wing. Each wing is at least 9 rem. The middle column's picture is 16:9 of the height left after the set row and the rally row. The wings are the Input Area. Nothing from the Input Area draws on the picture.

Under 660 px tall (`max-height: 659px`) the shot cells stay 32 px and the foot stays 48 px. The spacing above them tightens.

### Video

Picture, Back, score bug (sets, points, a server dot once the server is known), transport (back, play, forward, speed, mute, Settings), seek bar on the bottom edge with rally spans. A hint lasts 2.5 s and a toast lasts 6 s (`app/src/features/tagging/hooks/useTagMessages.ts`). One message at a time. Undo sits on the toast. The component is `app/src/features/tagging/sections/VideoSection.tsx` with `TransportBlock`, `PictureSeekBlock`, and `StandInBlock`.

### Set

One row, 40 px: this set's rally pills, then Edit Set (`SetZoneSection`, `SetPillsBlock`). Saved pills use the winner's colour. The open rally is a dashed pill, muted while its server is not known, otherwise in that server's colour. Edit Set dims when no rally can be picked, and shows pressed while it is on. The picked pill takes a brand outline. Gaps mode shows slots between pills. Set over, Edit Set, and a finished set hide the open pill.

### Rally

64 px, three rows (`RallyZoneSection`, `PartLabelBlock`). Row 1 is the head (number and server, the score before the point, and the actions). Row 2 is shot cells, or part chips in review. Row 3 is one line per part (Opening, Attack, Rally, End), amber when that part is marked. While contacts are open, a 2 s countdown bar runs on the bottom edge and takes no extra height.

Review is the star. The video loops the focused part. Back and Forward stay inside the rally. Edit Rally and review are not on together. Save set on a won set does not wait for the picture.

### Input Area

Two columns (`InputAreaSection`, regions from `deriveInputArea` and `deriveBestPanel`, painted by `RegionButtonBlock`). One control spans both columns only when it is one action for both sides: Play, Tap serve, Tap shot N.

| Moment | What the columns hold |
|---|---|
| Watch and tapping | The pad, spanning both |
| Rally 1 server | You served, Them served |
| Serve | BH Long, BH Short, FH Long, FH Short |
| Stroke | BH Attack, BH Control, FH Attack, FH Control |
| End | Winner and Not a shot, Long and In net |
| Edit Set, rallies | Rallies, Back, Edit Rally N, and Gaps, Forward, Delete, Save set if the set is not saved |
| Edit Set, gaps | Rallies, Back, Insert, and Gaps, Forward, Save set if not saved |
| Edit Rally | Back, Forward, Delete or Out of turn, the quadrants for the focused stop. Point to is absent on rally 1 |
| Review | Back, Review plus the part name, Forward |
| Set over | Edit, Save set |
| Mark or video end, a leader, not a win | Save at the score |
| Mark or video end, level | Save set |
| A saved set, opened | Empty |

Back and Forward move the focus (rallies, shots, or parts). The other controls act on that focus.

## Tag page and Insights, short landscape

At landscape and `max-height: 500px`, `.tag-page` and `.insights-page` become two columns. The preview or the reel player sticks. Cards use the other column when the player is on screen. Taller landscape and portrait stay one column.

Button heights follow pointer (finger or mouse), not the viewport width. The three kinds are in `docs/components.md`.
