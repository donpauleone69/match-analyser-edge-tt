# Serve Input Specification

Filename: `serve_input_spec.md`  

This document describes the **serve tagging UI & gesture model** for Edge TT Match Analyser, and how it maps into the `shots` table and inference engine.

See also:

- `gestures_Intents_Inference_Engine.md`
- `Shots_Schema_Spec.md`

---

## 1. Overview

Each serve (`shot_index = 1`) is tagged with **two inputs**:

1. **Placement & Length + Result** – using a horizontal length bar and gesture.
2. **Spin** – using a circular “spin ball” touch zone.

This yields all required serve fields:

- `serve_length`
- `serve_spin_family`
- `landing_zone`
- `shot_result`

And allows the inference engine to treat serves consistently with other shots.

---

## 2. Input 1 – Placement & Length + Result

### 2.1 UI Layout – Length Bar

A vertical bar divided into three tap zones:

```text
+-----------+
|   LONG    |
+-----------+
| HALF-LONG |
+-----------+
|   SHORT   |
+-----------+
```

### 2.2 Step A – Length Selection

User taps one zone:

- Tap **SHORT**      → `serve_length = 'short'`
- Tap **HALF-LONG**  → `serve_length = 'half_long'`
- Tap **LONG**       → `serve_length = 'long'`

The tapped zone is highlighted.

### 2.3 Step B – Gesture Inside the Highlighted Zone

Inside that zone, the user performs **one gesture**:

#### Horizontal: Direction (`landing_zone`)

- `swipeLeft`   → `landing_zone = 'to_bh'`
- `swipeRight`  → `landing_zone = 'to_fh'`
- `tap` / `hold` (no horizontal) → `landing_zone = 'to_mid'`

#### Vertical & Duration: Result (`shot_result`)

- short tap (no vertical)   → `shot_result = 'average'`
- long press / hold         → `shot_result = 'good'`
- full swipeDown (pull down)→ `shot_result = 'in_net'` and `landing_zone = null`
- full swipeUp (push forward) → `shot_result = 'missed_long'` and `landing_zone = null`

Implementation detail:

- Use distance thresholds to distinguish:
  - subtle jitter vs.
  - actual full vertical swipe (error).

### 2.4 Mapping Summary

| Zone tapped | Gesture                   | serve_length | landing_zone | shot_result   |
| ----------- | ------------------------- | ------------ | ------------ | ------------- |
| SHORT       | tap                       | `short`      | `to_mid`     | `average`     |
| SHORT       | hold                      | `short`      | `to_mid`     | `good`        |
| SHORT       | swipeLeft (no full vert)  | `short`      | `to_bh`      | `average`     |
| SHORT       | swipeRight (no full vert) | `short`      | `to_fh`      | `average`     |
| ANY         | any horiz + swipeDown     | as tapped    | `null`       | `in_net`      |
| ANY         | any horiz + swipeUp       | as tapped    | `null`       | `missed_long` |

Equivalent behaviour for HALF-LONG and LONG.

---

## 3. Input 2 – Spin Ball

### 3.1 UI Layout

A circular touch zone representing spin:

```text
      ↑
   ↖     ↗

←     ○     →

   ↙     ↘
      ↓
```

### 3.2 Interactions

- **Tap** anywhere on the ball → `serve_spin_family = 'no_spin'`
- **Swipe direction** from any starting point:

Raw spin idea:

- Up          → topspin
- Down        → underspin
- Left/Right  → sidespin
- Diagonals   → top/under + side

For MVP we reduce this to a simple 4-way family: `under | top | side | no_spin`.

### 3.3 Collapsed Mapping

| Swipe direction        | serve_spin_family |
| ---------------------- | ----------------- |
| Up                     | `top`             |
| Down                   | `under`           |
| Left / Right           | `side`            |
| Up-Left / Up-Right     | `top`             |
| Down-Left / Down-Right | `under`           |
| Tap                    | `no_spin`         |

This is written to `shots.serve_spin_family`.

---

## 4. Integration with `shots` & Engine

After the two serve inputs:

- `serve_length`       → from length bar tap
- `landing_zone`       → from bar gesture
- `shot_result`        → from bar gesture
- `serve_spin_family`  → from spin ball

Optional:

- `wing` / `intent` from Wing × Intent grid (if enabled for serves).

Inference then:

- Computes `pressure_level` from `intent`, `shot_result`, `landing_zone`.
- Sets:
  - `inferred_shot_type = 'serve'`
  - `inferred_shot_confidence = 'high'`
- Uses serve pattern (`serve_length`, `serve_spin_family`, `landing_zone`) for:
  - serve stats in `player_skill_metrics`,
  - receive and 3rd-ball inference,
  - intent quality on receive.

---

## 5. Notes & Future Extensions

- `serve_type` is present in schema but **not bound** in this UI yet.
- You can add a small chip row later for:
  - `pendulum`, `reverse_pendulum`, `tomahawk`, `backhand`, `hook`, `lollipop`, `other`.

The current design already provides:

- full support for serve patterns,
- minimal tagging friction,
- and a consistent mental model with rally shots.
