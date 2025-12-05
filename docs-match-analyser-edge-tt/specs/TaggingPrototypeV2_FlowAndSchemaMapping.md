## Tagging Prototype V2 – Flow and Schema Mapping

This document describes how **Tagging UI Prototype V2** collects rally and shot data, and how that data maps into the canonical `rallies` and `shots` database schema.

It focuses on:

- The **Phase 1** timestamp/tagging flow (contacts and rally endpoints).
- The **Phase 2** per-shot detail flow (serve vs rally shots vs error shots).
- Canonical **raw models** (`RawRally`, `RawShot`) that represent what V2 actually captures.
- The mapping from these models into the **future DB schema** (`RALLIES` and `SHOTS`).

---

## 1. Prototype V2 – Phase 1 Timestamp Flows

Source: `app/src/features/tagging-ui-prototype-v2/composers/Phase1TimestampComposer.tsx`, `Phase1ControlsBlock.tsx`.

### 1.1 Entities in Phase 1

**Phase1Shot**

- `id: string`
- `timestamp: number` – current video time from `useTaggingStore`.
- `shotIndex: number` – 0‑based, incremented per `Serve/Shot` tap.
- `isServe: boolean` – `true` when `shotIndex === 0`.

**Phase1Rally**

- `id: string`
- `shots: Phase1Shot[]`
- `endCondition: 'innet' | 'long' | 'winner'`
- `endTimestamp: number`
- `isError: boolean` – `true` for `innet` / `long`, `false` for `winner`.
- `errorPlacement?: 'innet' | 'long'`
- `serverId: 'player1' | 'player2'` – currently hard‑coded to `'player1'` in the prototype, conceptually “who served this rally”.

**Rally state**

- `rallyState: 'before-serve' | 'after-serve'`
- `currentShots: Phase1Shot[]` – shots in the rally in progress.
- `completedRallies: Phase1Rally[]` – saved rallies.

### 1.2 Controls and State Transitions

Controls come from `Phase1ControlsBlock`:

- `ShotMissedButton`  → “Long / missed”.
- `InNetButton`       → “In net”.
- `WinningShotButton` → “Winner”.
- `ServeButton`       → first contact of a rally.
- `ShotButton`        → subsequent contacts in the same rally.

**Before the serve**

- `rallyState = 'before-serve'`.
- Only the **Serve** button is active.
- End buttons (**ShotMissed**, **InNet**, **WinningShot**) are disabled.

**On first Serve press**

- Append a new `Phase1Shot`:
  - `shotIndex = 0`.
  - `isServe = true`.
  - `timestamp = currentTime`.
- Set `rallyState = 'after-serve'`.
- End buttons become enabled; the Serve button changes label to **Shot**.

**On subsequent Shot presses**

- Each Shot press appends another `Phase1Shot`:
  - `shotIndex = currentShots.length`.
  - `isServe = false`.
  - `timestamp = currentTime`.
- `rallyState` remains `'after-serve'`.

### 1.3 Rally End Trees / Endpoints

From `after-serve`, there are three mutually exclusive end paths:

**Path A – Shot Missed (long/missed)**

- Trigger: **ShotMissedButton**.
- Create a `Phase1Rally` with:
  - `endCondition = 'long'`.
  - `endTimestamp = currentTime`.
  - `isError = true`.
  - `errorPlacement = 'long'`.
- Append to `completedRallies`.
- Reset:
  - `currentShots = []`.
  - `rallyState = 'before-serve'`.

**Path B – In Net**

- Trigger: **InNetButton**.
- Create a `Phase1Rally` with:
  - `endCondition = 'innet'`.
  - `endTimestamp = currentTime`.
  - `isError = true`.
  - `errorPlacement = 'innet'`.
- Append to `completedRallies`.
- Reset `currentShots` and `rallyState` as above.

**Path C – Winning Shot**

- Trigger: **WinningShotButton**.
- Create a `Phase1Rally` with:
  - `endCondition = 'winner'`.
  - `endTimestamp = currentTime`.
  - `isError = false`.
  - `errorPlacement = undefined`.
- Append to `completedRallies`.
- Reset `currentShots` and `rallyState`.

**Key facts**

- The **last `Phase1Shot` in `rally.shots`** is always the shot that:
  - Wins the rally when `endCondition = 'winner'`.
  - Commits the error when `endCondition = 'innet' | 'long'`.
- Phase 1 currently **does not** record:
  - `winnerId` (which player won the rally).
  - `isScoring` vs non‑scoring rallies.
  - Score progression (`player1ScoreAfter`, `player2ScoreAfter`).

These can be added later using winner selection and the existing `calculateServer` / `deriveEndOfPoint` logic.

### 1.4 Two‑Player Correctness

Conceptually, for two‑player correctness:

- Per rally we need:
  - `serverId: PlayerId`.
  - `receiverId: otherPlayer(serverId)`.
- Per shot we infer the hitting player with:

```ts
playerId = calculateShotPlayer(serverId, shotIndex)
```

- Even `shotIndex` → server; odd `shotIndex` → receiver.

Once `Phase1Rally.serverId` is populated correctly (using score, game state, and `calculateServer`), the Phase 1 model is fully 2‑player‑correct.

---

## 2. Prototype V2 – Phase 2 Per‑Shot Detail Flows

Source: `app/src/features/tagging-ui-prototype-v2/composers/Phase2DetailComposer.tsx`.

### 2.1 Flattening Rallies into Shots

On initialisation, Phase 2 flattens all Phase 1 rallies into a single ordered list:

- For each `Phase1Rally`:
  - For each `Phase1Shot` (`shot`, `index`):
    - Compute:
      - `isLastShot = (index === rally.shots.length - 1)`.
      - `isError = rally.isError && isLastShot`.
    - Create a `DetailedShot`:
      - Inherits `id`, `timestamp`, `shotIndex`, `isServe`.
      - Adds:
        - `rallyId`, `rallyEndCondition`, `isLastShot`, `isError`, `serverId`.
        - Detail fields initialised as `undefined`:
          - `direction`, `length`, `spin`, `stroke`, `intent`, `errorType`, `shotQuality`.

The list is stored in `allShots: DetailedShot[]` with `currentShotIndex` pointing to the shot being tagged.

### 2.2 Determining the Shot Player

For each `currentShot`:

- The hitting player is computed via domain logic:

```ts
currentShotPlayer = calculateShotPlayer(currentShot.serverId, currentShot.shotIndex)
```

This is used to:

- Tint the bottom control strip differently for Player 1 vs Player 2.
- Provide the correct `player_id` when mapping to the DB.

### 2.3 Question Step Types

There are three shot‑flow types plus a terminal state:

- Serve flow:
  - `ServeStep = 'direction' | 'length' | 'spin'`.
- Regular (non‑error) shot flow:
  - `ShotStep = 'stroke' | 'direction' | 'intent'`.
- Error shot flow:
  - `ErrorStep = 'stroke' | 'intent' | 'errorType'`.
- Union:
  - `QuestionStep = ServeStep | ShotStep | ErrorStep | 'complete'`.

The flow controller:

- Starts at:
  - `currentStep = 'direction'` for the first serve.
- For each subsequent shot:
  - `nextShot.isServe ? 'direction' : 'stroke'`.

### 2.4 Serve Shots – Flow and Data

When `currentShot.isServe === true`:

**Step 1 – Direction (`currentStep === 'direction'`)**

- Buttons:
  - `LeftLeft`, `LeftMid`, `LeftRight`, `RightLeft`, `RightMid`, `RightRight`.
- Stores:

```ts
type Direction =
  | 'left_left' | 'left_mid' | 'left_right'
  | 'mid_left'  | 'mid_mid'  | 'mid_right'
  | 'right_left'| 'right_mid'| 'right_right'
```

- For serves, this captures a 2D serve placement (start side × end side).
- After selection: `direction → length`.

**Step 2 – Length (`currentStep === 'length'`)**

- Buttons:
  - `Short`, `HalfLong`, `Deep`.
- Stores `length`:

```ts
length: 'short' | 'halflong' | 'deep'
```

- After selection: `length → spin`.

**Step 3 – Spin (`currentStep === 'spin'`)**

- Buttons:
  - `Underspin`, `NoSpin`, `Topspin`.
- Stores `spin`:

```ts
spin: 'underspin' | 'nospin' | 'topspin'
```

- After selection: the flow advances to the next shot.

**Serve data captured per serve shot**

- `direction` – 2D placement channel.
- `length` – depth bucket (short / half‑long / deep).
- `spin` – coarse spin family (under / no spin / top).

Currently **not captured** in V2:

- Serve wing (FH/BH).
- Serve type (pendulum, tomahawk, etc.) – exists in schema for future use.

### 2.5 Regular (Non‑Error) Rally Shots – Flow and Data

Condition: `!currentShot.isServe && !currentShot.isError`.

**Step 1 – Stroke (`currentStep === 'stroke'`)**

Layout (3 columns):

- Column 1:
  - `ShotQualityToggleBlock` with internal `ShotQuality = 'average' | 'high'` (default `'average'`).
- Column 2:
  - `BackhandButton`.
- Column 3:
  - `ForehandButton`.

Behaviour:

- Toggling the quality block only updates `currentShotQuality`.
- When BH/FH is pressed:

```ts
handleAnswer('shotQuality', currentShotQuality)
handleAnswer('stroke', 'backhand' | 'forehand')
```

Captured fields:

- `stroke: 'backhand' | 'forehand'`.
- `shotQuality: 'average' | 'high'`.

**Step 2 – Direction (`currentStep === 'direction'`)**

The UI chooses the row of direction buttons based on the **previous shot’s landing side**, inverted to the receiver’s perspective:

- `getPreviousDirection()`:
  - Reads `prevShot.direction` and extracts the **end** side (`'left' | 'mid' | 'right'`).
- `getNextShotStartingSide()`:
  - Inverts for receiver:
    - `'left' → 'right'`, `'right' → 'left'`, `'mid' → 'mid'`.

Buttons:

- Start `'left'`:
  - `LeftLeft`, `LeftMid`, `LeftRight`.
- Start `'mid'`:
  - `MidLeft`, `MidMid`, `MidRight`.
- Start `'right'`:
  - `RightLeft`, `RightMid`, `RightRight`.
- Fallback (no previous direction):
  - Mid row.

Step stores:

- `direction: Direction` (as defined above).

**Step 3 – Intent (`currentStep === 'intent'`)**

- Buttons:
  - `Defensive`, `Neutral`, `Aggressive`.
- Stores:

```ts
intent: 'defensive' | 'neutral' | 'aggressive'
```

After selection, the flow advances to the next shot.

**Regular shot data captured per non‑error, non‑serve shot**

- `stroke` (backhand / forehand).
- `shotQuality` (average / high).
- `direction` (2D).
- `intent` (defensive / neutral / aggressive).

### 2.6 Error Shots – Flow and Data

Condition: `currentShot.isError === true` (last shot of an error rally).

**Step 1 – Stroke (`currentStep === 'stroke'`)**

- Buttons:
  - `Backhand`, `Forehand`.
- Stores `stroke` only.

**Step 2 – Intent (`currentStep === 'intent'`)**

- Buttons:
  - `Defensive`, `Neutral`, `Aggressive`.
- Stores `intent`.

**Step 3 – Error Type (`currentStep === 'errorType'`)**

- Buttons:
  - `ForcedError`, `UnforcedError`.
- Stores:

```ts
errorType: 'forced' | 'unforced'
```

After selection, the flow advances to the next shot.

**Error shot data captured per error shot**

- `stroke` (BH / FH).
- `intent` (def / neutral / agg).
- `errorType` (forced / unforced).
- From the containing rally:
  - `endCondition: 'innet' | 'long'`.
  - `isLastShot: true`.

Combined with `serverId` and `calculateShotPlayer`, this uniquely identifies **who made which kind of error**.

---

## 3. Canonical Raw Models for Prototype V2

To bridge UI flows and the DB schema, we define two neutral models:

- `RawRally` – rally‑level record built from Phase 1.
- `RawShot` – shot‑level record combining Phase 1 and Phase 2.

These are conceptual TypeScript shapes that can be shared across frontend and backend.

### 3.1 `RawRally` Model

```ts
type PlayerId = 'player1' | 'player2' | string; // later UUIDs

type RawRally = {
  rallyId: string;
  matchId: string | null;
  gameId: string | null;

  rallyIndex: number;        // 1-based within game
  serverId: PlayerId;
  receiverId: PlayerId;      // = otherPlayer(serverId)

  shots: {
    shotId: string;
    time: number;            // seconds into video
    shotIndex: number;       // 0-based, 0 = serve
    isServe: boolean;
  }[];

  endTimestamp: number;
  endCondition: 'winner' | 'innet' | 'long';

  // To be added / derived:
  isScoring: boolean;                        // true for all rallies in V2 prototype
  winnerId: PlayerId | null;                 // set via winner dialog + endCondition
  player1ScoreAfter: number | null;
  player2ScoreAfter: number | null;
};
```

**Mapping from Phase 1**

- `rallyId`        ← `Phase1Rally.id`.
- `shots[*]`       ← `Phase1Rally.shots` (id, timestamp, shotIndex, isServe).
- `endTimestamp`   ← `Phase1Rally.endTimestamp`.
- `endCondition`   ← `Phase1Rally.endCondition`.
- `serverId`       ← `Phase1Rally.serverId` (later from `calculateServer`).
- `receiverId`     ← `otherPlayer(serverId)`.

Score and winner info will be added by integrating the 2‑step tagging spec’s winner dialog and score derivation.

### 3.2 `RawShot` Model

```ts
type RawShot = {
  shotId: string;
  rallyId: string;
  matchId: string | null;
  gameId: string | null;

  time: number;          // seconds into video
  shotIndex: number;     // 0-based within rally
  isServe: boolean;
  isLastShot: boolean;
  isError: boolean;      // this shot ends the rally with error (innet/long)

  serverId: PlayerId;    // from RawRally
  playerId: PlayerId;    // = calculateShotPlayer(serverId, shotIndex)

  // Serve-only fields
  serveDirection?: Direction;             // 2D serve placement
  serveLength?: 'short' | 'halflong' | 'deep';
  serveSpin?: 'underspin' | 'nospin' | 'topspin';

  // Non-serve fields
  stroke?: 'backhand' | 'forehand';       // maps to wing
  direction?: Direction;                  // 2D rally shot direction
  intent?: 'defensive' | 'neutral' | 'aggressive';

  // Quality / error
  shotQuality?: 'average' | 'high';       // non-error, non-serve shots
  errorType?: 'forced' | 'unforced';      // for error shots only
  endCondition?: 'winner' | 'innet' | 'long'; // from rally; duplicated for last shot
};
```

**Mapping from Phase 1 + Phase 2**

- `shotId`, `time`, `shotIndex`, `isServe`:
  - From `Phase1Shot`.
- `isLastShot`, `isError`, `endCondition`:
  - From `Phase2DetailComposer` setup using `Phase1Rally`.
- `serverId`:
  - From `Phase1Rally.serverId`.
- `playerId`:
  - `calculateShotPlayer(serverId, shotIndex)`.
- Serve fields (when `isServe`):
  - `serveDirection` ← `DetailedShot.direction`.
  - `serveLength`    ← `DetailedShot.length`.
  - `serveSpin`      ← `DetailedShot.spin`.
- Non‑serve, non‑error:
  - `stroke`, `shotQuality` ← stroke step.
  - `direction`            ← direction step.
  - `intent`               ← intent step.
- Error shots:
  - `stroke`, `intent`, `errorType` ← error‑shot flow.

---

## 4. Mapping Raw Models to the DB Schema

This section shows how `RawRally` and `RawShot` map into the **future DB schema** defined in `DatabaseERD.md` and refined by `Shots_Schema_Spec.md`.

### 4.1 `RawRally` → `RALLIES` Table

Future `RALLIES` (from `DatabaseERD.md`, simplified):

- `id uuid PK`
- `game_id uuid FK`
- `rally_index int`
- `server_id uuid FK`
- `receiver_id uuid FK`
- `is_scoring bool`
- `winner_id uuid FK`
- `player1_score_after int`
- `player2_score_after int`
- `end_of_point_time numeric`
- `point_end_type enum`
- `luck_type enum`
- `has_video_data bool`
- `is_highlight bool`
- `framework_confirmed bool`
- `detail_complete bool`

**Field mapping**

- Identity:
  - `id`               ← `RawRally.rallyId` (persisted as UUID).
  - `game_id`          ← `RawRally.gameId`.
  - `rally_index`      ← sequence number within game (assigned when saving).
- Server / receiver:
  - `server_id`        ← `RawRally.serverId`.
  - `receiver_id`      ← `RawRally.receiverId = otherPlayer(serverId)`.
- Outcome and time:
  - `end_of_point_time`← `RawRally.endTimestamp`.
  - `is_scoring`       ← `true` for all Prototype V2 rallies (future: support non‑scoring).
  - `winner_id`        ← derived using:
    - `RawRally.endCondition`.
    - Hitter of the last shot (`RawShot.playerId` for `isLastShot`).
  - `point_end_type`   ← derived using future rally‑end classification:
    - `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`.
- Score:
  - `player1_score_after`, `player2_score_after`:
    - Derived from sequential application of `calculateScoreAfterRally`.
- Flags:
  - `has_video_data`   ← `true` (all these rallies are from tagged video).
  - `framework_confirmed`:
    - `true` once Phase 1 is complete for this rally.
  - `detail_complete`:
    - `true` once Phase 2 tagging is complete for all shots in this rally.

### 4.2 `RawShot` → Canonical `shots` Table

Canonical logical `shots` table from `Shots_Schema_Spec.md`:

- Identity:
  - `id uuid PK`
  - `rally_id uuid FK`
  - `time numeric`
  - `shot_index int`
  - `player_id uuid FK`
- Serve‑only:
  - `serve_type text / enum`
  - `serve_spin_family 'under' | 'top' | 'no_spin' | 'side'`
  - `serve_length 'short' | 'half_long' | 'long'`
- Direct tagging:
  - `wing 'FH' | 'BH'`
  - `intent 'defensive' | 'neutral' | 'aggressive'`
- Derived from gestures:
  - `landing_zone 'to_bh' | 'to_mid' | 'to_fh' | NULL`
  - `shot_result 'good' | 'average' | 'in_net' | 'missed_long'`
  - `pressure_level 'low' | 'medium' | 'high'`
- Per‑shot inference:
  - `intent_quality 'correct' | 'over_aggressive' | 'over_passive' | 'misread'`
  - `is_rally_end boolean`
  - `rally_end_role 'winner' | 'forced_error' | 'unforced_error' | 'none'`
  - `inferred_shot_type text`
  - `inferred_shot_confidence 'low' | 'medium' | 'high'`
- Workflow:
  - `is_tagged boolean`

**Direct mapping from `RawShot`**

- Identity:
  - `id`          ← `RawShot.shotId`.
  - `rally_id`    ← `RawShot.rallyId`.
  - `time`        ← `RawShot.time`.
  - `shot_index`  ← `RawShot.shotIndex + 1` (DB is 1‑based).
  - `player_id`   ← `RawShot.playerId`.

- Serve‑only:
  - `serve_type`:
    - `NULL` in V2 prototype (field reserved for future serve‑type UI).
  - `serve_spin_family`:
    - Map from `RawShot.serveSpin`:
      - `underspin` → `'under'`.
      - `topspin`   → `'top'`.
      - `nospin`    → `'no_spin'`.
    - `side` will be supported when a more detailed spin UI is added.
  - `serve_length`:
    - Map from `RawShot.serveLength`:
      - `short`   → `'short'`.
      - `halflong`→ `'half_long'`.
      - `deep`    → `'long'`.

- Wing and intent (non‑serve):
  - `wing`:
    - From `RawShot.stroke`:
      - `'backhand'` → `'BH'`.
      - `'forehand'` → `'FH'`.
  - `intent`:
    - From `RawShot.intent`.
  - For serves:
    - `wing` may be `NULL` until the serve UI captures FH/BH explicitly.

- `landing_zone` and `shot_result`:

  - For **non‑error shots**:
    - `shot_result`:
      - `RawShot.shotQuality = 'high'`   → `'good'`.
      - `RawShot.shotQuality = 'average'`→ `'average'`.
    - `landing_zone` (from `direction`):
      - Any `*_left`  → `'to_bh'`.
      - Any `*_mid`   → `'to_mid'`.
      - Any `*_right` → `'to_fh'`.

  - For **error shots** (`RawShot.isError === true`):
    - From `RawShot.endCondition`:
      - `'innet'` → `shot_result = 'in_net'`.
      - `'long'`  → `shot_result = 'missed_long'`.
    - `landing_zone = NULL`.

  - For **serve shots**:
    - When the serve continues the rally:
      - `landing_zone` derived from `serveDirection` as above.
      - `shot_result` may default to `'average'` unless the UI adds serve‑quality semantics.
    - When the serve itself ends the rally:
      - Use the same error mapping as above (net/long) based on `endCondition`.

- `is_rally_end` and `rally_end_role`:

  - `is_rally_end`:
    - `true`  if `RawShot.isLastShot === true`.
    - `false` otherwise.

  - `rally_end_role`:
    - If `!is_rally_end` → `'none'`.
    - If `is_rally_end` and `endCondition = 'winner'`:
      - This shot is the winner → `'winner'`.
    - If `is_rally_end` and `endCondition = 'innet' | 'long'`:
      - Map from `RawShot.errorType`:
        - `'forced'`   → `'forced_error'`.
        - `'unforced'` → `'unforced_error'`.

- Workflow:
  - `is_tagged`:
    - `true` once Phase 2 passes and saves this shot.
    - `false` immediately after Phase 1 only.

**Inference‑only fields**

The following are **not directly set by the V2 prototype UI**, but are derived later by the inference engine using `RawShot`, rally context, match context, and player profiles:

- `pressure_level`:
  - From intent, shot_result, position/direction, score and context.
- `intent_quality`:
  - From `intent`, player’s `PLAYER_PROFILES` and shot context (e.g. serve/receive, spin, length).
- `inferred_shot_type`:
  - From wing, intent, serve vs non‑serve, surface spin, length and situation (e.g. `fh_loop_vs_under`, `bh_flick`, `push`, `chop`, `lob`, `smash`, etc).
- `inferred_shot_confidence`:
  - From how clearly the shot fits a defined pattern.

---

## 5. What the V2 Prototype Enables Us to Infer

Given the data described above, V2 supports:

- **Serve pattern analysis**:
  - From `serve_length`, `serve_spin_family`, `landing_zone`.
  - Per‑opponent and per‑side serve tendencies.
- **Shot family classification**:
  - From `wing`, `intent`, serve/non‑serve, spin and context.
  - Populates `inferred_shot_type` with values like `fh_loop_vs_under`, `bh_flick`, `fh_block`, `push`, `lob`, `smash`, `other`, `unknown`.
- **Decision quality (intent quality)**:
  - From `intent` plus PlayerProfile skills and context:
    - `correct`, `over_aggressive`, `over_passive`, `misread`.
- **Pressure profile**:
  - From `pressure_level` distribution per skill and situation.
- **Rally‑end role breakdown**:
  - `rally_end_role` and `point_end_type` distinguish:
    - Winner shots vs forced errors vs unforced errors vs serve/receive faults.
- **Player skill metrics aggregation**:
  - Using `player_skill_metrics` to:
    - Track per‑skill in‑play %, error %, winner %, and intent correctness.
    - Feed back into `PLAYER_PROFILES` and coaching suggestions.

This mapping ensures the **Tagging UI Prototype V2** can feed a modernised schema that is compatible with the **gestures/intents/inference engine** while using a more traditional but condensed tagging interface.

---

## 6. Proposed V2 `shots` DB Schema (for Review)

This section gives a concrete Postgres/Supabase schema for the **`shots`** table that matches:

- The V2 prototype raw models (`RawShot`).
- The canonical `Shots_Schema_Spec.md`.
- The gestures/intents/inference engine and PlayerProfile/skill metrics design.

### 6.1 Enum Types

```sql
-- Shot intent (directly tagged)
CREATE TYPE shot_intent_enum AS ENUM ('defensive', 'neutral', 'aggressive');

-- Coarse landing channel (receiver perspective)
CREATE TYPE landing_zone_chan_enum AS ENUM ('to_bh', 'to_mid', 'to_fh');

-- Per-shot result / outcome
CREATE TYPE shot_result_enum AS ENUM ('good', 'average', 'in_net', 'missed_long');

-- Contextual pressure level
CREATE TYPE pressure_level_enum AS ENUM ('low', 'medium', 'high');

-- Intent quality vs player profile
CREATE TYPE intent_quality_enum AS ENUM ('correct', 'over_aggressive', 'over_passive', 'misread');

-- Role of this shot in ending the rally
CREATE TYPE rally_end_role_enum AS ENUM ('winner', 'forced_error', 'unforced_error', 'none');

-- Confidence for inferred shot type
CREATE TYPE inferred_confidence_enum AS ENUM ('low', 'medium', 'high');

-- Serve spin family (collapsed)
CREATE TYPE serve_spin_family_enum AS ENUM ('under', 'top', 'no_spin', 'side');

-- Serve length buckets
CREATE TYPE serve_length_enum AS ENUM ('short', 'half_long', 'long');

-- (Optional) Serve type classification (when UI is added)
CREATE TYPE serve_type_enum AS ENUM (
  'pendulum',
  'reverse_pendulum',
  'tomahawk',
  'backhand',
  'hook',
  'lollipop',
  'other'
);
```

### 6.2 `shots` Table

```sql
CREATE TABLE shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  rally_id uuid NOT NULL REFERENCES rallies(id),
  time numeric NOT NULL,            -- seconds into video
  shot_index int NOT NULL,          -- 1-based index in rally (1 = serve)
  player_id uuid NOT NULL REFERENCES players(id),

  -- Serve-only fields (shot_index = 1)
  serve_type serve_type_enum NULL,          -- optional in V2 UI
  serve_spin_family serve_spin_family_enum NULL,
  serve_length serve_length_enum NULL,

  -- Direct tagging inputs (non-serve; serve can be NULL for wing/intent)
  wing text NULL CHECK (wing IN ('FH', 'BH')),
  intent shot_intent_enum NULL,

  -- Derived from direction + end condition
  landing_zone landing_zone_chan_enum NULL, -- 'to_bh' | 'to_mid' | 'to_fh' or NULL for errors
  shot_result shot_result_enum NULL,        -- 'good' | 'average' | 'in_net' | 'missed_long'

  -- Inference fields
  pressure_level pressure_level_enum NULL,
  intent_quality intent_quality_enum NULL,

  is_rally_end boolean NOT NULL DEFAULT false,
  rally_end_role rally_end_role_enum NOT NULL DEFAULT 'none',

  inferred_shot_type text NULL,
  inferred_shot_confidence inferred_confidence_enum NULL,

  -- Workflow
  is_tagged boolean NOT NULL DEFAULT false,

  -- Basic integrity: one row per (rally,shot_index)
  CONSTRAINT shots_rally_index_unique UNIQUE (rally_id, shot_index)
);
```

### 6.3 Suggested Indexes

```sql
CREATE INDEX idx_shots_rally
  ON shots (rally_id, shot_index);

CREATE INDEX idx_shots_player
  ON shots (player_id);

CREATE INDEX idx_shots_result
  ON shots (shot_result);

CREATE INDEX idx_shots_inferred_type
  ON shots (inferred_shot_type);
```

This schema is intended to **replace/modernise** the `SHOTS` table sketch in `DatabaseERD.md` for the V2 tagging engine, while remaining compatible with the existing match/game/rally structure and future Supabase migration.


