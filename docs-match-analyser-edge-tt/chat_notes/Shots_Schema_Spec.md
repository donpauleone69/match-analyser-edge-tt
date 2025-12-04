# SHOTS Table Schema – Inference-Engine Aligned

Filename: `Shots_Schema_Spec.md`  

This document defines the **canonical SHOTS schema** for Edge TT Match Analyser, aligned with the gesture + intent inference engine described in `gestures_Intents_Inference_Engine.md`.

---

## 1. Purpose

The `shots` table:

- Stores one row per ball contact in a rally.
- Encodes *already inferred* information from the UI gesture model.
- Is the main source for analytics (winners, forced errors, decision quality, etc.).

---

## 2. Table Definition (Logical)

```text
SHOTS {
    uuid id PK
    uuid rally_id FK                     "NOT NULL, REFERENCES rallies(id)"
    numeric time                         "NOT NULL, seconds in video or timeline"
    int shot_index                       "NOT NULL, 1=serve, 2=receive, 3+ rally shots"
    uuid player_id FK                    "NOT NULL, REFERENCES players(id)"

    -- Serve-only fields (shot_index = 1)
    enum serve_type                      "NULL, pendulum|reverse_pendulum|tomahawk|backhand|hook|lollipop|other"
    enum serve_spin                      "NULL, top_left|topspin|top_right|side_left|no_spin|side_right|back_left|backspin|back_right"

    -- Core tagging inputs (per shot)
    enum wing                            "NULL, FH|BH"
    enum intent                          "NULL, defensive|neutral|aggressive"

    -- Direction / placement (replaces 3x3 landing grid)
    enum landing_zone                    "NULL, to_bh|to_mid|to_fh"

    -- Compact outcome + quality (MVP-friendly)
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

---

## 3. Field Semantics

### 3.1 Core identity

- `id` – primary key.
- `rally_id` – FK to `rallies.id`.
- `time` – match or video timeline time in seconds.
- `shot_index` – 1-based index in rally.
- `player_id` – FK to `players.id`.

---

### 3.2 Serve-only fields

- `serve_type` – classic classification of serve action, only meaningful when `shot_index = 1`.
- `serve_spin` – spin characteristics of the serve, only meaningful for serve shot.

These are optional for MVP, but already in your ERD, so preserved.

---

### 3.3 Tagging inputs

- `wing`:
  - `FH` – forehand
  - `BH` – backhand  

  Captured directly from Wing × Intent grid.

- `intent`:
  - `defensive`
  - `neutral`
  - `aggressive`  

  Captured directly from Wing × Intent grid.

---

### 3.4 Direction (landing_zone)

`landing_zone` encodes **which side of the opponent** the ball was played to:

- `to_bh` – towards opponent’s backhand side.
- `to_mid` – middle channel / elbow area / neutral placement.
- `to_fh` – towards opponent’s forehand side.

Error shots (net or long) do not have a direction and use `NULL` for `landing_zone`.

This replaces the previous 3×3 grid scheme (`BHShort|MidShort|...|FHLong`) and is tightly coupled to the new gesture system:

- No horizontal swipe → `to_mid`
- Left swipe → `to_bh`
- Right swipe → `to_fh`

---

### 3.5 shot_quality

Compact representation of both **quality** and **error type**:

- `good` – high-quality, pressuring in-play shot.
- `average` – normal, in-play shot.
- `in_net` – ball hit the net and did not reach the opponent’s side.
- `missed_long` – ball went out beyond the opponent’s end line.

Derived from internal `quality` and `error_type` as per `gestures_Intents_Inference_Engine.md`.

---

### 3.6 landing_type

Simplified error classification:

- `net` – for `shot_quality = 'in_net'`
- `missed_long` – for `shot_quality = 'missed_long'`
- `NULL` – for in-play shots (`good` / `average`)

This field exists to make some analytics queries simpler and more explicit.

---

### 3.7 pressure_level

Represents how much **pressure** the shot applied given:

- intent (defensive / neutral / aggressive)
- internal quality (normal / high)
- whether direction changed relative to previous shot (`landing_zone`).

Categories:

- `low` – stabilising or bail-out shots.
- `medium` – standard attacks or mildly forcing placements.
- `high` – strong attacks, high-quality balls, or big directional changes.

This is computed by the inference engine, not manually tagged.

---

### 3.8 is_rally_end & rally_end_role

Used to mark the **end of the rally** and assign roles:

- `is_rally_end`:
  - `true` – this shot participates in defining the rally outcome.
  - `false` – normal rally continuation shot.

- `rally_end_role`:
  - `winner` – shot that effectively wins the point.
  - `forced_error` – shot that forces an error from the opponent.
  - `unforced_error` – error that ends the rally, considered unforced.
  - `none` – non-terminal shot.

Typically:

- The **error shot** at rally end gets:
  - `is_rally_end = true`
  - `rally_end_role = 'forced_error'` or `'unforced_error'`

- The **shot before the error** gets:
  - `is_rally_end = true`
  - `rally_end_role = 'winner'` or `'forced_error'`

Everything else:
- `is_rally_end = false`
- `rally_end_role = 'none'`

---

## 4. SQL Sketch (Supabase / Postgres)

Below is a sketch for implementation (you can adjust enum strategy as needed):

```sql
CREATE TYPE shot_intent AS ENUM ('defensive', 'neutral', 'aggressive');
CREATE TYPE landing_zone_chan AS ENUM ('to_bh', 'to_mid', 'to_fh');
CREATE TYPE shot_quality_enum AS ENUM ('good', 'average', 'in_net', 'missed_long');
CREATE TYPE landing_type_enum AS ENUM ('net', 'missed_long');
CREATE TYPE pressure_level_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE rally_end_role_enum AS ENUM ('winner', 'forced_error', 'unforced_error', 'none');

CREATE TABLE shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id uuid NOT NULL REFERENCES rallies(id),
  time numeric NOT NULL,
  shot_index int NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id),

  serve_type text NULL,
  serve_spin text NULL,

  wing text NULL CHECK (wing IN ('FH', 'BH')),
  intent shot_intent NULL,

  landing_zone landing_zone_chan NULL,
  shot_quality shot_quality_enum NULL,
  landing_type landing_type_enum NULL,

  pressure_level pressure_level_enum NULL,
  is_rally_end boolean NOT NULL DEFAULT false,
  rally_end_role rally_end_role_enum NOT NULL DEFAULT 'none',

  is_tagged boolean NOT NULL DEFAULT false
);
```

> **Note:** You may want to normalise `serve_type` and `serve_spin` into enums later. They are left as `text` here for flexibility.

---

## 5. Relationship to Gesture Engine

The `shots` table stores **post-inference** values. The raw gestures (`none`, `hold`, `swipeLeft`, etc.) do not need to be stored in the DB unless you want them for debugging.

The full gesture mapping and inference rules live in:

- `gestures_Intents_Inference_Engine.md`

This document should be kept in sync with that file whenever the gesture logic or enum sets change.
