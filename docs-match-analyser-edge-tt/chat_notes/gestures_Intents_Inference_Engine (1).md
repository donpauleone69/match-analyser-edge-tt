# Gestures, Intents & Inference Engine Specification

Filename: `gestures_Intents_Inference_Engine.md`  

This document defines the **shot input model**, **gesture mapping**, and **inference rules** for the Edge TT Match Analyser, aligned with the current and future **SHOTS** table schema and using your naming conventions.

It is intended as a reference for:
- UI / gesture implementation
- Backend inference logic
- Schema design for the `shots` table
- Other agents (e.g. Cursor AI) working on this codebase

---

## 1. Core Ideas

Each shot is captured with a **single tap + single gesture**:

1. Tap on a 6-button **Wing × Intent** grid:
   - Wing: `FH` or `BH`
   - Intent: `defensive`, `neutral`, `aggressive`

2. Perform **one continuous gesture**:
   - `none` (no extra gesture)
   - `hold`
   - `swipeLeft`
   - `swipeRight`
   - `holdLeft`
   - `holdRight`
   - `swipeUp`
   - `swipeDown`

From this we infer:

- `landing_zone`  (direction channel): `to_bh | to_mid | to_fh | NULL`
- `shot_quality`  (compact quality/outcome): `good | average | in_net | missed_long`
- `landing_type`  (error type): `net | missed_long | NULL`
- `pressure_level` (contextual pressure): `low | medium | high`
- Rally-end roles: `winner | forced_error | unforced_error | none`

These fields are stored in the **SHOTS** table.

---

## 2. SHOTS Schema (relevant fields)

For context, the relevant fields in the `shots` table are:

```text
SHOTS {
    uuid id PK
    uuid rally_id FK
    numeric time
    int shot_index
    uuid player_id FK

    -- Serve-only fields (shot_index = 1)
    enum serve_type                      "NULL, pendulum|reverse_pendulum|tomahawk|backhand|hook|lollipop|other"
    enum serve_spin                      "NULL, top_left|topspin|top_right|side_left|no_spin|side_right|back_left|backspin|back_right"

    -- Core tagging inputs (per shot)
    enum wing                            "NULL, FH|BH"
    enum intent                          "NULL, defensive|neutral|aggressive"

    -- Direction / placement (3 channels)
    enum landing_zone                    "NULL, to_bh|to_mid|to_fh"

    -- Compact outcome + quality
    enum shot_quality                    "NULL, good|average|in_net|missed_long"

    -- Error type (derived from shot_quality)
    enum landing_type                    "DERIVED, net|missed_long"

    -- Pressure & rally-end helpers (derived)
    enum pressure_level                  "DERIVED, low|medium|high"
    boolean is_rally_end                 "DERIVED, DEFAULT false"
    enum rally_end_role                  "DERIVED, winner|forced_error|unforced_error|none"

    boolean is_tagged                    "DEFAULT false"
}
```

> Note: `landing_zone`, `shot_quality` and `landing_type` keep their **names** from the earlier schema, but their **value sets and semantics are updated** to match the gesture-based model.

---

## 3. Gesture Model

### 3.1 Wing × Intent Grid

UI: 6 buttons

```text
        FH        BH
Agg   [ FH/A ]  [ BH/A ]
Neut  [ FH/N ]  [ BH/N ]
Def   [ FH/D ]  [ BH/D ]
```

On tap, we capture:

- `wing ∈ { FH, BH }`
- `intent ∈ { defensive, neutral, aggressive }`

### 3.2 Gestures

After tapping one grid cell, user performs **one** of:

- `none`       – just tap, no extra gesture
- `hold`       – long press
- `swipeLeft`
- `swipeRight`
- `holdLeft`   – hold + slight drag left
- `holdRight`  – hold + slight drag right
- `swipeUp`
- `swipeDown`

We treat hold+drag as a **single continuous gesture** in the model.

---

## 4. Gesture → Engine-Level Fields

Internal engine representation per shot:

```ts
type Wing = 'FH' | 'BH';
type Intent = 'defensive' | 'neutral' | 'aggressive';

type GestureType =
  | 'none'
  | 'hold'
  | 'swipeLeft'
  | 'swipeRight'
  | 'holdLeft'
  | 'holdRight'
  | 'swipeUp'
  | 'swipeDown';

type Direction = 'to_bh' | 'to_mid' | 'to_fh' | null;
type Quality = 'normal' | 'high' | null;
type ErrorType = 'net' | 'off' | null;

type PressureLevel = 'low' | 'medium' | 'high';

interface EngineShot {
  wing: Wing;
  intent: Intent;
  gesture: GestureType;

  outcome: 'in' | 'error';
  quality: Quality;      // normal | high | null (for errors)
  direction: Direction;  // to_bh | to_mid | to_fh | null
  error_type: ErrorType; // net | off | null
  pressure_level: PressureLevel;
}
```

### 4.1 Gesture → outcome, quality, direction, error_type

| gesture_type | outcome | quality | direction (landing_zone) | error_type |
| ------------ | ------- | ------- | ------------------------ | ---------- |
| `none`       | in      | normal  | to_mid                   | null       |
| `hold`       | in      | high    | to_mid                   | null       |
| `swipeLeft`  | in      | normal  | to_bh                    | null       |
| `swipeRight` | in      | normal  | to_fh                    | null       |
| `holdLeft`   | in      | high    | to_bh                    | null       |
| `holdRight`  | in      | high    | to_fh                    | null       |
| `swipeUp`    | error   | null    | null                     | off        |
| `swipeDown`  | error   | null    | null                     | net        |

Notes:

- Middle placement (`to_mid`) is the default when no horizontal swipe occurs.
- Error gestures (`swipeUp`/`swipeDown`) do **not** produce a `direction`; `landing_zone` is NULL in the DB for those shots.

---

## 5. Engine → SHOTS Table Mapping

Engine fields are mapped into **SHOTS** columns:

### 5.1 wing

```ts
wing: 'FH' | 'BH';
```

Saved directly to `shots.wing`.

---

### 5.2 intent

Engine:

```ts
intent: 'defensive' | 'neutral' | 'aggressive';
```

Saved directly to `shots.intent`.

---

### 5.3 landing_zone

Engine `direction` → `shots.landing_zone`:

```ts
if outcome === 'in' then
  landing_zone = direction; // to_bh | to_mid | to_fh
else
  landing_zone = null;      // error shots have no landing zone
```

DB enum:

```text
landing_zone "to_bh|to_mid|to_fh"
```

---

### 5.4 shot_quality

You requested to keep the name **shot_quality**, but map our gesture/quality model into:

- `good`
- `average`
- `in_net`
- `missed_long`

Mapping:

```ts
if outcome === 'in' then {
  if quality === 'high'   shot_quality = 'good';
  if quality === 'normal' shot_quality = 'average';
} else { // outcome === 'error'
  if error_type === 'net' shot_quality = 'in_net';
  if error_type === 'off' shot_quality = 'missed_long';
}
```

DB enum:

```text
shot_quality "good|average|in_net|missed_long"
```

---

### 5.5 landing_type

This becomes a **pure error helper**, derived from `shot_quality`:

```ts
if shot_quality === 'in_net'       landing_type = 'net';
else if shot_quality === 'missed_long' landing_type = 'missed_long';
else landing_type = null;
```

DB enum:

```text
landing_type "net|missed_long"
```

> For in-play shots (`good` / `average`), `landing_type` is `NULL`.

---

### 5.6 pressure_level

`pressure_level` is derived from:

- `intent` (defensive / neutral / aggressive)
- `quality` (normal / high)
- Directional change vs previous shot (`landing_zone` difference)

Example rule:

```ts
function derivePressureLevel(
  intent: Intent,
  quality: Quality,
  prev_direction: Direction,
  direction: Direction
): PressureLevel {
  const changedSide =
    prev_direction !== null &&
    direction !== null &&
    prev_direction !== direction;

  if (quality === 'high') {
    if (intent === 'aggressive') return 'high';
    return changedSide ? 'high' : 'medium';
  }

  if (intent === 'aggressive') {
    return 'medium'; // baseline pressure for aggressive, normal quality
  }

  if (intent === 'neutral' && changedSide) {
    return 'medium';
  }

  return 'low';
}
```

Saved to:

```text
pressure_level "low|medium|high"
```

---

## 6. Rally-End Classification (Winner / Forced / Unforced)

Given a rally represented as an ordered list of `EngineShot`:

- Identify the **last shot index** `i` where `outcome === 'error'`.
- Let:
  - `E = error shot = shots[i]`
  - `P = previous shot = shots[i-1]` (if exists)

### 6.1 Error classification

We classify:

- `error_pressure_type ∈ { forced, unforced }`
- `rally_end_role` for both `P` and `E` in DB.

Pseudo-logic:

```ts
type ErrorPressureType = 'forced' | 'unforced';
type RallyEndRole = 'winner' | 'forced_error' | 'unforced_error' | 'none';

function classifyErrorOutcome(
  shots: EngineShot[],
  errorIndex: number
) {
  const errorShot = shots[errorIndex];
  const prevIndex = errorIndex - 1;

  if (prevIndex < 0) {
    // Missed serve or first ball
    return {
      errorShotIndex: errorIndex,
      errorPressureType: 'unforced',
      prevShotIndex: null,
      prevRole: 'none'
    };
  }

  const prevShot = shots[prevIndex];

  let errorPressureType: ErrorPressureType;
  let prevRole: RallyEndRole;

  if (prevShot.quality === 'high') {
    errorPressureType = 'forced';
    prevRole = 'winner';
  } else if (
    prevShot.intent === 'aggressive' &&
    prevShot.pressure_level !== 'low'
  ) {
    errorPressureType = 'forced';
    prevRole = 'forced_error';
  } else {
    errorPressureType = 'unforced';
    prevRole = 'none';
  }

  return {
    errorShotIndex: errorIndex,
    errorPressureType,
    prevShotIndex: prevIndex,
    prevRole
  };
}
```

### 6.2 Mapping to SHOTS fields

For each rally:

1. Set all shots:

```ts
is_rally_end = false;
rally_end_role = 'none';
```

2. When you detect rally ended on error at index `i`:

- On error shot `E`:

```ts
is_rally_end = true;
rally_end_role =
  errorPressureType === 'forced'
    ? 'forced_error'
    : 'unforced_error';
```

- On previous shot `P` (if exists):

```ts
is_rally_end = true;
rally_end_role = prevRole; // 'winner' or 'forced_error' or 'none'
```

(DB-side semantics:)

```text
is_rally_end: boolean
rally_end_role: 'winner' | 'forced_error' | 'unforced_error' | 'none'
```

---

## 7. Summary for Other Agents (Cursor, etc.)

### Inputs (UI-level)

- `wing`           → `shots.wing`
- `intent`         → `shots.intent`
- `gesture_type`   → internal only (used by inference engine)

### Engine Derives

- `outcome` & `error_type`
- `quality`
- `direction` → `shots.landing_zone`
- `shot_quality`    → `good|average|in_net|missed_long`
- `landing_type`    → `net|missed_long|NULL`
- `pressure_level`  → `low|medium|high`
- `is_rally_end` / `rally_end_role`

### Stored in `SHOTS`

- Use **snake_case** names as shown.  
- `landing_zone` **only ever** holds: `to_bh`, `to_mid`, `to_fh`.  
- Error shots have `landing_zone = NULL` and `shot_quality IN ('in_net', 'missed_long')`.

This document is now the **single source of truth** for:

- How gestures map to DB fields.
- What `landing_zone` means (direction channel, not 3×3 grid).
- How `shot_quality` bundles both quality + error outcome.

