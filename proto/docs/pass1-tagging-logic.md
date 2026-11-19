# Pass 1 tagging: how the real app works

Working-level record of the real app's Pass 1 tagger, written to port its logic into the proto.
Plan that uses it: `proto-tagging-plan.md`.

## What was documented

- **Commit: `f32ee22`** (`origin/main`, merge of PR #128, 2026-11-14). `app/` on `cursor/mvp-proto-shell-d372` is byte-identical to it (`git diff origin/main -- app` is empty; that branch only adds `proto/`). The one other branch ahead of main, `cursor/clips-load-hotfix-6570`, does not touch Pass 1.
- **Sources:** code under `app/src/` (paths in section 9) and a run of the real app in Chrome at 390x844 and 1440x900 with an ffmpeg fixture video (moving dot and a clock, 240s, not in git). 15+ rallies tagged per width through every stage, plus undo, re-tap, discard, history, delete, server switch, leave and resume, reload mid-rally, finish, reopen, rally edit, and a second set.
- **Screenshots:** `/cursor/stores/bc-70b48325-77a8-467c-a22a-db08ba6aeabb/media/pass1-tagging/` (90 files, `real-phone-NN-*.png` and `real-desktop-NN-*.png`, same numbers at both widths).
- Strings in `code font` are quoted from the app as they are, including its arrows and dashes.

## 1. The method

One pass, rally by rally, while the video plays:

1. **Tap contacts.** Watch the rally and tap once per ball contact, serve first. Nothing else is asked while the ball is in play.
2. **Stop tapping.** 2 seconds without a tap closes the rally. The last tap is the end shot.
3. **Tag the rally** while it loops on the video: result of the end shot, wing and stroke of the end shot, which shot was the first attack (or none), wing and stroke of that shot.
4. **Save.** Score and server update and the video carries on into the next rally.

Everything else (who hit each shot, who won, the score, who serves next, what can be skipped) is worked out. Optional detail can be added to any shot before Save but never blocks it. After the contacts, a 4-shot rally takes 6 taps and Save; a serve fault takes 1 and Save.

## 2. User inputs, in order

Route: `/matches/:matchId/tag?set=N&mode=pass1focus`, full screen, no app nav.

| # | Stage (`data-pass1-stage`) | Input | Control | Notes |
|---|---|---|---|---|
| 0 | before | Pick the video file | `Click to load video` area in the player | Once per set, see section 6 |
| 0 | before | Who serves first | `Serve · name` chip | Only if the default is wrong |
| 1 | `contacts` | One tap per contact | Big `Tap serve`, then `Tap contact N` | First tap starts play if paused |
| 1 | `contacts` | Remove last tap | `Undo` | Shown after the first tap |
| 2 | `end_details` | Result of the end shot | Winner, Lucky, In-Net, Long, Wide, Air | Rail is locked on the end shot |
| 3 | `end_shot` | Wing, then stroke, of the end shot | BH, FH, Pivot and the stroke list | Skipped when the rally is a serve only |
| 4 | `select_fa` | First attack | Tap a shot on the rail (2 or later), or `No / Atk` | Skipped by the rules in section 3 |
| 5 | `fa_details` | Wing and stroke of the first attack | BH, FH, Pivot and Flick, Loop, Drive, Smash | Tap the FA caption to undo, tap another shot to move it |
| 6 | `optional` | Save | `Save` | Lit only when all of the above is done |
| any | `optional` | Optional detail | Tap a shot on the rail | Section 4 |
| any | form | Highlight the rally | `★ / HL` cell on the rail | Hidden while the rail is locked |
| any | form | Start the rally over | `Let` (re-tap contacts), `Discard` (drop the rally) | Both ask with a browser confirm |

Stroke lists: first attack is Flick, Loop, Drive, Smash. End shot is Flick, Loop, Drive, Smash, Lob, Block, Push, Chop. Below 640px the end list drops Chop and the reply list drops Smash and Lob.

Video controls on the player, always there: back 10s, forward 10s, slower, speed, faster, mute, play. Keys: Space or K play, J and L 10s, arrows and `,` `.` frame step, F full screen. There is no key for tapping a contact.

## 3. What the app works out

| Thing | Rule | Where |
|---|---|---|
| Contact time | Video time at the tap minus 0.3s (reaction time), never before the previous contact or the last saved rally's end | `captureContactTime` |
| Speed | 0.75x from the first tap of a rally until Save, then back to 1x | `handleTapContact`, `handleSave` |
| End of tapping | 2s with no tap closes the rally | `CONTACT_IDLE_MS` |
| End shot | Always the last contact | `timelineFromContacts` |
| Who hit each shot | Server hits shot 1, then alternate | `playerForShot` |
| Winner | Winner or Lucky: the end shot's hitter. Any error (In-Net, Long, Wide, Air): the other player | `inferWinnerName` |
| Score | Winner's points plus one, kept as a running chain per rally | `handleSave`, `deriveRallyScoreChain` |
| Server | 2 serves each, alternating every point from 10 all, from the set's first server | `calculateServer` |
| First server | Set 1: the match's player. Later sets alternate from set 1. The chip overrides it by re-anchoring the first server so the rule still gives the chosen server at the current score | `handleSetServer`, `matchReviewActions` |
| Serve-only rally | Only the result is needed. No wing, stroke or first attack | `isEndAttrsComplete`, `isFosDecided` |
| End on shot 2 | Once wing and stroke are in: a defensive stroke (Push, Block, Chop, Lob) sets No attack, an attacking stroke makes shot 2 the first attack. Neither is asked | `applyImpossibleFaAutoSkip` |
| First attack on the end shot | Its wing and stroke are already known, so stage 5 is skipped | `isFaAttrsComplete` |
| Save gate | End, result, first attack decided, and its wing and stroke if one is marked | `canSaveRallyTimeline` |
| Shot roles | Serve, receive, ball before attack, first attack, reply, later, end shot, from position against the first attack | `derivePass1ShotTagRole` |
| Which optional fields a shot gets | By role, section 4. The same list strips anything else on save | `derivePass1ShotTagAllowList` |
| Video while tapping | Plays on. Seeking is fenced to after the last saved rally | `applyTappingConstraints` |
| Video when tapping closes | Mutes, selects the end shot, loops the rally (serve minus 1s to last contact plus 1s), starts 1s before the end shot | `finalizeContacts`, `loopWindowFromContacts` |
| Video while tagging | No shot selected: loops the whole rally. Shot selected: loops that contact to the next | `shotLoopWindow` |
| Moving on inside a rally | After the end shot is done, and after the first attack is done, the shot panel closes and the whole rally loops again | stage transitions in `Pass1FocusComposer` |
| Video after Save | Speed 1x, jumps to that rally's last contact and plays on. This is the auto advance | `handleSave` |
| Draft | Every change is written to localStorage per set | `pass1FocusDraftStorage` |
| Sets won so far | Counted from earlier sets for the score bug | `deriveMatchSetsBeforeSet` |
| Previous shot's placement | Read off wing and pivot of the next shot when saving | `derivePreviousPlacementFromWingPivot` |
| Mute | On by default in the tagger | `useTaggingMuteDefault` |

## 4. Optional detail by shot role

Shown in the shot panel under the required rows. Never blocks Save.

| Role | Fields |
|---|---|
| Serve | Spin (Under, Top, Side), Depth (Short, Half, Long), Ball (High, Heavy) |
| Receive and other shots before the first attack | Wing and pivot, Depth, Ball (High, Heavy) |
| First attack | Wing, pivot, stroke, Contact (Over table, Off table), Safe or Aggressive |
| Reply to the attack, and the shot after it | Wing, stroke, Initiative (Behind, Level, Ahead) |
| Later shots | Wing, stroke |
| End shot (not a serve) | Result, wing, pivot, stroke |
| Any shot | `Review` flag. On an error shot it opens Miss reason: Technical, Timing, Footwork, Positioning, Misread, Forced |

Known gaps: Aggressive is not stored (no column). Miss reason is stored only for In-Net, Long and Wide.

## 5. Undo and edit

| Action | What happens | Confirm |
|---|---|---|
| `Undo` (tapping) | Drops the last tap and seeks back to it. Speed returns to 1x when none are left | none |
| `Let` | Clears contacts and tags, back to tapping, seeks to 1s before the serve | browser confirm |
| `Discard` | Drops the open rally, video goes to its end | browser confirm |
| FA caption, or tap another shot | Clears or moves the first attack | none |
| `No / Atk` | Toggles on and off | none |
| `Hist · N`, then a point | Plays that rally read-only (`Viewing past`), `Live →` returns | none |
| `Hist`, then `Del` | Deletes the last saved rally and rolls the score back | browser confirm |
| Rally edit (`/matches/:id/edit-rally?set=N&rally=R`, from Match Review) | Same shot panel on a saved rally: server, result, strokes, first attack, optional detail, highlight. `Save fix` re-chains later scores | warns if the winner changes |
| Fix a contact's time | Not possible. Either `Let` before saving, or "Re-tag from rally" in Match Review, which deletes that rally and every later one | |

There is no way to nudge a contact, a rally start or a rally end anywhere in the app. Rally edit says `Contacts re-time in the tagger.`

## 6. Set end, match end, save, resume

**Save** writes the rally and its shots to IndexedDB at once, marks the set in progress and stores the running score. There is no separate save for the session.

**Set end** is manual and unchecked. `Done` (enabled after one saved rally) closes the set: winner is whoever has more points, the set is marked tagged, and the app goes to Match Review. In the run the score went to 11 - 3 with no prompt, carried on to 12 - 3, and `Done` gave "Won the set 12-3". A rule for 11 with 2 clear exists (`deriveSetEndConditions`) but Pass 1 does not call it. `Done` with an open rally asks to discard it.

**Next set** is not reachable from the tagger. Match Review, Details, `Add Set 2`, then `Start tagging` on the new row. The set 2 tagger asks for the video file again and starts at 0:00, even when it is the same file. A `Gap` jump toward the estimated start sits inside the History sheet.

**Match end** has no step. Home shows the match as tagged when every set is tagged.

**Leave** is the other exit. Between rallies it goes straight to Match Review. Mid-rally it opens a sheet: `Keep draft`, `Discard point`, `Stay`.

**Resume** (reopening the set):
- Saved rallies, score and server come back from IndexedDB. An open draft comes back from localStorage at the stage it was left.
- The video comes back paused at 0:00, not at the rally. Pressing play jumps it to the end of the last saved rally. Selecting a shot also moves it.
- A draft left mid-tapping comes back with its taps but no idle timer, so nothing happens until another tap is made, and that tap is taken at the wrong video time.
- A finished set reopens as a live tagger at the final score, ready for another serve.

## 7. Layout

One column at every width: video on top (capped at 42% of the height) with the score bug and transport over it, a context bar, then either the rail and tap pad, or the action row, rail, status box and shot panel.

**Phone 390x844.** Works, and is clearly what it was built for. The pad sits in the middle of the screen, not at the thumb. `Let / Discard / Save` is a small row above the rail. See `real-phone-03-contacts-tapping.png`, `real-phone-04-result-on-end-shot.png`, `real-phone-08-ready-to-save.png`, `real-phone-13-optional-all-shots.png`.

**Desktop 1440x900.** The same column stretched. Video stays small in the top centre, the tap pad is a 1300px bar, the bottom half is empty, the shot pills sit far left. No second column, no rally list, no keys for tapping. See `real-desktop-03-contacts-tapping.png`, `real-desktop-13-optional-all-shots.png`, `real-desktop-23-history-sheet.png`.

Key screenshots (prefix `real-phone-` or `real-desktop-`):

| File | Shows |
|---|---|
| `01-start-no-video` | Tagger before a video is picked |
| `03-contacts-tapping` | Tapping, 0.75x, rail filling |
| `04-result-on-end-shot` | Result stage, rail locked |
| `05-end-wing-stroke`, `06-select-first-attack`, `07-first-attack-details` | The next three stages |
| `08-ready-to-save` | Green status, Save lit |
| `09` to `13` | Optional detail per role, and all shots open |
| `14-after-save-next-rally` | Auto advance |
| `15`, `16` | Serve-only rally |
| `17`, `19` | Auto No attack and auto first attack on shot 2 |
| `18-review-flag-miss-reason` | Review flag and miss reason |
| `23`, `24` | History sheet, viewing a past point |
| `26-leave-dialog` | Leave mid-rally |
| `28-resumed-open-draft`, `29-reload-mid-contacts`, `44-resume-between-points` | Resume: video at 0:00 |
| `30`, `31` | 11 - 3 and 12 - 3 with no set end prompt |
| `32`, `33` | After Done, and the finished set reopened |
| `45-rally-edit` | Rally edit |
| `51` to `55` | Adding set 2, video asked for again, Gap in History |

## 8. Sound, and must carry over

- Contacts first, then tags, one rally at a time, with the idle timeout as the only hand-over.
- Slow to 0.75x while tapping, 0.3s reaction correction, back to 1x after Save.
- The rally loops while it is tagged; a selected shot loops alone.
- The stage order and the save gate: result, end shot, first attack, its stroke.
- The skips: serve-only, end on shot 2, first attack on the end shot.
- Hitter, winner, score and server all derived, with the server chip as the one override.
- The rail as the single map of the rally: number, hitter colour, FA and End captions, No attack, highlight.
- Optional detail by role, never blocking.
- Save writes at once and the video moves on by itself.
- Drafts kept without asking.
- Result, stroke and optional lists as they are (section 2 and 4).

## 9. Clunky framework, do not carry over

**Resuming**
- Video returns at 0:00 paused; the place only appears after Play.
- A draft left mid-tapping is stranded (section 6).
- Getting back in is Home or Match Review, then Details, then the set row. A direct link to a missing set gives two `Set not found` alerts.

**Video**
- The file is picked per set, inside the tagger, with a `Change` chip that stays over the picture. Set 2 asks again and starts at 0:00.
- Set-to-set movement is a `Gap` button hidden in the History sheet.
- No timing fixes (section 5).

**Saving and leaving**
- Two exits, `Done` and `Leave`, that look alike. The app explains the difference in long tooltips and hidden text (`Leave is not video Pause`).
- Nothing says a set is over. `Done` takes any score.
- Four browser confirms (`Let`, `Discard`, `Del`, `Done` mid-rally) and browser alerts for errors.
- `Let` reads as the table tennis let, but means re-tap.

**Duplicated wording**
- The next step is said twice on the tagging screen: the action row (`Choose Winner / error on the end shot row`) and the status box (`Result · winner / error / air on the end shot`). At the end both say `Ready — tap Save`.
- While tapping, the pad hint repeats the stage (`Tap contacts · next: End / FA`, then `Idle 2s → End / FA`).
- The server is shown three times: score bug dot, `Serve · name` chip, pad edge colour.
- The context bar restates the score bug (`Last · Villain · 0–1`).
- Highlight appears twice in rally edit (rail cell and footer star).

**Other**
- Past rallies have three surfaces: History sheet, `Viewing past`, and rally edit on another route with its own layout (it shows a 10-cell rail for a 2-shot rally).
- A `Simple / Pass 1` mode switch sits in rally edit.
- Desktop is the phone column stretched.
- Phone drops strokes from the lists (section 2).

## 10. Code map (`app/src/`)

| File | Holds |
|---|---|
| `features/shot-tagging-engine/composers/pass1FocusModel.ts` | The pure model: constants, timeline, stage checks, auto skips, loop windows, texts |
| `features/shot-tagging-engine/composers/Pass1FocusComposer.tsx` | Phases, tap, idle, save, auto advance, undo, leave, finish, layout |
| `features/shot-tagging-engine/blocks/Pass1FocusBlock.tsx` | Rail, status box, shot panel |
| `features/shot-tagging-engine/blocks/Pass1ContactCaptureBlock.tsx` | Tap pad |
| `features/shot-tagging-engine/blocks/Pass1ChromeProtoBlock.tsx` | Score bug, context bar, History sheet |
| `features/shot-tagging-engine/composers/persistPass1FocusRally.ts` | Save, edit, delete last, finish set, resume load |
| `features/shot-tagging-engine/composers/pass1FocusDraftStorage.ts` | Draft in localStorage |
| `features/shot-tagging-engine/composers/RallyEditComposer.tsx` | Rally edit |
| `rules/derive/shot/derivePass1ShotTagRole.ts`, `mapPass1FocusToDb.ts` | Roles, allowed fields, save mapping |
| `rules/calculate/calculateServer.ts` | Server rule |
| `rules/derive/set/deriveSetEndConditions.ts` | 11 with 2 clear (unused by Pass 1) |
| `ui-mine/VideoPlayer/` | Player, loop fence, transport, keys |
