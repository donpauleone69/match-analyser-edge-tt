# Fresh tagging design, style guide v3

The v0.15 prototype (`proto/` on `cursor/mvp-proto-shell-d372`), given more video in landscape and a readable light theme. Same Best + FA flow, same questions, same buttons: only space, layout and theme change. Phone portrait 393 x 660 and phone landscape 660 x 393 first. A design for Paul's sign off: nothing in `proto/` or `app/` has changed.

- **Canvas, phone first:** [Fresh tagging design, style guide](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/7c5f04e3-951d-43aa-8f4c-0bc9c3ee0bf9). Tabs: Start, iPhone 15, Theme, Components, Portrait, Landscape, Responsive, Screens, History.
- **Latest:** the iPhone 15 in Safari pass, below. It sizes the screens to Safari's real page and moves everyday controls onto the picture.
- **Images:** `media/fresh-design/v3/`, true size at 2x, rendered from the same components as the canvas.
- **History:** v2 is `fresh-design-v2.md` (this folder) with its canvas source in `internal/fresh-design-canvas-v2.tsx`. v1 is `fresh-design-v1.md` with its [v1 canvas](https://cursor.com/canvas/store-7c210afe-9d07-40db-82c4-34e629d311ff/2b779b80-7719-478c-ad55-cb68b3f2e1ed).

## The problem, measured
v0.15 at 660 x 393, Shot 3 question:

| Zone | Today | v3 |
|---|---|---|
| Nav bar | 40 across the centre | Gone. Lives in the wing tops |
| Wings | 168 each | 112 each |
| Video picture (16:9) | 235 x 132 | 412 x 232, 3.1 times the area |
| Timeline | 28 under the video | Shares one 32 row with transport |
| Rally row | 114 (header 32, cells 40, parts 28) | 66 (cells 34, parts 28) |
| Question | 79 | 32 |

Portrait keeps its 393 x 221 video, with 1 corner pill on it instead of 7 controls.

Today, landscape:

![Today, landscape](../../media/fresh-design/v3/now-landscape-shot.png)

v3, landscape:

![v3, landscape](../../media/fresh-design/v3/landscape-shot.png)

## Six moves
1. **No nav bar in landscape.** Back, set and score sit in the top of the left wing. Rallies and More sit in the top of the right wing.
2. **Nothing on the picture.** Transport and the match timeline share one row under the video. One corner pill says what is playing.
3. **A slimmer Rally row.** Cells and parts only. Star and Check sit at the end of the cells.
4. **The question is the answer label.** One row names the rally, the shot and whose it is, with its one button, right above the answers.
5. **Narrower wings.** 112 instead of 168. Each answer is still 112 x 166.
6. **One order in both orientations.** Video, controls, question, cells, parts. Turning the phone moves the answers to the sides and nothing else.

## Theme: Scorebook, plain
Scorebook colours with the phone's own system font everywhere, titles included. Numbers use tabular figures, not a mono face.

| Token | Hex | Use |
|---|---|---|
| Page | `#F6F3EA` | Behind everything |
| Card | `#FFFFFF` | Outlined buttons, Tap |
| Button | `#ECE6D8` | Row buttons, tools, rest parts |
| Pressed | `#DDD5C2` | Press and lines |
| Ink | `#1B1A17` | All main text |
| Mute | `#55514A` | Rally number, small labels |
| You | `#15803D` | Your shots, cells, score |
| Kim | `#7E22CE` | Her shots, cells, score |
| Action | `#C2410C` | Tap, the ball, the open rally |
| Mark | `#1D4ED8` | Marked part, star |
| Wrong | `#BE185D` | Error ends, Check minus |

**The pad wears the hitter's colour.** Top row solid in the hitter's colour with white text, bottom row soft with ink text. Whose shot it is shows at the edge of the eye, so the eyes stay on the video. Error ends are soft Wrong with Wrong text.

**Type.** Wing 24/800, answer 22/750, question 17/700, cells and score 15/700, buttons 14/600, parts 13/600, small labels 12/600. Nothing under 12.

**Readability.** Text is ink or mute only; faint is for disabled things. Bold on anything you tap. Colour is never alone: the question names the hitter, cells carry numbers, error ends are words, a marked part carries the flag.

**Contrast.** Targets are 7 for reading text and 4.5 for labels and role text. All pass.

| Pair | Ratio |
|---|---|
| Ink on page | 15.7 |
| Ink on a button | 14.0 |
| Mute on page | 7.1 |
| White on You | 5.0 |
| White on Kim | 7.0 |
| White on a marked part | 6.7 |
| Ink on soft You, soft Kim | 14.0, 13.3 |
| Error end label | 4.9 |
| Tap label | 5.2 |
| You as text | 4.5, always bold |
| Kim as text | 6.3 |

## Components
- **Answer pad.** Left BH, right FH, on serve and every shot. Top Long or Attack, bottom Short or Control. Wing word first: BH Attack, FH Short; in landscape the wing sits above the type. End: Winner on the left, Long and In net on the right. Point to: You left, Kim right. Live: Tap. Answers never under 112 x 112: portrait 185 x 114, landscape 112 x 166.
- **Serve, four landings.** BH Long, FH Long, BH Short, FH Short, in the server's colour.
- **Question row, 32.** Rally number in mute, then what and whose. At most two controls on the right: the server switch and Not a shot on serve, Not a shot on shots, Delete last on End.
- **Rally strip.** Cells 34 high, 20 to 34 wide: asked now solid, answered soft with a tick, to ask dashed, not asked outlined, just tapped white. Parts 28 under the shots they cover; marked turns Mark blue with the flag. Star and Check, 34 high, end the cells row. Past 20 wide, rare at 13 or more shots, the strip shows the shots around the one asked.
- **Controls and timeline.** Back 10 s, play or pause, forward 10 s, the match timeline (tap to seek, rally blocks in the winner's colour, the open rally in Action), speed. Buttons 32.
- **Bar and wing tops.** Portrait bar 40: back, Set 1, the score in player colours, Rallies, More. Landscape wing tops 36. More holds Flow (Best + FA), Export, Captions, Sound and Settings.
- **States.** Pressed darkens a step in 150 ms. Answered adds the tick and opens the next question; the pad never moves. Disabled is faint text, used rarely. Focus is a 2 px ink ring.

## Phone portrait, 393 x 660
Bar 40, video 393 x 221, controls 36, cells 34, parts 28, question 32, answers 234. The answers sit in the bottom 36% of the screen.

![Portrait, Shot 3](../../media/fresh-design/v3/portrait-shot.png)

## Phone landscape, 660 x 393
Wings 112 at each side: wing top 36, then two answers of 112 x 166. Centre 412: video 412 x 232, controls 32, question 32, cells 34, parts 28. Live tapping uses both wings. Serve uses the four landings across the wings.

**Wing width is the lever.** The video is limited by width. Wings 128 give 380 x 214; 112 gives 412 x 232; below about 109 the rows under the video cap it at 235 high, so 96 only adds black bars. 112 is within 3 px of the most this screen can give.

![Landscape, serve](../../media/fresh-design/v3/landscape-serve.png)

## Responsiveness
| Class | When | Layout |
|---|---|---|
| Phone portrait | Width under 600, taller than wide | Stack: bar, video, controls, cells, question, pad |
| Phone landscape | Height under 500, wider than tall | Wings either side of the stack, no bar |
| Short landscape | Height under 380 | As landscape, parts hide while questions are asked |
| Tablet and desktop | Both sides 600 or more | Video and side panel from the v2 grid, pad as 2 x 2 |

- Rows keep their height on every screen.
- Portrait: the video takes the width, the pad what is left (at least 200). Below that the video slot shrinks first, never under 158.
- Landscape: wings are 17% of the width, from 96 to 136. The video slot is 16:9 of the centre width, capped by the height left after the rows; when the height caps it, the picture sits centred on video black.
- Nothing scrolls while tagging. Never wrap the answers.

**Aspect ratio.** The slot stays the same whatever the video, so the answers never move. Contain, never crop or stretch. 16:9 fills it; 4:3 sits in the middle at 309 x 232; 9:16 phone footage gets side bars. Turning the phone keeps the rally, the question and the playback position.

![Landscape, 4:3 video](../../media/fresh-design/v3/landscape-shot-4x3.png)

## Images
All in `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/fresh-design/v3/`. Portrait 786 x 1320, landscape 1320 x 786 (2x).

| File | Shows |
|---|---|
| `portrait-live.png` | Live tapping |
| `portrait-serve.png` | Serve, four landings |
| `portrait-shot.png` | Shot 3, You |
| `portrait-shot-kim.png` | Shot 4, Kim |
| `portrait-end.png` | End |
| `portrait-point.png` | Point to, rally one |
| `landscape-live.png` | Live tapping in both wings |
| `landscape-serve.png` | Serve, four landings |
| `landscape-shot.png` | Shot 3, You |
| `landscape-shot-kim.png` | Shot 4, Kim |
| `landscape-end.png` | End |
| `landscape-point.png` | Point to, rally one |
| `landscape-shot-4x3.png` | 4:3 video in the same slot |
| `landscape-shot-wide-780x360.png` | Wide landscape, parts hidden while asking |
| `now-portrait-shot.png` | Today, v0.15, portrait |
| `now-landscape-shot.png` | Today, v0.15, landscape |
| `iphone15-landscape-shot.png` | iPhone 15 landscape in Safari, controls on the picture |
| `iphone15-portrait-shot.png` | iPhone 15 portrait in Safari, controls on the picture |
| `iphone15-wireframe-landscape.png` | Wireframe to scale, 852 x 393 |
| `iphone15-wireframe-portrait.png` | Wireframe to scale, 393 x 852 |
| `iphone15-camera-zones.png` | Paul's examples 2, 6 and 8 with the overlay and play area on top |
| `iphone15-landscape-shot-controls-row.png` | First iPhone pass, controls row under the video |
| `components-redesign.png` | Redesigned components, Scorebook light |
| `iphone15-landscape-a-current.png` | Redesigned, variant A: the current layout |
| `iphone15-landscape-b-top-bar.png` | Redesigned, variant B: rally bar and score across the top of the video |
| `b-v2-components/iphone15-landscape-b-v2.png` | Layout B with the v2 components, landscape |
| `b-v2-components/iphone15-portrait-b-v2.png` | Layout B with the v2 components, portrait |
| `v1-styles/v1-landscape-a-shot.png` | v1 styles, layout A, Shot 3, on example 1 |
| `v1-styles/v1-landscape-b-shot.png` | v1 styles, layout B, Shot 3 |
| `v1-styles/v1-landscape-b-serve.png` | v1 styles, layout B, Serve |
| `v1-styles/v1-landscape-b-end.png` | v1 styles, layout B, End |
| `v1-styles/v1-portrait-shot.png` | v1 styles, portrait, Shot 3 |

## Layouts A and B, v1 styles
The first style guide (`fresh-design-v1.md`, Courtside night) on layouts A and B, iPhone 15. B's changes apply to both: no shot label, no 16:9 notice, the prototype's score bug. The images use Paul's example 1 as the picture; the canvas draws it.

| A, Shot 3 | B, Shot 3 |
|---|---|
| ![](../../media/fresh-design/v3/v1-styles/v1-landscape-a-shot.png) | ![](../../media/fresh-design/v3/v1-styles/v1-landscape-b-shot.png) |
| **B, Serve** | **B, End** |
| ![](../../media/fresh-design/v3/v1-styles/v1-landscape-b-serve.png) | ![](../../media/fresh-design/v3/v1-styles/v1-landscape-b-end.png) |

![Portrait, Shot 3](../../media/fresh-design/v3/v1-styles/v1-portrait-shot.png)

- **Theme:** dark ink grounds, chalk text, mint You, lilac Kim, orange ball, rose for wrong. System sans, mono numbers.
- **Answers:** v1 ink buttons, radius 10, wing in bold. Serve is the prototype's 2 x 2 from the receiver's side, Long on top. End: Winner on the left with a mint or lilac outline for the likely winner, Long and In net in rose on the right.
- **On the picture:** dark v1 pills at 80%, the score bug top left. A keeps play, back and forward top right and speed bottom right, with the rally bar under the video. B has the rally bar across the top and play, back, forward and speed bottom right.
- **Sizes:** A video 480 x 270, answers 119 x 132. B video 537 x 302, answers 90 x 132. Portrait video 393 x 221, answers 181 x 119.

## Layout B, v2 components
Paul chose variant B. It is now drawn with the v2 style guide components (`fresh-design-v2.md`) in Scorebook light with the system font, not the redesigned keys or the first v3 pads.

![Layout B, landscape](../../media/fresh-design/v3/b-v2-components/iphone15-landscape-b-v2.png)

![Layout B, portrait](../../media/fresh-design/v3/b-v2-components/iphone15-portrait-b-v2.png)

- **Dropped:** the Shot 3 · You label and the 16:9 notice. The solid cell already says whose shot it is.
- **Score:** the prototype's score bug as it is today: two rows on dark glass, server dot in the player colour, name, sets, points. 128 x 41, top left of the video.
- **Landscape, 734 x 310:** video 537 x 302, answers 90 x 132. The rally bar runs across the top of the video beside the score: a v2 paper pill at 90%, 41 high, with the rally, v2 cells 32 square in mono, Star and Check. Play, back, forward and speed are v2 paper pills, bottom right. Wing tops: Not a shot on the left, back and More on the right.
- **Portrait, 393 x 659:** video 393 x 221 with the score top left, play, back and forward top right, speed bottom right. Under it the v2 strip (rally, Star, Check, cells 40 high, part buttons 28), then back, Stroke, Not a shot and More, then the v2 stroke grid at 181 x 119.
- **v2 answers:** neutral button fill, wing in bold and type beside or under it, ink when chosen.
- **Timeline:** the v2 hairline on the bottom edge, saved rallies, the open rally and a tick per contact.

## Redesigned components
Paul found v3 too close to the prototype's components. This pass redesigns them at the v2 bar, in Scorebook light with the system font. Kept from v0.15: Best + FA, the question order, the tap pad, End and Point to. Kept from earlier passes: the iPhone 15 sizing and the overlay findings from Paul's frames.

![Redesigned components](../../media/fresh-design/v3/components-redesign.png)

- **Keys are paper, not paint.** White key, 1.5 edge, soft shadow. The hitter shows as a 3 high top edge and the wing tag (BH, FH) in their colour. Chosen fills with the hitter colour, then the next question opens. One word per key, 20 bold.
- **Serve keys show the landing.** A dot on a half table: near the end line for Long, near the net for Short, left for BH, right for FH.
- **End.** Winner keeps the last hitter's colour and name; Long and In net are Wrong raspberry with a soft fill, labelled Error.
- **Point to.** You left, Kim right, in their colours. **Live:** Tap in both wings, dashed Action orange.
- **Cells.** Asked now solid, answered soft with a dot, to ask dashed, not asked faint, just tapped an ink ring. A short bar on top marks the first attack.
- **Rally bar.** Rally and question, cells, Star, Check in one line.
- **Score.** Caps set, points in the player colours, an orange dot on the server. With names off the picture, compact on it.
- **More.** A grouped sheet: This video, Tagging, Testing. Rows 40 high.

The Portrait, Responsive and Screens tabs of the canvas still show the first v3 components.

### Two iPhone 15 landscape variants, 734 x 310
**A, the current layout.** Video 480 x 270, 16:9. Answers 119 x 132. Rally bar (28) under the video. Shot pill top left and play, back, forward top right on the picture; speed and 16:9 bottom right.

![Variant A](../../media/fresh-design/v3/iphone15-landscape-a-current.png)

**B, rally bar on the video.** Video 537 x 302, 16:9, 1.25 times A. Answers 90 x 132. The score (top left) and the rally bar (across the rest of the top) sit in paper glass at 84%, 2% to 13% down the picture. Play, back, forward and speed move to bottom right. Nothing under the video. Wing tops: Not a shot on the left, back and More on the right.

![Variant B](../../media/fresh-design/v3/iphone15-landscape-b-top-bar.png)

Both keep Paul's frames clear: the top 18% is roof or stands in all 8, bottom left stays empty for the near player's feet, and bottom right holds only the umpire or a barrier. B gives up 29 of wing width for a quarter more picture.

## iPhone 15 in Safari
Sized to the page Safari leaves with its bars showing. Video is 16:9.

| | Portrait | Landscape |
|---|---|---|
| Screen | 393 x 852 | 852 x 393 |
| Safari and system take | Status bar 59, Safari bar 134 | Safe areas 59 each side, tab bar 62, home indicator 21 |
| Page used | 393 x 659 | 734 x 310 |

Sources: screen and safe areas from [Breakpane, iPhone 15](https://breakpane.com/en/devices/iphone-15). Page heights are `window.innerHeight` measured in Safari with the bars showing, from [Marcus Badillo's device table](https://gist.github.com/marcusbadillo/0869065e852d291296cd53107c3bfb51) (659 portrait, 310 landscape). Breakpane gives 699 in portrait with the compact bar; the extra 40 would go to the answers. The landscape split of 62 and 21 is the measured 83 less Breakpane's 21.

### Wireframes to scale
Device points. Orange dashes are the play area, kept clear. Light boxes sit on the picture. The orange line on the picture's bottom edge is the match timeline.

![Wireframe, landscape](../../media/fresh-design/v3/iphone15-wireframe-landscape.png)

![Wireframe, portrait](../../media/fresh-design/v3/iphone15-wireframe-portrait.png)

### Screens
Landscape: video 480 x 270, answers 119 x 133, one 28 row under the video (rally, question, cells, Star, Check). Wing tops 28: back and score on the left, Not a shot and More on the right.

![iPhone 15 landscape](../../media/fresh-design/v3/iphone15-landscape-shot.png)

Portrait: video 393 x 221 (already full width), answers 185 x 131, since the freed controls row goes to the answers.

![iPhone 15 portrait](../../media/fresh-design/v3/iphone15-portrait-shot.png)

### What sits on the picture
Everything v0.15 draws on the video, plus its timeline row. How often each is used is a judgement; Paul can move any line.

| v0.15 control | Used | Now |
|---|---|---|
| Play or pause, back 10 s, forward 10 s | Every rally | On the picture, top right. Was bottom left, where a near player can stand |
| Match timeline (its own row before) | Every rally | On the picture, a 6 high line on the bottom edge, 20 high to tap |
| Shot number badge | Every shot | On the picture, top left, in the hitter colour, with Loop |
| Hint, such as why a step back stopped | Now and then | In the top left pill for 2 s, a few words |
| Speed | Now and then | On the picture, bottom right, with the 16:9 label |
| Score bug: names, sets, points, server | Every rally | Off the picture: the bar in portrait, the left wing top in landscape |
| Highlight star | Saved rallies | Off the picture: Star at the end of the cells |
| Clock and video number | Rare | More, its top line |
| Sound | Rare, videos play muted | More |
| Settings: answer layout, loop timing | Testing | More, Testing |
| Captions switch | Testing, stand-in video only | More, Testing |

- **Three corners.** Top left, top right and bottom right, each at most 28% of the width and 18% of the height. Bottom left stays empty. The rest is the play area.
- **Glass buttons, 30 square.** Dark glass with white icons, readable on any footage. The pill and the 16:9 label are 24 high. The 16:9 label marks the video shape for this design only.
- **More** holds: the clock and video number, Rallies (landscape), Flow (Best + FA), Export, Sound, Settings, and Testing (captions, loop timing, answer layout).

### Camera, from Paul's 8 examples
Paul's frames are in `media/filming-positions/example-1.jpg` to `example-8.jpg`, all 1920 x 1080, 16:9 (the screenshots add phone letterbox bars; the video inside is 16:9). The camera sits behind and to one side of an end, slightly raised. Measured on the frames:

- Roof, stands or wall fill the top third; floor fills the bottom quarter.
- The table sits about 33% to 68% across and 48% to 93% down.
- Players and bats stay about 14% to 83% across and 33% to 96% down, reaching out at mid height.
- Umpire and scorers sit at the sides, mid height to the bottom.

| Corner | In the 8 frames | Holds |
|---|---|---|
| Top left | Roof, stands or wall in all 8 | Shot pill |
| Top right | Roof, stands or scoreboard in all 8 | Back 10 s, play, forward 10 s |
| Bottom left | Floor in 7; the near player's feet in example 6 | Nothing |
| Bottom right | Floor, the umpire's chair and sign, or a barrier. No player, bat or table | Speed, 16:9 |

One change: play, back and forward moved from bottom left to top right, because in example 6 the near player's feet stand where they were. The lowest foot (example 6) stops just above the 6 high timeline. Nothing else touched a player, bat or the table.

![Camera zones on Paul's examples 2, 6 and 8](../../media/fresh-design/v3/iphone15-camera-zones.png)

### Sizes before and after, landscape
| Part | v3, 660 x 393 | Controls row, 734 x 310 | On the picture, 734 x 310 |
|---|---|---|---|
| Video picture, 16:9 | 412 x 232 | 423 x 238 | 480 x 270 |
| Answers | 112 x 166 | 147 x 133 | 119 x 133 |
| Wings | 112 | 147 | 119 |
| Wing top | 36 | 28 | 28 |
| Controls and timeline | 32 row | 28 row | On the picture |
| Question | 32 row | In the cells row | In the cells row |
| Cells, Star, Check | 34 | 28 | 28 |
| Parts | 28 | Hidden while asking | Hidden while asking |
| Gaps and edges | 6 | 4 | 4 |

The picture is 1.29 times the controls row version, and 2.2 times the 660 x 393 layout dropped onto this page unchanged (327 x 184). Portrait answers go from 185 x 114 to 185 x 131.

## For Paul to decide
- The pad in the hitter's colour, top solid and bottom soft.
- Serve labels wing first (BH Long), to match BH Attack.
- Wings at 112, or 128 for bigger answers and a smaller picture.
- Which controls stay on the picture, and whether top right suits his thumb for play, back and forward.
- Layout B is chosen. Whether the v2 neutral answers read well enough, or the answers should carry the hitter colour.
- Theme: v1 Courtside night (dark) or Scorebook light, and whether A still needs a look in the v1 styles.

## Checked
Each image opened and checked by eye. The canvas was rendered at 390 wide: no sideways overflow on any tab. Fonts are the render machine's system sans; a phone's own will differ slightly. The 780 x 360 case is an example, not measured on a device. The overlay boxes were drawn over all 8 of Paul's frames at 480 x 270 and checked by eye; the measured ranges are by eye on those frames, to a few percent.
