# Set Tagger zones

The reference for the Set Tagger screen (`/matches/:id/tag/:setId`): its four zones, what each does, its layout and sizes, its states and modes, and where it lives in code. It says what is built. Plans propose changes and link here. Names Paul set on 19 Nov 2026.

## 1. Rules

1. **Each zone is one component with one layout.** A mode changes what fills the layout, never the layout.
2. **The Input Area holds input controls only, in 2 columns.** Full colour regions, 22px bold. In landscape, column 1 is the left wing and column 2 the right.
3. **One control spans both columns only when it is one action on both sides:** the contact pad (Play, Tap serve, Tap shot N).
4. **The Rally Zone shows one rally**, in a fixed set of states.
5. **Text has three homes:** a hint (2.5 s) or toast (6 s) on the picture for an event; a zone state for something that lasts; otherwise nowhere.
6. **No copies.** A control that does what another on screen does goes.
7. **Small zone buttons use the star's box:** 32px tall, 6px corners, 12px semibold, rest fill. Amber while the mode is on. A second press leaves.

## 2. Layout

| | Portrait 390x844 | Landscape 734x310 |
|---|---|---|
| Video Zone | 390 x 219 (16:9) | 366 x 206, middle column |
| Set Zone | 390 x 40 | 366 x 40 |
| Rally Zone | 390 x 64 | 366 x 64 |
| Input Area | 390 x the rest (about 520) | Two wings, full height, 184 each (at least 144) |

Portrait, top to bottom: Video, Set, Rally, Input Area. Landscape: left wing (Input column 1), middle column (Video, Set, Rally), right wing (Input column 2). The middle column is as wide as the picture: (height - 40 - 64) x 16 / 9. Nothing in the Input Area draws on the picture.

## 3. Video Zone

The picture, with Back top left, the score bug (sets, points, a server dot once the server is known), the playback row (back, play, forward, speed, mute, Settings), and the seek bar along the bottom edge with rally spans. Hints and toasts show bottom left, with Undo beside them. One message at a time.

## 4. Set Zone

One row: this set's rally pills, then Edit Set.

| Mode | Shows |
|---|---|
| Rally 1, before its server is answered | A grey dashed pill 1. Edit Set dim. |
| Tagging | The saved pills, then the open rally as a dashed pill in the next server's colour |
| Edit Set, Rallies | The picked pill ringed. Edit Set pressed. |
| Edit Set, Gaps | Gap slots between the pills, the picked one ringed |
| Set over, a saved set | No open pill |

## 5. Rally Zone

One rally, 64px, three rows:

| Row | Height | Holds |
|---|---|---|
| 1 | 32 | Head cell ("8 Kim", in the server's colour, the star's box), "at 6 - 4" (the score before the point), a word for Gap or Insert, then the actions |
| 2 | 16 | The shot cells in the hitter's colour, or the part chips in review mode |
| 3 | 3 | One line per part (Opening, Attack, Rally, End) under its shots. No text. Amber when marked for review. |

| State | When | Row 2 | Actions |
|---|---|---|---|
| Before serve | Server known, no contact | Ghost cell | |
| Gap | Edit Set, Gaps, a gap picked | Ghost cell. Word "Gap 7 s". | |
| Insert | Insert pressed, no contact yet | Ghost cell. Word "Insert". Head cell switches the server. | Cancel |
| Tapping | Contacts going in | Cells and the ghost | Discard |
| Answering | Taps closed, questions open | Cells with marks | Discard |
| Saved | Just saved, picked, Set over, a saved set | Cells | Star, Edit Rally |
| Editing | Edit Rally | Cells, ring on the stop. End is its own slot at the end of the shot row. | Star, Edit Rally pressed |
| Review | Star pressed | Part chips, ring on the focus, amber when marked | Star pressed, Edit Rally |

**Review mode.** The star toggles it. The video loops the focused part at 1x. A part chip jumps to that part and the star stays on. Edit Rally and review are exclusive. Marks are `idea.review`. Save set on Set over is live as soon as the winning rally is saved. The picture still plays on for 6 seconds.

## 6. Input Area

Two columns. Rows share the height. Empty cells are space, not boxes.

| Mode | Column 1 | Column 2 |
|---|---|---|
| Watch and tapping | Play, Tap serve, Tap shot N (spans both) | |
| Rally 1, server | You served | Kim served |
| Serve | BH Long, BH Short | FH Long, FH Short |
| Stroke | BH Attack, BH Control | FH Attack, FH Control |
| End | Winner, Not a shot | Long, In net |
| Edit Set, Rallies | Rallies, Back, Edit Rally N | Gaps, Forward, Delete rally N, Save set (a set not yet saved) |
| Edit Set, Gaps | Rallies, Back, Insert rally N | Gaps, Forward, Save set (a set not yet saved) |
| Edit Rally | Back, Delete or Out of turn, two quadrants | Forward, Kim served or space, two quadrants |
| Review | Back, Review [part] | Forward |
| Set over | Edit | Save set |
| End of the mark or the video, not won | | Save set |
| Won earlier, rallies after | Remove after N | |
| A saved set, opened | (empty) | (empty) |

Colours: player colours for You and Kim, brand for Save set, slate for Back, Forward, Edit and Remove after N, amber for a marked Review [part].

**Step modes share one pattern:** Back and Forward move the focus (rallies in Edit Set, shots in Edit Rally, parts in Review), the actions act on the focus, and the video plays it.

## 7. Where it lives

All under `proto/src/features/tagging/`. Pure rules (no React) sit beside the components.

| File | Holds |
|---|---|
| `TagSetScreen.tsx` | The screen: modes, state, and the regions it hands each zone |
| `VideoStage.tsx`, `usePlayer.ts`, `timeline.ts` | Video Zone, playback, videos played end to end |
| `SetZone.tsx` | Set Zone |
| `RallyZone.tsx` | Rally Zone |
| `InputArea.tsx`, `inputModes.ts`, `CornerPad.tsx`, `BestPanel.tsx` | Input Area and each mode's regions |
| `zoneButton.ts` | The star's box, shared by the Set Zone and the Rally Zone |
| `bestFlow.ts` | Question order, parts, review marks, loops (`bestLoop`, `editStopWindow`, `partWindow`) |
| `rally.ts`, `score.ts` | Rally model, score, server and set end |
| `setMark.ts`, `continuity.ts`, `matchOps.ts` | Set marks, gaps and serve breaks, set edits |
| `index.css` (`.tag-set`) | Zone sizes: `--tag-set` 40px, `--tag-rally` 64px |

![Portrait zones](/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/ui-zones/portrait-zones.jpg)
