# Orientation parity plan, proto tagging screen

Build v0.16.1, `7f3b893`. Plan only. TSS is `proto/src/features/tagging/TagSetScreen.tsx`, CSS is `proto/src/index.css`. Flow and saved data stay as they are.

## One layout per orientation

Portrait stays as it is. Landscape means any landscape window, so tablets and desktop get it too.

| Variant today | Change | Where |
|---|---|---|
| Two landscape tests: the corner pad from any landscape, the tap wings only at 500 high or less | One test drives both | TSS:387-411, 465-466, 2940-2943 |
| Two columns with a side list from 700 wide, used by the 6s hold, Set over, Add missed, Edit, review, finished and the Buttons layout | Delete. The wing columns stay up and go blank in those states, so nothing jumps. The Rallies button always shows | CSS:578-608, 517-519; TSS:3077 |
| Phone sizes only at 500 high or less | Move them into the base landscape rules | CSS:527-577 |
| Top nav from 768 wide | Hide it on the tagging route, like the bottom nav | `AppShell.tsx:58` |

## Wings and tap zone

- **Labels.** Portrait wins: each wing shows the title and the second line ("Tap serve / Rally 9, live"). In Check it shows "Delete mode / Tap a minus to remove a contact" and dims. Portrait gives more information, and Paul asked for the same labels. TSS:3006-3017 and 4038-4049 against 3593-3594.
- **Guards.** The zone and both wings use the same guards. Today the wings also carry the panel guard (TSS:3004, 4036).
- **Inert under overlays.** The zone and the wings ignore taps while the rally list or Settings is open. This is new in both orientations: Settings never covered the portrait zone. Settings' open state has to move up into TSS. TSS:4013, `BestTimingControl.tsx:25`.
- **Rotate.** A rotate starts the same double-tap guard (TSS:2944-2946).

## Other differences

- **Settings cut off in landscape.** Portrait wins: draw the menu outside the clipped picture. `BestTimingControl.tsx:27-38`, CSS:451.
- **Demo scene label and player names hidden in landscape.** Portrait wins: show them in both (CSS:572-576).
- **Mismatch line** (`BestPanel.tsx:509`). Not yet tested in landscape; check it during the build.

## Deletions from Paul's references

Each deletion applies to both orientations.

1. **Match name next to "Set N"** (TSS:4237). The match page, reached by Back, still shows it. This also removes the 480-wide breakpoint.
2. **Captions toggle** (`VideoStage.tsx:282`, 376-385). Captions exist only on the scripted demo video; real files have none.
3. **Flow picker** (TSS:3024-3034, 2957-2962). The flow already defaults to Best + FA (`tagLog.ts:21`). The other flows can still be opened with `?flow=` in the address.
4. **Swap video button** (TSS:3035-3038). There is no other swap. The match page only offers Remove and Add, which detach the rallies' video. Nothing is stored, so after a reload a real file can't be played over the demo match.
5. **Foot line** (TSS:3741-3777). The rally list shows the winner and the End. The score bug shows the score and the Rallies badge shows "check". Time left appears nowhere else. Finish set, shown when a won set is kept going (TSS:2894-2898, 3798-3807), stays as a button and also stays in the rally list. When the strip is empty it collapses, so the tap zone gets taller.

## Needs Paul's decision

- With the toggle gone, are demo captions on or off? Suggest off.
- Is swap video gone for good, or should it move somewhere?
- Is losing time left acceptable?
- Do the desktop and tablet changes stand: no side list, no top nav while tagging?
- Do the wings keep the filled green style and portrait keep the plain zone, or should one look win?
- The extra spacing on screens under 660 high (CSS:611-622) and the 64px or 80px tap pad (CSS:266-276) set sizes, not layout. Keep them?
