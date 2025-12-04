# Gestures, Intents & Inference Engine Specification

Filename: `gestures_Intents_Inference_Engine.md`  

This document defines the **shot input model**, **serve input model**, gesture mapping, and inference rules for the Edge TT Match Analyser, aligned with the canonical **`shots`** table schema.

It is intended for:

- UI / gesture implementation
- Backend inference logic
- Schema design for the `shots` table
- Other agents (e.g. Cursor) working on this codebase

All names and enums in this document use the **same terminology** as the database schema (snake_case, same value sets).

---

## 1. Core Ideas

### 1.1 Rally shots

Each **rally shot** (non-serve) is captured with:

1. A tap on a 6-button **Wing × Intent** grid:
   - Wing: `FH` or `BH`
   - Intent: `defensive`, `neutral`, `aggressive`

2. A **single continuous gesture** over the shot touch zone:
   - `none`
   - `hold`
   - `swipeLeft`
   - `swipeRight`
   - `holdLeft`
   - `holdRight`
   - `swipeUp`
   - `swipeDown`

From these we derive and store on the `shots` row:

- `landing_zone`       – direction channel: `to_bh | to_mid | to_fh | null`
- `shot_result`        – compact quality/outcome: `good | average | in_net | missed_long`
- `pressure_level`     – contextual pressure: `low | medium | high`
- `is_rally_end`       – whether this shot participates in rally end
- `rally_end_role`     – `winner | forced_error | unforced_error | none`
- `intent_quality`     – `correct | over_aggressive | over_passive | misread`
- `inferred_shot_type` – derived shot family (loop, flick, block, etc.)
- `inferred_shot_confidence` – confidence in that inference

---

### 1.2 Serves

Each **serve** (`shot_index = 1`) uses **two quick inputs**:

1. **Serve placement & length + result**  
   - Tap one of three horizontal length zones (`short`, `half_long`, `long`)  
   - Then perform a gesture (tap/hold/swipe) in that zone to define:
     - `landing_zone` (direction)
     - `shot_result` (good/average/in_net/missed_long)

2. **Spin “ball” touch zone**  
   - Circular spin-pad where swipe direction defines `serve_spin_family`:
     - swipe up / down / left / right / diagonals / tap → `under|top|side|no_spin`

Serve-specific fields on the `shots` row:

- `serve_length`       – `short | half_long | long`
- `serve_spin_family`  – `under | top | side | no_spin`
- `serve_type`         – **exists in schema** but is not yet set by the serve UI in MVP.

Serves then also go through the normal inference steps:

- `pressure_level`
- `intent_quality` (optional for serve)
- `is_rally_end`, `rally_end_role`
- `inferred_shot_type = 'serve'`

---

## 2. Relevant `shots` Schema (Summary)

See `Shots_Schema_Spec.md` for the full table. The engine reads/writes:

```text
shots {
  id             uuid PK
  rally_id       uuid FK
  time           numeric
  shot_index     int
  player_id      uuid FK

  -- Serve-only fields (shot_index = 1)
  serve_type         text / enum          -- exists but not used by MVP UI
  serve_spin_family  text / enum          -- 'under' | 'top' | 'no_spin' | 'side'
  serve_length       text / enum          -- 'short' | 'half_long' | 'long'

  -- Tagging inputs (direct from UI)
  wing            text   -- 'FH' | 'BH'
  intent          text   -- 'defensive' | 'neutral' | 'aggressive'

  -- Derived from gestures
  landing_zone    text   -- 'to_bh' | 'to_mid' | 'to_fh' | null
  shot_result     text   -- 'good' | 'average' | 'in_net' | 'missed_long'
  pressure_level  text   -- 'low' | 'medium' | 'high'

  -- Per-shot inference (1:1 with shot row)
  intent_quality          text   -- 'correct' | 'over_aggressive' | 'over_passive' | 'misread'
  is_rally_end            boolean
  rally_end_role          text   -- 'winner' | 'forced_error' | 'unforced_error' | 'none'
  inferred_shot_type      text   -- see enums below
  inferred_shot_confidence text  -- 'low' | 'medium' | 'high'

  is_tagged       boolean
}
```

---

## 3. Rally Shot Input Model

### 3.1 Wing × Intent Grid

UI: 6 buttons

```text
        FH        BH
Agg   [ FH/A ]  [ BH/A ]
Neut  [ FH/N ]  [ BH/N ]
Def   [ FH/D ]  [ BH/D ]
```

On tap, we capture:

- `wing ∈ { 'FH', 'BH' }`
- `intent ∈ { 'defensive', 'neutral', 'aggressive' }`

Stored directly as `shots.wing`, `shots.intent`.

---

### 3.2 Gestures for Rally Shots

After tapping one grid cell, the user performs exactly **one** of:

- `none`       – just tap, no extra gesture
- `hold`       – long press
- `swipeLeft`
- `swipeRight`
- `holdLeft`
- `holdRight`
- `swipeUp`
- `swipeDown`

Engine type:

```ts
type GestureType =
  | 'none'
  | 'hold'
  | 'swipeLeft'
  | 'swipeRight'
  | 'holdLeft'
  | 'holdRight'
  | 'swipeUp'
  | 'swipeDown';
```

---

## 4. Engine Types (Shared)

```ts
type Wing = 'FH' | 'BH';

type Intent =
  | 'defensive'
  | 'neutral'
  | 'aggressive';

type GestureType =
  | 'none'
  | 'hold'
  | 'swipeLeft'
  | 'swipeRight'
  | 'holdLeft'
  | 'holdRight'
  | 'swipeUp'
  | 'swipeDown';

type LandingZone = 'to_bh' | 'to_mid' | 'to_fh' | null;

type ShotResult =
  | 'good'
  | 'average'
  | 'in_net'
  | 'missed_long';

type PressureLevel = 'low' | 'medium' | 'high';

type IntentQuality =
  | 'correct'
  | 'over_aggressive'
  | 'over_passive'
  | 'misread';

type InferredShotType =
  | 'serve'
  | 'fh_loop_vs_under'
  | 'bh_loop_vs_under'
  | 'fh_flick'
  | 'bh_flick'
  | 'fh_block'
  | 'bh_block'
  | 'fh_counter'
  | 'bh_counter'
  | 'push'
  | 'chop'
  | 'lob'
  | 'smash'
  | 'other'
  | 'unknown';

type InferredShotConfidence = 'low' | 'medium' | 'high';

interface EngineShot {
  // Direct from UI
  wing: Wing;
  intent: Intent;
  gesture: GestureType;

  // Derived from gesture & context
  landing_zone: LandingZone;
  shot_result: ShotResult;
  pressure_level: PressureLevel;

  // Derived from player profile + rally context
  intent_quality: IntentQuality;
  is_rally_end: boolean;
  rally_end_role: 'winner' | 'forced_error' | 'unforced_error' | 'none';

  inferred_shot_type: InferredShotType;
  inferred_shot_confidence: InferredShotConfidence;
}
```

---

## 5. Gesture → landing_zone & shot_result (Rally Shots)

| gesture_type | landing_zone | shot_result  | Notes                     |
|--------------|--------------|--------------|---------------------------|
| `none`       | `to_mid`     | `average`    | default, stabilising shot |
| `hold`       | `to_mid`     | `good`       | strong middle shot        |
| `swipeLeft`  | `to_bh`      | `average`    | normal to BH              |
| `swipeRight` | `to_fh`      | `average`    | normal to FH              |
| `holdLeft`   | `to_bh`      | `good`       | strong to BH              |
| `holdRight`  | `to_fh`      | `good`       | strong to FH              |
| `swipeUp`    | `null`       | `missed_long`| out past end line         |
| `swipeDown`  | `null`       | `in_net`     | into net                  |

For **in-play shots**, `landing_zone` is one of `to_bh`, `to_mid`, `to_fh`.  
For **errors**, `landing_zone = null`.

These values are written directly to:

- `shots.landing_zone`
- `shots.shot_result`

---

## 6. Pressure Level Inference

`pressure_level` is inferred per shot from:

- `intent` (`defensive` / `neutral` / `aggressive`)
- `shot_result` (`good` / `average` / error)
- Whether direction changed vs previous shot (`landing_zone` change)

(See full logic in earlier versions; unchanged by serve UX changes.)

---

## 7. Intent Quality, Rally-End, Inferred Shot Type

These sections are unchanged in structure from the previous spec; they operate on serve and rally shots uniformly once the base fields (`landing_zone`, `shot_result`, `serve_length`, `serve_spin_family`, etc.) are set.

---

## 8. Serve Input Model (Detailed)

### 8.1 Input 1 – Placement & Length + Result

UI: horizontal bar split into 3 regions:

```text
[  SHORT  ]  [ HALF-LONG ]  [   LONG   ]
```

**Step A – Tap length zone**

- Tap SHORT      → `serve_length = 'short'`
- Tap HALF-LONG  → `serve_length = 'half_long'`
- Tap LONG       → `serve_length = 'long'`

**Step B – Gesture inside that zone**

- Horizontal:
  - `swipeLeft`  → `landing_zone = 'to_bh'`
  - `swipeRight` → `landing_zone = 'to_fh'`
  - tap/hold (no horizontal) → `landing_zone = 'to_mid'`

- Result / quality:
  - tap (short press)          → `shot_result = 'average'`
  - hold (long press)          → `shot_result = 'good'`
  - full swipeDown (pull down) → `shot_result = 'in_net'`, `landing_zone = null`
  - full swipeUp (push forward)→ `shot_result = 'missed_long'`, `landing_zone = null`

`serve_length` is kept even on faults to capture intended depth.

---

### 8.2 Input 2 – Spin Ball

A circular touch area where:

- tap → `serve_spin_family = 'no_spin'`
- swipeUp → `serve_spin_family = 'top'`
- swipeDown → `serve_spin_family = 'under'`
- swipeLeft or swipeRight → `serve_spin_family = 'side'`
- diagonals:
  - Up-left / Up-right → `serve_spin_family = 'side'`
  - Down-left / Down-right → `serve_spin_family = 'under'`

Stored as `shots.serve_spin_family`.

---

### 8.3 Serve Type (unused for now)

- `serve_type` column is present but not currently bound to any UI input in MVP.
- Future versions may add a small chip row for:
  - `pendulum`, `reverse_pendulum`, `tomahawk`, `backhand`, `hook`, `lollipop`, `other`.

---

## 9. Summary for Implementors

- Rally shot tagging is **unchanged**.
- Serve tagging now uses:
  - Length bar + gesture → `serve_length`, `landing_zone`, `shot_result`.
  - Spin ball → `serve_spin_family`.
- Inference engine continues to:
  - derive `pressure_level`, `intent_quality`, `is_rally_end`, `rally_end_role`,
  - and infer `inferred_shot_type` (with `'serve'` for serves).

