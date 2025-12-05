# TT Rally Tagger — Design System Specification

---

## 1. Design Principles

### 1.1 Speed First
- Every interaction should complete in under 300ms perceived time
- Primary actions require maximum 1 tap
- No confirmation dialogs for reversible actions
- Auto-advance where predictable (shot tagging)

### 1.2 Low Cognitive Load
- Maximum 5-7 visible options per decision point
- Group related controls spatially
- Use color and size to create instant visual hierarchy
- Hide conditional fields until relevant

### 1.3 Touch-Friendly
- Minimum tap target: 48×48px
- Primary actions: 56px+ height
- Adequate spacing between interactive elements (minimum 8px gap)
- No hover-only interactions for critical paths

### 1.4 Information Density
- Show data, hide chrome
- Use compact but readable typography
- Leverage color coding over labels where possible
- Progressive disclosure for secondary information

### 1.5 Consistency
- Same component = same behavior everywhere
- Predictable placement (primary actions bottom-right, navigation top-left)
- Uniform animation timing (150ms ease-out for micro, 300ms for panels)

---

## 2. Color System

### 2.1 Brand Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-primary` | `#14b8a6` | Primary CTAs, active states, links |
| `brand-primary-hover` | `#0d9488` | Hover state for primary |
| `brand-primary-muted` | `#14b8a6` at 15% | Subtle backgrounds, selection highlights |

### 2.2 Neutral / Grayscale

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-950` | `#0a0a0a` | Deepest background (video player) |
| `neutral-900` | `#171717` | App shell background |
| `neutral-850` | `#1a1a1a` | Primary surface |
| `neutral-800` | `#252525` | Card backgrounds |
| `neutral-700` | `#333333` | Elevated cards, input backgrounds |
| `neutral-600` | `#525252` | Borders, dividers |
| `neutral-500` | `#737373` | Placeholder text, disabled |
| `neutral-400` | `#9ca3af` | Secondary text |
| `neutral-300` | `#d1d5db` | Tertiary text |
| `neutral-100` | `#f3f4f6` | Primary text |
| `neutral-50` | `#fafafa` | Brightest text (headings) |

### 2.3 Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22c55e` | Completed states, scoring rallies, "good" quality |
| `success-muted` | `#22c55e` at 15% | Success backgrounds |
| `warning` | `#f59e0b` | Pending states, non-scoring rallies, "average" quality |
| `warning-muted` | `#f59e0b` at 15% | Warning backgrounds |
| `danger` | `#ef4444` | Errors, destructive actions, "weak" quality |
| `danger-muted` | `#ef4444` at 15% | Error backgrounds |
| `info` | `#3b82f6` | Informational, defensive shots |
| `info-muted` | `#3b82f6` at 15% | Info backgrounds |

### 2.4 Shot Type Colors

| Category | Color | Hex |
|----------|-------|-----|
| Defensive | Blue | `#3b82f6` |
| Neutral | Gray | `#6b7280` |
| Aggressive | Orange | `#f97316` |

### 2.5 Background Layers (Elevation)

| Layer | Token | Hex | Usage |
|-------|-------|-----|-------|
| 0 | `bg-app` | `#0a0a0a` | Video player, full bleed |
| 1 | `bg-shell` | `#171717` | App shell, sidebars |
| 2 | `bg-surface` | `#1a1a1a` | Main content area |
| 3 | `bg-card` | `#252525` | Cards, panels |
| 4 | `bg-elevated` | `#333333` | Dropdowns, tooltips, modals |

### 2.6 Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Cards |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | Modals, dropdowns |
| `shadow-glow` | `0 0 20px rgba(20,184,166,0.3)` | Focus rings, active states |

---

## 3. Typography System

### 3.1 Font Families

| Token | Font Stack | Usage |
|-------|-----------|-------|
| `font-sans` | `"Plus Jakarta Sans", "DM Sans", system-ui, sans-serif` | All UI text |
| `font-mono` | `"JetBrains Mono", "Fira Code", monospace` | Scores, timestamps, data |

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 11px | 16px | 400 | Badges, captions |
| `text-sm` | 13px | 18px | 400 | Secondary labels, meta |
| `text-base` | 15px | 22px | 400 | Body text, inputs |
| `text-lg` | 17px | 24px | 500 | Section headers |
| `text-xl` | 20px | 28px | 600 | Page titles |
| `text-2xl` | 24px | 32px | 700 | Match scores |
| `text-3xl` | 30px | 36px | 700 | Hero numbers |
| `text-4xl` | 36px | 42px | 700 | Large stats display |

### 3.3 Typography Use Cases

| Element | Size | Weight | Color | Case |
|---------|------|--------|-------|------|
| Page title | `text-xl` | 600 | `neutral-50` | Sentence |
| Section header | `text-lg` | 500 | `neutral-100` | Sentence |
| Card title | `text-base` | 600 | `neutral-100` | Sentence |
| Body text | `text-base` | 400 | `neutral-300` | Sentence |
| Label | `text-sm` | 500 | `neutral-400` | Sentence |
| Button text | `text-base` | 600 | `neutral-50` | Sentence |
| Badge | `text-xs` | 600 | varies | UPPERCASE |
| Score display | `text-2xl` | 700 | `neutral-50` | N/A |
| Timestamp | `text-sm` / mono | 400 | `neutral-400` | N/A |
| Table header | `text-xs` | 600 | `neutral-400` | UPPERCASE |
| Table cell | `text-sm` | 400 | `neutral-300` | Sentence |

---

## 4. Spacing / Sizing Scale

### 4.1 Spacing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | None |
| `space-1` | 4px | Tight gaps, icon-text |
| `space-2` | 8px | Default gap between elements |
| `space-3` | 12px | Input padding, small cards |
| `space-4` | 16px | Card padding, section gaps |
| `space-5` | 20px | Medium separation |
| `space-6` | 24px | Large section gaps |
| `space-8` | 32px | Major sections |
| `space-10` | 40px | Page margins |
| `space-12` | 48px | Large page gaps |
| `space-16` | 64px | Hero spacing |

### 4.2 Padding Standards

| Component | Padding |
|-----------|---------|
| Cards | 16px (all sides) |
| Buttons (small) | 8px 12px |
| Buttons (default) | 12px 20px |
| Buttons (large) | 16px 24px |
| Inputs | 12px 14px |
| Modals | 24px |
| Sidebar | 16px |
| Table cells | 8px 12px |

### 4.3 Hit Target Minimums

| Element | Minimum Size |
|---------|--------------|
| Icon button | 40×40px |
| Text button | 36px height |
| Primary action | 48px height |
| Critical action (CONTACT) | 56px height |
| Touch target spacing | 8px minimum gap |

---

## 5. Border Radius & Corners

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Timeline, video player edges |
| `radius-sm` | 4px | Badges, chips, small inputs |
| `radius-md` | 6px | Buttons, inputs |
| `radius-lg` | 8px | Cards, panels |
| `radius-xl` | 12px | Modals, large cards |
| `radius-2xl` | 16px | Hero cards |
| `radius-full` | 9999px | Pills, avatars |

### Component Radius Assignments

| Component | Radius |
|-----------|--------|
| Buttons | `radius-md` (6px) |
| Input fields | `radius-md` (6px) |
| Cards | `radius-lg` (8px) |
| Modals | `radius-xl` (12px) |
| Badges | `radius-sm` (4px) |
| Chips | `radius-full` |
| Avatars | `radius-full` |
| Timeline markers | `radius-sm` (4px) |

---

## 6. Layout Rules

### 6.1 App Shell Layout

**Desktop (≥1024px):**
- Fixed left sidebar: 240px width
- Collapsible to 64px (icons only)
- Main content: fluid, max-width 1400px centered
- Top header: 56px height, sticky

**Tablet (768-1023px):**
- Sidebar collapses to overlay drawer
- Main content: full width with 24px padding
- Top header: 56px height

**Mobile (<768px):**
- Bottom navigation bar: 64px
- No sidebar
- Main content: full width with 16px padding
- Top header: 48px height

### 6.2 Sidebar Rules

- Background: `bg-shell` (#171717)
- Width: 240px expanded, 64px collapsed
- Items: 48px height, full width
- Active item: left border accent (4px `brand-primary`)
- Hover: `bg-card` background

### 6.3 Panel Rules

- Panels sit on `bg-surface`
- Cards within panels use `bg-card`
- Consistent 16px gap between cards
- Max card width in grid: 400px

### 6.4 Video Player Layout

- Video area: 16:9 aspect ratio maintained
- Controls overlay: bottom 60px, semi-transparent gradient
- Timeline strip: below video, 60px height
- Tagging controls: below timeline, 180px height

### 6.5 Button Placement Conventions

| Context | Primary Action | Secondary Action |
|---------|---------------|------------------|
| Forms | Bottom right | Bottom left |
| Modals | Bottom right | Bottom left |
| Cards | Bottom or inline right | Left of primary |
| Toolbars | Right side | Left side |
| Confirmation | Right (confirm) | Left (cancel) |

### 6.6 Mobile vs Desktop Rules

| Element | Desktop | Mobile |
|---------|---------|--------|
| Primary navigation | Left sidebar | Bottom bar |
| Filters | Inline bar | Collapsible drawer |
| Shot tagging panel | Right panel | Full screen overlay |
| Video + controls | Stacked vertical | Stacked vertical |
| Stats comparison | Side-by-side columns | Stacked tabs |

---

## 7. Components Library

### 7.1 Buttons

#### Primary Button
- Background: `brand-primary`
- Text: `neutral-50`, weight 600
- Height: 44px (default), 48px (large), 36px (small)
- Radius: 6px
- Hover: `brand-primary-hover`
- Active: Scale 0.98
- Disabled: 50% opacity, no pointer events

#### Secondary Button
- Background: `neutral-700`
- Border: 1px `neutral-600`
- Text: `neutral-100`
- Hover: `neutral-600` background

#### Ghost Button
- Background: transparent
- Text: `neutral-300`
- Hover: `neutral-800` background

#### Destructive Button
- Background: `danger`
- Text: `neutral-50`
- Hover: Darken 10%

### 7.2 Inputs

#### Text Input
- Background: `neutral-700`
- Border: 1px `neutral-600`
- Text: `neutral-100`
- Placeholder: `neutral-500`
- Focus: Border `brand-primary`, `shadow-glow`
- Height: 44px
- Radius: 6px

#### Number Input
- Same as text, with stepper buttons
- Monospace font for value

#### Dropdown / Select
- Trigger: Same style as text input
- Menu: `bg-elevated`, `shadow-lg`
- Options: 40px height, hover `brand-primary-muted`
- Selected: `brand-primary` text + checkmark

### 7.3 Tables

#### Dense Table
- Row height: 36px
- Cell padding: 6px 10px
- Font: `text-sm`
- Header: `text-xs` uppercase, `neutral-400`
- Alternating: None (use hover)
- Hover row: `bg-card`

#### Relaxed Table
- Row height: 48px
- Cell padding: 12px 16px
- Font: `text-base`
- Borders: 1px `neutral-700` between rows

### 7.4 Cards

- Background: `bg-card`
- Border: None (or 1px `neutral-700` for emphasis)
- Radius: 8px
- Padding: 16px
- Shadow: `shadow-md`
- Hover (clickable): Border `neutral-600`, slight lift

### 7.5 Tabs

- Container: `bg-shell` background strip
- Tab: 44px height, `text-sm` weight 500
- Inactive: `neutral-400` text
- Active: `neutral-50` text, bottom border 2px `brand-primary`
- Hover: `neutral-300` text

### 7.6 Accordions

- Header: 48px height, full width
- Chevron: Right side, rotates on expand
- Content: Padding 16px, `bg-card` background
- Border: 1px `neutral-700` between items

### 7.7 Toolbars

- Background: `bg-surface`
- Height: 56px
- Items: Centered vertically, 8px gap
- Border: Bottom 1px `neutral-700`

### 7.8 Filter Bar

- Background: `bg-card`
- Height: 48px
- Items: Inline, 12px gap
- Chips for active filters
- Clear all: Ghost button right

### 7.9 Tagging Quick-Access Panel

- Fixed position: Bottom of screen
- Background: `bg-card` with top shadow
- Height: 180px
- Primary button (CONTACT): 56px height, full width, `brand-primary`
- Secondary buttons: 48px height, side by side

### 7.10 Shot Type Chips

- Padding: 6px 12px
- Radius: `radius-full`
- Font: `text-sm` weight 500
- Defensive: `info` background muted, `info` text
- Neutral: `neutral-600` background, `neutral-200` text
- Aggressive: `warning` background muted, `warning` text
- Selected: Solid background, white text

### 7.11 Nav Sidebar

- Background: `bg-shell`
- Width: 240px
- Logo area: 56px height
- Nav item: 48px height, 16px padding
- Icon: 20px, 12px gap to label
- Active: Left border 4px `brand-primary`, `bg-card` background

### 7.12 Top App Bar

- Background: `bg-surface`
- Height: 56px
- Left: Back arrow + page title
- Right: Action icons (24px, 8px gap)
- Border: Bottom 1px `neutral-700`

### 7.13 Dialogs / Modals

- Overlay: `#000` at 60% opacity
- Container: `bg-elevated`, max-width 480px, centered
- Radius: 12px
- Padding: 24px
- Title: `text-lg` weight 600
- Actions: Right-aligned, 8px gap

### 7.14 Bottom Sheets (Mobile)

- Background: `bg-elevated`
- Radius: 16px top corners only
- Handle: 40px wide, 4px height, centered, `neutral-600`
- Max height: 90vh
- Padding: 24px

### 7.15 Toast Notifications

- Position: Bottom center, 24px from edge
- Background: `bg-elevated`
- Radius: 8px
- Padding: 12px 16px
- Icon left: 20px
- Max width: 400px
- Auto-dismiss: 4 seconds
- Success: Left border 4px `success`
- Error: Left border 4px `danger`

### 7.16 Video Timeline Overlay

- Background: `neutral-800` at 90%
- Height: 60px
- Track: 4px height, `neutral-600`
- Playhead: 12px wide, `neutral-50`
- Contact markers: 2px wide, 20px height, `brand-primary`
- Rally end (score): 4px wide, 30px height, `success`
- Rally end (no score): 4px wide, 30px height, `warning`

### 7.17 Floating Tagging Panel

- Position: Fixed bottom
- Background: `bg-card`
- Border: Top 1px `neutral-700`
- Shadow: `shadow-lg` upward
- Padding: 16px
- Radius: Top corners 12px

---

## 8. Iconography

### 8.1 Lucide Icon Guidelines

- Default size: 20px
- Small (badges, inline): 16px
- Large (empty states, heroes): 48px
- Stroke width: 2px (default), 1.5px (dense contexts)
- Color: Inherits from text color

### 8.2 Icon Mapping

| Action | Icon Name |
|--------|-----------|
| Back / Navigate | `arrow-left` |
| Close | `x` |
| Menu | `menu` |
| Settings | `settings` |
| Add / Create | `plus` |
| Delete | `trash-2` |
| Edit | `pencil` |
| Save | `check` |
| Search | `search` |
| Filter | `filter` |
| Sort | `arrow-up-down` |
| Play | `play` |
| Pause | `pause` |
| Fast forward | `fast-forward` |
| Rewind | `rewind` |
| Volume | `volume-2` |
| Expand | `maximize-2` |
| User / Player | `user` |
| Match | `swords` |
| Rally | `activity` |
| Stats | `bar-chart-3` |
| Calendar | `calendar` |
| Clock / Time | `clock` |
| Video | `video` |
| Upload | `upload` |
| Download | `download` |
| Sync | `refresh-cw` |
| Success | `check-circle` |
| Warning | `alert-triangle` |
| Error | `x-circle` |
| Info | `info` |
| Chevron right | `chevron-right` |
| Chevron down | `chevron-down` |
| More options | `more-vertical` |

### 8.3 Icon Sizing Rules

| Context | Size | Stroke |
|---------|------|--------|
| Button with text | 18px | 2px |
| Icon-only button | 20px | 2px |
| Navigation item | 20px | 2px |
| Table row action | 16px | 1.5px |
| Badge/chip | 14px | 1.5px |
| Empty state | 48px | 1.5px |

---

## 9. Interaction Patterns

### 9.1 Button States

| State | Visual Change |
|-------|---------------|
| Default | Base styling |
| Hover | Background shifts 1 shade darker, cursor pointer |
| Active / Pressed | Scale 0.98, background 1 shade darker |
| Focus | `shadow-glow` ring, 2px offset |
| Disabled | 50% opacity, cursor not-allowed |
| Loading | Spinner replaces icon/text, disabled state |

### 9.2 Card States

| State | Visual Change |
|-------|---------------|
| Default | Base card styling |
| Hover (clickable) | Border `neutral-600`, translateY(-2px) |
| Selected | Border 2px `brand-primary`, `brand-primary-muted` background |
| Disabled | 50% opacity |

### 9.3 Timeline Interactions

- **Click on track**: Seek to position
- **Drag playhead**: Scrub through video
- **Click marker**: Seek to that contact/rally
- **Hover marker**: Show tooltip with timestamp and type

### 9.4 Tagging Shortcuts

| Action | Desktop | Mobile |
|--------|---------|--------|
| Record contact | Spacebar | Tap CONTACT |
| End rally (score) | S | Tap END SCORE |
| End rally (no score) | N | Tap END NO SCORE |
| Undo last | Ctrl+Z | Tap UNDO |
| Play/Pause | K | Tap video |
| Step forward | L | Tap >> |
| Step back | J | Tap << |

### 9.5 Error States

- **Input error**: Red border, `danger` text below, shake animation (150ms)
- **Form error**: Toast notification + highlight first error field
- **Network error**: Banner at top, retry button
- **Empty state**: Centered illustration, helpful text, CTA

### 9.6 Loading States

- **Page load**: Skeleton screens matching layout
- **Button action**: Inline spinner, disabled state
- **Data fetch**: Skeleton rows/cards
- **Video load**: Centered spinner over black

---

## 10. Figma-Ready Prompts

### 10.1 Core Components Library

```
Create a complete UI component library for a dark-themed Table Tennis Rally Tagger application.

BUTTONS:
1. Primary Button: Background #14b8a6, white text, 44px height, 6px radius, bold text. Hover state darkens to #0d9488.
2. Secondary Button: Background #333333, border 1px #525252, light gray text, 44px height, 6px radius.
3. Ghost Button: Transparent background, gray text #d1d5db, 44px height. Hover shows #252525 background.
4. Destructive Button: Background #ef4444, white text, 44px height, 6px radius.
5. Icon Button: 40x40px, transparent, centered icon 20px, hover #252525 background.
Show all buttons in default, hover, and disabled states.

INPUTS:
1. Text Input: Background #333333, border 1px #525252, white text, placeholder #737373, 44px height, 6px radius, 14px padding. Focus state: border #14b8a6 with subtle glow.
2. Number Input: Same as text with +/- stepper buttons on right.
3. Dropdown Select: Trigger same as text input with chevron-down icon. Dropdown menu: background #333333, shadow, options 40px height each.
4. Checkbox: 20x20px box, #333333 background, #525252 border. Checked: #14b8a6 background with white checkmark.
5. Toggle Switch: 44x24px track, 20px circle thumb. Off: #525252 track. On: #14b8a6 track, thumb slides right.

CARDS:
1. Default Card: Background #252525, 8px radius, 16px padding, no border.
2. Clickable Card: Same with hover state showing #525252 border and slight lift shadow.
3. Selected Card: 2px #14b8a6 border, background tinted with 15% #14b8a6.

BADGES & CHIPS:
1. Status Badge: Small capsule, uppercase text 11px bold. Success: green background. Warning: amber background. Neutral: gray.
2. Shot Type Chip: Pill shape (full radius), 13px text. Blue for defensive, gray for neutral, orange for aggressive. Selected state: solid color with white text.

TABLES:
1. Dense Table: 36px row height, 13px font, gray header row uppercase, hover highlights row.
2. Data Table: 48px row height, 15px font, borders between rows.

TABS:
Horizontal tab bar, 44px height, tabs with 2px bottom border when active (teal), inactive tabs gray text.

ACCORDION:
48px header height, chevron icon right that rotates on expand, content area with 16px padding.

All components should use the color palette: Background #1a1a1a, Cards #252525, Inputs #333333, Primary accent #14b8a6, Text primary #f3f4f6, Text secondary #9ca3af.

Font: Plus Jakarta Sans or DM Sans, geometric and clean.
```

---

### 10.2 App Shell & Global Layout

```
Create an application shell layout for a dark-themed Table Tennis Rally Tagger SPA.

DESKTOP LAYOUT (1440px width):

TOP HEADER BAR:
- Height: 56px
- Background: #1a1a1a
- Left side: Back arrow icon (20px) + page title "Match Setup" in 17px semibold white text
- Right side: Settings gear icon, User avatar circle 32px
- Bottom border: 1px #333333

LEFT SIDEBAR:
- Width: 240px
- Background: #171717
- Top: App logo "TT Tagger" in bold 20px teal text, 56px height
- Navigation items below logo, each 48px height:
  - Icon (20px) + Label (15px), 16px left padding
  - Items: Dashboard, Matches, Players, Stats, Settings
  - Active item: Left border 4px teal, background #252525
  - Inactive: Gray text #9ca3af
  - Hover: Background #252525

MAIN CONTENT AREA:
- Background: #1a1a1a
- Padding: 24px
- Max-width: 1200px centered
- Shows placeholder content area

MOBILE LAYOUT (375px width):

TOP HEADER:
- Height: 48px
- Hamburger menu icon left, title center, icons right

BOTTOM NAV BAR:
- Height: 64px fixed bottom
- Background: #171717
- 5 icons evenly spaced: Home, Matches, + (create), Stats, Profile
- Active icon: Teal color
- Inactive: Gray

MAIN CONTENT:
- Full width, 16px horizontal padding
- Scrollable

Show both desktop and mobile versions side by side.
```

---

### 10.3 Color Tokens & Typography Tokens

```
Create a design tokens reference sheet for a Table Tennis Rally Tagger application.

COLOR TOKENS:

Brand Colors (row of swatches with labels):
- brand-primary: #14b8a6 (Teal - primary actions)
- brand-primary-hover: #0d9488 (Darker teal)
- brand-primary-muted: #14b8a6 at 15% opacity (Selections, highlights)

Neutral Scale (horizontal gradient bar with stops):
- neutral-950: #0a0a0a (Deepest - video player)
- neutral-900: #171717 (App shell)
- neutral-850: #1a1a1a (Surface)
- neutral-800: #252525 (Cards)
- neutral-700: #333333 (Inputs, elevated)
- neutral-600: #525252 (Borders)
- neutral-500: #737373 (Placeholder, disabled)
- neutral-400: #9ca3af (Secondary text)
- neutral-300: #d1d5db (Body text)
- neutral-100: #f3f4f6 (Primary text)
- neutral-50: #fafafa (Headings)

Semantic Colors (grouped swatches):
- success: #22c55e (Scoring, complete, good)
- success-muted: #22c55e at 15%
- warning: #f59e0b (Pending, average)
- warning-muted: #f59e0b at 15%
- danger: #ef4444 (Error, destructive, weak)
- danger-muted: #ef4444 at 15%
- info: #3b82f6 (Information, defensive shots)
- info-muted: #3b82f6 at 15%

TYPOGRAPHY TOKENS:

Font Family showcase:
- Primary: "Plus Jakarta Sans" - Show "Aa Bb Cc 123"
- Monospace: "JetBrains Mono" - Show "00:12:34"

Type Scale (vertical stack, each with sample text):
- text-xs / 11px / line 16px: "BADGE LABEL"
- text-sm / 13px / line 18px: "Secondary text and metadata"
- text-base / 15px / line 22px: "Body text and input values"
- text-lg / 17px / line 24px: "Section Header"
- text-xl / 20px / line 28px: "Page Title"
- text-2xl / 24px / line 32px: "11 - 9"
- text-3xl / 30px / line 36px: "147"
- text-4xl / 36px / line 42px: "3"

SPACING TOKENS (horizontal bar showing increments):
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

RADIUS TOKENS (squares showing each radius):
- radius-sm: 4px
- radius-md: 6px
- radius-lg: 8px
- radius-xl: 12px
- radius-2xl: 16px
- radius-full: 9999px (circle)

SHADOW TOKENS (cards showing each shadow):
- shadow-sm: subtle lift
- shadow-md: card elevation
- shadow-lg: modal/dropdown
- shadow-glow: teal focus glow

Layout on white canvas with clear section headings and organized grid.
```

---

### 10.4 Video Tagging Components

```
Create specialized video tagging UI components for a Table Tennis Rally Tagger.

VIDEO PLAYER SECTION:
- 16:9 aspect ratio video area, black background #0a0a0a
- Overlay controls at bottom (gradient from transparent to #000 at 60%):
  - Play/Pause button center (48px circle, white icon)
  - Speed selector: "0.5x" "0.75x" "1x" buttons, current highlighted
  - Frame step buttons: "<<" ">>" small icons
- Progress bar: thin 4px track, white playhead, buffered in gray

TIMELINE STRIP:
- Height: 60px
- Background: #333333
- Horizontal track: 4px height, #525252
- Playhead: 2px white vertical line, full height
- Contact markers: 2px wide, 20px height, cyan #06b6d4
- Rally end (scoring): 4px wide, 30px height, green #22c55e
- Rally end (no score): 4px wide, 30px height, orange #f97316
- Show approximately 15 markers distributed across timeline
- Current time label: monospace, left side "02:34"

SCORE & SERVER DISPLAY:
- Height: 48px
- Background: #252525
- Left: Large score "7 - 5" in 24px bold monospace, player names smaller above each number
- Right: Server indicator icon (small ping pong paddle) + "Marcus serving" text
- Subtle divider between sections

TAGGING CONTROLS PANEL:
- Height: 180px
- Background: #252525
- Top shadow (inverted, glows upward)
- Primary button: "CONTACT" - Full width, 56px height, teal #14b8a6, bold white text, prominent
- Two buttons below, side by side with 8px gap:
  - "END RALLY — SCORE" - 48px height, green #22c55e background
  - "END RALLY — NO SCORE" - 48px height, gray #525252 background
- Bottom right corner: Small "UNDO" ghost button with undo icon

WINNER DIALOG (shown as overlay):
- Dark overlay #000 at 60%
- Centered card 400px wide, #333333 background, 12px radius
- Title: "Who won the point?" in 17px semibold centered
- Two large buttons stacked vertically, 60px height each, teal, full width:
  - "Player 1 — Marcus"
  - "Player 2 — Chen"

Stack all these components vertically to show complete tagging interface.
```

---

_End of Design System Specification_










