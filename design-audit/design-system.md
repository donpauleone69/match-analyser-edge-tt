# Design system — stage 2

The smallest reusable system that covers every screen in `audit-report.md` and `inventory.md`. Tokens ship in `tokens/base.css`. No theme and no preview is defined here.

"Today" columns are facts from code or stage 1 measurements. Everything else is a proposal.

## 1. Which UI the system targets

**Decision: the system targets `proto/`. `app/` is the frozen predecessor and gets no parts of its own.**

| Evidence | Source |
|---|---|
| The deployed product is proto: the Live app row reads "v0.17.27 live (9c4efff). v0.17.28 merged on proto", and `9c4efff` is a proto merge | `proto/docs/key-documents.md`, Latest builds |
| All 270 commits that touch `proto/` are later than the last commit to `app/` (14 Nov, `d83deee`) | `git log -- proto`, `git log -1 -- app` |
| The only documented Zones are proto's, and the doc calls itself the reference | `proto/docs/ui-zones.md` |
| The product brief describes proto's flows (Tag page, Set Tagger, Insights), not Pass 1 or Simple | `proto/docs/product-brief.md` |
| The next planned step, after the proto refactor, is "One `ui-mine` set on every screen, then light and dark theme" | `key-documents.md`, Theme and style |
| Against: `proto/README.md` says proto is not the product app and should stop at clickable stubs | Stale. The tree holds a 2,113-line Set Tagger, a video file input and Insights computed from saved rallies |
| Against: `.cursorrules`, `Architecture.md` and `DesignSystem.md` describe `app/` | Not updated since proto took over |

Consequences:

- Every `app/` element is mapped to a system part in section 7, so anything ported later (Clips, storage and import, sign-in, dialogs) lands on the same parts.
- `app/` chrome with a proto successor is retired, not restyled: Pass 1 and Simple tagger → Set Tagger zones. 48px bottom bar, Sidebar, Header → Shell. Home and Find → Matches. Review Summary, Work on, Scope → Insights. Settings → Account.
- Not read: "Proto vs main rules", which lives in another store. It could refine this decision.

## 2. Tokens

File: `tokens/base.css`. Two layers.

| Layer | Selector | Holds | Themes |
|---|---|---|---|
| Theme contract | `:root, [data-theme]` | Fonts, type sizes, colour roles, shape, elevation, density, state styling | Override values, never names |
| Structure | `:root` | Zone geometry, control sizes, spacing scale, page widths, motion, layers | Never override |

A theme is one rule on `[data-theme="name"]`, loaded after `base.css`. The contract has 119 tokens: 83 literal values and 36 derived from them (`-soft`, `-hover`, aliases). Derived tokens recompute on the element that carries `data-theme`, so a theme overrides only the literals it wants to change and can live on any element.

For the preview builder:

- Put each simulated device in an iframe. The media and container queries then answer to the frame, not to the browser window.
- Set `data-pointer="coarse"` on the root of a phone or tablet frame. A desktop browser reports a fine pointer, and the touch sizes would not show otherwise.
- Load the font in the preview page. `base.css` only names it.

### 2.1 Fonts

| Role | Token | Base value | Use |
|---|---|---|---|
| UI | `--font-ui` | Plus Jakarta Sans, then the system stack | All text |
| Display | `--font-display` | same as UI | Page title, the big stat value |
| Numeric | `--font-numeric` | same as UI, with `--font-numeric-variant: tabular-nums lining-nums` | Scores, counts, percentages, times |

Weights: 400, 600, 700 only. Drops 500 and 900.

**Base choice: keep Plus Jakarta Sans.** It passes every requirement below when measured, and it is what the live proto ships. Two things change: it must be self-hosted (the shipping `index.html` loads no font, proto depends on the Google CDN), and every number takes tabular figures. Dropped: DM Sans (no tabular figures, so scores change width) and JetBrains Mono (named, never loaded; the numeric role replaces it).

Requirements for any theme font:

1. Tabular lining figures, by default or through `tnum`.
2. "BH Control" and "Tap shot 12" at 22px/700 each fit 124px, the text width of a 144px wing.
3. 400, 600 and 700 in one family, self-hostable.
4. x-height at least 0.70 of cap height, for 12px labels.

Measured in Chrome, px:

| Font | BH Control 22/700 | Tap shot 12 22/700 | 0–9 at 15/600 | Tabular | x / cap |
|---|---|---|---|---|---|
| Plus Jakarta Sans (base) | 116.6 | 115.5 | 89.5 | `tnum` | 0.72 |
| Figtree | 111.8 | 113.3 | 85.5 | `tnum` | 0.71 |
| Instrument Sans (has a width axis) | 114.2 | 114.6 | 86.5 | `tnum` | 0.71 |
| Inter | 115.6 | 121.0 | 91.5 | `tnum` | 0.74 |
| IBM Plex Sans | 111.9 | 118.9 | 90.0 | default | 0.75 |
| Source Sans 3 | 105.6 | 109.4 | 77.0 | default | 0.74 |
| Barlow (static weights) | 103.6 | 108.4 | 77.5 | `tnum` | 0.73 |
| DM Sans | 115.8 | 117.4 | 87.8 | none: fails | 0.72 |

### 2.2 Type scale

Five theme roles and three fixed ones. Nothing is below 12px.

| Role | Size / line | Weight | Use | Replaces today |
|---|---|---|---|---|
| micro | 12 / 16 | 600 | Nav labels, badges, column heads, "of 11", timeline labels | 8, 9, 10, 11px |
| meta | 13 / 18 | 400 | Second line of a row, status text, help, card sub-lines | 11px and 13px |
| body | 15 / 22 | 400. 600 for row titles, buttons, tabs, card titles | Everything else | 13px rows and buttons |
| title | 17 / 24 | 700 | Top row title, dialog title | 15px bold |
| display | 24 / 28 | 700 | Insight card value, Gate title | same |
| zone (fixed) | 12 / 1 | 600 buttons and head, 700 pills and cells | Set Zone and Rally Zone | 11px buttons, 13px head, 9px tick, 8–10px part labels |
| input (fixed) | 22 / 1.15 | 700 | Input Area regions, both orientations | 20px in landscape |
| field (fixed) | 16 touch, 15 mouse | 400 | Inputs and selects | 13px |

Labels (field and column): micro, `--ink-muted`, sentence case by default (`--label-transform`). Today Details uses uppercase and the filters do not.

### 2.3 Colour roles

Base values are proto's Slate Teal, changed only where a pair failed contrast. Each value in `base.css` passes the requirement shown, except the one flagged under Marks.

| Group | Tokens | Use | Requirement |
|---|---|---|---|
| Surface | `--surface-page`, `-nav`, `-raised`, `-sunken`, `-inverse`, `-video`, `--scrim` | Page, bar and rail, cards and overlays, tracks and idle controls, toast, any player | |
| Ink | `--ink`, `--ink-muted`, `--ink-disabled`, `--ink-inverse`, `--ink-on-accent` | Text and icons | Muted 4.5:1 on page, nav, raised, sunken |
| Line | `--line`, `--line-strong` | Hairlines; field and control edges | Strong 3:1 on raised |
| Accent | `--accent`, `-hover`, `-pressed`, `-ink`, `-soft`, `-on-video` | Lead action, active nav and tab, links, selected, picked rally on the seek bar | 4.5:1 with `--ink-on-accent`; `-ink` 4.5:1 on page |
| Status | `--positive`, `--warning`, `--danger`, `--info`, each with `-ink` and `-soft` | Callouts, grades, flags | `-ink` 4.5:1 on its `-soft` and on raised |
| Control | `--control-bg`, `-bg-hover`, `-bg-pressed`, `-line`, `-ink`, `--control-disabled-*`, `--field-bg`, `--field-line` | Neutral buttons, fields | Disabled stays readable: own colours, no opacity |
| Player | `--player-a`, `--player-b`, `-soft`, `-ink`, `--ink-on-player` | You and Them: pills, shot cells, head cell, server dot, "served" regions | `-ink` 4.5:1 on page. `-soft` is opaque |
| Marks | `--first-attack`, `--mark`, `--ink-on-mark` | First-attack edge. Zone toggle that is on, part marked for review, gap warning | First-attack 3:1 on the soft cells. Base amber `--mark` is 2.0:1 on the page, so a marked part line is told apart by hue alone: a theme should reach 3:1 |
| Regions | `--region-action`, `-step`, `-other`, `-destructive`, `-idle`, `--wing-bh`, `--wing-bh-soft`, `--wing-fh`, `--wing-fh-soft`, `--end-winner`, `--end-long`, `--end-net` | Input Area fills, one token per meaning in `ui-zones.md` section 6 | 4.5:1 with the text colour named in `base.css` |
| Video chrome | `--video-chrome-bg`, `-bg-hover`, `-ink`, `-ink-muted`, `--video-seek-track`, `-span`, `-span-on` | Back, score bug, transport, hints, seek bar | |
| Timeline | `--timeline-track`, `-span-open`, `-span-saved`, `-ink` | Tag page set marks | Ink 4.5:1 on both spans |

Fixed against today:

| Today | Contrast | Now |
|---|---|---|
| `--color-text-muted` = primary ink in `app/` | none | `--ink-muted` #475569, 7.0:1 on page |
| Grade "Below" in `--color-warning` text | 2.05:1 | `--warning-ink`, 5.0:1 |
| White label on the saved-set span (`--color-success`) | 2.28:1 | `--positive-ink` span, 5.0:1 |
| Dashed open pill number in `--color-side-me` | 3.40:1 | `--player-a-ink`, 6.2:1 |
| White on `--theme-brand-hover` (hover goes lighter) | 3.74:1 | Hover goes darker, 6.6:1 |
| Field edge `--color-border` on the field fill | 1.42:1 | `--line-strong`, 3.5:1 |
| Hard-coded hex in `BestPanel.tsx`, `inputModes.ts`, `zoneButton.ts`, `index.css` (seek bar, spans) | | One token each |
| `--color-border-subtle` and `--color-muted` are used and never defined (`index.css` gap slot, `RallyZone.tsx` grey head) | | `--line`, `--ink-muted` |

### 2.4 Size, space, shape

| Token | Touch | Mouse | Use |
|---|---|---|---|
| `--size-control` | 44 | 36 | Buttons, fields, icon buttons, tabs, top row, on-video transport |
| `--size-control-lg` | 48 | 44 | Lead action, nav item, sheet actions |
| `--size-control-dense` | 32 | 32 | Drawn height of zone buttons and the head cell |
| `--size-hit-dense` | 40 | 32 | Hit height of a dense control |
| `--size-short-row` | 44 | 44 | Fixed row of the Input Area |
| `--size-icon-sm`, `--size-icon`, `--size-icon-lg` | 16, 20, 24 | same | Icons |

The pointer decides the size, never the width (kept from proto). Retired: proto's `tapPad` kind (no component uses it) and the 26px `.tag-control`.

| Group | Tokens | Values |
|---|---|---|
| Space | `--space-0-5` to `--space-8` | 2, 4, 6, 8, 12, 16, 24, 32 |
| Page | `--gutter`, `--page-max`, `--page-max-list`, `--page-max-gate`, `--card-col-min` | 16 / 24 / 32, 1152, 720, 400, 320 |
| Density (theme) | `--pad-card`, `--gap-stack`, `--row-min`, `--pad-row-y` | 16, 12, 60, 10 |
| Radius (theme) | `--radius-control`, `-cell`, `-surface`, `-region`, `-overlay`, `-round` | 6, 4, 8, 8, 12, full |
| Elevation (theme) | `--shadow-raised`, `--shadow-overlay`, `--card-line` | One raised, one overlay. No hover lift |
| Motion | `--motion-fast`, `--motion-slow`, `--hint-duration`, `--toast-duration`, `--countdown-duration` | 150ms, 300ms, 2.5s, 6s, 2s |

### 2.5 Interaction states

| State | Buttons, fields, tabs | Rows and cards | Input regions | Zone toggles |
|---|---|---|---|---|
| Hover, only under `(hover: hover)` | `--control-bg-hover`, `--accent-hover`, `--ghost-bg-hover` | `--ghost-bg-hover` | none | as buttons |
| Pressed | `-pressed` fill, scale `--press-scale` | `--ghost-bg-pressed` | brightness `--press-dim` | as buttons |
| Focus-visible | 2px `--focus-ring-color`, offset 2px. White on video | same, inset | same, inset | same |
| Selected or on | `--selected-bg` and `--selected-line`. Tabs: accent text and a 2px underline | `--selected-line` edge | inset 4px `--ink-inverse` ring (`aria-pressed`) | `--mark` fill, `--ink-on-mark` |
| Disabled | `--control-disabled-*`, weight 400 | | not used | |
| Dim (shown, a press explains why) | opacity 0.6 | | opacity 0.6 | opacity 0.6 |
| Invalid | `--danger` edge, message in `--danger-ink` | | | |

## 3. Responsive model

Seven conditions. Orientation picks the arrangement, the pointer picks control size, width picks gutters and columns.

| Name | Query | Drives |
|---|---|---|
| portrait | `(orientation: portrait)` | Bottom nav bar, stacked zones |
| landscape | `(orientation: landscape), (min-aspect-ratio: 1/1)` | Nav rail, zone wings |
| short | `(orientation: landscape) and (max-height: 500px)` | Top row scrolls away |
| mid | `(min-width: 640px)` | Gutter 24, card grids, three-up fields |
| wide | `(min-width: 1024px)` | Gutter 32, page max widths, side-by-side media pages |
| touch | `(pointer: coarse)` | Control sizes, 16px fields |
| hover | `(hover: hover)` | Hover styles |

| Device | Viewport | Conditions |
|---|---|---|
| Phone portrait | 390×844 | portrait, touch |
| Phone landscape | 844×390 | landscape, short, mid, touch |
| Tablet portrait | 820×1180 | portrait, mid, touch |
| Tablet landscape | 1180×820 | landscape, wide, touch |
| Desktop | 1440×900 | landscape, wide, hover |

Safe areas: the nav bar adds the bottom inset, the rail and the top row add the side insets, the page never does (kept from proto). The Set Tagger rules are in section 6.

## 4. Components

### 4.1 Base controls

| Part | Purpose | Variants | Sizing | Notes |
|---|---|---|---|---|
| Button | Any press | Tone: `primary`, `neutral`, `quiet`, `danger`, `chrome` (on video). Size: `lg`, `md`, `dense`. Shape: `icon` (square), `block`. `pressed` for toggles | `lg` and `md` body/600, side pad 12. `dense` zone/600, pad 8, drawn 32 with a 40 hit on touch | Icon-only needs a label for screen readers and a `title` on desktop. One Button replaces six ways to draw one |
| Field | Text, date, select, score | `text`, `date`, `select`, `score` (two digits, square, centred, numeric font) | Height `--size-control`. Label above, help or error below in meta | 16px on touch so iOS does not zoom |
| Segmented | One of 2–4, or several with `multiple` | | Height `--size-control`, equal widths. Track `--surface-sunken`, chosen segment `--surface-raised` | Not used in the Input Area, which holds regions only |
| Tabs | Sections of one page | Optional Badge after a label | Height of the top row, body/600 | Scrolls sideways before it wraps |
| Badge | A count or a flag | `count` (16px round, `--mark`), `flag` (`--warning-soft` with `--warning-ink`) | micro | Status in a row is plain meta text, not a badge. STUB badges go |
| Card | A group on a page | `default`, `selected`, `flush` (holds rows or a table) | `--pad-card`, `--radius-surface`, `--card-line`, `--shadow-raised` | No hover lift. No card inside a card |
| ListRow | A line that opens or sets something | `nav` (title, meta, trailing status or button), `setting` (label and control), `stat` (label and right-aligned numbers) | `nav` at least `--row-min`. `setting` 44. `stat` 8 above and below | The whole `nav` row is the link. Hairline below |
| Callout | A message in the page | `neutral`, `info`, `warning`, `danger`, `empty` (centred, one action, no box) | body text in `--ink`, tone on the edge and icon | Replaces dashed empty boxes and one-off flag rows |
| Overlay | Anything above the page | `sheet` (bottom on a phone, anchored panel from mid), `dialog` (centred, 400 max), `menu` (anchored list) | `--radius-overlay`, `--shadow-overlay`, `--scrim`. Actions `lg` | Esc and a backdrop press close it. Adds the bottom inset |
| Disclosure | Show or hide a block | | Icon button and a region | |
| DataTable | Aligned values | | Head micro in `--ink-muted`, rows on hairlines, numbers right-aligned and tabular | |
| Icon | Line icons through one wrapper | 16, 20, 24 | | Features never import the icon library |

### 4.2 Composites

| Part | Made of | Variants and states | Responsive |
|---|---|---|---|
| Nav | Icon 20 and micro label per item | `bar`, `rail`. Active item in `--accent-ink` | Portrait: bar, 48 plus the bottom inset, items centred and at most 160 wide. Landscape: rail, 72 plus the left inset. Hidden inside a match |
| TopRow | Back, then a title or Tabs, then one end slot | Sticky | Height `--size-control`. Scrolls away under short. The match name shrinks before the tabs scroll |
| FilterBar | Icon Button with a count Badge, removable chips (neutral Buttons), Fields in an Overlay | Empty, filtered | Sheet on a phone. Inline panel under the top row from mid |
| InsightCard | Card, title, display value, info Button (flips), meta lines, DataTable or `stat` rows, a play row with Download | Front, back, playing (`selected`), empty | A grid column per 320px |
| VideoPlayer | Picture, ScoreBug, transport (`chrome` Buttons), SeekBar, hint and toast, a leading slot | `zone` (Set Tagger), `preview` (Tag page), `playlist` (Insights, with a caption bar), `clip` | Chrome is anchored to the box edges, not to the picture |
| VideoCard | Card, title row, Disclosure, SetTimeline, `setting` rows, Add set | Active video (`selected`), locked, expanded set | One column always: the timeline needs the width |
| SetTimeline | Track 28, spans, ticks, playhead, two drag handles | Span: open, saved, part filmed. Handle: rest, dragging (readout), refused | 44 hit height. Handles 12×28 drawn, 44×44 hit |
| ResultEditor | Select, DataTable with `score` Fields, inline Callouts | Agrees, differs from tagging, incomplete | |
| RallyPill | Set Zone | Saved A or B, open (dashed), waiting (grey dashed), start score. Picked, warn, serve break, dim. Gap slot between pills | 24 high, 24 wide or more, zone/700. Hit: the full 40 of the zone |
| RallyHead | Rally Zone head cell | Rest (`-soft` fill), dashed (next rally, gap, insert), grey (server unknown), button (insert) | The dense box |
| ShotCell | Rally Zone row 2 | Rest, open, first attack, to do, done, off, ghost, End slot, flash, focus. Review: PartChip. Row 3: PartLine | 16 high, 24 to 40 wide, zone/700. Chip label: full word, short word, then initial, always 12px |
| InputRegion | Input Area | Fill by meaning (2.3). Pressed, dim, outline, `short`, spanning | Fills its cell. 22/700, up to two balanced lines |

### 4.3 Layouts

| Layout | Screens | Phone portrait | Phone landscape | Tablet portrait | Tablet landscape | Desktop |
|---|---|---|---|---|---|---|
| Shell | All but Gate and inside a match | Bar | Rail | Bar | Rail | Rail |
| Page, list | Matches | Full-width rows | Full-width rows | Full-width rows, gutter 24 | 720 max, centred | 720 max, centred |
| Page, cards | Insights, match Insights, Account | 1 column | 2 columns | 2 columns | 3 columns, 1152 max | 3 columns, 1152 max |
| Page, form | Details | 1 column | Fields three-up | Fields three-up | Match and Result side by side | same |
| Media page | Tag page. Insights while a playlist plays | Player sticky on top, 16:9, cards below | Two columns: player 1.15fr sticky, cards 1fr (as built) | Player on top, cards below | Two columns, as phone landscape | Two columns, 1152 max |
| Set Tagger | `/matches/:id/tag/:setId` | Section 6 | Section 6 | Section 6 | Section 6 | Section 6 |
| Gate | `/` | 1 column, 400 max | Cards side by side | Cards side by side | Cards side by side | Cards side by side |

Shipping-app routes sit on the same layouts:

| Layout | `app/` routes |
|---|---|
| Gate | Account gate |
| Page, list | Home, Find, Review Rallies |
| Page, cards | Review Summary, Work on, Scope review, Training, Account |
| Page, form | New match, Review Details |
| Media page | Clips, Review Clips |
| Set Tagger | Pass 1 tag, Simple tag, Edit rally |

Desktop adds pointer and keyboard affordances, not a different design: hover and focus rings, 36px controls, `title` on icon buttons, Esc closes overlays, and the Set Tagger's existing keys (Space, Enter, K, Backspace, arrows) stay.

## 5. What the system removes

| Removed | Why |
|---|---|
| Card hover lift, `shadow-md`, `shadow-glow` | Decoration. One raised and one overlay shadow remain |
| Uppercase 10px chips and STUB badges | Below the type floor, and not for players |
| Six ways to draw a button (`ui-mine/Button`, `components/ui/Button`, `.tag-control`, proto `Button`, `zoneButton`, hand-built transport buttons) at seven heights from 26 to 56 | One Button, three sizes |
| Dashed empty-state boxes | A line of text and one action say the same |
| The 26px control and 8–11px text | Below the product's own 44px and 15px rules |
| The `neutral-50…950` ramp (ink in one half, paper in the other, flipped in the dark pack) | Roles instead of steps |

## 6. Set Tagger zones

Source: `proto/docs/ui-zones.md` and `.tag-set` in `proto/src/index.css`. The order, the fixed Set and Rally heights and the one-layout rule are kept as written.

### 6.1 Rules

| Rule | Value |
|---|---|
| Set Zone | 40 high, fixed |
| Rally Zone | 64 high, fixed: pad 4, head row 32, gap 4, shots 16, gap 2, part lines 3, pad 3 |
| Picture | 16:9, never cropped, never covered by the Input Area |
| Portrait (height > width) | Top to bottom: Video, Set, Rally, Input. Picture is full width. Height `min(width × 9/16, height − 104 − 240)` |
| Landscape (width ≥ height) | Wing, middle column, wing. Middle column holds Video, Set, Rally |
| Middle column width | `min((height − 104 − bottom inset) × 16/9, width − 2 × 144)` |
| Video Zone in landscape | Middle width × `(height − 104 − bottom inset)`. The picture is centred in it. Any spare height is black band above and below |
| Wings | Share what is left, equal, at least 144 each, full height |
| Input regions | Share the height in each column, 6 apart, 8 corners. The `short` row is 44 |
| Chrome on the picture | Back and score bug top left, transport bottom right above the seek bar, hint or toast bottom left. All anchored to the Video Zone's edges, so they sit in the bands when there are bands |

Tokens: `--zone-set`, `--zone-rally`, `--zone-wing-min`, `--zone-input-min`, `--zone-mid-w`, `--zone-video-h-split`, `--zone-video-h-stack`. This skeleton was run in Chrome at every size in 6.2 and gave the boxes listed. A real `<video>` fills the Video Zone with `object-fit: contain` instead of the `.picture` box.

```css
.tagger     { container-type: size; height: 100%; display: flex; flex-direction: column; }
.middle     { display: flex; flex-direction: column; flex: none; min-width: 0; }
.video-zone { height: var(--zone-video-h-stack); background: var(--surface-video);
              display: flex; align-items: center; justify-content: center; flex: none; }
.picture    { aspect-ratio: 16 / 9; height: 100%; max-width: 100%; }
.set-zone   { flex: 0 0 var(--zone-set); }
.rally-zone { flex: 0 0 var(--zone-rally); }
.input-area { flex: 1 1 auto; min-height: 0; }
.wing       { display: none; }

@media (orientation: landscape), (min-aspect-ratio: 1/1) {
  .tagger     { display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns:
                minmax(var(--zone-wing-min), 1fr) var(--zone-mid-w) minmax(var(--zone-wing-min), 1fr); }
  .middle     { padding-bottom: var(--zone-safe-bottom); }
  .video-zone { height: var(--zone-video-h-split); }
  .picture    { width: 100%; height: auto; max-height: 100%; }
  .input-area { display: none; }
  .wing       { display: block; }
}
```

### 6.2 Sizes per device

| Device | Video Zone | Picture | Set | Rally | Input | Today |
|---|---|---|---|---|---|---|
| Phone portrait 390×844 | 390×219 | 390×219 | 390×40 | 390×64 | 390×521, two columns of 184 | Same |
| Phone landscape 844×390 | 508×286 | 508×286 | 508×40 | 508×64 | Two wings, 168×390 | Same |
| Tablet portrait 820×1180 | 820×461 | 820×461 | 820×40 | 820×64 | 820×615, two columns of 399 | Same |
| Tablet landscape 1180×820 | 892×716 | 892×502, bands 107 | 892×40 | 892×64 | Two wings, 144×820 | Picture box 1180×716, not 16:9, sides under the wings |
| Desktop 1440×900 | 1152×796 | 1152×648, bands 74 | 1152×40 | 1152×64 | Two wings, 144×900 | Picture box 1415×796, not 16:9, sides under the wings |

Other sizes: 667×375 gives 379×213 with 29 bands. 1366×1024 gives 1078×606 with 157 bands. An iPhone 15 installed to the home screen (852×393, side insets 59, bottom 21) gives 476×268 and 188 wings.

Why this is the largest usable picture: in portrait the picture already spans the width. In landscape it is bounded by height on phones and by the 144px wing minimum on tablets and desktop. Narrower wings or regions on the picture are the only ways to grow it, and the doc rules out both. On tablets and desktop the bands take Back, the score bug, the transport and the seek bar off the picture, and a 4:3 recording grows into them.

### 6.3 Touch targets inside the zones

| Control | Drawn | Hit on touch | 44 reached |
|---|---|---|---|
| Input regions | Their cell, about 100 or taller on a 390-high phone | same | Yes |
| Transport and Back | 44 | 44 | Yes |
| Seek bar | 6 track, 12 knob | 28 high | No. Kept from v0.17.5 |
| Edit Set, Discard, Cancel, Edit Rally, star | 32 high (doc), star 40 wide | 40 high | No. The Set Zone is 40 |
| Rally pill, gap slot | 24 | 40 high, 28 wide | No. A set is 11 or more pills in one scrolling row |
| Part chip (review) | 16 | 28 high | No. Kept as built |

### 6.4 Deviations from the docs and the code

| # | Topic | Doc | Code today | Proposed | Kind |
|---|---|---|---|---|---|
| 1 | Middle column width | `(height − 104) × 16/9`, no limit | Same. Overflows when wider than the room | Add `min(…, width − 288)` | Extends the doc. Fixes the broken sizes |
| 2 | Video Zone and picture | The same box | The same box, stretched | Zone can be taller than the picture, with bands | **Deviation** |
| 3 | Chrome position | "On the picture" | On the picture | On the Video Zone's edges | Follows from 2 |
| 4 | Input text | 22px bold everywhere | 20px in landscape | 22px, wraps to two lines | Follows the doc |
| 5 | Zone button text | 12px semibold | 11px. Head cell 13px | 12px for both | Follows the doc |
| 6 | Zone button height | 32px | 32px, no larger hit | 32 drawn, 40 hit on touch | Addition |
| 7 | Text in the Rally Zone | Not given | Tick 9px, part labels shrink to 8px | Tick is a glyph, labels shorten at 12px | Addition |
| 8 | Region corners and gaps | Not given | Corners 6 and gap 6 in portrait, corners 10 and gap 8 in landscape | One `--radius-region` (8) and one `--zone-gap` (6) | Addition |
| 9 | Portrait picture cap | None | `max-height: 45dvh` | `height − 104 − 240`. Binds on none of the five sizes | **Deviation** from code |
| 10 | Bottom safe area | Not given | Not handled in the tagger | Landscape: the middle column stops above it. Portrait: the Input Area pads it | Addition |
| 11 | Side safe areas | Reference frame 734×310 is the safe area | Wing pads its content by the inset | Region fill runs to the screen edge, the label stays inside the safe area. The 144 minimum counts the inset, as the code does | Addition |
| 12 | Landscape trigger | Not given | `(orientation: landscape), (min-aspect-ratio: 1/1)` | Same, written down | Kept |
| 13 | Countdown | 2s, bottom edge, no space | 6px, brand at 50% | Same, `--zone-countdown` | Kept |
| 14 | Saved set, opened | Input Area empty | Empty | Unchanged. See open question 3 | Kept |
| 15 | File list | Names `CornerPad.tsx` | No such file | Doc is stale | Finding |

## 7. Existing to proposed

| Existing | Where | Proposed |
|---|---|---|
| `ui-mine/Button` over `components/ui/Button` (5 variants, 5 sizes) | app | Button. `success` → `primary`. 26px and 56px sizes go |
| `.tag-control`, `-active`, `-danger`, `-accent` | app | Button `md`: `neutral`, `pressed`, `danger`, `quiet` |
| `Button` with `buttonKinds` (main, control, tapPad) and sizes sm, default, lg | proto | Button `lg`, `md`. `tapPad` goes |
| `zoneButton.ts` | proto | Button `dense`, with `pressed` |
| Transport buttons in `VideoStage.tsx`, `TransportCluster`, `VideoStageChrome`, `MatchVideoOverlayBar` | both | Button `chrome`, inside VideoPlayer |
| `BestTimingControl` | proto | Overlay `menu` with Fields |
| `ui-mine/Input`, `Label`, native selects, `btn-kind-field`, `WfField`, score inputs in `MatchDetails` | both | Field |
| `SegmentedChoice`, `ChoicePillRow`, `MultiChoicePillRow`, `TwoColChoiceGrid`, `SimpleTaggingModePickerBlock`, Complete / Part filmed, Account demo mode, `ThemeSwitcher` | both | Segmented |
| `TabBarBlock`, `SummaryCategoryNavBlock`, tabs in `PageHeader` | both | Tabs |
| `ui-mine/Badge`, `WfWarnBadge`, filter count bubble | both | Badge. `WfBadge` goes |
| `ui-mine/Card` and its Header, Title, Description, Footer; proto `Card` | both | Card. `interactive` lift goes |
| `HomeMatchRowBlock`, `ContinueTaggingBlock`, match list card, `ReelListBlock`, `ClipQueueBlock`, `ClipPresetListBlock`, `RallyRowBlock`, Matches row, `WfRow`, set rows in `TagVideoCard` | both | ListRow |
| Callout tokens, `ContextPolishBlock`, `SetEndWarningBlock`, `LockedSectionBlock`, flag rows in `MatchDetails`, warning box in `TagVideoCard`, `WfEmpty`, every empty state | both | Callout |
| `ui-mine/Dialog`, `alert-dialog`, `MatchResultEntryModal`, `CompletionModal`, `Pass1LeaveDraftChoiceBlock`, `EvidenceDrawerBlock`, proto filter surface | both | Overlay |
| `BrowseDisclosure`, video card chevron | both | Disclosure |
| `ui-mine/Table`, `DataTableBlock`, result table, InsightCard grid | both | DataTable |
| `ui-mine/Icon` | both | Icon. The shipping shell's direct `lucide-react` import goes |
| `AppShell` bottom bar (app), `.shell-bar` and `.shell-rail` (proto) | both | Nav in Shell. `Sidebar.tsx` and `Header.tsx` go |
| `PageHeader`, `StickyChrome` | proto | TopRow |
| `MatchListFiltersBlock`, `ScopeControlBlock`, `PlaylistFocusPickerBlock`, proto filter icon, chips and panel | both | FilterBar |
| `HeadlineMetricsBlock`, `CompareCardBlock`, `TakeawaysBlock`, `ReviewPatternBlock`, `SummaryCategoryPlaylistBlock`, `InsightCard` | both | InsightCard |
| `VideoPlayer`, `MatchScoreHud`, `ClipStageBlock`, `RallyPlayerBlock`, `VideoStage`, `PlaylistPlayer`, Tag page preview | both | VideoPlayer and its variants |
| `TagVideoCard`, `.card-time`, `.tag-strip` | proto | VideoCard, SetTimeline |
| `MatchFormSection`, `MatchContextBlock`, `SignInFormBlock`, `MatchDetails` | both | Page form with Fields, ResultEditor |
| `MatchStorageBlock`, `AccountPage` cards | both | Card with `setting` rows and Buttons |
| `SetPanelBlock` | app | Card `flush` with RallyPills |
| `Pass1FocusComposer`, `SimpleTaggingComposer`, `RallyEditComposer` | app | Set Tagger layout. Edit rally is its Edit Rally mode |
| `Pass1ChromeProtoBlock` (serve, point, history, Done, Leave) | app | Set Zone, Rally Zone, Back on the picture |
| `TimelinePill`, shot rail cell | app | ShotCell |
| `Pass1ContactCaptureBlock` | app | InputRegion, `--region-action`, spanning |
| `SimpleTaggingMatrixBlock`, Let / Discard / Save row | app | InputRegions. Discard is a `dense` Button in the Rally Zone |
| `SetZone.tsx` (`.tag-pill`, `.tag-gap-slot`) | proto | RallyPill |
| `RallyZone.tsx`, `railCell`, `shotPaint`, `PartLabel` | proto | RallyHead, ShotCell |
| `InputArea.tsx` `RegionButton`, `BestPanel.tsx`, `inputModes.ts` | proto | InputRegion |
| `GatePage`, `AccountGateComposer` | both | Gate layout, Cards, Fields |
| `TrainingLibraryComposer` | app | Page cards with Fields. Not in proto, so no part of its own |
| SVG table-tennis buttons, 3×3 grids, Phase 1 kit, data viewer | app | None. Removed, as stage 1 found them unused |

## 8. Open questions

1. Is proto the target? If `app/` is still meant to ship, the Clips, Training and storage screens need a decision about whether they are previewed.
2. On tablets and desktop the middle column has spare height: 214px at 1180×820, 148px at 1440×900. This spec leaves it as bands around the picture. The Set and Rally Zones could instead grow to 48 and 80 there, with 44px buttons, at no cost to the picture. That breaks the doc's fixed 40 and 64.
3. A saved set opens with an empty Input Area: 521px blank on a phone. That is documented behaviour, so it is unchanged. What should fill it is a product decision.
4. BH and FH answers use the same blue and orange as You and Them. The tokens are separate (`--wing-*`, `--player-*`) so a theme can split them. Should it?
5. Landscape always means wings. A near-square window (900×800) gets a 612×344 picture where the stacked layout would give 811×456. A 12.9" iPad in landscape would gain 12% width stacked. Keep wings for thumb reach, or pick the larger picture when the pointer is a mouse?
6. The 144 wing minimum counts the safe-area inset. On an installed iPhone 15 that leaves 129 clear of the inset in a 188 wing. Counting only clear width would cost 30px of picture.
7. Self-hosting the font needs files outside `design-audit/`, so it is left for implementation.
8. The proto Gate is three stub cards. The real sign-in content is not defined anywhere.

## 9. Corrections to stage 1

`inventory.md`: the proto nav bar is 48px on a coarse pointer (it said 44px), and `CornerPad.tsx` does not exist (the zone doc still lists it). Nothing else changed.
