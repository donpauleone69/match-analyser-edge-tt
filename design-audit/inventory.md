# UI inventory

Disposition is what a later design pass should do with the element: **keep**, **refine**, **consolidate**, or **remove**. This file does not design the replacement.

Source roots: `app/src/` (shipping) and `proto/src/` (zone tagger). Shots: `design-audit/screenshots/current/`.

## Surfaces

| Screen | Route | Source | Variants seen | Disposition |
|---|---|---|---|---|
| Account gate | `/` before a player is chosen | `app/src/features/account/composers/AccountGateComposer.tsx`, `AccountComposer.tsx` | 5 sizes. Card stack + bottom bar | Refine. Repeats “continue on this device”. Training and import sit on the gate |
| Home | `/` | `features/home/composers/HomeComposer.tsx` | Empty; one match in progress | Keep the three jobs (what’s left, recent, clips). Refine: duplicate New match, empty lower half on desktop |
| Find | `/matches` | `features/match-management/composers/MatchListComposer.tsx` | Empty; one row | Keep filters and rows. Refine density |
| New match | `/matches/create` | `features/match-management/sections/MatchFormSection.tsx` | Phone. Opponent optional, default name Villain | Keep the short form |
| Review Summary | `/matches/:id?tab=summary` | `features/match-review/sections/SummarySection.tsx` | In progress, no saved rally | Keep the empty line. Tagged stats were not captured |
| Review Details | `?tab=details` | `sections/DetailsSection.tsx`, `blocks/MatchContextBlock.tsx` | Date, opponent, tournament, save | Keep |
| Review Work on | `?tab=workon` | `sections/WorkOnSection.tsx` | Empty in-progress match | Keep the tab. Content not filled in this pass |
| Review Clips | `?tab=clips` | `features/clips/composers/ClipsComposer.tsx` | Empty | Keep |
| Review Rallies | `?tab=rallies` | `sections/RalliesSection.tsx` | Empty | Keep |
| Highlights | `?tab=highlights` | `MatchReviewComposer.tsx` | Redirects to `?tab=clips&clip=highlights` | Consolidate into Clips. Architecture still lists it as a tab |
| Pass 1 tag | `/matches/:id/tag` | `shot-tagging-engine/composers/Pass1FocusComposer.tsx` | No video; video; answering; wing/stroke form. 5 sizes | Refine layout. Keep the question order and the big tap pad |
| Simple tag | `?mode=simple` | `SimpleTaggingComposer.tsx` | Same chrome, mode switch on the video | Consolidate with Pass 1 chrome |
| Edit rally | `/matches/:id/edit-rally?set=&rally=` | `RallyEditComposer.tsx` | “Rally not found” only | Keep the route. Working editor not captured |
| Clips | `/clips` | `ClipsComposer.tsx` | Empty library | Keep |
| Scope review | `/review` | `ScopeReviewComposer.tsx` | “0 matches” | Keep |
| Training | `/training` | `features/training/composers/TrainingLibraryComposer.tsx` | Stub posts, raw file inputs | Remove from the primary chrome until it is a real screen |
| Account | `/settings` | `pages/Settings.tsx` + `AccountComposer` | Reviewing-as, storage, danger zone | Refine. Danger actions meet the bottom bar |
| Retired routes | `/clubs`, `/tournaments`, `/players`, `/analytics`, `/data-viewer` | `App.tsx` redirects Home | `/clubs` confirmed | Remove the leftover pages (`pages/DataViewer.tsx`, `features/data-audit/`) |
| Proto gate | `/` | `proto/src/pages/GatePage.tsx` | 3 stub cards, STUB badges, Fake sign-in | Remove as production UI |
| Proto Matches | `/matches` | `proto/src/pages/MatchesPage.tsx` | 14 demo rows, Continue set 2 | Keep the row. Refine full-bleed desktop rows |
| Proto Insights | `/insights` | `pages/InsightsPage.tsx`, `features/insights/` | Phases / Serve / Receive, You Them Grade | Keep |
| Proto Account | `/account` | `pages/AccountPage.tsx` | Stub profile. Two columns in landscape | Refine. Drop stub badges |
| Match Insights / Details / Tag list | `/matches/:id/insights|details|tag` | `MatchInsights.tsx`, `MatchDetails.tsx`, `MatchTagChecklist.tsx` | Tabs + preview player on Tag | Keep Details and the checklist. The checklist is not the set tagger |
| Set Tagger | `/matches/:id/tag/:setId` | `features/tagging/TagSetScreen.tsx` | Open set; finished set; off set redirects | Keep the four zones. Refine wide landscape and the blank saved-set input |

## Tokens

Live shipping tokens: `app/src/index.css` `@theme`. Proto tokens: `proto/src/index.css`, with packs on `html[data-theme]`. Default pack is Slate Teal (`--theme-brand: #0f766e`). Shipping brand is `#14b8a6`.

| Token / rule | Shipping value | Spec / proto | Disposition |
|---|---|---|---|
| Page background | `--color-bg-app #f4f6f9`, surface `#ffffff` | Proto uses theme packs. DesignSystem dark `#0a0a0a` is dead | Keep light paper |
| Text | `#0f172a` | Proto same | Keep |
| Muted | `#0f172a` (same as text) | Proto `#475569`. DesignSystem wanted a grey | Refine. Give muted its own ink |
| Neutrals 50–600 | All `#0f172a` | DesignSystem dark scale, inverted | Remove the collapsed scale. Stop using `text-neutral-*` for type |
| Neutrals 700–950 | Light papers | Were dark surfaces | Consolidate into bg-app / shell / card |
| Players | `#5b9bd8` / `#e8a06a` plus `-bg` | Proto `--color-side-me #3b82f6`, `--color-side-them #f97316` | Keep opaque player colour. One pair, not two systems |
| Shot / result pastels | serve, receive, first attack, winner, error, air, end, review | Proto uses side colour + green first attack + amber warning | Keep the idea of one pastel per meaning |
| Callouts | warning / danger / info, each ink + bg + border | Not in the zone doc | Keep |
| Video scrims | `video-scrim` through `wash-muted` | Proto uses raw `rgba` on the seek bar | Keep the tokens. Use them on the seek bar |
| Controls | 26px, pad 0.35rem, 10px type, 4px radius | DesignSystem 44px. Proto button kinds below | Refine |
| Type ramp | 11 / 13 / 15 / 17 / 20 / 24 / 30 / 36 | Same numbers in both CSS files. UI also uses 8, 9, 10px utilities | Refine. The ramp is ignored by the tagger |
| Fonts | Plus Jakarta, DM Sans, system-ui. Mono JetBrains, Fira Code. `app/index.html` does not load them | Proto loads Plus Jakarta only | Refine. Load the face the CSS names, or drop the name |
| Radius | 0–16px and full | Zone buttons use 6px (`rounded-md`) | Keep 6px on controls |
| Shadow | sm / md / lg / glow, light | Cards use `shadow-sm` | Keep sm only |
| Motion | 150ms micro, 300ms panel | Same | Keep |

## Shell and chrome

| Element | Source | Where | Variants | Disposition |
|---|---|---|---|---|
| Shipping bottom nav | `app/src/components/layout/AppShell.tsx` | Home, Clips, Account. 48px, 10px labels, 16px lucide icons. Fixed, all widths | Active = brand colour | Refine on phone. Remove on desktop and short landscape |
| Shipping sidebar | `components/layout/Sidebar.tsx` | Not mounted. 224px, five items (Home, Matches, Training, Clips, Account) | — | Remove |
| Shipping header | `components/layout/Header.tsx` | Not mounted | — | Remove |
| Proto shell | `proto/src/layout/AppShell.tsx`, `.shell` in `proto/src/index.css` | Portrait: fixed bottom bar, height `--btn-kind-main` (44px) + safe area. Landscape: left rail `4.5rem` + safe area. Hidden inside a match | 10px labels | Keep the orientation switch |
| Proto page header | `layout/PageHeader.tsx`, `StickyChrome.tsx` | Match tabs, back, opponent name. Scrolls away under 500px landscape | — | Keep |
| Brand mark | `layout/BrandMark.tsx` | Proto gate | “EdgeTT” | Keep |
| Wireframe bits | `layout/Wireframe.tsx` (`WfBadge`, `WfField`, `WfEmpty`) | Proto gate, account, empty match | STUB pills | Remove from anything a player sees |

## Shared controls

| Element | Source | Pages | Variants | Disposition |
|---|---|---|---|---|
| Button | `app/src/ui-mine/Button/Button.tsx` wrapping `components/ui/Button.tsx` | Almost every shipping page | primary, secondary, ghost, destructive, success. Sizes sm 26px, default 36px, lg 44px, xl 56px, icon 36px | Consolidate onto one control. Keep primary teal and the destructive colour |
| `.tag-control` | `app/src/index.css` | Tagger chrome, Let / Discard / Save, history | active (teal), danger, accent. 26× about 28px, 10px | Consolidate with Button. Refine the hit size |
| Proto button | `proto/src/ui-mine/Button/Button.tsx`, `buttonKinds` | Shell, forms, gate | Kinds: main 44px, control 36px (tagger overrides to 32px, 40px on coarse), tap pad 80px (tagger 40 / 48). Disabled has its own fill | Keep the three kinds. Stop overriding the zone star away from them |
| Zone button | `proto/src/features/tagging/zoneButton.ts` | Set Zone, Rally Zone | Rest fill, amber pressed. Measured 32×?, 11px/600, radius 6px. Spec: 32px, 12px semibold, 6px | Refine to the spec size, and to 44px on touch |
| Icon | `ui-mine/Icon/Icon.tsx` | Both apps. Shipping shell bypasses it and imports lucide | Named set | Keep the wrapper. Remove direct lucide in the shell |
| Card | `ui-mine/Card` re-exports `components/ui/Card.tsx` | Gate, account, proto gate and insights | Header, title, description, footer | Keep one card. Proto insights cards are the useful density |
| Badge | `ui-mine/Badge` | Sparse | — | Consolidate with pills |
| Input / Label | `ui-mine/Input`, `Label` | Forms | — | Keep |
| Dialog | `ui-mine/Dialog` | Leave draft, confirms | modal scrim tokens | Keep |
| Table | `ui-mine/Table` | Little of the live UI | — | Keep for data, not for match lists |
| Browse disclosure | `ui-mine/BrowseDisclosure` | Clips, playlists | — | Keep |
| Score HUD | `ui-mine/VideoPlayer/MatchScoreHud.tsx` | Shipping tagger | Two names, sets, points, server dot | Keep |
| Transport | `TransportCluster.tsx`, `VideoStageChrome.tsx`, `MatchVideoOverlayBar.tsx` | On the video | Rewind, play, forward, speed, mute. 26px in the shipping app | Refine hit size. Keep the set of actions |
| Video player | `ui-mine/VideoPlayer/VideoPlayer.tsx` | Tagger, clips | Upload prompt, local file | Keep |
| Playback speeds | `playbackSpeeds.ts`, `videoPlaybackStore.ts` | Tagger | Persisted speed | Keep |

### Choice controls (shipping tagger)

| Element | Source | Disposition |
|---|---|---|
| Timeline pill | `Pass1FocusBlock.tsx` `TimelinePill` | Keep the selected pastel. Refine 10px type and 26px height |
| Shot rail cell | same file, `h-7` (28px), weight 900 | Refine hit size |
| Contact pad | `Pass1ContactCaptureBlock.tsx` | Keep. Label flips Tap serve → Tap contact. Server stripe |
| Choice rows | `ChoicePillRow.tsx`, `MultiChoicePillRow.tsx`, `SegmentedChoice.tsx`, `TwoColChoiceGrid.tsx`, `choiceStyles.ts` | Consolidate into one pill row |
| Simple matrix | `SimpleTaggingMatrixBlock.tsx` | Consolidate with Pass 1 pills |
| Mode switch | `SimpleTaggingModePickerBlock.tsx` | Keep one switch if both modes stay. Do not restyle the page for it |

### Proto input

| Element | Source | Variants | Disposition |
|---|---|---|---|
| Input region | `InputArea.tsx` `RegionButton` | Portrait 22px/700 measured. Landscape CSS forces 20px (`1.25rem`) on `.pad-region` | Keep the full-colour region. Make landscape 22px too, as the spec says |
| Corner pad / best panel | `CornerPad.tsx`, `BestPanel.tsx`, `inputModes.ts` | Watch, serve, stroke, end, edit, review | Keep. One pattern: Back / Forward plus the action for the focus |
| Answer cells | `AnswerCells.tsx` | Marks on the rally row | Keep |

## Feature blocks worth naming

| Block | Source | Disposition |
|---|---|---|
| Home sections | `ContinueTaggingBlock`, `ContextPolishBlock`, `HomeMatchRowBlock`, `ClipShortcutsBlock` | Keep |
| Match list filters | `MatchListFiltersBlock.tsx` | Keep |
| Review tab bar | `TabBarBlock.tsx` | Keep. Horizontal scroll on small widths. Badge on Rallies |
| Set panel, rally row, rally player | `SetPanelBlock`, `RallyRowBlock`, `RallyPlayerBlock` | Keep |
| Summary nav and playlist | `SummaryCategoryNavBlock`, `SummaryCategoryPlaylistBlock` | Keep |
| Headlines, compare, evidence, takeaways, patterns | `HeadlineMetricsBlock`, `CompareCardBlock`, `EvidenceDrawerBlock`, `TakeawaysBlock`, `ReviewPatternBlock` | Keep. Do not add more card chrome around them |
| Scope control | `ScopeControlBlock.tsx` | Keep |
| Clip stage, presets, queue, reel | `clips/blocks/*` | Keep |
| Storage / import | `MatchStorageBlock.tsx` | Keep. It is already on Details and Account |
| Pass 1 chrome | `Pass1ChromeProtoBlock.tsx`, `Pass1LeaveDraftChoiceBlock.tsx` | Keep the set bar (serve, point, history, Done, Leave) |
| Insight card and playlist | `proto/src/features/insights/InsightCard.tsx`, `PlaylistPlayer.tsx` | Keep |
| Tag video card / add video | `features/match/TagVideoCard.tsx`, `AddVideoChoice.tsx` | Keep on the checklist |

## Unused or duplicate — remove

These are not on a route.

| Element | Source |
|---|---|
| SVG table-tennis buttons (serve, shot, won, wings, spin, depth, quality, error) | `app/src/ui-mine/TableTennisButtons/*` |
| 3×3 grids | `SpinGrid`, `LandingZoneGrid`, `PositionGrid` |
| Phase 1 kit | `Phase1ControlsBlock`, `Phase1EndConditionGrid`, `Phase1EndConditionStack`, `ButtonGrid`, `SetupControlsBlock`, `SetSetupBlock`, `SetEndWarningBlock`, `CompletionModal`, `RallyCard`, `ShotListItem`, `PlayerScoreDisplay`, `StatusGrid`, `StatusItem`, `StatusPlayerScore` |
| Data viewer and audit UI | `pages/DataViewer.tsx`, `pages/DataViewerAudit.tsx`, `features/data-audit/` |
| Second button implementation | `components/ui/Button.tsx` should exist only behind `ui-mine` |
| Proto stub gate cards | `GatePage.tsx` |

`app/src/features/shot-tagging-engine/blocks/index.ts` still exports the Phase 1 kit. Nothing imports those names onto a page.

## Zones

The name “Zone” in the product sense is the Set Tagger in `proto/docs/ui-zones.md` and `proto/src/features/tagging/`. The shipping app does not use these regions. `LandingZoneGrid` is an old 3×3 table map, unrelated, and unused.

### Contract the doc states

`proto/docs/ui-zones.md`. Reference frames, not a fluid rule, except where it says “at least”.

| Zone | Portrait 390×844 | Landscape 734×310 |
|---|---|---|
| Video | 390×219 (16:9) | 366×206, middle column |
| Set | 390×40 | 366×40 |
| Rally | 390×64 | 366×64 |
| Input | 390× the rest (~520) | Two wings, full height, 184 each, at least 144 |

Portrait order, top to bottom: Video, Set, Rally, Input. Landscape: left wing (column 1), middle (Video, Set, Rally), right wing (column 2). Middle width = `(height − 40 − 64) × 16/9`. Input never draws on the picture.

Rally is three rows inside 64px: head 32, shots 16, part lines 3. A 2s countdown runs on the bottom edge and takes no space. Small zone buttons: 32px tall, 6px corners, 12px semibold. Input text: 22px bold. Trigger for landscape is not given as a width. The code decides.

Set and Rally are `flex: 0 0` fixed heights. Input and the picture flex. CSS variables in `proto/src/index.css` `.tag-set`: `--tag-set: 2.5rem` (40px), `--tag-rally: 4rem` (64px). The 64px comment is pad 4 + head 32 + gap 4 + shots 16 + gap 2 + lines 3 + pad 3. The doc lists only 32+16+3. Both can be true: the rows are 51px and the padding makes 64. Measured height is 64.

Landscape class is `data-pad-split`, set from `(orientation: landscape), (min-aspect-ratio: 1/1)` in `TagSetScreen.tsx`. Grid: `minmax(9rem, 1fr) minmax(0, auto) minmax(9rem, 1fr)`. 9rem is the 144px minimum wing. Picture width `min(100cqw, (100cqh − set − rally) × 16/9)`, height `100cqh − set − rally`, and in that mode `aspect-ratio: auto`.

### What was measured

Coarse pointer except desktop.

| Viewport | Split | Picture | Set | Rally | Wings | Input type |
|---|---|---|---|---|---|---|
| 390×844 | no | 390×219 at 0,0 | 390×40 at y 219 | 390×64 at y 259 | none | 22px / 700. Area 390×521 |
| 844×390 | yes | 508×286 (16:9) at x 168 | 508×40 at y 286 | 508×64 at y 326 | 168×390 | 20px / 700 |
| 820×1180 | no | 820×461 (16:9). 45dvh cap is 531, so it does not bind | 40px | 64px | none | 22px. Area 615px tall |
| 1180×820 | yes | **1180×716 at 0,0. Not 16:9** | 892×40 at y 716, x 144 | 892×64 at y 756 | **144×820, on top of the picture** | 20px. Regions 808px tall |
| 1440×900 | yes | **1415×796. Not 16:9** | 1152×40 at y 796 | 1152×64 at y 836 (ends at 900) | 144×900, on the picture | 20px |

Zone button, every size: height 32px, font 11px, weight 600, radius 6px. Spec says 12px.

### Where the doc and the code disagree

| Topic | Doc | Code / render |
|---|---|---|
| Landscape 184px wings | The size at 734×310, minimum 144 | Wings are the leftover after the picture. 168px at 844×390. 144px (the minimum) at 1180 and 1440, and they cover the picture |
| Picture stays in the middle column | `(height − 104) × 16/9`, input never on the picture | True when that width fits. When it is wider than the screen, width becomes the full container and height stays `100cqh − 104`, so the picture runs under the wings |
| Input type 22px bold | All input | Portrait 22px. Landscape stylesheet sets `.pad-region` to 20px |
| Zone button type 12px | 12px semibold | `text-xs` is `0.6875rem` = 11px. The head cell uses `text-sm` (13px), not `zoneButton` |
| 32px zone buttons on touch | 32px, no pointer split | Other tagger controls grow to 40px (control) and 44px (playback) under `(pointer: coarse)`. Zone buttons stay 32px |
| Portrait video 219px | The 390-wide frame | Fluid 16:9 of the width, max 45dvh. 390×219 on the phone. 820×461 on the tablet |
| Rally rows 32+16+3 | Equals the zone | Those rows plus padding equal the measured 64px |
| Countdown | 2s, no space, bottom edge | `tag-idle-bar`, 2s, `h-1.5` (6px), `position: absolute; bottom: 0` on the rally zone |
| Saved set input | Both columns empty | Rendered empty. On a phone that is the whole lower half |
| Off set | Not a zone state in the table | `markState === 'off'` redirects to the Tag checklist. The checklist has its own preview player (top offset 44px or 36px) and is not the four-zone screen |
| Shipping tagger | Architecture describes scorebug + rails, not these zones | No Set, Rally, or Input zone. Video `max-h-[42dvh]` and full width |

### Shipping tagger boxes (for comparison)

`Pass1FocusComposer.tsx` and `SimpleTaggingComposer.tsx`. Outer `max-h-[42dvh] w-full bg-black`, inner `w-full aspect-video max-h-[42dvh]`.

| Viewport | Video element |
|---|---|
| 390×844 | 390×219 |
| 844×390 | 844×164 |
| 820×1180 | 820×461 |
| 1180×820 | 1180×344 |
| 1440×900 | 1440×378 |

Transport buttons on that screen: 26×28px, 10px type. The contact pad is the exception (`min-h-12`, up to 4.75rem).

### Files that own a zone

| File | Zone |
|---|---|
| `proto/src/features/tagging/TagSetScreen.tsx` | Screen, mode, `data-pad-split` |
| `VideoStage.tsx`, `usePlayer.ts`, `timeline.ts` | Video |
| `SetZone.tsx` | Set |
| `RallyZone.tsx` | Rally. States: before, gap, insert, tapping, answering, saved, editing, review |
| `InputArea.tsx`, `inputModes.ts`, `CornerPad.tsx`, `BestPanel.tsx` | Input |
| `zoneButton.ts` | Shared star box |
| `proto/src/index.css` `.tag-set`, `.tag-setzone`, `.tag-rally`, `.tag-picture`, `.pad-wing` | Sizes |
