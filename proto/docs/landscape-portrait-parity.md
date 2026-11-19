# Landscape and portrait parity, v0.16.0

Tagging on a phone, mode Best + FA, corner pad (the default layout).
Build: branch `cursor/mvp-proto-shell-d372` at `dd8ff43`, folder `proto/` only. Analysis only, nothing changed.
Checked from the code, then in a browser at 393x659 (portrait) and 734x310 (landscape).
Files are under `proto/src/`. Tagging files are under `proto/src/features/tagging/`.

## Short answer

The answers, the question order and the saved data are the same in both orientations. The gaps are all in landscape layout: at 310 high the middle column is too tall, so everything under the rally row is cut off. That hides the question name, the server switch, Not a shot, Delete last, the fix rows and the foot line. The rally list also leaves the tap wings live in landscape.

## Gaps, most serious first

1. **Question line cut off in landscape.** The question name (Serve · You, Shot 2 · Kim, End · You, Point to), the server switch, Not a shot and Delete last sit above the pad in portrait. In landscape they fall below the screen. Browser: answer area 1px tall, server switch at y 279 to 307 and not tappable. Not a shot and Delete last can still be done with Check and the minus on a cell. The server switch has no landscape route.
   Code: `index.css:562-565` (middle column clips), `index.css:570-572` (picture 8.25rem), `CornerPad.tsx:92-94` (heading stays in the middle), `BestPanel.tsx:446-451` and `:478` (server switch, Not a shot, Delete last), `TagSetScreen.tsx:3190` (answer area clips). Gap.
2. **Fix rows and notes cut off in landscape.** Same cause. Hidden: the toss offer Delete first instead (`BestPanel.tsx:515-521`, reachable after a Check minus on the last cell before Serve), the serve and End notes (`BestPanel.tsx:522-526`, `:572-576`), the mismatch line with Delete first, Check, More, Add missed, Switch server, Keep as is (`BestPanel.tsx:577-605`), and the link back to End on Point to (`BestPanel.tsx:607-612`). The mismatch looks hard to reach now, since Point to follows the server (`bestFlow.ts:265-275`). Gap.
3. **Rally list leaves the wings live in landscape.** In portrait the list covers the tap zone. In landscape the list covers only the middle column. Browser: with the list open, one wing tap played the video and the next started a rally behind the list (mode tapping, 1 contact, list still open).
   Code: `TagSetScreen.tsx:4072-4087` (list inside the middle column), `:3047-3067` and `:4091-4112` (wings outside it), `:2472-2479` (opening the list). Gap.
4. **Foot line off screen in landscape.** The last saved rally, score and time left, and Finish set when a won set is kept going. Browser: y 295 to 340 on a 310 screen. Finish at in the rally list still works.
   Code: `TagSetScreen.tsx:3801-3867`. Gap.
5. **Settings menu cut in landscape.** Lead, End and Minimum fall outside the short picture and cannot be tapped. Portrait shows all fields.
   Code: `BestTimingControl.tsx:26-37` (menu inside the picture), `index.css:451` (picture clips), `index.css:570-572`. Gap, tuning only.
6. **Layout jumps at 734 wide when the wings switch off.** The 6s hold after a set-winning rally, Set over (Finish set, Not yet), Add missed, editing a rally, review, a finished set, and the Buttons layout during questions all switch to the desktop two-column layout, with a side rally list and no Rallies button. Portrait never jumps. Browser: Buttons layout serve showed the side list.
   Code: `TagSetScreen.tsx:2988-2991` (when the wings show), `index.css:584-614` (two columns from 700 wide). Looks unplanned. Not checked under 700 wide (for example 667x375), where these states stack with an 84px picture (`index.css:528-530`).
7. **Wings show the title only.** Portrait's zone adds "Rally N, live", and in Check "Tap a minus to remove a contact", and dims in Check. Landscape wings show "Tap serve" or "Delete mode" only, with no dim.
   Code: `TagSetScreen.tsx:3054-3066` and `:4098-4110` against `:3644-3654`. Likely intentional for space; small gap in Check.
8. **Captions toggle does nothing in landscape.** The toggle shows, but the captions, scene label and player names are hidden.
   Code: `index.css:573-577`, `VideoStage.tsx:376-384`. Small gap.
9. **Swap video hidden in landscape.** Portrait has it in the header. The flow picker is hidden too, but it has one option.
   Code: `index.css:566-569`. Looks intentional; a gap only if a video must be swapped mid-set.
10. **Not a shot and Delete last change size.** 23px tall in portrait, 44px in landscape. Against the consistent sizes rule; moot while landscape cuts them off.
    Code: `index.css:578-582`, `BestPanel.tsx:370`. Small gap.
11. **No double-tap guard on rotate.** The guard keys on the question, not the layout, so a tap just after rotating lands on whatever now sits under the thumb.
    Code: `bestFlow.ts:360-370`, `TagSetScreen.tsx:2992-2994`. Low risk.

## Shared issue, not parity

**Late tap after the idle close is lost in both.** The code means a tap in the second after the close to count as one more contact (`TagSetScreen.tsx:1180-1211`). With the corner pad, the pad sits over the late tap layer (`BestPanel.tsx:455` z-20 against `TagSetScreen.tsx:3195-3203` z-10), and in landscape the wings take the tap. The 1s guard then swallows it (`TagSetScreen.tsx:1177`, `:3193`). Browser: taps at 100ms and 500ms after the close added nothing, in both orientations. Gap.

## Side by side

| Control or step | Portrait | Landscape | Status |
|---|---|---|---|
| Tap to play, tap contacts | One big zone under the rally row | Two full-height wings, both tap | Same function |
| Zone second line | Rally N, live | None | Small gap |
| Check while tapping | Delete mode, hint line, dim | Delete mode only | Small gap |
| Question name | Above the pad | Off screen | Gap |
| Server switch | Serve page, and End on 1 contact | Off screen | Gap |
| Not a shot | Yes, 23px | Off screen | Gap |
| Delete last on End | Yes | Off screen | Gap |
| Toss offer, notes | Yes | Off screen | Gap |
| Mismatch fixes, More | Yes | Off screen | Gap |
| Point to, back to End link | Yes | Off screen | Gap |
| Answer cells | 2x2 grid | BH half left, FH half right | Same |
| Rally row cells, Check, Star | Yes | Yes | Same |
| Part review buttons | Yes | Yes, bottom 4px cut | Same |
| Rally replay button | Yes | Yes | Same |
| Rallies list | Covers the tap zone | Wings stay live | Gap |
| Foot line, Finish set | Yes | Off screen | Gap |
| Score bug, clock | Yes | Yes | Same |
| Transport, speed, timeline | Yes | Yes | Same |
| Settings menu | All fields | Lead, End, Minimum cut | Gap |
| Captions | Works | Toggle shown, captions hidden | Small gap |
| Swap video | Yes | Hidden | Looks intentional |
| Flow picker | Yes, one option | Hidden | Intentional |
| Header Back | Yes | Yes | Same |
| Late tap after close | Lost | Lost | Shared gap |

## Same in both

- **Question order.** Shared rules, `bestFlow.ts:329-340`: Serve (2 or more contacts), Shot 2 to the last shot, End, then Point to only on rally one until the server is confirmed. One contact asks End only. Browser: the same steps in both.
- **Answer cells.** Serve BH or FH by Long or Short (`BestPanel.tsx:99-104`), stroke BH or FH by Attack or Control (`bestFlow.ts:198-208`), End Winner, Long, In net (`BestPanel.tsx:106-111`), Point to You or opponent. Landscape moves the BH half left and the FH half right, the same columns as portrait (`CornerPad.tsx:88-108`).
- **Saved data.** One code path saves both (`TagSetScreen.tsx:1696-1755`). Browser, same answers in each: shots 1 BH, 2 FH Control, 3 BH Attack, score 1-0, list line "3 shots · Winner · FA 3 · You served".
- **Rotate mid-rally.** State is kept both ways. Rotating while tapping kept the contacts and tapping went on; rotating on Shot 2 kept Shot 2 and the next answer moved to Shot 3. The pad moves between the wings and the grid at once (`TagSetScreen.tsx:2988-2991`).
- **Layout default.** Corner pad in both (`bestFlow.ts:639-647`). Side note: the corner pad End has no Wide, the Buttons layout has 4 ends; that is the layout, the same in both orientations.

## Evidence

Screenshots from the browser check are in the run artifacts under `parity/`: idle, Check while tapping, Serve, Shot 2, End, Point to, saved, rally list, Settings open, rotate to landscape, and the Buttons layout in landscape.
