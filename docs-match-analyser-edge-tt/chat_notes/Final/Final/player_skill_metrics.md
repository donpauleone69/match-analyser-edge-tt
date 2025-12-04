# Player Skill Metrics Specification

Filename: `player_skill_metrics.md`  

This document defines the **`player_skill_metrics`** model for Edge TT Match Analyser.

It describes:

- What a *skill metric row* represents.
- How metrics are **aggregated from `shots`**.
- The exact **schema** for implementation (SQL sketch).
- How this table supports long‑term **player development tracking**.

It is intended for backend implementation, analytics, and any AI/UX agent that needs to understand how to read/write skill metrics.

---

## 1. Concept

`player_skill_metrics` stores **aggregated performance data** for a given:

- `player`
- `skill_key`
- `period` (match or date range)

It is **not per-shot data**. Instead:

- Reads from `shots` (per‑shot & inferred fields)
- Groups by skill and period
- Stores counts & rates so you can:
  - Chart improvement over time
  - Feed/refresh `player_profiles`
  - Generate coaching text (“BH flick needs work”, etc.)

---

## 2. What is a “skill_key”?

A **skill_key** identifies a specific technical or tactical skill you want to track over time.

Examples (non‑exhaustive):

Technical/opening skills:

- `fh_loop_vs_under`
- `bh_loop_vs_under`
- `fh_flick`
- `bh_flick`
- `push`
- `fh_block`
- `bh_block`
- `fh_counter`
- `bh_counter`
- `lob`
- `smash`

Serve / receive patterns (optional, advanced):

- `serve_short_under_to_bh`
- `serve_short_under_to_fh`
- `receive_short_under_push`
- `receive_short_under_flick`

You can:

- Keep the list small (core skills you care about first).
- Extend over time as inference rules improve.

The link from `shots` to `skill_key` is usually via:

- `shots.inferred_shot_type` and/or
- serve/receive context (e.g. for pattern-based skills).

---

## 3. Row semantics

Each row in `player_skill_metrics` answers:

> “How did **player X** perform on **skill_key Y** during **period Z**?”

Where:

- **player X** = `player_id`
- **skill_key Y** = `skill_key`
- **period Z**:
  - Either a **single match** (`match_id`), or
  - A **date range** (`period_start` → `period_end`)

### 3.1 Period model

We support two period modes:

1. **Match-level metrics**

   - `match_id` is set
   - `period_type = 'match'`
   - `period_start` / `period_end` optional (can mirror match dates)

   Use case: match report, tactical analysis per opponent.

2. **Date-range metrics**

   - `period_type = 'range'`
   - `period_start` and `period_end` define the window
   - `match_id` is `NULL`

   Use cases:
   - “Last 30 days BH flick performance”
   - “Season to date FH loop vs under”

You can enforce:

- For `period_type = 'match'`: `match_id IS NOT NULL`.
- For `period_type = 'range'`: `match_id IS NULL`.

---

## 4. Schema Definition (Logical)

```text
player_skill_metrics {
  id                      uuid PK

  player_id               uuid FK -> players.id
  skill_key               text

  period_type             text   "match|range"
  match_id                uuid FK -> matches.id   (nullable; used when period_type = 'match')
  period_start            date   (nullable; used when period_type = 'range')
  period_end              date   (nullable; used when period_type = 'range')

  -- Volume / attempts
  total_shots             int    "Total shots considered for this skill & period"
  attempts                int    "Shots where skill was attempted (e.g. inferred_shot_type matches skill)"

  -- Basic outcomes
  in_play_count           int    "good + average"
  good_count              int
  average_count           int
  error_count             int    "in_net + missed_long"
  in_net_count            int
  missed_long_count       int

  -- Point outcome influence
  winner_count            int    "shots with rally_end_role = 'winner'"
  forced_error_count      int    "shots with rally_end_role = 'forced_error'"
  unforced_error_count    int    "shots with rally_end_role = 'unforced_error' (when this shot is the error)"

  -- Intent decision quality
  correct_intent_count        int
  over_aggressive_count       int
  over_passive_count          int
  misread_count               int

  -- Pressure distribution
  low_pressure_count          int
  medium_pressure_count       int
  high_pressure_count         int

  -- Normalised metrics (optional, can be computed on read, but useful to store)
  in_play_pct                 numeric   "in_play_count / attempts"
  good_pct                    numeric   "good_count / attempts"
  error_pct                   numeric   "error_count / attempts"
  winner_pct                  numeric   "winner_count / attempts"
  forced_error_pct            numeric   "forced_error_count / attempts"
  unforced_error_pct          numeric   "unforced_error_count / attempts"
  correct_intent_pct          numeric   "correct_intent_count / attempts"
  over_aggressive_pct         numeric
  over_passive_pct            numeric
  misread_pct                 numeric

  -- Aggregate skill score (0–10 style) for this skill & period
  skill_score                 numeric   "0–10 scale for this skill, period-specific"
  skill_score_confidence      numeric   "0–1 or 0–100, based on attempts volume"

  -- Metadata
  model_version               text      "e.g. 'v1.0', for inference logic versioning"
  calculated_at               timestamptz
}
```

Notes:

- `total_shots` can be equal to `attempts`, or include contextual shots considered; in most cases they will be the same.
- Percentages can either be stored or computed at query-time; you can start with `NULL` for them if you prefer read-time computation.

---

## 5. How to aggregate from `shots`

### 5.1 Filter relevant shots for a given (player, skill_key, period)

Given a `player_id`, `skill_key`, and a period (`match_id` or start/end dates):

1. Start from the `shots` table.
2. Filter by:
   - `shots.player_id = player_id`
   - Period:
     - For a single match:
       - `shots.match_id = match_id` (if matches are joined via rally)
     - For a date range:
       - Join `shots` → `rallies` → `matches` (or use timestamps) and filter by match date between `period_start` and `period_end`.
3. Filter by `skill_key` logic:
   - If `skill_key` is a **simple technical shot** (e.g. `bh_flick`):
     - `shots.inferred_shot_type = 'bh_flick'`
   - If `skill_key` is **pattern-based** (e.g. `serve_short_under_to_bh`):
     - Use a combination of:
       - `shot_index = 1`
       - `serve_length = 'short'`
       - `serve_spin_family = 'under'`
       - `landing_zone = 'to_bh'`

The result set is the **attempts** for this skill in the chosen period.

### 5.2 Core counts

From those shots:

- `attempts` = number of rows in the filtered set.
- `total_shots` = equal to `attempts` (unless you choose to include additional context shots).

Then compute:

- `good_count`        = count where `shot_result = 'good'`
- `average_count`     = count where `shot_result = 'average'`
- `in_net_count`      = count where `shot_result = 'in_net'`
- `missed_long_count` = count where `shot_result = 'missed_long'`

- `in_play_count`     = `good_count + average_count`
- `error_count`       = `in_net_count + missed_long_count`

---

### 5.3 Outcome influence

Using `rally_end_role`:

- `winner_count`         = count where `rally_end_role = 'winner'`
- `forced_error_count`   = count where `rally_end_role = 'forced_error'`
- `unforced_error_count` = count where `rally_end_role = 'unforced_error'`

These tell you how often this skill is the **point-winner**, or associated with **forced/unforced errors**.

---

### 5.4 Intent quality

Using `intent_quality`:

- `correct_intent_count`    = count where `intent_quality = 'correct'`
- `over_aggressive_count`   = count where `intent_quality = 'over_aggressive'`
- `over_passive_count`      = count where `intent_quality = 'over_passive'`
- `misread_count`           = count where `intent_quality = 'misread'`

This supports statements like:

- “BH flick decisions are mostly correct, execution is the issue.”
- “FH loop vs under is often over-aggressive for current skill level.”

---

### 5.5 Pressure distribution

Using `pressure_level`:

- `low_pressure_count`    = count where `pressure_level = 'low'`
- `medium_pressure_count` = count where `pressure_level = 'medium'`
- `high_pressure_count`   = count where `pressure_level = 'high'`

This allows analysis like:

- “Your BH flicks are mostly played at medium pressure, with rare high-pressure attacks.”
- “FH loop vs under is frequently high-pressure and decisive.”

---

### 5.6 Derived percentages

For each count metric `x_count` you can compute `x_pct` as:

```text
x_pct = x_count / attempts       (if attempts > 0)
```

You can:

- Store these in the table for performance.
- Or compute them at query-time and leave them out of the schema initially.

---

### 5.7 Skill score (0–10)

`skill_score` is an **aggregate rating** for the skill in this period, intended to feed:

- UI visualisations
- `player_profiles` updates
- Coaching recommendations

A simple starting formula:

```text
base = in_play_pct
bonus_good = 0.5 * good_pct
penalty_error = error_pct

raw_score = base + bonus_good - penalty_error

skill_score = clamp( raw_score * 10, 0, 10 )
```

Or more detailed, weighting winners/forced errors higher. The exact formula can evolve; keep:

- `model_version` so you know which logic was used.
- `skill_score_confidence` based on `attempts`, e.g.:

```text
skill_score_confidence = min(1.0, attempts / 50.0)
```

(Or 0–100 scale if you prefer.)

---

## 6. Example SQL Sketch

Example table definition in Postgres / Supabase:

```sql
CREATE TYPE period_type_enum AS ENUM ('match', 'range');

CREATE TABLE player_skill_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  player_id uuid NOT NULL REFERENCES players(id),
  skill_key text NOT NULL,

  period_type period_type_enum NOT NULL,
  match_id uuid NULL REFERENCES matches(id),
  period_start date NULL,
  period_end date NULL,

  total_shots int NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,

  in_play_count int NOT NULL DEFAULT 0,
  good_count int NOT NULL DEFAULT 0,
  average_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  in_net_count int NOT NULL DEFAULT 0,
  missed_long_count int NOT NULL DEFAULT 0,

  winner_count int NOT NULL DEFAULT 0,
  forced_error_count int NOT NULL DEFAULT 0,
  unforced_error_count int NOT NULL DEFAULT 0,

  correct_intent_count int NOT NULL DEFAULT 0,
  over_aggressive_count int NOT NULL DEFAULT 0,
  over_passive_count int NOT NULL DEFAULT 0,
  misread_count int NOT NULL DEFAULT 0,

  low_pressure_count int NOT NULL DEFAULT 0,
  medium_pressure_count int NOT NULL DEFAULT 0,
  high_pressure_count int NOT NULL DEFAULT 0,

  in_play_pct numeric NULL,
  good_pct numeric NULL,
  error_pct numeric NULL,
  winner_pct numeric NULL,
  forced_error_pct numeric NULL,
  unforced_error_pct numeric NULL,
  correct_intent_pct numeric NULL,
  over_aggressive_pct numeric NULL,
  over_passive_pct numeric NULL,
  misread_pct numeric NULL,

  skill_score numeric NULL,
  skill_score_confidence numeric NULL,

  model_version text NOT NULL DEFAULT 'v1.0',
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_skill_period
  ON player_skill_metrics (player_id, skill_key, period_type, match_id, period_start, period_end);
```

You can refine indexes once you know your query patterns.

---

## 7. Flow Summary

1. **Ingest / Tagging**
   - User tags shots via Wing × Intent grid + gesture.
   - `shots` rows are created.
   - Inference engine populates `landing_zone`, `shot_result`, `pressure_level`, `intent_quality`, `rally_end_role`, `inferred_shot_type`, etc.

2. **Aggregation Job**
   - Periodically (or on-demand), a job:
     - Reads `shots` for a given `player_id`, `skill_key`, period.
     - Computes all counts & percentages.
     - Computes `skill_score` & `skill_score_confidence`.
     - Writes/updates a row in `player_skill_metrics`.

3. **Usage**
   - UI screens show:
     - Match-level skill breakdowns.
     - Last X days/season snapshots.
   - `player_profiles` can consume the latest aggregates to update:
     - `fh_loop_vs_under`, `bh_flick`, etc. ratings.
   - Coaching copy generators use these metrics to say:
     - “Your BH flick is improving – in-play up from 40% to 60% over the last month.”
     - “FH loop vs under is a clear strength: 25% winners + 35% forced errors over last 10 matches.”

This table provides the **bridge layer** between detailed shot-level data and human-readable, coaching-friendly insights.
