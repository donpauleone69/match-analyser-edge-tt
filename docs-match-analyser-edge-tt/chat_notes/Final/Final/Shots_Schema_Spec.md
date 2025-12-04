# SHOTS Table Schema – Inference-Engine Aligned

Filename: `Shots_Schema_Spec.md`  

This document defines the **canonical `shots` table schema** for Edge TT Match Analyser, aligned with the gesture + intent + serve input model described in `gestures_Intents_Inference_Engine.md`.

The goals:

- Minimal manual input.
- Rich derived data for analytics and coaching.
- Clean, consistent naming (snake_case, shared between engine & DB).

---

## 1. Purpose

The `shots` table:

- Stores one row per ball contact in a rally.
- Contains both **direct tags** and **per-shot inferences**.
- Is the primary source for:
  - outcome analysis,
  - decision-making analysis,
  - per-skill stats,
  - long-term player profiling.

---

## 2. Logical Table Definition

```text
shots {
  id                   uuid PK
  rally_id             uuid FK
  time                 numeric
  shot_index           int
  player_id            uuid FK

  -- Serve-only fields (shot_index = 1)
  serve_type           text / enum          "pendulum|reverse_pendulum|tomahawk|backhand|hook|lollipop|other (unused by MVP UI)"
  serve_spin_family    text / enum          "under|top|no_spin|side"
  serve_length         text / enum          "short|half_long|long"

  -- Tagging inputs (direct from UI)
  wing                 text                 "'FH' | 'BH'"
  intent               text                 "'defensive' | 'neutral' | 'aggressive'"

  -- Derived from gestures (1:1 with shot)
  landing_zone         text                 "to_bh|to_mid|to_fh or NULL for errors"
  shot_result          text                 "good|average|in_net|missed_long"
  pressure_level       text                 "low|medium|high"

  -- Per-shot inference (1:1 with shot)
  intent_quality       text                 "correct|over_aggressive|over_passive|misread"
  is_rally_end         boolean
  rally_end_role       text                 "winner|forced_error|unforced_error|none"
  inferred_shot_type   text
  inferred_shot_confidence text             "low|medium|high"

  is_tagged            boolean
}
```

(See `gestures_Intents_Inference_Engine.md` and `serve_input_spec.md` for behaviour.)

---

## 3. Postgres / Supabase Example

```sql
CREATE TYPE shot_intent AS ENUM ('defensive', 'neutral', 'aggressive');
CREATE TYPE landing_zone_chan AS ENUM ('to_bh', 'to_mid', 'to_fh');
CREATE TYPE shot_result_enum AS ENUM ('good', 'average', 'in_net', 'missed_long');
CREATE TYPE pressure_level_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE intent_quality_enum AS ENUM ('correct', 'over_aggressive', 'over_passive', 'misread');
CREATE TYPE rally_end_role_enum AS ENUM ('winner', 'forced_error', 'unforced_error', 'none');
CREATE TYPE inferred_confidence_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE serve_spin_family_enum AS ENUM ('under', 'top', 'no_spin', 'side');
CREATE TYPE serve_length_enum AS ENUM ('short', 'half_long', 'long');

CREATE TABLE shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id uuid NOT NULL REFERENCES rallies(id),
  time numeric NOT NULL,
  shot_index int NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id),

  serve_type text NULL,
  serve_spin_family serve_spin_family_enum NULL,
  serve_length serve_length_enum NULL,

  wing text NULL CHECK (wing IN ('FH', 'BH')),
  intent shot_intent NULL,

  landing_zone landing_zone_chan NULL,
  shot_result shot_result_enum NULL,
  pressure_level pressure_level_enum NULL,

  intent_quality intent_quality_enum NULL,
  is_rally_end boolean NOT NULL DEFAULT false,
  rally_end_role rally_end_role_enum NOT NULL DEFAULT 'none',

  inferred_shot_type text NULL,
  inferred_shot_confidence inferred_confidence_enum NULL,

  is_tagged boolean NOT NULL DEFAULT false
);
```

