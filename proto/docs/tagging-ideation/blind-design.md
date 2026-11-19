# Blind design pass: fresh components, three themes

Designed from the two wireframes (layout and size only) and the filming examples. No prototype code, earlier style guides or other store docs were read.

Canvas: [Fresh components, blind pass](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/aff1e37f-c39f-4123-a302-566a55e5294e). The canvas uses a flat sketch for the video because canvases cannot load images; the PNGs use the real frame (filming example 1, black bars cropped).

## Shared component ideas

- **Answer card anatomy**: a small side label (BH, FH side, Error, Left), one big word, optional mini drawing. Words auto-size to fill the wing (18 to 27 px). Every card takes the hitter's colour, so whose shot it is shows before you read anything.
- **Serve landing** cards carry a mini half-table with the landing quarter filled (short or long, BH or FH side).
- **Live tap** gets its own colour (amber, yellow or pink), separate from both players, with a target mark. A "just tapped" shot cell uses the same colour, which links the tap to the strip.
- **Shot cells**: asked now is solid hitter colour with an ink underline; answered is a soft tint with a small tick; to ask is dashed hitter outline; not asked is grey and struck through; just tapped is the live colour; first attack is a small ink "A" badge on the corner.
- **Rally bar (B)**: frosted, translucent strip over the video. It holds the set score with each number in its player's colour, Rally and shot meta, the question in hitter colour, the cells, Star and a solid ink Check.
- **Transport**: back 10 s, play (solid ink, the largest), forward 10 s and speed, on frosted plates. Bottom right in B; top right with speed at bottom right in A.
- **More sheet**: groups for This video, Tagging (Essential or Full segmented control) and Testing (toggles, plus a destructive "Reset this rally").
- Copy stays short and plain throughout. No arrows or long dashes. Touch targets are at least 40 px, 44 px in portrait.

## Themes

| Theme | Character | Players | Live |
|---|---|---|---|
| Clay | Warm paper, white cards, soft outline and a colour lip at the top, 16 px corners | Teal, coral | Amber |
| Ink | Pure white, 2 px black rules, square corners, heavy uppercase labels, thick player edge on cards | Blue, orange | Yellow |
| Mist | Cool grey, borderless tinted pill cards, round cells, 24 px corners | Violet, green | Pink |

## Images (2x, true size)

All 36 images are in `media/blind-design/<theme>/`, one folder each for `clay`, `ink` and `mist`:

- `components.png`: the components sheet, 1180 px wide.
- `b-live.png`, `b-shot.png`, `b-serve.png`, `b-end.png`, `b-pointto.png`: layout B, 734 by 310.
- `a-live.png`, `a-shot.png`, `a-serve.png`, `a-end.png`, `a-pointto.png`: layout A, 734 by 310.
- `portrait-shot.png`: 393 by 659.

## Open points

- B's wings are 90 px wide, so "Control" sits at about 18 px. A's 127 px wings allow 24 px.
- In Full mode, four type words per wing give 59 px tall cards. That is fine for thumbs but tighter to read.
- In the sample rally, Point to previews the new score ("makes it 4 : 2"). Drop that line if it adds noise.
