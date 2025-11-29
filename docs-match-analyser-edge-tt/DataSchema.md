# Data Schema

This document defines the **implementation-oriented schema** for the Tagger MVP, consistent with `Tagger 2-Step User Flow & Data Schema (Revised)` and the MVP spec.

Enums are stored as TEXT in the database, but must use the specified allowed values.

---

## 1. Players

**Table: Players**

- `id` (TEXT, UUID, PK)
- `name` (TEXT)
- `createdAt` (DATETIME)

---

## 2. Matches

**Table: Matches**

- `id` (TEXT, UUID, PK)
- `player1Id` (TEXT, FK → Players.id)
- `player2Id` (TEXT, FK → Players.id)
- `firstServerId` (TEXT, FK → Players.id)
- `gameStructure` (TEXT) – e.g. "to11_bestOf5"
- `serviceRule` (TEXT) – e.g. "2_each_to_10_then_alternate"
- `videoSource` (TEXT) – path or URL to video
- `serveExtraFor` (TEXT enum: `none`, `player1`, `player2`, `both`)
- `receiveExtraFor` (TEXT enum: `none`, `player1`, `player2`, `both`)
- `thirdBallExtraFor` (TEXT enum: `none`, `player1`, `player2`, `both`)
- `unforcedErrorExtraFor` (TEXT enum: `none`, `player1`, `player2`, `both`)

---

## 3. Rallies

**Table: Rallies**

- `id` (TEXT, UUID, PK)
- `matchId` (TEXT, FK → Matches.id)
- `index` (INTEGER) – order of rally in the match
- `isScoring` (BOOL)
- `winnerId` (TEXT, FK → Players.id, nullable when `isScoring = 0`)
- `serverId` (TEXT, FK → Players.id)
- `receiverId` (TEXT, FK → Players.id)
- `startContactId` (TEXT, FK → Contacts.id)
- `endContactId` (TEXT, FK → Contacts.id)
- `pointEndType` (TEXT enum: `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`, `other`)
- `luckType` (TEXT enum: `none`, `luckyNet`, `luckyEdgeTable`, `luckyEdgeBat`)
- `opponentLuckOvercome` (BOOL)

---

## 4. Contacts

**Table: Contacts**

- `id` (TEXT, UUID, PK)
- `rallyId` (TEXT, FK → Rallies.id)
- `time` (REAL) – seconds into video
- `shotIndex` (INTEGER, 1-based index within rally)

---

## 5. Shots

**Table: Shots**

Each row corresponds to one contact’s detailed annotation.

- `id` (TEXT, UUID, PK)
- `contactId` (TEXT, FK → Contacts.id)
- `playerId` (TEXT, FK → Players.id)
- `isServe` (BOOL)
- `isReturnOfServe` (BOOL)

### 5.1 General Shot Fields

- `wing` (TEXT enum: `FH`, `BH`)

- `positionSector` (TEXT enum):
  - `closeLeft`, `closeMid`, `closeRight`,
  - `midLeft`,   `midMid`,   `midRight`,
  - `farLeft`,   `farMid`,   `farRight`

- `shotType` (TEXT enum, nullable for serves):
  - `shortTouch`, `push`, `dig`, `chop`, `block`, `chopBlock`,
  - `lob`, `drive`, `loop`, `powerLoop`, `smash`, `flick`, `banana`, `other`

- `landingType` (TEXT enum):
  - `inPlay`
  - `net`
  - `offLong`
  - `wide`

- `landingZone` (TEXT enum, nullable; only valid when `landingType = inPlay`):
  - `BHShort`, `MidShort`, `FHShort`,
  - `BHMid`,   `MidMid`,   `FHMid`,
  - `BHLong`,  `MidLong`,  `FHLong`

- `shotQuality` (TEXT enum: `good`, `average`, `weak`)

---

### 5.2 Serve Fields

Only meaningful when `isServe = 1`.

- `serveType` (TEXT enum):
  - `pendulum`
  - `reversePendulum`
  - `tomahawk`
  - `backhand`
  - `hook`
  - `shovel`
  - `other`

- `serveSpinPrimary` (TEXT enum):
  - `under`
  - `top`
  - `sideLeft`
  - `sideRight`
  - `none`

- `serveSpinStrength` (TEXT enum):
  - `low`
  - `medium`
  - `heavy`

- `isFault` (BOOL)

- `faultType` (TEXT enum, nullable; only meaningful when `isFault = 1`):
  - `net`
  - `long`
  - `wide`
  - `other`

- `serveIssueCause` (TEXT enum, nullable; only set when serve is weak and extra questions are enabled):
  - `technicalExecution`
  - `badDecision`
  - `tooHigh`
  - `tooLong`
  - `notEnoughSpin`
  - `easyToRead`

---

### 5.3 Return-of-Serve Fields

Only meaningful when `isReturnOfServe = 1`.

- `receiveIssueCause` (TEXT enum, nullable; only set when RoS is “bad/weak” per Q4/Q5 logic and extra questions are enabled):
  - `misreadSpinType`
  - `misreadSpinAmount`
  - `technicalExecution`
  - `badDecision`

---

### 5.4 Third-Ball Fields

Third ball is defined as `shotIndex = 3` in the rally.

- `thirdBallIssueCause` (TEXT enum, nullable; only set when shotQuality = `weak` and third-ball extras enabled for that player):
  - `incorrectPreparation`
  - `unexpectedReturn`
  - `technicalExecution`
  - `badDecision`
  - `tooAggressive`
  - `tooPassive`

---

### 5.5 Unforced-Error Fields

Used when the rally’s `pointEndType = unforcedError` and extra questions are enabled for that player.

- `unforcedErrorCause` (TEXT enum, nullable):
  - `technicalExecution`
  - `badDecision`
  - `tooAggressive`
  - `tooPassive`

---

## 6. Consistency Notes

- All enum values here must match exactly those referenced in:
  - `Tagger 2-Step User Flow & Data Schema (Revised)`
  - `MVP Specification & Architecture`
- Business logic (when to populate which fields) is defined in the User Flow document; this schema simply provides the storage model.
