# Data Schema – Consolidated MVP + Future Extensions

This document is the **single source of truth** for the TT Rally Tagger data model. It consolidates and supersedes:
- `MVP_DataSchema.md`
- `MVP_schemav2.md`
- `MVP_AIfutureproofingSchema.md`

All definitions are consistent with the authoritative specs:
- `Tagger2StepUserFlow.md`
- `MVP_Spec_and_Architecture.md`

---

## Overview

The schema supports:
1. **Step 1** – Real-time shot & rally tagging
2. **Step 2** – Shot-by-shot detail entry
3. **Stats & Analytics** – Post-match analysis

Tables are designed for **Postgres + Supabase** with `gen_random_uuid()` for IDs. Enums are stored as TEXT with CHECK constraints.

---

## 1. Players

Represents an individual table tennis player.

### 1.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core identity
    name TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Extended Fields (Post-MVP)

```sql
-- Extended player profile (add via migration)
ALTER TABLE players ADD COLUMN IF NOT EXISTS firstName TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS surname TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS club TEXT;

ALTER TABLE players ADD COLUMN IF NOT EXISTS handedness TEXT 
    CHECK (handedness IN ('right', 'left')) DEFAULT 'right';

ALTER TABLE players ADD COLUMN IF NOT EXISTS playStyle TEXT 
    CHECK (playStyle IN ('attacker', 'allround', 'defender')) DEFAULT 'allround';

-- Equipment flags (supports mixed rubber setups)
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentInverted BOOLEAN DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentLongPips BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentShortPips BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipmentAntiSpin BOOLEAN DEFAULT FALSE;

-- Rating for matchmaking/seeding (1 = Beginner, 10 = Professional)
ALTER TABLE players ADD COLUMN IF NOT EXISTS rating SMALLINT 
    CHECK (rating >= 1 AND rating <= 10) DEFAULT 5;
```

### 1.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_players_name ON players (name);
CREATE INDEX IF NOT EXISTS idx_players_surname_first ON players (surname, firstName);
CREATE INDEX IF NOT EXISTS idx_players_club ON players (club);
```

---

## 2. Matches

Represents a single match between two players.

### 2.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Players
    player1Id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    player2Id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    firstServerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Match structure
    gameStructure TEXT NOT NULL DEFAULT 'to11_bestOf5',
        -- Examples: 'to11_bestOf5', 'to11_bestOf7', 'to21_bestOf3'
    serviceRule TEXT NOT NULL DEFAULT '2_each_to_10_then_alternate',
    
    -- Match date
    matchDate DATE,  -- Date when the match was played
    
    -- Video source (nullable - matches may not have video)
    videoSource TEXT,  -- Local file path or URL (NULL if no video available)
    hasVideo BOOLEAN DEFAULT FALSE,  -- Flag indicating if video is available for this match
    
    -- Extra question scopes (per-match configuration)
    serveExtraFor TEXT CHECK (serveExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    receiveExtraFor TEXT CHECK (receiveExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    thirdBallExtraFor TEXT CHECK (thirdBallExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    unforcedErrorExtraFor TEXT CHECK (unforcedErrorExtraFor IN ('none', 'player1', 'player2', 'both')) 
        DEFAULT 'none',
    
    -- Workflow state
    step1Complete BOOLEAN DEFAULT FALSE,  -- TRUE when Step 1 tagging is finished
    step2Complete BOOLEAN DEFAULT FALSE,  -- TRUE when Step 2 tagging is finished
    
    -- Video start context (for partial/truncated videos) [v0.8.0]
    videoStartSetScore TEXT DEFAULT '0-0',      -- Set score when video started
    videoStartPointsScore TEXT DEFAULT '0-0',   -- Points score when video started
    firstServeTimestamp NUMERIC,                -- Seconds into video of first serve
    videoCoverage TEXT CHECK (videoCoverage IN ('full', 'truncatedStart', 'truncatedEnd', 'truncatedBoth')) 
        DEFAULT 'full',
    
    -- Match completion details [v0.8.0]
    matchResult TEXT CHECK (matchResult IN ('player1', 'player2', 'incomplete')),
    finalSetScore TEXT,                         -- e.g. "3-2"
    finalPointsScore TEXT,                      -- e.g. "11-9" (last set)
    
    -- Tagging mode preference [v0.8.0]
    taggingMode TEXT CHECK (taggingMode IN ('essential', 'full')) DEFAULT 'full',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Extended Fields (Post-MVP)

```sql
-- Extended match metadata (add via migration)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS matchContext TEXT 
    CHECK (matchContext IN ('friendly', 'minorTournament', 'tournament', 'nationalTournament')) 
    DEFAULT 'friendly';

ALTER TABLE matches ADD COLUMN IF NOT EXISTS bestOf INTEGER DEFAULT 5;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS player1Score INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS player2Score INTEGER DEFAULT 0;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

-- Note: matchDate should be set during match creation or import
-- If not provided, it can default to created_at date, but should be editable
```

### 2.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches (player1Id, player2Id);
CREATE INDEX IF NOT EXISTS idx_matches_context_created ON matches (matchContext, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches (matchDate DESC);
CREATE INDEX IF NOT EXISTS idx_matches_has_video ON matches (hasVideo);
```

---

## 3. Games

Represents a single game within a match (e.g., Set 1, Set 2, etc. in a best-of-5).

### 3.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    -- Set position in match
    setNumber SMALLINT NOT NULL,  -- 1-based (Set 1, 2, 3...)
    
    -- Final scores (always required)
    player1FinalScore SMALLINT NOT NULL,  -- e.g., 11
    player2FinalScore SMALLINT NOT NULL,  -- e.g., 9
    
    -- Winner (derived from scores, but stored for convenience)
    winnerId UUID REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Video coverage
    hasVideo BOOLEAN DEFAULT TRUE,  -- FALSE if this game was not filmed
    
    -- For partial video coverage (video starts mid-game)
    videoStartPlayer1Score SMALLINT DEFAULT 0,  -- Score when video/tagging began
    videoStartPlayer2Score SMALLINT DEFAULT 0,  -- Score when video/tagging began
    
    -- End of set marker [v0.8.0]
    endOfSetTimestamp NUMERIC,                  -- Video timestamp marking end of set
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(matchId, setNumber)
);
```

### 3.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_games_match ON sets (matchId);
CREATE INDEX IF NOT EXISTS idx_games_match_number ON sets (matchId, setNumber);
CREATE INDEX IF NOT EXISTS idx_games_winner ON sets (winnerId);
```

---

## 4. Rallies

Represents a single rally (point attempt) within a game.

### 4.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS rallies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    setId UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    
    -- Rally position
    rallyIndex INTEGER NOT NULL,  -- 1-based order within game
    
    -- Scoring
    isScoring BOOLEAN NOT NULL DEFAULT TRUE,
    winnerId UUID REFERENCES players(id) ON DELETE RESTRICT,
        -- NULL when isScoring = FALSE
    
    -- Score after this rally (stored for convenience, derived from rally winners)
    player1ScoreAfter SMALLINT NOT NULL DEFAULT 0,
    player2ScoreAfter SMALLINT NOT NULL DEFAULT 0,
    
    -- Server/Receiver (derived from firstServerId + serviceRule + score)
    serverId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    receiverId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Video coverage (for partial video scenarios)
    hasVideoData BOOLEAN DEFAULT TRUE,  -- FALSE if this rally is score-only (no shots/shots)
    
    -- Error correction flags (for unintentional errors during tagging)
    serverCorrected BOOLEAN DEFAULT FALSE,  -- TRUE if server was manually corrected
    scoreCorrected BOOLEAN DEFAULT FALSE,   -- TRUE if score was manually corrected
    correctionNotes TEXT,  -- Optional notes about corrections made
    
    -- Shot boundaries (FK to first and last shot of rally)
    startContactId UUID,  -- FK added after shots table created
    endContactId UUID,    -- FK added after shots table created
    
    -- End-of-rally classification
    pointEndType TEXT CHECK (pointEndType IN (
        'winnerShot', 'forcedError', 'unforcedError', 
        'serviceFault', 'receiveError', 'other'
    )),
    
    luckType TEXT CHECK (luckType IN (
        'none', 'luckyNet', 'luckyEdgeTable', 'luckyEdgeBat'
    )) DEFAULT 'none',
    
    opponentLuckOvercome BOOLEAN DEFAULT FALSE,
        -- TRUE if winner overcame earlier lucky net/edge by opponent
    
    -- [v0.8.0] Highlight flag for v2 compilation features
    isHighlight BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Extended Fields (Post-MVP)

```sql
-- Timestamps for rally duration analysis
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE rallies ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
```

### 4.3 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_rallies_match ON rallies (matchId);
CREATE INDEX IF NOT EXISTS idx_rallies_game ON rallies (setId);
CREATE INDEX IF NOT EXISTS idx_rallies_game_index ON rallies (setId, rallyIndex);
CREATE INDEX IF NOT EXISTS idx_rallies_server_match ON rallies (serverId, matchId);
CREATE INDEX IF NOT EXISTS idx_rallies_winner ON rallies (winnerId);
CREATE INDEX IF NOT EXISTS idx_rallies_has_video ON rallies (hasVideoData);
```

---

## 5. Contacts

Represents a single ball shot (timestamp marker from Step 1).

### 5.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    rallyId UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
    
    -- Video timestamp
    time NUMERIC NOT NULL,  -- Seconds into video (high precision)
    
    -- Position within rally
    shotIndex SMALLINT NOT NULL,  -- 1-based index within rally
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK constraints to rallies after shots table exists
ALTER TABLE rallies ADD CONSTRAINT fk_rallies_start_contact 
    FOREIGN KEY (startContactId) REFERENCES shots(id) ON DELETE SET NULL;
ALTER TABLE rallies ADD CONSTRAINT fk_rallies_end_contact 
    FOREIGN KEY (endContactId) REFERENCES shots(id) ON DELETE SET NULL;
```

### 5.2 Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_contacts_rally ON shots (rallyId);
CREATE INDEX IF NOT EXISTS idx_contacts_rally_shot ON shots (rallyId, shotIndex);
CREATE INDEX IF NOT EXISTS idx_contacts_time ON shots (time);
```

---

## 6. Shots

Represents the detailed annotation for a single shot (from Step 2).

### 6.1 MVP Fields

```sql
CREATE TABLE IF NOT EXISTS shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    shotId UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    matchId UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    rallyId UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
    playerId UUID NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
    
    -- Shot position in rally
    shotIndex SMALLINT NOT NULL,  -- Mirrors shot.shotIndex for query convenience
    
    -- Flags
    isServe BOOLEAN NOT NULL DEFAULT FALSE,
    isReturnOfServe BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Q1: Wing
    wing TEXT CHECK (wing IN ('FH', 'BH')) NOT NULL,
    
    -- Q2: Position Sector (3x3 grid)
    positionSector TEXT CHECK (positionSector IN (
        'closeLeft', 'closeMid', 'closeRight',
        'midLeft', 'midMid', 'midRight',
        'farLeft', 'farMid', 'farRight'
    )) NOT NULL,
    
    -- Q3: Shot Type (NULL for serves, which use serveType)
    -- Ordered from most defensive to most aggressive
    -- NOTE: Valid shot types are filtered by positionSector distance (see shots_table.md)
    shotType TEXT CHECK (shotType IN (
        -- Defensive
        'lob', 'chop', 'chopBlock', 'dropShot', 'shortTouch', 'push',
        -- Neutral
        'block', 'drive', 'flick', 'slowSpinLoop',
        -- Aggressive
        'loop', 'fastLoop', 'smash',
        -- Fallback
        'other'
    )),
    
    -- Inferred spin (derived from shotType, stored for query convenience)
    -- See shots_table.md for shotType → inferredSpin mapping
    inferredSpin TEXT CHECK (inferredSpin IN (
        'heavyTopspin', 'topspin', 'noSpin', 'backspin', 'heavyBackspin'
    )),
    
    -- Q4: Landing / End Point
    landingType TEXT CHECK (landingType IN (
        'inPlay', 'net', 'offLong', 'wide'
    )) NOT NULL,
    
    landingZone TEXT CHECK (landingZone IN (
        'BHShort', 'MidShort', 'FHShort',
        'BHMid', 'MidMid', 'FHMid',
        'BHLong', 'MidLong', 'FHLong'
    )),  -- Only valid when landingType = 'inPlay'
    
    -- Q5: Shot Quality [v0.8.0 - expanded with error types]
    -- Error types (inNet, missedLong, missedWide) enable derivation of landingType and winnerId
    shotQuality TEXT CHECK (shotQuality IN (
        'good', 'average', 'weak',
        'inNet', 'missedLong', 'missedWide'
    )) NOT NULL,
    
    --------------------
    -- SERVE FIELDS (only when isServe = TRUE)
    --------------------
    
    -- [v0.8.0] Updated serve type list (added lollipop, removed shovel)
    serveType TEXT CHECK (serveType IN (
        'pendulum', 'reversePendulum', 'tomahawk', 
        'backhand', 'hook', 'lollipop', 'other'
    )),
    
    -- [v0.8.0] Serve spin as 3x3 grid (replaces serveSpinPrimary + serveSpinStrength)
    -- Grid based on ball shot point: topspin at top, backspin at bottom
    serveSpin TEXT CHECK (serveSpin IN (
        'topLeft', 'topspin', 'topRight',
        'sideLeft', 'noSpin', 'sideRight',
        'backLeft', 'backspin', 'backRight'
    )),
    
    -- DEPRECATED: Use serveSpin instead (kept for migration compatibility)
    serveSpinPrimary TEXT CHECK (serveSpinPrimary IN (
        'under', 'top', 'sideLeft', 'sideRight', 'none'
    )),
    
    -- DEPRECATED: Use serveSpin instead (kept for migration compatibility)
    serveSpinStrength TEXT CHECK (serveSpinStrength IN (
        'low', 'medium', 'heavy'
    )),
    
    isFault BOOLEAN DEFAULT FALSE,
    
    faultType TEXT CHECK (faultType IN (
        'net', 'long', 'wide', 'other'
    )),  -- Only meaningful when isFault = TRUE
    
    serveIssueCause TEXT CHECK (serveIssueCause IN (
        'technicalExecution', 'badDecision', 'tooHigh',
        'tooLong', 'notEnoughSpin', 'easyToRead'
    )),  -- Only set when shotQuality = 'weak' AND serveExtraFor enabled
    
    --------------------
    -- RETURN OF SERVE FIELDS (only when isReturnOfServe = TRUE)
    --------------------
    
    receiveIssueCause TEXT CHECK (receiveIssueCause IN (
        'misreadSpinType', 'misreadSpinAmount',
        'technicalExecution', 'badDecision'
    )),  -- Only set when RoS is bad/weak AND receiveExtraFor enabled
    
    --------------------
    -- THIRD BALL FIELDS (only when shotIndex = 3)
    --------------------
    
    thirdBallIssueCause TEXT CHECK (thirdBallIssueCause IN (
        'incorrectPreparation', 'unexpectedReturn', 'technicalExecution',
        'badDecision', 'tooAggressive', 'tooPassive'
    )),  -- Only set when shotQuality = 'weak' AND thirdBallExtraFor enabled
    
    --------------------
    -- UNFORCED ERROR FIELDS (only on final shot of rally)
    --------------------
    
    unforcedErrorCause TEXT CHECK (unforcedErrorCause IN (
        'technicalExecution', 'badDecision', 'tooAggressive', 'tooPassive'
    )),  -- Only set when pointEndType = 'unforcedError' AND unforcedErrorExtraFor enabled
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Extended Fields (Post-MVP / AI Training)

```sql
-- Placement coordinates for heatmaps and ML
ALTER TABLE shots ADD COLUMN IF NOT EXISTS placementX NUMERIC;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS placementY NUMERIC;

-- Shot height/depth for 3D analysis
ALTER TABLE shots ADD COLUMN IF NOT EXISTS contactHeight NUMERIC;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS contactDepth NUMERIC;

-- Serve position flag
ALTER TABLE shots ADD COLUMN IF NOT EXISTS isServeFromBackhandSide BOOLEAN;

-- Phase of play (for pattern analysis)
ALTER TABLE shots ADD COLUMN IF NOT EXISTS phase TEXT CHECK (phase IN (
    'serve', 'receive', 'thirdBall', 'fourthBall', 'openRally'
));

-- Outcome classification
ALTER TABLE shots ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN (
    'winner', 'forcedError', 'unforcedError', 'inPlay', 'fault'
));

ALTER TABLE shots ADD COLUMN IF NOT EXISTS errorType TEXT CHECK (errorType IN (
    'net', 'long', 'wide', 'other'
));
```

### 6.3 Indexes

```sql
-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_shots_contact ON shots (shotId);
CREATE INDEX IF NOT EXISTS idx_shots_match_rally_index ON shots (matchId, rallyId, shotIndex);
CREATE INDEX IF NOT EXISTS idx_shots_player ON shots (playerId);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_shots_player_serve ON shots (playerId, isServe) WHERE isServe = TRUE;
CREATE INDEX IF NOT EXISTS idx_shots_player_serve_outcome ON shots (playerId, isServe, shotQuality);
CREATE INDEX IF NOT EXISTS idx_shots_match_serve_quality ON shots (matchId, isServe, shotQuality);
CREATE INDEX IF NOT EXISTS idx_shots_landing ON shots (landingType, landingZone);
```

---

## 7. Migration Order

When setting up the database:

1. `players`
2. `matches`
3. `sets`
4. `rallies` (without shot FKs initially)
5. `shots`
6. Add FK constraints to `rallies` for start/end shots
7. `shots`
8. Indexes (all tables)

---

## 8. Enum Reference

### 8.1 Player Scope Enums
- **extraQuestionScope**: `none`, `player1`, `player2`, `both`

### 8.2 Wing
- `FH`, `BH`

### 8.3 Position Sector (3×3 Grid)
```
closeLeft   closeMid   closeRight
midLeft     midMid     midRight
farLeft     farMid     farRight
```

### 8.4 Shot Type

Ordered from most defensive to most aggressive:

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

### 8.5 Inferred Spin

Spin is inferred from shot type (not entered manually). See `shots_table.md` for full mapping.

- `heavyTopspin` – strong forward rotation (loops)
- `topspin` – moderate forward rotation (drives, flicks, blocks)
- `noSpin` – flat or minimal rotation (smash, drop shot, short touch)
- `backspin` – moderate backward rotation (push, chop block)
- `heavyBackspin` – strong backward rotation (chops)

**Shot Type → Inferred Spin Mapping:**

| Shot Type | Inferred Spin |
|-----------|---------------|
| `lob` | `topspin` |
| `chop` | `heavyBackspin` |
| `chopBlock` | `backspin` |
| `dropShot` | `noSpin` |
| `shortTouch` | `noSpin` |
| `push` | `backspin` |
| `block` | `topspin` |
| `drive` | `topspin` |
| `flick` | `topspin` |
| `slowSpinLoop` | `heavyTopspin` |
| `loop` | `heavyTopspin` |
| `fastLoop` | `heavyTopspin` |
| `smash` | `noSpin` |
| `other` | `noSpin` |

### 8.6 Landing Type
- `inPlay`, `net`, `offLong`, `wide`

### 8.7 Landing Zone (3×3 Grid, opponent's perspective)
```
BHShort   MidShort   FHShort
BHMid     MidMid     FHMid
BHLong    MidLong    FHLong
```

### 8.8 Shot Quality [v0.8.0 - expanded]

In-play qualities:
- `good` – strong shot, pressured opponent
- `average` – neutral shot
- `weak` – poor shot, gave advantage

Error qualities (derive landingType automatically):
- `inNet` – shot hit the net → `landingType = 'net'`
- `missedLong` – shot went off the end → `landingType = 'offLong'`
- `missedWide` – shot went off the side → `landingType = 'wide'`

### 8.9 Serve Type [v0.8.0 - updated]
- `pendulum`, `reversePendulum`, `tomahawk`, `backhand`, `hook`, `lollipop`, `other`

**Serve Type → Wing Derivation:**
| Serve Type | Wing |
|------------|:----:|
| `pendulum` | FH |
| `reversePendulum` | BH |
| `tomahawk` | FH |
| `backhand` | BH |
| `hook` | FH |
| `lollipop` | FH |
| `other` | FH |

### 8.10 Serve Spin (3×3 Grid) [v0.8.0 - new]

Ball shot point perspective (topspin at top, backspin at bottom):

```
┌─────────────────────────────────────────┐
│  topLeft     │   topspin    │ topRight   │
│     (7)      │     (8)      │    (9)     │
├──────────────┼──────────────┼────────────┤
│  sideLeft    │   noSpin     │ sideRight  │
│     (4)      │     (5)      │    (6)     │
├──────────────┼──────────────┼────────────┤
│  backLeft    │  backspin    │ backRight  │
│     (1)      │     (2)      │    (3)     │
└─────────────────────────────────────────┘
```

Values: `topLeft`, `topspin`, `topRight`, `sideLeft`, `noSpin`, `sideRight`, `backLeft`, `backspin`, `backRight`

### 8.11 Serve Spin Primary (DEPRECATED)
- `under`, `top`, `sideLeft`, `sideRight`, `none`
- **Note:** Replaced by `serveSpin` 3×3 grid in v0.8.0

### 8.12 Serve Spin Strength (DEPRECATED)
- `low`, `medium`, `heavy`
- **Note:** Replaced by `serveSpin` 3×3 grid in v0.8.0

### 8.13 Fault Type
- `net`, `long`, `wide`, `other`
- **Note:** Can be derived from `shotQuality` error types in v0.8.0

### 8.14 Serve Issue Cause
- `technicalExecution`, `badDecision`, `tooHigh`, `tooLong`, `notEnoughSpin`, `easyToRead`

### 8.15 Receive Issue Cause
- `misreadSpinType`, `misreadSpinAmount`, `technicalExecution`, `badDecision`

### 8.16 Third Ball Issue Cause
- `incorrectPreparation`, `unexpectedReturn`, `technicalExecution`, `badDecision`, `tooAggressive`, `tooPassive`

### 8.17 Point End Type
- `winnerShot`, `forcedError`, `unforcedError`, `serviceFault`, `receiveError`, `other`

### 8.18 Luck Type
- `none`, `luckyNet`, `luckyEdgeTable`, `luckyEdgeBat`

### 8.19 Unforced Error Cause
- `technicalExecution`, `badDecision`, `tooAggressive`, `tooPassive`

### 8.20 Essential Mode Shot Types [v0.8.0]

Simplified shot type list for Essential tagging mode (9 types):

```
Defensive:  push, chop, block, lob
Neutral:    drive, flick
Aggressive: loop, smash
Fallback:   other
```

---

## 9. Notes

### 9.1 Consistency with Specs

All enum values and field definitions are consistent with:
- `Tagger2StepUserFlow.md` (Section 8: Data Schema)
- `MVP_Spec_and_Architecture.md` (Section 5: Database Mapping)

### 9.2 Business Logic

Field population rules are defined in the workflow spec. Key conditional rules:

| Field | Condition |
|-------|-----------|
| `serveType`, `serveSpinPrimary`, `serveSpinStrength` | `isServe = TRUE` |
| `faultType` | `isFault = TRUE` |
| `shotQuality` (for faults) | Always `weak` when `isFault = TRUE` |
| `serveIssueCause` | `isServe = TRUE` AND `shotQuality = 'weak'` AND `serveExtraFor` enabled for player |
| `receiveIssueCause` | `isReturnOfServe = TRUE` AND (error OR weak) AND `receiveExtraFor` enabled for player |
| `thirdBallIssueCause` | `shotIndex = 3` AND `shotQuality = 'weak'` AND `thirdBallExtraFor` enabled for player |
| `unforcedErrorCause` | `pointEndType = 'unforcedError'` AND `unforcedErrorExtraFor` enabled for player |
| `landingZone` | `landingType = 'inPlay'` (always from opponent's perspective) |
| `shotType` | Required when `isServe = FALSE` (serves use `serveType` instead); filtered by `positionSector` distance |
| `inferredSpin` | Derived from `shotType` (see mapping in Section 8.5) |
| `player1ScoreAfter`, `player2ScoreAfter` | Calculated and stored when rally ends |
| `serverCorrected` | Set to TRUE when server is manually corrected due to error |
| `scoreCorrected` | Set to TRUE when score is manually corrected due to error |
| `hasVideoData` | FALSE for rallies that are score-only (no shots/shots) |
| `matchDate` | Should be set during match creation; can default to created_at date but should be editable |

#### Validation Rules

| Rule | Description |
|------|-------------|
| Min 1 shot per rally | Every rally must have at least 1 shot (the serve); validation error otherwise |
| shotType required for non-serves | If `isServe = FALSE` AND `taggingMode = 'full'`, then `shotType` must not be NULL |
| Fault = weak | If `isFault = TRUE`, then `shotQuality` must be `weak` |
| Non-scoring rallies skip Step 2 | Rallies with `isScoring = FALSE` are not annotated in Step 2 (shots recorded but no shots) |
| Essential mode nullable fields | If `taggingMode = 'essential'`, `positionSector`, `shotType`, `landingZone` may be NULL |

#### Set Boundary Detection

- Set ends when a player reaches the target score (e.g., 11) with at least 2-point lead
- At deuce (both players ≥ 10), service alternates every point
- System suggests game end based on score; user confirms or overrides
- `firstServerId` is editable; changing it recalculates all `serverId`/`receiverId` values

#### Winner/Error Attribution [v0.8.0 - enhanced derivation]

The ending shot of a rally is determined by:
1. Last shot's `playerId` identifies who hit the final ball
2. Last shot's `shotQuality` determines outcome:
   - `inNet`, `missedLong`, `missedWide` → that player made an error → winner is OTHER player
   - `good`, `average`, `weak` → ball was in play → winner is THIS player (opponent couldn't return)

**Derivation from shotQuality:**

| Last Shot Quality | Derived landingType | Derived winnerId | pointEndType |
|-------------------|---------------------|------------------|--------------|
| `inNet` | `net` | Other player | Ask: forced/unforced (or serviceFault/receiveError) |
| `missedLong` | `offLong` | Other player | Ask: forced/unforced (or serviceFault/receiveError) |
| `missedWide` | `wide` | Other player | Ask: forced/unforced (or serviceFault/receiveError) |
| `good`/`average`/`weak` | `inPlay` | This player | `winnerShot` |

**Special cases for error shots:**
- If `shotIndex = 1` (serve) and error quality → `pointEndType = 'serviceFault'`
- If `shotIndex = 2` (return) and error quality → `pointEndType = 'receiveError'`
- If `shotIndex >= 3` and error quality → Ask user: Forced or Unforced?

#### Distance-Based Shot Type Filtering

The UI should filter available shot types based on the selected position sector distance:

| Distance | Valid Shot Types |
|----------|------------------|
| Close (closeLeft/Mid/Right) | `chopBlock`, `dropShot`, `shortTouch`, `push`, `block`, `flick`, `loop`, `fastLoop`, `smash`, `other` |
| Mid (midLeft/Mid/Right) | `chop`, `drive`, `slowSpinLoop`, `loop`, `fastLoop`, `other` |
| Far (farLeft/Mid/Right) | `lob`, `chop`, `other` |

Invalid shot types should be greyed out or hidden in the UI to reduce cognitive load and improve data accuracy.

#### Inferred Spin Derivation

The `inferredSpin` field is automatically populated based on `shotType`:

| Shot Type → | Inferred Spin |
|-------------|---------------|
| `slowSpinLoop`, `loop`, `fastLoop` | `heavyTopspin` |
| `lob`, `block`, `drive`, `flick` | `topspin` |
| `dropShot`, `shortTouch`, `smash`, `other` | `noSpin` |
| `push`, `chopBlock` | `backspin` |
| `chop` | `heavyBackspin` |

This derivation should happen automatically when saving a shot record.

### 9.3 AI Future-Proofing

The extended fields in Section 5.2 (`placementX/Y`, `contactHeight/Depth`, `phase`, `outcome`) are designed to support:
- ML model training for shot prediction
- Pattern recognition
- Heatmap generation
- Advanced tactical analysis

These can be populated via:
- Manual tagging (post-MVP)
- Computer vision inference
- Semi-automated estimation from video timestamps

### 9.4 Video Coverage and Partial Tagging

The schema supports partial video coverage scenarios where video may not cover the entire match.

#### Video Requirements

- **Single video per match**: Users must combine multiple video files before importing
- **UI reminder**: Display note that match should be in a single video file

#### Partial Coverage Levels

1. **Per-Set Coverage** (`sets.hasVideo`):
   - Some sets may be filmed, others not
   - Games without video: only `player1FinalScore`, `player2FinalScore` recorded
   - Games with video: full Step 1/2 tagging available

2. **Mid-Set Video Start** (`sets.videoStartPlayer1Score`, `videoStartPlayer2Score`):
   - Video may start partway through a game
   - Enter the score when video/tagging began
   - Rallies before video start are score-only (`hasVideoData = FALSE`)

3. **Per-Rally Coverage** (`rallies.hasVideoData`):
   - Within a game, some rallies may have full tagging, others score-only
   - `hasVideoData = TRUE`: full shots + shots tagging
   - `hasVideoData = FALSE`: only `winnerId` recorded, no shots/shots

#### Example Scenario

"Video starts at 5-3 in Set 2, ends at 9-8, but final score was 11-9":
- Set 2: `hasVideo = TRUE`, `videoStartPlayer1Score = 5`, `videoStartPlayer2Score = 3`
- Rallies 1-8 (before video): `hasVideoData = FALSE`, just winners recorded
- Rallies 9-16 (during video): `hasVideoData = TRUE`, full tagging
- Rallies 17-20 (after video): `hasVideoData = FALSE`, just winners recorded
- Set 2 final: `player1FinalScore = 11`, `player2FinalScore = 9`

### 9.5 Error Correction

The system accounts for unintentional errors during tagging:

- **Wrong Server**: If the wrong player is recorded as server for a rally, set `serverCorrected = TRUE` and update `serverId`/`receiverId` accordingly
- **Wrong Score**: If score is entered incorrectly, set `scoreCorrected = TRUE` and update the match scores
- **Correction Notes**: Use `correctionNotes` to document any corrections made (optional but recommended for audit trail)

These flags help maintain data integrity and allow for analysis of correction patterns.

---

_End of consolidated DataSchema.md_

