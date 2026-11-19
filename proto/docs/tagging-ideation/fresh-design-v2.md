# Fresh tagging design, style guide v2

The app style guide for tagging a table tennis match on a phone (393x660, no scroll). Logic from the [Best + FA plan](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/9027bc66-7334-4f4f-8288-502d23cb74e6) and `best-fa-main-plan.md`.

- **Read it here, phone first:** [Fresh tagging design, style guide](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/7c5f04e3-951d-43aa-8f4c-0bc9c3ee0bf9). Every rule has a diagram or a screen there.
- Version 1: `fresh-design-v1.md` (this folder), its canvas source in `internal/fresh-design-canvas-v1.tsx`, and the [v1 canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/2b779b80-7719-478c-ad55-cb68b3f2e1ed).
- Prototype: `proto-fresh/` on branch `cursor/fresh-tagging-design-b647`, [PR #134](https://github.com/donpauleone69/match-analyser-edge-tt/pull/134).
- Screens: `media/fresh-design/01` to `05`. Themes: `media/fresh-design/themes/`.

Each rule is marked in the canvas as **In the prototype**, **Partly built**, or **Rule for the build**. The prototype is phone portrait only.

## Concept: Courtside night
Watch, tap, answer with one thumb. Dark and quiet so the video leads. Every colour means one thing.

## Foundations
**Colour roles.** Five roles carry meaning, and every theme fills the same five. Neutrals do everything else.

| Role | Courtside | Used for |
|---|---|---|
| You | Mint `#6FE3C1` | Your cells, name, bars |
| Kim | Lilac `#B9A6FF` | Opponent cells, name, bars |
| Action | Orange `#FF7A33` | The ball, and the one thing to do now |
| Mark | Chalk yellow `#F4D35E` | Review marks and the star |
| Wrong | Rose `#FF5D7D` | Does not add up, error ends, the Check minus |

Neutrals: ink 0 to 4 for page, cards, buttons, pressed and outlines. Chalk, mute and faint for text. Text on a role fill uses that role's own ink.

**Type.** System sans for words, system mono for every number. Title 22 semibold, answers 13 to 15 semibold, notes 12, tiles 11, caps labels 10 bold at 0.08em. Nothing smaller.

**Spacing scale.** 3, 4, 6, 8, 10, 12, 16, 24. Cells 3 apart, buttons 6, rows 10, screen edge 12. **Radius:** answer 10, cell 8, card 14, part 6, pills full.

**Elevation.** Depth by surface, never shadow. Page and video, then cards and pad, then buttons, then pressed. Sheet over a 60% scrim.

**Motion.** Press 150 ms, ripple 450 ms, video height 300 ms, the quiet bar fills over 2 s, toast stays 3.2 s. Nothing moves the answers. Reduced motion drops transitions to 1 ms; the quiet bar still fills.

**Icons.** Eight: star, flag, check, minus, play, pause, grid, close. 24 grid, 2.2 stroke. A word beside every icon except Close and Star, which carry spoken labels.

## Layout
**Column grids.** A column is about 88 wide on every device, so an answer is the same size everywhere and spare space goes to the video.

| Device | Usable | Columns | Margin, gutter |
|---|---|---|---|
| Phone portrait | 393 x 660 | 4 | 12, 6 |
| Phone landscape | 730 x 360 | 8 | 12 plus safe area, 8 |
| Tablet portrait | 820 x 1120 | 8 | 24, 12 |
| Tablet landscape | 1180 x 760 | 12 | 24, 12 |
| Desktop | 1440 x 820 | 12, max 1280 | centred, 16 |

**App zones, phone portrait** (measured in the prototype):

| Zone | Where and size | Rule |
|---|---|---|
| Score bar | Top, 44 | Two buttons at most. Rare actions only. |
| Video | Under the bar. 221 live, 158 in questions | 16:9 inside. Corner pills only. |
| Rally strip | Under the video, 110 | Header 32, cells 40, parts 28. One line. |
| Title | Above the answers, 44 | What, which shot, who, how many left. |
| Answers | 12 above the bottom, up to 254 | Grow upward. Rows below never move. |
| Tap pad | Live, at least 213 | The whole pad is one target. |
| Saved rally | Live, above the pad, 152 | Stays until the next contact. |

**Layout templates.** Phone landscape: video left at 390 x 219 with the strip under it, panel 340 wide on the right with score, title and answers. Tablet portrait: video across the top, title bottom left, answers bottom right. Tablet landscape and desktop: video and strip on 8 columns, title and answers on the last 4. Overview tiles 6 across on phone, 12 on wide screens.

**Responsiveness.** Width classes Compact under 600, Medium 600 to 1023, Expanded 1024 and up; Short is under 640 tall. The answer zone stays 4 columns, at most 420 wide. The video grows first, then the strip, then margins. Tagging never scrolls on any device. On short screens part buttons hide during questions and the video holds at 140 or more; under 610 tall, use landscape. Up to 14 cells fit one line at 393.

**Aspect ratio and orientation.** The video is a 16:9 slot, contained, never cropped or stretched. Minimum 140 high, target 158 or more. Controls only in the four corners, never the middle third where the ball is. Landscape gives the video at least half the width. Turning the phone keeps the rally, the question and the playback position.

## Components
**Button sizes.** Answer 44, small 36, bar 32, part 28.

**Spanning.** Four choices take 1 column each, two take 2 each, the stroke grid is 2 x 2 with BH left and FH right. In the fix row Delete last and Delete first grow while Check and More hug. Three rare fixes take equal thirds at 36. One action is full width. Order never changes, labels never wrap, hugging buttons are at least 56 wide.

**Touch and reach.** Every answer sits in the bottom 40%, the easy thumb zone. Primary targets 44, 6 apart. Part buttons at 28 are the one exception: full part width, at least 46, and marking is never in a hurry.

**States.** Answers: rest, pressed, chosen, player chosen, hint (outline only, never pre-chosen), the action, error chosen, disabled, focus ring. Cells: now, done, to ask, not asked, first attack, playing, Check minus. Parts: rest and marked with the flag. Star on and off.

## Access and copy
**Contrast.** Worked out from the tokens for all four themes, run with `npm run check:contrast`. All 72 pairs pass: text 7+, secondary and every role as text 4.5+, captions 3+, labels on fills 4.5+, the ball on the table 3+. The lowest are Scorebook You and Action as text, at 4.5 and 4.7.

**Never colour alone.** Cells carry the shot number, the title names the hitter, a marked part carries the flag, and wrong is a sentence. Focus ring and reduced motion are built. Spoken labels are partly built: cells should read "Shot 6, Kim".

**Copy.** Thin: buttons 1 or 2 words, titles 1 to 3, lines one sentence. Sentence case. You and the opponent's first name. Digits for numbers. Verbs first on actions. Explain, never blame. A middle dot between facts. Plurals right. Never: the word clip, Middle as a part, arrows, long dashes, a Save button, exclamation marks.

## Alternative themes
Each fills the same five roles, so meaning never changes. Switch in the prototype from **Demo, Theme**, or with `?theme=scorebook`, `floodlight` or `bluetable`.

| Theme | Rationale | Type | You, Kim, Action, Mark, Wrong |
|---|---|---|---|
| Scorebook | Print light for bright halls and desk review, like a paper scoresheet marked in blue pen. | Serif titles, system sans, system mono | Green, purple, burnt orange, pen blue, raspberry |
| Floodlight | Pure black and full strength colour for glare and OLED battery. The most legible. | Inter with heavy titles, JetBrains Mono | Cyan, magenta, lime, yellow, red |
| Blue table | Mid tone navy, the colour of the table, so the app feels like the venue. | Cantarell, Cascadia Mono | Green, orchid, ball yellow, sky, coral red |

Light themes darken every role so it works as text on paper and as a fill under white. Each theme would ship one local font file; the screenshots use the fonts on the render machine.

| | Tagging | Insights |
|---|---|---|
| Courtside | ![](../../media/fresh-design/themes/courtside-tagging.png) | ![](../../media/fresh-design/themes/courtside-insights.png) |
| Scorebook | ![](../../media/fresh-design/themes/scorebook-tagging.png) | ![](../../media/fresh-design/themes/scorebook-insights.png) |
| Floodlight | ![](../../media/fresh-design/themes/floodlight-tagging.png) | ![](../../media/fresh-design/themes/floodlight-insights.png) |
| Blue table | ![](../../media/fresh-design/themes/bluetable-tagging.png) | ![](../../media/fresh-design/themes/bluetable-insights.png) |

Review marks in each theme: `media/fresh-design/themes/<theme>-tagging-marks.png`.

## The loop
1. **Live:** video at 221 and a full width tap pad. One tap per contact. 2 s of quiet opens End.
2. **Questions:** video at 158, looping the shot asked. End with Point to and the last stroke, Serve, 2, 3, 4 on 7+ shots, then the End shots.
3. **Does not add up:** one rose line, then Delete last, Delete first, Check, More.
4. **Saved:** the rally card stays above the pad. Part buttons mark for review, the star in the header.
5. **Overview:** Set 1, Set 2 or Match. Rally tiles and each rally's overview; Insights in Attack, Serve, Points, Review.

## Decisions
- A column is about 88 on every device; answers keep phone size and the video gets the room.
- Landscape: video left, answers right, panel side following a handedness setting.
- Themes are token sets with five fixed roles and one contrast table.
- Part buttons stay 28 high, the one small target. Revisit after a real device test.
- Earlier decisions (dark default, shot 4 on 7+ shots, video heights, tiles) are unchanged; see the canvas Logic tab.

## Run it
```
cd proto-fresh
npm install
npm run dev            # http://localhost:5190, best at 393x660
npm run build          # tsc -b and vite build
npm run check:logic
npm run check:contrast
```
No new dependencies. `app/` and `proto/` are untouched.

## Checked
- Typecheck, build, logic and contrast checks pass.
- All four themes walked headless at 393x660 through the same 28 states: nothing scrolls or is cut off, no page errors, no banned copy.
- Every theme image was opened and checked by eye. The canvas was rendered at 390 wide with no sideways overflow on any tab.
