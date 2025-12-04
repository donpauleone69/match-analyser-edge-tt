# Gestures, Intents & Inference Engine Specification

Filename: `gestures_Intents_Inference_Engine.md`  

This document describes the **shot input model**, **gesture mapping**, and the **inference engine** for deriving winners, forced errors, and unforced errors in the Edge TT Match Analyser.

---

## 0. Shot Input Model Overview

Each **shot** (except serves, which can have extra serve-specific fields) is captured with:

- **Wing** – which side the player used:
  - `FH` (forehand)
  - `BH` (backhand)
- **Intent** – tactical intention of the shot:
  - `def` (defensive)
  - `neutral`
  - `agg` (aggressive)
- **Gesture** – a *single continuous gesture* performed after tapping the Wing×Intent grid:
  - `none`
  - `swipeLeft`
  - `swipeRight`
  - `swipeUp`
  - `swipeDown`
  - `hold`
  - `holdLeft`
  - `holdRight`
- **Previous Direction** – from the prior shot in the rally:
  - `prevDirection ∈ {toFH, toBH, null}`

From these, the engine derives per-shot:

- `outcome` – `in` or `error`
- `errorType` – `net` | `off` | `null`
- `quality` – `normal` | `high` | `null`
- `direction` – `toFH` | `toBH` | `null`
- `pressureLevel` – `low` | `medium` | `high`

Then, at the **rally level**, it derives:

- `errorPressureType` – `forced` | `unforced`
- `pointWinnerId`
- `prevPointResultForPrev` – `winner` | `forcedError` | `neutral`

---

## 1. Derivation Rules Table

### 1.1. Gesture → Core Fields

**Raw inputs per shot:**

- `wing ∈ {FH, BH}`
- `intent ∈ {def, neutral, agg}`
- `gestureType ∈ {none, swipeLeft, swipeRight, swipeUp, swipeDown, hold, holdLeft, holdRight}`
- `prevDirection ∈ {toFH, toBH, null}`

**Derived fields:**

| `gestureType` | `outcome` | `isError` | `errorType` | `quality` | `direction (toSide)`         |
| ------------- | --------- | --------: | ----------- | --------- | ---------------------------- |
| `none`        | `in`      |     false | `null`      | `normal`  | `prevDirection` (or default) |
| `swipeLeft`   | `in`      |     false | `null`      | `normal`  | `toBH`                       |
| `swipeRight`  | `in`      |     false | `null`      | `normal`  | `toFH`                       |
| `swipeUp`     | `error`   |      true | `off`       | `null`    | `null`                       |
| `swipeDown`   | `error`   |      true | `net`       | `null`    | `null`                       |
| `hold`        | `in`      |     false | `null`      | `high`    | `prevDirection` (or default) |
| `holdLeft`    | `in`      |     false | `null`      | `high`    | `toBH`                       |
| `holdRight`   | `in`      |     false | `null`      | `high`    | `toFH`                       |

> Note: For the **first in-play shot** in a rally where `prevDirection` is `null`, you can assign a default direction (e.g., `toBH`) or require an explicit left/right gesture on that shot.

---

### 1.2. Deriving Pressure Level

You can optionally derive a coarse `pressureLevel` to help classify forced vs unforced errors. This combines:

- `intent`
- `quality`
- direction change vs previous shot

Example rule set:

| `intent`  | `quality` | `directionChanged` | `pressureLevel` |
| --------- | --------- | ------------------ | --------------- |
| `agg`     | `high`    | any                | `high`          |
| `agg`     | `normal`  | true               | `medium`        |
| `agg`     | `normal`  | false              | `medium`        |
| `neutral` | `high`    | true               | `medium`        |
| `neutral` | `high`    | false              | `medium`        |
| `neutral` | `normal`  | true               | `medium`        |
| `neutral` | `normal`  | false              | `low`           |
| `def`     | `high`    | true               | `medium`        |
| `def`     | `high`    | false              | `medium`        |
| `def`     | `normal`  | any                | `low`           |

This is deliberately simple and can be refined later with player profile and context (serve/receive, distance, etc.).

---

### 1.3. From (Previous Shot, Error Shot) → Winner / Forced / Unforced

We consider two shots at rally end:

- `P` = previous shot (by the *other* player)
- `E` = current shot, which ended in error

Key fields:

- `P.quality ∈ {normal, high, null}`
- `P.intent ∈ {def, neutral, agg}`
- `P.pressureLevel ∈ {low, medium, high}`
- `E.outcome == 'error'`
- `E.errorType ∈ {net, off}`

**Classification:**

| `P.quality` | `P.intent` | `P.pressureLevel`     | `E.isError` | `errorPressureType` | `prevPointResultForPrev` |
| ----------- | ---------- | --------------------- | ----------- | ------------------- | ------------------------ |
| `high`      | any        | any                   | true        | `forced`            | `winner`                 |
| not `high`  | `agg`      | `high` or `medium`    | true        | `forced`            | `forcedError`            |
| not `high`  | `neutral`  | `medium`              | true        | `forced` (light)    | `forcedError`            |
| else        | any        | `low` or unclassified | true        | `unforced`          | `neutral`                |

---

## 2. Decision Tree – Winner / Forced / Unforced

This section shows the logic for classifying the outcome of a rally-ending shot using a **decision tree**.

We assume:

- Current shot `E` has `outcome == 'error'`
- Previous shot `P` is available (index `errorIndex - 1`)

### 2.1. Mermaid Decision Tree

```mermaid
flowchart TD

A[Current shot outcome = error?] -->|No| Z[No classification<br/>Continue rally logic]
A -->|Yes| B[Previous shot exists?]

B -->|No (serve missed)| U1[Unforced error<br/>Prev = neutral benefit]
B -->|Yes| C[Was previous shot high quality?]

C -->|Yes| F1[Forced error<br/>Prev classified as Winner]
C -->|No| D[Was previous shot intent = agg<br/>and pressure != low?]

D -->|Yes| F2[Forced error<br/>Prev classified as ForcedError]
D -->|No| U2[Unforced error<br/>Prev classified as Neutral]

style Z fill:#eee,stroke:#999,stroke-width:1px
style U1 fill:#ffe6e6,stroke:#cc6666,stroke-width:1px
style U2 fill:#ffe6e6,stroke:#cc6666,stroke-width:1px
style F1 fill:#e6ffe6,stroke:#66aa66,stroke-width:1px
style F2 fill:#e6ffe6,stroke:#66aa66,stroke-width:1px
```

**Interpretation:**

1. If the current shot is not an error → no winner/forced/unforced classification yet.
2. If the current shot is an error and **no previous shot exists** (e.g. serve missed):
   - Treat as **unforced error**.
3. If the previous shot had **high quality** (`quality == 'high'`):
   - Error is **forced**.
   - Previous shot is treated as a **winner**.
4. Else if previous shot was **aggressive** and `pressureLevel != 'low'`:
   - Error is **forced**.
   - Previous shot is awarded a **forced error** result.
5. Otherwise:
   - Error is **unforced**.
   - Previous shot is treated as **neutral** (they benefitted but didn’t strongly earn it).


---

## 3. Inference Engine Algorithm (Pseudo-code)

This section provides TypeScript-style pseudo-code for the core inference logic.

### 3.1. Types

```ts
type Wing = 'FH' | 'BH';
type Intent = 'def' | 'neutral' | 'agg';

type GestureType =
  | 'none'
  | 'swipeLeft'
  | 'swipeRight'
  | 'swipeUp'
  | 'swipeDown'
  | 'hold'
  | 'holdLeft'
  | 'holdRight';

type Direction = 'toFH' | 'toBH' | null;

type Quality = 'normal' | 'high' | null;
type ErrorType = 'net' | 'off' | null;
type PressureLevel = 'low' | 'medium' | 'high';

type ErrorPressureType = 'forced' | 'unforced';
type PointResultForPrev = 'winner' | 'forcedError' | 'neutral';
```

### 3.2. Shot Structures

```ts
interface RawShotInput {
  playerId: string;
  wing: Wing;
  intent: Intent;
  gesture: GestureType;
}

interface DerivedShot {
  playerId: string;
  wing: Wing;
  intent: Intent;

  outcome: 'in' | 'error';
  errorType: ErrorType;   // 'net' | 'off' | null
  quality: Quality;       // 'normal' | 'high' | null
  direction: Direction;   // 'toFH' | 'toBH' | null
  pressureLevel: PressureLevel;
}
```

### 3.3. Derive Fields from Gesture

```ts
function deriveShot(
  input: RawShotInput,
  prevDirection: Direction
): DerivedShot {
  let outcome: 'in' | 'error' = 'in';
  let errorType: ErrorType = null;
  let quality: Quality = 'normal';
  let direction: Direction = prevDirection;

  switch (input.gesture) {
    case 'none':
      // Normal quality, direction stays as previous
      break;

    case 'swipeLeft':
      direction = 'toBH';
      break;

    case 'swipeRight':
      direction = 'toFH';
      break;

    case 'swipeUp':
      outcome = 'error';
      errorType = 'off';
      quality = null;
      direction = null;
      break;

    case 'swipeDown':
      outcome = 'error';
      errorType = 'net';
      quality = null;
      direction = null;
      break;

    case 'hold':
      quality = 'high';
      // direction unchanged (prevDirection)
      break;

    case 'holdLeft':
      quality = 'high';
      direction = 'toBH';
      break;

    case 'holdRight':
      quality = 'high';
      direction = 'toFH';
      break;
  }

  const pressureLevel = derivePressureLevel(
    input.intent,
    quality,
    prevDirection,
    direction
  );

  return {
    playerId: input.playerId,
    wing: input.wing,
    intent: input.intent,
    outcome,
    errorType,
    quality,
    direction,
    pressureLevel,
  };
}
```

### 3.4. Derive Pressure Level

```ts
function derivePressureLevel(
  intent: Intent,
  quality: Quality,
  prevDir: Direction,
  dir: Direction
): PressureLevel {
  const directionChanged =
    prevDir !== null && dir !== null && prevDir !== dir;

  if (quality === 'high') {
    if (intent === 'agg') return 'high';
    return directionChanged ? 'high' : 'medium';
  }

  // Normal quality
  if (intent === 'agg') {
    return directionChanged ? 'medium' : 'medium'; // safe default
  }

  if (intent === 'neutral' && directionChanged) {
    return 'medium';
  }

  return 'low';
}
```

> This is deliberately conservative. It is easy to tweak thresholds later based on real tagged data.

### 3.5. Classify Error as Forced vs Unforced, and Assign Winner

```ts
interface ErrorClassification {
  errorShotIndex: number;               // index of the shot that errored
  errorPressureType: ErrorPressureType; // forced/unforced
  pointWinnerId: string;
  prevPointResultForPrev: PointResultForPrev;
}

/**
 * shots: array of DerivedShot for a single rally, in order.
 * errorIndex: index of the shot with outcome === 'error'.
 */
function classifyErrorOutcome(
  shots: DerivedShot[],
  errorIndex: number
): ErrorClassification | null {
  const errorShot = shots[errorIndex];
  if (errorShot.outcome !== 'error') return null;

  const prevIndex = errorIndex - 1;

  // If there is no previous shot (e.g. missed serve)
  if (prevIndex < 0) {
    const opponentId = inferOpponentId(errorShot.playerId, shots);
    return {
      errorShotIndex: errorIndex,
      errorPressureType: 'unforced',
      pointWinnerId: opponentId,
      prevPointResultForPrev: 'neutral',
    };
  }

  const prevShot = shots[prevIndex];

  let errorPressureType: ErrorPressureType = 'unforced';
  let prevPointResultForPrev: PointResultForPrev = 'neutral';

  if (prevShot.quality === 'high') {
    // High-quality previous shot → treat as winner-producing pressure
    errorPressureType = 'forced';
    prevPointResultForPrev = 'winner';
  } else if (
    prevShot.intent === 'agg' &&
    prevShot.pressureLevel !== 'low'
  ) {
    // Aggressive with at least medium pressure → forced error
    errorPressureType = 'forced';
    prevPointResultForPrev = 'forcedError';
  } else {
    // Everything else → unforced error
    errorPressureType = 'unforced';
    prevPointResultForPrev = 'neutral';
  }

  const pointWinnerId = prevShot.playerId; // error player loses

  return {
    errorShotIndex: errorIndex,
    errorPressureType,
    pointWinnerId,
    prevPointResultForPrev,
  };
}

/**
 * Helper: Infer opponent playerId if needed.
 * In real implementation, you'll know both players per rally.
 */
function inferOpponentId(
  playerId: string,
  shots: DerivedShot[]
): string {
  const other = shots.find(s => s.playerId !== playerId);
  return other ? other.playerId : playerId; // fallback to same if single-player data
}
```

---

## 4. Notes & Extension Points

- **Player Profiles** can feed into:
  - `derivePressureLevel`
  - thresholds for “forced” vs “unforced”
  - expectations for “correct intent” vs “over-aggressive / over-passive”
- **Intent Quality** (correct / overAggressive / overPassive / misread) can be layered on top using:
  - serve/receive context
  - incoming spin (inferred)
  - player strengths/weaknesses (profile)
- The current model is intentionally **MVP-simple** and robust, and is safe to evolve once you have real tagged data.

---
