# Button and text standard

Five choices:

1. Save and Discard in the foot share one type: 17px, weight 600, Plus Jakarta Sans. Colour is the only difference (brand fill and accent ink, against plain text on a hairline). Discard’s letters grow 4px and get bolder, and the button widens from 74px. Say if you would rather shrink Save to 13px and weight 500 instead.
2. The other Discard, on the status line while tapping, is 32px tall and 13px medium. It can follow the pair (17px, weight 600) or stay as it is.
3. Small buttons (Rallies, Edit, Reopen, Restore) grow from 10px to 13px, with 6px corners. Yes, or leave that size alone.
4. Main actions on Home, Gate, and Go to Tag stay 13px and 44px tall. The 40px foot stays on the tagging screen only. Say if those app buttons should grow to 17px as well.
5. Filter stops being a word in a 36px square and becomes a normal secondary button. Yes, or keep the square.

Proposal only. No code. Measured on `cursor/mvp-proto-shell-d372` at `84a8bc5`, `proto/` only. Line numbers are from that commit.

One component, with flavours, wherever the job is the same. The 40px height stays on the tagging screen only. Home, Gate, Find, Match, Details, the checklist, Insights, and Account keep today’s app heights.

73 controls still set their own type size, weight, colour, corner, or padding in the screen file. A shared `Button` exists, and it is why this drifted: when a kind is set it forces 13px type and 6px corners, so the tagging foot writes `text-lg` and `rounded-lg` again on the page. One edit then does not reach the next Save.

## What to build

**Minimum, and the set to build.** Nine components. Button has five flavours, plus one matched pair for Save and Discard in the foot. Height is a context, not a choice on each button. Most controls already match a flavour, so they do not move. The ones that are the same job with different numbers are listed at the end.

**Ideal, only if Paul wants a tighter set.** Same nine components, fewer flavours. Each extra merge has a visible cost, listed after the minimum. Do not build the ideal until he picks those costs.

Colour values below are the Slate Teal names. Neon Night, Ink Lime, and Harbor already swap the underlying variables. A flavour that uses those names follows the pack. A raw hex, `text-white`, or `bg-black` does not.

### Heights

Two contexts. Pages do not pick a pixel height.

| Context | Where | Control / row | Main / slot | Mouse | Finger |
|---|---|---|---|---|---|
| App | Every screen except the set screen | secondary, quiet, text, icon, fields, tabs | primary | row 36px, main 44px | row 44px, main 48px |
| Tagging | The set screen only | secondary, quiet, text, icon, rail | the foot: primary, tap, server | row 32px, foot 40px | row 40px, foot 48px |
| Picture | The video, inside the set screen | overlay buttons | none | 36px | 44px |

The foot’s 40px (mouse) and the tagging row’s 40px (finger) do not become the height of any other screen. The picture keeps 36px on a mouse. It does not drop to the tagging row’s 32px.

Answer cells stay 32px on mouse and finger. They do not grow to the finger row’s 40px.

### 1. Button

One component. The screen passes a flavour and layout (width, grow). Type, weight, colour, corner, padding, and height come from the flavour plus the context.

| Flavour | Job | Type | Weight | Ink | Fill | Border | Corner | Side pad |
|---|---|---|---|---|---|---|---|---|
| primary | The action that finishes the step | App 13px. Tagging foot 17px | 600 | on-accent | brand | none | App 6px. Foot 8px | 12px |
| secondary | The other action on the same row | 13px | 600 | text | pill idle | pill border | 6px | 12px |
| quiet | Leave, cancel, stop, reopen | 13px | 600 | text | none | none | 6px | 12px |
| text | Change on the status line, and Discard while tapping | 13px | 500 | text | none | 1px border | 6px | 12px |
| pair | Save and the Discard beside it | 17px, both | 600, both | Save: on-accent. Discard: text | Save: brand. Discard: none | Save: none. Discard: 1px border | 8px, both | 12px |
| icon | Back, close, up, down, trash | none | 600 | brand, or text on close | none | none | 6px | 0, square |

States, not new flavours:

- **Selected** (secondary): brand border, brand muted fill, text ink. Used by the rally that is open.
- **Player** (secondary or primary): 15% player colour fill, 50% player border, text ink. The server switch. A primary can also take an 8px player stripe on the left (the contact pad, and “X served”).
- **Bold** (primary only): weight 700. The contact pad and “Tap the missed contact”. Save stays 600.
- **Overlay** (icon, and the captions control): black at 60%, white ink, 11px if there is a word. Picture height only. White and black stay put in every theme, because they sit on the video.
- **Inverse** (text, on the dark toast): weight 700, underline, toast ink. Only the Undo row.
- **Good / bad** (secondary when pressed): success or danger fill, white ink. Trim is not this. The old pill tones are. Trim Start/End map to secondary.
- **Disabled**: disabled fill, disabled ink, disabled border, weight 500. Applies to primary, secondary, quiet, and text. Does not apply to cells, the rail, or overlay buttons.

App primary stays 13px and 44px tall (Home “Continue”, Gate, “Go to Tag”, checklist resume). Tagging foot primary stays 17px and 40px tall (Save, First attack, Save changes). Same flavour, two contexts, so changing the foot type does not resize Home, and changing Home’s primary type does not resize Save.

### The Save and Discard pair

These two sit in the foot together. Today they already share the font (Plus Jakarta Sans), the 40px height, the 8px corners, and 12px of side pad. They do not share the letters.

| | Save today | Discard today | The pair |
|---|---|---|---|
| Font | Plus Jakarta Sans | Plus Jakarta Sans | Plus Jakarta Sans |
| Size | 17px | 13px | 17px |
| Weight | 600 | 500 | 600 |
| Ink | on-accent (white on Slate Teal) | text (near-black on Slate Teal) | unchanged |
| Fill | brand | transparent | unchanged |
| Border | none | 1px border | unchanged |
| Width | 112px | 74px | Save stays 112px. Discard widens. |

Colour is the only difference after the change: filled brand with accent ink, against plain text on a hairline.

Look cost, and it is all on Discard. The letters grow from 13px to 17px (+4px). The weight goes from 500 to 600, so they get bolder. “Discard” is a longer word than “Save”. At 13px it fits in 74px. At 17px and weight 600, with 12px of pad on each side, it does not. The button has to grow past 74px, by about 20px, or the word crowds the edges. Save’s letters, colour, and 112px width stay put. Height stays 40px for both. This 40px stays on the tagging foot only.

The other way round would shrink Save to 13px and weight 500 so it matches today’s Discard. That keeps Discard still and makes the main action the smaller label. This proposal does not do that. Choice 1 at the top is that call.

The Discard on the status line (while you are still tapping) is a different control: 32px tall, 13px, weight 500, 6px corners. It is not beside Save. Choice 2 is whether that one follows the pair. Following it puts 17px type into a 32px row and widens that button too. Leaving it keeps the row at 13px medium. Change, on that same line, stays 13px medium either way, unless you say it should follow Discard.

### 2. Toggle

| Flavour | Job | Size | Off | On |
|---|---|---|---|---|
| switch | Answer key | track 24px tall, 40px wide, knob 18px | pill idle | brand fill, white knob |
| mark | High, Heavy, Review | 24px tall, width by the word (42, 51, 56) | transparent, strong border, text ink, 11px, weight 600, full pill | warning fill, ink `#0b1220` |

### 3. Pill

Not a button row. A short label, sometimes pressable.

| Flavour | Type | Weight | Height | Fill | Border | Corner |
|---|---|---|---|---|---|---|
| segment | 11px | 600 | app control (36 / 44) | idle transparent, on surface | on: border. idle: none | 6px, inside an 8px tray |
| badge | 10px | 600, uppercase, tracking wide | content, 2px vertical pad, 6px side | pill idle, or warning at 15% | border, or warning | 4px |
| role | 10px | 700, uppercase | 18px, 6px side | rest wash, or 15% of the meaning colour | none | 4px |
| count | 10px | 700 | content, 6px side | warning | none | full pill, ink near-black |

Segment is the Insights section tray (Summary, Serve, Receive, Improve). Badge is “proto”, “Finished”, “Differs”, phase, Archived. Role is Serve, First attack, Error, Winner on the shot title. Count is the amber number on Rallies.

### 4. Cell

| Flavour | Height | Type | Weight | Corner | Side pad | Rest | Chosen |
|---|---|---|---|---|---|---|---|
| answer | 32px, all pointers | 13px | 600 | 6px | 10px, min width 40px | rest wash | brand fill, on-accent ink. Error: danger fill, white ink |
| rail | tagging row (32 mouse / 40 finger), square | 13px | 700 | 6px | 4px | player at 15% | player solid, ink `#0b1220` |
| rail wide | same height, 48px wide | 13px after this pass (11px today) | 700 | 6px | 4px | rest wash | slate `#334155`, white ink |

Answer cells join at the ends when they are Offensive and Defensive (left cell rounds left, right cell rounds right, 2px gap). That is the same cell, not a new one.

The next-shot ghost in the rail is the rail cell, dashed, muted, not pressable.

### 5. Text

One scale. Same family everywhere.

| Flavour | Size | Weight | Colour | Where it already is |
|---|---|---|---|---|
| display | 24px | 700 | text | Gate title |
| title | 20px | 700 | text | Page header (Home, Find, Match, Insights, Account) |
| heading | 15px | 700 | text | Set name in the tagging header |
| cardTitle | 15px | 600 | text | Card titles |
| body | 13px | 400 | text | Status line, notes, empty copy |
| medium | 13px | 500 | text | Match names in lists, file names, the set number in the table |
| strong | 13px | 600 | text | Shot title, “Rally 3 · You won”, scores |
| meta | 11px | 400 | muted | Header subtitle, hints, the where line |
| eyebrow | 10px | 700, uppercase | muted | Stroke, Wing, Trim, “3 rallies” |
| fieldLabel | 11px | 600, uppercase, tracking wide | muted | Opponent, Event, Date, Result column heads |
| link | 13px | 600 | brand, underline | Checklist links, the details link in a note |
| caption | 9px | 700, uppercase | muted, or first-attack green, or error red | Under each rail cell only |

Ideal drops caption into eyebrow (9px to 10px, exactly 1px) and drops medium into strong (a weight step, no size change). The minimum keeps them so those do not move.

### 6. Header

| Flavour | Bar | Title | Back |
|---|---|---|---|
| page | 16px top, 8px bottom, side 16 / 24 / 32 | title 20px, subtitle meta | icon, app square, brand ink |
| set | 40px tall, 8px side, bottom rule | heading 15px, subtitle meta | icon, tagging row square, brand ink |
| bar | app main tall (44 mouse / 48 finger), side 24 / 32, shell fill, bottom rule | nav: 13px weight 600, 12px pad. Phone bar: 10px weight 600 under the icon | none |
| tabs | bottom rule, side 16 / 24 / 32, 8px top | 13px weight 600, app control tall, 12px pad, 2px bottom border | none |

Phone nav labels stay 10px. Growing them to 13px is ideal only (+3px).

### 7. Divider

One rule: 1px, colour `border`. It is the shell bar, the tab bar, the set header, the line above the tagging foot, the line above the tagging panel, the table row, and the timeline’s bottom edge. The wide tagging layout’s vertical split is the same rule, turned on its side.

A 4px status stripe (green or amber on the left of a sentence) belongs to the note card, not to a second divider.

### 8. Card

| Flavour | Corner | Pad | Fill | Border | Shadow |
|---|---|---|---|---|---|
| panel | 8px | 16px | surface | border | small |
| row | 6px | 12px side, 8px vertical | card | border | none |
| choice | 6px | 12px side, control tall | card. Selected: brand muted | border. Selected: brand | none |
| note | 6px | 12px side, 8px vertical | warning or success at 15% | that colour | none |
| empty | 8px | 16px side, 24px vertical, centred | card | dashed border | none |

Panel is the shared Card (Home, Gate, Details, Account, checklist). Row is the inner box (a video, a reel, a match in the list). Choice is the theme pack and the Empty/Filled pair. Note is a score clash or “match tagged”. Empty is “No video yet” and the wireframe empty.

Interactive panel keeps the slight lift on hover. That is a state of panel, not a new card.

### 9. Field

| Flavour | Height | Type | Weight | Side pad | Corner | Fill |
|---|---|---|---|---|---|---|
| text | app control | 13px | 400 | 12px | 6px | card |
| select | app control | 13px | 600 | 8px | 6px | card |
| score | app control, 44px wide | 13px | 400 | 4px, centred | 6px | card |
| stub | content | 13px | 400 | 12px side, 8px vertical | 6px | card |

Stub is the grey wireframe field on Gate, Account, and Find. It is not height-locked today. Leaving it on content padding keeps it still. Locking it to the control height would add about 3px. That lock is ideal only.

A flagged score uses a warning border. That is a state.

## How a dark theme picks this up

`ThemeProvider` sets `data-theme` on the page and stores `proto-theme`. Each pack rewrites the brand, the text, the on-accent ink, the pill, the borders, and the surfaces. Button, card, field, header, and divider colours point at those names, so Neon Night turns a primary button cyan with near-black ink, and turns Discard’s ink light, with no extra button rules.

Size, weight, corner, and padding do not change per pack.

These stay one colour in every pack until someone adds a dark value next to the other Neon Night variables: success, warning, danger, the two player colours, first-attack green, the dark green first-attack caption (`#15803d`), error text (`#b91c1c`), the open End slate (`#334155`), the mark ink (`#0b1220`), and white used on an error cell. The picture stays black, white, and the table colours on purpose. The first-attack caption is dark green, so on Neon Night it sits on a near-black page and goes dull. That is a pack gap, not part of this button pass. Error cells stay white on the red. Pointing them at on-accent would turn them near-black on Neon Night.

## Ideal, if he wants fewer flavours

Each line is a real look change. None of it is in the minimum.

| Merge | What moves | Cost |
|---|---|---|
| One primary type and corner | Home, Gate, Details, checklist, Insights “Go to Tag”, and the finish buttons | Letters 13px to 17px (+4). Corners 6px to 8px (+2). Height stays 44px on those screens. The tagging foot is already 17px and 8px. |
| Quiet absorbs the line Discard | The status-line Discard and Change | The hairline goes. The foot pair already shares weight 600, and it keeps its hairline, because that border is the colour difference. |
| Eyebrow absorbs caption | FA, Srv under the rail | 9px to 10px, exactly 1px. |
| Strong absorbs medium | Match names, file names | Weight 500 to 600. No size change. |
| One field pad | Selects and the opponent box | Side pad 8px to 12px. The score box stays 4px or the two digits do not fit. |
| Segment joins secondary | Summary, Serve, Receive, Improve | 11px to 13px (+2). |
| Phone nav joins the top nav | Home, Insights, Account on a phone | 10px to 13px (+3). |
| Finish buttons join the tagging foot | Finish set, Finish match, Open match Insights, while a set is on screen | Height 44px to 40px (−4). Type 13px or 15px to 17px. Allowed, because it is the tagging screen, and it is not in the minimum. |
| Answer cells join the finger row | Stroke, Wing, Result on a coarse pointer | 32px to 40px (+8). Mouse stays 32px either way. |

## Mapping

Every control, the flavour it joins, and whether the minimum changes it. “Same” means the numbers already match.

### Shell, on every screen except the set screen

| Control | Where | Flavour | Minimum |
|---|---|---|---|
| Top nav Home, Insights, Account | `AppShell.tsx` 37, wide layout | header bar, 13px | Same |
| Phone nav, those three | `AppShell.tsx` 37, bottom layout | header bar, 10px | Same |
| EdgeTT mark | `BrandMark.tsx` 5 | strong, brand colour, 13px bold | Same. Weight 700 is the mark, a named face of strong |

### Gate

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Title | 16 | display | Same |
| Stub, Login, Registration, Device cards | 23, 44, 66 | card panel | Same |
| Badges | 29, 50, 72 | pill badge | Same |
| Email, password, name fields | 33, 34, 54, 55, 56 | field stub | Same |
| Sign in, Create account (disabled primary) | 36, 58 | button primary, app | Same |
| Continue as guest, Use this device | 39, 61 | button secondary, app | Same |
| Skip for now | 80 | button quiet, app | Same |

### Home

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Page title | via `PageHeader` | header page | Same |
| New match | 52 | button primary, app | Same |
| Empty state | 51 | card empty | Same |
| Up next card | 60 | card panel | Same |
| Phase badge | 66 | pill badge | Same |
| Continue / Open match Insights | 82 | button primary, app | Same |
| Matches, Insights cards | 104, 150 | card panel | Same |
| New, Find | 111, 115 | button secondary, button quiet | Same |
| Match row | 126 | card row, title medium, meta underneath | Same |
| Differs, phase | 136, 140 | pill badge, pill badge warning | Same |
| Insight rows | 161, 165 | card row | Same |
| Open Insights | 170 | button secondary | Same |

### Find

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Page title | PageHeader | header page | Same |
| Filters card | 30 | card panel | Same |
| Opponent, event, date | 33 to 35 | field stub | Same |
| Search (disabled) | 38 | button primary, app, disabled | Same |
| New match | 41 | button secondary | Same |
| Empty | 49 | card empty | Same |
| Match card | 55 | card panel, interactive | Same |
| Phase, Differs | 62, 66 | pill badge | Same |

### Insights hub and match Insights

| Control | Where | Flavour | Minimum |
|---|---|---|---|
| Page title | Insights `PageHeader` | header page | Same |
| Summary, Serve, Receive, Improve | `InsightsScreen.tsx` 172, also the match tray | pill segment | Same |
| Filter | `InsightsPage.tsx` 140 | button secondary, app | **Changes.** Today it is a 36px square, and the square rule wipes the extra padding, so the word sits in that square. It becomes a normal secondary button as wide as the word. |
| Filter chips | 152 | pill badge, pressable | Same (10px, pill fill) |
| Close scrim | 193 | none. A dim layer, not a control style | Same |
| Clear | 175, 208 | button quiet | Same |
| Apply | 178, 211 | button primary, app | Same |
| Close | 202 | button quiet | **Changes.** Side pad 8px to 12px. |
| Filter selects | 62 | field select | Same |
| Go to Tag | `InsightsScreen.tsx` 243 | button primary, app | Same |
| Sample numbers, work on | 287, 338 | pill badge | Same |
| Reel and row boxes | 307, 329, 360 | card row | Same |
| Play, download, close | 310, 342, 346, 368, 372, 386 | button quiet or secondary or primary, app control | Same |
| Details link inside the note | 293 | text link | Same (already 13px, brand, underline, inside a body note) |
| Home link | 419 | text link | Gains the underline. Size and colour stay. |
| Empty | 235, 252, InsightsPage 246 | card empty | Same |

### Account

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Page title | PageHeader | header page | Same |
| Profile, reviewing, settings, prototype cards | 20, 31, 55, 80, 94, 124, 146 | card panel | Same |
| Badges | 37, 61, 86, 100, 149 | pill badge | Same |
| Stub fields | 23 to 26, 40 to 43, 64 | field stub | Same |
| Rows (teammate) | 66, 71 | card row | Same |
| Save, Sign out, Invite, Import, Export, Backup, Restore | 46, 49, 73, 104, 108, 112, 116 | button primary or secondary or quiet, app, disabled | Same |
| Empty / Filled | 156 | card choice | Same |
| Theme packs | `ThemeSwitcher.tsx` 16 | card choice, title strong, blurb meta | Same. They are already control tall with two lines. Height stays. |

### Match hub

| Control | Where | Flavour | Minimum |
|---|---|---|---|
| Page title, back | `PageHeader.tsx` 30, 43 | header page, button icon | Same |
| Insights, Details, Tag | `HubTabs.tsx` 20 | header tabs | Same |
| Differs on a tab | `HubTabs.tsx` 34 | pill badge warning | Same |
| Who did you play | `MatchPage.tsx` 25 | field text, but side pad is 8px today | Same if field text on this one box keeps 8px. See migration. The shared text field is 12px. This box is the odd one. **Side pad 8px to 12px.** |
| Match not found | 59 | card empty, text link Home | Home link gains an underline if it uses the link style. The empty itself is unchanged. |

### Details

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Match, Videos, Result cards | 96, 246, 630 | card panel | Same |
| Field labels | 45, used at 100, 109, 117, 647 | text fieldLabel | Same |
| Opponent, event, date | 101, 110, 118 | field text | Same |
| Result select | 410 | field select | Same |
| Score boxes | 450 | field score | Same |
| Open match Insights | 77 | button secondary | Same |
| Remove, Cancel, Undo, archive, confirm | 188, 191, 263, 356, 368, 378, 581, 584, 615, 706, 721, 724 | button primary, secondary, or quiet | Same |
| Up / down | 290, 300 | button icon | Same |
| Remove video (word) | 312 | button quiet | Same |
| Go to Tag | 388 | button primary, app | Same |
| Use tagged | 487, 565 | button secondary | Same |
| Open the set link | 490 | text link | **Changes.** Today 11px. Link is 13px. +2px. |
| Video row, removed row | 259, 276 | card row | Removed row is 6px vertical pad. Row flavour is 8px. **+2px vertical.** |
| Archived, Original, Differs | 283, 486, 592 | pill badge | Same |
| Notes and clashes | flag classes | card note | Same |
| Table rule | 656 | divider | Same |

### Checklist

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Continue / resume | 165 | button primary, app | Same |
| Set card | 184 | card panel | Same |
| Finished | 188 | pill badge | Same |
| Differs | 39, 189 | pill badge warning | Same |
| Reopen, Edit, Skip, Start, Continue, Finish | 198 to 240, 263 | button quiet, secondary, or primary, app control | Same. The width class is layout only. |
| Use tagged result, reopen match | 302, 345, 355 | button secondary, button quiet | Same |
| Finish match | 385 | button primary, app | Same |
| Result links | 349, 406 | text link | Same |
| Empty, video gone | 151, 277 | card row, card empty | Same |
| Tagged strip | 335 | card row | Same |

### Add video (Details, checklist, set screen)

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Upload | `AddVideoChoice.tsx` 69 | button secondary | Same |
| Paste a link | 78 | button quiet | **Changes.** The dashed border goes. Quiet has no border. |
| Hidden file input | 87 | not a visible control | Same |

### Tagging screen

Heights in this section are the tagging context. 40px is the foot. 32px is the row, on a mouse.

**Header**

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Bar, Set title, match subtitle | 2587, 2596, 2597 | header set | Same |
| Back | 2588 | button icon, tagging row | Same |
| Rallies | 1730 | button secondary, tagging row | **Changes.** Today the small size: 10px, 4px corners, 12px pad (pad already overridden). Becomes 13px and 6px corners. |
| Count on Rallies | 1740 | pill count | Same |

**Picture** (`VideoStage.tsx`). These stay on the picture height, 36px mouse, not the 32px row and not the 40px foot.

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Back 10, play, forward, speed, sound | 216, used at 383 to 413 | button icon, overlay | Same, including 11px on the speed word |
| Highlight | 343 | button icon, overlay. On: warning fill, near-black ink | Same |
| Captions | 372 | button overlay, with a word, 11px, side pad 8px | Same. It is not a text button. |
| Timeline strip | 417 | not a labelled control. 28px tall, surface fill, bottom rule | Same. Leave the 28px. It is a scrubber, not a button flavour. |
| Score bug, clock, hint, shot badge | 306, 325, 334, 366 | picture type, white on black | Same. Not page text. |
| Disabled play or forward | 216 | overlay, dimmed | **Changes** if the global disabled rule stops covering it. Today that rule paints a grey disabled chip on the video. It goes back to dimmed black. |

**Rail** (`ShotRail.tsx`)

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Shot number | 120 | cell rail | Same |
| End | 150 | cell rail wide | **Changes.** Type 11px to 13px. Width stays 48px. Open colour stays slate and white. |
| Next shot (not a button) | 180 | cell rail, dashed | Same |
| Captions FA, Srv, ending | 140, 172 | text caption | Same |

**Panel** (`ShotPanel.tsx`, `TagSetScreen.tsx`)

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Shot title, End title | ShotPanel 231, 384 | text strong | Same |
| Role, Error, Winner | 234, 389 | pill role | Same |
| Status words | 237, 395 | text body | Same |
| Stroke, Wing, Depth, Intent, Initiative, Result, Miss | ShotPanel 136 | cell answer | Same on a mouse (32px, 13px, 6px). Finger stays 32px. |
| High, Heavy, Review | 243 | toggle mark | Same |
| Eyebrows | 111 | text eyebrow | Same |
| Earlier / later | 88, 94 | button secondary, tagging row, 56px wide | **Changes.** Today 11px. Becomes 13px. Width can stay 56px. The words are “− 0.1”. |
| Start / End trim | 49, via 456 | button secondary | Same height and type. The parent at 454 forces 4px side pad on every child. **That pad returns to 12px.** |
| Delete rally | TagSet 2040, squeezed at ShotPanel 454 | button secondary | Same flavour. Pad returns to 12px with the trim row. |
| Delete last, beside the rail | TagSet 1783 | button quiet, tagging row | **Changes.** 11px muted, no box, to 13px text ink. Side pad 8px to 12px. |
| Discard on the status line | 1851 | button text, tagging row | Same unless choice 2 says it follows the foot pair. Then 13px to 17px, weight 500 to 600, and the 74px width grows. |
| Change on the status line | 1856 | button text, tagging row | Same |
| Change in the summary | 2004 | button secondary | Same. It stays a filled secondary. The line Change stays text. Two flavours, on purpose. |
| Back 5s | 1839 | button secondary | **Changes.** Side pad 8px to 12px, inside a fixed 96px (144px on a wide screen). |
| Back to live, Discard rally | 1834, 1896 | button secondary | Same |
| Back to live, Delete last, Add contact in edit | 1863, 1871, 1882 | button secondary | **Changes.** 11px and 2px pad, in a 56px width (116px for Back to live). Type becomes 13px and pad 12px, so Delete last and Add contact get wider than 56px. |
| No attack | 2012 | button secondary | Same |
| Who won, Add point, Cancel, Stop | 1937, 1949, 1956, 1960 | button secondary, button quiet | Same |
| Finish set in the panel | 2094, 2123 | button primary, **app** main (44px, 13px) | **2123 changes.** It is 15px today. It becomes 13px. Height stays 44px. It does not drop to the 40px foot. |
| Edit on the last rally | 2073 | button secondary | **Changes.** 10px and 4px corners to 13px and 6px. Pad is already 12px. |
| Reopen set, Use tagged score, Keep entered, Use tagged result | 2454, 2474, 2477, 2492 | button quiet or primary or secondary, tagging row | **Changes.** 10px, 4px corners, about 6px pad, to 13px, 6px corners, 12px pad. Height stays the row (32px mouse). |
| Notes, clashes, summary strips | 1968, 1997, 2054, 2105, 2112, 2449, 2460 | card row, card note | A few strips use 6px vertical pad. Row is 8px. **+2px** on 1997 and 2054. |
| Toast Undo and the extra action | 1910, 1919 | button text, inverse | Same colours. They keep weight 700 and the underline, as the inverse face, so the dark chip does not flip. |
| Level link | 2114 | text link | Same |
| Close rallies | 2401 | button icon, tagging row | Same |
| Set missing its video | 2616, and the back button in the header | card empty, header set | Same |

**Foot.** This is the 40px slot. It stays here.

| Control | Line | Flavour | Minimum |
|---|---|---|---|
| Server switch | 2237 | button secondary, player tone, tagging foot | Same (13px, weight 600, 8px corners, 40px, player tint) |
| Tap serve / Tap shot / Play | 2262 | button primary, bold, player stripe, tagging foot | Same (17px, weight 700, 8px, 40px) |
| Tap the missed contact | 2297 | button primary, bold, tagging foot | Same |
| First attack, Save, Save changes | 2311, 2322, 2343, 2360, 2370 | button primary, tagging foot | Same (17px, weight 600, on-accent, 8px, 40px) |
| Discard beside Save | 2335 | button pair, tagging foot | **Changes.** 13px to 17px, weight 500 to 600. Colour, hairline, 8px corners, and 40px height stay. Width grows from 74px by about 20px. |
| Review: X served, Add rally, Leave it | 2163, 2189, 2209 | button primary or secondary, tagging foot | Same (17px, 8px, 40px) |
| No, the other server | 2174 | button icon-sized square, player tone, tagging foot | **Changes.** 11px to 13px inside the 40px square. |
| Next, Stop | 2198, 2212 | button secondary, square, tagging foot | Same (13px, 40px square) |
| Back to set | 2356 | button secondary, tagging foot | Same (17px on a secondary fill, 40px). The 17px is the foot type. Secondary’s usual 13px would shrink this label. Keep foot type on any full-width foot button, including this secondary one. |
| Open match Insights, Start set, Finish match, Sets | 2542, 2545, 2554, 2564, 2573 | button primary, secondary, or quiet, **app** main | **Changes where the page set 15px.** Those labels become 13px. 2545 is already 13px, beside a 15px neighbour, so the row matches. Height stays 44px. Not the 40px foot. |
| Late tap catcher | 2148 | no paint | Same |

**Rally list and answer key**

| Control | Where | Flavour | Minimum |
|---|---|---|---|
| Review serves, Leave it, Check, Check gaps | `RallyList.tsx` 98, 106, 131, 180 | button secondary, button quiet, tagging row | Same |
| Finish at this score | 190 | button quiet | **Changes.** 10px and 4px corners to 13px and 6px. |
| Restore | 161 | button secondary | **Changes.** 11px to 13px, pad 10px to 12px, corners 4px to 6px. |
| Delete point | 234 | button icon | Same once the small-size type classes are dropped. It is an icon. |
| Rally row | 247 | card row, tagging row tall, meta 11px, name strong | Same. The row stays 11px so the list does not grow. |
| Point row | 227 | the same row, not pressable | Same |
| Bands, gaps, deleted | 93, 127, 143, 151 | card note, card row | Same |
| List heading | 174 | text eyebrow | Same |
| Answer key switch | `AnswerKeyPanel.tsx` 106 | toggle switch | Same |
| Answer key heading | 113 | text eyebrow | Same |
| Right / wrong lines | 135, 138 | text strong, text meta | Same |

### Disabled rule

`index.css` around line 349 forces every disabled button to the disabled fill, disabled ink, and weight 500. The rail has an exception. Answer cells and the picture buttons do not. Under the minimum, that rule covers Button primary, secondary, quiet, and text only. Cells, the rail, and overlay opt out.

That restores dimmed black on a disabled play button, and restores the rest wash on an answer cell that is waiting (today those cells go grey). Both are colour changes Paul should see.

## Migration

Do the tokens and the one Button (plus Pill, Cell, Text, Header, Divider, Card, Field) first. Then point these lines at a flavour. Layout classes (width, grow, shrink) stay on the page. Type, colour, corner, and padding leave the page.

A line marked **Same** only deletes a repeated class. A line marked **Moves** is a look change from the mapping.

### `proto/src/index.css`

Add the flavour tokens next to the existing colour and height tokens. Keep `--btn-kind-control`, `--btn-kind-main`, and `--btn-kind-tap-pad`. The set screen’s overrides (32px row, 40px foot, and the picture’s 36px) stay the tagging context. Do not set the app control to 40px.

Narrow the disabled rule so it does not cover cells, the rail, or overlay. **Moves** the picture’s disabled buttons and waiting answer cells, as above.

### `proto/src/ui-mine/Button/Button.tsx` and `buttonKinds.ts`

One flavour prop. Drop the extra `text-sm` and `rounded-md` that a kind adds today, and drop `size="sm"` (10px, 4px corners, 5.6px pad). Height comes from the screen context.

### `proto/src/features/tagging/TagSetScreen.tsx`

| Lines | Flavour | |
|---|---|---|
| 144 | secondary, app | Same. Back from a dead end. |
| 1707 to 1708, 1856 | text | Same. The line Change stays 13px, weight 500. |
| 1851 | text, or the pair if choice 2 | Same at 13px unless the status-line Discard follows Save. |
| 1730 | secondary | **Moves.** 10px to 13px, corners 4px to 6px. |
| 1783 | quiet | **Moves.** 11px muted to 13px text. |
| 1834, 1896, 2004, 2012 | secondary | Same |
| 1839 | secondary | **Moves.** Pad 8px to 12px inside 96px / 144px. |
| 1863, 1871, 1882 | secondary | **Moves.** 11px to 13px, pad 2px to 12px, the 56px pair widens. |
| 1910, 1919 | text, inverse | Same |
| 1937, 1956 | secondary | Same |
| 1949, 1960 | quiet | Same |
| 2040 | secondary | **Moves** with the trim pad (ShotPanel 454). |
| 2073 | secondary | **Moves.** 10px to 13px, corners 4px to 6px. |
| 2094 | primary, app | Same |
| 2114 | link | Same |
| 2123 | primary, app | **Moves.** 15px to 13px. Height stays 44px. |
| 2163, 2189 | primary, foot | Same |
| 2174 | secondary, player, foot square | **Moves.** 11px to 13px. |
| 2198, 2212 | secondary, foot square | Same |
| 2209, 2356 | secondary, foot | Same |
| 2237 | secondary, player, foot | Same |
| 2262, 2297 | primary, bold, foot | Same |
| 2311, 2322, 2343, 2360, 2370 | primary, foot | Same |
| 2335 | pair, foot | **Moves.** 13px to 17px, weight 500 to 600. Width grows from 74px. Colour stays text on a hairline. |
| 2401, 2588 | icon | Same |
| 2454, 2477 | quiet | **Moves.** 10px to 13px, corners 4 to 6, pad about 6px to 12px. |
| 2474 | primary, tagging row | **Moves.** Same size step as Reopen. |
| 2492 | secondary | **Moves.** Same size step. |
| 2542, 2554, 2564, 2573 | primary or quiet, app | **Moves** where the class says 15px: those words become 13px. |
| 2545 | secondary, app | Same (already 13px) |

### `proto/src/features/tagging/ShotPanel.tsx`

| Lines | Flavour | |
|---|---|---|
| 32 to 67 | secondary, and good / bad when pressed | Trim only. **Moves** at 454: stop forcing 4px pad on the children. |
| 83 to 94 | secondary | **Moves.** 11px to 13px. |
| 101 to 158 | cell answer | Same |
| 243 to 256 | toggle mark | Same |
| 111, 231, 234, 237 | eyebrow, strong, role, body | Same |

### `proto/src/features/tagging/ShotRail.tsx`

| Lines | Flavour | |
|---|---|---|
| 5 to 139 | cell rail | Same |
| 150 to 170 | cell rail wide | **Moves.** 11px to 13px. Keep 48px width and the white-on-slate open state. |
| 8, 140, 172 | caption | Same |

### `proto/src/features/tagging/VideoStage.tsx`

| Lines | Flavour | |
|---|---|---|
| 216 to 224, 383 to 413 | icon, overlay | Same. Disabled look **moves** when the global rule lets go. |
| 343 | icon, overlay | Same |
| 372 | overlay word | Same |
| 417 | scrubber | Same. Do not restyle. |

### `proto/src/features/tagging/RallyList.tsx`

| Lines | Flavour | |
|---|---|---|
| 98, 106, 131, 180 | secondary, quiet | Same |
| 161 | secondary | **Moves.** 11px to 13px, pad 10 to 12, corners 4 to 6. |
| 190 | quiet | **Moves.** 10px to 13px, corners 4 to 6. |
| 234 | icon | Same |
| 247 | row, tagging | Same |

### `proto/src/features/tagging/AnswerKeyPanel.tsx`

106 switch, 113 eyebrow. Same.

### Other screens

| File | Lines | Flavour | |
|---|---|---|---|
| `layout/AppShell.tsx` | 37 | header bar | Same |
| `layout/PageHeader.tsx` | 30, 43 | icon, header page | Same |
| `layout/HubTabs.tsx` | 20, 34 | tabs, badge | Same |
| `layout/Wireframe.tsx` | badge, empty, row, field | pill, card, field stub | Same |
| `layout/BrandMark.tsx` | 5 | the mark | Same |
| `pages/GatePage.tsx` | 36, 39, 58, 61, 80 | primary, secondary, quiet | Same |
| `pages/HomePage.tsx` | 52, 82, 111, 115, 126, 170 | primary, secondary, quiet, row | Same |
| `pages/FindPage.tsx` | 38, 41, 56 | primary, secondary, panel | Same |
| `pages/AccountPage.tsx` | 46 to 116, 156 | the button flavours, card choice | Same |
| `pages/InsightsPage.tsx` | 62 | field select | Same |
| `pages/InsightsPage.tsx` | 140 | secondary | **Moves.** Leaves the 36px square. |
| `pages/InsightsPage.tsx` | 152 | badge | Same |
| `pages/InsightsPage.tsx` | 175, 178, 208, 211 | quiet, primary | Same |
| `pages/InsightsPage.tsx` | 202 | quiet | **Moves.** Pad 8px to 12px. |
| `features/insights/InsightsScreen.tsx` | 172, 243, 310 to 386 | segment, primary, quiet, secondary | Same |
| `features/insights/InsightsScreen.tsx` | 419 | link | Underline appears. |
| `features/match/MatchDetails.tsx` | buttons 77, 188, 191, 263, 290, 300, 312, 356, 368, 378, 388, 487, 565, 581, 584, 615, 706, 721, 724 | the button flavours | Same |
| `features/match/MatchDetails.tsx` | 101, 110, 118, 410, 450 | fields | Same |
| `features/match/MatchDetails.tsx` | 259 | row | **Moves.** Vertical pad 6px to 8px. |
| `features/match/MatchDetails.tsx` | 490 | link | **Moves.** 11px to 13px. |
| `features/match/MatchTagChecklist.tsx` | buttons | the button flavours | Same |
| `features/match/MatchTagChecklist.tsx` | 349, 406 | link | Same |
| `features/match/AddVideoChoice.tsx` | 69 | secondary | Same |
| `features/match/AddVideoChoice.tsx` | 78 | quiet | **Moves.** Dashed border goes. |
| `pages/MatchPage.tsx` | 25 | field text | **Moves.** Side pad 8px to 12px. |
| `theme/ThemeSwitcher.tsx` | 16 | card choice | Same |

Cards, notes, empty states, headers, and the 1px rules are already the values in the tables above. Pointing them at Card, Header, and Divider does not move them, except the two strips called out (Details removed-video row, and the tagging summary strips at 6px vertical pad).

## What Paul should look at before a build

These are the minimum’s real changes. Anything else already matches the flavour.

1. **Discard beside Save matches Save’s letters.** Both become 17px, weight 600, Plus Jakarta Sans. Discard today is 13px and weight 500, so its letters grow by 4px and get bolder. The fill stays empty and the ink stays the normal text colour, with the hairline. Save stays brand fill and accent ink. The Discard button is 74px wide and has to grow by about 20px so the longer word still fits. Save stays 112px wide. Height stays 40px for both, on the tagging foot only. Shrinking Save down to 13px and weight 500 is the other way to match them. This proposal does not do that.

2. **Small buttons become secondary or quiet.** Rallies, Edit, Restore, Finish at this score, Reopen set, Use tagged score, Keep entered, Use tagged result. Letters go from 10px (Restore is 11px) to 13px. Corners go from 4px to 6px. Padding goes to 12px where it is still about 6px. Height stays the row height on the tagging screen, 32px on a mouse.

3. **The edit row widens.** Delete last and Add contact are 11px in a 56px button with almost no side pad. They become 13px with 12px pad, so they cannot stay 56px wide. Back to live in that row is 11px in a 116px button and becomes 13px.

4. **Delete last beside the shots** goes from 11px muted grey to 13px in the normal text colour, with a bit more side pad.

5. **Back 5s** keeps its width and gains 4px of pad on each side, so the icon and the words have less room.

6. **End** in the shot row goes from 11px to 13px. It stays 48px wide. **No, the other server** goes from 11px to 13px inside the 40px square. The trim row stops squeezing its buttons to 4px of side pad.

7. **A few labels that were bumped to 15px drop back to 13px.** Finish set in the panel, and Open match Insights / Start set / Finish match / Sets when the page added the larger size. They stay 44px tall. They do not become the 40px foot. The Details “open set” link goes from 11px to 13px. The removed-video strip and two tagging strips gain 2px of vertical pad. Paste-a-link loses its dashed border. Filter stops being a 36px square and becomes a normal secondary button. Close in the filter sheet gains 4px of side pad.

8. **Disabled play on the video, and answer cells that are waiting,** lose the grey disabled wash and go back to dimmed black (picture) and the rest wash (cells).

Save’s letters stay 17px and weight 600. The contact pad, the server switch, answer cells, High / Heavy / Review, and every primary button on Home, Gate, and the match hub stay as they are. The foot stays 40px, and only on the tagging screen. The Discard beside Save is the one that moves, as in item 1.

## The five inconsistencies, in plain words

1. Save’s letters are 17px and semibold, in the accent colour, on green. Discard’s letters, in the same foot, are 13px and medium, in the normal text colour, on nothing. Same font. The pair above puts both at 17px and weight 600, and leaves the colour as the only difference. There is a second Discard while you are still tapping, 32px tall with 13px type. That one is choice 2.

2. The shared button does not own its type. It stamps 13px and 6px corners onto every kind, and the foot then undoes that on each Save, First attack, and Discard. That is why a single change does not echo.

3. The small button size is 10px with 4px corners. A normal control beside it, at the same height, is 13px with 6px corners. Rallies, Edit, Reopen, and Restore use the small one. Back 5s and No attack use the normal one.

4. Primary on Home and Gate is 13px and 44px tall, with 6px corners. Primary in the tagging foot is 17px and 40px tall, with 8px corners. The minimum keeps both, as two contexts of one flavour, and does not export the 40px. They are unnamed today, so they look accidental.

5. Change is a transparent medium button on the status line and a filled semibold button in the summary. Cards are a 16px-padded panel and a tighter inner row, plus a few strips with their own padding. Filter is a word trapped in a square. None of these share a named flavour, so each new screen invents another.
