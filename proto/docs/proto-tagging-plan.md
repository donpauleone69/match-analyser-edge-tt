# Proto tagging plan

How the real app's Pass 1 logic goes into the proto's Tag framework. Working level, for the build.

- Logic source: `pass1-tagging-logic.md` (real app at `f32ee22`).
- Proto base: `cursor/mvp-proto-shell-d372` at `4d0c1e8` (Details round), where the set view was a stub.
- Status: approved and built. This document now matches the build, including the changes made at approval (Tagged rule, Finish match, real video option, seeds), the two later cases (archive, removed video) the Review 1 fixes (the slot, keys, whole-match demo video; review at `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/proto-tagging-review-1.md`) and the Review 2 fixes (fixed chip rows, Re-tap where Undo was, dimmed guards, End of video; review at `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/proto-tagging-review-2.md`). Build report: `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/internal/proto-tagging-build-report.md`.
- Copy rules held throughout: thin copy, no forward arrows, no long dashes, no "clip" in Tag.

## 1. Picks

| # | Question | Pick |
|---|---|---|
| 1 | When is a set finished | When the user presses **Finish set**. The proto offers it by itself when the tagged score reaches 11 or more with 2 clear (the app's unused rule). It can also be pressed at any score that is not level, for a set the video cuts short. |
| 1 | When is the match Tagged | Either (a) a result is entered and every set it lists is finished or Not filmed, or (b) the user presses **Finish match**. With no result and no Finish match the match stays Part tagged. Archive hangs off Tagged and cannot be undone, so Tagged is never reached by accident between sets. |
| 2 | Where nudging lives | On the rally itself, in the same panel used to tag it. The rail gains a start mark and an end mark either side of the shots. Select a mark or a shot and a time row shows `- 0.1` and `+ 0.1`. Works on the open rally before Save and on any saved rally. |
| 3 | Set to set, video to video | The match has one timeline: its videos end to end in list order. Tagging keeps one position on it. A new set starts where the last one finished, on the same picture, with no file pick. When a video ends the next one starts. |
| 4 | Entered versus tagged score | Tagging always shows and writes the tagged score. They are compared when the set is finished, and shown in three places: the finish panel, the checklist row, Details. Finishing never writes the entered score: an entered score is only ever what the user typed, or what **Use tagged score** copied on request. So reopen, edit, finish again cannot make a mismatch nobody entered. A mismatch offers **Use tagged score**. |
| 5 | Not filmed | Only the user's "Mark not filmed" on the checklist, on a set with no tagging. Nothing infers it: not a missing video, not a video that ends early, not an unstarted set. |
| 6 | Resume, save, next rally | One exit (Back), no dialog; the draft is always kept. Reopening lands on the exact rally and step; between rallies it is paused on the frame, and an open rally loops on arrival as it did when it was left. Save is the only save: it writes the rally, moves the score and lets the video run on at the speed the user was watching at. No Continue, no Next rally, no Done versus Leave, no confirms (undo instead). |

Reasons and detail follow.

### 1. Finished set, Tagged match

The app's own logic is not sound here: its `Done` takes any score and nothing prompts at 11 (it ran to 12 - 3 in testing). So the fallback applies, with one automation added.

- **Steps are per rally, not per set.** The checklist's three badges (contacts, key moments, shot details) go. A saved rally has all three by construction, because Save is gated on them. A set row shows what a set can truly have: a score and a rally count.
- **Set states:** Not started, In progress ("7 - 5 · 12 rallies"), Finished ("11 - 7 · 18 rallies"), Not filmed.
- **Finish prompt.** After the Save, or the edit of a past rally, that makes the score a winning one, the video pauses, the status reads "Set 2 reached 11 - 7" and **Finish set** appears in the panel above the pad. The pad stays where it is, in a quieter colour, and reads **Keep tagging**. Keep tagging exists because a wrong score is more likely than a set that runs past 11. The prompt is asked once per score, so an edit that lands on another winning score asks again. After Keep tagging, **Finish set at 11 - 7** stays in the panel above the pad for as long as the score is a winning one, so it is never only in the Rallies list.
- **Finish at any score** sits in the Rallies list, with the score in the button ("Finish at 7 - 5"). A set cannot be finished level: at 7 - 7 the list says "Level, so it cannot finish".
- **Reopen.** A finished set opens to its rally list with **Reopen set**. Reopening makes the match Part tagged again.
- **Tagged match.** `derivePhase`: nothing tagged is New (no video) or Ready (video); a match with tagged rallies never reads New, even if every video is removed. With tagging it is Tagged when no set is in progress, at least one set is finished, and either (a) a result is entered and every set it lists is finished or Not filmed, or (b) Finish match was pressed. Otherwise Part tagged.
- **Finish match** sits on the finish panel beside **Start set N**, and on the checklist. Start is the main button until the sets count is a result a match can end on (`isRealResult`: 2, 3 or 4 sets to the winner); then Finish match is the main one. When the video is over and a side leads in sets, Finish match is the main one too and Start set N is not offered, since there is nothing left to tag. While the sets count is level (0 - 0, 1 - 1) Finish match is not offered at all. The label is **Continue set N** when set N is already under way. Every sets count in the set view, the checklist and Details comes from the one `matchSetsWon`. Finish match with no result offers **Use tagged result** when the count is a real result. Reopening a set, or **Reopen match** on the checklist, undoes it.
- **No result entered.** The list shows the sets used plus one spare "next set" row. The spare can be started but not marked Not filmed, so skipping never chains into more sets. Finish match drops the spare.
- **Result against tagging.** When the match is Tagged and the set winners from tagging disagree with the entered result, the checklist and Details flag it like a score mismatch, with **Use tagged result**.

### 2. Nudging

The real app has none: a mistimed contact means re-tapping the rally or deleting it and all later ones. The proto had stubs and lost them.

- Rail order: start mark, shots 1 to n, end mark. Start defaults to 1s before the serve, end to 1s after the last contact (the app's loop padding).
- Selecting a shot shows its panel as now, with a time row at the top: `- 0.1`, the time, `+ 0.1`. Selecting the start or end mark shows only the time row.
- While a mark is selected the video loops 0.5s either side of it, so the contact is seen landing.
- Marks cannot cross their neighbours. Start cannot pass the serve, end cannot come before the last contact.
- Missed or extra contact is still **Re-tap** (the app's `Let`), since a wrong count changes who hit what. Re-tap restarts 2.5s before the serve with the video running, and the pad takes a tap at once.

### 3. Sets and videos

- Position is stored as video id plus time in that video, so reordering videos in Details does not move saved rallies. The screen shows "Video 2 of 3 · 04:12".
- Opening a set parks the video at: the open draft, else the end of that set's last rally, else the end of the last rally of any earlier set, else the start of video 1.
- Seeking back is fenced at the last saved rally, as in the app. Forward is free, across video boundaries, except while tapping: Forward 10s is disabled then, and the timeline does not seek ahead, so a rally cannot jump over play.
- A video ending while contacts are being tapped closes the rally at once (no more picture to tap against). A rally never spans two videos.
- Last video ends: the pad goes dead and reads "End of video" (said once; the status line keeps the score). Nothing that can be pressed appears where the pad was. **Finish set** is in the panel above, as "Finish set" on a won score or "Finish set at 7 - 5" otherwise; a level score cannot be finished, and the panel says what to do: "Level at 9 - 9, so the set is not over. Add the next video, or correct a rally.", where "Add the next video" links to Details. The demo video holds a whole decided match, so End of video is the end of the match.
- A Not filmed set takes no video. The next set carries on from the same position.
- **Two video sources.** Add video (Tag and Details) offers **Choose file** (a local file played through a blob URL, in memory only, never uploaded or stored) and **Use demo video** (the scripted stand-in). Tagging runs the same against either: one clock drives the drawn stand-in or follows the real `<video>` element. A real file also gets a sound button.
- **Removed video.** A set whose video was removed keeps its tags and score. Its rallies stay listed but cannot be opened. If nothing of the set can be played (no video at all, or a finished set tagged wholly on the removed video) the set view shows "Video removed" and Add video in place of the player. If other videos remain and the set is still in progress, the player stays, a line says how many rallies lost their video, and an open rally on the removed video blocks the pad until it is discarded or the video is back.
- **Adding it back.** While rallies point at a removed video, the next video added takes its place (same position in the order), so those rallies play again. The demo video comes back as it was; a chosen file is trusted to be the same footage.
- **Archive.** An archive keeps only the tagged rallies. While one runs, and once a match is archived, sets cannot be reopened or tagged further: the checklist and the set view say so in one line, Start, Continue, Reopen set, Reopen match, Finish match and Not filmed go, and opening an untagged set is refused. Saved rallies still play from the archived copy, read only.

### 4. Entered and tagged

- The score bug and the checklist show the tagged score. The entered score never drives tagging, with one exception: if the tagged score reaches the entered score, the finish prompt appears then too.
- Finish panel on a mismatch: "Entered 9 - 11 · Tagged 8 - 11", **Use tagged score**, **Keep entered**. Keep entered leaves the Differs flag up in Details and on the checklist, which is the honest state: a rally is probably missing or wrong.
- Details gets **Use tagged** on each differing row and **Use tagged scores** when more than one differs. The checklist row has **Use tagged score** too. When no result is entered and the match is Tagged, the finish panel, the checklist and Details offer **Use tagged result**. Not automatic, because not every set need be filmed.
- Compared only for finished sets. In progress shows "so far", no flag (as built in `4d0c1e8`, with `finished` replacing the three flags).

### 5. Not filmed

As built in `4d0c1e8`. The set view adds no path to it. A set cut short by the video is finished at its score, not marked Not filmed.

### 6. Resume, save, next rally

| Real app | Proto |
|---|---|
| `Done` and `Leave`, explained in tooltips | Back leaves. Finish set finishes. |
| Leave mid-rally opens a three-way sheet | Back always keeps the draft. No sheet. |
| Reopen: video at 0:00 until Play | Reopen: on the frame where you were. Between rallies it is paused; on an open rally the loop is already running |
| Draft left mid-tapping is stranded | It reopens with contacts closed, at the Result step |
| Set 2: pick the file again, start at 0:00 | **Start set 2** on the finish panel, same picture |
| Four browser confirms | Act at once, with an Undo row for 6s under the status line (Re-tap, Discard, Delete rally, changes dropped by Back to live). Remove video and its confirm belong to Details and were built there. |
| Next step said twice | One status line |
| Stub: Continue, Save, Next rally | Save only. The next rally is just the next serve. |

## 2. Screens

Routes stay as they are: `/matches/:id/tag` (checklist) and `/matches/:id/tag/:setId` (set view). Back is one slot left of the title on both.

### 2.1 Tag checklist

Same at both widths (cards stack on phone, two per row from 1024px).

- Video line as now ("2 videos, in order").
- One row per set: "Set 2", state text, one main button, and a Differs badge when it applies.

| Set state | Row text | Buttons |
|---|---|---|
| Not started | "Not started" | **Start**, Mark not filmed |
| In progress | "7 - 5 · 12 rallies" | **Continue** |
| Finished | "11 - 7 · 18 rallies" | Open |
| Finished, differs | "8 - 11 · 17 rallies · entered 9 - 11" + Differs | Open, Use tagged score |
| Not filmed | "Not filmed" | Undo |

- Top of the list, when a set is in progress: one **Continue set 2** button, so resuming is one press from the tab.
- No result entered: the spare row reads "Set 3 · Not started", with Start only. Under the list: "No result entered. The next set appears as you tag. Finish match after the last set." and **Finish match** once a set is finished and none is in progress.
- Tagged: a "Match tagged" row, with **Use tagged result** when no result is entered and **Reopen match** when it was reached by Finish match.
- A result that disagrees with the tagged set winners: a flag above the list with **Use tagged result**.
- A row whose rallies lost their video adds "video removed"; a line above the list offers Add video. With no video left the list stays, under a "Video removed" prompt.
- Archive running or archived: one line above the list, and only **Open** on finished sets.

### 2.2 Set view, phone (390x844)

The main nav bar is hidden on this screen; tagging needs the height and the thumb zone. Everything down to the status line is pinned; only the shot panel scrolls.

Top to bottom:

1. **Header**, one row: Back, "Set 2", then a "Rallies 12" button on the right.
2. **Video**, full width, 16:9, score bug top left (names, sets, points, server dot). Under it the timeline: saved rallies as coloured blocks, the open rally as a soft range, contact ticks, video boundaries. Transport on the picture: back 10s, play, forward 10s, speed, mute.
3. **Rail**, one row: server chip at the left ("Sam serves", tap to switch, only before the first tap of a rally), then the start mark, then a scroller holding the shots and the end mark, then the highlight star. The start mark and the star sit outside the scroller, so a long rally never cuts them off. On a long rally the scroller keeps the cell in play in view and stops on a cell's edge.
4. **Status row**: the one status line (amber until Save is possible, then green) with the rally's second-rank actions beside it: **Undo** while tapping; **Discard** and **Re-tap** while tagging; **Back to live** and **Delete** on a past rally. They sit up here so that nothing but the pad or Save is ever under the thumb. Undo and Re-tap hold the right end at one width, and Discard sits to their left, so a press meant for Undo can only land on Re-tap, never on Discard. An Undo row appears under it for 6s after a destructive act.
5. **Panel**: empty while tapping; while tagging, the row being asked for, anchored to the bottom so it sits straight above Save. Result, wing and stroke chips are 44px tall. The **First attack** row (one button per shot from 2, plus **No attack**) lives here, not on the rail.
6. **The slot**, fixed at the bottom, full width, 80px tall. It holds exactly one control and that control never changes size or place, not even while pressed:
   - tapping: the pad, for the whole rally;
   - tagging: **Save**, alone, exactly where the pad was;
   - past rally: **Save changes**;
   - set finished: Start or Continue set N, Finish match, Sets (video over with a side ahead in sets: Finish match, Sets).

Guards against a tap meant for something else:

- For 1s after the idle timer closes a rally, a tap in the slot is a contact that came late, not a press on Save (Save cannot be lit that soon). It is added as a contact with the usual 0.3s correction, tapping reopens with the pad back in place, and the 2s idle timer starts again. After that second the slot is Save.
- For the same 1s, Re-tap and Discard ignore presses, and the panel ignores them for 0.5s.
- For 0.6s after the slot changes (Play, Save, Keep tagging, Finish set) it ignores presses, so a double press does nothing.
- A panel that has just swapped (first attack row, optional rows, another shot) ignores presses for 0.6s. Picking a result swaps nothing: the result row and the wing and stroke row are both there from the start and hold their places, the second one dimmed until the result is in. A second press on a result chip keeps that result; another chip changes it.
- A control looks not ready (dimmed) for exactly as long as it ignores presses.
- At set point and at End of video nothing new appears in the slot: Finish set is in the panel above.

The pad was mid-screen in the app and Save was a small button above the rail. Both move to the bottom, into one slot, because they are the two controls pressed on every rally.

### 2.3 Set view, desktop (1440x900)

Two columns, nothing below the fold. Top nav stays.

- **Left, about 60%:** header row (Back, "Set 2", match title), video large with timeline and transport under it, then the rally list, always open: one line per rally (number, score after, winner colour, server dot, highlight), newest at the top, the next rally as the first row.
- **Right, about 40%:** score and server chip, rail, status row (with Undo, or Re-tap and Discard), panel, and at the bottom the slot: the pad, then Save.
- **Keys**, each shown as a small hint on its control:

| Key | Does |
|---|---|
| Space | The pad: play when paused, tap when playing. In the first second after a rally closes it adds a late contact; after that it does nothing while tagging |
| Backspace | Undo the last tap |
| Enter | Save, whenever Save is lit, whatever has focus. It never presses the focused button. Same on a past rally (Save changes) |
| Q W E R T Y | Result: Winner, Lucky, In-Net, Long, Wide, Air |
| A S, D | BH, FH, Pivot |
| Z X C V B N M , | Strokes, in the panel's order |
| 1 to 9 | Pick a shot. While the first attack is being asked for, marks it |
| 0 | No attack |
| [ ] | Step through the start mark, the shots and the end mark |
| - = | Nudge the selected mark or shot by 0.1s |
| K, Left, Right | Play or pause, back 10s, forward 10s |

A whole match can be tagged from the keyboard.

The app at this width is the phone column stretched, with a 1300px tap bar and an empty lower half. Two columns put the picture and the controls side by side and give the rally list a permanent home.

### 2.4 States of the set view

| # | State | Video | Rail and status | Bottom control |
|---|---|---|---|---|
| A | No video, or set Not filmed | none | none | Guard as now: "Back to Tag" |
| B | Parked (new set, or resumed between rallies) | Paused on the resume frame | Empty rail. "Set 2 · 7 - 5" | Pad reads **Play** |
| C | Watching | Playing 1x | Empty rail. "Tap each contact" | Pad reads **Tap serve** |
| D | Tapping | Playing 0.75x | Cells fill, hitter colours, the rail scrolls to the cell in play. Undo beside the status line | Pad reads **Tap shot 3**, full width, with a thin 2s idle bar |
| E | Result | Loops the rally, starts 1s before the end shot | Locked on the end shot. "Result of shot 4". Discard and Re-tap beside the status line. Result row, with the wing and stroke row dimmed under it, straight above the slot | **Save** (off), alone, where the pad was. For the first second a tap here is a late contact |
| F | End shot | Loops the end shot | "Wing and stroke of shot 4" | same |
| G | First attack | Loops the rally | "Pick the first attack". First attack row in the panel: one button per shot, and No attack | same |
| H | First attack shot | Loops that shot | "Wing and stroke of shot 3" | same |
| I | Ready | Loops the rally, or the selected shot | Green. "Ready to save" | Save lit |
| J | Timing | Loops 0.5s either side of the mark | Time row for the mark | as E to I |
| K | Saved | Runs on from the rally's end at the watching speed | Back to C | Pad, back exactly where Save was |
| L | Set point | Paused | "Set 2 reached 11 - 7". **Finish set** in the panel. After Keep tagging it stays as "Finish set at 11 - 7" while the score is a winning one | Pad, quieter, reads **Keep tagging** |
| M | Finished | Paused | Score, entered beside tagged if they differ (Use tagged score, Keep entered), Reopen set | **Start set 3** (or **Continue set 3** when it is under way), **Finish match** (not offered while the sets are level; the main one once the count is a real result), Sets. With the video over and a side ahead in sets: Finish match first, no Start set. After Finish match: "Match tagged", Use tagged result, Open match Insights, Back to sets |
| N | Past rally (from the rally list) | Loops that rally | Its rail and panel, editable, with timing. Back to live and Delete beside the status line. Back to live with unsaved changes drops them and offers Undo, which reopens the rally with the changes | **Save changes**, lit once something changed |
| O | Video boundary | Next video starts | Label "Video 2 of 2" | unchanged |
| P | End of last video | Stopped. Play and Forward 10s dimmed | The score. **Finish set** (or "Finish set at 7 - 5", or the level line with its "Add the next video" link) in the panel | Pad dead, reads **End of video** |
| Q | Finished set reopened | Paused at its end | Rally list | Reopen set |
| R | Video removed | No player if nothing of the set can be played; else the remaining videos | "Video removed", Add video, score and rally list kept; or a line counting the rallies without video | Rallies without video cannot be opened. An open rally without video: **Discard rally**, Back to sets |
| S | Archive running, or archived | Plays saved rallies only | One line saying sets cannot be reopened or tagged further. No Reopen set | A rally opens read only with **Back to set**. An untagged set is refused |
| T | Real video file | The chosen file, same clock, loops and speeds | As B to Q | As B to Q, plus a sound button |

Skips, as in the app: a serve-only rally goes E to I; an end on shot 2 goes F to I; a first attack on the end shot skips H.

Opening the Rallies sheet on phone pauses the video and closing it carries on. Back 10s that is stopped by the fence says "Stops at the last saved rally" on the picture for a moment; inside an open rally it says "Stays in this rally".

State B is new. In the app a tap on a paused video both starts it and records a serve at the paused frame, which after a resume is wrong. Here the first press only plays.

### 2.5 Shot panel

As the app: Result row (end shot only), Shot row (BH, FH, Pivot, strokes; on the end shot it is shown dimmed until the result is picked), then optional rows by role (`pass1-tagging-logic.md` section 4), Review, and Miss reason on a reviewed error. Changes: the time row on top; the full stroke list at every width, wrapped (the app drops Chop, Smash and Lob on phone); chips 44px tall on phone; serve depth reads Short, Half, Deep, so "Long" appears once on the serve and keeps one meaning (the ball went long); the first attack is picked in the panel's First attack row, where picking another shot moves it and No attack clears it.

## 3. What improves on the real app, and why

| Change | Why |
|---|---|
| Finish prompt at a winning score | The app never says a set is over and accepts 12 - 3 |
| One exit, draft always kept | Done versus Leave is the main confusion; it needs tooltips to explain |
| Resume on the frame | The app shows 0:00 and the place appears only after Play |
| Sets share one running video position | The app asks for the file per set and restarts at 0:00 |
| Videos managed in Details only | The app's file picker and Change chip sit on the picture while tagging |
| Timing nudges on the rail | The app's only fix is re-tap, or delete the rally and all later ones |
| One rally list that opens rallies for edit | The app splits this over History, Viewing past and a separate edit route |
| One status line | The app says the next step twice, and the server three times |
| Pad and Save at the thumb on phone, in one slot that never changes | The two controls used on every rally. Nothing else appears or moves under the thumb |
| A tap in the slot in the first second after a rally closes is kept as a contact | In the app a tap just after the 2s hand-over lands on whatever replaced the tap bar |
| Keys for result, wing, stroke and first attack | A rally can be tagged without the mouse |
| Two columns on desktop | The app stretches the phone column |
| Undo instead of confirms | Four browser confirms interrupt a fast pass |
| "Re-tap" for the app's `Let` | "Let" already means something in table tennis |
| Pad plays first when paused | Stops a serve being recorded at the resume frame |
| Idle bar on the pad | The 2s hand-over is invisible in the app; a hint string explains it |

Kept exactly: contacts then tags, 0.75x while tapping, 0.3s correction, 2s idle, stage order, save gate, the three skips, derived hitter, winner, score and server, role-based optional detail, loop windows, auto advance.

## 4. Real and faked in the proto

**Real (ported, running):**
- Contact capture against a running clock: 0.3s correction, 0.75x, 2s idle, Undo.
- The rally model: end shot, stage order, save gate, auto skips, first attack mark, clear and move, No attack, hitter alternation, winner.
- Score, server rule (2 each, alternating from 10 all), server override, sets won.
- Save with auto advance; rally and shot loops; seek fence; speed (kept across Save and sets) and transport.
- Re-tap, Discard, delete, edit a past rally with later scores re-chained; timing nudges.
- Set point detection, Finish set, reopen; Tagged by result or Finish match; entered against tagged; Use tagged score and Use tagged result.
- A real local video file as the picture (blob URL, in memory only), tagged exactly like the stand-in.
- Tagging closed under archive; sets and rallies coping with a removed video, and lining up again when it is added back.
- One position across sets and videos; draft and resume to the frame.
- Optional detail is captured and kept on the rally.

**Faked:**
- The demo video. A stand-in: a drawn table and a ball driven by a clock, following a scripted match (serves, contacts, gaps between points, a break between sets, two videos for Club night). The script is a whole decided match: three sets ending 2 - 1 when no result is entered; with a result, the sets and their winners follow it, entered set scores are played out point for point, and Not filmed sets are left out. So End of video is the end of the match, for County open and for Use demo video on a new match. The ball changes direction at each scripted contact, so there is something true to tap against. No file, no sound. (Choose file gives a real picture instead.)
- Storage. The demo store is in memory: resume works across the app, a browser reload resets everything, as for the rest of the proto.
- Insights do not read the tagged rallies; they stay seeded.
- Archive, upload and file size stay stubs. The archived copy is the same picture with the same times; rallies are not really cut out and joined.
- A chosen file that replaces a removed video is not checked to be the same footage.

## 5. Build notes (as built)

All under `proto/src/`.

- `features/tagging/rally.ts` (rally model: stages, save gate, skips, first attack, roles, marks and nudging), `score.ts` (points, server rule, set won), `script.ts` (the scripted stand-in: `matchScript` builds a whole decided match from a result and the entered set scores), `shotKeys.ts` (the desktop keys for result, wing, stroke and No attack), `timeline.ts` (videos end to end), `matchOps.ts` (pure changes to a match: save, replace, delete, finish, reopen, use tagged), `usePlayer.ts` (one clock for stand-in or real file: rate, loop, fence, boundary), `tagLock.ts` (archive lock).
- Screen: `features/tagging/TagSetScreen.tsx` (route guard, set view, rally list, finish panel, no-video view), `VideoStage.tsx` (picture, score bug, transport, timeline), `ShotRail.tsx`, `ShotPanel.tsx`.
- `data/demoStore.tsx`: set has `finished`, `firstServer`, `rallies`, `draft`; video has `kind`, `durationS`, `script` or `src`; match has `tagDone`; `derivePhase`, `isMatchTagged`, `isArchived`, `missingVideoIds`; `addVideo` (demo or file, relinks a removed video), `mutateMatch`.
- Seeds (Filled): Open trial vs Lee (no video), County open vs Kim (video, nothing tagged), Club night vs Sam (two videos, set 1 finished, set 2 part way with an open rally, set 4 Not filmed), League final vs Pat (Tagged, one score mismatch).
- `features/match/MatchTagChecklist.tsx` and `AddVideoChoice.tsx`; the `finished` flag and Use tagged buttons in `MatchDetails.tsx`.
- `layout/AppShell.tsx` hides the phone nav on the set view; `pages/MatchPage.tsx` lets the set view carry its own header; `index.css` has the player and first attack colours and the idle bar.
- Sets count and result checks use `matchSetsWon` (`demoStore.tsx`) and `isRealResult` (`features/match/matchChecks.ts`), shared with the checklist and Details.
- Checked at 390x844 (touch) and 1440x900 (mouse and keys) in headed Chrome by tagging a whole match end to end, with late and off-centre taps.

## 6. Open points for Paul

- Use tagged result is offered, not automatic.
- Phone hides the main nav while tagging.
- With no result, the spare "next set" row cannot be marked Not filmed.
- The next video added after a removal takes the removed video's place. If the wish is to add different footage instead, this needs a choice.
- Once archived, saved rallies are read only (no tag edits either), since the archive is built from them.
- Finish match is offered at 1 - 0 (as a second button, or the main one when the video is over) but never at a level count. Use tagged result is offered only for a count a match can end on.
- No Undo row after Finish set: Reopen set, on the same panel, is the undo.
- Serve depth reads Deep where the app says Long.
- A second press on a result chip keeps the result (it used to clear it). To change it, press another chip.
