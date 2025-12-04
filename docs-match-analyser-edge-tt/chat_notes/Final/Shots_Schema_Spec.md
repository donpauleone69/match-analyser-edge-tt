# SHOTS Table Schema – Inference-Engine Aligned

Filename: `Shots_Schema_Spec.md`  

This document defines the **canonical `shots` table schema** for Edge TT Match Analyser, aligned with the gesture + intent inference engine described in `gestures_Intents_Inference_Engine.md`.

The goal is:

- Minimal manual input (Wing × Intent grid + single gesture).
- Rich derived data for analytics and coaching.
- Clean, consistent naming (snake_case, shared between engine & DB).

---

## 1. Purpose

The `shots` table:

- Stores one row per ball contact in a rally.
- Contains both **direct tags** (wing, intent, serve fields) and **per-shot inferences** (pressure, intent quality, inferred shot type, rally end role).
- Acts as the primary source for:
  - point outcome analysis,
  - decision-making analysis,
  - per-skill stats (e.g. BH flick / FH loop vs under),
  - and high-level player profiling.

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
  serve_type           text / enum          "pendulum|reverse_pendulum|tomahawk|backhand|hook|lollipop|other"
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

> `inferred_shot_type` is intentionally `text` for now; you can later restrict it with an enum if you want.

---

## 3. Field-by-Field Semantics

### 3.1 Core identity

- `id`  
  Primary key for the shot row.

- `rally_id`  
  Foreign key to `rallies.id`. All shots in a rally share this.

- `time`  
  The time in seconds (or ms, depending on your choice) in the match/video timeline.

- `shot_index`  
  1-based index of the shot within the rally:
  - `1` = serve  
  - `2` = receive  
  - `3+` = subsequent rally shots

- `player_id`  
  Foreign key to `players.id`. The player who hit this shot.

---

### 3.2 Serve-only fields

Used **only when `shot_index = 1`**.

- `serve_type`  
  Class of serve action:
  - `pendulum`
  - `reverse_pendulum`
  - `tomahawk`
  - `backhand`
  - `hook`
  - `lollipop`
  - `other`

- `serve_spin_family`  
  Simplified spin classification for the serve:
  - `under`
  - `top`
  - `no_spin`
  - `side`

- `serve_length`  
  Length of serve bounce pattern:
  - `short`      – second bounce on opponent’s side
  - `half_long`  – borderline, second bounce on white line
  - `long`       – second bounce would be off the end

These come from serve-specific UI controls and are not derived from the gesture.


---

### 3.3 Tagging inputs (per shot)

- `wing`  
  - `'FH'` – player uses forehand  
  - `'BH'` – player uses backhand  

  Captured from the Wing × Intent grid.

- `intent`  
  - `'defensive'` – reaction / stabilising / disruption  
  - `'neutral'`   – stabilising / maintaining the rally  
  - `'aggressive'` – initiative-taking / attacking  

  Also captured from the Wing × Intent grid.

These fields represent **what the player intended to do**, not whether it succeeded.

---

### 3.4 Direction: `landing_zone`

- `landing_zone` encodes **which side of the opponent** the ball was played towards:

  - `to_bh`  – towards opponent’s backhand side  
  - `to_mid` – middle channel / elbow area / neutral placement  
  - `to_fh`  – towards opponent’s forehand side  

- Error shots where the ball **does not land on the table** (`shot_result ∈ { 'in_net', 'missed_long' }`) use:

  - `landing_zone = NULL`

This replaces the old 3×3 depth grid and is tightly coupled to gestures:

- No horizontal swipe → `to_mid`  
- Left swipe → `to_bh`  
- Right swipe → `to_fh`  
- Up/down → error → `landing_zone = NULL`

---

### 3.5 Result: `shot_result`

Compact representation of both **quality** and **error**:

- `good`  
  - Strong, pressure-creating shot (e.g. a well-executed attack, very solid block).  
  - Typically from gesture: `hold` / `holdLeft` / `holdRight`.

- `average`  
  - Normal in-play shot, not especially strong or weak.  
  - Gestures: `none`, `swipeLeft`, `swipeRight`.

- `in_net`  
  - Shot hit the net and failed to reach opponent’s side.  
  - Gesture: `swipeDown`.

- `missed_long`  
  - Shot went out beyond the end line.  
  - Gesture: `swipeUp`.

From `shot_result` you can derive booleans:

- In-play: `shot_result IN ('good', 'average')`  
- Error: `shot_result IN ('in_net', 'missed_long')`

---

### 3.6 Pressure: `pressure_level`

`pressure_level` is a **derived** measure of how much pressure this shot applied, considering:

- `intent` (`defensive` / `neutral` / `aggressive`)
- `shot_result` (`good` / `average` / error)
- Whether direction changed relative to previous shot (`landing_zone` change)

Typical categories:

- `low`  
  - Stabilising / neutral / bail-out shots  
  - Weak or error shots

- `medium`  
  - Reasonable topspins or firm blocks  
  - Some directional change with average quality

- `high`  
  - Strong attacking shots (`shot_result = 'good'` with `intent = 'aggressive'`)  
  - High-quality middle/angle shots changing direction

The exact formula is defined in `gestures_Intents_Inference_Engine.md` and should be treated as engine logic, not user input.

---

### 3.7 Intent quality: `intent_quality`

This captures whether the player’s **chosen intent** was appropriate for their skill and the ball:

- `correct`  
  - Intent matches the model’s expected intent for that context & player.

- `over_aggressive`  
  - Player chose `aggressive` when the model expects `defensive` or `neutral` for their skill level.

- `over_passive`  
  - Player chose `defensive` or `neutral` when the model expects `aggressive`.

- `misread`  
  - Used when the primary issue was a spin/ball misjudgment rather than pure passivity vs aggression.

This field depends heavily on:

- incoming ball context (serve/receive, spin, length, etc.)  
- the player’s `PlayerProfile` (skill ratings & style)  

It is computed by the inference engine and written into `shots.intent_quality`.

---

### 3.8 Rally-end flags: `is_rally_end` & `rally_end_role`

Mark how this shot participates in the **end of the rally**:

- `is_rally_end`:
  - `true` – this shot is part of the final exchange.
  - `false` – normal rally continuation shot.

- `rally_end_role`:
  - `winner`         – the shot that effectively wins the point.
  - `forced_error`   – shot that forces an opponent’s error (if applied to the winning shot), or error that was forced (if applied to the error shot).
  - `unforced_error` – error that ends the rally and is not considered forced.
  - `none`           – default for non-terminal shots.

Typical pattern:

- For the **error shot** (last shot in rally):
  - `is_rally_end = true`
  - `rally_end_role = 'forced_error'` or `'unforced_error'`

- For the **previous shot**:
  - `is_rally_end = true`
  - `rally_end_role = 'winner'` or `'forced_error'` or `'none'`

All other shots:

- `is_rally_end = false`
- `rally_end_role = 'none'`

The logic is detailed in `gestures_Intents_Inference_Engine.md`.

---

### 3.9 Inferred shot type

The engine infers a **shot family**, for analytics and skill tracking:

Examples of values:

- `'serve'`
- `'fh_loop_vs_under'`
- `'bh_loop_vs_under'`
- `'fh_flick'`
- `'bh_flick'`
- `'fh_block'`
- `'bh_block'`
- `'fh_counter'`
- `'bh_counter'`
- `'push'`
- `'chop'`
- `'lob'`
- `'smash'`
- `'other'`
- `'unknown'`

This is not manually tagged. It is inferred from:

- rally phase (serve, receive, rally)  
- serve/previous spin context  
- length (serve_length)  
- `wing`, `intent`, `shot_result`, `pressure_level`, `landing_zone`

For each row:

- `inferred_shot_type` – selected label  
- `inferred_shot_confidence` – `'low' | 'medium' | 'high'`

These are used for:

- BH flick stats over time  
- FH loop vs under stats  
- block and counter strengths, etc.

---

### 3.10 Tagging status: `is_tagged`

- `is_tagged = false`  
  - The row is incomplete or has not yet been processed by the inference engine.

- `is_tagged = true`  
  - Required fields have been filled and inference has run.

This is useful for tooling and background processing.

---

## 4. Suggested Postgres / Supabase Implementation

You can implement enums for some fields or keep them as constrained text.  
Example using enums:

```sql
CREATE TYPE shot_intent AS ENUM ('defensive', 'neutral', 'aggressive');
CREATE TYPE landing_zone_chan AS ENUM ('to_bh', 'to_mid', 'to_fh');
CREATE TYPE shot_result_enum AS ENUM ('good', 'average', 'in_net', 'missed_long');
CREATE TYPE pressure_level_enum AS ENUM ('low', 'medium', 'high');
CREATE TYPE intent_quality_enum AS ENUM ('correct', 'over_aggressive', 'over_passive', 'misread');
CREATE TYPE rally_end_role_enum AS ENUM ('winner', 'forced_error', 'unforced_error', 'none');
CREATE TYPE inferred_confidence_enum AS ENUM ('low', 'medium', 'high');

CREATE TABLE shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id uuid NOT NULL REFERENCES rallies(id),
  time numeric NOT NULL,
  shot_index int NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id),

  serve_type text NULL,
  serve_spin_family text NULL,
  serve_length text NULL,

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

You can tighten `serve_type`, `serve_spin_family`, and `serve_length` later with enums if you want.

---

## 5. Relationship to Higher-Level Stats

The `shots` table should be considered the **source of truth for per-shot data**.  
Aggregated skill and trend data (e.g. BH flick performance over time) should be stored in:

- `player_profiles` (current snapshot of skills & decision bias), and/or  
- a separate `player_skill_metrics` table (time-based aggregates).

Those specs can build directly on top of:

- `shots.inferred_shot_type`
- `shots.shot_result`
- `shots.intent_quality`
- `shots.rally_end_role`
- `shots.pressure_level`
