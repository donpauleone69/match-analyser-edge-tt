# PlayerProfileClaudePrompt.md

You are an expert product/UX designer and frontend engineer helping design the **Player Profile UI page** for the Edge TT Match Analyser web app.

You must:
- Read and respect the **PlayerProfile_Spec.md** and **PlayerProfile_UserGuide.md** concepts (summarised below).
- Propose a **clear, production-ready UI specification** for the Player Profile page.
- Focus on **coach-friendly UX**, low friction, and mobile-first layout.
- Output concrete UI structures, sections, and component behaviours that a frontend dev can implement.

---

## Context (summarised)

- There is an existing `PLAYERS` table with identity data (uuid, name, date_of_birth, profile_picture_url, club_id, handedness, playstyle, rubber types, bio, etc.).
- A new `PLAYER_PROFILES` model extends this with technical skills / consistency / spin-handling / positional comfort / derived level.

Key points from the spec & guide:

- Coaches **do not** enter numeric values or levels.
- Instead, coaches pick **descriptive options** for each skill such as:
  - “Cannot do it at all”
  - “Can do in practice, not in matches yet”
  - “Functional but unreliable in matches”
  - “Reliable under normal match pressure”
  - “High-level weapon; regularly creates pressure”
- Internally, each description maps to a numeric score 0–10.
- The system derives:
  - `system_level` (beginner / intermediate / advanced / performance / elite)
  - `system_level_score` (0–100)
  - `decision_bias` (tooPassive / tooAggressive / spinMisread / etc.)
- Profile sections:
  1. Core identity: style, handedness (mirrors existing `PLAYERS` data).
  2. Technical skills: FH/BH loop vs under, flicks, counters.
  3. Consistency: FH/BH/receive/push.
  4. Spin handling: vs under/top/no-spin.
  5. Positional comfort: pivot, wide FH/BH, close/far table.

The resulting UI will be used by *coaches* and occasionally *parents* on phones and tablets.

---

## Your Tasks

### 1. Information Architecture

Design the **structure** of the Player Profile page. Include:

- Sections and their order.
- When and how each section is shown (e.g. collapsed/expanded by default).
- How it links/aligns with the existing `PLAYERS` detail page.

### 2. Interaction & Components

For each section, specify:

- The core component type(s) to use:
  - radio groups, segmented controls, dropdowns, sliders, accordions, etc.
- Exact UX for choosing a skill description:
  - e.g. vertical list of cards, radio-row chips, stepper UI, etc.
- How many options should be visible at once (especially on mobile).
- How to make it **fast to use** for coaches entering multiple players.

Important: **Do NOT use plain numeric sliders**. You must use descriptive choice components.

### 3. Visual Hierarchy & Layout

Describe:

- Header layout (player name, club, picture, age).
- How to show derived summaries like:
  - `System level: Advanced (68/100)`
  - “Decision bias: too aggressive on FH”
- How to highlight incomplete sections and guide the coach to fill the most important parts first.
- A mobile-first column layout, and how it scales to desktop (2-column vs 1-column, etc.).

### 4. Descriptive Option Design

For at least **one full section**, e.g. *Technical Skills*, define:

- The exact text for each option for **one sample skill** (e.g. FH Loop vs Under).
- The visual style (e.g. compact list items vs big cards).
- Guidance hints (tooltips or helper text).
- Any reuse of the same option set across multiple skills.

You can assume the following for internal mapping (do not show to users, but design around them):

- 0–2: very weak
- 3–5: developing / functional
- 6–7: reliable / strong
- 8–9: weapon / outstanding
- 10: elite

### 5. Editing & Saving Behaviour

Define:

- How edits are saved (auto-save vs explicit Save button).
- How unsaved changes are surfaced.
- How to support “quick profiling” mode:
  - Minimal subset of fields for a fast 30–60 second setup.
- How to support “deep profiling” mode:
  - Expanded fields for advanced / performance players.

### 6. States & Edge Cases

Cover:

- Empty state: new player with no profile yet.
- Partially filled profiles.
- Archived players (`is_archived = true`).
- Read-only mode (e.g. when viewed by parents/players without edit permission).

### 7. Output Format

Return your answer as:

1. A high-level narrative spec (in markdown sections).
2. Bullet-pointed breakdowns of components per section.
3. Where helpful, simple ASCII/markdown wireframes for layout.

Do **not** write code or CSS.  
Focus on a design spec that a dev + designer team could implement directly.
