# Tagger 2-Step User Flow & Data Schema (Revised)

This is the **clean, rewritten, up-to-date specification** for the 2-step tagging workflow. It is the functional and data reference for the Tagger engine.

---

## 0. Overview

The **Tagger 2-Step Workflow** is a high-efficiency method for capturing rich table-tennis match data from video.

It operates in two distinct passes:

- **Step 1 – Real-time tagging:**  
  User taps once per ball contact and marks each rally end as scoring or non-scoring, then selects the rally winner for scoring rallies.

- **Step 2 – Shot-by-shot detail:**  
  The system replays each contact in order and the user inputs structured shot data (Q1–Q5, plus conditional extras) with no time pressure.

The workflow is optimised for:

- Speed and low cognitive load during live tagging.
- Precision and consistency during post-hoc shot classification.
- Deep tactical and technical analysis of serve, receive, and rally patterns.

---

## 1. Step 1 – Real-Time Contacts & Rally Outcomes

### 1.1 Purpose

In Step 1, the user records:

1. **Every ball contact**  
2. **Rally end** (scoring or non-scoring)  
3. **Rally winner** (for scoring rallies)

From this, the system constructs:

- A complete list of contact timestamps.
- Rally boundaries.
- Scoring vs non-scoring rallies.
- Full score progression.
- Server/receiver per rally (via service rules).

### 1.2 Step 1 Controls

Controls visible below the video:

- **CONTACT**  
  - Primary tap. One tap per ball–racket contact.
  - Creates a new `Contact` with `time = currentVideoTime`.

- **RALLY END – SCORE**  
  - Ends the current rally as *scoring*.
  - Immediately opens a Winner dialog.

- **RALLY END – NO SCORE**  
  - Ends the current rally as *non-scoring* (let / interruption / replay).
  - No point or score change.

- **UNDO LAST CONTACT**  
  - Removes the most recently created Contact.

### 1.3 Winner Dialog

When **RALLY END – SCORE** is pressed:

- Dialog: **“Who won the point?”**
  - Buttons: `Player 1` / `Player 2`.

Once selected:

- System creates/updates `Rally`:
  - `isScoring = true`
  - `winnerId = P1 or P2`
  - `contactIds` for that rally segment.
- Score and service progression can be derived later.

### 1.4 Non-Scoring Rallies

When **RALLY END – NO SCORE** is pressed:

- System creates a `Rally`:
  - `isScoring = false`
  - `winnerId = null`
- Score/state unchanged.
- **Non-scoring rallies are skipped in Step 2** (contacts are recorded for timeline visualization, but no shot annotation is required).

### 1.5 Service Order Reconstruction

Using:

- `firstServerId` (from match configuration – **editable**; changing it recalculates all assignments),
- `serviceRule` (e.g. 2 serves each until 10–10, then alternate),
- Ordered list of **scoring** rallies and their winners,

the system determines for each rally:

- `serverId`
- `receiverId`
- Score at rally start (`player1ScoreAfter`, `player2ScoreAfter` stored on each rally).

**Deuce handling:** At 10-10 (or higher with both scores equal), service alternates every point automatically.

Step 2 does **not** ask about score or server.

### 1.6 Game Boundary Detection

Game boundaries are detected using a **hybrid approach**:

1. **System suggests** game end when a player reaches the target score (e.g., 11) with at least a 2-point lead.
2. **User confirms or overrides** – necessary because real-world scoring errors happen.

Each game is stored in the `games` table with:
- `gameNumber` (1, 2, 3...)
- `player1FinalScore`, `player2FinalScore`
- `hasVideo` (bool) – whether this game has video coverage
- `videoStartPlayer1Score`, `videoStartPlayer2Score` – for partial video (video starts mid-game)

### 1.7 Partial Video Coverage

Video may not cover the entire match. The system handles:

- **Games without video**: Set `hasVideo = FALSE` on the game; enter scores only.
- **Video starts mid-game**: Set `videoStartPlayer1Score`, `videoStartPlayer2Score` to the score when tagging began.
- **Rallies without video**: Set `hasVideoData = FALSE` on the rally; only `winnerId` is recorded (no contacts/shots).

**Single video requirement:** Users must combine multiple video files into a single file before importing.

---

## 2. Step 2 – Shot-by-Shot Detail Entry

### 2.1 Purpose

For every contact in every scoring rally, Step 2:

- Auto-seeks to `(contactTime - leadIn)` (e.g. 0.25–0.5 seconds).
- Plays to the contact.
- Pauses on/near the exact contact frame.
- Prompts the user to enter structured shot details.

Step 2 captures:

- Player & wing.
- Position sector at contact.
- Shot type (or serve type).
- Landing zone / net / off / wide.
- Subjective shot quality (good / average / weak).
- Serve-specific data.
- Return-of-serve issue cause (when bad).
- Third-ball issue cause (optional).
- Unforced-error issue cause (optional).
- End-of-rally classification.

### 2.2 Shot Iteration Flow

For each rally and each contact:

1. Seek → play → pause around the contact.
2. Show **Shot Detail Panel**.
3. User answers Q1–Q5.
4. If serve / RoS / 3rd ball / final shot, show extra questions when conditions are met.
5. Move to next contact.

Step 2 provides navigation to revisit and correct previous shots.

---

## 3. Per-Shot Questions (Q1–Q5)

These apply to **all shots** except where explicitly replaced (serve replaces Q3 with serve type).

### Q1 – Player & Wing

- **Player**:
  - `Player 1` or `Player 2`
  - Preselected based on rally alternating logic but always editable.
  - For the **serve** (shot #1 of rally), player is implicit (the server), so only wing is chosen.

- **Wing**:
  - `FH` (Forehand)
  - `BH` (Backhand)

### Q2 – Position Sector (9-cell grid)

The hitter's approximate position at contact, as a 3×3 grid:

- Horizontal: `Left`, `Middle`, `Right` (from hitter's perspective).
- Distance: `Close`, `Mid`, `Far`.

Grid:

- CloseLeft, CloseMid, CloseRight  
- MidLeft,   MidMid,   MidRight  
- FarLeft,   FarMid,   FarRight

> **Serve note:** For serves, all 9 sectors are available but **close sectors should be visually emphasized** in the UI (most serves are hit from close to the table).  

### Q3 – Shot Type (defensive → offensive)

A **fixed** palette of shot types (non-serve contacts), ordered from most defensive to most aggressive:

**Defensive:**
- `lob` – high arcing ball, typically from far distance
- `chop` – heavy backspin, mid/far distance
- `chopBlock` – backspin/sidespin block from close
- `dropShot` – soft placement with light backspin
- `shortTouch` – minimal spin, close to table
- `push` – backspin stroke, close to table

**Neutral:**
- `block` – controlled return with light topspin
- `drive` – medium topspin, mid distance
- `flick` – quick topspin/sidespin from close
- `slowSpinLoop` – heavy topspin loop with less speed

**Aggressive:**
- `loop` – topspin attack, close/mid distance
- `fastLoop` – fast topspin with medium-heavy spin
- `smash` – flat power shot, close distance

**Fallback:**
- `other` – any shot not covered above

Rules:

- Layout is stable (no reordering).
- Shot types are **filtered by distance** based on Q2 (Position Sector):
  - **Close** (closeLeft/Mid/Right): `chopBlock`, `dropShot`, `shortTouch`, `push`, `block`, `flick`, `loop`, `fastLoop`, `smash`, `other`
  - **Mid** (midLeft/Mid/Right): `chop`, `drive`, `slowSpinLoop`, `loop`, `fastLoop`, `other`
  - **Far** (farLeft/Mid/Right): `lob`, `chop`, `other`
- Invalid shot types for the selected distance should be greyed out or hidden.
- **Spin is inferred** from shot type automatically (not entered manually):
  - `heavyTopspin`: loops (`slowSpinLoop`, `loop`, `fastLoop`)
  - `topspin`: `lob`, `block`, `drive`, `flick`
  - `noSpin`: `dropShot`, `shortTouch`, `smash`, `other`
  - `backspin`: `push`, `chopBlock`
  - `heavyBackspin`: `chop`

> **Serve exception:** For the first shot in a rally (`isServe = true`), Q3 is replaced by **Serve Type** (see Section 4).

### Q4 – Landing / End Point

Where the ball landed (or error occurred) on the opponent's side:

- **In-play landing**: one of 9 zones:
  - Horizontal: opponent `BH`, `Middle`, `FH`
  - Depth: `Short`, `Mid`, `Long`

- **Error endpoints** (overriding landing zone):
  - `NET`
  - `OFF/LONG`
  - `WIDE`

If Q4 selects NET/OFF/WIDE, the shot is recorded as an error by the hitter.

> **Perspective note:** Landing zones are **always from the opponent's perspective** (i.e., the receiver for serves, the next player for rallies). This applies universally to all shots including serves.

### Q5 – Shot Quality

Subjective assessment for every shot:

- `good`
- `average`
- `weak`

This field is used both generally and as part of RoS/third-ball logic.

---

## 4. Serve (Shot #1)

Serve deviates slightly from the generic shot flow. The system already knows **which player is serving**, so the user does not select the player in Q1 for the serve shot.

### 4.1 Serve Questions

For the first contact in a rally (the serve), the user answers:

1. **Wing (FH/BH)** – Q1 wing only (player is implicit).
2. **Position Sector** – Q2 (server’s position).
3. **Serve Type** (replaces Q3):
   - `pendulum`
   - `reversePendulum`
   - `tomahawk`
   - `backhand`
   - `hook`
   - `shovel`
   - `other`
4. **Landing / End Point** – Q4:
   - 3×3 landing grid or `NET` / `OFF/LONG` / `WIDE`.
5. **Spin Profile**:
   - `serveSpinPrimary`:
     - `under`
     - `top`
     - `sideLeft`
     - `sideRight`
     - `none`
   - `serveSpinStrength`:
     - `low`
     - `medium`
     - `heavy`
6. **Serve Quality** – Q5 (good/average/weak).

### 4.2 Serve Weakness Cause (Conditional)

If:

- Q5 = `weak`, **and**
- Extended serve diagnostics are enabled for this player,

then ask:

> **“Why was this serve bad/weak?”** (primary cause)

Options (stored as `serveIssueCause`):

- `technicalExecution` – technique/footwork/timing/racket issues.
- `badDecision` – poor tactical choice (type/placement/risk).
- `tooHigh` – serve bounces too high.
- `tooLong` – serve too long / easy to attack.
- `notEnoughSpin` – insufficient spin.
- `easyToRead` – no disguise; opponent can read it easily.

### 4.3 Service Faults

If a rally ends as a **service fault** (serve is the only contact, rally is scoring):

- `isFault = true`
- `faultType`:
  - `net`
  - `long`
  - `wide`
  - `other` (toss, illegal serve, whiff, etc.)

---

## 5. Return of Serve (Shot #2)

The Return of Serve (RoS) uses the standard Q1–Q5 plus a conditional “why bad receive?” question.

### 5.1 RoS Base Data

For the RoS shot (second contact in the rally), Q1–Q5 produce:

- `playerId`, `wing`
- `positionSector`
- `shotType`
- `landingType` / `landingZone`
- `shotQuality` (good/average/weak)

### 5.2 RoS Badness Logic

We **infer** whether the RoS is bad from Q4 and Q5:

A RoS is considered “bad/weak” if:

1. **Q4 is an error endpoint:**
   - `NET`, `OFF/LONG`, or `WIDE`  
   → immediate receive error.

**OR**

2. **Q4 is a valid landing zone AND Q5 = `weak`:**
   - Receive stayed in play but was subjectively weak/vulnerable.

If neither condition is true, no extra RoS question is asked.

### 5.3 RoS Cause Question

When RoS is “bad” per above logic, and RoS extra questions are enabled for this player, ask:

> **“Why was this receive bad/weak?”**

Options (stored as `receiveIssueCause`):

- `misreadSpinType` – wrong type (e.g. misjudged under/top/side).
- `misreadSpinAmount` – right type, but wrong amount of spin.
- `technicalExecution` – poor execution/footwork/timing.
- `badDecision` – poor tactical choice (e.g. flick when short touch was safer).

---

## 6. Third-Ball Weakness (Optional)

The **third ball** is the first shot after serve and receive, i.e. `shotIndex = 3`.

If all of the following are true:

- Third-ball extra questions are enabled for the player, and
- This shot is `shotIndex = 3`, and
- Q5 (`shotQuality`) = `weak`,

then ask:

> **“Why was the third ball weak?”**

Options (stored as `thirdBallIssueCause`):

- `incorrectPreparation` – earlier setup (serve/receive/footwork) wasn’t good.
- `unexpectedReturn` – return was surprising; player wasn’t ready.
- `technicalExecution` – technical error on the third ball.
- `badDecision` – bad tactical choice.
- `tooAggressive` – over-pressed the attack.
- `tooPassive` – didn’t attack strongly enough.

---

## 7. End-of-Rally Classification

At the end of each scoring rally, Step 1 has already recorded:

- `winnerId`.

Step 2, after the final shot is tagged, asks:

> **“How did Player X win this point?”**

### 7.1 Fields

We record:

- `pointEndType`:
  - `winnerShot`
  - `forcedError`
  - `unforcedError`
  - `serviceFault`
  - `receiveError`
  - `other`

- `luckType`:
  - `none`
  - `luckyNet`
  - `luckyEdgeTable`
  - `luckyEdgeBat` (mishit/edge-of-bat)

- `opponentLuckOvercome` (bool, optional):
  - True if the winner overcame an earlier lucky net/edge by opponent.

### 7.2 Unforced-Error Cause (Optional)

If:

- `pointEndType = unforcedError`, and
- Unforced-error extra questions are enabled for the player who committed the error,

then ask:

> **“Why unforced error?”**

Options (stored as `unforcedErrorCause`):

- `technicalExecution`
- `badDecision`
- `tooAggressive`
- `tooPassive`

---

## 8. Data Schema (Conceptual)

This section defines the conceptual data model. Implementation uses Postgres (Supabase) with local IndexedDB (Dexie.js) for offline-first support.

### 8.1 Match

- `matchId`
- `player1Id`, `player2Id`
- `firstServerId` – editable; changing recalculates all server assignments
- `gameStructure` (string/enum)
- `serviceRule` (string/enum)
- `matchDate` (date) – date when the match was played
- `videoSource` (path/URL) – single video file per match
- `hasVideo` (bool) – flag indicating if video is available
- `step1Complete` (bool) – TRUE when Step 1 tagging is finished
- `step2Complete` (bool) – TRUE when Step 2 tagging is finished
- `extraQuestionScope`:
  - `serveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `receiveExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `thirdBallExtraFor` ∈ {`none`, `player1`, `player2`, `both`}
  - `unforcedErrorExtraFor` ∈ {`none`, `player1`, `player2`, `both`}

### 8.2 Game

- `gameId`
- `matchId`
- `gameNumber` (1, 2, 3...)
- `player1FinalScore`, `player2FinalScore` – actual final score
- `winnerId`
- `hasVideo` (bool) – FALSE if this game was not filmed
- `videoStartPlayer1Score`, `videoStartPlayer2Score` – score when video/tagging began (for mid-game starts)

### 8.3 Rally

- `rallyId`
- `matchId`, `gameId`
- `rallyIndex` – 1-based within game
- `isScoring` (bool)
- `winnerId` (nullable if non-scoring)
- `player1ScoreAfter`, `player2ScoreAfter` – score after this rally
- `serverId`, `receiverId`
- `hasVideoData` (bool) – FALSE for score-only rallies (no contacts/shots)
- `startContactId`, `endContactId`
- `pointEndType`
- `luckType`
- `opponentLuckOvercome` (bool)
- `serverCorrected` (bool) – flag if server was manually corrected due to error
- `scoreCorrected` (bool) – flag if score was manually corrected due to error
- `correctionNotes` (text, optional) – notes about corrections made

### 8.4 Contact

- `contactId`
- `rallyId`
- `time` (seconds into video)
- `shotIndex` (1-based index within rally)

### 8.5 Shot

General shot fields:

- `shotId`
- `contactId`
- `playerId`
- `isServe` (bool)
- `isReturnOfServe` (bool)
- `wing` – enum: {`FH`, `BH`}
- `positionSector` – enum:
  - `closeLeft`, `closeMid`, `closeRight`,
  - `midLeft`, `midMid`, `midRight`,
  - `farLeft`, `farMid`, `farRight`
- `shotType` – enum (NULL for serves; **required for all other shots**), ordered defensive → aggressive:
  - Defensive: `lob`, `chop`, `chopBlock`, `dropShot`, `shortTouch`, `push`
  - Neutral: `block`, `drive`, `flick`, `slowSpinLoop`
  - Aggressive: `loop`, `fastLoop`, `smash`
  - Fallback: `other`
- `inferredSpin` – enum (derived from `shotType`, not entered manually):
  - `heavyTopspin`, `topspin`, `noSpin`, `backspin`, `heavyBackspin`
- `landingType` – enum:
  - `inPlay`
  - `net`
  - `offLong`
  - `wide`
- `landingZone` – enum (nullable; only when `landingType = inPlay`):
  - `BHShort`, `MidShort`, `FHShort`,
  - `BHMid`,   `MidMid`,   `FHMid`,
  - `BHLong`,  `MidLong`,  `FHLong`
- `shotQuality` – enum:
  - `good`, `average`, `weak`

#### Serve Fields

Only populated when `isServe = true`.

- `serveType` – enum:
  - `pendulum`
  - `reversePendulum`
  - `tomahawk`
  - `backhand`
  - `hook`
  - `shovel`
  - `other`

- `serveSpinPrimary` – enum:
  - `under`
  - `top`
  - `sideLeft`
  - `sideRight`
  - `none`

- `serveSpinStrength` – enum:
  - `low`
  - `medium`
  - `heavy`

- `isFault` – bool (when TRUE, `shotQuality` is always `weak`)

- `faultType` – enum (nullable, only meaningful when `isFault = true`):
  - `net`
  - `long`
  - `wide`
  - `other`

- `serveIssueCause` – enum (nullable; only when serve is weak **and** extra questions enabled):
  - `technicalExecution`
  - `badDecision`
  - `tooHigh`
  - `tooLong`
  - `notEnoughSpin`
  - `easyToRead`


#### RoS Fields

Only populated when `isReturnOfServe = true`.

- `receiveIssueCause` – enum (nullable; only when RoS is bad/weak per logic and extra questions enabled):
  - `misreadSpinType`
  - `misreadSpinAmount`
  - `technicalExecution`
  - `badDecision`


#### Third-Ball Fields

Only populated when `shotIndex = 3`, `shotQuality = weak`, and third-ball extra questions are enabled for that player.

- `thirdBallIssueCause` – enum (nullable):
  - `incorrectPreparation`
  - `unexpectedReturn`
  - `technicalExecution`
  - `badDecision`
  - `tooAggressive`
  - `tooPassive`


#### Unforced-Error Fields

Only populated when `pointEndType = unforcedError` and unforced-error extra questions are enabled for that player.

- `unforcedErrorCause` – enum (nullable):
  - `technicalExecution`
  - `badDecision`
  - `tooAggressive`
  - `tooPassive`

---

## 9. Validation Rules

The following rules are enforced:

| Rule | Description |
|------|-------------|
| Min 1 contact per rally | Every rally (with `hasVideoData = TRUE`) must have at least 1 contact (the serve) |
| shotType required | For non-serve shots (`isServe = FALSE`), `shotType` must not be NULL |
| Fault = weak | If `isFault = TRUE`, then `shotQuality` must be `weak` |
| Non-scoring skipped | Rallies with `isScoring = FALSE` are not annotated in Step 2 |

---

## 10. UX Summary

- **Step 1**: ultra-light real-time tagging: tap contacts → mark rally ends → pick rally winners.
- **Step 2**: controlled and guided shot-by-shot tagging: one shot at a time, stable Q1–Q5, with conditional extras where they add the most value.
- Extra diagnostics can target Player 1, Player 2, both, or neither, depending on coaching context.
- **Partial video**: games/rallies without video are entered as scores only.

The result is a **deep, accurate dataset** suitable for advanced analysis of serve, receive, rally structure, shot quality, and player strengths/weaknesses.
