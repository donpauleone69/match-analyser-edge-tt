# Gestures, Intents & Inference Engine Specification

Filename: `gestures_Intents_Inference_Engine.md`  

This document defines the **shot input model**, **gesture mapping**, and **inference rules** for the Edge TT Match Analyser, aligned with the current and future **`shots`** table schema.

It is intended as a reference for:
- UI / gesture implementation
- Backend inference logic
- Schema design for the `shots` table
- Other agents (e.g. Cursor) working on this codebase

All names and enums in this document use the **same terminology** as the database schema (snake_case, same value sets).

---

## 1. Core Ideas

Each shot is captured with:

1. A tap on a 6-button **Wing × Intent** grid:
   - Wing: `FH` or `BH`
   - Intent: `defensive`, `neutral`, `aggressive`

2. A **single continuous gesture**:
   - `none`
   - `hold`
   - `swipeLeft`
   - `swipeRight`
   - `holdLeft`
   - `holdRight`
   - `swipeUp`
   - `swipeDown`

From these we derive all of the following (which are stored in the `shots` row):

- `landing_zone`       – direction channel: `to_bh | to_mid | to_fh | null`
- `shot_result`        – compact quality/outcome: `good | average | in_net | missed_long`
- `pressure_level`     – contextual pressure: `low | medium | high`
- `is_rally_end`       – whether this shot participates in rally end
- `rally_end_role`     – `winner | forced_error | unforced_error | none`
- `intent_quality`     – `correct | over_aggressive | over_passive | misread`
- `inferred_shot_type` – derived shot family (loop, flick, block, etc.)
- `inferred_shot_confidence` – confidence in that inference

The same model is used for **serve** shots (`shot_index = 1`), with a small addition for serve-specific fields.

---

## 2. Relevant `shots` Schema (Summary)

See `Shots_Schema_Spec.md` for the full table, but the inference engine cares primarily about:

```text
shots {
  id             uuid PK
  rally_id       uuid FK
  time           numeric
  shot_index     int
  player_id      uuid FK

  -- Serve-only fields (shot_index = 1)
  serve_type         text / enum
  serve_spin_family  text / enum  -- under|top|no_spin|side
  serve_length       text / enum  -- short|half_long|long

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

The **UI only directly sets**: `wing`, `intent`, `serve_*` fields (on serve), and the gesture.  
Everything else above is derived by the inference engine.

---

## 3. Shot Input Model

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

These are written directly to `shots.wing` and `shots.intent`.

---

### 3.2 Gestures

After tapping one grid cell, the user performs exactly **one** of:

- `none`       – just tap, no extra gesture
- `hold`       – long press
- `swipeLeft`
- `swipeRight`
- `holdLeft`   – hold + slight drag left
- `holdRight`  – hold + slight drag right
- `swipeUp`
- `swipeDown`

The engine sees this as:

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

We treat hold+drag as a single continuous gesture, not two separate inputs.

---

## 4. Engine Types

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

## 5. Gesture → landing_zone & shot_result

Gestures directly determine **direction** and **result**:

| gesture_type | landing_zone | shot_result   | Notes                     |
| ------------ | ------------ | ------------- | ------------------------- |
| `none`       | `to_mid`     | `average`     | default, stabilising shot |
| `hold`       | `to_mid`     | `good`        | strong middle shot        |
| `swipeLeft`  | `to_bh`      | `average`     | normal to BH              |
| `swipeRight` | `to_fh`      | `average`     | normal to FH              |
| `holdLeft`   | `to_bh`      | `good`        | strong to BH              |
| `holdRight`  | `to_fh`      | `good`        | strong to FH              |
| `swipeUp`    | `null`       | `missed_long` | out past end line         |
| `swipeDown`  | `null`       | `in_net`      | into net                  |

Notes:

- For **in-play shots**, `landing_zone` is always one of `to_bh`, `to_mid`, `to_fh`.
- For **errors** (`in_net`, `missed_long`), `landing_zone` is `null` because the ball never lands on the table.

These values are written **as-is** to:

- `shots.landing_zone`
- `shots.shot_result`

No extra renaming or mapping.

---

## 6. Pressure Level Inference

`pressure_level` is inferred per shot from:

- `intent` (`defensive` / `neutral` / `aggressive`)
- `shot_result` (`good` / `average` / error)
- Whether direction changed vs previous shot (`landing_zone` change)

Example heuristic:

```ts
function derivePressureLevel(
  intent: Intent,
  shot_result: ShotResult,
  prev_landing_zone: LandingZone,
  landing_zone: LandingZone
): PressureLevel {
  const in_play =
    shot_result === 'good' || shot_result === 'average';

  const direction_changed =
    prev_landing_zone !== null &&
    landing_zone !== null &&
    prev_landing_zone !== landing_zone;

  if (!in_play) {
    // Errors are usually the result of previous pressure,
    // but the error shot itself isn't applying pressure.
    return 'low';
  }

  if (shot_result === 'good') {
    if (intent === 'aggressive') return 'high';
    return direction_changed ? 'high' : 'medium';
  }

  // shot_result === 'average'
  if (intent === 'aggressive') {
    return 'medium';
  }

  if (intent === 'neutral' && direction_changed) {
    return 'medium';
  }

  return 'low';
}
```

This result is written to `shots.pressure_level`.

---

## 7. Intent Quality Inference

`intent_quality` tells you if the chosen intent (def/neutral/agg) was **appropriate** for this player and situation.

It depends on:

- The shot context (serve/receive/rally, spin, length, previous pressure, etc.)
- The **PlayerProfile** (skills & style)
- The actual `intent` used

Conceptually:

```ts
type IntentQuality =
  | 'correct'
  | 'over_aggressive'
  | 'over_passive'
  | 'misread';

function classifyIntentQuality(
  expected_intent: Intent,
  actual_intent: Intent
): IntentQuality {
  if (expected_intent === actual_intent) return 'correct';

  if (actual_intent === 'aggressive' && expected_intent !== 'aggressive') {
    return 'over_aggressive';
  }

  if (actual_intent !== 'aggressive' && expected_intent === 'aggressive') {
    return 'over_passive';
  }

  return 'misread';
}
```

The `expected_intent` is determined by context + PlayerProfile (see `PlayerProfile_Spec.md`).

The resulting `intent_quality` is stored on the shot row (`shots.intent_quality`).

---

## 8. Rally-End Classification (winner / forced / unforced)

At the end of a rally:

1. Find the **last shot** where `shot_result ∈ { 'in_net', 'missed_long' }`.
2. Let:
   - `E = error shot` (last one)
   - `P = previous shot` (if exists)

We classify:

- whether the error was **forced** or **unforced**  
- whether `P` counts as a `winner` or just a `forced_error` creator.

Example:

```ts
function classifyRallyEnd(shots: EngineShot[], errorIndex: number) {
  const errorShot = shots[errorIndex];
  const prevIndex = errorIndex - 1;

  if (prevIndex < 0) {
    // Missed serve or very first ball
    return {
      errorShotIndex: errorIndex,
      errorRole: 'unforced_error',
      prevShotIndex: null,
      prevRole: 'none'
    } as const;
  }

  const prevShot = shots[prevIndex];

  const highPressure =
    prevShot.pressure_level === 'high' &&
    (prevShot.shot_result === 'good' || prevShot.intent === 'aggressive');

  let errorRole: 'forced_error' | 'unforced_error';
  let prevRole: 'winner' | 'forced_error' | 'none';

  if (highPressure) {
    errorRole = 'forced_error';
    prevRole = prevShot.shot_result === 'good' ? 'winner' : 'forced_error';
  } else {
    errorRole = 'unforced_error';
    prevRole = 'none';
  }

  return {
    errorShotIndex: errorIndex,
    errorRole,
    prevShotIndex: prevIndex,
    prevRole
  } as const;
}
```

Mapping to `shots`:

- On error shot `E`:
  - `is_rally_end = true`
  - `rally_end_role = 'forced_error' | 'unforced_error'` (from `errorRole`)
- On previous shot `P`:
  - `is_rally_end = true`
  - `rally_end_role = 'winner' | 'forced_error' | 'none'` (from `prevRole`)
- All others in rally:
  - `is_rally_end = false`
  - `rally_end_role = 'none'`

These are written into:

- `shots.is_rally_end`
- `shots.rally_end_role`

---

## 9. Inferred Shot Type

The engine can infer a **shot family** from context:

- `serve`
- `fh_loop_vs_under`
- `bh_loop_vs_under`
- `fh_flick`
- `bh_flick`
- `fh_block`
- `bh_block`
- `fh_counter`
- `bh_counter`
- `push`
- `chop`
- `lob`
- `smash`
- `other`
- `unknown`

Examples:

### 9.1 BH Flick

Conditions (example):

- Shot is **receive** (`shot_index = 2`)
- Incoming ball:
  - `serve_length = 'short'`
  - to BH channel for this player
- This shot:
  - `wing = 'BH'`
  - `intent = 'aggressive'`
  - `shot_result ∈ { 'good', 'average' }`

Then:

```ts
inferred_shot_type = 'bh_flick';
inferred_shot_confidence = 'high';
```

### 9.2 FH Loop vs Under

- Incoming spin: under (from serve or opponent push/chop)
- Ball is long or half-long
- This shot:
  - `wing = 'FH'`
  - `intent = 'aggressive'`
  - `shot_result ∈ { 'good', 'average' }`

Then:

```ts
inferred_shot_type = 'fh_loop_vs_under';
inferred_shot_confidence = 'medium' | 'high';
```

Everything else gets:

```ts
inferred_shot_type = 'unknown' | 'other';
inferred_shot_confidence = 'low';
```

These two fields are written to:

- `shots.inferred_shot_type`
- `shots.inferred_shot_confidence`

and are used for **player skill stats** (e.g. BH flick strength over time).

---

## 10. Serve Input & Inference

For `shot_index = 1` (serve), we extend the model slightly.

### 10.1 Serve tagging

UI elements:

1. **Serve placement & length**
   - 3 columns (BH / MID / FH) → `to_bh | to_mid | to_fh`
   - 3 rows (Short / Half-Long / Long) → `serve_length`
   - Clicking a cell sets:
     - `landing_zone` (direction)
     - `serve_length`

2. **Serve spin family**
   - Chips: `Under`, `No-spin`, `Top`, `Side`
   - Sets `serve_spin_family`.

3. **Serve type** (optional, for richer analytics)
   - Row of chips: `Pendulum`, `Reverse`, `Tomahawk`, `Backhand`, `Hook`, `Lollipop`, `Other`
   - Sets `serve_type`.

4. **Gesture** (same as normal shots)
   - Determines `shot_result` (quality/fault).

### 10.2 Serve-specific inference

The serve shot then also uses:

- `landing_zone` & `shot_result` same as any shot
- `pressure_level` from serve quality + intent
- `inferred_shot_type = 'serve'` by default

From these we can generate:

- serve quality stats (good vs average vs faults)  
- serve effectiveness (winners / forced errors on 3rd ball following serve pattern)

---

## 11. Summary for Implementors

- The **only** things you need from the UI for each shot:
  - `wing` (FH/BH)
  - `intent` (def/neutral/agg)
  - `gesture` (none/hold/swipeX/…)
  - For serve only: `serve_type`, `serve_spin_family`, `serve_length`, and optionally target channel.

- The engine:
  - Converts `gesture` → `landing_zone` + `shot_result`
  - Computes `pressure_level`
  - Uses PlayerProfile + context → `intent_quality`
  - On rally end → fills `is_rally_end` + `rally_end_role`
  - Applies heuristics → `inferred_shot_type` + `inferred_shot_confidence`

- The **`shots` table** is the main store for both:
  - Concrete shot tags (`wing`, `intent`, `landing_zone`, `shot_result`)
  - Per-shot inference (`pressure_level`, `intent_quality`, `rally_end_role`, `inferred_shot_type`, etc.)

Anything aggregating over time (BH flick stats, FH loop vs under strength, decision bias) should read from `shots` and be stored into higher-level tables like `player_profiles` and optional `player_skill_metrics`.
